WidgetMetadata = {
  id: "cn.233dm.player",
  title: "233动漫播放源",
  description: "233动漫 天堂/暴风/量子 三线路",
  author: "Forward",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "tiantang", title: "天堂线路", functionName: "loadTiantang", type: "stream", params: [
      { name: "seriesName", title: "动漫名称", type: "input" },
      { name: "episode", title: "集数", type: "input" }
    ]},
    { id: "baofeng", title: "暴风线路", functionName: "loadBaofeng", type: "stream", params: [
      { name: "seriesName", title: "动漫名称", type: "input" },
      { name: "episode", title: "集数", type: "input" }
    ]},
    { id: "liangzi", title: "量子线路", functionName: "loadLiangzi", type: "stream", params: [
      { name: "seriesName", title: "动漫名称", type: "input" },
      { name: "episode", title: "集数", type: "input" }
    ]}
  ]
};

const _B = "https://cn.233dm.com";
const _U = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const _P = "AppleCoreMedia/1.0.0.21F90 (iPhone; U; CPU OS 17_5 like Mac OS X; zh_cn)";

async function _search(kw) {
  var r = await Widget.http.get(_B + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(kw), {
    headers: { "User-Agent": _U, "X-Requested-With": "XMLHttpRequest" }
  });
  var d = (typeof r.data === "string") ? JSON.parse(r.data) : r.data;
  if (!d || d.code !== 1 || !d.list || d.list.length === 0) return null;
  for (var i = 0; i < d.list.length; i++) {
    if (d.list[i].name === kw) return d.list[i];
  }
  return d.list[0];
}

async function _hash(nm) {
  await Widget.http.get(_B + "/", { headers: { "User-Agent": _U } });
  var r = await Widget.http.get(_B + "/search/" + encodeURIComponent(nm) + "-------------.html", {
    headers: { "User-Agent": _U, "Referer": _B + "/" }
  });
  var h = typeof r.data === "string" ? r.data : String(r.data || "");
  var m = h.match(/\/anime\/([a-f0-9]{24})\.html/);
  return m ? m[1] : null;
}

async function _play(hash, sid, ep) {
  var u = _B + "/anime/" + hash + "/play/" + sid + "/" + ep + ".html";
  var r = await Widget.http.get(u, { headers: { "User-Agent": _U, "Referer": _B + "/" } });
  var h = typeof r.data === "string" ? r.data : String(r.data || "");
  var m = h.match(/player_aaaa\s*=\s*(\{[^;]+\})/);
  if (!m) return null;
  var d = JSON.parse(m[1]);
  if (!d.url) return null;
  var url = decodeURIComponent(d.url);
  url = url.replace(/&amp;/g, "&");
  return url;
}

async function resolve(params, sid, sn) {
  var name = String(params.seriesName || "").trim();
  if (!name) return [];
  var ep = parseInt(params.episode, 10) || 1;
  var anime = await _search(name);
  if (!anime || !anime.name) return [];
  var hash = await _hash(anime.name);
  if (!hash) return [];
  var url = await _play(hash, sid, ep);
  if (!url) return [];
  return [{
    name: sn + "线路",
    description: sn + " 1080P",
    url: url,
    customHeaders: { "User-Agent": _P, "Referer": _B + "/" },
    headers: { "User-Agent": _P, "Referer": _B + "/" }
  }];
}

async function loadTiantang(p) { return resolve(p, "3", "天堂"); }
async function loadBaofeng(p) { return resolve(p, "2", "暴风"); }
async function loadLiangzi(p) { return resolve(p, "4", "量子"); }
