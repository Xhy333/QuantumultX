/**************************************
@Name：播放源 m3u8 去广告（通用·安静版）
@Author：Xhy123
拦截所有 .m3u8：
 1) 纯本地：分片URL含 /adjump/ 即广告，直接删除（不联网）；
 2) 可选兜底：对常见片源域名再用广告区间接口(经 QX 的 $task.fetch)补删。
无通知、匹配不到不改动。MT就* 会对所有 HTTPS 解密，稍耗性能，个别做证书固定的 App 可能异常。若想更轻量，只用已知片源域名
搭配(通用，自动覆盖所有片源域名)（这样写就得遇到新域名时再补；要"全自动"就用 *）
先用锁提交地址放上去测一集，确认 QX 日志里出现 [Bfyqgg] 去广告 ... 且广告消失即可

[rewrite_local]
^https?://[^/]+/.*\.m3u8 url script-response-body https://cdn.jsdelivr.net/gh/Xhy333/QuantumultX@main/ZDH/Bfyqgg.js
[mitm]
hostname = *.dytt-cinema.com, *.dytt-hot.com, *.rrcdnbf1.com, *.rrcdnbf2.com, *.rrcdnbf6.com, *.lz-cdn8.com, fengbao13.com

**************************************/
var KK_AD_URL_PAT = /adjump/i;
var KK_AD_API = "https://m3u8.web.sgzm.net:2087/ad_positions";
var KK_AD_JSV = "stable-client-v3-normal-segment-whitelist-v2-blocks";
var KK_AD_API_HOSTS = /(dytt|rrcdnbf|lz-cdn|fengbao|bfzy|\/video\/|vod)/i;

function kkCountSeg(l){ var n=0; for(var i=0;i<l.length;i++){ if(l[i].charAt(0)!=="#"&&l[i].length) n++; } return n; }
function kkCollapse(l){ var o=[]; for(var i=0;i<l.length;i++){ var x=l[i]; if(x.indexOf("#EXT-X-DISCONTINUITY")===0&&o.length&&o[o.length-1].indexOf("#EXT-X-DISCONTINUITY")===0) continue; o.push(x); } return o; }
function kkFilter(l,r){ var ad={},i,k; for(i=0;i<r.length;i++){ var s=r[i].start,e=r[i].end; if(typeof s!=="number"||typeof e!=="number") continue; for(k=s;k<e;k++) ad[k]=true; } var o=[],p=[],idx=0; for(i=0;i<l.length;i++){ var ln=l[i]; if(ln.charAt(0)==="#"){ p.push(ln); continue; } if(ad[idx]||KK_AD_URL_PAT.test(ln)){ p=[]; } else { for(k=0;k<p.length;k++) o.push(p[k]); o.push(ln); p=[]; } idx++; } for(k=0;k<p.length;k++) o.push(p[k]); return kkCollapse(o); }

(function(){
  try{
    var url=($request&&$request.url)||"";
    var body=($response&&$response.body)||"";
    if(url.indexOf(".m3u8")<0 || !body || body.indexOf("#EXTM3U")<0 || body.indexOf("#EXTINF")<0){ $done({}); return; }
    var lines=body.split(/\r?\n/); var total=kkCountSeg(lines);
    var out=kkFilter(lines,[]);
    if(kkCountSeg(out)<total){ try{console.log("[Bfyqgg] 去广告 "+total+"->"+kkCountSeg(out));}catch(e){} $done({body:out.join("\n")}); return; }
    if(KK_AD_API_HOSTS.test(url) && typeof $task!=="undefined" && $task && typeof $task.fetch==="function"){
      var api=KK_AD_API+"?url="+encodeURIComponent(url)+"&seen_total="+total+"&lenfast=1&jsv="+KK_AD_JSV+"&_ts="+Date.now();
      $task.fetch({url:api,headers:{"User-Agent":"Mozilla/5.0"}}).then(function(resp){
        var ranges=[]; try{ var j=JSON.parse(resp.body); ranges=(j.ad_ranges||[]).concat(j.ad_blocks||[]); }catch(e){}
        var o2=kkFilter(lines,ranges);
        if(kkCountSeg(o2)<total){ try{console.log("[Bfyqgg] 去广告(接口) "+total+"->"+kkCountSeg(o2));}catch(e){} $done({body:o2.join("\n")}); }
        else { $done({}); }
      }, function(){ $done({}); });
      return;
    }
    $done({});
  }catch(e){ $done({}); }
})();
