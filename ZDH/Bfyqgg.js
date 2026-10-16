/**************************************
@Name：播放源去广告(纯本地·adjump)
@Author：Xhy123
原理：分片URL含 /adjump/ 即广告，直接删除（无需联网、不依赖 $httpClient）。
可选：若 QX 支持 $task.fetch，再用广告区间接口兜底（失败不影响）。
**************************************/
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_URL_PAT = /adjump/i;   // 分片URL含该词即广告
var KK_AD_NOTIFY = true;         // 调试期给通知；不想要改成 false

function kkNotify(t,s,b){ try{ if(KK_AD_NOTIFY && typeof $notify==="function") $notify(t,s,b); }catch(e){} }
function kkLog(m){ try{ console.log(m); }catch(e){} }
function kkCountSeg(l){ var n=0; for(var i=0;i<l.length;i++){ if(l[i].charAt(0)!=="#"&&l[i].length) n++; } return n; }
function kkCollapse(l){ var o=[]; for(var i=0;i<l.length;i++){ var x=l[i]; if(x.indexOf("#EXT-X-DISCONTINUITY")===0&&o.length&&o[o.length-1].indexOf("#EXT-X-DISCONTINUITY")===0) continue; o.push(x); } return o; }
function kkFilter(l,r){ var ad={},i,k; for(i=0;i<r.length;i++){ var s=r[i].start,e=r[i].end; if(typeof s!=="number"||typeof e!=="number") continue; for(k=s;k<e;k++) ad[k]=true; } var o=[],p=[],idx=0; for(i=0;i<l.length;i++){ var ln=l[i]; if(ln.charAt(0)==="#"){ p.push(ln); continue; } if(ad[idx]||KK_AD_URL_PAT.test(ln)){ p=[]; } else { for(k=0;k<p.length;k++) o.push(p[k]); o.push(ln); p=[]; } idx++; } for(k=0;k<p.length;k++) o.push(p[k]); return kkCollapse(o); }
(function(){
  try{
    var url=($request&&$request.url)||"";
    var body=($response&&$response.body)||"";
    if(url.indexOf(".m3u8")<0){ $done({}); return; }
    if(!body||body.indexOf("#EXTM3U")<0){ $done({}); return; }
    if(body.indexOf("#EXTINF")<0){ $done({}); return; } // 主列表放行
    var lines=body.split(/\r?\n/); var total=kkCountSeg(lines);
    // 1) 纯本地：按 URL 特征(adjump)删除
    var out=kkFilter(lines,[]);
    if(kkCountSeg(out)<total){ kkLog("[Bfyqgg] 本地去广告 "+total+"->"+kkCountSeg(out)); kkNotify("Bfyqgg","已删广告(本地) "+total+"->"+kkCountSeg(out),url.slice(0,80)); $done({body:out.join("\n")}); return; }
    // 2) 可选兜底：QX 的 $task.fetch（存在才用；不可用/失败则原样返回）
    if(typeof $task!=="undefined" && $task && typeof $task.fetch==="function"){
      var api=KK_AD_API+"?url="+encodeURIComponent(url)+"&seen_total="+total+"&lenfast=1&jsv="+KK_AD_JSV+"&_ts="+Date.now();
      $task.fetch({url:api,headers:{"User-Agent":"Mozilla/5.0"}}).then(function(resp){
        var ranges=[]; try{ var j=JSON.parse(resp.body); ranges=(j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){}
        var o2=kkFilter(lines,ranges);
        if(kkCountSeg(o2)<total){ kkNotify("Bfyqgg","已删广告(接口) "+total+"->"+kkCountSeg(o2),url.slice(0,80)); $done({body:o2.join("\n")}); }
        else { kkNotify("Bfyqgg","无广告 段="+total,url.slice(0,90)); $done({}); }
      }, function(){ $done({}); });
      return;
    }
    $done({});
  }catch(e){ kkNotify("Bfyqgg","异常",String(e&&e.message?e.message:e)); $done({}); }
})();