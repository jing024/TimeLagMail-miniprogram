// 云函数：更新来信通知订阅状态
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { subscribed } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (typeof subscribed !== 'boolean') {
    return { code: 1003, message: '参数错误' }
  }

  try {
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { code: 1001, message: '用户不存在' }
    }

    await db.collection('users').doc(userRes.data[0]._id).update({
      data: {
        subscribed
      }
    })

    return {
      code: 0,
      data: { subscribed }
    }
  } catch (err) {
    console.error('更新订阅状态失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
