// pages/my-letters/my-letters.js - 我寄出的所有信件
const app = getApp()

Page({
  data: {
    loading: true,
    letters: [],
    monthGroups: [],
    expandedMonths: {},
    allLetters: [],
    favoriteOnly: false
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

          const preview = formatPreview(letter.content)
          return {
            ...letter,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            isUnlocked,
            unlockDateStr,
            preview
          }
        })

        this.setData({
          allLetters: processedLetters,
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
    const { allLetters, favoriteOnly, expandedMonths } = this.data
    const letters = favoriteOnly ? allLetters.filter(l => l.isFavorited) : allLetters
    const { monthGroups, nextExpandedMonths } = buildMonthGroups(letters, expandedMonths, true)
    this.setData({
      letters,
      monthGroups,
      expandedMonths: nextExpandedMonths
    })
  },

  // 切换仅收藏筛选
  toggleFavoriteFilter() {
    this.setData({ favoriteOnly: !this.data.favoriteOnly })
    this.applyFilter()
  },

  toggleMonth(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return

    const expandedMonths = {
      ...this.data.expandedMonths,
      [key]: !this.data.expandedMonths[key]
    }
    const letters = this.data.favoriteOnly
      ? this.data.allLetters.filter(l => l.isFavorited)
      : this.data.allLetters
    const { monthGroups, nextExpandedMonths } = buildMonthGroups(letters, expandedMonths, false)

    this.setData({
      letters,
      monthGroups,
      expandedMonths: nextExpandedMonths
    })
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

function formatPreview(content) {
  const normalized = (content || '').replace(/\s+/g, ' ').trim()
  return normalized.substring(0, 10) + (normalized.length > 10 ? '...' : '')
}

function buildMonthGroups(letters, expandedMonths, ensureExpanded) {
  const groups = []
  const groupMap = {}

  letters.forEach(letter => {
    const date = new Date(letter.createdAt)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const key = `${year}-${month.toString().padStart(2, '0')}`

    if (!groupMap[key]) {
      groupMap[key] = {
        key,
        title: `${year}年${month}月`,
        letters: []
      }
      groups.push(groupMap[key])
    }

    groupMap[key].letters.push(letter)
  })

  groups.sort((a, b) => b.key.localeCompare(a.key))
  groups.forEach(group => {
    group.letters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  const nextExpandedMonths = { ...expandedMonths }
  const hasExpandedVisibleMonth = groups.some(group => nextExpandedMonths[group.key])
  if (ensureExpanded && groups.length > 0 && !hasExpandedVisibleMonth) {
    nextExpandedMonths[groups[0].key] = true
  }

  groups.forEach(group => {
    group.expanded = !!nextExpandedMonths[group.key]
    group.summary = getMonthSummary(group.letters)
  })

  return { monthGroups: groups, nextExpandedMonths }
}

function getMonthSummary(letters) {
  const parts = [`共 ${letters.length} 封`]
  const pendingCount = letters.filter(letter => !letter.isUnlocked).length
  const favoriteCount = letters.filter(letter => letter.isFavorited).length
  const imageCount = letters.filter(letter => letter.imageFileID).length

  if (pendingCount > 0) parts.push(`途中 ${pendingCount} 封`)
  if (favoriteCount > 0) parts.push(`收藏 ${favoriteCount} 封`)
  if (imageCount > 0) parts.push(`附图 ${imageCount} 封`)

  return parts.join(' · ')
}
