/**
 * sendLetter 云函数单元测试
 *
 * 测试重点：
 * 1. unlockAt 是否正确计算为"明天 + 用户配置的送信时间"
 * 2. 用户未配对时拒绝写信
 * 3. 同一天不能写两封信
 * 4. 内容长度校验
 */

// 全局 mock 数据（通过 moduleNameMapper 共享）
const mockCollections = {
  users: [],
  letters: [],
  invites: [],
  streaks: []
}

const mockWxContext = { OPENID: 'test-openid-001' }

// mock wx-server-sdk
jest.mock('wx-server-sdk', () => {
  function createCollection(name) {
    let condition = null
    return {
      where: (cond) => { condition = cond; return createCollection(name) },
      get: async () => {
        if (!condition) return { data: mockCollections[name] || [] }
        const filtered = (mockCollections[name] || []).filter((item) => {
          return Object.entries(condition).every(([key, val]) => {
            if (key === '_openid') return item._openid === val
            if (typeof val === 'object' && val && '$and' in val) {
              const [gte, lt] = val.$and
              if (gte?.$gte && item[key] < gte.$gte) return false
              if (lt?.$lt && item[key] >= lt.$lt) return false
              return true
            }
            if (val?.$gte && item[key] < val.$gte) return false
            if (val?.$lt && item[key] >= val.$lt) return false
            return item[key] === val
          })
        })
        return { data: filtered }
      },
      add: async (doc) => {
        const newDoc = { ...doc.data, _id: `id-${Date.now()}` }
        if (!mockCollections[name]) mockCollections[name] = []
        mockCollections[name].push(newDoc)
        return { _id: newDoc._id }
      },
      doc: (id) => ({
        get: async () => ({ data: mockCollections[name]?.find((i) => i._id === id) || null }),
        update: async () => ({ stats: { updated: 1 } })
      })
    }
  }

  const mockDb = {
    collection: (n) => createCollection(n),
    command: { and: (c) => c }
  }

  return {
    cloud: {
      init: () => {},
      getWXContext: () => mockWxContext,
      database: () => mockDb,
      DYNAMIC_CURRENT_ENV: 'mock'
    },
    db: mockDb,
    init: () => {},
    getWXContext: () => mockWxContext,
    DYNAMIC_CURRENT_ENV: 'mock'
  }
})

// 加载云函数（在 mock 设置之后）
const { main: sendLetter } = require('../sendLetter/index')

// ============ 辅助函数 ============

function clearCollections() {
  Object.keys(mockCollections).forEach((k) => { mockCollections[k] = [] })
}

function createMockUser(overrides = {}) {
  mockCollections.users.push({
    _openid: 'test-openid-001',
    isPaired: true,
    unlockTime: '22:00',
    ...overrides
  })
}

// ============ TC-W1 ============
test('TC-W1: 默认 22:00 状态下写信，unlockAt 应为明天 22:00', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-03-30T22:30:00'))
  createMockUser({ unlockTime: '22:00' })
  const result = await sendLetter({ content: '测试信' }, { OPENID: 'test-openid-001' })
  expect(result.code).toBe(0)
  const u = new Date(result.data.unlockAt)
  expect(u.getFullYear()).toBe(2026)
  expect(u.getMonth()).toBe(2)
  expect(u.getDate()).toBe(31)
  expect(u.getHours()).toBe(22)
  expect(u.getMinutes()).toBe(0)
  jest.useRealTimers()
  clearCollections()
})

// ============ TC-W2 ============
test('TC-W2: 送信时间 06:00，unlockAt 应为明天 06:00', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-03-30T08:00:00'))
  createMockUser({ unlockTime: '06:00' })
  const result = await sendLetter({ content: '凌晨信' }, { OPENID: 'test-openid-001' })
  expect(result.code).toBe(0)
  const u = new Date(result.data.unlockAt)
  expect(u.getDate()).toBe(31)
  expect(u.getHours()).toBe(6)
  jest.useRealTimers()
  clearCollections()
})

// ============ TC-W3 ============
test('TC-W3: 送信时间 14:00，unlockAt 应为明天 14:00', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-03-30T10:00:00'))
  createMockUser({ unlockTime: '14:00' })
  const result = await sendLetter({ content: '下午信' }, { OPENID: 'test-openid-001' })
  expect(result.code).toBe(0)
  const u = new Date(result.data.unlockAt)
  expect(u.getDate()).toBe(31)
  expect(u.getHours()).toBe(14)
  jest.useRealTimers()
  clearCollections()
})

// ============ TC-E1 ============
test('TC-E1: 同一天写两封信，第二次应被拒绝', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-03-30T08:00:00'))
  createMockUser()
  mockCollections.letters.push({
    _openid: 'test-openid-001',
    _id: 'existing',
    content: '已有',
    createdAt: new Date('2026-03-30T08:00:00'),
    unlockAt: new Date('2026-03-31T22:00:00')
  })
  const r = await sendLetter({ content: '第二封' }, { OPENID: 'test-openid-001' })
  expect(r.code).toBe(1003)
  expect(r.message).toBe('今天已经写过信了')
  jest.useRealTimers()
  clearCollections()
})

// ============ TC-E2 ============
test('TC-E2: 未配对用户尝试写信，应被拒绝', async () => {
  createMockUser({ isPaired: false })
  const r = await sendLetter({ content: '信' }, { OPENID: 'test-openid-001' })
  expect(r.code).toBe(1002)
  expect(r.message).toBe('请先完成配对')
  clearCollections()
})

// ============ TC-E3 ============
test('TC-E3: 内容超过2000字应被拒绝', async () => {
  createMockUser()
  const r = await sendLetter({ content: 'a'.repeat(2001) }, { OPENID: 'test-openid-001' })
  expect(r.code).toBe(1003)
  clearCollections()
})

// ============ TC-E4 ============
test('TC-E4: 空内容应被拒绝', async () => {
  createMockUser()
  const r = await sendLetter({ content: '   ' }, { OPENID: 'test-openid-001' })
  expect(r.code).toBe(1003)
  expect(r.message).toBe('内容不能为空')
  clearCollections()
})

// ============ TC-E5 ============
test('TC-E5: 无 openid 应被拒绝', async () => {
  const r = await sendLetter({ content: '信' }, { OPENID: undefined })
  expect(r.code).toBe(1001)
  expect(r.message).toBe('未登录')
  clearCollections()
})

// ============ TC-U1 ============
test('TC-U1: 深夜写信（23:55），unlockAt 仍为明天 06:00', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-03-30T23:55:00'))
  createMockUser({ unlockTime: '06:00' })
  const r = await sendLetter({ content: '深夜信' }, { OPENID: 'test-openid-001' })
  expect(r.code).toBe(0)
  const u = new Date(r.data.unlockAt)
  expect(u.getMonth()).toBe(2)
  expect(u.getDate()).toBe(31)
  expect(u.getHours()).toBe(6)
  jest.useRealTimers()
  clearCollections()
})

// ============ TC-W5: updateUnlockTime ============
test('TC-W5: updateUnlockTime 云函数正确保存新送信时间', async () => {
  const { main: updateUnlockTime } = require('../updateUnlockTime/index')
  createMockUser({ unlockTime: '22:00' })
  const r = updateUnlockTime({ unlockTime: '06:30' }, { OPENID: 'test-openid-001' })
  expect(r.code).toBe(0)
  const user = mockCollections.users.find((u) => u._openid === 'test-openid-001')
  expect(user.unlockTime).toBe('06:30')
  clearCollections()
})
