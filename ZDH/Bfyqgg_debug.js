/**************************************
@Name：播放源去广告 · 诊断版
始终弹通知，报告每一步（不依赖 BoxJS）。
[rewrite_local]
^https?:// url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg_debug.js
[mitm]
hostname = *
**************************************/
var KK_AD_API="https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV="stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_API_HOSTS=/(dytt|rrcdnbf|lz-cdn|cdbbffcdn|ddbbffcdn|fengbao|bfzy|\/video\/|vod)/i;
var KK_AD_MARK=/ad[-_]?injected|ppvod-ad|ad-?mark/i;
var KK_KW=/adjump/i;
function N(t,s,b){ try{ if(typeof $notify==="function") $notify(t,s,b); }catch(e){} }
function L(m){ try{ console.log(m); }catch(e){} }
function kkCountSeg(l){ var n=0; for(var i=0;i<l.length;i++){ if(l[i].charAt(0)!=="#"&&l[i].length) n++; } return n; }
function kkCollapse(l){ var o=[]; for(var i=0;i<l.length;i++){ var x=l[i]; if(x.indexOf("#EXT-X-DISCONTINUITY")===0&&o.length&&o[o.length-1].indexOf("#EXT-X-DISCONTINUITY")===0) continue; o.push(x); } return o; }
function kkFilter(l,r,pat){
  var ad={},i,k;
  for(i=0;i<r.length;i++){ var s=r[i].start,e=r[i].end; if(typeof s!=="number"||typeof e!=="number") continue; for(k=s;k<e;k++) ad[k]=true; }
  var out=[],pending=[],idx=0,adMode=false;
  for(i=0;i<l.length;i++){
    var ln=l[i];
    if(ln.charAt(0)==="#"){ pending.push(ln); continue; }
    var pj=pending.join("\n");
    if(KK_AD_MARK.test(pj)) adMode=true;
    else if(adMode && /#EXT-X-DISCONTINUITY/.test(pj)) adMode=false;
    var isAd=ad[idx]||pat.test(ln)||adMode;
    if(isAd){ pending=[]; } else { for(k=0;k<pending.length;k++) out.push(pending[k]); out.push(ln); pending=[]; }
    idx++;
  }
  for(k=0;k<pending.length;k++) out.push(pending[k]);
  return kkCollapse(out);
}
function apiTry(url,total,lines,attempt){
  var api=KK_AD_API+"?url="+encodeURIComponent(url)+"&seen_total="+total+"&lenfast=1&jsv="+KK_AD_JSV+"&_ts="+Date.now();
  $task.fetch({url:api,headers:{"User-Agent":"Mozilla/5.0"}}).then(function(resp){
    var ranges=[]; try{ var j=JSON.parse(resp.body); ranges=(j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){}
    if(!ranges.length && attempt<3){ setTimeout(function(){ apiTry(url,total,lines,attempt+1); },900); return; }
    if(!ranges.length){ N("Bfyqgg诊断","接口无区间","段="+total+"\n"+url.slice(0,70)); $done({}); return; }
    var o2=kkFilter(lines,ranges,KK_KW);
    if(kkCountSeg(o2)<total){ N("Bfyqgg诊断","接口已删 "+total+"->"+kkCountSeg(o2), JSON.stringify(ranges)+"\n"+url.slice(0,60)); $done({body:o2.join("\n")}); }
    else { N("Bfyqgg诊断","接口有区间但没删到","段="+total+" "+JSON.stringify(ranges)); $done({}); }
  }, function(err){
    if(attempt<2){ setTimeout(function(){ apiTry(url,total,lines,attempt+1); },900); }
    else { N("Bfyqgg诊断","接口请求失败", String(err&&err.error?err.error:err)); $done({}); }
  });
}
(function(){
  try{
    var url=($request&&$request.url)||"";
    var body=($response&&$response.body)||"";
    if(url.indexOf(".m3u8")<0){ $done({}); return; }
    N("Bfyqgg诊断","m3u8请求", url.slice(0,110));
    if(!body || body.indexOf("#EXTM3U")<0){ N("Bfyqgg诊断","非m3u8内容","len="+body.length); $done({}); return; }
    if(body.indexOf("#EXTINF")<0){ N("Bfyqgg诊断","主列表(放行)", url.slice(0,95)); $done({}); return; }
    var lines=body.split(/\r?\n/); var total=kkCountSeg(lines);
    var out=kkFilter(lines,[],KK_KW);
    if(kkCountSeg(out)<total){ L("[Bfyqgg] 本地删除 "+total+"->"+kkCountSeg(out)); N("Bfyqgg诊断","本地已删 "+total+"->"+kkCountSeg(out), url.slice(0,70)); $done({body:out.join("\n")}); return; }
    if(typeof $task!=="undefined" && $task && typeof $task.fetch==="function"){ N("Bfyqgg诊断","走接口 段="+total, url.slice(0,60)); apiTry(url,total,lines,0); return; }
    N("Bfyqgg诊断","接口不可用(无$task.fetch)","段="+total+" "+url.slice(0,50)); $done({});
  }catch(e){ N("Bfyqgg诊断","异常", String(e&&e.message?e.message:e)); $done({}); }
})();