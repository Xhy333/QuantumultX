WidgetMetadata = {
  id: "test.c.233dm",
  title: "233测试C",
  description: "三个模块",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "路线A", description: "路线A", functionName: "loadCA", type: "stream", cacheDuration: 0, params: [] },
    { id: "loadResource", title: "路线B", description: "路线B", functionName: "loadCB", type: "stream", cacheDuration: 0, params: [] },
    { id: "loadResource", title: "路线C", description: "路线C", functionName: "loadCC", type: "stream", cacheDuration: 0, params: [] }
  ]
};

async function loadCA(params) {
  return [{ name: "路线A", url: "https://example.com/a.m3u8" }];
}
async function loadCB(params) {
  return [{ name: "路线B", url: "https://example.com/b.m3u8" }];
}
async function loadCC(params) {
  return [{ name: "路线C", url: "https://example.com/c.m3u8" }];
}
