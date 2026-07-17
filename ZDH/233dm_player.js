WidgetMetadata = {
  id: "test.233dm.v1",
  title: "233测试1",
  description: "相同结构测试",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "测试源", description: "测试", functionName: "loadV1", type: "stream", cacheDuration: 0, params: [] }
  ]
};

async function loadV1(params) {
  return [{ name: "测试", url: "https://example.com/test.m3u8" }];
}
