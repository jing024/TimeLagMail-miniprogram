// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = cloud.database().command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  try {
    // 检查用户是否存在
    let userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    let user = userRes.data[0]
    let isNewUser = false

    // 新用户，创建记录
    if (!user) {
      isNewUser = true
      const now = new Date()
      await db.collection('users').add({
        data: {
          _openid: openid,
          createdAt: now,
          lastLoginAt: now,
          isPaired: false,
          partnerOpenid: null,
          nickName: event.userInfo?.nickName || '',
          avatarUrl: event.userInfo?.avatarUrl || ''
        }
      })
      
      user = {
        _openid: openid,
        isPaired: false,
        partnerOpenid: null
      }
    } else {
      // 只更新最后登录时间，昵称和头像不自动同步（避免覆盖用户手动设置的昵称）
      await db.collection('users').doc(user._id).update({
        data: {
          lastLoginAt: new Date()
        }
      })
    }

    // 获取配对信息
    let partnerInfo = null
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
    }

    return {
      code: 0,
      data: {
        openid,
        isNewUser,
        isPaired: user.isPaired,
        partnerInfo
      }
    }
  } catch (err) {
    console.error('登录失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
