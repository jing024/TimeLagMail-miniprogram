// pages/settings/settings.js - 简化设置页
const app = getApp()

Page({
  data: {
    userInfo: null,
    isPaired: false,
    partnerInfo: null,
    unlockTime: '22:00',
    subscribedLetter: false,
    nickName: '',
    version: '1.0.5'
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
          partnerInfo: result.data.partnerInfo,
          unlockTime: result.data.unlockTime || '22:00',
          subscribedLetter: result.data.subscribed === true,
          nickName: result.data.userInfo?.nickName || ''
        })
      }
    } catch (err) {
      console.error('加载用户信息失败:', err)
    }
  },

  // 编辑昵称
  editNickName() {
    wx.showModal({
      title: '设置昵称',
      editable: true,
      placeholderText: '给自己起个名字',
      success: async (res) => {
        if (res.confirm && res.content !== undefined) {
          const nickName = res.content.trim()
          if (nickName.length > 20) {
            wx.showToast({ title: '昵称最多20字', icon: 'none' })
            return
          }
          try {
            const { result } = await wx.cloud.callFunction({
              name: 'updateUserProfile',
              data: { nickName }
            })
            if (result.code === 0) {
              this.setData({ nickName })
              wx.showToast({ title: '昵称已保存', icon: 'success' })
            } else {
              wx.showToast({ title: result.message || '保存失败', icon: 'none' })
            }
          } catch (err) {
            console.error('保存昵称失败:', err)
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  },

  // 显示配对信息
  showPartnerInfo() {
    const { isPaired, partnerInfo } = this.data

    if (!isPaired) {
      wx.showModal({
        title: '配对信息',
        content: '尚未建立连接',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    const partnerName = partnerInfo?.nickName || '对方'

    wx.showModal({
      title: '配对信息',
      content: `连接对象：${partnerName}`,
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 来信通知开关
  subscribeLetterNotify() {
    if (this.data.subscribedLetter) {
      // 已开启 → 确认关闭
      wx.showModal({
        title: '关闭来信通知',
        content: '当前已开启来信通知，关闭后将不再收到来信提醒，确定吗？',
        confirmText: '关闭',
        success: async (res) => {
          if (res.confirm) {
            try {
              await wx.cloud.callFunction({
                name: 'updateNotifySubscribe',
                data: { subscribed: false }
              })
              this.setData({ subscribedLetter: false })
              wx.showToast({ title: '已关闭通知', icon: 'success' })
            } catch (e) {
              console.error('关闭通知失败:', e)
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    } else {
      // 未开启 → 弹微信授权
      const tmplId = '9hv5zftpWQMAuRn9ugVIGjbQNN-34EshU8cnuJJSPVk'
      wx.requestSubscribeMessage({
        tmplIds: [tmplId],
        success: async (res) => {
          if (res[tmplId] === 'accept') {
            try {
              await wx.cloud.callFunction({
                name: 'updateNotifySubscribe',
                data: { subscribed: true }
              })
            } catch (e) {
              console.error('保存订阅状态失败:', e)
            }
            this.setData({ subscribedLetter: true })
            wx.showToast({ title: '已开启来信通知', icon: 'success' })
          } else if (res[tmplId] === 'reject') {
            wx.showToast({ title: '未开启通知', icon: 'none' })
          }
        },
        fail: () => {}
      })
    }
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于时差信',
      content: '从前的日色变得慢，车马邮件都慢，一生只够爱一个人。',
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 显示时间选择器 - 使用 input 输入
  showTimePicker() {
    wx.showModal({
      title: '设置送信时间（信件将在每日指定时间送达）',
      editable: true,
      placeholderText: '22:00',
      success: (res) => {
        if (res.confirm && res.content) {
          const timeStr = res.content.trim()
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
          if (timeRegex.test(timeStr)) {
            const [h, m] = timeStr.split(':')
            const formattedTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
            this.updateUnlockTime(formattedTime)
          } else {
            wx.showToast({
              title: '时间格式错误，请使用 HH:MM 格式',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  // 更新解锁时间
  async updateUnlockTime(time) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateUnlockTime',
        data: { unlockTime: time }
      })

      if (result.code === 0) {
        this.setData({ unlockTime: time })
        wx.showToast({ title: '设置已保存', icon: 'success' })
      } else {
        wx.showToast({ title: result.message || '设置失败', icon: 'none' })
      }
    } catch (err) {
      console.error('更新送信时间失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          app.globalData.openid = null
          app.globalData.isPaired = false
          app.globalData.partnerInfo = null

          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.reLaunch({ url: '/pages/index/index' })
              }, 1500)
            }
          })
        }
      }
    })
  }
})
