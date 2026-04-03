// 云函数：创建邀请码
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 生成6位邀请码（排除易混淆字符）
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除 0, O, I, L, 1
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 1001, message: '未登录' }
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

    // 检查是否已有有效邀请码
    const existingInvite = await db.collection('invites').where({
      inviterOpenid: openid,
      status: 'pending',
      expiresAt: _.gt(new Date())
    }).get()

    if (existingInvite.data.length > 0) {
      return {
        code: 0,
        data: {
          code: existingInvite.data[0].code,
          expiresAt: existingInvite.data[0].expiresAt
        }
      }
    }

    // 生成新邀请码（确保唯一）
    let code
    let isUnique = false
    let attempts = 0

    while (!isUnique && attempts < 10) {
      code = generateCode()
      const checkRes = await db.collection('invites').where({ code }).get()
      if (checkRes.data.length === 0) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return { code: 5000, message: '生成邀请码失败，请重试' }
    }

    // 创建邀请记录（7天后过期）
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    await db.collection('invites').add({
      data: {
        code,
        inviterOpenid: openid,
        inviteeOpenid: null,
        status: 'pending',
        createdAt: now,
        expiresAt
      }
    })

    return {
      code: 0,
      data: {
        code,
        expiresAt
      }
    }
  } catch (err) {
    console.error('创建邀请码失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
