// 云函数：更新送信时间
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { unlockTime } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (!unlockTime || !/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(unlockTime)) {
    return { code: 1003, message: '时间格式错误' }
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

    // 更新用户的解锁时间
    await db.collection('users').doc(user._id).update({
      data: {
        unlockTime: unlockTime
      }
    })

    // 同时更新配对对象的解锁时间（保持一致）
    const partnerRes = await db.collection('users').where({
      _openid: user.partnerOpenid
    }).get()

    if (partnerRes.data.length > 0) {
      await db.collection('users').doc(partnerRes.data[0]._id).update({
        data: {
          unlockTime: unlockTime
        }
      })
    }

    return {
      code: 0,
      data: { unlockTime }
    }
  } catch (err) {
    console.error('更新送信时间失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
