WidgetMetadata = {
  id: "test.minimal.v2",
  title: "最小测试",
  description: "测试是否能加载",
  author: "Test",
  site: "https://example.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "测试源", description: "测试", functionName: "loadTest", type: "stream", cacheDuration: 0, params: [] }
  ]
};

async function loadTest(params) {
  return [{ name: "测试", url: "https://example.com/test.m3u8" }];
}
