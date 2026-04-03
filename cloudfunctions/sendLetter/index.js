// 云函数：发送信件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { content } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (!content || content.trim().length === 0) {
    return { code: 1003, message: '内容不能为空' }
  }

  if (content.length > 2000) {
    return { code: 1003, message: '内容不能超过2000字' }
  }

  try {
    // 检查用户是否已配对
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { code: 1001, message: '用户不存在' }
    }

    const user = userRes.data[0]

    if (!user.isPaired) {
      return { code: 1002, message: '请先完成配对' }
    }

    // 检查今天是否已写信
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayLetter = await db.collection('letters').where({
      _openid: openid,
      createdAt: _.gte(today).and(_.lt(tomorrow))
    }).get()

    if (todayLetter.data.length > 0) {
      return { code: 1003, message: '今天已经写过信了' }
    }

    // 获取用户设置的解锁时间
    const unlockTimeStr = user.unlockTime || '22:00'
    
    // 获取当前时间（服务器UTC时间）
    const now = new Date()

    // 解析用户设置的送信时间（北京时区，UTC+8）
    const [unlockHour, unlockMinute] = unlockTimeStr.split(':').map(Number)

    // 计算次日解锁日期
    const unlockDate = new Date(now)
    unlockDate.setDate(unlockDate.getDate() + 1)
    // 用户输入的是北京时间（UTC+8），服务器是UTC
    // 需要用 UTC 方法写入，并减去8小时偏移量
    unlockDate.setUTCHours(unlockHour - 8, unlockMinute, 0, 0)

    const unlockAt = unlockDate

    // 创建信件 - 直接存储 Date 对象，数据库会自动处理
    const letterRes = await db.collection('letters').add({
      data: {
        _openid: openid,
        content: content.trim(),
        unlockAt: unlockAt,
        isRead: false,
        createdAt: now
      }
    })

    // 更新连续打卡
    await updateStreak(openid)

    return {
      code: 0,
      data: {
        letterId: letterRes._id,
        unlockAt
      }
    }
  } catch (err) {
    console.error('发送信件失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}

// 更新连续打卡
async function updateStreak(openid) {
  const db = cloud.database()
  const _ = db.command
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const streakRes = await db.collection('streaks').where({
    _openid: openid
  }).get()

  if (streakRes.data.length === 0) {
    // 新建记录
    await db.collection('streaks').add({
      data: {
        _openid: openid,
        currentStreak: 1,
        maxStreak: 1,
        lastEntryDate: today
      }
    })
  } else {
    const streak = streakRes.data[0]
    const lastDate = new Date(streak.lastEntryDate)
    lastDate.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let newStreak = 1
    if (lastDate.getTime() === yesterday.getTime()) {
      // 昨天写了，连续+1
      newStreak = streak.currentStreak + 1
    } else if (lastDate.getTime() === today.getTime()) {
      // 今天已经写过了，不更新
      return
    }

    const newMaxStreak = Math.max(streak.maxStreak, newStreak)

    await db.collection('streaks').doc(streak._id).update({
      data: {
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        lastEntryDate: today
      }
    })
  }
}
