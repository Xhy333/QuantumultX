WidgetMetadata = {
  id: "test.d.233dm",
  title: "233测试D",
  description: "加正则",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "测试", description: "测试", functionName: "loadD", type: "stream", cacheDuration: 0, params: [] }
  ]
};

async function loadD(params) {
  const txt = "/anime/809ad6423ed1590537d75dd0/play/3/1.html";
  const m = txt.match(/\/anime\/([a-f0-9]{24})\/play\/(\d+)\/(\d+)\.html/);
  if (m) {
    return [{ name: "hash=" + m[1] + " sid=" + m[2] + " ep=" + m[3], url: "https://example.com/test.m3u8" }];
  }
  return [];
}
