/*************************************************************
 * 番茄小说 净化脚本  (Quantumult X / Surge / Loon 通用)
 * 目标：去广告 + 去掉 签到/宝箱/提现/任务/福利/会员 等
 *       服务器下发后才出现的功能，只留 书城 / 短剧 / 听书 / 书架 / 我的。
 *       短剧、听书、抖音商城都保留（商城不能挡，挡了商城主流程会坏）。
 *
 * 用法：配合 fqnovel-clean.snippet 使用（script-response-body）。
 * 原理：只是「删数据」，不改协议、不伪造请求，安全可逆。
 *
 * 说明：所有过滤都是「按名字/结构关键字」匹配，宁可少删不乱删。
 *       想加词直接改下面 CONFIG 里的数组即可。
 *************************************************************/

const CONFIG = {
  ENABLE: true,
  DEBUG: true, // 打开后可在 QX 日志里看到每个接口删了什么，便于自己补词

  /* ========== 我的页面（/reading/bookapi/my_tab/plan/） ========== */
  MINE_CLEAN: true,
  // 必须保留（命中即跳过，优先于 DROP）
  MINE_KEEP: [
    "阅读历史", "最近阅读", "浏览历史", "收藏", "书签", "消息", "通知", "设置",
    "帮助", "反馈", "客服", "关于", "隐私", "协议", "清除缓存", "退出",
    "我的作品", "笔记", "关注", "粉丝", "扫码", "搜索", "短剧", "剧场", "听书", "有声",
    "商城", "好物", "电商"
  ],
  // 要删掉的功能入口（命中词就删除该卡片）
  MINE_DROP: [
    "签到", "签一签", "宝箱", "金币", "红包", "提现", "现金", "赚钱", "赚",
    "福利", "任务", "奖励", "领奖", "抽奖", "转盘", "摇一摇", "免广告",
    "会员", "VIP", "vip", "特惠", "直播", "游戏",
    "社区", "圈子", "漫画", "广告", "推广",
    "邀请", "新人", "钱包", "余额", "收益", "常玩", "活动", "打卡", "礼包"
  ],

  /* ========== 书城 / 分类 / 搜索（plan、new_category、search/tab） ========== */
  STORE_CLEAN: true,
  STORE_DROP: [
    "漫画", "出版", "直播", "游戏",
    "金币", "福利", "签到", "红包", "提现", "活动", "任务",
    "会员", "VIP", "广告", "推广", "社区", "圈子"
  ],

  /* ========== 底部/顶部 tab ========== */
  TAB_CLEAN: true,
  // 短剧、听书、商城都在保留名单里
  TAB_KEEP: ["书城", "短剧", "剧场", "听书", "有声", "书架", "我的", "首页", "推荐", "商城", "好物"],
  TAB_DROP: [
    "视频", "漫画", "出版", "直播",
    "社区", "圈子", "游戏", "福利", "金币", "活动", "会员"
  ],

  /* ========== 书架 ========== */
  SHELF_CLEAN: true,
  SHELF_DROP: ["金币", "福利", "签到", "宝箱", "提现", "红包", "广告", "推广", "活动", "任务", "游戏", "会员"],

  /* ========== 阅读页 ========== */
  // 只删带明确广告标记的段落/卡片，不动正文
  READER_CLEAN: true,

  /* ========== 活动中心 ========== */
  ACTIVITY_CLEAN: true,

  /* ========== 听书：只保留「刚装好、还没联网」时的基础能力 ========== */
  // 做法：后加的那些「限时 / 看广告续听 / 金币挂件」接口，在 snippet 里直接
  //       reject-dict 挡掉（见 E2 段），让 App 拿不到那套数据，听书就回到
  //       刚安装时的状态：能听、不弹时长、不插广告。
  //
  // 下面这个只是「兜底」：万一某个版本挡完接口仍然提示限时，再把它打开，
  // 脚本会把剩余时长字段改成超大值、把 need_unlock/tts_expired 复位。
  // 默认关闭 —— 因为你要的是「原状态」，不是「伪造一个无限时长」。
  LISTEN_PATCH_TIME: false,
  // 命中这些名字的数字字段 = 剩余可听时长
  LISTEN_TIME_KEYS: /(free_listen_time|available_listen_time|left_free_listen|left_consume_time|daily_free_time|listen_left_time|tts_left_time|free_listen_remain)/i,
  LISTEN_BIG: 999999,
  // 命中后强制 false（表示「没到期 / 不需要解锁」）
  LISTEN_FALSE_KEYS: ["need_unlock", "tts_expired", "tts_expired_v2", "tts_expired_v3", "listen_expire"],
  // 命中后强制 true（表示「全天已解锁」）
  LISTEN_TRUE_KEYS: ["all_day_unlocked", "unlocked_all_day", "kmp_audio_inspire_unlocked", "night_unlocked"],

  /* ========== 兜底：任何接口里的广告字段 ========== */
  GENERIC_AD_CLEAN: true,
  // 会被整块删除的「广告专属」字段名
  AD_KEY_RE: /(^ad_|_ad_|^ads$|^ad$|ad_info|ad_data|ad_json|ad_params|ad_config|ad_position|ad_extra|ad_track|ad_report|splash_ad|banner_ad|popup_ad|ad_material|ad_creative)/i,

  /* ========== 静态配置补丁（可选，默认关） ========== */
  // 打开后会尝试把 biz_static_config 里「福利/金币」相关开关置 false，
  // 只处理布尔/数字值，遇到字符串/对象不动。不确定就保持 false。
  // 注意：这里刻意不含 short_series / playlet / video_tab，避免把「短剧」关掉。
  CONFIG_PATCH: false,
  CONFIG_PATCH_RE: /(welfare_tab|gold_tab|ug_tab|show_ug)/i,

  /* ========== 数组被清空时的保护 ========== */
  // true：如果某个列表被删空，则保留原样（防止页面空白/崩溃）
  KEEP_WHEN_EMPTY: true
};

/* ------------------------- 基础工具 ------------------------- */

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isArr = v => Array.isArray(v);

function log() {
  if (!CONFIG.DEBUG) return;
  const args = Array.prototype.slice.call(arguments);
  console.log("[番茄净化] " + args.join(" "));
}

// 把一个对象里所有短字符串拼起来，用于关键字命中
function textOf(node, depth) {
  depth = depth || 0;
  if (depth > 4) return "";
  if (typeof node === "string") return node.length <= 300 ? node : "";
  if (typeof node === "number" || typeof node === "boolean") return "";
  const parts = [];
  if (isArr(node)) {
    for (let i = 0; i < node.length && i < 60; i++) parts.push(textOf(node[i], depth + 1));
    return parts.join("|");
  }
  if (isObj(node)) {
    for (const k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      const v = node[k];
      if (typeof v === "string") {
        if (v.length <= 300) parts.push(v);
      } else if (v && typeof v === "object") {
        parts.push(textOf(v, depth + 1));
      }
    }
    return parts.join("|");
  }
  return "";
}

function hit(text, words) {
  if (!text) return false;
  const t = text.toLowerCase();
  for (let i = 0; i < words.length; i++) {
    if (t.indexOf(String(words[i]).toLowerCase()) >= 0) return true;
  }
  return false;
}

/* ------------------------- 判定逻辑 ------------------------- */

// 明显是广告卡片
function isAdCard(o) {
  if (!isObj(o)) return false;
  const flagKeys = ["is_ad", "isAd", "ad_flag", "adFlag", "is_ad_card"];
  for (let i = 0; i < flagKeys.length; i++) {
    const v = o[flagKeys[i]];
    if (v === 1 || v === true || v === "1" || v === "true") return true;
  }
  if (isObj(o.ad_info) || isObj(o.ad_data)) return true;
  if (o.ad_rit != null) return true;
  if (o.ad_type != null && (o.ad_id != null || o.ad_rit != null)) return true;
  return false;
}

// 长得像 tab（有 tab 系列字段）
function looksLikeTab(o) {
  if (!isObj(o)) return false;
  return (
    o.tab_name != null || o.tab_title != null || o.tab_id != null ||
    o.tab_type != null || o.tab_icon != null || o.tab_index != null
  );
}

// 长得像「卡片 / 模块 / 入口」
function looksLikeCell(o) {
  if (!isObj(o)) return false;
  const keys = [
    "cell_name", "cell_type", "cell_data", "my_tab_cell_name", "my_tab_cell_type",
    "my_tab_sub_cell", "card_name", "card_type", "module_name", "module_type",
    "schema", "jump_schema", "jump_url", "action_schema", "title", "name"
  ];
  for (let i = 0; i < keys.length; i++) {
    if (o[keys[i]] != null) return true;
  }
  return false;
}

function nameText(o) {
  return textOf(o, 0);
}

// 该数组元素是否应该删除
function shouldDropItem(item, ctx) {
  if (!isObj(item)) return false;

  // 1) 明确的广告卡片：除阅读页外的场景一律删
  if (ctx !== "reader" && isAdCard(item)) {
    log("删广告卡片", nameText(item).slice(0, 60));
    return true;
  }

  const text = nameText(item);

  // 2) tab
  if (ctx === "tab" || (ctx !== "reader" && looksLikeTab(item))) {
    if (CONFIG.TAB_CLEAN !== true) return false;
    if (hit(text, CONFIG.TAB_KEEP)) return false;
    if (hit(text, CONFIG.TAB_DROP)) {
      log("删 tab", text.slice(0, 40));
      return true;
    }
    return false;
  }

  // 3) 我的页面卡片
  if (ctx === "mine") {
    if (!CONFIG.MINE_CLEAN) return false;
    if (!looksLikeCell(item)) return false;
    if (hit(text, CONFIG.MINE_KEEP)) return false;
    if (hit(text, CONFIG.MINE_DROP)) {
      log("删我的卡片", text.slice(0, 40));
      return true;
    }
    return false;
  }

  // 4) 书城模块 / 分类
  if (ctx === "store") {
    if (!CONFIG.STORE_CLEAN) return false;
    if (!looksLikeCell(item)) return false;
    if (hit(text, CONFIG.STORE_DROP)) {
      log("删书城模块", text.slice(0, 40));
      return true;
    }
    return false;
  }

  // 5) 书架
  if (ctx === "shelf") {
    if (!CONFIG.SHELF_CLEAN) return false;
    if (!looksLikeCell(item)) return false;
    if (hit(text, CONFIG.SHELF_DROP)) {
      log("删书架模块", text.slice(0, 40));
      return true;
    }
    return false;
  }

  // 6) 阅读页：只认明确的广告标记，绝不按文字删
  if (ctx === "reader") {
    if (!CONFIG.READER_CLEAN) return false;
    if (isAdCard(item)) {
      log("删阅读页广告段");
      return true;
    }
    return false;
  }

  return false;
}

// 该对象的 key 是否应该整块删除（只删广告专属字段）
function shouldDropKey(key, value, ctx) {
  if (!CONFIG.GENERIC_AD_CLEAN) return false;
  if (ctx === "reader") {
    // 阅读页只在值是对象/数组时删，避免误删正文数字
    if (!(isObj(value) || isArr(value))) return false;
  }
  if (CONFIG.AD_KEY_RE.test(key)) {
    log("删广告字段", key);
    return true;
  }
  return false;
}

/* ------------------------- 递归清理 ------------------------- */

function cleanNode(node, ctx) {
  if (isArr(node)) {
    const out = [];
    for (let i = 0; i < node.length; i++) {
      const item = node[i];
      if (shouldDropItem(item, ctx)) continue;
      out.push(cleanNode(item, ctx));
    }
    if (CONFIG.KEEP_WHEN_EMPTY && out.length === 0 && node.length > 0 && ctx !== "activity") {
      log("列表被删空，保留原样", ctx);
      return node;
    }
    return out;
  }
  if (isObj(node)) {
    for (const k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      const v = node[k];
      if (shouldDropKey(k, v, ctx)) {
        delete node[k];
        continue;
      }
      node[k] = cleanNode(v, ctx);
    }
    return node;
  }
  return node;
}

/* ------------------------- 各接口处理 ------------------------- */

function ctxOf(url) {
  if (/\/bookapi\/my_tab\/plan\//.test(url)) return "mine";
  if (/\/bookapi\/plan\//.test(url)) return "store";
  if (/\/bookapi\/new_category\/front\//.test(url)) return "tab";
  if (/\/bookapi\/search\/tab\//.test(url)) return "tab";
  if (/\/bookshelf\/(recommend|video\/info)\//.test(url)) return "shelf";
  if (/\/activity\/list\//.test(url)) return "activity";
  if (/\/(reader|content)\//.test(url)) return "reader";
  return "generic";
}

// 活动中心：直接清空
function cleanActivity(obj) {
  const holders = [obj, obj && obj.data, obj && obj.data && obj.data.data];
  let changed = false;
  holders.forEach(h => {
    if (!isObj(h)) return;
    ["activity_list", "activities", "list", "items", "cells", "banners"].forEach(k => {
      if (isArr(h[k]) && h[k].length) {
        h[k] = [];
        changed = true;
      }
    });
  });
  return changed;
}

// 我的页面计划：优先处理已知的 cell 列表字段
function cleanMinePlan(obj) {
  let changed = false;
  const visit = node => {
    if (isArr(node)) {
      const before = node.length;
      const out = [];
      for (let i = 0; i < node.length; i++) {
        if (shouldDropItem(node[i], "mine")) continue;
        visit(node[i]);
        out.push(node[i]);
      }
      if (CONFIG.KEEP_WHEN_EMPTY && out.length === 0 && before > 0) {
        return; // 不动
      }
      if (out.length !== before) {
        changed = true;
        node.length = 0;
        for (let i = 0; i < out.length; i++) node.push(out[i]);
      }
      return;
    }
    if (isObj(node)) {
      for (const k in node) {
        if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
        if (shouldDropKey(k, node[k], "mine")) {
          delete node[k];
          changed = true;
          continue;
        }
        visit(node[k]);
      }
    }
  };
  visit(obj);
  return changed;
}

function cleanConfig(obj) {
  if (!CONFIG.CONFIG_PATCH) return false;
  let changed = false;
  const visit = node => {
    if (isArr(node)) {
      node.forEach(visit);
      return;
    }
    if (!isObj(node)) return;
    for (const k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      const v = node[k];
      if ((typeof v === "boolean" || typeof v === "number") && CONFIG.CONFIG_PATCH_RE.test(k)) {
        if (v !== false && v !== 0) {
          node[k] = typeof v === "boolean" ? false : 0;
          changed = true;
          log("配置置零", k);
        }
      } else if (v && typeof v === "object") {
        visit(v);
      }
    }
  };
  visit(obj);
  return changed;
}

/* --------------- 听书解限：剩余时长改大 + 解锁标记复位 --------------- */

function patchListen(node) {
  if (!CONFIG.LISTEN_PATCH_TIME) return false;
  let changed = false;
  const visit = n => {
    if (isArr(n)) {
      for (let i = 0; i < n.length; i++) visit(n[i]);
      return;
    }
    if (!isObj(n)) return;
    for (const k in n) {
      if (!Object.prototype.hasOwnProperty.call(n, k)) continue;
      const v = n[k];
      if (typeof v === "number" && CONFIG.LISTEN_TIME_KEYS.test(k)) {
        if (v < CONFIG.LISTEN_BIG) {
          n[k] = CONFIG.LISTEN_BIG;
          changed = true;
          log("听书时长置大", k, v);
        }
        continue;
      }
      if (typeof v === "boolean") {
        if (CONFIG.LISTEN_FALSE_KEYS.indexOf(k) >= 0 && v === true) {
          n[k] = false;
          changed = true;
          log("听书标记复位", k);
        } else if (CONFIG.LISTEN_TRUE_KEYS.indexOf(k) >= 0 && v === false) {
          n[k] = true;
          changed = true;
          log("听书标记复位", k);
        }
        continue;
      }
      if (v && typeof v === "object") visit(v);
    }
  };
  visit(node);
  return changed;
}

/* ------------------------- 入口 ------------------------- */

(function main() {
  if (!CONFIG.ENABLE) {
    $done({});
    return;
  }

  const url = (typeof $request !== "undefined" && $request && $request.url) || "";
  const body = (typeof $response !== "undefined" && $response && $response.body) || "";
  if (typeof body !== "string" || body.length < 2) {
    $done({});
    return;
  }

  // 只处理 JSON，其它（HTML/二进制/图片）原样放过，绝不破坏
  let obj;
  try {
    obj = JSON.parse(body);
  } catch (e) {
    $done({});
    return;
  }
  if (!isObj(obj) && !isArr(obj)) {
    $done({});
    return;
  }

  const ctx = ctxOf(url);
  let changed = false;
  try {
    // 听书解限：任何接口只要带了听书时长字段就顺手改掉
    changed = patchListen(obj);

    if (ctx === "activity") {
      changed = cleanActivity(obj) || changed;
    } else if (ctx === "mine") {
      changed = cleanMinePlan(obj) || changed;
    } else if (ctx === "store" || ctx === "tab" || ctx === "shelf") {
      const before = JSON.stringify(obj);
      cleanNode(obj, ctx === "tab" ? "tab" : ctx);
      changed = changed || before !== JSON.stringify(obj);
    } else if (ctx === "reader") {
      const before = JSON.stringify(obj);
      cleanNode(obj, "reader");
      changed = changed || before !== JSON.stringify(obj);
    } else {
      // generic：只删广告字段和广告卡片
      const before = JSON.stringify(obj);
      cleanNode(obj, "generic");
      // 静态配置里可选的开关补丁（默认关）
      if (/\/biz_static_config\//.test(url) && cleanConfig(obj)) {
        changed = true;
      }
      changed = changed || before !== JSON.stringify(obj);
    }

    // data 是「二次编码的 JSON 字符串」的情况
    if (isObj(obj) && typeof obj.data === "string" && obj.data.length > 2 &&
        obj.data.charAt(0) === "{") {
      try {
        const inner = JSON.parse(obj.data);
        const before = JSON.stringify(inner);
        patchListen(inner);
        cleanNode(inner, ctx === "mine" ? "mine" : ctx);
        if (JSON.stringify(inner) !== before) {
          obj.data = JSON.stringify(inner);
          changed = true;
        }
      } catch (e2) {}
    }
  } catch (e) {
    log("异常，原样返回：" + e);
    $done({});
    return;
  }

  log(url.slice(0, 120), "->", ctx, changed ? "已净化" : "无改动");
  if (changed) $done({ body: JSON.stringify(obj) });
  else $done({});
})();
