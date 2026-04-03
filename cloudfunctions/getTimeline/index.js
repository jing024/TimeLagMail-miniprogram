// 云函数：获取时光轴
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

    if (!user.isPaired) {
      return { code: 1002, message: '请先完成配对' }
    }

    const now = new Date()

    // 获取我的信件
    const myLettersRes = await db.collection('letters').where({
      _openid: openid
    }).orderBy('createdAt', 'desc').get()

    // 获取对方的信件（只返回已解锁的）
    const partnerLettersRes = await db.collection('letters').where({
      _openid: user.partnerOpenid,
      unlockAt: _.lte(now)
    }).orderBy('createdAt', 'desc').get()

    // 获取 partner 昵称（用于时间轴显示）
    let partnerNickName = 'TA'
    if (user.partnerOpenid) {
      const partnerUserRes = await db.collection('users').where({
        _openid: user.partnerOpenid
      }).get()
      if (partnerUserRes.data.length > 0 && partnerUserRes.data[0].nickName) {
        partnerNickName = partnerUserRes.data[0].nickName
      }
    }

    // 合并并标记
    const myLetters = myLettersRes.data.map(l => ({
      ...l,
      isMine: true
    }))

    const partnerLetters = partnerLettersRes.data.map(l => ({
      ...l,
      isMine: false,
      authorNickName: partnerNickName
    }))

    const allLetters = [...myLetters, ...partnerLetters].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return {
      code: 0,
      data: {
        letters: allLetters,
        myNickName: user.nickName || '我'
      }
    }
  } catch (err) {
    console.error('获取时光轴失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
