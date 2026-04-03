// pages/pairing/pairing.js
const app = getApp()

Page({
  data: {
    loading: true,
    isPaired: false,
    partnerInfo: null,
    myInviteCode: '',
    inviteExpire: '',
    inputCode: '',
    creating: false,
    accepting: false,
    error: '',
    subscribedPairing: false
  },

  onLoad() {
    this.checkStatus()
  },

  onShow() {
    this.checkStatus()
  },

  // 检查配对状态
  async checkStatus() {
    this.setData({ loading: true, error: '' })
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      })

      if (result.code === 0) {
        const { isPaired, partnerInfo, pendingInvite } = result.data
        
        this.setData({
          isPaired,
          partnerInfo,
          loading: false
        })

        // 如果有待处理的邀请码
        if (pendingInvite) {
          const expireDate = new Date(pendingInvite.expiresAt)
          this.setData({
            myInviteCode: pendingInvite.code,
            inviteExpire: `${expireDate.getMonth() + 1}月${expireDate.getDate()}日`
          })
        }

        // 更新全局数据
        app.globalData.isPaired = isPaired
        app.globalData.partnerInfo = partnerInfo
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: '获取状态失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('检查状态失败:', err)
      this.setData({ loading: false })
    }
  },

  // 生成邀请码
  async createInvite() {
    this.setData({ creating: true, error: '' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'createInvite'
      })

      if (result.code === 0) {
        const expireDate = new Date(result.data.expiresAt)
        this.setData({
          myInviteCode: result.data.code,
          inviteExpire: `${expireDate.getMonth() + 1}月${expireDate.getDate()}日`,
          creating: false
        })

        wx.showToast({
          title: '邀请码已生成',
          icon: 'success'
        })
      } else {
        this.setData({ 
          creating: false,
          error: result.message || '生成失败'
        })
      }
    } catch (err) {
      console.error('生成邀请码失败:', err)
      this.setData({ 
        creating: false,
        error: '网络错误，请重试'
      })
    }
  },

  // 输入邀请码
  onCodeInput(e) {
    // 转换为大写
    const code = e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    this.setData({ 
      inputCode: code,
      error: ''
    })
  },

  // 接受邀请
  async acceptInvite() {
    const { inputCode } = this.data
    
    if (inputCode.length !== 6) {
      this.setData({ error: '请输入6位邀请码' })
      return
    }

    this.setData({ accepting: true, error: '' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'acceptInvite',
        data: { code: inputCode }
      })

      if (result.code === 0) {
        this.setData({ 
          accepting: false,
          isPaired: true,
          partnerInfo: result.data.partnerInfo
        })

        wx.showModal({
          title: '配对成功',
          content: '你们现在可以开始交换日记了！',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      } else {
        this.setData({ 
          accepting: false,
          error: result.message || '配对失败'
        })
      }
    } catch (err) {
      console.error('接受邀请失败:', err)
      this.setData({ 
        accepting: false,
        error: '网络错误，请重试'
      })
    }
  },

  // 返回首页
  goHome() {
    wx.navigateTo({
      url: '/pages/index/index'
    })
  },

  // 订阅配对成功通知
  subscribePairing() {
    wx.requestSubscribeMessage({
      tmplIds: ['vSiIKZYWEJBhptvkZF4n6WjBgaXi4HWmj5lMw-b-nus'],
      success: (res) => {
        if (res['vSiIKZYWEJBhptvkZF4n6WjBgaXi4HWmj5lMw-b-nus'] === 'accept') {
          this.setData({ subscribedPairing: true })
          wx.showToast({ title: '已开启通知', icon: 'success' })
        } else {
          wx.showToast({ title: '未开启通知', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '请求失败', icon: 'none' })
      }
    })
  }
})
