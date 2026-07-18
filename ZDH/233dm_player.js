// --- 233dm 默认线路配置 ---
const DEFAULT_SITES = "天堂,dyttm3u8\n暴风,bfzym3u8\n量子,lzm3u8";
const CHINESE_NUM_MAP = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
};

WidgetMetadata = {
  id: "https://cn.233dm.com?rev=20260718i",
  title: "233动漫播放源",
  description: "233动漫 天堂/暴风/量子 三线路播放源",
  author: "233",
  site: "https://cn.233dm.com",
  version: "1.2.0",
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
      name: "VodData",
      title: "线路配置（名称,from值）",
      type: "input",
      value: DEFAULT_SITES
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "加载资源",
      description: "233动漫播放源",
      functionName: "loadResource",
      type: "stream",
      params: [],
    }
  ],
};

const BASE = "https://cn.233dm.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PLAY_UA = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";

// --- 辅助工具函数 ---

const isM3U8Url = (url) => url?.toLowerCase().includes('m3u8') || false;

function extractSeasonInfo(seriesName) {
  if (!seriesName) return { baseName: seriesName, seasonNumber: 1 };
  const chineseMatch = seriesName.match(/第([一二三四五六七八九十\d]+)[季部]/);
  if (chineseMatch) {
    const val = chineseMatch[1];
    const seasonNum = CHINESE_NUM_MAP[val] || parseInt(val) || 1;
    const baseName = seriesName.replace(/第[一二三四五六七八九十\d]+[季部]/, '').trim();
    return { baseName, seasonNumber: seasonNum };
  }
  const digitMatch = seriesName.match(/(.+?)(\d+)$/);
  if (digitMatch) {
    return { baseName: digitMatch[1].trim(), seasonNumber: parseInt(digitMatch[2]) || 1 };
  }
  return { baseName: seriesName.trim(), seasonNumber: 1 };
}
// 模块级缓存
const _cache = {
  bypassed: false,
  hash: new Map(),
  suggest: new Map(),
  // 缓存 (hash:from) -> sid，避免重复扫描
  sidFrom: new Map()
};

function parseSourceSites(VodData) {
  try {
    const trimmed = (VodData || "").trim();
    if (!trimmed) return [];
    const lines = trimmed.split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2 && parts[1]) {
        return { name: parts[0], from: parts[1] };
      }
      return null;
    }).filter(Boolean);
  } catch (e) { return []; }
}

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
    const sr = await Widget.http.get(BASE + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(name), {
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

/**
 * 扫描 sids 1~6，找到匹配 from 值的 sid
 * 因为不同动漫的 sid 到 from 映射不同，需要动态查找
 */
async function findSidByFrom(hash, targetFrom) {
  const cacheKey = hash + ":" + targetFrom;
  const cached = _cache.sidFrom.get(cacheKey);
  if (cached !== undefined) return cached;

  for (let sid = 1; sid <= 6; sid++) {
    try {
      const url = BASE + "/anime/" + hash + "/play/" + sid + "/1.html";
      const pr = await Widget.http.get(url, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
      const ph = typeof pr.data === "string" ? pr.data : String(pr.data || "");
      const pm = ph.match(/player_aaaa\s*=\s*(\{[^;]+\})/);
      if (!pm) continue;
      const pd = JSON.parse(pm[1]);
      if (pd.from === targetFrom) {
        _cache.sidFrom.set(cacheKey, sid);
        return sid;
      }
    } catch (e) { /* continue */ }
  }
  _cache.sidFrom.set(cacheKey, null);
  return null;
}

async function resolveByFrom(hash, targetFrom, sname, ep) {
  const sid = await findSidByFrom(hash, targetFrom);
  if (!sid) return [];

  try {
    const playUrl = BASE + "/anime/" + hash + "/play/" + sid + "/" + ep + ".html";
    const pr = await Widget.http.get(playUrl, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
    const ph = typeof pr.data === "string" ? pr.data : String(pr.data || "");
    const pm = ph.match(/player_aaaa\s*=\s*(\{[^;]+\})/);
    if (!pm) return [];

    const pd = JSON.parse(pm[1]);
    const eu = pd.url || "";
    if (!eu) return [];

    let url;
    try { url = decodeURIComponent(eu); } catch (e) { url = eu; }
    url = url.replace(/&amp;/g, "&");

    if (!url.startsWith("http://") && !url.startsWith("https://")) return [];

    return [{
      name: sname,
      description: sname + " 1080P",
      url: url,
      customHeaders: { "User-Agent": PLAY_UA, "Referer": BASE + "/" },
      headers: { "User-Agent": PLAY_UA, "Referer": BASE + "/" }
    }];
  } catch (e) { return []; }
}

// --- 主入口 ---

async function loadResource(params) {
  const { seriesName, episode, multiSource, VodData } = params;
  if (multiSource !== "enabled" || !seriesName) return [];

  const targetEpisode = episode ? parseInt(episode) : 1;
  const siteList = parseSourceSites(VodData);
  if (siteList.length === 0) return [];

  console.log("[233dm] 搜索: " + seriesName + " 第" + targetEpisode + "集 线路:" + siteList.length + "个");

  // 先执行反爬验证（verify_check），再调用任何 API
  await bypass();

  const sd = await suggest(seriesName);
  if (!sd || sd.code !== 1 || !sd.list || sd.list.length === 0) return [];

  let best = null;
  for (const item of sd.list) {
    if (item.name === seriesName) { best = item; break; }
    if (item.name.indexOf(seriesName) >= 0) best = item;
  }
  if (!best) best = sd.list[0];
  if (!best || !best.name) return [];

  const hash = await getHash(best.name);
  if (!hash) return [];

  // 按配置顺序尝试各线路（通过 from 值动态查找对应的 sid）
  for (const site of siteList) {
    console.log("[233dm] 尝试: " + site.name + " (from=" + site.from + ")");
    const result = await resolveByFrom(hash, site.from, site.name, targetEpisode);
    if (result.length > 0) {
      console.log("[233dm] " + site.name + " 成功");
      return result;
    }
    console.log("[233dm] " + site.name + " 无结果，尝试下一个");
  }
  return [];
}
