/**************************************
@Name：播放源 m3u8 去广告（通用·BoxJS开关）
@Author：Xhy123
BoxJS：
  @Xhy333_Bfyqgg.enabled   启用去广告(默认开)
  @Xhy333_Bfyqgg.keywords  关键词(默认 adjump)
  @Xhy333_Bfyqgg.api       接口兜底(默认开, 处理天堂/量子等时长类广告)
  @Xhy333_Bfyqgg.notify    通知(默认关)
规则：
[rewrite_local]
^https?://[^/]+/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg.js
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

function kkPref(k){ try{ if(typeof $prefs!=="undefined" && $prefs && typeof $prefs.valueForKey==="function"){ var v=$prefs.valueForKey(k); return (v===undefined)?null:v; } }catch(e){} return null; }
function kkBool(k,d){ var v=kkPref(k); if(v===null||v===undefined||v==="") return d; v=String(v).toLowerCase(); return !(v==="false"||v==="0"||v==="off"||v==="no"); }
function kkStr(k,d){ var v=kkPref(k); return (v===null||v===undefined||v==="")?d:String(v); }
function kkPat(s){ try{ var p=String(s||"").split(/[,，]/).map(function(x){return x.trim();}).filter(Boolean).map(function(x){return x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}); if(!p.length) return /adjump/i; return new RegExp("("+p.join("|")+")","i"); }catch(e){ return /adjump/i; } }
function kkLog(m){ try{ console.log(m); }catch(e){} }
function kkNote(sub,msg){ try{ if(kkBool(K_NOTIFY,false) && typeof $notify==="function"){ $notify("播放源去广告", sub, msg); } }catch(e){} }

function kkCountSeg(l){ var n=0; for(var i=0;i<l.length;i++){ if(l[i].charAt(0)!=="#"&&l[i].length) n++; } return n; }
function kkCollapse(l){ var o=[]; for(var i=0;i<l.length;i++){ var x=l[i]; if(x.indexOf("#EXT-X-DISCONTINUITY")===0&&o.length&&o[o.length-1].indexOf("#EXT-X-DISCONTINUITY")===0) continue; o.push(x); } return o; }
function kkFilter(l,r,pat){ var ad={},i,k; for(i=0;i<r.length;i++){ var s=r[i].start,e=r[i].end; if(typeof s!=="number"||typeof e!=="number") continue; for(k=s;k<e;k++) ad[k]=true; } var o=[],p=[],idx=0; for(i=0;i<l.length;i++){ var ln=l[i]; if(ln.charAt(0)==="#"){ p.push(ln); continue; } if(ad[idx]||pat.test(ln)){ p=[]; } else { for(k=0;k<p.length;k++) o.push(p[k]); o.push(ln); p=[]; } idx++; } for(k=0;k<p.length;k++) o.push(p[k]); return kkCollapse(o); }

// 接口兜底：首次可能 "In Queue"，自动重试
function kkApiTry(url, total, lines, pat, attempt){
  var api = KK_AD_API+"?url="+encodeURIComponent(url)+"&seen_total="+total+"&lenfast=1&jsv="+KK_AD_JSV+"&_ts="+Date.now();
  $task.fetch({url:api,headers:{"User-Agent":"Mozilla/5.0"}}).then(function(resp){
    var ranges=[]; try{ var j=JSON.parse(resp.body); ranges=(j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){}
    if(!ranges.length && attempt < 3){ setTimeout(function(){ kkApiTry(url,total,lines,pat,attempt+1); }, 900); return; }
    var o2=kkFilter(lines,ranges,pat);
    if(kkCountSeg(o2) < total){ kkLog("[Bfyqgg] 去广告(接口) "+total+"->"+kkCountSeg(o2)+" "+JSON.stringify(ranges)); kkNote("已删广告(接口) "+total+"->"+kkCountSeg(o2), url.slice(0,80)); $done({body:o2.join("\n")}); }
    else { kkLog("[Bfyqgg] 接口无区间 段="+total+" "+url.slice(0,80)); $done({}); }
  }, function(){
    if(attempt < 2){ setTimeout(function(){ kkApiTry(url,total,lines,pat,attempt+1); }, 900); }
    else { $done({}); }
  });
}

(function(){
  try{
    if(!kkBool(K_ENABLE,true)){ $done({}); return; }
    var url=($request&&$request.url)||"";
    var body=($response&&$response.body)||"";
    if(url.indexOf(".m3u8")<0 || !body || body.indexOf("#EXTM3U")<0 || body.indexOf("#EXTINF")<0){ $done({}); return; }
    var pat = kkPat(kkStr(K_KW,"adjump"));
    var lines=body.split(/\r?\n/); var total=kkCountSeg(lines);
    var out=kkFilter(lines,[],pat);
    if(kkCountSeg(out)<total){ kkLog("[Bfyqgg] 去广告 "+total+"->"+kkCountSeg(out)); kkNote("已删广告 "+total+"->"+kkCountSeg(out), url.slice(0,80)); $done({body:out.join("\n")}); return; }
    if(kkBool(K_API,true) && KK_AD_API_HOSTS.test(url) && typeof $task!=="undefined" && $task && typeof $task.fetch==="function"){
      kkApiTry(url, total, lines, pat, 0);
      return;
    }
    $done({});
  }catch(e){ $done({}); }
})();
