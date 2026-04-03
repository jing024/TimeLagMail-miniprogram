// 云函数：检查已解锁信件，发送订阅通知
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const callerOpenid = wxContext.OPENID // 调用方的 openid，即收信人

  if (!callerOpenid) {
    return { code: 1001, message: '未登录' }
  }

  try {
    const now = new Date()

    // 获取当前用户（收信人）信息，检查是否开启了订阅
    const callerRes = await db.collection('users').where({
      _openid: callerOpenid
    }).get()

    if (callerRes.data.length === 0) {
      return { code: 1001, message: '用户不存在' }
    }

    const caller = callerRes.data[0]

    // 没有配对或未开启订阅，直接跳过
    if (!caller.isPaired || !caller.subscribed) {
      return { code: 0, data: { sentCount: 0, reason: 'not_subscribed' } }
    }

    // 查找发件人是 partnerOpenid 的信件（partner 发给当前用户的信）
    // 且已解锁但未发送通知
    const lettersRes = await db.collection('letters')
      .where({
        _openid: caller.partnerOpenid, // partner 是发信人
        unlockAt: _.lt(now),
        notified: _.neq(true)
      })
      .limit(10)
      .get()

    let sentCount = 0

    for (const letter of lettersRes.data) {
      // 获取发信人（partner）信息，用于通知里的昵称
      const senderRes = await db.collection('users').where({
        _openid: caller.partnerOpenid
      }).get()

      const sender = senderRes.data[0]
      const senderNickName = sender?.nickName || 'Ta'

      // 发送订阅消息给当前用户（收信人）
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: callerOpenid,
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
  // 转为北京时间展示
  const localHour = (d.getUTCHours() + 8) % 24
  const localMin = d.getUTCMinutes()
  return `${month}月${day}日 ${localHour.toString().padStart(2, '0')}:${localMin.toString().padStart(2, '0')}`
}
