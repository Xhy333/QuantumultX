/**************************************
@Name：播放源 m3u8 去广告（通用·BoxJS开关）
@Author：Xhy123
去广告三重：
 1) URL关键词(默认 adjump)；
 2) 广告注入标记(ad-injected/ppvod-ad)整块删除(量子/天堂等)；
 3) 接口区间兜底(需 $task.fetch，失败不影响)。
BoxJS：
  @Xhy333_Bfyqgg.enabled   启用(默认开)
  @Xhy333_Bfyqgg.keywords  URL关键词(默认 adjump)
  @Xhy333_Bfyqgg.api       接口兜底(默认开)
  @Xhy333_Bfyqgg.notify    通知(默认关)
规则：
[rewrite_local]
^https?://[^/]+/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@b13d0ba/ZDH/Bfyqgg.js

[mitm]
hostname = *.dytt-cinema.com, *.dytt-hot.com, *.dytt-tvs.com, *.lz-cdn8.com, *.cdnlz21.com, *.rrcdnbf1.com, *.rrcdnbf2.com, *.rrcdnbf6.com, *.ddbbffcdn.com, fengbao13.com
**************************************/
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_API_HOSTS = /(dytt|rrcdnbf|lz-cdn|fengbao|bfzy|\/video\/|vod)/i;
var KK_AD_MARK = /ad[-_]?injected|ppvod-ad|ad-?mark/i;

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
function kkFilter(l,ranges,pat){
  var pend=[],recs=[],idx=-1,i,k,t;
  for(i=0;i<l.length;i++){ var ln=l[i]; if(!ln) continue; if(ln.charAt(0)==="#"){ pend.push(ln); continue; } idx++; var disc=false,mark=false; for(t=0;t<pend.length;t++){ if(pend[t].indexOf("#EXT-X-DISCONTINUITY")===0) disc=true; if(typeof KK_AD_MARK!=="undefined" && KK_AD_MARK.test(pend[t])) mark=true; } recs.push({i:idx,disc:disc,mark:mark,u:ln}); pend=[]; }
  var N=recs.length, bid=new Array(N), cur=-1;
  for(k=0;k<N;k++){ if(k===0||recs[k].disc) cur++; bid[k]=cur; }
  var bsize={}; for(k=0;k<N;k++) bsize[bid[k]]=(bsize[bid[k]]||0)+1;
  var ad=new Array(N); for(k=0;k<N;k++) ad[k]=false;
  for(var q=0;q<ranges.length;q++){ var s=ranges[q].start,e=ranges[q].end; if(typeof s!=="number"||typeof e!=="number") continue; var bl={}; for(k=s;k<e&&k<N;k++) bl[bid[k]]=true; for(var b in bl){ if(bsize[b]<=14){ for(k=0;k<N;k++) if(bid[k]==b) ad[k]=true; } } for(k=s;k<e&&k<N;k++) ad[k]=true; }
  var mb={}; for(k=0;k<N;k++) if(recs[k].mark) mb[bid[k]]=true; for(var b2 in mb){ if(bsize[b2]<=30){ for(k=0;k<N;k++) if(bid[k]==b2) ad[k]=true; } }
  for(k=0;k<N;k++) if(pat.test(recs[k].u)) ad[k]=true;
  var out=[],pending2=[],si=0;
  for(i=0;i<l.length;i++){ var ln2=l[i]; if(!ln2) continue; if(ln2.charAt(0)==="#"){ pending2.push(ln2); continue; } if(ad[si]){ pending2=[]; } else { for(t=0;t<pending2.length;t++) out.push(pending2[t]); out.push(ln2); pending2=[]; } si++; }
  for(t=0;t<pending2.length;t++) out.push(pending2[t]);
  return kkCollapse(out);
}

function kkApiTry(url, total, lines, pat, attempt){
  var api = KK_AD_API+"?url="+encodeURIComponent(url)+"&seen_total="+total+"&lenfast=1&jsv="+KK_AD_JSV+"&_ts="+Date.now();
  $task.fetch({url:api,headers:{"User-Agent":"Mozilla/5.0"}}).then(function(resp){
    var ranges=[]; try{ var j=JSON.parse(resp.body); ranges=(j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){}
    if(!ranges.length && attempt < 3){ setTimeout(function(){ kkApiTry(url,total,lines,pat,attempt+1); }, 900); return; }
    var o2=kkFilter(lines,ranges,pat);
    if(kkCountSeg(o2) < total){ kkLog("[Bfyqgg] 去广告(接口) "+total+"->"+kkCountSeg(o2)+" "+JSON.stringify(ranges)); kkNote("已删广告(接口) "+total+"->"+kkCountSeg(o2), url.slice(0,80)); $done({body:o2.join("\n")}); }
    else { kkLog("[Bfyqgg] 接口无区间 段="+total+" "+url.slice(0,80)); kkNote("接口无区间","段="+total+" "+url.slice(0,60)); $done({}); }
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
    if(kkBool(K_API,true) && typeof $task!=="undefined" && $task && typeof $task.fetch==="function"){
      kkApiTry(url, total, lines, pat, 0);
      return;
    }
    $done({});
  }catch(e){ $done({}); }
})();
