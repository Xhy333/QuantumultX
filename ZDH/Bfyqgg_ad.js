/***********************************************
 * 播放源 m3u8 去广告  (Quantumult X · script-response-body)
 * 拦截媒体播放列表 -> 查询广告分片区间 -> 删除广告分片
 * 广告区间接口: https://m3u8.web.sgzm.net:2087/ad_positions
 ***********************************************/
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";

function kkCountSeg(lines) {
  var n = 0;
  for (var i = 0; i < lines.length; i++) { var c = lines[i].charAt(0); if (c !== "#" && lines[i].length) n++; }
  return n;
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
    if (ad[idx]) { pending = []; }
    else { for (k = 0; k < pending.length; k++) out.push(pending[k]); out.push(ln); pending = []; }
    idx++;
  }
  for (k = 0; k < pending.length; k++) out.push(pending[k]);
  return out;
}

(function () {
  try {
    var url = ($request && $request.url) || "";
    var body = ($response && $response.body) || "";
    if (!body || body.indexOf("#EXTM3U") < 0) { $done({}); return; }
    if (body.indexOf("#EXTINF") < 0) { $done({}); return; } // 主列表不改
    if (url.indexOf(".m3u8") < 0) { $done({}); return; }
    var lines = body.split(/\r?\n/);
    var total = kkCountSeg(lines);
    if (total < 2) { $done({}); return; }
    var api = KK_AD_API + "?url=" + encodeURIComponent(url) + "&seen_total=" + total + "&lenfast=1&jsv=" + KK_AD_JSV + "&_ts=" + Date.now();
    $httpClient.get({ url: api, headers: { "User-Agent": "Mozilla/5.0" } }, function (err, resp, data) {
      if (err || !data) { $done({}); return; }
      var ranges = [];
      try { var j = JSON.parse(data); ranges = (j.ad_ranges || []).concat(j.ad_blocks || []); } catch (e) {}
      if (!ranges.length) { $done({}); return; }
      var out = kkFilter(lines, ranges);
      console.log("[233dm] 去广告 " + total + " -> " + kkCountSeg(out) + " 段 " + JSON.stringify(ranges));
      $done({ body: out.join("\n") });
    });
  } catch (e) {
    $done({});
  }
})();
