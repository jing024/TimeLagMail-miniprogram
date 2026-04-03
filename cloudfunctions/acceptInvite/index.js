// 云函数：接受邀请
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { code } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (!code || code.length !== 6) {
    return { code: 1003, message: '邀请码格式错误' }
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

    if (user.isPaired) {
      return { code: 1002, message: '您已配对' }
    }

    // 查找邀请码
    const inviteRes = await db.collection('invites').where({
      code: code.toUpperCase(),
      status: 'pending',
      expiresAt: _.gt(new Date())
    }).get()

    if (inviteRes.data.length === 0) {
      return { code: 1004, message: '邀请码无效或已过期' }
    }

    const invite = inviteRes.data[0]

    // 不能邀请自己
    if (invite.inviterOpenid === openid) {
      return { code: 1005, message: '不能邀请自己' }
    }

    // 检查邀请人是否还存在
    const inviterRes = await db.collection('users').where({
      _openid: invite.inviterOpenid
    }).get()

    if (inviterRes.data.length === 0) {
      return { code: 1004, message: '邀请人不存在' }
    }

    const inviter = inviterRes.data[0]

    // 检查邀请人是否已配对
    if (inviter.isPaired) {
      return { code: 1002, message: '邀请人已有配对' }
    }

    // 建立配对关系（事务）
    const now = new Date()

    // 更新邀请状态
    await db.collection('invites').doc(invite._id).update({
      data: {
        status: 'accepted',
        inviteeOpenid: openid
      }
    })

    // 更新邀请人
    await db.collection('users').doc(inviter._id).update({
      data: {
        isPaired: true,
        partnerOpenid: openid
      }
    })

    // 更新被邀请人
    await db.collection('users').doc(user._id).update({
      data: {
        isPaired: true,
        partnerOpenid: invite.inviterOpenid
      }
    })

    // 发送配对成功订阅消息给邀请人
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: invite.inviterOpenid,
        templateId: 'vSiIKZYWEJBhptvkZF4n6WjBgaXi4HWmj5lMw-b-nus',
        page: 'pages/index/index',
        data: {
          phrase1: { value: '配对成功' },
          name2: { value: user.nickName || '对方' },
          date3: { value: new Date().toLocaleString('zh-CN', { hour12: false }) }
        }
      })
    } catch (e) {
      console.error('发送配对订阅消息失败:', e)
    }

    return {
      code: 0,
      data: {
        partnerInfo: {
          nickName: inviter.nickName,
          avatarUrl: inviter.avatarUrl
        },
        myNickName: user.nickName || ''
      }
    }
  } catch (err) {
    console.error('接受邀请失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
