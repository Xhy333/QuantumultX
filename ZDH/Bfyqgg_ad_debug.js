/**************************************
@Name：播放源去广告-触发诊断
@Author：Xhy123
若收到通知 => MitM+重写正常; 若没有 => MitM/规则/ca 没生效
用法: 临时加一条 catch-all 规则:
[rewrite_local]
^https?:// url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_ad_debug.js
[mitm]
hostname = *
**************************************/
(function () {
  try {
    var u = ($request && $request.url) || "";
    if (typeof $notify === "function") { $notify("233dm QX测试", "已触发", u.slice(0, 90)); }
    console.log("[233dm QX测试] 已触发: " + u);
  } catch (e) {}
  $done({});
})();
