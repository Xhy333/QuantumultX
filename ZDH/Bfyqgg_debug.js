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