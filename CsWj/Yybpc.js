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
const SCRIPT_VERSION = "2.3.0";
const DEFAULT_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.53(0x18003531) NetType/WIFI Language/zh_CN";

let startTime = Date.now();
let message = "";
let accountCounter = 0;

// =============================== 主逻辑 ===============================
async function main() {
  try {
    console.log(`\n🔔 脚本启动 v${SCRIPT_VERSION}`);
    safePrintEnvInfo();

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
function safePrintEnvInfo() {
  try {
    const clientType = detectClientType();
    const versionInfo = getClientVersion();
    
    console.log(`
===== 环境信息 =====
客户端：${clientType}
版本：${versionInfo}
时间：${new Date().toLocaleString()}
====================`);
  } catch (e) {
    console.log("⚠️ 环境信息获取失败");
  }
}

function detectClientType() {
  try {
    if (typeof $task !== "undefined") return "Quantumult X";
    if (typeof $httpClient !== "undefined") return "Surge";
    return "未知环境";
  } catch (e) {
    return "环境检测失败";
  }
}

function getClientVersion() {
  try {
    // Quantumult X 特有属性检测
    if (typeof $environment !== "undefined") {
      return $environment["quantumult-x-version"] || "未知版本";
    }
    return "版本信息不可用";
  } catch (e) {
    return "版本检测异常";
  }
}

// ... [保留其他核心功能函数不变] ...

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
      
      // 增强环境检测方法
      this.isQuanX = () => true;
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
