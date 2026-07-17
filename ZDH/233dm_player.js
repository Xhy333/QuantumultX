WidgetMetadata = {
  id: "https://cn.233dm.com?rev=20260718g",
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
    { title: "剧场版", description: "最新剧场版", functionName: "listMovie", cacheDuration: 600, params: [
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
  ]
};

const BASE = "https://cn.233dm.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const PLAY_UA = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";
const SRC_IDS = { tiantang: "3", baofeng: "2", liangzi: "4" };
const SRC_NAMES = { tiantang: "天堂", baofeng: "暴风", liangzi: "量子" };
const CAT_IDS = { listJapan: "1", listChina: "2", listDonghua: "5", listMovie: "24", listUS: "3", listTokusatsu: "4" };

async function listJapan(p) { return fetchList("listJapan", p); }
async function listChina(p) { return fetchList("listChina", p); }
async function listDonghua(p) { return fetchList("listDonghua", p); }
async function listMovie(p) { return fetchList("listMovie", p); }
async function listUS(p) { return fetchList("listUS", p); }
async function listTokusatsu(p) { return fetchList("listTokusatsu", p); }

async function fetchList(fn, p) {
  const cid = CAT_IDS[fn];
  if (!cid) return [];
  const page = parseInt(p.page, 10) || 1;
  const count = parseInt(p.count, 10) || 20;
  try {
    const resp = await Widget.http.get(BASE + "/type/" + cid + ".html" + (page > 1 ? "?page=" + page : ""), { headers: { "User-Agent": UA } });
    const html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    const re = /<a [^>]*href="\/anime\/([a-f0-9]{24})\.html"[^>]*>([^<]+)<\/a>/g;
    const seen = {};
    const items = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const h = m[1];
      const t = m[2].trim();
      if (!t || t.length < 2 || seen[h]) continue;
      seen[h] = true;
      if (items.length >= count) break;
      items.push({ id: h, type: "url", title: t, link: BASE + "/anime/" + h + ".html" });
    }
    return items;
  } catch (e) { return []; }
}

async function loadResource(p) {
  const name = String(p.seriesName || "").trim();
  if (!name) return [];
  const ep = parseInt(p.episode, 10) || 1;
  const sk = String(p.source || "tiantang").toLowerCase();
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

  // get hash via search
  try {
    await Widget.http.get(BASE + "/", { headers: { "User-Agent": UA } });
  } catch (e) {}
  try {
    const resp = await Widget.http.get(BASE + "/search/" + encodeURIComponent(best.name) + "-------------.html",
      { headers: { "User-Agent": UA, "Referer": BASE + "/" } }
    );
    const html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    const m = html.match(/\/anime\/([a-f0-9]{24})\.html/);
    if (!m) return [];
    const hash = m[1];
    const playUrl = BASE + "/anime/" + hash + "/play/" + sid + "/" + ep + ".html";
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
