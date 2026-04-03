// pages/read/read.js - 收到的所有信件列表
Page({
  data: {
    loading: true,
    letters: [],
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
        
        // 处理信件数据
        const processedLetters = letters.map(letter => {
          const date = new Date(letter.createdAt)
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            preview: letter.content.substring(0, 60) + (letter.content.length > 60 ? '...' : '')
          }
        })

        // 处理待送达时间（将 UTC 转为北京时间）
        let pendingTimeStr = ''
        if (result.data.nextUnlockTime) {
          const unlockDate = new Date(result.data.nextUnlockTime)
          const utcHours = unlockDate.getUTCHours()
          const localHours = (utcHours + 8) % 24
          pendingTimeStr = `${localHours.toString().padStart(2, '0')}:${unlockDate.getUTCMinutes().toString().padStart(2, '0')}`
        }

        this.setData({
          letters: processedLetters,
          hasPending: result.data.hasPending || false,
          pendingCount: result.data.pendingCount || 0,
          pendingTimeStr,
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
      title: `${letter.dateStr} 的来信`,
      content: letter.content,
      showCancel: false,
      confirmText: letter.isRead ? '关闭' : '启封',
      success: () => {
        if (!letter.isRead) {
          this.markAsRead(letterId)
        }
      }
    })
  },

  // 标记已读
  async markAsRead(letterId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'markLetterRead',
        data: { letterId }
      })

      if (result.code === 0) {
        // 更新本地数据
        const letters = this.data.letters.map(l => {
          if (l._id === letterId) {
            return { ...l, isRead: true }
          }
          return l
        })
        this.setData({ letters })
      }
    } catch (err) {
      console.error('标记已读失败:', err)
    }
  }
})
