// pages/read/read.js - 收到的所有信件列表
const app = getApp()

Page({
  data: {
    loading: true,
    letters: [],
    monthGroups: [],
    expandedMonths: {},
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
          const preview = formatPreview(letter.content)
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
    const { allLetters, favoriteOnly, expandedMonths } = this.data
    const letters = favoriteOnly ? allLetters.filter(l => l.isFavorited) : allLetters
    const { monthGroups, nextExpandedMonths } = buildMonthGroups(letters, expandedMonths, 'received', true)
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
    const { monthGroups, nextExpandedMonths } = buildMonthGroups(letters, expandedMonths, 'received', false)

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

function formatPreview(content) {
  const normalized = (content || '').replace(/\s+/g, ' ').trim()
  return normalized.substring(0, 10) + (normalized.length > 10 ? '...' : '')
}

function buildMonthGroups(letters, expandedMonths, type, ensureExpanded) {
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
    group.summary = getMonthSummary(group.letters, type)
  })

  return { monthGroups: groups, nextExpandedMonths }
}

function getMonthSummary(letters, type) {
  const parts = [`共 ${letters.length} 封`]
  const favoriteCount = letters.filter(letter => letter.isFavorited).length
  const imageCount = letters.filter(letter => letter.imageFileID).length

  if (type === 'received') {
    const unreadCount = letters.filter(letter => !letter.isRead).length
    if (unreadCount > 0) parts.push(`待启 ${unreadCount} 封`)
  }

  if (favoriteCount > 0) parts.push(`收藏 ${favoriteCount} 封`)
  if (imageCount > 0) parts.push(`附图 ${imageCount} 封`)

  return parts.join(' · ')
}
