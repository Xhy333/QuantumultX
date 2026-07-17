WidgetMetadata = {
  id: "https://cn.233dm.com?rev=20260718f",
  title: "233动漫播放源",
  description: "233动漫 分类浏览 + 天堂/暴风/量子 播放源",
  author: "Forward",
  site: "https://cn.233dm.com",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  modules: [
    { title: "日漫", description: "最新日本动漫", functionName: "listJapan", cacheDuration: 600, params: [
      { name: "page", type: "page" },
      { name: "count", type: "count", value: "20" }
    ] },
    { title: "国漫", description: "最新国产动漫", functionName: "listChina", cacheDuration: 600, params: [
      { name: "page", type: "page" },
      { name: "count", type: "count", value: "20" }
    ] },
    { title: "动画", description: "最新动画", functionName: "listDonghua", cacheDuration: 600, params: [
      { name: "page", type: "page" },
      { name: "count", type: "count", value: "20" }
    ] },
    { title: "剧场版", description: "最新剧场版动画", functionName: "listMovie", cacheDuration: 600, params: [
      { name: "page", type: "page" },
      { name: "count", type: "count", value: "20" }
    ] },
    { title: "美漫", description: "最新美国动漫", functionName: "listUS", cacheDuration: 600, params: [
      { name: "page", type: "page" },
      { name: "count", type: "count", value: "20" }
    ] },
    { title: "特摄", description: "最新特摄", functionName: "listTokusatsu", cacheDuration: 600, params: [
      { name: "page", type: "page" },
      { name: "count", type: "count", value: "20" }
    ] },
    {
      id: "loadResource",
      title: "233动漫播放源",
      description: "天堂/暴风/量子 自由切换",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [
        {
          name: "source",
          title: "播放线路",
          type: "enumeration",
          value: "tiantang",
          enumOptions: [
            { title: "天堂线路（推荐）", value: "tiantang" },
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

const BASE = "https://cn.233dm.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PLAY_UA = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";
const SRC_IDS = { tiantang: "3", baofeng: "2", liangzi: "4" };
const SRC_NAMES = { tiantang: "天堂", baofeng: "暴风", liangzi: "量子" };

const CATEGORIES = {
  listJapan: "1",
  listChina: "2",
  listDonghua: "5",
  listMovie: "24",
  listUS: "3",
  listTokusatsu: "4"
};

function _btoa(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let out = "";
  for (let i = 0; i < str.length; i += 3) {
    const c1 = str.charCodeAt(i);
    const c2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
    out += i + 1 < str.length ? chars.charAt(((c2 & 15) << 2) | (c3 >> 6)) : "=";
    out += i + 2 < str.length ? chars.charAt(c3 & 63) : "=";
  }
  return out;
}

function genToken() {
  const key = [0x4e, 0x3f, 0xa9, 0xc2, 0x12, 0x7d, 0x88, 0xef, 0x55, 0xaa, 0x0b, 0xcd, 0xde, 0xad, 0xbe, 0xef];
  const ts = String(Date.now());
  let out = "";
  for (let i = 0; i < ts.length; i++) {
    out += String.fromCharCode(ts.charCodeAt(i) ^ key[i % key.length]);
  }
  return _btoa(out);
}

async function bypass() {
  try {
    await Widget.http.get(BASE + "/", { headers: { "User-Agent": UA } });
    const token = genToken();
    await Widget.http.post(BASE + "/index.php/ajax/verify_check?type=search",
      "i=" + encodeURIComponent(token), {
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Referer": BASE + "/" }
      }
    );
  } catch (e) {}
}

async function fetchCategory(catId, page) {
  const url = BASE + "/type/" + catId + ".html" + (page > 1 ? "?page=" + page : "");
  try {
    const resp = await Widget.http.get(url, { headers: { "User-Agent": UA } });
    return typeof resp.data === "string" ? resp.data : String(resp.data || "");
  } catch (e) { return ""; }
}

function parseAnimeList(html, count) {
  const results = [];
  // Find anime blocks: look for hash URLs and titles
  const regex = /<a [^>]*href="\/anime\/([a-f0-9]{24})\.html"[^>]*>([^<]+)<\/a>/g;
  const seen = {};
  let m;
  while ((m = regex.exec(html)) !== null) {
    const hash = m[1];
    const title = m[2].trim();
    if (!title || title.length < 2 || seen[hash]) continue;
    seen[hash] = true;
    if (results.length >= count) break;
    results.push({
      id: hash,
      type: "url",
      title: title,
      link: BASE + "/anime/" + hash + ".html",
      posterPath: BASE + "/static/img/default.jpg"
    });
  }
  return results;
}// List handlers
async function listJapan(params) { return fetchList("listJapan", params); }
async function listChina(params) { return fetchList("listChina", params); }
async function listDonghua(params) { return fetchList("listDonghua", params); }
async function listMovie(params) { return fetchList("listMovie", params); }
async function listUS(params) { return fetchList("listUS", params); }
async function listTokusatsu(params) { return fetchList("listTokusatsu", params); }

async function fetchList(fn, params) {
  const catId = CATEGORIES[fn];
  if (!catId) return [];
  const page = parseInt(params.page, 10) || 1;
  const count = parseInt(params.count, 10) || 20;
  const html = await fetchCategory(catId, page);
  if (!html) return [];
  return parseAnimeList(html, count);
}

async function searchAnime(params) {
  const keyword = String(params.keyword || params.text || "").trim();
  if (!keyword) return [];
  const resp = await Widget.http.get(BASE + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(keyword), {
    headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" }
  });
  const raw = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
  if (!raw || raw.code !== 1 || !raw.list) return [];
  const results = [];
  for (const item of raw.list) {
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
  var hm = link.match(/\/anime\/([a-f0-9]{24})\.html/);
  if (hm) {
    hash = hm[1];
    const resp = await Widget.http.get(BASE + "/anime/" + hash + ".html", { headers: { "User-Agent": UA } });
    html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
  } else {
    await bypass();
    const resp = await Widget.http.get(link, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
    html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    const hm2 = html.match(/\/anime\/([a-f0-9]{24})\.html/);
    if (hm2) {
      hash = hm2[1];
      const resp2 = await Widget.http.get(BASE + "/anime/" + hash + ".html", { headers: { "User-Agent": UA } });
      html = typeof resp2.data === "string" ? resp2.data : String(resp2.data || "");
    }
  }
  if (!hash) return null;

  var title = "";
  var tm = html.match(/<title>([^<]+?)免费在线观看/i);
  if (tm) title = tm[1].trim();
  if (!title) { tm = html.match(/<title>([^<]+?)\s*-/i); if (tm) title = tm[1].trim(); }
  if (!title) title = "未知";

  return {
    title: title,
    type: "url",
    link: BASE + "/anime/" + hash + ".html",
    hash: hash
  };
}

async function getHash(name) {
  await bypass();
  try {
    const resp = await Widget.http.get(BASE + "/search/" + encodeURIComponent(name) + "-------------.html",
      { headers: { "User-Agent": UA, "Referer": BASE + "/" } }
    );
    const html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    const m = html.match(/\/anime\/([a-f0-9]{24})\.html/);
    return m ? m[1] : "";
  } catch (e) { return ""; }
}

async function loadResource(params) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  const ep = parseInt(params.episode, 10) || 1;
  const sk = String(params.source || "tiantang").toLowerCase();
  const sid = SRC_IDS[sk];
  const sname = SRC_NAMES[sk];
  if (!sid) return [];

  let sr;
  try {
    sr = await Widget.http.get(BASE + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(name), {
      headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" }
    });
  } catch (e) { return []; }
  const sd = (typeof sr.data === "string") ? JSON.parse(sr.data) : sr.data;
  if (!sd || sd.code !== 1 || !sd.list || sd.list.length === 0) return [];

  let best = null;
  for (const item of sd.list) {
    if (item.name === name) { best = item; break; }
    if (item.name.indexOf(name) >= 0) best = item;
  }
  if (!best) best = sd.list[0];
  if (!best || !best.name) return [];

  const hash = await getHash(best.name);
  if (!hash) return [];

  const playUrl = BASE + "/anime/" + hash + "/play/" + sid + "/" + ep + ".html";
  try {
    const pr = await Widget.http.get(playUrl, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
    const ph = typeof pr.data === "string" ? pr.data : String(pr.data || "");
    const pm = ph.match(/player_aaaa\s*=\s*(\{[^;]+\})/);
    if (!pm) return [];
    const pd = JSON.parse(pm[1]);
    const eu = pd.url || "";
    if (!eu) return [];
    let url = decodeURIComponent(eu);
    url = url.replace(/&amp;/g, "&");
    return [{
      name: sname + "线路",
      description: sname + " 1080P",
      url: url,
      customHeaders: { "User-Agent": PLAY_UA, "Referer": BASE + "/" },
      headers: { "User-Agent": PLAY_UA, "Referer": BASE + "/" }
    }];
  } catch (e) { return []; }
}
