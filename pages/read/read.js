// pages/read/read.js - 收到的所有信件列表
const app = getApp()

Page({
  data: {
    loading: true,
    letters: [],
    allLetters: [],
    favoriteOnly: false,
    hasPending: false,
    pendingCount: 0
  },

  onLoad() {
    this.loadLetters()
  },

  onShow() {
    this.loadLetters()
  },

  // 加载所有收到的信件
  async loadLetters() {
    this.setData({ loading: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getPartnerLetters'
      })

      if (result.code === 0) {
        const letters = result.data.letters || []

        const processedLetters = letters.map(letter => {
          const date = new Date(letter.createdAt)
          const preview = letter.content.substring(0, 10) + (letter.content.length > 10 ? '...' : '')
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            preview
          }
        })

        this.setData({
          allLetters: processedLetters,
          hasPending: result.data.hasPending || false,
          pendingCount: result.data.pendingCount || 0,
          loading: false
        })
        this.applyFilter()
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('加载信件失败:', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
    }
  },

  // 根据收藏筛选过滤
  applyFilter() {
    const { allLetters, favoriteOnly } = this.data
    const letters = favoriteOnly ? allLetters.filter(l => l.isFavorited) : allLetters
    this.setData({ letters })
  },

  // 切换仅收藏筛选
  toggleFavoriteFilter() {
    this.setData({ favoriteOnly: !this.data.favoriteOnly })
    this.applyFilter()
  },

  // 打开单封信件
  openLetter(e) {
    const letterId = e.currentTarget.dataset.id
    const letter = this.data.letters.find(l => l._id === letterId)

    if (!letter) return

    // 阅读来信时静默请求订阅授权，积累通知配额
    app.requestSubscribeOnce()

    app.globalData.currentLetter = {
      ...letter,
      type: 'received',
      authorName: app.globalData.partnerInfo?.nickName || 'Ta'
    }

    wx.navigateTo({
      url: '/pages/letter-detail/letter-detail'
    })
  }
})
