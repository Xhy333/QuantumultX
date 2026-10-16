/**************************************
@Name：播放源去广告-诊断(边删边通知)
@Author：Xhy123
与正式脚本相同，但“始终弹通知”，用于确认真实 m3u8 是否命中/是否删到广告。
临时用法(catch-all)：
[rewrite_local]
^https?:// url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_ad_debug.js
[mitm]
hostname = *
**************************************/
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
function kkNotify(t, s, b) { try { if (typeof $notify === "function") $notify(t, s, b); } catch (e) {} }
function kkCountSeg(lines) { var n = 0; for (var i = 0; i < lines.length; i++) { if (lines[i].charAt(0) !== "#" && lines[i].length) n++; } return n; }
function kkFilter(lines, ranges) {
  var ad = {}, i, k;
  for (i = 0; i < ranges.length; i++) { var s = ranges[i].start, e = ranges[i].end; if (typeof s !== "number" || typeof e !== "number") continue; for (k = s; k < e; k++) ad[k] = true; }
  var out = [], pending = [], idx = 0;
  for (i = 0; i < lines.length; i++) { var ln = lines[i]; if (ln.charAt(0) === "#") { pending.push(ln); continue; } if (ad[idx]) { pending = []; } else { for (k = 0; k < pending.length; k++) out.push(pending[k]); out.push(ln); pending = []; } idx++; }
  for (k = 0; k < pending.length; k++) out.push(pending[k]);
  return out;
}
(function () {
  try {
    var url = ($request && $request.url) || "";
    var body = ($response && $response.body) || "";
    if (url.indexOf(".m3u8") < 0) { $done({}); return; }
    kkNotify("Bfyqgg诊断", "m3u8请求", url.slice(0, 110));
    if (!body || body.indexOf("#EXTM3U") < 0) { $done({}); return; }
    if (body.indexOf("#EXTINF") < 0) { kkNotify("Bfyqgg诊断", "主列表(放行)", url.slice(0, 100)); $done({}); return; }
    var lines = body.split(/\r?\n/); var total = kkCountSeg(lines);
    var api = KK_AD_API + "?url=" + encodeURIComponent(url) + "&seen_total=" + total + "&lenfast=1&jsv=" + KK_AD_JSV + "&_ts=" + Date.now();
    $httpClient.get({ url: api, headers: { "User-Agent": "Mozilla/5.0" } }, function (err, resp, data) {
      if (err || !data) { kkNotify("Bfyqgg诊断", "接口失败", String(err).slice(0, 80)); $done({}); return; }
      var ranges = []; try { var j = JSON.parse(data); ranges = (j.ad_ranges || []).concat(j.ad_blocks || []); } catch (e) {}
      if (!ranges.length) { kkNotify("Bfyqgg诊断", "无广告区间", "段=" + total + "\n" + url.slice(0, 90)); $done({}); return; }
      var out = kkFilter(lines, ranges);
      kkNotify("Bfyqgg诊断", "已删广告 " + total + "->" + kkCountSeg(out), JSON.stringify(ranges) + "\n" + url.slice(0, 80));
      $done({ body: out.join("\n") });
    });
  } catch (e) { kkNotify("Bfyqgg诊断", "异常", String(e && e.message ? e.message : e)); $done({}); }
})();