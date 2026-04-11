// pages/write/write.js
const app = getApp()

Page({
  data: {
    content: '',
    canSubmit: false,
    submitting: false,
    unlockTime: '22:00',
    deliveryDays: 1,
    deliveryDateStr: '',
    dayOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },

  onLoad() {
    this.checkTodayStatus()
    this.loadUnlockTime()
  },

  // 加载用户的送信时间设置
  async loadUnlockTime() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      })
      if (result.code === 0) {
        const unlockTime = result.data.unlockTime || '22:00'
        this.setData({ unlockTime })
        this.updateDeliveryDateStr(1, unlockTime)
      }
    } catch (err) {
      console.error('加载送信时间失败:', err)
      this.updateDeliveryDateStr(1, '22:00')
    }
  },

  // 计算并更新预计送达时间文案
  updateDeliveryDateStr(days, unlockTime) {
    const now = new Date()
    const deliveryDate = new Date(now)
    deliveryDate.setDate(deliveryDate.getDate() + days)
    const month = deliveryDate.getMonth() + 1
    const day = deliveryDate.getDate()
    const deliveryDateStr = `${month}月${day}日 ${unlockTime} 送达`
    this.setData({ deliveryDateStr })
  },

  // 选择送达天数
  selectDeliveryDays(e) {
    const days = Number(e.currentTarget.dataset.days)
    this.setData({ deliveryDays: days })
    this.updateDeliveryDateStr(days, this.data.unlockTime)
  },

  // 检查今天是否已写信
  async checkTodayStatus() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getTodayStatus'
      })

      if (result.code === 0 && result.data.hasWritten) {
        wx.showModal({
          title: '提示',
          content: '今天已经写过信了，明天再来吧~',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }
    } catch (err) {
      console.error('检查状态失败:', err)
    }
  },

  // 输入内容
  onInput(e) {
    const content = e.detail.value
    this.setData({
      content,
      canSubmit: content.trim().length > 0
    })
  },

  // 返回
  goBack() {
    if (this.data.content.trim()) {
      wx.showModal({
        title: '确认离开',
        content: '离开后将丢失已写的内容，确定吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 提交信件
  async submitLetter() {
    const { content, deliveryDays } = this.data

    if (!content.trim()) {
      wx.showToast({
        title: '内容不能为空',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'sendLetter',
        data: { content: content.trim(), deliveryDays }
      })

      if (result.code === 0) {
        // 发信成功后静默请求订阅授权，累积通知配额
        app.requestSubscribeOnce()

        wx.showModal({
          title: '封存成功',
          content: `你的信将在 ${this.data.deliveryDateStr}`,
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      } else {
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'none'
        })
        this.setData({ submitting: false })
      }
    } catch (err) {
      console.error('发送失败:', err)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
      this.setData({ submitting: false })
    }
  }
})
