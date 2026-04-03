// 云函数：检查已解锁信件，发送订阅通知
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const callerOpenid = wxContext.OPENID // 调用方的openid，用于权限校验

  try {
    const now = new Date()

    // 查找已解锁但未发送通知的信件
    const lettersRes = await db.collection('letters')
      .where({
        unlockAt: _.lt(now),
        notified: _.neq(true)
      })
      .limit(10)
      .get()

    let sentCount = 0

    for (const letter of lettersRes.data) {
      const senderOpenid = letter._openid

      // 获取发信人信息
      const senderRes = await db.collection('users').where({
        _openid: senderOpenid
      }).get()

      if (senderRes.data.length === 0) continue

      const sender = senderRes.data[0]
      const recipientOpenid = sender.partnerOpenid

      if (!recipientOpenid) continue

      // 发送订阅消息
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: recipientOpenid,
          templateId: '9hv5zftpWQMAuRn9ugVIGjbQNN-34EshU8cnuJJSPVk',
          page: 'pages/index/index',
          data: {
            phrase1: { value: '来信提醒' },
            name2: { value: sender.nickName || 'Ta' },
            date3: { value: formatTime(letter.unlockAt) }
          }
        })

        // 标记为已通知
        await db.collection('letters').doc(letter._id).update({
          data: { notified: true }
        })

        sentCount++
      } catch (e) {
        console.error(`发送通知失败 letter=${letter._id}:`, e)
      }
    }

    return { code: 0, data: { sentCount } }
  } catch (err) {
    console.error('检查解锁信件失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}

function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}
