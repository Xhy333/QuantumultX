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



/*
@name 阴阳师绘卷碎片·三合一终极查询
@version 2.0终极修复无报错版
@author Xhy333
@功能 自选日期+极速链式+防重复卡死+全碎片统计
*/

const cache = $persist || $cache;
const body = $response.body;
const url = $request.url;

//==== 自行修改查询日期 格式：2026-05-02 ====
const SELECT_DATE = "2026-05-02";

//全局防重复锁
if (cache.read("huijuan_running") === "1") {
  $done({ body });
  return;
}

//步骤1初始化拿参数
if (url.includes("initBySession")) {
  try {
    let j = JSON.parse(body);
    const sop = j.item.sopSession;
    const cid = j.item.id;

    cache.write(sop, "huijuan_sop");
    cache.write(cid, "huijuan_cid");
    cache.write("1", "huijuan_running");

    fastStep();
  } catch (e) {}
  $done({ body });
}

//极速全自动5步链式
async function fastStep() {
  const sop = cache.read("huijuan_sop");
  const cid = cache.read("huijuan_cid");
  const hd = { "Content-Type": "application/json" };

  await new Promise(s => setTimeout(s, 600));
  await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/process",
    headers: hd,
    body: JSON.stringify({ async: true, inputPayload: null, contextId: cid, sopSession: sop })
  });

  await new Promise(s => setTimeout(s, 600));
  await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/getAsyncProcessResultV2",
    headers: hd,
    body: JSON.stringify({ contextId: cid, sopSession: sop })
  });

  await new Promise(s => setTimeout(s, 600));
  await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/process",
    headers: hd,
    body: JSON.stringify({ async: true, inputPayload: { time: SELECT_DATE }, contextId: cid, sopSession: sop })
  });

  await new Promise(s => setTimeout(s, 700));
  let res = await $http.post({
    url: "https://turing.gameyw.netease.com/sop-api/api/out/context/getAsyncProcessResultV2",
    headers: hd,
    body: JSON.stringify({ contextId: cid, sopSession: sop })
  });

  analysisAll(res.body);
}

//数据汇总解析
function analysisAll(b) {
  try {
    let data = JSON.parse(b);
    let rows = data.item.handlerResponseList[0].result.allTableData.rows;

    let totalXiao = 0, totalZhong = 0, totalDa = 0;
    let getAll = 0, costAll = 0;

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

    let msg = `📅查询日期：${SELECT_DATE}
━━━━━━━━━━
🟡绘卷碎片·小：${totalXiao}枚
🟢绘卷碎片·中：${totalZhong}枚
🔴绘卷碎片·大：${totalDa}枚
━━━━━━━━━━
✅当日总共获得：${getAll}枚
❌当日总共消耗：${costAll}枚`;

    $notify("阴阳师绘卷终极查询成功", msg, "");

  } catch (e) {
    $notify("暂无数据", "日期无记录或网络延迟", "");
  }

  cache.delete("huijuan_running");
}

try {
  $done({});
} catch {
  cache.delete("huijuan_running");
}