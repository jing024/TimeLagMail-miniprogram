// 云函数：发送配对成功订阅消息
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { openid, partnerName } = event

  if (!openid) {
    return { code: 1001, message: '缺少openid' }
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: 'vSiIKZYWEJBhptvkZF4n6WjBgaXi4HWmj5lMw-b-nus',
      page: 'pages/index/index',
      data: {
        phrase1: { value: '配对成功' },
        name2: { value: partnerName || '对方' },
        date3: { value: new Date().toLocaleString('zh-CN', { hour12: false }) }
      }
    })

    return { code: 0, data: result }
  } catch (err) {
    console.error('发送订阅消息失败:', err)
    return { code: 5000, message: '发送失败' }
  }
}
