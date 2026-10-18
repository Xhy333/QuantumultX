// 233动漫 首页/分类/搜索/选集（内容组件）
// 配套播放源：ZDH/233dm_player.js (type:"stream" loadResource)
WidgetMetadata = {
  id: "https://cn.233dm.com",
  title: "233动漫",
  description: "233动漫 最新/分类/搜索，选集后由 233dm_player 播放源出流",
  author: "233",
  site: "https://cn.233dm.com",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  modules: [
    { title: "最新更新", description: "233动漫 最新更新", requiresWebView: false, cacheDuration: 0, functionName: "loadLatest", params: [{ name: "page", type: "page" }] },
    { title: "日漫", description: "日漫", requiresWebView: false, cacheDuration: 0, functionName: "loadRiman", params: [{ name: "page", type: "page" }] },
    { title: "国漫", description: "国漫", requiresWebView: false, cacheDuration: 0, functionName: "loadGuoman", params: [{ name: "page", type: "page" }] },
    { title: "动画", description: "动画", requiresWebView: false, cacheDuration: 0, functionName: "loadDonghua", params: [{ name: "page", type: "page" }] },
    { title: "剧场", description: "剧场版", requiresWebView: false, cacheDuration: 0, functionName: "loadJuchang", params: [{ name: "page", type: "page" }] },
    { title: "特摄", description: "特摄", requiresWebView: false, cacheDuration: 0, functionName: "loadTeji", params: [{ name: "page", type: "page" }] },
    { title: "美漫", description: "美漫", requiresWebView: false, cacheDuration: 0, functionName: "loadMeiman", params: [{ name: "page", type: "page" }] }
  ],
  search: {
    title: "搜索233动漫",
    functionName: "search",
    params: [{ name: "keyword", title: "关键词", type: "input" }, { name: "page", title: "页码", type: "page" }]
  }
};

var KK_BASE = "https://cn.233dm.com";
var KK_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var _bypassed = false;

function kkT(v){ return String(v==null?"":v).replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim(); }
function kkData(resp){ var d=resp&&resp.data; return typeof d==="string"?d:(d==null?"":String(d)); }
function kkGet(url, extra){ return Widget.http.get(url, { headers: Object.assign({ "User-Agent": KK_UA, "Referer": KK_BASE + "/" }, extra || {}) }); }
function kkB64(bytes){ var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",o="";for(var i=0;i<bytes.length;i+=3){var a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,cc=i+2<bytes.length?bytes[i+2]:0;o+=c.charAt(a>>2);o+=c.charAt(((a&3)<<4)|(b>>4));o+=i+1<bytes.length?c.charAt(((b&15)<<2)|(cc>>6)):"=";o+=i+2<bytes.length?c.charAt(cc&63):"=";}return o; }
function kkToken(){ var k=[0x4e,0x3f,0xa9,0xc2,0x12,0x7d,0x88,0xef,0x55,0xaa,0x0b,0xcd,0xde,0xad,0xbe,0xef]; var ts=String(Date.now()),b=[]; for(var i=0;i<ts.length;i++) b.push(ts.charCodeAt(i)^k[i%k.length]); return kkB64(b); }
async function kkBypass(){ if(_bypassed) return; try{ await kkGet(KK_BASE+"/"); await Widget.http.post(KK_BASE+"/index.php/ajax/verify_check?type=search","i="+encodeURIComponent(kkToken()),{headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","User-Agent":KK_UA,"X-Requested-With":"XMLHttpRequest","Referer":KK_BASE+"/"}}); _bypassed=true; }catch(e){} }

function kkItem(hash,title,pic,remarks){
  if(!hash||!title) return null;
  return { id: hash, type: "url", title: kkT(title), posterPath: pic||"", description: kkT(remarks||""), link: hash+"|"+encodeURIComponent(kkT(title)) };
}
function kkParseHtml(html){
  var out=[], seen={};
  var re=/<a\b[^>]*href="\/anime\/([a-f0-9]{24})\.html"[^>]*>/ig, m;
  while((m=re.exec(html))){
    var tag=m[0], hash=m[1], t=/title="([^"]*)"/i.exec(tag), p=/(?:data-original|data-src|src)="([^"]*)"/i.exec(tag);
    var title=t?kkT(t[1]):"";
    if(seen[hash]){ if(title && !seen[hash].title) seen[hash].title=title; if(p&&!seen[hash].posterPath) seen[hash].posterPath=p[1]; continue; }
    if(!title) continue;
    var it=kkItem(hash,title,p?p[1]:"",""); seen[hash]=it; out.push(it);
  }
  return out;
}
function kkParseAjax(txt){
  var j; try{ j=JSON.parse(txt); }catch(e){ return []; }
  var arr=(j&&j.list)||[], out=[];
  for(var i=0;i<arr.length;i++){ var it=arr[i]; var mm=(it.detail_link||"").match(/\/anime\/([a-f0-9]{24})\.html/); if(!mm) continue; var o=kkItem(mm[1],it.vod_name,it.vod_pic,it.vod_remarks); if(o){ o.posterPath=it.vod_pic||""; out.push(o); } }
  return out;
}

async function loadLatest(params){
  params=params||{}; var page=Number(params.page||1); if(!(page>=1)) page=1;
  try{ var r=await kkGet(KK_BASE+"/index.php/ajax/data?mid=1&page="+page+"&limit=24&by=time", { "X-Requested-With":"XMLHttpRequest" }); return kkParseAjax(kkData(r)); }catch(e){ return []; }
}
async function kkCategory(params, tid){
  params=params||{}; var page=Number(params.page||1); if(!(page>=1)) page=1; if(!tid) return [];
  var url = page<=1 ? (KK_BASE+"/type/"+tid+".html") : (KK_BASE+"/type/"+tid+"-"+page+".html");
  try{ var r=await kkGet(url); return kkParseHtml(kkData(r)); }catch(e){ return []; }
}
async function loadRiman(p){ return kkCategory(p,"1"); }
async function loadGuoman(p){ return kkCategory(p,"2"); }
async function loadDonghua(p){ return kkCategory(p,"5"); }
async function loadJuchang(p){ return kkCategory(p,"24"); }
async function loadTeji(p){ return kkCategory(p,"4"); }
async function loadMeiman(p){ return kkCategory(p,"3"); }

async function search(params){
  params=params||{}; var kw=kkT(params.keyword||""); if(!kw) return [];
  try{
    await kkBypass();
    var r=await kkGet(KK_BASE+"/search/"+encodeURIComponent(kw)+"-------------.html");
    var html=kkData(r);
    if(/系统安全验证/.test(html)){ _bypassed=false; await kkBypass(); r=await kkGet(KK_BASE+"/search/"+encodeURIComponent(kw)+"-------------.html"); html=kkData(r); }
    return kkParseHtml(html);
  }catch(e){ return []; }
}

async function loadDetail(link){
  var s=String(link||""), hash="", title="";
  var bar=s.indexOf("|");
  if(bar>=0){ hash=s.slice(0,bar); try{ title=decodeURIComponent(s.slice(bar+1)); }catch(e){ title=s.slice(bar+1); } }
  else { hash=s; }
  if(!hash) return null;
  try{
    var r=await kkGet(KK_BASE+"/anime/"+hash+".html");
    var html=kkData(r);
    if(!title){ var mt=html.match(/<h1[^>]*>([^<]+)<\/h1>/i); if(mt) title=kkT(mt[1]); }
    var maxN=0, re=/\/anime\/[a-f0-9]{24}\/play\/(\d+)\/(\d+)\.html/ig, m;
    while((m=re.exec(html))){ var ep=Number(m[2]); if(ep>maxN) maxN=ep; }
    var eps=[]; for(var e=1;e<=maxN;e++){ eps.push({ id: hash+"-"+e, type: "url", episode: e, title: "第"+e+"集" }); }
    var poster=""; var mp=html.match(/<a[^>]*class="[^"]*lazyload[^"]*"[^>]*href="\/anime\/[a-f0-9]{24}\.html"[^>]*data-original="([^"]*)"/i); if(mp) poster=mp[1];
    return { id: hash, type: "url", title: title, posterPath: poster, description: "", link: link, mediaType: "tv", episodeItems: eps };
  }catch(e){ return null; }
}