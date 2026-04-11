// pages/my-letters/my-letters.js - 我寄出的所有信件
const app = getApp()

Page({
  data: {
    loading: true,
    letters: []
  },

  onLoad() {
    this.loadLetters()
  },

  onShow() {
    this.loadLetters()
  },

  // 加载所有我寄出的信件
  async loadLetters() {
    this.setData({ loading: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getTimeline'
      })

      if (result.code === 0) {
        const allLetters = result.data.letters || []
        const myLetters = allLetters.filter(l => l.isMine)

        const now = new Date()
        const processedLetters = myLetters.map(letter => {
          const date = new Date(letter.createdAt)
          const unlockAt = new Date(letter.unlockAt)
          const isUnlocked = now >= unlockAt

          // 计算送达日期文案
          let unlockDateStr = ''
          if (!isUnlocked) {
            const uMonth = unlockAt.getMonth() + 1
            const uDay = unlockAt.getDate()
            const utcHours = unlockAt.getUTCHours()
            const localHours = (utcHours + 8) % 24
            const localMin = unlockAt.getUTCMinutes()
            unlockDateStr = `${uMonth}月${uDay}日 ${localHours.toString().padStart(2, '0')}:${localMin.toString().padStart(2, '0')}`
          }

          const preview = letter.content.substring(0, 10) + (letter.content.length > 10 ? '...' : '')
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            isUnlocked,
            unlockDateStr,
            preview
          }
        })

        this.setData({
          letters: processedLetters,
          loading: false
        })
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

  // 打开单封信件
  openLetter(e) {
    const letterId = e.currentTarget.dataset.id
    const letter = this.data.letters.find(l => l._id === letterId)

    if (!letter) return

    app.globalData.currentLetter = {
      ...letter,
      type: 'sent',
      authorName: '我'
    }

    wx.navigateTo({
      url: '/pages/letter-detail/letter-detail'
    })
  }
})
