// pages/letter-detail/letter-detail.js
const app = getApp()

Page({
  data: {
    content: '',
    dateStr: '',
    authorLabel: '',
    showUnseal: false,
    animated: false,
    letterId: '',
    letterType: '',
    isFavorited: false,
    imageFileID: '',
    imageUrl: '',
    imageLoading: false
  },

  onLoad() {
    const letter = app.globalData.currentLetter
    if (!letter) {
      wx.navigateBack()
      return
    }

    const date = new Date(letter.createdAt)
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`

    let authorLabel = ''
    if (letter.type === 'received') {
      authorLabel = `${letter.authorName || 'Ta'} 的来信`
    } else if (letter.type === 'sent') {
      authorLabel = '寄出的信'
    } else {
      authorLabel = `${letter.authorName || ''} 的信`
    }

    this.setData({
      content: letter.content,
      dateStr,
      authorLabel,
      showUnseal: letter.type === 'received' && !letter.isRead,
      letterId: letter._id,
      letterType: letter.type || '',
      isFavorited: letter.isFavorited || false,
      imageFileID: letter.imageFileID || ''
    })

    if (letter.imageFileID) {
      this.loadLetterImage()
    }

    // 延迟触发展开动画
    setTimeout(() => {
      this.setData({ animated: true })
    }, 50)
  },

  async loadLetterImage() {
    this.setData({ imageLoading: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getLetterImageUrl',
        data: { letterId: this.data.letterId }
      })

      if (result.code === 0 && result.data.imageUrl) {
        this.setData({
          imageUrl: result.data.imageUrl,
          imageLoading: false
        })
      } else {
        this.setData({ imageLoading: false })
      }
    } catch (err) {
      console.error('加载附图失败:', err)
      this.setData({ imageLoading: false })
    }
  },

  onUnload() {
    app.globalData.currentLetter = null
  },

  // 启封（标记已读）
  async unseal() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'markLetterRead',
        data: { letterId: this.data.letterId }
      })

      if (result.code === 0) {
        this.setData({ showUnseal: false })
        wx.showToast({ title: '已启封', icon: 'success' })
      }
    } catch (err) {
      console.error('启封失败:', err)
    }
  },

  // 切换收藏
  async toggleFavorite() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { letterId: this.data.letterId }
      })

      if (result.code === 0) {
        this.setData({ isFavorited: result.data.isFavorited })
        wx.showToast({
          title: result.data.isFavorited ? '已收藏' : '已取消收藏',
          icon: 'success'
        })
      }
    } catch (err) {
      console.error('收藏失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
