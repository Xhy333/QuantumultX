
/**
 * 爷爷不泡茶
 * cron: 10 8 * * *
 * QX配置: [task_local]
 * 0 8 * * * https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/CsWj/Yybpc.js, tag=爷爷不泡茶, enabled=true
 * 变量名: yybpc
 * 格式: qm-user-token 多账号用换行或@分隔
 */

const $ = new Env('爷爷不泡茶');
const Notify = 1;
const debug = 0;
let scriptVersionNow = "1.0.0";
let msg = "";

!(async () => {
    await getNotice();
    await getVersion("yang7758258/ohhh154@main/yybpc.js");
    await main();
    await SendMsg(msg);
})().catch((e) => $.logErr(e)).finally(() => $.done());

async function main() {
    const env = $.getdata('yybpc');
    if (!env) {
        console.log('请先配置yybpc变量');
        return;
    }
    
    let user_ck = env.split(/[\n#]/).filter(v => v.trim());
    DoubleLog(`\n========= 共找到 ${user_ck.length} 个账号 =========`);
    
    for (let i = 0; i < user_ck.length; i++) {
        let token = user_ck[i].trim();
        if (!token) continue;
        
        const user = { index: i + 1, token };
        await userTask(user);
        if (i < user_ck.length - 1) await $.wait(2000);
    }
}

async function userTask(user) {
    DoubleLog(`\n========= 账号[${user.index}]开始任务 =========`);
    const headers = {
        "qm-from": "wechat",
        "qm-user-token": user.token,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.53(0x18003531) NetType/WIFI Language/zh_CN'
    };

    // 签到
    let signResult = await $.post({
        url: 'https://webapi.qmai.cn/web/cmk-center/sign/takePartInSign',
        headers: headers,
        body: JSON.stringify({
            "activityId": "983701274523176960",
            "appid": "wx3423ef0c7b7f19af"
        })
    });
    if (signResult.status === 200) {
        const data = JSON.parse(signResult.body);
        DoubleLog(data.status ? `签到成功🎉` : `签到失败: ${data.message}`);
    }

    // 查询积分
    let pointsResult = await $.post({
        url: 'https://webapi.qmai.cn/web/mall-apiserver/integral/user/points-info',
        headers: headers,
        body: JSON.stringify({ "appid": "wx3423ef0c7b7f19af" })
    });
    if (pointsResult.status === 200) {
        const data = JSON.parse(pointsResult.body);
        DoubleLog(data.status ? `当前积分: ${data.data.totalPoints}` : `积分查询失败`);
    }

    // 查询签到统计
    let statsResult = await $.post({
        url: 'https://webapi.qmai.cn/web/cmk-center/sign/userSignStatistics',
        headers: headers,
        body: JSON.stringify({
            "activityId": "983701274523176960",
            "appid": "wx3423ef0c7b7f19af"
        })
    });
    if (statsResult.status === 200) {
        const data = JSON.parse(statsResult.body);
        if (data.status) {
            DoubleLog(`连续签到${data.data.signDays}天，下一奖励需${data.data.nextSignDays}天`);
        }
    }
}

function DoubleLog(data) {
    console.log(data);
    msg += `\n${data}`;
}

async function SendMsg() {
    if (Notify && msg) $.msg($.name, '', msg);
}

async function getVersion() {
    // 版本检查逻辑（需自行实现）
}

function Env(name) {
    // QX环境适配（需保留原有Env实现）
    // ... [保留原有Env构造函数实现]
}

// 保留原有的Env构造函数实现
// ... [此处保留用户提供的Env构造函数代码]
