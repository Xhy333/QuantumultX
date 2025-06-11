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





// 基础设置
const module = {
  name: "🍅 番茄小说",
  author: "DeepSeek",
  version: "1.3",
  timeout: 10000, // 10秒超时
  useMitm: true, // 需要MitM
  hostnames: ["fanqienovel.com", "api5-normal-lq.fqnovel.com"], // 需要MitM的域名
}

// 持久化存储键名
const COOKIE_KEY = "fanqie_cookie_v2"

// API配置
const API = {
  signin: "https://api5-normal-lq.fqnovel.com/reading/task/check_in",
  userinfo: "https://api5-normal-lq.fqnovel.com/account/user/info",
  taskList: "https://api5-normal-lq.fqnovel.com/reading/task/list"
}

// 主函数
async function main() {
  // 检查Cookie是否存在
  const cookie = $prefs.valueForKey(COOKIE_KEY)
  if (!cookie) {
    $notify(module.name, "⚠️ Cookie未配置", "请先获取Cookie")
    return
  }

  try {
    // 1. 获取用户信息
    const user = await getUserInfo(cookie)
    const userName = user?.data?.user_name || "未知用户"
    
    // 2. 执行签到
    const signResult = await doSignIn(cookie)
    
    // 3. 获取任务列表
    const tasks = await getTaskList(cookie)
    
    // 4. 解析结果
    let msg = `👤 ${userName}`
    let subtitle = ""
    
    if (signResult.err_no === 0) {
      const tomatoCount = signResult.data.tomato_count || 0
      const totalDays = signResult.data.total_days || 0
      msg += ` | ✅ 签到成功\n`
      msg += `🍅 今日获得: ${tomatoCount}番茄\n`
      msg += `📅 累计签到: ${totalDays}天`
      subtitle = "签到成功"
    } else if (signResult.err_no === 10009) {
      msg += " | ⏰ 今日已签到"
      subtitle = "无需重复签到"
    } else {
      throw new Error(`签到失败: ${signResult.err_msg || "未知错误"}`)
    }
    
    // 5. 添加任务信息
    if (tasks?.data?.tasks) {
      const todoTasks = tasks.data.tasks.filter(t => t.status === 0)
      if (todoTasks.length > 0) {
        msg += `\n\n📝 待完成任务: ${todoTasks.length}个`
        todoTasks.slice(0, 3).forEach(task => {
          msg += `\n- ${task.name} (+${task.tomato_count}🍅)`
        })
      }
    }
    
    $notify(module.name, subtitle, msg)
    
  } catch (error) {
    $notify(module.name, "⚠️ 执行出错", error.message || error)
  }
}

// 获取用户信息
function getUserInfo(cookie) {
  return fetchAPI(API.userinfo, "GET", null, cookie)
}

// 执行签到
function doSignIn(cookie) {
  return fetchAPI(API.signin, "POST", {}, cookie)
}

// 获取任务列表
function getTaskList(cookie) {
  return fetchAPI(API.taskList, "GET", null, cookie)
}

// 通用API请求
function fetchAPI(url, method, body, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {
      "Cookie": cookie,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      "Referer": "https://fanqienovel.com/",
      "Content-Type": "application/json"
    }
    
    $task.fetch({
      url: url,
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(response => {
      if (response.statusCode === 200) {
        try {
          resolve(JSON.parse(response.body))
        } catch (e) {
          reject("解析响应失败")
        }
      } else {
        reject(`API请求失败: HTTP ${response.statusCode}`)
      }
    }, reason => {
      reject(`网络请求失败: ${reason.error}`)
    })
  })
}

// 获取Cookie处理器
function getCookieHandler() {
  const req = $request
  if (req && req.url.includes("fanqienovel.com") && req.headers) {
    const cookie = req.headers["Cookie"] || req.headers["cookie"]
    if (cookie) {
      $prefs.setValueForKey(cookie, COOKIE_KEY)
      $notify(module.name, "✅ Cookie获取成功", "请关闭此提示")
    } else {
      $notify(module.name, "⚠️ Cookie获取失败", "未找到Cookie字段")
    }
  } else {
    $notify(module.name, "⚠️ 无效请求", "未捕获到有效请求")
  }
  $done({})
}

// 模块入口
if (typeof $task !== "undefined") {
  // 定时任务入口
  main()
} else if (typeof $request !== "undefined") {
  // 请求处理入口 (用于获取Cookie)
  getCookieHandler()
}
