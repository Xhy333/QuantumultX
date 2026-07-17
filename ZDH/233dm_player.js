WidgetMetadata = {
  id: "test.233dm.v3",
  title: "233测试3",
  description: "复杂函数测试",
  author: "Test",
  site: "https://cn.233dm.com",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    { id: "loadResource", title: "测试源", description: "测试", functionName: "loadV3", type: "stream", cacheDuration: 0, params: [] }
  ]
};

const BASE = "https://cn.233dm.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const IDs = { tiantang: "3", baofeng: "2" };
const NAMES = { tiantang: "天堂", baofeng: "暴风" };

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

async function loadV3(params) {
  const seriesName = String(params.seriesName || "").trim();
  if (!seriesName) return [];
  return [{ name: "测试", url: "https://example.com/" + seriesName + ".m3u8" }];
}
