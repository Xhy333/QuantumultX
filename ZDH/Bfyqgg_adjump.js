/**************************************
@Name：播放源去广告(adjump版·诊断)
@Author：Xhy123
用 jsdelivr 新路径(无缓存) + catch-all 验证是否触发；会删 /adjump/ 广告分片。
**************************************/
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_URL_PAT = /adjump/i;
function kkNotify(t, s, b){ try{ if(typeof $notify==="function") $notify(t,s,b); }catch(e){} }
function kkLog(m){ try{ console.log(m); }catch(e){} }
function kkCountSeg(l){ var n=0; for(var i=0;i<l.length;i++){ if(l[i].charAt(0)!=="#"&&l[i].length) n++; } return n; }
function kkCollapse(l){ var o=[]; for(var i=0;i<l.length;i++){ var x=l[i]; if(x.indexOf("#EXT-X-DISCONTINUITY")===0&&o.length&&o[o.length-1].indexOf("#EXT-X-DISCONTINUITY")===0) continue; o.push(x); } return o; }
function kkFilter(l,r){ var ad={},i,k; for(i=0;i<r.length;i++){ var s=r[i].start,e=r[i].end; if(typeof s!=="number"||typeof e!=="number") continue; for(k=s;k<e;k++) ad[k]=true; } var o=[],p=[],idx=0; for(i=0;i<l.length;i++){ var ln=l[i]; if(ln.charAt(0)==="#"){ p.push(ln); continue; } if(ad[idx]||KK_AD_URL_PAT.test(ln)){ p=[]; } else { for(k=0;k<p.length;k++) o.push(p[k]); o.push(ln); p=[]; } idx++; } for(k=0;k<p.length;k++) o.push(p[k]); return kkCollapse(o); }
(function(){
  try{
    var url=($request&&$request.url)||"";
    var body=($response&&$response.body)||"";
    if(url.indexOf(".m3u8")<0){ $done({}); return; }
    kkLog("[Bfyqgg] m3u8 -> "+url.slice(0,110));
    kkNotify("Bfyqgg", "m3u8请求", url.slice(0,100));
    if(!body||body.indexOf("#EXTM3U")<0){ $done({}); return; }
    if(body.indexOf("#EXTINF")<0){ kkNotify("Bfyqgg","主列表放行",url.slice(0,90)); $done({}); return; }
    var lines=body.split(/\r?\n/); var total=kkCountSeg(lines);
    var api=KK_AD_API+"?url="+encodeURIComponent(url)+"&seen_total="+total+"&lenfast=1&jsv="+KK_AD_JSV+"&_ts="+Date.now();
    $httpClient.get({url:api,headers:{"User-Agent":"Mozilla/5.0"}},function(err,resp,data){
      var ranges=[]; if(!err&&data){ try{ var j=JSON.parse(data); ranges=(j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){} }
      var out=kkFilter(lines,ranges);
      if(kkCountSeg(out)<total){ kkLog("[Bfyqgg] 已删广告 "+total+"->"+kkCountSeg(out)); kkNotify("Bfyqgg","已删广告 "+total+"->"+kkCountSeg(out),url.slice(0,80)); $done({body:out.join("\n")}); }
      else { kkNotify("Bfyqgg","无广告 段="+total,url.slice(0,90)); $done({}); }
    });
  }catch(e){ kkNotify("Bfyqgg","异常",String(e&&e.message?e.message:e)); $done({}); }
})();