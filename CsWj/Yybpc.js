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
const SCRIPT_VERSION = "2.2.0";
const DEFAULT_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.53(0x18003531) NetType/WIFI Language/zh_CN";

let startTime = Date.now();
let message = "";
let accountCounter = 0;

// =============================== 主逻辑 ===============================
async function main() {
  try {
    console.log(`\n🔔 脚本启动 v${SCRIPT_VERSION}`);
    printEnvInfo();

    const tokens = getValidTokens();
    if (tokens.length === 0) return;

    console.log(`\n✅ 找到 ${tokens.length} 个有效账号`);
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
    
    message += formatResult(accountNo, signRes, pointsRes);
  } catch (e) {
    handleAccountError(accountNo, e);
  }
}

// ============================ 核心功能 ==============================
async function signTask(headers, accountNo) {
  try {
    const url = `https://${API_DOMAIN}/web/cmk-center/sign/takePartInSign`;
    const body = JSON.stringify({
      activityId: "983701274523176960",
      appid: "wx3423ef0c7b7f19af"
    });

    const resp = await $.http.post(url, { headers, body });
    return handleApiResponse(resp, accountNo, "签到");
  } catch (e) {
    console.log(`❌ 账号${accountNo} 签到异常：${e.message}`);
    return { status: "签到异常", success: false };
  }
}

async function getPoints(headers, accountNo) {
  try {
    const url = `https://${API_DOMAIN}/web/mall-apiserver/integral/user/points-info`;
    const body = JSON.stringify({ appid: "wx3423ef0c7b7f19af" });

    const resp = await $.http.post(url, { headers, body });
    const result = handleApiResponse(resp, accountNo, "积分查询");
    
    return {
      points: result?.data?.totalPoints || 0,
      success: result?.success || false
    };
  } catch (e) {
    console.log(`⚠️ 账号${accountNo} 积分查询失败`);
    return { points: "查询失败", success: false };
  }
}

async function getSignStatus(headers, accountNo) {
  try {
    const url = `https://${API_DOMAIN}/web/cmk-center/sign/userSignStatistics`;
    const body = JSON.stringify({
      activityId: "983701274523176960",
      appid: "wx3423ef0c7b7f19af"
    });

    const resp = await $.http.post(url, { headers, body });
    const result = handleApiResponse(resp, accountNo, "签到统计");

    if (result?.success) {
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

function handleApiResponse(resp, accountNo, type) {
  try {
    if (!resp.statusCode || resp.statusCode !== 200) {
      throw new Error(`${type}失败：HTTP ${resp.statusCode}`);
    }

    const result = JSON.parse(resp.body);
    if (result?.status !== true) {
      throw new Error(`${type}失败：${result?.message || "未知错误"}`);
    }

    console.log(`✅ 账号${accountNo} ${type}成功`);
    return { ...result, success: true };
  } catch (e) {
    console.log(`❌ 账号${accountNo} ${type}异常：${e.message}`);
    if (resp?.body) console.log(`原始响应：${resp.body.substring(0, 200)}`);
    return { success: false, message: e.message };
  }
}

function randomDelay(min=1000, max=5000) {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function formatResult(accountNo, signRes, pointsRes) {
  const statusIcon = signRes.success ? "✅" : "❌";
  const points = pointsRes.success ? pointsRes.points : "查询失败";
  return `\n账号${accountNo}：${statusIcon} ${signRes.status} | 积分：${points}`;
}

function handleAccountError(accountNo, e) {
  console.log(`\n❌ 账号${accountNo} 处理失败：${e.stack || e.message}`);
  message += `\n账号${accountNo}：处理失败⚠️`;
}

function printEnvInfo() {
  console.log(`
===== 环境信息 =====
客户端：${$.isQuanX() ? 'Quantumult X' : '其他'}
版本：${$environment?.['quantumult-x-version'] || '未知'}
时间：${new Date().toLocaleString()}
====================`);
}

function showFinalSummary() {
  const timeCost = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = (message.match(/✅/g) || []).length;
  const summary = `
✅ 任务完成
├ 成功账号：${successCount}/${accountCounter}
├ 总耗时：${timeCost}秒
└ 详细结果：${message}`;
  
  console.log(summary);
  if ($prefs.valueForKey("Notify") !== "0") {
    $.msg("爷爷不泡茶", `成功 ${successCount}/${accountCounter}`, message);
  }
}

function handleGlobalError(e) {
  const errorMsg = `‼️ 全局异常：${e.stack || e.message}`;
  console.log(errorMsg);
  $.msg("脚本异常", "", errorMsg.substring(0, 200));
}

// ======================== Quantumult X 环境适配 ========================
function Env(t, e) {
  return new class {
    constructor(t, e) {
      this.name = t;
      this.http = {
        post: (url, opts) => this.fetch("POST", url, opts),
        get: (url, opts) => this.fetch("GET", url, opts)
      };
      this.msg = (title, subtitle, body) => $notify(title, subtitle, body);
      this.log = (...args) => console.log(args.join(" "));
      this.wait = ms => new Promise(r => setTimeout(r, ms));
      this.done = () => $done();
      this.getdata = key => $prefs.valueForKey(key);
      this.setdata = (val, key) => $prefs.setValueForKey(val, key);
    }

    fetch(method, url, opts = {}) {
      return $task.fetch({
        method: method.toUpperCase(),
        url: url,
        headers: opts.headers || {},
        body: opts.body || ""
      });
    }
  }(t, e);
}

// =============================== 执行入口 ===============================
main().catch(e => console.log(`启动异常：${e.stack}`));
// =============================== 执行入口 ===============================
main().catch(e => console.log(`启动异常：${e.stack}`));
