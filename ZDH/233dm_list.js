WidgetMetadata = {
  id: "cn.233dm.list",
  title: "233动漫列表",
  description: "233动漫搜索与剧集浏览",
  author: "Forward",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 60,
  modules: [
    { id: "loadList", title: "动漫搜索", functionName: "loadList", params: [
      { name: "keyword", title: "搜索关键词", type: "input", value: "海贼王" }
    ]}
  ]
};

var _B = "https://cn.233dm.com";
var _U = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function loadList(params) {
  var kw = String(params.keyword || "").trim();
  if (!kw) return [];
  var r = await Widget.http.get(_B + "/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(kw), {
    headers: { "User-Agent": _U, "X-Requested-With": "XMLHttpRequest" }
  });
  var d = (typeof r.data === "string") ? JSON.parse(r.data) : r.data;
  if (!d || d.code !== 1 || !d.list) return [];
  return d.list.map(function(item) {
    return {
      id: item.id || 0,
      type: "url",
      title: item.name || "",
      posterPath: item.cover || "",
      link: "detail:" + encodeURIComponent(item.name),
      description: item.remarks || ""
    };
  });
}

async function loadDetail(link) {
  var nm = decodeURIComponent(link.replace(/^detail:/, ""));
  if (!nm) return {};
  await Widget.http.get(_B + "/", { headers: { "User-Agent": _U } });
  var r = await Widget.http.get(_B + "/search/" + encodeURIComponent(nm) + "-------------.html", {
    headers: { "User-Agent": _U, "Referer": _B + "/" }
  });
  var html = typeof r.data === "string" ? r.data : String(r.data || "");
  var hm = html.match(/\/anime\/([a-f0-9]{24})\.html/);
  if (!hm) return {};
  var hash = hm[1];
  r = await Widget.http.get(_B + "/anime/" + hash + ".html", {
    headers: { "User-Agent": _U, "Referer": _B + "/" }
  });
  html = typeof r.data === "string" ? r.data : String(r.data || "");
  var eps = [];
  var re = /<a[^>]+href="\/anime\/[^/]+\/play\/\d+\/(\d+)\.html"[^>]*>([^<]+)<\/a>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    eps.push({
      id: m[1],
      type: "url",
      title: (m[2] || "第" + m[1] + "集").trim(),
      link: "ep:" + hash + ":" + m[1],
      episode: parseInt(m[1], 10)
    });
  }
  return { title: nm, backdropPaths: [], relatedItems: eps };
}
