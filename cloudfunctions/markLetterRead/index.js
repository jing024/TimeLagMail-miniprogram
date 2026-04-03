// 云函数：标记信件已读
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { letterId } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (!letterId) {
    return { code: 1003, message: '参数错误' }
  }

  try {
    // 获取用户信息
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

    // 获取信件
    const letterRes = await db.collection('letters').doc(letterId).get()

    if (!letterRes.data) {
      return { code: 1004, message: '信件不存在' }
    }

    const letter = letterRes.data

    // 验证是否是对方发来的信
    if (letter._openid !== user.partnerOpenid) {
      return { code: 1005, message: '无权限' }
    }

    // 更新已读状态
    await db.collection('letters').doc(letterId).update({
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return {
      code: 0,
      data: { success: true }
    }
  } catch (err) {
    console.error('标记已读失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
