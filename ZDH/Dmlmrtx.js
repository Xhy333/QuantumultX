/**************************************
@Name：达美乐每日提醒
@Author：
@Date：2025-7-01 02:58:31


使用方法：
QuantumultX
1.在bot提交ck后自动获取更新脚本保存到本地
2.打开达乐美披萨公众号->优惠｜咨询->有奖游戏->添加到桌面获取转跳链接->每日提醒弹窗点击自动转跳小程序，获取小程序转跳链接则可以使用该脚本
3.需要搭配大佬的重写自动获取更新脚本使用

[Script]
cron "30 10 * * *" script-path=https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/ZDH/Dmlmrtx.js,timeout=300, tag=达美乐每日提醒

达美乐披萨 = type=http-request, pattern=^https:\/\/game\.dominos\.com\.cn\/.+\/getUser?, script-path=https://gist.githubusercontent.com/Sliverkiss/759317872ee3828579483a57c05b58ea/raw/dlm_upload.js, requires-body=true, max-size=-1, timeout=1600

[MITM]
hostname = %APPEND% game.dominos.com.cn
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


// 功能：发送每日提醒通知（支持BoxJS配置）
const title = "⏰ 达美乐每日进入小程序提醒";
const subtitle = "小程序自动更新ey字段";
const message = "请立即进入小程序完成今日更新！";

// 从BoxJS读取自定义链接，若未配置则使用默认链接
const userLink = $persistentStore.read("达美乐链接") || $persistentStore.read("Dmlztlj");
const wxLink = userLink || "https://wxaurl.cn/k9RqtoN7hJr"; // 默认链接

// 发送带跳转功能的通知
$notify(title, subtitle, message, {
    "open-url": wxLink   // 点击通知直接跳转
});

$done();