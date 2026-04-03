// 云函数：获取连续打卡天数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  try {
    const streakRes = await db.collection('streaks').where({
      _openid: openid
    }).get()

    if (streakRes.data.length === 0) {
      return {
        code: 0,
        data: {
          streak: 0,
          maxStreak: 0
        }
      }
    }

    const streak = streakRes.data[0]

    // 检查是否需要重置（昨天没写）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastDate = new Date(streak.lastEntryDate)
    lastDate.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let currentStreak = streak.currentStreak
    if (lastDate.getTime() < yesterday.getTime()) {
      // 断签了
      currentStreak = 0
    }

    return {
      code: 0,
      data: {
        streak: currentStreak,
        maxStreak: streak.maxStreak
      }
    }
  } catch (err) {
    console.error('获取连续天数失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
