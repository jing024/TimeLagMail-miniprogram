// pages/index/index.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    isPaired: false,
    userInfo: {},
    partnerInfo: null,
    hasWrittenToday: false,
    streak: 0,
    today: ''
  },

  onLoad() {
    this.setToday()
    this.checkStatus()
  },

  onShow() {
    // 每次显示页面时刷新状态
    if (this.data.isLoggedIn) {
      this.checkStatus()
    }
  },

  // 设置今天的日期
  setToday() {
    const today = new Date()
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
    this.setData({ today: dateStr })
  },

  // 检查登录和配对状态
  async checkStatus() {
    try {
      // 获取用户信息
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

        // 更新全局数据
        app.globalData.openid = openid
        app.globalData.isPaired = isPaired
        app.globalData.partnerInfo = partnerInfo

        // 如果已配对，获取今日状态和连续天数
        if (isPaired) {
          this.getTodayStatus()
          this.getStreak()
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

  // 获取连续天数
  async getStreak() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getStreak'
      })

      if (result.code === 0) {
        this.setData({
          streak: result.data.streak
        })
      }
    } catch (err) {
      console.error('获取连续天数失败:', err)
    }
  },

  // 处理登录
  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      // 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })

      // 调用登录
      const loginData = await app.wxLogin()
      
      this.setData({
        isLoggedIn: true,
        isPaired: loginData.isPaired,
        partnerInfo: loginData.partnerInfo,
        userInfo
      })

      wx.hideLoading()

      // 如果未配对，提示去配对
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

  // 跳转到收信页面
  goToRead() {
    wx.navigateTo({
      url: '/pages/read/read'
    })
  }
})
