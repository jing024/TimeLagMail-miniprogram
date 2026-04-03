// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    isPaired: false,
    partnerInfo: null
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      })

      if (result.code === 0) {
        this.setData({
          userInfo: result.data.userInfo,
          isPaired: result.data.isPaired,
          partnerInfo: result.data.partnerInfo
        })
      }
    } catch (err) {
      console.error('加载用户信息失败:', err)
    }
  },

  // 跳转到配对页面
  goToPairing() {
    wx.navigateTo({
      url: '/pages/pairing/pairing'
    })
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于时差信',
      content: '在这个快节奏的时代，感受传统的、缓慢的情绪表达。',
      showCancel: false
    })
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          // 清除全局数据
          app.globalData.openid = null
          app.globalData.isPaired = false
          app.globalData.partnerInfo = null

          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/index/index'
                })
              }, 1500)
            }
          })
        }
      }
    })
  }
})
