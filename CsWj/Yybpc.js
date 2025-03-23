/*名称: 也也步炮茶
 * Author: Xhy333
 * Date: 2024-05-20
 * 使用说明：QuantumultX重写订阅中配置[rewrite_local]和[task_local]
 * qm-user-token值，多账号用@分隔
 * 远程脚本：https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/CsWj/Yybpc.js
 ==================================    QX   =================================
 [MITM]
hostname = webapi.qmai.cn

[rewrite_local]
^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center|mall-apiserver) url script-request-header https://raw.githubusercontent.com/Xhy333/QuantumultX/main/CsWj/Yybpc.js

[task_local]
10 8 * * * https://raw.githubusercontent.com/Xhy333/QuantumultX/main/CsWj/Yybpc.js, tag=爷爷不泡茶, enabled=true


 */






const $ = new Env("爷爷不泡茶");
const API_DOMAIN = "webapi.qmai.cn";
const SCRIPT_VERSION = "2.1.0";
const DEFAULT_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.53(0x18003531) NetType/WIFI Language/zh_CN";

let startTime = Date.now();
let message = "";
let accountCounter = 0;

// =============================== 主逻辑 ===============================
async function main() {
  try {
    console.log(`\n🔔 脚本启动 v${SCRIPT_VERSION}\n`);

    const tokens = getValidTokens();
    if (tokens.length === 0) return;

    console.log(`✅ 找到 ${tokens.length} 个有效账号`);
    for (const [index, token] of tokens.entries()) {
      await processAccount(token, index + 1);
      if (index < tokens.length - 1) await randomDelay(1000, 5000);
    }

    showFinalSummary();
  } catch (e) {
    handleGlobalError(e);
  } finally {
    $.done();
  }
}

// ============================== 功能函数 ==============================
function getValidTokens() {
  const env = $prefs.valueForKey("yybpc") || "";
  return env.split(/[@\n]/)
    .map(t => t.trim())
    .filter(Boolean);
}

async function processAccount(token, accountNo) {
  accountCounter++;
  const headers = buildHeaders(token);
  
  try {
    console.log(`\n📌 账号 ${accountNo} 开始处理`);
    
    // 执行任务链
    const signRes = await signTask(headers, accountNo);
    await randomDelay(2000, 3000);
    
    const pointsRes = await getPoints(headers, accountNo);
    await randomDelay(1000, 2000);
    
    await getSignStatus(headers, accountNo);
    
    // 合并通知消息
    message += `\n账号${accountNo}：${signRes.status} | 积分：${pointsRes.points}`;
  } catch (e) {
    console.log(`❌ 账号${accountNo} 处理失败：${e.message}`);
    message += `\n账号${accountNo}：处理失败⚠️`;
  }
}

// ============================ 核心功能 ==============================
async function signTask(headers, accountNo) {
  try {
    const options = {
      url: `https://${API_DOMAIN}/web/cmk-center/sign/takePartInSign`,
      headers: headers,
      body: JSON.stringify({
        activityId: "983701274523176960",
        appid: "wx3423ef0c7b7f19af"
      })
    };

    const resp = await $.post(options);
    const result = parseResponse(resp);

    if (result?.status === true) {
      console.log(`✅ 账号${accountNo} 签到成功`);
      return { status: "签到成功 🎉" };
    } else {
      const msg = result?.message || "未知错误";
      console.log(`⚠️ 账号${accountNo} 签到失败：${msg}`);
      return { status: `签到失败：${msg}` };
    }
  } catch (e) {
    console.log(`❌ 账号${accountNo} 签到异常：${e.message}`);
    return { status: "签到异常 ⚠️" };
  }
}

async function getPoints(headers, accountNo) {
  try {
    const options = {
      url: `https://${API_DOMAIN}/web/mall-apiserver/integral/user/points-info`,
      headers: headers,
      body: JSON.stringify({
        appid: "wx3423ef0c7b7f19af"
      })
    };

    const resp = await $.post(options);
    const result = parseResponse(resp);

    if (result?.status === true) {
      const points = result.data?.totalPoints || 0;
      console.log(`ℹ️ 账号${accountNo} 当前积分：${points}`);
      return { points };
    }
    return { points: 0 };
  } catch (e) {
    console.log(`⚠️ 账号${accountNo} 积分查询失败`);
    return { points: "查询失败" };
  }
}

async function getSignStatus(headers, accountNo) {
  try {
    const options = {
      url: `https://${API_DOMAIN}/web/cmk-center/sign/userSignStatistics`,
      headers: headers,
      body: JSON.stringify({
        activityId: "983701274523176960",
        appid: "wx3423ef0c7b7f19af"
      })
    };

    const resp = await $.post(options);
    const result = parseResponse(resp);

    if (result?.status === true) {
      const days = result.data?.signDays || 0;
      const nextReward = result.data?.nextRewardList?.[0]?.rewardList?.[0]?.rewardName || "无";
      console.log(`📅 账号${accountNo} 已连续签到 ${days} 天，下一奖励：${nextReward}`);
    }
  } catch (e) {
    console.log(`⚠️ 账号${accountNo} 签到统计查询失败`);
  }
}

// ============================ 工具函数 ==============================
function buildHeaders(token) {
  return {
    "qm-from": "wechat",
    "qm-user-token": token,
    "User-Agent": DEFAULT_UA,
    "Content-Type": "application/json",
    "Referer": "https://servicewechat.com/wx3423ef0c7b7f19af/66/page-frame.html"
  };
}

function parseResponse(resp) {
  try {
    if (resp.statusCode !== 200) {
      throw new Error(`HTTP ${resp.statusCode}`);
    }
    return JSON.parse(resp.body);
  } catch (e) {
    console.log(`响应解析失败：${e.message}`);
    return null;
  }
}

function randomDelay(min=1000, max=5000) {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function showFinalSummary() {
  const timeCost = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = `\n✅ 任务完成
  处理账号：${accountCounter} 个
  耗时：${timeCost} 秒
  ${message}`;
  
  console.log(summary);
  if ($prefs.valueForKey("Notify") !== "0") {
    $.msg("爷爷不泡茶", `处理完成 ${accountCounter} 个账号`, message);
  }
}

function handleGlobalError(e) {
  const errorMsg = `‼️ 全局异常：${e.stack || e.message}`;
  console.log(errorMsg);
  $.msg("脚本异常", "", errorMsg.substring(0, 200));
}

// ========================== Quantumult X 环境适配 ========================
function Env(t, e) {
  return new class {
    constructor(t, e) {
      this.name = t;
      this.http = {
        post: (options) => $task.fetch({ method: "POST", ...options }),
        get: (options) => $task.fetch({ method: "GET", ...options })
      };
      this.msg = (title, subtitle, body) => $notify(title, subtitle, body);
      this.log = console.log;
      this.wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      this.done = () => $done();
      this.getdata = (key) => $prefs.valueForKey(key);
      this.setdata = (val, key) => $prefs.setValueForKey(val, key);
    }
  }(t, e);
}

// =============================== 执行入口 ===============================
main().catch(e => console.log(`启动异常：${e.stack}`));
