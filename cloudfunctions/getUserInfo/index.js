// 云函数：获取用户信息
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

    // 获取配对信息
    let partnerInfo = null
    let pendingInvite = null

    if (user.isPaired && user.partnerOpenid) {
      const partnerRes = await db.collection('users').where({
        _openid: user.partnerOpenid
      }).get()
      
      if (partnerRes.data.length > 0) {
        partnerInfo = {
          nickName: partnerRes.data[0].nickName,
          avatarUrl: partnerRes.data[0].avatarUrl
        }
      }
    } else {
      // 检查是否有待处理的邀请
      const inviteRes = await db.collection('invites').where({
        inviterOpenid: openid,
        status: 'pending',
        expiresAt: _.gt(new Date())
      }).get()

      if (inviteRes.data.length > 0) {
        pendingInvite = {
          code: inviteRes.data[0].code,
          expiresAt: inviteRes.data[0].expiresAt
        }
      }
    }

    return {
      code: 0,
      data: {
        openid,
        isPaired: user.isPaired,
        partnerInfo,
        pendingInvite,
        unlockTime: user.unlockTime || '22:00',
        subscribed: user.subscribed === true,
        userInfo: {
          nickName: user.nickName,
          avatarUrl: user.avatarUrl
        }
      }
    }
  } catch (err) {
    console.error('获取用户信息失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
