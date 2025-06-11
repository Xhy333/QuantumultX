/* 名称: 番茄小说每日签到
// 作者: @鱼儿
// 描述: 自动完成番茄小说每日签到任务，领取番茄奖励 浏览器访问: https://fanqienovel.com/登录番茄小说账号在Quantumult X的日志中找到`fanqienovel.com`的请求复制`Cookie`字段的全部内容
// 支持: Quantumult X 
// 远程链接: https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/ZDH/F-q-x-s.js


-------------- Quantumult X 配置 --------------
[task_local]
# 番茄小说每日签到 (每天上午9点执行)
0 9 * * * https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/ZDH/F-q-x-s.js, tag=番茄小说签到, enabled=true

[rewrite_local]
# 番茄小说Cookie获取
^https:\/\/fanqienovel\.com url script-request-header https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/ZDH/F-q-x-s.js

[mitm]
hostname = %APPEND% fanqienovel.com, api5-normal-lq.fqnovel.com
*/





const cookieName = '🍅 番茄小说'
const signurl = 'https://api5-normal-lq.fqnovel.com/reading/account/sign_in/v1'
const coinurl = 'https://api5-normal-lq.fqnovel.com/reading/account/coin_balance/v1'
const userurl = 'https://api5-normal-lq.fqnovel.com/reading/user/account/v1'
const device = "DEVICE_INFO" // 替换为你的设备信息

let userCookie = $prefs.valueForKey("fqxsCookie")
if (!userCookie) {
    $notify(cookieName, "未配置Cookie", "请先获取Cookie")
    $done()
}

// 执行签到任务
signTask()

function signTask() {
    const headers = {
        'Host': 'api5-normal-lq.fqnovel.com',
        'Cookie': userCookie,
        'User-Agent': 'okhttp/3.12.1',
        'X-Device': device
    }

    // 获取用户信息
    $task.fetch({ url: userurl, headers: headers }).then(userResponse => {
        handleUserInfo(userResponse)
    }, reason => {
        $notify(cookieName, "用户信息请求失败", reason.error)
        $done()
    })
}

function handleUserInfo(response) {
    if (response.statusCode !== 200) {
        $notify(cookieName, "用户信息获取失败", `状态码: ${response.statusCode}`)
        $done()
        return
    }

    try {
        const userData = JSON.parse(response.body)
        const userName = userData.data.user.nickname || "未知用户"
        const userId = userData.data.user.uid
        
        // 执行签到
        signIn(userName, userId)
    } catch (e) {
        $notify(cookieName, "解析用户信息失败", e.message)
        $done()
    }
}

function signIn(userName, userId) {
    const signHeaders = {
        'Host': 'api5-normal-lq.fqnovel.com',
        'Content-Type': 'application/json',
        'Cookie': userCookie,
        'User-Agent': 'okhttp/3.12.1',
        'X-Device': device
    }

    const signBody = {
        "sign_in_type": 0,
        "timezone": 8,
        "fqnovel_id": userId
    }

    $task.fetch({
        url: signurl,
        method: "POST",
        headers: signHeaders,
        body: JSON.stringify(signBody)
    }).then(signResponse => {
        handleSignResponse(signResponse, userName)
    }, reason => {
        $notify(cookieName, "签到请求失败", reason.error)
        $done()
    })
}

function handleSignResponse(response, userName) {
    if (response.statusCode !== 200) {
        $notify(cookieName, "签到失败", `状态码: ${response.statusCode}`)
        $done()
        return
    }

    try {
        const result = JSON.parse(response.body)
        if (result.code === 0) {
            getCoinBalance(userName)
        } else if (result.code === 1001) {
            getCoinBalance(userName, "今日已签到")
        } else {
            $notify(cookieName, "签到失败", result.message || "未知错误")
            $done()
        }
    } catch (e) {
        $notify(cookieName, "解析签到结果失败", e.message)
        $done()
    }
}

function getCoinBalance(userName, signMsg = "签到成功") {
    const coinHeaders = {
        'Host': 'api5-normal-lq.fqnovel.com',
        'Cookie': userCookie,
        'User-Agent': 'okhttp/3.12.1',
        'X-Device': device
    }

    $task.fetch({ url: coinurl, headers: coinHeaders }).then(coinResponse => {
        handleCoinResponse(coinResponse, userName, signMsg)
    }, reason => {
        $notify(cookieName, "番茄查询失败", reason.error)
        $done()
    })
}

function handleCoinResponse(response, userName, signMsg) {
    try {
        const coinData = JSON.parse(response.body)
        if (coinData.code === 0) {
            const coins = coinData.data.coin_balance
            $notify(
                `${cookieName} - ${userName}`,
                signMsg,
                `💰 当前番茄: ${coins}`
            )
        } else {
            $notify(cookieName, "获取番茄失败", coinData.message || "未知错误")
        }
    } catch (e) {
        $notify(cookieName, "解析番茄数据失败", e.message)
    }
    $done()
}







