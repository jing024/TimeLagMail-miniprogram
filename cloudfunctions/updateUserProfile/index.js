// 云函数：更新用户资料（昵称、头像）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { nickName, avatarUrl } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (nickName !== undefined && (typeof nickName !== 'string' || nickName.length > 20)) {
    return { code: 1003, message: '昵称格式错误' }
  }

  try {
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { code: 1001, message: '用户不存在' }
    }

    const updateData = {}
    if (nickName !== undefined) updateData.nickName = nickName.trim()
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

    await db.collection('users').doc(userRes.data[0]._id).update({
      data: updateData
    })

    return {
      code: 0,
      data: { nickName: nickName?.trim(), avatarUrl }
    }
  } catch (err) {
    console.error('更新用户资料失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
