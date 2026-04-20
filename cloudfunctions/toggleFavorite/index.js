// 云函数：切换信件收藏状态
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { letterId } = event

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  if (!letterId) {
    return { code: 1003, message: '缺少信件ID' }
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

    // 获取信件
    const letterRes = await db.collection('letters').doc(letterId).get()
    const letter = letterRes.data

    // 校验：用户是发件人或收件人
    const isAuthor = letter._openid === openid
    const isRecipient = user.isPaired && letter._openid === user.partnerOpenid
    if (!isAuthor && !isRecipient) {
      return { code: 1005, message: '无权操作此信件' }
    }

    const favoritedBy = letter.favoritedBy || []
    const isFavorited = favoritedBy.includes(openid)

    if (isFavorited) {
      // 取消收藏
      await db.collection('letters').doc(letterId).update({
        data: {
          favoritedBy: _.pull(openid)
        }
      })
    } else {
      // 添加收藏
      await db.collection('letters').doc(letterId).update({
        data: {
          favoritedBy: _.addToSet(openid)
        }
      })
    }

    return {
      code: 0,
      data: {
        isFavorited: !isFavorited
      }
    }
  } catch (err) {
    console.error('切换收藏失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
