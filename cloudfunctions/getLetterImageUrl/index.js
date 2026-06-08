// 云函数：校验信件访问权限并返回附图临时地址
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
    const letterRes = await db.collection('letters').doc(letterId).get()
    const letter = letterRes.data

    if (!letter) {
      return { code: 1004, message: '信件不存在' }
    }

    if (!letter.imageFileID) {
      return { code: 0, data: { imageUrl: '' } }
    }

    const canView = await canViewLetterImage(openid, letter)
    if (!canView) {
      return { code: 1002, message: '无权查看' }
    }

    const tempRes = await cloud.getTempFileURL({
      fileList: [letter.imageFileID]
    })

    const file = tempRes.fileList && tempRes.fileList[0]
    if (!file || file.status !== 0 || !file.tempFileURL) {
      return { code: 5000, message: '图片地址获取失败' }
    }

    return {
      code: 0,
      data: {
        imageUrl: file.tempFileURL
      }
    }
  } catch (err) {
    console.error('获取信件附图失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}

async function canViewLetterImage(openid, letter) {
  if (letter._openid === openid) {
    return true
  }

  const now = new Date()
  if (new Date(letter.unlockAt) > now) {
    return false
  }

  const userRes = await db.collection('users').where({
    _openid: openid
  }).get()

  if (userRes.data.length === 0) {
    return false
  }

  const user = userRes.data[0]
  return user.isPaired === true && user.partnerOpenid === letter._openid
}
