WidgetMetadata = {
  id: "test.a.233dm",
  title: "233测试A",
  description: "仅Metadata+空函数",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "天堂线路", description: "天堂", functionName: "loadA", type: "stream", cacheDuration: 0, params: [] }
  ]
};

async function loadA(params) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  return [{ name: "测试", url: "https://example.com/" + name + ".m3u8" }];
}
