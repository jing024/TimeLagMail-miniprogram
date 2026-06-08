// pages/write/write.js
const app = getApp()
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

Page({
  data: {
    content: '',
    canSubmit: false,
    submitting: false,
    unlockTime: '22:00',
    deliveryDays: 1,
    deliveryDateStr: '',
    dayOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    selectedImagePath: '',
    selectedImageSize: 0,
    textareaFocused: false
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

  onTextareaFocus() {
    this.setData({ textareaFocused: true })
  },

  onTextareaBlur() {
    this.setData({ textareaFocused: false })
  },

  // 选择一张附图
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return

        if (file.size > MAX_IMAGE_SIZE) {
          wx.showToast({ title: '图片需小于2MB', icon: 'none' })
          return
        }

        this.setData({
          selectedImagePath: file.tempFilePath,
          selectedImageSize: file.size || 0
        })
      }
    })
  },

  // 移除已选附图
  removeImage() {
    this.setData({
      selectedImagePath: '',
      selectedImageSize: 0
    })
  },

  // 返回
  goBack() {
    if (this.data.content.trim() || this.data.selectedImagePath) {
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
    const { content, deliveryDays, selectedImagePath } = this.data

    if (!content.trim()) {
      wx.showToast({
        title: '内容不能为空',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })
    let uploadedFileID = ''

    try {
      if (selectedImagePath) {
        uploadedFileID = await this.uploadSelectedImage(selectedImagePath)
      }

      const { result } = await wx.cloud.callFunction({
        name: 'sendLetter',
        data: {
          content: content.trim(),
          deliveryDays,
          imageFileID: uploadedFileID || null
        }
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
        await this.deleteUploadedImage(uploadedFileID)
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'none'
        })
        this.setData({ submitting: false })
      }
    } catch (err) {
      console.error('发送失败:', err)
      await this.deleteUploadedImage(uploadedFileID)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
      this.setData({ submitting: false })
    }
  },

  async ensureOpenid() {
    if (app.globalData.openid) return app.globalData.openid

    const { result } = await wx.cloud.callFunction({
      name: 'getUserInfo'
    })

    if (result.code !== 0 || !result.data.openid) {
      throw new Error(result.message || '获取用户信息失败')
    }

    app.globalData.openid = result.data.openid
    return result.data.openid
  },

  async uploadSelectedImage(tempFilePath) {
    const openid = await this.ensureOpenid()
    const extMatch = tempFilePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg'
    const random = Math.random().toString(36).slice(2, 8)
    const cloudPath = `letter-images/${openid}/${Date.now()}-${random}.${ext}`

    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    })

    return res.fileID
  },

  async deleteUploadedImage(fileID) {
    if (!fileID) return

    try {
      await wx.cloud.deleteFile({
        fileList: [fileID]
      })
    } catch (err) {
      console.warn('清理已上传图片失败:', err)
    }
  }
})
