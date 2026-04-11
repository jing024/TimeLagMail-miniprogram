// 云函数：定时扫描所有已解锁信件，向收信人发送订阅通知
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const now = new Date()

  try {
    // 查找所有已解锁但未通知的信件
    const lettersRes = await db.collection('letters')
      .where({
        unlockAt: _.lt(now),
        notified: _.neq(true)
      })
      .limit(50)
      .get()

    if (lettersRes.data.length === 0) {
      return { code: 0, data: { sentCount: 0, reason: 'no_pending_letters' } }
    }

    let sentCount = 0
    let failCount = 0

    // 按收信人分组处理（收信人 = 发信人的 partner）
    for (const letter of lettersRes.data) {
      try {
        const senderOpenid = letter._openid

        // 查找发信人信息，获取其 partner（即收信人）
        const senderRes = await db.collection('users').where({
          _openid: senderOpenid
        }).get()

        if (senderRes.data.length === 0) continue

        const sender = senderRes.data[0]
        const receiverOpenid = sender.partnerOpenid

        if (!receiverOpenid) continue

        // 查找收信人信息，检查是否开启了订阅
        const receiverRes = await db.collection('users').where({
          _openid: receiverOpenid
        }).get()

        if (receiverRes.data.length === 0) continue

        const receiver = receiverRes.data[0]

        if (!receiver.subscribed) {
          // 未订阅，仅标记为已通知（避免反复查询）
          await db.collection('letters').doc(letter._id).update({
             data: { notified: true }
          })
          continue
        }

        const senderNickName = sender.nickName || 'Ta'

        // 发送订阅消息给收信人
        await cloud.openapi.subscribeMessage.send({
          touser: receiverOpenid,
          templateId: '9hv5zftpWQMAuRn9ugVIGjbQNN-34EshU8cnuJJSPVk',
          page: 'pages/read/read',
          data: {
            phrase1: { value: '来信提醒' },
            name2: { value: senderNickName },
            date3: { value: formatTime(letter.unlockAt) }
          }
        })

        // 标记为已通知
        await db.collection('letters').doc(letter._id).update({
          data: { notified: true }
        })

        sentCount++
      } catch (e) {
        console.error(`通知失败 letter=${letter._id}:`, e)
        // 如果是配额耗尽（43101），也标记为已通知避免反复重试
        if (e.errCode === 43101) {
          await db.collection('letters').doc(letter._id).update({
            data: { notified: true }
          })
        }
        failCount++
      }
    }

    return { code: 0, data: { sentCount, failCount, total: lettersRes.data.length } }
  } catch (err) {
    console.error('定时通知任务失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}

function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const localHour = (d.getUTCHours() + 8) % 24
  const localMin = d.getUTCMinutes()
  return `${month}月${day}日 ${localHour.toString().padStart(2, '0')}:${localMin.toString().padStart(2, '0')}`
}
