/**************************************
@Name：播放源去广告
@Author：Xhy123
@Date：2026-10-17 03:58:31

 * 播放源 m3u8 去广告  (Quantumult X · script-response-body)
 * 拦截媒体播放列表 -> 查询广告分片区间 -> 删除广告分片
使用方法：
QuantumultX


$0
^https?://[^/]+\.dytt-(cinema|hot)\.com/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_ad.js
^https?://[^/]+\.rrcdnbf\d+\.com/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_ad.js
^https?://[^/]+\.lz-cdn\d+\.com/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_ad.js
^https?://[^/]*fengbao\d*\.com/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_ad.js

[mitm]
hostname = *.dytt-cinema.com, *.dytt-hot.com, *.rrcdnbf1.com, *.rrcdnbf2.com, *.rrcdnbf6.com, *.lz-cdn8.com, fengbao13.com





====================================
⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
******************************************/





















var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_URL_PAT = /adjump/i; // 分片URL含该词即广告(如 /video/adjump/time/0000000.ts)
var KK_AD_DEBUG = false;       // 改为 true 可收到触发/结果通知

function kkNotify(t, s, b) { try { if (KK_AD_DEBUG && typeof $notify === "function") $notify(t, s, b); } catch (e) {} }
function kkCountSeg(lines) { var n = 0; for (var i = 0; i < lines.length; i++) { if (lines[i].charAt(0) !== "#" && lines[i].length) n++; } return n; }
function kkCollapseDisc(lines) {
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (l.indexOf("#EXT-X-DISCONTINUITY") === 0 && out.length && out[out.length - 1].indexOf("#EXT-X-DISCONTINUITY") === 0) continue;
    out.push(l);
  }
  return out;
}
function kkFilter(lines, ranges) {
  var ad = {}, i, k;
  for (i = 0; i < ranges.length; i++) {
    var s = ranges[i].start, e = ranges[i].end;
    if (typeof s !== "number" || typeof e !== "number") continue;
    for (k = s; k < e; k++) ad[k] = true;
  }
  var out = [], pending = [], idx = 0;
  for (i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (ln.charAt(0) === "#") { pending.push(ln); continue; }
    var isAd = ad[idx] || KK_AD_URL_PAT.test(ln);
    if (isAd) { pending = []; }
    else { for (k = 0; k < pending.length; k++) out.push(pending[k]); out.push(ln); pending = []; }
    idx++;
  }
  for (k = 0; k < pending.length; k++) out.push(pending[k]);
  return kkCollapseDisc(out);
}
(function () {
  try {
    var url = ($request && $request.url) || "";
    var body = ($response && $response.body) || "";
    if (!body || body.indexOf("#EXTM3U") < 0) { $done({}); return; }
    if (body.indexOf("#EXTINF") < 0) { $done({}); return; } // 主列表不改
    if (url.indexOf(".m3u8") < 0 && !KK_AD_URL_PAT.test(url)) { $done({}); return; }
    var lines = body.split(/\r?\n/);
    var total = kkCountSeg(lines);
    if (total < 2) { $done({}); return; }
    var api = KK_AD_API + "?url=" + encodeURIComponent(url) + "&seen_total=" + total + "&lenfast=1&jsv=" + KK_AD_JSV + "&_ts=" + Date.now();
    $httpClient.get({ url: api, headers: { "User-Agent": "Mozilla/5.0" } }, function (err, resp, data) {
      var ranges = [];
      if (!err && data) { try { var j = JSON.parse(data); ranges = (j.ad_ranges || []).concat(j.ad_blocks || []); } catch (e) {} }
      var out = kkFilter(lines, ranges);
      if (kkCountSeg(out) < total) {
        console.log("[Bfyqgg] 去广告 " + total + " -> " + kkCountSeg(out));
        kkNotify("Bfyqgg去广告", "已删 " + total + "->" + kkCountSeg(out), url.slice(0, 80) + " " + JSON.stringify(ranges));
        $done({ body: out.join("\n") });
      } else { kkNotify("Bfyqgg去广告", "无广告", "段=" + total + " " + url.slice(0, 70)); $done({}); }
    });
  } catch (e) { $done({}); }
})();
