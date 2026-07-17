WidgetMetadata = {
  id: "cn.233dm.player",
  title: "233动漫源",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "233动漫 天堂/暴风/量子 播放源",
  author: "Forward",
  site: "https://cn.233dm.com",
  icon: "https://cn.233dm.com/favicon.ico",
  modules: [
    {
      id: "loadResource",
      title: "233动漫播放源",
      description: "天堂/暴风/量子 三线路",
      functionName: "loadPlaySource",
      type: "stream",
      cacheDuration: 0,
      params: [
        {
          name: "source",
          title: "播放线路",
          type: "enumeration",
          value: "tiantang",
          enumOptions: [
            { title: "天堂线路", value: "tiantang" },
            { title: "暴风线路", value: "baofeng" },
            { title: "量子线路", value: "liangzi" }
          ]
        }
      ]
    }
  ],
  search: {
    functionName: "searchAnime",
    params: [
      { type: "input", placeholders: [{ title: "搜索动漫名称...", value: "" }] }
    ]
  }
};

var BASE = "https://cn.233dm.com";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var PLAY_UA = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";
var SOURCE_IDS = { tiantang: "3", baofeng: "2", liangzi: "4" };
var SOURCE_NAMES = { tiantang: "天堂", baofeng: "暴风", liangzi: "量子" };

var _btoa = typeof btoa !== "undefined" ? btoa : function(str) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var out = "";
  for (var i = 0; i < str.length; i += 3) {
    var c1 = str.charCodeAt(i);
    var c2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    var c3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
    out += i + 1 < str.length ? chars.charAt(((c2 & 15) << 2) | (c3 >> 6)) : "=";
    out += i + 2 < str.length ? chars.charAt(c3 & 63) : "=";
  }
  return out;
};

function extractText(text, regex) {
  var m = text.match(regex);
  return m ? m[1].trim() : "";
}

function generateVerifyToken() {
  var key = [0x4e, 0x3f, 0xa9, 0xc2, 0x12, 0x7d, 0x88, 0xef, 0x55, 0xaa, 0x0b, 0xcd, 0xde, 0xad, 0xbe, 0xef];
  var ts = String(Date.now());
  var out = "";
  for (var i = 0; i < ts.length; i++) {
    out += String.fromCharCode(ts.charCodeAt(i) ^ key[i % key.length]);
  }
  return _btoa(out);
}

async function ensureSearchAccess() {
  try {
    await Widget.http.get(BASE + "/", { headers: { "User-Agent": UA } });
    var token = generateVerifyToken();
    await Widget.http.post(BASE + "/index.php/ajax/verify_check?type=search",
      "i=" + encodeURIComponent(token),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": BASE + "/"
        }
      }
    );
  } catch (e) {}
}

async function searchAnime(params) {
  var keyword = String(params.keyword || params.text || "").trim();
  if (!keyword) return [];
  var resp = await Widget.http.get(BASE + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(keyword), {
    headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" }
  });
  var raw = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
  if (!raw || raw.code !== 1 || !raw.list) return [];
  var results = [];
  for (var i = 0; i < raw.list.length; i++) {
    var item = raw.list[i];
    results.push({
      id: String(item.id),
      type: "url",
      title: item.name,
      posterPath: item.pic,
      link: BASE + "/search/" + encodeURIComponent(item.name) + "-------------.html"
    });
  }
  return results;
}

async function loadDetail(link) {
  if (!link || typeof link !== "string") return null;
  var hash = "";
  var html = "";
  var hashMatch = link.match(/\/anime\/([a-f0-9]{24})\.html/);
  if (hashMatch) {
    hash = hashMatch[1];
    var resp = await Widget.http.get(BASE + "/anime/" + hash + ".html", { headers: { "User-Agent": UA } });
    html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
  } else {
    await ensureSearchAccess();
    var resp = await Widget.http.get(link, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
    html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    var hm = html.match(/\/anime\/([a-f0-9]{24})\.html/);
    if (hm) {
      hash = hm[1];
      var resp2 = await Widget.http.get(BASE + "/anime/" + hash + ".html", { headers: { "User-Agent": UA } });
      html = typeof resp2.data === "string" ? resp2.data : String(resp2.data || "");
    }
  }
  if (!hash) return null;
  var title = extractText(html, /<title>([^<]+?)免费在线观看/i);
  if (!title) title = extractText(html, /<title>([^<]+?)\s*-/i);
  if (!title) title = "未知";
  return { title: title, type: "url", link: BASE + "/anime/" + hash + ".html", hash: hash };
}

function parseEpisodeList(html) {
  var sources = [];
  var tabStart = html.indexOf('class="channel-tab"');
  if (tabStart < 0) return sources;
  var tabEnd = html.indexOf("</ul>", tabStart);
  if (tabEnd < 0) return sources;
  var tabHtml = html.substring(tabStart, tabEnd);
  var srcRe = /<a[^>]*href="#playlist(\d+)"[^>]*>([^<]+)/g;
  var m;
  while ((m = srcRe.exec(tabHtml)) !== null) {
    var sid = m[1];
    var sname = m[2].replace(/<[^>]+>/g, "").trim();
    sources.push({ id: sid, name: sname, episodes: [] });
    var marker = 'id="playlist' + sid + '"';
    var ps = html.indexOf(marker);
    if (ps < 0) continue;
    var divOpenEnd = html.indexOf(">", ps);
    if (divOpenEnd < 0) continue;
    var depth = 1;
    var searchPos = divOpenEnd + 1;
    while (depth > 0 && searchPos < html.length) {
      var nextOpen = html.indexOf("<div", searchPos);
      var nextClose = html.indexOf("</div>", searchPos);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        searchPos = nextOpen + 4;
      } else {
        depth--;
        searchPos = nextClose + 6;
      }
    }
    var playlistHtml = html.substring(divOpenEnd + 1, searchPos - 6);
    var epRe = /<a[^>]*href="([^"]*\/play\/[^"]*)"[^>]*>([^<]+)<\/a>/g;
    var em;
    while ((em = epRe.exec(playlistHtml)) !== null) {
      var epLink = em[1].indexOf("http") === 0 ? em[1] : BASE + em[1];
      sources[sources.length - 1].episodes.push({ name: em[2].trim(), link: epLink });
    }
  }
  return sources;
}

function pickBestMatch(list, seriesName, seasonNum) {
  if (!list || list.length === 0) return null;
  if (list.length === 1) return list[0];
  var scored = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var score = 0;
    var name = item.name || "";
    if (name === seriesName) score += 100;
    else if (name.indexOf(seriesName) >= 0) score += 50;
    var sStr = "\u7b2c" + seasonNum + "\u5b63";
    if (name.indexOf(sStr) >= 0) score += 20;
    if (name.indexOf("OVA") >= 0) score -= 10;
    scored.push({ item: item, score: score });
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored[0].score > 0 ? scored[0].item : list[0];
}

async function searchHashByName(name) {
  await ensureSearchAccess();
  var searchUrl = BASE + "/search/" + encodeURIComponent(name) + "-------------.html";
  try {
    var resp = await Widget.http.get(searchUrl, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
    var html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    var hm = html.match(/\/anime\/([a-f0-9]{24})\.html/);
    return hm ? hm[1] : "";
  } catch (e) { return ""; }
}

async function loadPlaySource(params) {
  var seriesName = String(params.seriesName || "").trim();
  if (!seriesName) return [];
  var episodeNum = parseInt(params.episode, 10) || 1;
  var seasonNum = parseInt(params.season, 10) || 1;
  if (params.type === "movie") { seasonNum = 1; episodeNum = 1; }

  var sr = await Widget.http.get(BASE + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(seriesName), {
    headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" }
  });
  var sd = (typeof sr.data === "string") ? JSON.parse(sr.data) : sr.data;
  if (!sd || sd.code !== 1 || !sd.list || sd.list.length === 0) return [];

  var best = pickBestMatch(sd.list, seriesName, seasonNum);
  if (!best) return [];
  var hash = await searchHashByName(best.name);
  if (!hash) return [];

  var results = [];
  var sourceKeys = ["tiantang", "baofeng", "liangzi"];
  for (var si = 0; si < sourceKeys.length; si++) {
    var sk = sourceKeys[si];
    var sourceId = SOURCE_IDS[sk];
    var sourceName = SOURCE_NAMES[sk];
    if (!sourceId) continue;

    var playUrl = BASE + "/anime/" + hash + "/play/" + sourceId + "/" + episodeNum + ".html";
    try {
      var pr = await Widget.http.get(playUrl, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
      var ph = typeof pr.data === "string" ? pr.data : String(pr.data || "");
      var pm = ph.match(/player_aaaa\s*=\s*(\{[^;]+\})/);
      if (pm) {
        var pd = JSON.parse(pm[1]);
        var eu = pd.url || "";
        if (eu) {
          var m3u8Url = decodeURIComponent(eu);
          m3u8Url = m3u8Url.replace(/&amp;/g, "&");
          results.push({
            name: sourceName + "线路",
            description: "1080P - " + sourceName + "线路",
            url: m3u8Url,
            customHeaders: { "User-Agent": PLAY_UA, "Referer": BASE + "/" },
            headers: { "User-Agent": PLAY_UA, "Referer": BASE + "/" }
          });
        }
      }
    } catch (e) {}
  }
  return results;
}
