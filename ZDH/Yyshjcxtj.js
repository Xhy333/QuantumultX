
/**************************************
@Name：网易大神绘卷查询 
@Author：Xhy123
@Date：2026-6-21 06:58:31

- 自动捕获
- 角色实时获取
- SOP Session 自动保存
  每期绘卷独立统计，切换自动归档
- 所有缓存绑定 sopId，杜绝串期
- 保留双来源解析、强制日报、slot 处理
- 每日独立会话，slot 二次跳转
- 双来源解析（message + allTableData）
- 强制完整7天日报（缺数据补0）
- 日期去重（仅查询新日期）
- 统计周期：每日快照比较，变化才更新，7天无变化重置
- 本期统计：直接从快照汇总

使用方法：
QuantumultX
1.自动获取CK更新脚本保存到本地
2.打开网易大神app->独家工具>绘卷查阅->选择角色>选择日期


[rewrite_local]
# 鉴权头部（getGmsdkToken）
^https:\/\/god\.gameyw\.netease\.com\/v1\/app\/gameRole\/getGmsdkToken url script-request-header 网易大神绘卷查询.js
# SOP Session
^https:\/\/turing\.gameyw\.netease\.com\/sop-api\/api\/out\/context\/initBySession url script-request-body 网易大神绘卷查询.js
# sopId 捕获（act.ds.163.com 页面）
^https:\/\/act\.ds\.163\.com\/.* url script-request-header 网易大神绘卷查询.js

[mitm]
hostname = god.gameyw.netease.com, turing.gameyw.netease.com, act.ds.163.com, game.16163.com

[task_local]
0 9 * * * 网易大神绘卷查询.js, tag=网易大神绘卷查询, enabled=true





====================================
⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
******************************************/






// ========== 存储 Key ==========
const TOKEN_KEY       = "WYDS_GL_TOKEN";
const UID_KEY         = "WYDS_GL_UID";
const DEVICE_KEY      = "WYDS_DEVICE_ID";
const CHECKSUM_KEY    = "WYDS_CHECKSUM";
const SOP_SESSION_KEY = "WYDS_SOP_SESSION";
const SOP_ID_KEY      = "WYDS_YYS_SOP_ID";        // 当前活动 sopId
const ARCHIVE_KEY     = "WYDS_YYS_SOP_ARCHIVE";   // 所有活动归档

const CONTEXT_API = "https://turing.gameyw.netease.com/sop-api/api/out/context";

/*************************************
Rewrite：捕获鉴权、SOP Session、sopId
*************************************/
if (typeof $request !== "undefined") {
  const url = $request.url;

  // 1. 捕获 sopId（从 act.ds.163.com 页面请求的 URL 参数）
  if (url.indexOf("act.ds.163.com") !== -1) {
    const match = url.match(/[?&]sopId=([^&]+)/);
    if (match) {
      $prefs.setValueForKey(match[1], SOP_ID_KEY);
      $notify("大神绘卷", "活动ID已更新", match[1]);
    }
    $done({});
  }

  // 2. 捕获 SOP Session（initBySession 请求体）
  if (url.indexOf("initBySession") !== -1) {
    try {
      const body = JSON.parse($request.body);
      if (body.sopSession && body.sopSession.indexOf("sopH5Tool") > -1) {
        $prefs.setValueForKey(body.sopSession, SOP_SESSION_KEY);
        $notify("大神绘卷", "SOP Session已更新", "");
      }
    } catch (e) {}
    $done({});
  }

  // 3. 捕获鉴权头部（getGmsdkToken 等请求）
  const h = $request.headers;
  $prefs.setValueForKey(h["GL-Token"]    || h["gl-token"]    || "", TOKEN_KEY);
  $prefs.setValueForKey(h["GL-Uid"]      || h["gl-uid"]      || "", UID_KEY);
  $prefs.setValueForKey(h["GL-DeviceId"] || h["gl-deviceid"] || "", DEVICE_KEY);
  $prefs.setValueForKey(h["GL-CheckSum"] || h["gl-checksum"] || "", CHECKSUM_KEY);
  $notify("大神绘卷", "鉴权参数已更新", "");
  $done({});
}

/*************************************
定时任务
*************************************/
(async () => {
  try {
    const token    = $prefs.valueForKey(TOKEN_KEY);
    const uid      = $prefs.valueForKey(UID_KEY);
    const deviceId = $prefs.valueForKey(DEVICE_KEY);
    const checksum = $prefs.valueForKey(CHECKSUM_KEY);

    if (!token || !uid) {
      $notify("大神绘卷", "缺少鉴权参数", "请先打开一次大神任意页面");
      return $done();
    }

    // 1. 获取 sopId（优先使用捕获的活动ID，否则回退到硬编码常量）
    let sopId = $prefs.valueForKey(SOP_ID_KEY);
    if (!sopId) {
      // 备用：如果从未捕获到，可以尝试使用某个默认值，但建议用户手动触发一次
      $notify("大神绘卷", "缺少活动ID", "请先打开一次绘卷活动页面（act.ds.163.com）");
      return $done();
    }

    // 2. 获取角色
    const roleData = await fetchJson({
      url: "https://god.gameyw.netease.com/v1/app/gameRole/getBindList",
      method: "POST",
      headers: getGodHeaders(token, uid, deviceId, checksum),
      body: JSON.stringify({ appKey: "" })
    });
    if (roleData.code !== 200 || !roleData.result || !roleData.result.length) {
      throw new Error("获取角色失败: " + JSON.stringify(roleData));
    }
    const yysRole = roleData.result.find(r => r.appKey === "g37");
    if (!yysRole) throw new Error("未找到阴阳师角色");
    console.log(`✅ 当前角色: ${yysRole.nick} (${yysRole.serverName})`);

    // 3. 读取 SOP Session
    const sopH5Session = $prefs.valueForKey(SOP_SESSION_KEY);
    if (!sopH5Session) {
      throw new Error("未获取到SOP Session\n请打开大神 -> 工具 -> 绘卷碎片获得进度");
    }

    // 4. 获取日期列表（使用 sopId 发起第一次会话）
    const initDate = await request("/initBySession", { sopSession: sopH5Session, sopId });
    const firstSopToolSession = initDate.item.sopSession;
    const firstContextId = initDate.item.contextId;

    await request("/process", {
      async: true,
      inputPayload: null,
      contextId: firstContextId,
      sopSession: firstSopToolSession,
      sopId
    });

    const slot = await waitResult(firstContextId, firstSopToolSession);
    const options = slot.handlerResponseList[0].result.slotMapper.time.options;
    const dates = Object.keys(options).sort().reverse();

    // 5. 活动期管理：检测 sopId 是否变化
    let archive = loadArchive();
    const { changed, archive: newArchive } = checkSopSwitch(sopId, archive);
    archive = newArchive;
    if (changed) {
      $notify("大神绘卷", "检测到新一期活动", `sopId: ${sopId}`);
    }
    // 当期数据引用
    const current = archive.list[archive.current];

    // 6. 构建每日碎片 Map（用于日报和快照比较）
    const dailyMap = new Map();
    for (const d of dates) {
      dailyMap.set(d, {
        date: d.slice(5),
        small: 0,
        middle: 0,
        big: 0,
        filled: false
      });
    }

    // 7. 加载当期已查询日期（绑定 sopId，防止串期）
    const doneDatesKey = `WYDS_YYS_DONE_${sopId}`;
    let doneDates = loadDoneDates(doneDatesKey);

    // 8. 逐日查询（仅查询新日期）
    for (const date of dates) {
      if (doneDates.includes(date)) {
        const cached = current.data[date.slice(5)];
        if (cached) {
          dailyMap.set(date, {
            date: date.slice(5),
            small: cached.small,
            middle: cached.middle,
            big: cached.big,
            filled: true
          });
        }
        continue;
      }

      // 新日期：独立会话查询
      const initData = await request("/initBySession", { sopSession: sopH5Session, sopId });
      const sopToolSession = initData.item.sopSession;
      const contextId = initData.item.contextId;

      const resultObj = await queryDateForResult(contextId, sopToolSession, date, sopId);
      let small = 0, middle = 0, big = 0;
      if (resultObj) {
        const extracted = extractData(resultObj, date);
        small = extracted.small;
        middle = extracted.middle;
        big = extracted.big;
      }

      // 保存到当期 data（键为 MM-DD）
      current.data[date.slice(5)] = { small, middle, big };
      dailyMap.set(date, {
        date: date.slice(5),
        small,
        middle,
        big,
        filled: true
      });

      doneDates.push(date);
      saveDoneDates(doneDatesKey, doneDates);
      await sleep(1000);
    }
    // 保存当期数据到归档
    saveArchive(archive);

    // 9. 更新统计周期（快照比较，绑定当期 period）
    current.period = updatePeriod(current.period || createNewPeriod(), dailyMap);
    saveArchive(archive);

    // 10. 计算本期总数（从快照中求和）
    let totalSmall = 0, totalMiddle = 0, totalBig = 0;
    if (current.period.snapshot) {
      for (const d of Object.values(current.period.snapshot)) {
        totalSmall += d.small;
        totalMiddle += d.middle;
        totalBig += d.big;
      }
    }

    // 11. 构建日报列表
    const dailyList = Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));

    // 12. 生成报告
    const noChangeDays = current.period ? current.period.noChangeDays : 0;
    const report = buildReport(dailyList, totalSmall, totalMiddle, totalBig, noChangeDays);
    $notify("大神绘卷", "查询完成", report);

  } catch (e) {
    $notify("大神绘卷", "运行异常", String(e));
  }
  $done();
})();

/*************************************
活动期管理
*************************************/
function loadArchive() {
  const s = $prefs.valueForKey(ARCHIVE_KEY);
  return s ? JSON.parse(s) : { current: null, list: {} };
}

function saveArchive(archive) {
  $prefs.setValueForKey(JSON.stringify(archive), ARCHIVE_KEY);
}

function checkSopSwitch(newSopId, archive) {
  if (!archive.current) {
    // 首次运行
    archive.current = newSopId;
    archive.list[newSopId] = {
      start: Date.now(),
      data: {},
      period: createNewPeriod()
    };
    return { changed: false, archive };
  }

  if (archive.current !== newSopId) {
    console.log(`🔄 活动切换: ${archive.current} -> ${newSopId}`);
    // 归档旧期（冻结）
    if (archive.list[archive.current]) {
      archive.list[archive.current].end = Date.now();
    }
    // 创建新期
    archive.current = newSopId;
    archive.list[newSopId] = {
      start: Date.now(),
      data: {},
      period: createNewPeriod()
    };
    return { changed: true, archive };
  }

  // 无变化
  return { changed: false, archive };
}

function createNewPeriod() {
  return {
    snapshot: {},
    noChangeDays: 0,
    lastUpdateTime: Date.now()
  };
}

/*************************************
查询函数：返回 result 对象（处理 slot 跳转）
*************************************/
async function queryDateForResult(contextId, sopSession, date, sopId) {
  await request("/process", {
    async: true,
    inputPayload: { time: date },
    contextId,
    sopSession,
    sopId
  });

  let result = await waitResult(contextId, sopSession);
  let node = result?.handlerResponseList?.[0];

  if (node?.type === "slot") {
    await request("/process", {
      async: true,
      inputPayload: { time: date },
      contextId,
      sopSession,
      sopId
    });
    result = await waitResult(contextId, sopSession);
    node = result?.handlerResponseList?.[0];
  }

  if (!node?.result?.message && !node?.result?.allTableData) {
    await request("/process", {
      async: true,
      inputPayload: { time: date },
      contextId,
      sopSession,
      sopId
    });
    result = await waitResult(contextId, sopSession);
    node = result?.handlerResponseList?.[0];
  }

  return node?.result || null;
}

/*************************************
双来源数据提取
*************************************/
function extractData(resultObj, date) {
  let small = 0, middle = 0, big = 0;
  const html = resultObj.message || "";
  if (html) {
    small  = parseInt((html.match(/绘卷碎片·小[\s\S]*?>(\d+)</) || [])[1] || "0");
    middle = parseInt((html.match(/绘卷碎片·中[\s\S]*?>(\d+)</) || [])[1] || "0");
    big    = parseInt((html.match(/绘卷碎片·大[\s\S]*?>(\d+)</) || [])[1] || "0");
  }

  const table = resultObj.allTableData?.rows || [];
  if ((small === 0 && middle === 0 && big === 0) && table.length > 0) {
    const parsed = parseFromTable(table);
    small = parsed.small;
    middle = parsed.middle;
    big = parsed.big;
  }
  return { small, middle, big };
}

function parseFromTable(rows) {
  let s = 0, m = 0, b = 0;
  for (const r of rows) {
    const type = r.item_name || "";
    const num = parseInt(r.num || "0");
    if (type.includes("小")) s += num;
    if (type.includes("中")) m += num;
    if (type.includes("大")) b += num;
  }
  return { small: s, middle: m, big: b };
}

/*************************************
统计周期快照更新（绑定当期 period）
*************************************/
function updatePeriod(period, dailyMap) {
  // 构建当前快照（MM-DD 键）
  const curSnapshot = {};
  for (const [date, d] of dailyMap.entries()) {
    curSnapshot[date.slice(5)] = {
      small: d.small,
      middle: d.middle,
      big: d.big
    };
  }

  const oldSnapshot = period.snapshot || {};
  let changed = false;

  // 比较新旧快照
  const oldKeys = Object.keys(oldSnapshot);
  const newKeys = Object.keys(curSnapshot);
  if (oldKeys.length !== newKeys.length) {
    changed = true;
  } else {
    for (const key of newKeys) {
      const old = oldSnapshot[key];
      const cur = curSnapshot[key];
      if (!old || old.small !== cur.small || old.middle !== cur.middle || old.big !== cur.big) {
        changed = true;
        break;
      }
    }
  }

  if (changed) {
    period.snapshot = curSnapshot;
    period.lastUpdateTime = Date.now();
    period.noChangeDays = 0;
    console.log("📈 快照已更新");
  } else {
    period.noChangeDays++;
    console.log(`📉 快照无变化，连续${period.noChangeDays}天`);
  }

  // 连续7天无变化重置
  if (period.noChangeDays >= 7) {
    console.log("🔄 连续7天无变化，重置统计周期");
    period.snapshot = {};
    period.noChangeDays = 0;
    period.lastUpdateTime = Date.now();
  }

  return period;
}

/*************************************
日期去重（绑定 sopId）
*************************************/
function loadDoneDates(key) {
  const s = $prefs.valueForKey(key);
  return s ? JSON.parse(s) : [];
}
function saveDoneDates(key, list) {
  if (list.length > 30) list = list.slice(-15);
  $prefs.setValueForKey(JSON.stringify(list), key);
}

/*************************************
报告生成
*************************************/
function buildReport(dailyList, totalSmall, totalMiddle, totalBig, noChangeDays) {
  const score = totalSmall * 10 + totalMiddle * 20 + totalBig * 100;
  let text = `📊 本期绘卷碎片\n`;
  text += `小：${totalSmall}  中：${totalMiddle}  大：${totalBig}\n`;
  text += `积分：${score}\n`;
  text += `连续无变化：${noChangeDays} 天\n\n`;
  text += `📅 最近7天详情：\n`;
  for (const d of dailyList) {
    text += `${d.date}  小${d.small}  中${d.middle}  大${d.big}\n`;
  }
  return text.trim();
}

/*************************************
工具函数
*************************************/
function getGodHeaders(token, uid, deviceId, checksum) {
  return {
    "GL-Token": token,
    "GL-Uid": uid,
    "GL-DeviceId": deviceId,
    "GL-CheckSum": checksum,
    "GL-ClientType": "51",
    "GL-Version": "4.17.3",
    "GL-Source": "URS",
    "GL-Shield-Id": "0",
    "GL-ActiveSquareId": "5bed6281d545682b8bb8a761",
    "GL-CurTime": String(Date.now()),
    "GL-Nonce": generateNonce(),
    "Content-Type": "application/json;charset=utf-8",
    "User-Agent": getUserAgent()
  };
}

function getUserAgent() {
  return "godlike_iOS/55241 CFNetwork/3826.600.41.2.1 Darwin/24.6.0";
}

function generateNonce() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${timestamp}_${random}`;
}

function fetchJson(opt) {
  return new Promise((resolve, reject) => {
    $task.fetch(opt).then(resp => resolve(JSON.parse(resp.body))).catch(reject);
  });
}

function request(path, body) {
  return new Promise((resolve, reject) => {
    $task.fetch({
      url: CONTEXT_API + path,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(resp => resolve(JSON.parse(resp.body))).catch(reject);
  });
}

async function waitResult(contextId, sopSession) {
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const data = await request("/getAsyncProcessResultV2", { contextId, sopSession });
    if (data.item && (data.item.status === "finish" || data.item.handlerResponseList?.length > 0)) {
      return data.item;
    }
  }
  throw new Error("等待结果超时");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}





/** ---------------------------------固定不动区域----------------------------------------- */
//prettier-ignore
async function sendMsg(a) { a && ($.isNode() ? await notify.sendNotify($.name, a) : $.msg($.name, $.title || "", a, { "media-url": $.avatar })) }
function DoubleLog(o) { o && ($.log(`${o}`), $.notifyMsg.push(`${o}`)) };
function debug(g, e = "debug") { "true" === $.is_debug && ($.log(`\n-----------${e}------------\n`), $.log("string" == typeof g ? g : $.toStr(g) || `debug error => t=${g}`), $.log(`\n-----------${e}------------\n`)) }
//From xream's ObjectKeys2LowerCase
function ObjectKeys2LowerCase(obj) { return !obj ? {} : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])) };
//From sliverkiss's Request
async function Request(t) { "string" == typeof t && (t = { url: t }); try { if (!t?.url) throw new Error("[发送请求] 缺少 url 参数"); let { url: o, type: e, headers: r = {}, body: s, params: a, dataType: n = "form", resultType: u = "data" } = t; const p = e ? e?.toLowerCase() : "body" in t ? "post" : "get", c = o.concat("post" === p ? "?" + $.queryStr(a) : ""), i = t.timeout ? $.isSurge() ? t.timeout / 1e3 : t.timeout : 1e4; "json" === n && (r["Content-Type"] = "application/json;charset=UTF-8"); const y = s && "form" == n ? $.queryStr(s) : $.toStr(s), l = { ...t, ...t?.opts ? t.opts : {}, url: c, headers: r, ..."post" === p && { body: y }, ..."get" === p && a && { params: a }, timeout: i }, m = $.http[p.toLowerCase()](l).then((t => "data" == u ? $.toObj(t.body) || t.body : $.toObj(t) || t)).catch((t => $.log(`❌请求发起失败！原因为：${t}`))); return Promise.race([new Promise(((t, o) => setTimeout((() => o("当前请求已超时")), i))), m]) } catch (t) { console.log(`❌请求发起失败！原因为：${t}`) } }
//From chavyleung's Env.js
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise(((e, r) => { s.call(this, t, ((t, s, a) => { t ? r(t) : e(s) })) })) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; if (this.getdata(t)) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise((e => { this.get({ url: t }, ((t, s, r) => e(r))) })) } runScript(t, e) { return new Promise((s => { let r = this.getdata("@chavy_boxjs_userCfgs.httpapi"); r = r ? r.replace(/\n/g, "").trim() : r; let a = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); a = a ? 1 * a : 20, a = e && e.timeout ? e.timeout : a; const [i, o] = r.split("@"), n = { url: `http://${o}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: a }, headers: { "X-Key": i, Accept: "*/*" }, timeout: a }; this.post(n, ((t, e, r) => s(r))) })).catch((t => this.logErr(t))) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), r = !s && this.fs.existsSync(e); if (!s && !r) return {}; { const r = s ? t : e; try { return JSON.parse(this.fs.readFileSync(r)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), r = !s && this.fs.existsSync(e), a = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, a) : r ? this.fs.writeFileSync(e, a) : this.fs.writeFileSync(t, a) } } lodash_get(t, e, s = void 0) { const r = e.replace(/\[(\d+)\]/g, ".$1").split("."); let a = t; for (const t of r) if (a = Object(a)[t], void 0 === a) return s; return a } lodash_set(t, e, s) { return Object(t) !== t || (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce(((t, s, r) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[r + 1]) >> 0 == +e[r + 1] ? [] : {}), t)[e[e.length - 1]] = s), t } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, r] = /^@(.*?)\.(.*?)$/.exec(t), a = s ? this.getval(s) : ""; if (a) try { const t = JSON.parse(a); e = t ? this.lodash_get(t, r, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, r, a] = /^@(.*?)\.(.*?)$/.exec(e), i = this.getval(r), o = r ? "null" === i ? null : i || "{}" : "{}"; try { const e = JSON.parse(o); this.lodash_set(e, a, t), s = this.setval(JSON.stringify(e), r) } catch (e) { const i = {}; this.lodash_set(i, a, t), s = this.setval(JSON.stringify(i), r) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), void 0 === t.followRedirect || t.followRedirect || ((this.isSurge() || this.isLoon()) && (t["auto-redirect"] = !1), this.isQuanX() && (t.opts ? t.opts.redirection = !1 : t.opts = { redirection: !1 })), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, ((t, s, r) => { !t && s && (s.body = r, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, r) })); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then((t => { const { statusCode: s, statusCode: r, headers: a, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: r, headers: a, body: i, bodyBytes: o }, i, o) }), (t => e(t && t.error || "UndefinedError"))); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", ((t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } })).then((t => { const { statusCode: r, statusCode: a, headers: i, rawBody: o } = t, n = s.decode(o, this.encoding); e(null, { status: r, statusCode: a, headers: i, rawBody: o, body: n }, n) }), (t => { const { message: r, response: a } = t; e(r, a, a && s.decode(a.rawBody, this.encoding)) })) } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), void 0 === t.followRedirect || t.followRedirect || ((this.isSurge() || this.isLoon()) && (t["auto-redirect"] = !1), this.isQuanX() && (t.opts ? t.opts.redirection = !1 : t.opts = { redirection: !1 })), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, ((t, s, r) => { !t && s && (s.body = r, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, r) })); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then((t => { const { statusCode: s, statusCode: r, headers: a, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: r, headers: a, body: i, bodyBytes: o }, i, o) }), (t => e(t && t.error || "UndefinedError"))); break; case "Node.js": let r = require("iconv-lite"); this.initGotEnv(t); const { url: a, ...i } = t; this.got[s](a, i).then((t => { const { statusCode: s, statusCode: a, headers: i, rawBody: o } = t, n = r.decode(o, this.encoding); e(null, { status: s, statusCode: a, headers: i, rawBody: o, body: n }, n) }), (t => { const { message: s, response: a } = t; e(s, a, a && r.decode(a.rawBody, this.encoding)) })) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let r = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in r) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? r[e] : ("00" + r[e]).substr(("" + r[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let r = t[s]; null != r && "" !== r && ("object" == typeof r && (r = JSON.stringify(r)), e += `${s}=${r}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", r = "", a) { const i = t => { switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: return { url: t.url || t.openUrl || t["open-url"] }; case "Loon": return { openUrl: t.openUrl || t.url || t["open-url"], mediaUrl: t.mediaUrl || t["media-url"] }; case "Quantumult X": return { "open-url": t["open-url"] || t.url || t.openUrl, "media-url": t["media-url"] || t.mediaUrl, "update-pasteboard": t["update-pasteboard"] || t.updatePasteboard }; case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, r, i(a)); break; case "Quantumult X": $notify(e, s, r, i(a)); case "Node.js": }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), r && t.push(r), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, t.stack) } } wait(t) { return new Promise((e => setTimeout(e, t))) } done(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${e} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
