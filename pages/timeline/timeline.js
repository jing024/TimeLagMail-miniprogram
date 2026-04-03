// pages/timeline/timeline.js
Page({
  data: {
    loading: true,
    letters: [],
    streak: 0
  },

  onLoad() {
    this.loadTimeline()
  },

  onShow() {
    this.loadTimeline()
  },

  // 加载时光轴数据
  async loadTimeline() {
    this.setData({ loading: true })

    try {
      // 并行获取信件和连续天数
      const [timelineRes, streakRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getTimeline' }),
        wx.cloud.callFunction({ name: 'getStreak' })
      ])

      if (timelineRes.result.code === 0) {
        const letters = timelineRes.result.data.letters || []
        
        // 处理信件数据
        const myNickName = timelineRes.result.data.myNickName || '我'
        const processedLetters = letters.map(letter => {
          const date = new Date(letter.createdAt)
          const authorName = letter.isMine
            ? (myNickName || '我')
            : (letter.authorNickName || 'TA')
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            preview: letter.content.substring(0, 10) + (letter.content.length > 10 ? '...' : ''),
            authorName
          }
        })

        this.setData({
          letters: processedLetters,
          loading: false
        })
      }

      if (streakRes.result.code === 0) {
        this.setData({
          streak: streakRes.result.data.streak
        })
      }
    } catch (err) {
      console.error('加载时光轴失败:', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    }
  },

  // 打开信件
  openLetter(e) {
    const letterId = e.currentTarget.dataset.id
    const letter = this.data.letters.find(l => l._id === letterId)
    
    if (!letter) return

    wx.showModal({
      title: `${letter.dateStr} ${letter.authorName}的信`,
      content: letter.content,
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadTimeline()
    wx.stopPullDownRefresh()
  }
})
