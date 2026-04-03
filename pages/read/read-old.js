// pages/read/read.js
Page({
  data: {
    loading: true,
    currentLetter: null,
    letterDate: '',
    hasPending: false,
    countdown: ''
  },

  onLoad() {
    this.loadLetters()
  },

  onShow() {
    this.loadLetters()
  },

  // 加载信件
  async loadLetters() {
    this.setData({ loading: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getPartnerLetters'
      })

      if (result.code === 0) {
        const letters = result.data.letters || []
        
        // 找出第一封未读且已解锁的信件
        const unreadLetter = letters.find(l => !l.isRead)
        
        // 检查是否有待解锁的信件
        const hasPending = result.data.hasPending || false

        if (unreadLetter) {
          const date = new Date(unreadLetter.createdAt)
          this.setData({
            currentLetter: unreadLetter,
            letterDate: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
            hasPending: false,
            loading: false
          })
        } else {
          this.setData({
            currentLetter: null,
            hasPending,
            loading: false
          })

          // 如果有待解锁信件，开始倒计时
          if (hasPending && result.data.nextUnlockTime) {
            this.startCountdown(result.data.nextUnlockTime)
          }
        }
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

  // 开始倒计时
  startCountdown(unlockTime) {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const target = new Date(unlockTime).getTime()
      const diff = target - now

      if (diff <= 0) {
        // 时间到了，重新加载
        this.loadLetters()
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      this.setData({
        countdown: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      })
    }

    updateCountdown()
    this.countdownTimer = setInterval(updateCountdown, 1000)
  },

  onUnload() {
    // 清除倒计时
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
  },

  // 标记已读
  async markAsRead() {
    const { currentLetter } = this.data
    if (!currentLetter || currentLetter.isRead) return

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'markLetterRead',
        data: { letterId: currentLetter._id }
      })

      if (result.code === 0) {
        this.setData({
          'currentLetter.isRead': true
        })
        wx.showToast({
          title: '已标记为已读',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.message || '操作失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('标记已读失败:', err)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
    }
  },

  // 跳转到时光轴
  goToTimeline() {
    wx.switchTab({
      url: '/pages/timeline/timeline'
    })
  }
})
