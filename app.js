// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    isPaired: false,
    partnerInfo: null
  },

  onLaunch() {
    console.log('时差信启动')

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-7gxu9j7m6366db45', // 后续需要替换为实际的云开发环境ID
        traceUser: true
      })
    }


    // 检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      })

      if (result.code === 0) {
        this.globalData.openid = result.data.openid
        this.globalData.isPaired = result.data.isPaired
        this.globalData.partnerInfo = result.data.partnerInfo

        // 检查并发送待解锁信件的订阅通知
        this.checkAndNotify()

        // 已配对用户静默请求订阅授权，积累通知配额
        if (result.data.isPaired) {
          this.requestSubscribeOnce()
        }

        // 通知页面更新
        if (this.userInfoReadyCallback) {
          this.userInfoReadyCallback(result.data)
        }
      }
    } catch (err) {
      console.log('未登录或登录已过期')
    }
  },

  // 静默请求订阅消息授权，累积发送配额
  // 用户勾选"总是允许"后，后续调用不弹窗，自动累积配额
  requestSubscribeOnce() {
    const tmplId = '9hv5zftpWQMAuRn9ugVIGjbQNN-34EshU8cnuJJSPVk'
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: async (res) => {
        if (res[tmplId] === 'accept') {
          // 确保数据库中订阅状态为 true
          try {
            await wx.cloud.callFunction({
              name: 'updateNotifySubscribe',
              data: { subscribed: true }
            })
          } catch (e) {
            console.error('更新订阅状态失败:', e)
          }
        }
      },
      fail: () => {
        // 静默失败，不影响用户操作
      }
    })
  },

  // 检查并发送来信通知（每次打开小程序时触发）
  async checkAndNotify() {
    try {
      await wx.cloud.callFunction({
        name: 'notifyLetterUnlocked'
      })
    } catch (err) {
      console.error('检查来信通知失败:', err)
    }
  },

  // 微信登录
  async wxLogin(userInfo) {
    try {
      // 获取微信登录凭证
      const { code } = await wx.login()
      
      // 调用云函数完成登录
      const { result } = await wx.cloud.callFunction({
        name: 'login',
        data: { code, userInfo }
      })

      if (result.code === 0) {
        this.globalData.openid = result.data.openid
        this.globalData.isPaired = result.data.isPaired
        this.globalData.partnerInfo = result.data.partnerInfo
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (err) {
      console.error('登录失败:', err)
      throw err
    }
  }
})
