// --- 233dm 线路播放源配置 ---
const RESOURCE_SITES = [
  { title: '天堂线路', sid: '3', from: 'dyttm3u8', name: '天堂' },
  { title: '暴风线路', sid: '2', from: 'bfzym3u8', name: '暴风' },
  { title: '量子线路', sid: '4', from: 'lzm3u8', name: '量子' }
];

const CHINESE_NUM_MAP = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
};

WidgetMetadata = {
  id: "https://cn.233dm.com?rev=20260718g",
  title: "233动漫播放源",
  icon: "https://cn.233dm.com/template/the4/statics/img/favicon.ico",
  version: "1.2.0",
  requiredVersion: "0.0.1",
  description: "233动漫 天堂/暴风/量子 三线路播放源",
  author: "233",
  site: "https://cn.233dm.com",
  globalParams: [
    {
      name: "source",
      title: "播放线路",
      type: "enumeration",
      enumOptions: [
        { title: "全部线路（按顺序尝试）", value: "all" },
        { title: "天堂线路", value: "3" },
        { title: "暴风线路", value: "2" },
        { title: "量子线路", value: "4" }
      ]
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
const CACHE_TTL = 10800; // 3小时缓存

function extractSeasonInfo(seriesName) {
  if (!seriesName) return { baseName: seriesName, seasonNumber: 1 };
  const chineseMatch = seriesName.match(/第([一二三四五六七八九十\d]+)[季部]/);
  if (chineseMatch) {
    const val = chineseMatch[1];
    const seasonNum = CHINESE_NUM_MAP[val] || parseInt(val) || 1;
    const baseName = seriesName.replace(/第[一二三四五六七八九十\d]+[季部]/, '').trim();
    return { baseName, seasonNumber: seasonNum };
  }
  return { baseName: seriesName.trim(), seasonNumber: 1 };
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

// --- 模块级内存缓存（减少重复请求） ---
const _cache = {
  bypassed: false,
  hash: new Map(),
  suggest: new Map()
};

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

// --- 核心加载函数 ---

async function loadResource(params) {
  const { seriesName, episode } = params;
  const name = String(seriesName || "").trim();
  if (!name) return [];

  const targetEpisode = episode ? parseInt(episode) : 1;
  const { baseName } = extractSeasonInfo(name);
  const searchName = baseName || name;

  // 确定要尝试的线路列表
  const rawSource = String(params.source || "all").trim();
  let siteList;
  if (rawSource === "all") {
    siteList = RESOURCE_SITES;
  } else {
    const matched = RESOURCE_SITES.find(s => s.sid === rawSource);
    siteList = matched ? [matched] : RESOURCE_SITES;
  }

  console.log("[233dm] 搜索: " + searchName + " 第" + targetEpisode + "集 线路:" + siteList.length + "个");

  // 尝试从 Widget.storage 缓存读取（按剧名+集数+线路缓存）
  const storageKey = "233dm_" + searchName + "_" + targetEpisode;
  let cachedResult = null;
  try {
    cachedResult = Widget.storage.get(storageKey);
    if (cachedResult && Array.isArray(cachedResult) && cachedResult.length > 0) {
      console.log("[233dm] 命中 storage 缓存: " + storageKey);
      return cachedResult;
    }
  } catch (e) {}

  // 获取 suggest + hash（所有线路共享）
  const sd = await suggest(searchName);
  if (!sd || sd.code !== 1 || !sd.list || sd.list.length === 0) {
    console.log("[233dm] suggest 无结果");
    return [];
  }

  let best = null;
  for (const item of sd.list) {
    if (item.name === searchName || item.name.indexOf(searchName) >= 0) { best = item; break; }
  }
  if (!best) best = sd.list[0];
  if (!best || !best.name) return [];

  const hash = await getHash(best.name);
  if (!hash) {
    console.log("[233dm] 未找到 hash");
    return [];
  }

  // 按顺序尝试各线路
  for (const site of siteList) {
    try {
      const playUrl = BASE + "/anime/" + hash + "/play/" + site.sid + "/" + targetEpisode + ".html";
      console.log("[233dm] 尝试: " + site.title + " " + playUrl);

      const pr = await Widget.http.get(playUrl, { headers: { "User-Agent": UA, "Referer": BASE + "/" } });
      const ph = typeof pr.data === "string" ? pr.data : String(pr.data || "");
      const pm = ph.match(/player_aaaa\s*=\s*(\{[^;]+\})/);
      if (!pm) {
        console.log("[233dm] " + site.title + " 未找到 player_aaaa");
        continue;
      }

      const pd = JSON.parse(pm[1]);
      const eu = pd.url || "";
      if (!eu) {
        console.log("[233dm] " + site.title + " url 为空");
        continue;
      }

      let url;
      try {
        url = decodeURIComponent(eu);
      } catch (e) {
        // 如果 decode 失败，尝试直接使用原始值
        url = eu;
      }
      url = url.replace(/&amp;/g, "&");

      // 过滤非 URL 值（如精品线路返回的 hash）
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        console.log("[233dm] " + site.title + " url 非 HTTP 链接，跳过: " + url.substring(0, 50));
        continue;
      }

      const result = [{
        name: site.name + "线路",
        description: site.name + " 1080P",
        url: url,
        customHeaders: { "User-Agent": PLAY_UA, "Referer": BASE + "/" },
        headers: { "User-Agent": PLAY_UA, "Referer": BASE + "/" }
      }];

      // 写入 storage 缓存
      try { Widget.storage.set(storageKey, result, CACHE_TTL); } catch (e) {}

      console.log("[233dm] " + site.title + " 成功");
      return result;
    } catch (e) {
      console.log("[233dm] " + site.title + " 失败: " + (e.message || e));
    }
  }

  console.log("[233dm] 所有线路均失败");
  return [];
}
