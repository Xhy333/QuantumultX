// 名称: 也也步炮茶
// Author: Xhy333
// Date: 2024-05-20
// 使用说明：QuantumultX重写订阅中配置[rewrite_local]和[task_local]
// qm-user-token值，多账号用@分隔
// 远程脚本：https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/CsWj/Yybpc.js

const $ = new Env("爷爷不泡茶");
const env_name = "yybpc";
const Notify = 1;
const debug = 0;
let scriptVersionNow = "1.1.0";
let msg = "";

// ==================================主逻辑=================================
async function main() {
    const env = $prefs.valueForKey(env_name);
    if (!env) {
        console.log("未找到环境变量");
        return;
    }
    
    let user_ck = env.split(/[@\n]/).filter(Boolean);
    DoubleLog(`\n========= 共找到 ${user_ck.length} 个账号 =========`);
    
    for (let i = 0; i < user_ck.length; i++) {
        let token = user_ck[i].trim();
        if (!token) continue;
        
        let user = { index: i+1, token };
        await userTask(user);
        
        if (i < user_ck.length - 1) {
            await $.wait(Math.random() * 4000 + 1000);
        }
    }
    
    await SendMsg(msg);
    $.done();
}

// ==================================任务处理=================================
async function userTask(user) {
    console.log(`\n========= 账号[${user.index}]开始任务 =========`);
    
    const headers = {
        "qm-from": "wechat",
        "qm-user-token": user.token,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.53(0x18003531) NetType/WIFI Language/zh_CN",
        "Content-Type": "application/json"
    };

    await SignTask(headers, user);
    await $.wait(2000);
    await account(headers, user);
    await userSignStatistics(headers, user);
}

// ==================================功能函数=================================
async function SignTask(headers, user) {
    try {
        DoubleLog(`🕊账号[${user.index}] 开始签到...`);
        const options = {
            url: "https://webapi.qmai.cn/web/cmk-center/sign/takePartInSign",
            headers: headers,
            body: JSON.stringify({
                "activityId": "983701274523176960",
                "appid": "wx3423ef0c7b7f19af"
            })
        };
        
        const resp = await $.post(options);
        handleResult(resp, user, "签到");
    } catch (e) {
        console.log(`签到异常: ${e}`);
    }
}

async function account(headers, user) {
    try {
        DoubleLog(`🕊账号[${user.index}] 查询积分...`);
        const options = {
            url: "https://webapi.qmai.cn/web/mall-apiserver/integral/user/points-info",
            headers: headers,
            body: JSON.stringify({
                "appid": "wx3423ef0c7b7f19af"
            })
        };
        
        const resp = await $.post(options);
        handleResult(resp, user, "积分查询");
    } catch (e) {
        console.log(`积分查询异常: ${e}`);
    }
}

async function userSignStatistics(headers, user) {
    try {
        DoubleLog(`🕊账号[${user.index}] 查询签到情况...`);
        const options = {
            url: "https://webapi.qmai.cn/web/cmk-center/sign/userSignStatistics",
            headers: headers,
            body: JSON.stringify({
                "activityId": "983701274523176960",
                "appid": "wx3423ef0c7b7f19af"
            })
        };
        
        const resp = await $.post(options);
        handleResult(resp, user, "签到统计");
    } catch (e) {
        console.log(`签到统计异常: ${e}`);
    }
}

// ==================================辅助函数=================================
function handleResult(resp, user, type) {
    try {
        const result = JSON.parse(resp.body);
        if (result?.status) {
            let msg = "";
            switch(type) {
                case "签到":
                    msg = `签到成功🎉`;
                    break;
                case "积分查询":
                    msg = `当前积分[${result.data?.totalPoints}]`;
                    break;
                case "签到统计":
                    msg = `连续签到[${result.data?.signDays}天] 下一奖励[${result.data?.nextRewardList?.[0]?.rewardList?.[0]?.rewardName}]`;
                    break;
            }
            DoubleLog(`🕊账号[${user.index}] ${msg}`);
        } else {
            DoubleLog(`🕊账号[${user.index}] ${type}失败: ${result?.message || "未知错误"}`);
        }
    } catch (e) {
        console.log(`结果解析异常: ${e}`);
    }
}

function DoubleLog(data) {
    console.log(data);
    msg += `\n${data}`;
}

async function SendMsg(message) {
    if (Notify && message) {
        $.msg($.name, "", message);
    }
}

// ==================================执行入口=================================
main().catch(e => console.log(e));

// QuantumultX兼容代码
function Env(t, e) {
    class s {
        constructor(t) { this.env = t }
        send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return ("POST" === e && (s = this.post), new Promise((e, a) => { s.call(this, t, (t, s, r) => { t ? a(t) : e(s) }) }) }
        get(t) { return this.send.call(this.env, t) }
        post(t) { return this.send.call(this.env, t, "POST") }
    }
    return new class {
        constructor(t, e) {
            this.name = t;
            this.http = new s(this);
            this.data = null;
            this.dataFile = "box.dat";
            this.logs = [];
            this.isMute = !1;
            this.isNeedRewrite = !1;
            this.logSeparator = "\n";
            this.startTime = (new Date).getTime();
            Object.assign(this, e);
            this.log("", `🔔${this.name}, 开始!`)
        }
        getEnv() { return "Quantumult X" === this.getEnv() }
        isNode() { return !1 }
        isQuanX() { return !0 }
        getdata(t) { return $prefs.valueForKey(t) }
        setdata(t, e) { return $prefs.setValueForKey(t, e) }
        msg(e = t, s = "", a = "") { $notify(e, s, a) }
        log(t) { console.log(t) }
        wait(t) { return new Promise(e => setTimeout(e, t)) }
        done(t = {}) { $done(t) }
    }(t, e)
}
