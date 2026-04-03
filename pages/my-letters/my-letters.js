// pages/my-letters/my-letters.js - 我寄出的所有信件
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
        
        // 只取我写的信
        const myLetters = allLetters.filter(l => l.isMine)
        
        // 处理信件数据
        const now = new Date()
        const processedLetters = myLetters.map(letter => {
          const date = new Date(letter.createdAt)
          // 从 unlockAt 字符串中直接提取时间
          // 格式可能是：Sun Mar 29 2026 22:00:00 GMT+0800 或 ISO 格式
          let unlockTimeStr = ''
          
          if (typeof letter.unlockAt === 'string') {
            // ISO 格式字符串，统一用 Date 解析后取 UTC+8
            const d = new Date(letter.unlockAt)
            const utcHours = d.getUTCHours()
            const localHours = (utcHours + 8) % 24
            unlockTimeStr = `${localHours.toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
          } else {
            // Date 对象
            const d = new Date(letter.unlockAt)
            const utcHours = d.getUTCHours()
            const localHours = (utcHours + 8) % 24
            unlockTimeStr = `${localHours.toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
          }
          
          const unlockAt = new Date(letter.unlockAt)
          const isUnlocked = now >= unlockAt
          
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            unlockTimeStr: unlockTimeStr,
            isUnlocked,
            preview: letter.content.substring(0, 60) + (letter.content.length > 60 ? '...' : '')
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

    // 显示信件内容
    wx.showModal({
      title: `${letter.dateStr} 寄出的信`,
      content: letter.content,
      showCancel: false,
      confirmText: '关闭'
    })
  }
})
