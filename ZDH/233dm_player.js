WidgetMetadata = {
  id: "https://cn.233dm.com?rev=20260718e",
  title: "233动漫播放源",
  description: "233动漫 天堂/暴风/量子 三线路播放源",
  author: "Forward",
  site: "https://cn.233dm.com",
  version: "1.0.1",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "天堂线路", description: "233动漫天堂线路", functionName: "loadTiantang", type: "stream", cacheDuration: 0, params: [] },
    { id: "loadResource", title: "暴风线路", description: "233动漫暴风线路", functionName: "loadBaofeng", type: "stream", cacheDuration: 0, params: [] },
    { id: "loadResource", title: "量子线路", description: "233动漫量子线路", functionName: "loadLiangzi", type: "stream", cacheDuration: 0, params: [] }
  ]
};

const BASE = "https://cn.233dm.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PLAY_UA = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";
const SRC_IDS = { tiantang: "3", baofeng: "2", liangzi: "4" };
const SRC_NAMES = { tiantang: "天堂", baofeng: "暴风", liangzi: "量子" };

// 模块级缓存：避免三个线路重复请求
const _cache = {
  bypassed: false,
  hash: new Map(),       // name -> hash
  suggest: new Map(),    // name -> suggest list
  resolved: new Map()    // "name:ep:sk" -> result[]
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
  if (_cache.bypassed) return;
  try {
    await Widget.http.get(BASE + "/", { headers: { "User-Agent": UA } });
    const token = genToken();
    await Widget.http.post(BASE + "/index.php/ajax/verify_check?type=search",
      "i=" + encodeURIComponent(token), {
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Referer": BASE + "/" }
      }
    );
    _cache.bypassed = true;
    console.log("[233dm] bypass 成功");
  } catch (e) {
    console.log("[233dm] bypass 失败: " + (e.message || e));
  }
}

async function getHash(name) {
  const cached = _cache.hash.get(name);
  if (cached !== undefined) return cached;
  await bypass();
  try {
    const resp = await Widget.http.get(BASE + "/search/" + encodeURIComponent(name) + "-------------.html",
      { headers: { "User-Agent": UA, "Referer": BASE + "/" } }
    );
    const html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    const m = html.match(/\/anime\/([a-f0-9]{24})\.html/);
    const hash = m ? m[1] : "";
    _cache.hash.set(name, hash);
    console.log("[233dm] getHash(" + name + "): " + (hash || "未找到"));
    return hash;
  } catch (e) {
    console.log("[233dm] getHash 失败: " + (e.message || e));
    return "";
  }
}

async function suggest(name) {
  const cached = _cache.suggest.get(name);
  if (cached !== undefined) return cached;
  try {
    const sr = await Widget.http.get(BASE + "/index.php/ajax/suggest", {
      params: { mid: "1", wd: name },
      headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" }
    });
    const sd = (typeof sr.data === "string") ? JSON.parse(sr.data) : sr.data;
    _cache.suggest.set(name, sd);
    return sd;
  } catch (e) {
    console.log("[233dm] suggest 失败: " + (e.message || e));
    return null;
  }
}

async function resolve(params, sk) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  const ep = parseInt(params.episode, 10) || 1;
  const sid = SRC_IDS[sk];
  const sname = SRC_NAMES[sk];
  if (!sid) return [];

  // 优先从缓存取完整结果
  const cacheKey = name + ":" + ep + ":" + sk;
  const cachedResult = _cache.resolved.get(cacheKey);
  if (cachedResult !== undefined) {
    console.log("[233dm] 命中 resolve 缓存: " + cacheKey);
    return cachedResult;
  }

  const sd = await suggest(name);
  if (!sd || sd.code !== 1 || !sd.list || sd.list.length === 0) {
    console.log("[233dm] suggest 无结果");
    return [];
  }

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
    if (!pm) {
      console.log("[233dm] 未找到 player_aaaa 配置");
      return [];
    }
    const pd = JSON.parse(pm[1]);
    const eu = pd.url || "";
    if (!eu) return [];
    let url = decodeURIComponent(eu);
    url = url.replace(/&amp;/g, "&");
    const result = [{
      name: sname + "线路",
      description: sname + " 1080P",
      url: url,
      customHeaders: { "User-Agent": PLAY_UA, "Referer": BASE + "/" },
      headers: { "User-Agent": PLAY_UA, "Referer": BASE + "/" }
    }];
    _cache.resolved.set(cacheKey, result);
    return result;
  } catch (e) {
    console.log("[233dm] 解析播放页失败: " + (e.message || e));
    return [];
  }
}

async function loadTiantang(params) { return resolve(params, "tiantang"); }
async function loadBaofeng(params) { return resolve(params, "baofeng"); }
async function loadLiangzi(params) { return resolve(params, "liangzi"); }
