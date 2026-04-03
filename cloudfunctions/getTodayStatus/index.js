// 云函数：获取今日写信状态
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const letterRes = await db.collection('letters').where({
      _openid: openid,
      createdAt: _.gte(today).and(_.lt(tomorrow))
    }).get()

    return {
      code: 0,
      data: {
        hasWritten: letterRes.data.length > 0
      }
    }
  } catch (err) {
    console.error('获取今日状态失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
