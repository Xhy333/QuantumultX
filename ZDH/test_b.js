WidgetMetadata = {
  id: "test.b.233dm",
  title: "233测试B",
  description: "加Widget.http调用",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "线路测试", description: "测试", functionName: "loadB", type: "stream", cacheDuration: 0, params: [] }
  ]
};

async function loadB(params) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  try {
    const r = await Widget.http.get("https://cn.233dm.com/index.php/ajax/suggest?mid=1&wd=" + encodeURIComponent(name), {
      headers: { "User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest" }
    });
    const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    if (d && d.list && d.list.length > 0) {
      return [{ name: d.list[0].name, url: "https://example.com/test.m3u8" }];
    }
    return [];
  } catch (e) { return []; }
}
