WidgetMetadata = {
  id: "test.g.233dm",
  title: "233测试G",
  description: "三线+硬编码返回",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "天堂线路", description: "天堂", functionName: "loadG1", type: "stream", cacheDuration: 0, params: [] },
    { id: "loadResource", title: "暴风线路", description: "暴风", functionName: "loadG2", type: "stream", cacheDuration: 0, params: [] },
    { id: "loadResource", title: "量子线路", description: "量子", functionName: "loadG3", type: "stream", cacheDuration: 0, params: [] }
  ]
};

const URL_BASE = "https://example.com";

async function loadG1(params) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  return [{ name: "天堂", url: URL_BASE + "/tiantang/" + encodeURIComponent(name) + ".m3u8" }];
}
async function loadG2(params) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  return [{ name: "暴风", url: URL_BASE + "/baofeng/" + encodeURIComponent(name) + ".m3u8" }];
}
async function loadG3(params) {
  const name = String(params.seriesName || "").trim();
  if (!name) return [];
  return [{ name: "量子", url: URL_BASE + "/liangzi/" + encodeURIComponent(name) + ".m3u8" }];
}
