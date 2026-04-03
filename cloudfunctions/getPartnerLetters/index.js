// 云函数：获取对方的信件
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

    const now = new Date()

    // 获取已解锁的信件
    const lettersRes = await db.collection('letters').where({
      _openid: user.partnerOpenid,
      unlockAt: _.lte(now)
    }).orderBy('createdAt', 'desc').get()

    // 检查是否有待解锁的信件
    const pendingRes = await db.collection('letters').where({
      _openid: user.partnerOpenid,
      unlockAt: _.gt(now)
    }).orderBy('unlockAt', 'asc').get()

    const hasPending = pendingRes.data.length > 0
    const pendingCount = pendingRes.data.length
    const nextUnlockTime = hasPending ? pendingRes.data[0].unlockAt : null

    return {
      code: 0,
      data: {
        letters: lettersRes.data,
        hasPending,
        pendingCount,
        nextUnlockTime
      }
    }
  } catch (err) {
    console.error('获取信件失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
