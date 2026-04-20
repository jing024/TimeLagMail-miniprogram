# 时差信

> 从前的日色变得慢，车马邮件都慢，一生只够爱一个人。

一个时间胶囊式的微信小程序，专为两个人设计。每天写一封信，设定送达天数，信件会在指定时间悄然抵达对方手中。

## 功能

- **每日一封** — 每天只能写一封信，让书写变得珍贵
- **延时送达** — 选择 1-10 天的送信时间，信件按设定的时间解锁
- **一对一配对** — 通过邀请码建立两人专属连接
- **时光轴** — 双向时间线记录所有往来信件
- **共同回忆** — 基于信件内容生成词云
- **信件收藏** — 收藏喜欢的信件，金色书签标记
- **来信通知** — 信件送达时推送微信通知
- **连续通信** — 记录连续写信天数

## 技术栈

- 微信小程序原生开发（WXML + WXSS + JS）
- 微信云开发（云函数 + 云数据库）

## 项目结构

```
├── pages/
│   ├── index/           # 首页
│   ├── pairing/         # 配对（邀请码）
│   ├── write/           # 写信
│   ├── read/            # 收信列表
│   ├── my-letters/      # 寄信列表
│   ├── timeline/        # 时光轴 + 词云
│   ├── letter-detail/   # 信件详情
│   └── settings/        # 设置
├── cloudfunctions/
│   ├── login/           # 登录
│   ├── getUserInfo/     # 用户信息
│   ├── createInvite/    # 生成邀请码
│   ├── acceptInvite/    # 接受配对
│   ├── sendLetter/      # 发信
│   ├── getPartnerLetters/ # 收信查询
│   ├── getTimeline/     # 时光轴查询
│   ├── markLetterRead/  # 标记已读
│   ├── toggleFavorite/  # 收藏切换
│   ├── getTodayStatus/  # 今日写信状态
│   ├── getStreak/       # 连续天数
│   ├── getWordCloud/    # 词云生成
│   ├── notifyAllUnlocked/ # 定时通知（cron）
│   ├── notifyLetterUnlocked/ # 来信通知
│   ├── updateNotifySubscribe/ # 通知订阅
│   ├── updateUnlockTime/ # 送信时间设置
│   ├── updateUserProfile/ # 昵称更新
│   └── sendPairingNotification/ # 配对通知
├── assets/              # 静态资源
├── app.js / app.json / app.wxss
├── CLAUDE.md            # 开发规范
├── DEPLOY_GUIDE.md      # 部署指南
├── TEST_PLAN.md         # 测试计划
└── CHANGELOG.md         # 更新日志
```

## 数据库集合

| 集合 | 用途 |
|------|------|
| `users` | 用户信息、配对关系、通知设置 |
| `letters` | 信件内容、解锁时间、已读/收藏状态 |
| `invites` | 邀请码 |
| `streaks` | 连续写信记录 |
| `word_clouds` | 词云缓存 |

## 开发

1. 在[微信公众平台](https://mp.weixin.qq.com/)注册小程序账号
2. 开通云开发，创建上述数据库集合
3. 用微信开发者工具导入项目
4. 逐个部署 `cloudfunctions/` 下的云函数（右键 → 创建并部署：云端安装依赖）
5. 详见 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

## 协议

仅供个人使用。
