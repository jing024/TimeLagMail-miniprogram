// pages/timeline/timeline.js
const app = getApp()

Page({
  data: {
    loading: true,
    letters: [],
    streak: 0,
    wordCloudExpanded: false,
    wordCloudWords: [],
    wordCloudLoading: false,
    totalLetters: 0
  },

  onLoad() {
    this.loadTimeline()
  },

  onShow() {
    this.loadTimeline()
  },

  // 加载时光轴
  async loadTimeline() {
    this.setData({ loading: true })

    try {
      const [timelineRes, streakRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getTimeline' }),
        wx.cloud.callFunction({ name: 'getStreak' })
      ])

      if (timelineRes.result.code === 0) {
        const letters = timelineRes.result.data.letters || []

        const myNickName = timelineRes.result.data.myNickName || '我'
        const processedLetters = letters.map(letter => {
          const date = new Date(letter.createdAt)
          const authorName = letter.isMine
            ? (myNickName || '我')
            : (letter.authorNickName || 'TA')
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
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

  // 切换词云展开/折叠
  toggleWordCloud() {
    const expanded = !this.data.wordCloudExpanded
    this.setData({ wordCloudExpanded: expanded })
    if (expanded && this.data.wordCloudWords.length === 0) {
      this.loadWordCloud()
    }
  },

  // 加载词云
  async loadWordCloud() {
    this.setData({ wordCloudLoading: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'getWordCloud' })
      if (res.result.code === 0) {
        const words = res.result.data.words || []
        const layoutWords = this.layoutWords(words)
        this.setData({
          wordCloudWords: layoutWords,
          totalLetters: res.result.data.totalLetters || 0,
          wordCloudLoading: false
        })
      } else {
        this.setData({ wordCloudLoading: false })
      }
    } catch (err) {
      console.error('加载词云失败:', err)
      this.setData({ wordCloudLoading: false })
    }
  },

  // 词云布局算法——螺旋放置
  layoutWords(words) {
    if (!words || words.length === 0) return []

    const CONTAINER_W = 620
    const CONTAINER_H = 420
    const MIN_FONT = 24
    const MAX_FONT = 52
    const COLORS = ['#8b1a1a', '#3d2914', '#5c4033', '#8b7355', '#2c1810']

    const placed = []

    return words.map((word, index) => {
      const fontSize = Math.round(MIN_FONT + word.weight * (MAX_FONT - MIN_FONT))
      const textW = word.text.length * fontSize + 8
      const textH = fontSize * 1.4

      // 螺旋搜索可用位置
      let x = (CONTAINER_W - textW) / 2
      let y = (CONTAINER_H - textH) / 2
      let angle = index * 0.7
      let radius = 0
      let found = false

      for (let step = 0; step < 200; step++) {
        const cx = (CONTAINER_W - textW) / 2 + Math.cos(angle) * radius
        const cy = (CONTAINER_H - textH) / 2 + Math.sin(angle) * radius

        if (cx < 0 || cy < 0 || cx + textW > CONTAINER_W || cy + textH > CONTAINER_H) {
          angle += 0.5
          radius += 6
          continue
        }

        // 碰撞检测
        let overlaps = false
        for (const p of placed) {
          if (cx < p.x + p.w && cx + textW > p.x &&
              cy < p.y + p.h && cy + textH > p.y) {
            overlaps = true
            break
          }
        }

        if (!overlaps) {
          x = cx
          y = cy
          found = true
          break
        }

        angle += 0.5
        radius += 6
      }

      if (!found) return null

      placed.push({ x, y, w: textW, h: textH })

      return {
        text: word.text,
        fontSize: Math.round(fontSize),
        x: Math.round(x),
        y: Math.round(y),
        opacity: (0.6 + word.weight * 0.4).toFixed(2),
        color: COLORS[index % COLORS.length]
      }
    }).filter(Boolean)
  },

  // 打开信件
  openLetter(e) {
    const letterId = e.currentTarget.dataset.id
    const letter = this.data.letters.find(l => l._id === letterId)

    if (!letter) return

    app.globalData.currentLetter = {
      ...letter,
      type: letter.isMine ? 'sent' : 'received',
      authorName: letter.authorName
    }

    wx.navigateTo({
      url: '/pages/letter-detail/letter-detail'
    })
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadTimeline()
    // 如果词云已展开，也刷新词云
    if (this.data.wordCloudExpanded) {
      this.setData({ wordCloudWords: [] })
      this.loadWordCloud()
    }
    wx.stopPullDownRefresh()
  }
})
