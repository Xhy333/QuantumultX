/**************************************
@Name：播放源 m3u8 去广告（通用·BoxJS开关）
@Author：Xhy123
BoxJS 设置项：
  @Xhy333_Bfyqgg.enabled   启用去广告(总开关, 默认开)
  @Xhy333_Bfyqgg.keywords  广告关键词(默认 adjump, 逗号分隔)
  @Xhy333_Bfyqgg.api       接口兜底(默认开)
  @Xhy333_Bfyqgg.notify    通知(默认关, 只在真删广告时弹)
搭配(通用规则)：
[rewrite_local]
^https?://[^/]+/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg1.js
[mitm]
hostname = *.dytt-cinema.com, *.dytt-hot.com, *.rrcdnbf1.com, *.rrcdnbf2.com, *.rrcdnbf6.com, *.lz-cdn8.com, fengbao13.com
**************************************/
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_API_HOSTS = /(dytt|rrcdnbf|lz-cdn|fengbao|bfzy|\/video\/|vod)/i;

var K_ENABLE = "@Xhy333_Bfyqgg.enabled";
var K_KW = "@Xhy333_Bfyqgg.keywords";
var K_API = "@Xhy333_Bfyqgg.api";
var K_NOTIFY = "@Xhy333_Bfyqgg.notify";

/* ---------- 偏好读取：兼容布尔 / 数字 / 带引号 / 带空格 / 中文 ---------- */
function kkPref(k){
  try{
    if (typeof $prefs !== "undefined" && $prefs && typeof $prefs.valueForKey === "function"){
      var v = $prefs.valueForKey(k);
      if (v === undefined || v === null) return null;
      if (typeof v === "string"){
        v = v.trim();
        // BoxJS 偶尔写入的是 JSON 包装过的字符串，如 "\"false\""
        if (/^".*"$/.test(v)){ try{ v = JSON.parse(v); }catch(e){} }
      }
      return v;
    }
  }catch(e){}
  return null;
}
function kkBool(k,d){
  var v = kkPref(k);
  if (v === null || v === undefined || v === "") return d;
  if (typeof v === "boolean") return v;
  if (typeof v === "number")  return v !== 0;
  v = String(v).trim().toLowerCase();
  v = v.replace(/^["']+|["']+$/g, "").trim(); // 去掉外层引号
  return !(v === "false" || v === "0" || v === "off" || v === "no"
        || v === "disable" || v === "disabled" || v === "否" || v === "关闭");
}
function kkStr(k,d){ var v = kkPref(k); return (v === null || v === undefined || v === "") ? d : String(v); }

/* ---------- 关键词正则 ---------- */
function kkPat(s){
  try{
    var p = String(s||"").split(/[,，]/).map(function(x){return x.trim();}).filter(Boolean)
      .map(function(x){return x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");});
    if(!p.length) return /adjump/i;
    return new RegExp("("+p.join("|")+")","i");
  }catch(e){ return /adjump/i; }
}

/* ---------- 通知 ---------- */
function kkNote(sub,msg){
  try{
    // 每次真删广告才走到这，仍二次校验开关
    if (kkBool(K_NOTIFY,false) && typeof $notify === "function"){
      $notify("播放源去广告", sub, msg);
    }
  }catch(e){}
}

/* ---------- m3u8 处理工具 ---------- */
function kkCountSeg(l){
  var n=0;
  for(var i=0;i<l.length;i++){ if(l[i].charAt(0)!=="#" && l[i].length) n++; }
  return n;
}
function kkCollapse(l){
  var o=[];
  for(var i=0;i<l.length;i++){
    var x=l[i];
    if (x.indexOf("#EXT-X-DISCONTINUITY")===0 && o.length && o[o.length-1].indexOf("#EXT-X-DISCONTINUITY")===0) continue;
    o.push(x);
  }
  return o;
}
function kkFilter(l,r,pat){
  var ad={},i,k;
  for(i=0;i<r.length;i++){
    var s=r[i].start,e=r[i].end;
    if(typeof s!=="number"||typeof e!=="number") continue;
    for(k=s;k<e;k++) ad[k]=true;
  }
  var o=[],p=[],idx=0;
  for(i=0;i<l.length;i++){
    var ln=l[i];
    if (ln.charAt(0)==="#"){ p.push(ln); continue; }
    if (ad[idx] || pat.test(ln)){ p=[]; }
    else {
      for(k=0;k<p.length;k++) o.push(p[k]);
      o.push(ln);
      p=[];
    }
    idx++;
  }
  for(k=0;k<p.length;k++) o.push(p[k]);
  return kkCollapse(o);
}

/* ---------- 主逻辑 ---------- */
(function(){
  try{
    // 总开关：默认开
    if (!kkBool(K_ENABLE,true)){ $done({}); return; }

    var url  = ($request && $request.url)  || "";
    var body = ($response && $response.body) || "";

    if (url.indexOf(".m3u8")<0 || !body || body.indexOf("#EXTM3U")<0 || body.indexOf("#EXTINF")<0){
      $done({}); return;
    }

    var pat   = kkPat(kkStr(K_KW,"adjump"));
    var lines = body.split(/\r?\n/);
    var total = kkCountSeg(lines);

    // 第一层：关键词直删
    var out = kkFilter(lines,[],pat);
    if (kkCountSeg(out) < total){
      try{ console.log("[Bfyqgg] 去广告(关键词) "+total+"->"+kkCountSeg(out)); }catch(e){}
      kkNote("已删广告 "+total+"->"+kkCountSeg(out), url.slice(0,80));
      $done({body:out.join("\n")}); return;
    }

    // 第二层：接口兜底
    if (kkBool(K_API,true) && KK_AD_API_HOSTS.test(url)
        && typeof $task!=="undefined" && $task && typeof $task.fetch==="function"){

      var api = KK_AD_API + "?url=" + encodeURIComponent(url)
              + "&seen_total=" + total
              + "&lenfast=1&jsv=" + KK_AD_JSV
              + "&_ts=" + Date.now();

      $task.fetch({url:api, headers:{"User-Agent":"Mozilla/5.0"}}).then(function(resp){
        var ranges=[];
        try{ var j = JSON.parse(resp.body); ranges = (j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){}
        var o2 = kkFilter(lines, ranges, pat);
        if (kkCountSeg(o2) < total){
          try{ console.log("[Bfyqgg] 去广告(接口) "+total+"->"+kkCountSeg(o2)); }catch(e){}
          kkNote("已删广告(接口) "+total+"->"+kkCountSeg(o2), url.slice(0,80));
          $done({body:o2.join("\n")});
        } else {
          $done({});
        }
      }, function(){ $done({}); });
      return;
    }

    $done({});
  }catch(e){ $done({}); }
})();