WidgetMetadata = {
  id: "test.f.233dm",
  title: "233测试F",
  description: "全部合并",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "测试", description: "测试", functionName: "loadF", type: "stream", cacheDuration: 0, params: [] }
  ]
};

const BASE = "https://cn.233dm.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const IDs = { a: "1", b: "2" };

function _btoa(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let out = "";
  for (let i = 0; i < str.length; i += 3) {
    const c1 = str.charCodeAt(i);
    const c2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
    out += i + 1 < str.length ? chars.charAt(((c2 & 15) << 2) | (c3 >> 6)) : "=";
    out += i + 2 < str.length ? chars.charAt(c3 & 63) : "=";
  }
  return out;
}

function genToken() {
  const key = [0x4e, 0x3f, 0xa9, 0xc2, 0x12, 0x7d, 0x88, 0xef, 0x55, 0xaa, 0x0b, 0xcd, 0xde, 0xad, 0xbe, 0xef];
  const ts = String(Date.now());
  let out = "";
  for (let i = 0; i < ts.length; i++) {
    out += String.fromCharCode(ts.charCodeAt(i) ^ key[i % key.length]);
  }
  return _btoa(out);
}

async function loadF(params) {
  const txt = "/anime/809ad6423ed1590537d75dd0/play/3/1.html";
  const m = txt.match(/\/anime\/([a-f0-9]{24})\/play\/(\d+)\/(\d+)\.html/);
  const token = genToken();
  let items = [];
  for (const k of ["a", "b"]) {
    items.push({ name: k + "=" + IDs[k], url: "https://example.com/" + k + ".m3u8" });
  }
  if (m) items.push({ name: "regexOK", url: "https://example.com/test.m3u8" });
  return items;
}
