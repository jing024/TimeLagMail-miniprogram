# 时差信 - Claude Code 项目规范

> 本文件定义在「时差信」项目下进行开发时的基本规范，每次开发新功能前必须阅读。

---

## 项目概述

**时差信**是一个微信小程序，支持一对一配对用户之间的时间胶囊式信件收发。核心特点：

- 每日限发一封信
- 信件按发送者设定的「送信时间」解锁送达对方
- 支持来信通知订阅
- 一对一双人配对

---

## 技术栈

- **前端**：微信小程序原生开发（WXSS + WXML + JS），无框架，无 TypeScript
- **后端**：微信云开发（云函数 + 云数据库）
- **部署**：微信开发者工具直接部署云函数，`cloudbaserc.json` 管理函数列表

---

## 云函数开发规范

### 新增云函数步骤

1. 在 `cloudfunctions/<函数名>/` 下创建 `index.js` + `package.json`
2. `package.json` 必须包含 `"wx-server-sdk"` 依赖
3. 在 `cloudbaserc.json` 的 `functions` 数组中注册
4. 在微信开发者工具中右键 →「上传并部署（云端安装依赖）」
5. 更新 `TEST_PLAN.md` 中对应的测试用例

### 云函数常见错误

- `package.json` 缺失 → 云函数加载失败，前端报"网络错误"
- `cloudbaserc.json` 未注册 → 函数可本地调用但无法被小程序端调用

---

## 数据库规范

### collections

| 集合名 | 用途 | 关键字段 |
|--------|------|---------|
| `users` | 用户信息 | `_openid`, `isPaired`, `partnerOpenid`, `unlockTime`, `nickName`, `subscribed` |
| `letters` | 信件 | `_openid`(发信人), `content`, `unlockAt`, `isRead`, `createdAt` |
| `invites` | 邀请码 | `inviterOpenid`, `code`, `status`, `expiresAt` |
| `streaks` | 连续写信记录 | `_openid`, `currentStreak`, `maxStreak`, `lastEntryDate` |

### 时区注意

- 服务器时间：UTC
- 用户设置的送信时间：北京时间（UTC+8）
- 写库时用 `setUTCHours(hour - 8, minute, 0, 0)` 将北京时间转为 UTC 存储
- 读时用 `new Date(utcDate).getHours()` 在本地设备（UTC+8）自动还原

---

## 前端规范

### 路径别名

- `miniprogram/` 是项目根目录，资源引用以 `/` 开头
- 静态资源放在 `/assets/` 目录

### 样式规范

- 所有尺寸使用 `rpx`，不使用 `px`
- 全局变量在 `app.wxss` 的 `:root` 中定义
- 颜色变量：`--seal-color`（火漆红）、`--paper-light`（信纸米色）、`--text-primary` / `--text-muted`

### 页面入口

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `pages/index/index` | 常驻视觉入口 |
| 配对 | `pages/pairing/pairing` | 邀请码生成/输入 |
| 书写 | `pages/write/write` | 写信入口 |
| 已收到 | `pages/read/read` | 收信列表 |
| 时光轴 | `pages/timeline/timeline` | 双向时间线 |
| 设置 | `pages/settings/settings` | 用户配置 |

---

## 测试规范

### 每次发版前必须完成全量回归

- 测试计划：`TEST_PLAN.md`
- 覆盖模块：登录 → 配对 → 设置 → 写信 → 收信
- 核心原则：两人各用一台真机交替测试

### 新增功能时的要求

1. 对应更新 `TEST_PLAN.md`，在对应模块下补充新用例
2. 确认不破坏现有功能的测试用例
3. 云函数修改后，验证旧功能不受影响

### 测试环境

- 优先使用真机调试（微信开发者工具 + 手机）
- 云函数在模拟器下行为可能与真机不一致

---

## 版本管理

- 版本号硬编码在 `pages/settings/settings.js` 的 `data.version`
- 发版前在 `settings.wxml` 右侧确认版本号显示正确
- 更新版本号后同步更新 `TEST_PLAN.md` 顶部版本号
