/**************************************
@Name：yys查阅每日绘卷数量
@Author：
@Date：2026-5-2


使用方法：
QuantumultX
[rewrite_local]
^https:\/\/turing\.gameyw\.netease\.com\/sop-api\/api\/out\/context\/.* url script-response-body https://raw.githubusercontent.com/Xhy333/QuantumultX/main/ZDH/Yyshjspcx.js

[mitm]
hostname = turing.gameyw.netease.com
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



let $ = $tool || {};
let body = $response.body;
let url = $request.url;
const cache = $persist || $cache;

//==== 自行修改查询日期 格式：2026-05-02 可查近7天 ====
const SELECT_DATE = "2026-05-02";

//全局防重复锁 杜绝循环请求卡死
if (cache.read("huijuan_running") === "1") {
  $done({ body });
  return;
}

//步骤1 初始化获取双核心参数
if (url.includes("initBySession")) {
  try {
    let j = JSON.parse(body);
    const sop = j.item.sopSession;
    const cid = j.item.id;

    cache.write(sop, "huijuan_sop");
    cache.write(cid, "huijuan_cid");
    cache.write("1", "huijuan_running");

    //极速智能延时
    fastStep();
  } catch (e) {}
  $done({ body });
}

//极速链式全自动全套5步
async function fastStep() {
  const sop = cache.read("huijuan_sop");
  const cid = cache.read("huijuan_cid");
  const hd = { "Content-Type": "application/json" };

  //第二步
  await new Promise(s => setTimeout(s, 600));
  await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/process",
    headers: hd,
    body: JSON.stringify({ async: true, inputPayload: null, contextId: cid, sopSession: sop })
  });

  //第三步
  await new Promise(s => setTimeout(s, 600));
  await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/getAsyncProcessResultV2",
    headers: hd,
    body: JSON.stringify({ contextId: cid, sopSession: sop })
  });

  //第四步 指定日期提交
  await new Promise(s => setTimeout(s, 600));
  await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/process",
    headers: hd,
    body: JSON.stringify({ async: true, inputPayload: { time: SELECT_DATE }, contextId: cid, sopSession: sop })
  });

  //第五步 获取全部完整流水
  await new Promise(s => setTimeout(s, 700));
  let res = await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/getAsyncProcessResultV2",
    headers: hd,
    body: JSON.stringify({ contextId: cid, sopSession: sop })
  });

  //数据解析超强统计
  analysisAll(res.body);
}

//终极统计算法｜获得/消耗分开、三类碎片独立计数
function analysisAll(b) {
  try {
    let data = JSON.parse(b);
    let rows = data.item.handlerResponseList[0].result.allTableData.rows;

    let totalXiao = 0, totalZhong = 0, totalDa = 0;
    let getAll = 0, costAll = 0;
    let simpleLog = "";

    rows.forEach(i => {
      let num = Number(i.数量);
      if (i.变化情况 === "获得") {
        getAll += num;
        if (i.绘卷类型.includes("小")) totalXiao += num;
        if (i.绘卷类型.includes("中")) totalZhong += num;
        if (i.绘卷类型.includes("大")) totalDa += num;
      } else {
        costAll += num;
      }
    })

    simpleLog += `📅查询日期：${SELECT_DATE}\n`;
    simpleLog += `━━━━━━━━━━\n`;
    simpleLog += `🟡绘卷碎片·小：${totalXiao}枚\n`;
    simpleLog += `🟢绘卷碎片·中：${totalZhong}枚\n`;
    simpleLog += `🔴绘卷碎片·大：${totalDa}枚\n`;
    simpleLog += `━━━━━━━━━━\n`;
    simpleLog += `✅当日总共获得：${getAll}枚\n`;
    simpleLog += `❌当日总共消耗：${costAll}枚`;

    $notify("阴阳师绘卷终极查询成功", simpleLog, "已汇总全天全部产出流水");

  } catch (e) {
    $notify("暂无数据", "日期无记录或网络延迟", "");
  }

  //解锁运行锁
  cache.delete("huijuan_running");
}

//捕获异常自动清锁防卡死
try {
  $done({});
} catch {
  cache.delete("huijuan_running");
}
