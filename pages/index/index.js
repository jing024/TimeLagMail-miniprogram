// pages/index/index.js - 重新设计的首页逻辑
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    isPaired: false,
    userInfo: {},
    partnerInfo: null,
    hasWrittenToday: false,
    sentCount: 0,
    receivedCount: 0,
    unreadCount: 0
  },

  onLoad() {
    this.checkStatus()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.checkStatus()
      this.loadStats()
    }
  },

  // 检查登录和配对状态
  async checkStatus() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      })

      if (result.code === 0) {
        const { openid, isPaired, partnerInfo, userInfo } = result.data
        
        this.setData({
          isLoggedIn: true,
          isPaired,
          partnerInfo,
          userInfo: userInfo || {}
        })

        app.globalData.openid = openid
        app.globalData.isPaired = isPaired
        app.globalData.partnerInfo = partnerInfo

        if (isPaired) {
          this.getTodayStatus()
          this.loadStats()
          // 每次打开首页静默累积订阅配额
          app.requestSubscribeOnce()
        }
      } else {
        this.setData({ isLoggedIn: false })
      }
    } catch (err) {
      console.log('未登录:', err)
      this.setData({ isLoggedIn: false })
    }
  },

  // 获取今日写信状态
  async getTodayStatus() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getTodayStatus'
      })

      if (result.code === 0) {
        this.setData({
          hasWrittenToday: result.data.hasWritten
        })
      }
    } catch (err) {
      console.error('获取今日状态失败:', err)
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      // 获取我写的信
      const myLettersRes = await wx.cloud.callFunction({
        name: 'getTimeline'
      })
      
      if (myLettersRes.result.code === 0) {
        const letters = myLettersRes.result.data.letters
        const myLetters = letters.filter(l => l.isMine)
        const partnerLetters = letters.filter(l => !l.isMine)
        const unreadLetters = partnerLetters.filter(l => !l.isRead)
        
        this.setData({
          sentCount: myLetters.length,
          receivedCount: partnerLetters.length,
          unreadCount: unreadLetters.length
        })
      }
    } catch (err) {
      console.error('加载统计失败:', err)
    }
  },

  // 处理登录
  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })

      const loginData = await app.wxLogin(userInfo)
      
      this.setData({
        isLoggedIn: true,
        isPaired: loginData.isPaired,
        partnerInfo: loginData.partnerInfo,
        userInfo
      })

      wx.hideLoading()

      if (!loginData.isPaired) {
        wx.showModal({
          title: '欢迎使用',
          content: '接下来需要与 Ta 完成配对才能开始交换日记',
          showCancel: false,
          success: () => {
            this.goToPairing()
          }
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('登录失败:', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  // 跳转到配对页面
  goToPairing() {
    wx.navigateTo({
      url: '/pages/pairing/pairing'
    })
  },

  // 跳转到写信页面
  goToWrite() {
    if (this.data.hasWrittenToday) {
      wx.showToast({
        title: '今天已经写过信了',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/write/write'
    })
  },

  // 跳转到我的信件
  goToMyLetters() {
    wx.navigateTo({
      url: '/pages/my-letters/my-letters'
    })
  },

  // 跳转到收到的信
  goToReceivedLetters() {
    wx.navigateTo({
      url: '/pages/read/read'
    })
  },

  // 跳转到时光轴
  goToTimeline() {
    wx.navigateTo({
      url: '/pages/timeline/timeline'
    })
  },

  // 跳转到设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})
