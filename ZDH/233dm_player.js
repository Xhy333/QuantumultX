// --- 233动漫播放源 ---
// 从 233动漫 搜索正片、按集取流；自动刷新匿名会话(verify_check)与动态域名；
// 过滤不可播放线路；仅使用无需登录会员及加速权限的免费片源；多线路返回当前集播放地址。
WidgetMetadata = {
  id: "https://cn.233dm.com?rev=20261017a",
  title: "233动漫播放源",
  description: "从233动漫搜索正片、按集取流，自动刷新匿名会话与动态域名，过滤不可播放线路。仅使用无需登录会员及加速权限的片源。",
  author: "233",
  site: "https://cn.233dm.com",
  version: "1.3.0",
  requiredVersion: "0.0.1",
  globalParams: [
    {
      name: "multiSource",
      title: "是否启用聚合搜索",
      type: "enumeration",
      enumOptions: [
        { title: "启用", value: "enabled" },
        { title: "禁用", value: "disabled" }
      ]
    },
    {
      name: "maxLines",
      title: "最大线路数(1-8)",
      type: "input",
      value: "6"
    },
    {
      name: "probe",
      title: "过滤不可播放线路",
      type: "enumeration",
      enumOptions: [
        { title: "启用(较慢)", value: "enabled" },
        { title: "禁用", value: "disabled" }
      ]
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "加载资源",
      description: "233动漫多线路播放源",
      functionName: "loadResource",
      type: "stream",
      params: [],
    }
  ],
};

const BASE_DOMAINS = ["https://cn.233dm.com", "https://www.233dm.com", "https://233dm.com"];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MEDIA_UA = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";
const EXCLUDED = /解说|预告|花絮|片段|特典|混剪|合集/;
const CHINESE_NUM = { "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "零": 0 };

var _s = {
  base: null,
  verified: {},
  searchCache: {},
  detailCache: {},
  probeCache: {}
};

function kkText(v) {
  return String(v == null ? "" : v)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .trim();
}

function kkBody(resp) {
  var d = resp && resp.data;
  if (typeof d === "string") return d;
  return d == null ? "" : String(d);
}

function kkStatus(resp) {
  return Number(resp && (resp.status || resp.statusCode)) || 0;
}

function kkHeader(headers, name) {
  var out = "";
  Object.keys(headers || {}).some(function (k) {
    if (k.toLowerCase() !== name.toLowerCase()) return false;
    out = String(headers[k]);
    return true;
  });
  return out;
}

function kkIsVerify(html) {
  return /系统安全验证|mx-mac_msg_jump/.test(html);
}

function kkB64(bytes) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var out = "";
  for (var i = 0; i < bytes.length; i += 3) {
    var c1 = bytes[i], c2 = i + 1 < bytes.length ? bytes[i + 1] : 0, c3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
    out += i + 1 < bytes.length ? chars.charAt(((c2 & 15) << 2) | (c3 >> 6)) : "=";
    out += i + 2 < bytes.length ? chars.charAt(c3 & 63) : "=";
  }
  return out;
}

function kkToken() {
  var key = [0x4e, 0x3f, 0xa9, 0xc2, 0x12, 0x7d, 0x88, 0xef, 0x55, 0xaa, 0x0b, 0xcd, 0xde, 0xad, 0xbe, 0xef];
  var ts = String(Date.now());
  var bytes = [];
  for (var i = 0; i < ts.length; i++) bytes.push(ts.charCodeAt(i) ^ key[i % key.length]);
  return kkB64(bytes);
}

function kkDiscoverFromHome(html) {
  var found = [];
  var re = /https?:\/\/([a-z0-9.-]*233dm[a-z0-9.-]*)/ig, m;
  while ((m = re.exec(html))) {
    var host = m[1].toLowerCase();
    if (host.indexOf(".") < 0) continue;
    var url = "https://" + host;
    if (BASE_DOMAINS.indexOf(url) < 0 && found.indexOf(url) < 0) found.push(url);
  }
  return found;
}

async function kkResolveBase() {
  if (_s.base) return _s.base;
  var candidates = BASE_DOMAINS.slice();
  var stored = null;
  try { stored = await Widget.storage.get("kk233.base"); } catch (e) {}
  if (typeof stored === "string" && stored && candidates.indexOf(stored) < 0) candidates.unshift(stored);
  for (var i = 0; i < candidates.length; i++) {
    try {
      var resp = await Widget.http.get(candidates[i] + "/", { headers: { "User-Agent": UA } });
      var html = kkBody(resp);
      if (kkStatus(resp) === 200 && /233动漫/.test(html)) {
        _s.base = candidates[i];
        try { await Widget.storage.set("kk233.base", candidates[i]); } catch (e) {}
        var extra = kkDiscoverFromHome(html);
        for (var j = 0; j < extra.length; j++) { if (BASE_DOMAINS.indexOf(extra[j]) < 0) BASE_DOMAINS.push(extra[j]); }
        return _s.base;
      }
    } catch (e) {}
  }
  _s.base = stored || BASE_DOMAINS[0];
  return _s.base;
}

async function kkSession(base, force) {
  if (!force && _s.verified[base]) return;
  try {
    await Widget.http.get(base + "/", { headers: { "User-Agent": UA } });
    await Widget.http.post(base + "/index.php/ajax/verify_check?type=search", "i=" + encodeURIComponent(kkToken()), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Referer": base + "/"
      }
    });
    _s.verified[base] = true;
  } catch (e) {
    console.log("[233dm] 会话刷新失败: " + (e && e.message ? e.message : e));
  }
}

async function kkGet(url, referer) {
  var base = await kkResolveBase();
  var headers = { "User-Agent": UA, "Referer": referer || (base + "/") };
  var resp = await Widget.http.get(url, { headers: headers });
  var html = kkBody(resp);
  if (kkIsVerify(html)) {
    await kkSession(base, true);
    resp = await Widget.http.get(url, { headers: headers });
    html = kkBody(resp);
  }
  return html;
}

// --- 搜索 ---
function kkParseSearch(html) {
  var out = [], seen = {};
  var re = /<a\b[^>]*href="\/anime\/([a-f0-9]{24})\.html"[^>]*>/ig, m;
  while ((m = re.exec(html))) {
    var hash = m[1], tag = m[0];
    var t = /title="([^"]*)"/i.exec(tag);
    var title = t ? kkText(t[1]) : "";
    if (seen[hash]) { if (title && !seen[hash].title) seen[hash].title = title; continue; }
    seen[hash] = { hash: hash, title: title };
    out.push(seen[hash]);
  }
  if (!out.length) {
    var re2 = /\/anime\/([a-f0-9]{24})\.html/ig;
    while ((m = re2.exec(html))) { if (!seen[m[1]]) { seen[m[1]] = { hash: m[1], title: "" }; out.push(seen[m[1]]); } }
  }
  return out;
}

async function kkSearch(base, name) {
  if (_s.searchCache[name]) return _s.searchCache[name];
  var html = await kkGet(base + "/search/" + encodeURIComponent(name) + "-------------.html");
  var list = kkParseSearch(html);
  _s.searchCache[name] = list;
  return list;
}

function kkKey(v) {
  return kkText(v).toLowerCase()
    .replace(/\[[^\]]*\]|【[^】]*】|\([^)]*\)|（[^）]*）/g, "")
    .replace(/[\s\-_:：·.,，。!！?？/\\'"“”‘’]/g, "");
}
function kkChineseNumber(v) {
  if (/^\d+$/.test(v)) return Number(v);
  var p = String(v || "").split("十");
  if (p.length === 2) return (CHINESE_NUM[p[0]] || 1) * 10 + (CHINESE_NUM[p[1]] || 0);
  return CHINESE_NUM[v] || 0;
}
function kkSeason(v) {
  var m = kkText(v).match(/第\s*([一二三四五六七八九十两零\d]+)\s*[季部]|\bseason\s*(\d+)\b|\bs(\d+)\b/i);
  return m ? kkChineseNumber(m[1] || m[2] || m[3]) : 0;
}
function kkBaseTitle(v) {
  return kkKey(kkText(v).replace(/第\s*[一二三四五六七八九十两零\d]+\s*[季部]|\bseason\s*\d+\b|\bs\d+\b/gi, ""));
}
function kkScore(title, wanted, season) {
  if (!title) return 0;
  if (!EXCLUDED.test(wanted) && EXCLUDED.test(title)) return 0;
  var key = kkKey(title), target = kkKey(wanted);
  if (!key || !target) return 0;
  var found = kkSeason(title);
  if (season > 1 && found !== season) return 0;
  if ((!season || season === 1) && found > 1) return 0;
  var score = key === target ? 100 : 0;
  if (!score && kkBaseTitle(title) === kkBaseTitle(wanted)) score = 95;
  if (!score && target.length >= 2 && (key.indexOf(target) >= 0 || target.indexOf(key) >= 0) && Math.abs(key.length - target.length) <= 6) score = 75;
  return score;
}

// --- 详情：sid 与线路名 ---
async function kkDetail(base, hash) {
  if (_s.detailCache[hash]) return _s.detailCache[hash];
  var html = await kkGet(base + "/anime/" + hash + ".html");
  var sids = [], names = {}, m;
  var re = /#playlist(\d+)"[^>]*>([^<]*)<span>/ig;
  while ((m = re.exec(html))) {
    var sid = Number(m[1]);
    if (sids.indexOf(sid) < 0) sids.push(sid);
    names[sid] = kkText(m[2]);
  }
  if (!sids.length) {
    var re2 = /\/anime\/[a-f0-9]{24}\/play\/(\d+)\//ig;
    while ((m = re2.exec(html))) { var s2 = Number(m[1]); if (sids.indexOf(s2) < 0) sids.push(s2); }
    sids.sort(function (a, b) { return a - b; });
  }
  var result = { sids: sids, names: names };
  _s.detailCache[hash] = result;
  return result;
}

// --- 播放页 player_aaaa ---
function kkParsePlayer(html) {
  var i = html.indexOf("player_aaaa");
  if (i < 0) return null;
  var eq = html.indexOf("=", i);
  if (eq < 0) return null;
  var start = html.indexOf("{", eq);
  if (start < 0) return null;
  var depth = 0, end = -1;
  for (var k = start; k < html.length; k++) {
    var ch = html.charAt(k);
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end < 0) return null;
  try { return JSON.parse(html.slice(start, end + 1)); } catch (e) { return null; }
}

function kkUnescapeOnce(s) {
  return String(s)
    .replace(/%u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/%([0-9a-fA-F]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
}

function kkDecodeUrl(raw) {
  var s = String(raw == null ? "" : raw).replace(/&amp;/g, "&");
  for (var i = 0; i < 3; i++) {
    if (s.indexOf("%") < 0) break;
    var before = s;
    if (/%u[0-9a-fA-F]{4}/.test(s)) { s = kkUnescapeOnce(s); }
    else { try { s = decodeURIComponent(s); } catch (e) {} }
    if (s === before) break;
  }
  return s;
}

async function kkLineInfo(base, hash, sid, ep) {
  var html = await kkGet(base + "/anime/" + hash + "/play/" + sid + "/" + ep + ".html", base + "/anime/" + hash + ".html");
  return kkParsePlayer(html);
}

// --- 播放探测 ---
function kkParseUrl(url) {
  var m = String(url || "").match(/^(https?):\/\/([^\/?#]+)([^?#]*)/i);
  if (!m) return null;
  return { protocol: m[1], host: m[2], origin: m[1] + "://" + m[2], path: m[3] || "/" };
}

function kkResolveRel(base, ref) {
  ref = String(ref == null ? "" : ref).trim().replace(/^["']|["']$/g, "");
  if (!ref) return "";
  if (/^https?:\/\//i.test(ref)) return ref;
  var b = kkParseUrl(base);
  if (!b) return ref;
  if (ref.indexOf("//") === 0) return b.protocol + ":" + ref;
  var hash = "", query = "", main = ref;
  var hi = main.indexOf("#"); if (hi >= 0) { hash = main.slice(hi); main = main.slice(0, hi); }
  var qi = main.indexOf("?"); if (qi >= 0) { query = main.slice(qi); main = main.slice(0, qi); }
  var basePath = b.path.replace(/[?#].*$/, "");
  if (main === "") return b.origin + basePath + query + hash;
  var dir = basePath.replace(/[^\/]*$/, "");
  var full = main.charAt(0) === "/" ? main : dir + main;
  var segs = [], sp = full.split("/");
  for (var i = 0; i < sp.length; i++) {
    var seg = sp[i];
    if (seg === "") { if (i === 0) segs.push(""); continue; }
    if (seg === ".") continue;
    if (seg === "..") { if (segs.length > 1) segs.pop(); continue; }
    segs.push(seg);
  }
  var np = segs.join("/");
  if (np.charAt(0) !== "/") np = "/" + np;
  return b.origin + np + query + hash;
}

async function kkFetch(url, headers, binary) {
  var current = url;
  for (var i = 0; i < 4; i++) {
    var resp = await Widget.http.get(current, { headers: headers, base64Data: !!binary, allow_redirects: false });
    var st = kkStatus(resp);
    if (st >= 300 && st < 400) {
      var loc = kkHeader(resp.headers, "Location");
      if (!loc) throw new Error("跳转无效");
      current = kkResolveRel(current, loc);
      continue;
    }
    if (!(st === 0 || (st >= 200 && st < 300))) throw new Error("请求失败 " + st);
    return { resp: resp, url: current };
  }
  throw new Error("跳转过多");
}

async function kkPull(url, headers) {
  var r = await kkFetch(url, headers, false);
  return { body: kkBody(r.resp), url: r.url };
}

async function kkProbeBytes(url, headers, min) {
  var h = {};
  Object.keys(headers || {}).forEach(function (k) { h[k] = headers[k]; });
  h.Range = "bytes=0-1023";
  var start = Date.now();
  var r = await kkFetch(url, h, true);
  var type = kkHeader(r.resp.headers, "Content-Type").toLowerCase();
  if (/text\/html|application\/json/.test(type)) throw new Error("媒体无效");
  var data = r.resp.data;
  var len = typeof data === "string" ? data.replace(/\s/g, "").length : 0;
  if (len < (min || 1)) throw new Error("媒体为空");
  return Date.now() - start;
}

function kkVariants(body, baseUrl) {
  var lines = String(body).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("#EXT-X-STREAM-INF") !== 0) continue;
    for (var j = i + 1; j < lines.length; j++) { if (lines[j].charAt(0) === "#") continue; out.push(kkResolveRel(baseUrl, lines[j])); break; }
  }
  return out;
}

function kkFirstSeg(body, baseUrl) {
  var lines = String(body).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  var init = "";
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("#EXT-X-MAP:") === 0) { var mm = lines[i].match(/URI="([^"]+)"/); if (mm) init = kkResolveRel(baseUrl, mm[1]); continue; }
    if (lines[i].charAt(0) !== "#") return kkResolveRel(baseUrl, lines[i]);
  }
  return init;
}

async function kkProbeHLS(url, headers, depth) {
  if (depth > 2) throw new Error("层级过深");
  var r = await kkPull(url, headers);
  if (!/^\s*#EXTM3U/.test(r.body)) throw new Error("非HLS");
  var variants = kkVariants(r.body, r.url);
  if (variants.length) {
    var lastErr = "子列表不可用";
    for (var v = 0; v < Math.min(variants.length, 2); v++) {
      try { await kkProbeHLS(variants[v], headers, depth + 1); return; } catch (e) { lastErr = e.message; }
    }
    throw new Error(lastErr);
  }
  var seg = kkFirstSeg(r.body, r.url);
  if (!seg) return;
  await kkProbeBytes(seg, headers, 8);
}

async function kkProbe(url, headers) {
  if (_s.probeCache[url] !== undefined) return _s.probeCache[url];
  var start = Date.now(), result;
  try {
    if (!/^https?:\/\//i.test(url)) { result = { ok: false, reason: "无效地址" }; }
    else if (/\.(mp4|mkv|mov)(?:[?#]|$)/i.test(url)) { await kkProbeBytes(url, headers, 32); result = { ok: true, latency: Date.now() - start }; }
    else { await kkProbeHLS(url, headers, 0); result = { ok: true, latency: Date.now() - start }; }
  } catch (e) {
    result = { ok: false, reason: e && e.message ? e.message : String(e) };
  }
  _s.probeCache[url] = result;
  return result;
}

// --- 主入口 ---
async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var seriesName = kkText(params.seriesName || params.title || "");
  if (!seriesName) return [];

  var episode = Number(params.episode || params.ep || 1);
  if (!isFinite(episode) || episode < 1 || Math.floor(episode) !== episode) episode = 1;
  var maxLines = Number(params.maxLines);
  if (!isFinite(maxLines) || maxLines < 1) maxLines = 6;
  maxLines = Math.min(8, Math.floor(maxLines));
  var doProbe = params.probe !== "disabled";

  try {
    var base = await kkResolveBase();
    await kkSession(base, false);

    var season = kkSeason(seriesName);
    var list = await kkSearch(base, seriesName);
    var scored = list.map(function (it) { return { it: it, score: kkScore(it.title, seriesName, season) }; })
      .filter(function (e) { return e.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    if (!scored.length) { console.log("[233dm] 未匹配到正片: " + seriesName); return []; }
    var best = scored[0].it;
    if (!best || !best.hash) return [];

    var detail = await kkDetail(base, best.hash);
    var sids = detail.sids.slice(0, maxLines);
    if (!sids.length) return [];

    var headers = { "User-Agent": MEDIA_UA, "Referer": base + "/" };
    var title = best.title || seriesName;
    var isMovie = /movie/i.test(String(params.type || params.mediaType || ""));
    var epLabel = isMovie ? "正片" : ("第" + episode + "集");

    var tasks = sids.map(async function (sid) {
      try {
        var obj = await kkLineInfo(base, best.hash, sid, episode);
        if (!obj) return null;
        if (obj.flag && obj.flag !== "play") return null;
        if (Number(obj.trysee) > 0 || Number(obj.points) > 0) return null;
        var raw = obj.url || obj.url_next || "";
        if (!raw) return null;
        var playUrl = kkDecodeUrl(raw);
        if (!/^https?:\/\//i.test(playUrl)) return null;
        var name = detail.names[sid] || kkText(obj.from) || ("线路" + sid);
        var start = Date.now();
        if (doProbe) {
          var pr = await kkProbe(playUrl, headers);
          if (!pr.ok) { console.log("[233dm] " + name + " 不可播(" + pr.reason + ")"); return null; }
        }
        return {
          name: name + " · " + epLabel,
          description: title + " " + epLabel + " · " + name + (obj.from ? " (" + kkText(obj.from) + ")" : ""),
          url: playUrl,
          customHeaders: headers,
          headers: headers,
          _latency: Date.now() - start
        };
      } catch (e) { return null; }
    });

    var lines = await Promise.all(tasks);
    var seen = {};
    return lines.filter(function (x) {
      if (!x || seen[x.url]) return false;
      seen[x.url] = true;
      return true;
    }).sort(function (a, b) { return a._latency - b._latency; }).map(function (x) {
      delete x._latency;
      return x;
    });
  } catch (e) {
    console.log("[233dm] 失败: " + (e && e.message ? e.message : e));
    return [];
  }
}
