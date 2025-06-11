// 名称: 番茄小说每日签到
// 作者: @鱼儿
// 描述: 自动完成番茄小说每日签到任务，领取番茄奖励 浏览器访问: https://fanqienovel.com/登录番茄小说账号在Quantumult X的日志中找到`fanqienovel.com`的请求复制`Cookie`字段的全部内容
// 支持: Quantumult X 

const cookieName = '🍅 番茄小说'
const cookieKey = 'fanqie_cookie'
const signinURL = 'https://api5-normal-lq.fqnovel.com/reading/task/check_in'
const userinfoURL = 'https://api5-normal-lq.fqnovel.com/account/user/info'
const notifyTitle = '🍅 番茄小说签到'

let cookieVal = $prefs.valueForKey(cookieKey)

if (!cookieVal) {
  $notify(cookieName, '⚠️ 请先获取Cookie', '使用浏览器访问番茄小说并登录')
  $done()
}

const headers = {
  'Cookie': cookieVal,
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  'Referer': 'https://fanqienovel.com/',
  'Content-Type': 'application/json'
}

// 主函数
(async () => {
  try {
    // 1. 获取用户信息
    const userInfo = await getUserInfo()
    const userName = userInfo.data.user_name || '未知用户'
    
    // 2. 执行签到
    const signResult = await doSignIn()
    
    // 3. 解析结果
    if (signResult.err_no === 0) {
      const tomatoCount = signResult.data.tomato_count || 0
      const totalDays = signResult.data.total_days || 0
      const msg = `👤 ${userName} | ✅ 签到成功\n` +
                  `🍅 今日获得: ${tomatoCount}番茄\n` +
                  `📅 累计签到: ${totalDays}天`
      $notify(notifyTitle, '', msg)
    } else if (signResult.err_no === 10009) {
      $notify(notifyTitle, '⏰ 今日已签到', `👤 ${userName} 请勿重复签到`)
    } else {
      throw new Error(`❌ 签到失败: ${signResult.err_msg || '未知错误'}`)
    }
  } catch (error) {
    $notify(notifyTitle, '⚠️ 发生错误', error.message || error)
  } finally {
    $done()
  }
})()

// 签到函数
function doSignIn() {
  return new Promise((resolve, reject) => {
    $task.fetch({
      url: signinURL,
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    }).then(response => {
      try {
        resolve(JSON.parse(response.body))
      } catch (e) {
        reject('解析签到响应失败')
      }
    }, reason => {
      reject(`签到请求失败: ${reason.error}`)
    })
  })
}

// 获取用户信息
function getUserInfo() {
  return new Promise((resolve, reject) => {
    $task.fetch({
      url: userinfoURL,
      method: 'GET',
      headers: headers
    }).then(response => {
      try {
        resolve(JSON.parse(response.body))
      } catch (e) {
        reject('解析用户信息失败')
      }
    }, reason => {
      reject(`用户信息请求失败: ${reason.error}`)
    })
  })
}