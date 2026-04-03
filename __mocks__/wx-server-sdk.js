// wx-server-sdk mock for Jest testing
// 放置在 miniprogram/__mocks__/wx-server-sdk.js

'use strict'

// 共享的 mock 数据存储（测试间共享）
global.__MOCK_DB__ = global.__MOCK_DB__ || {
  users: [],
  letters: [],
  invites: [],
  streaks: []
}

const mockDbCollections = global.__MOCK_DB__

// wxContext
const mockWxContext = {
  OPENID: 'test-openid-001'
}

// 创建 mock db query chain
function createCollectionMock(collectionName) {
  let currentData = []
  let currentCondition = null

  const chain = {
    where: (condition) => {
      currentCondition = condition
      return chain
    },
    get: async () => {
      if (!currentCondition) {
        return { data: mockDbCollections[collectionName] || [] }
      }
      const filtered = (mockDbCollections[collectionName] || []).filter((item) => {
        return Object.entries(currentCondition).every(([key, condVal]) => {
          if (key === '_openid') return item._openid === condVal
          if (typeof condVal === 'object' && condVal !== null) {
            // 处理 _.gte().and(_.lt()) 这样的 compound 查询
            if ('$gte' in condVal && '.$and' in condVal) {
              // compound: createdAt: _.gte(today).and(_.lt(tomorrow))
              const andConds = condVal.$and
              let match = true
              if ('$gte' in andConds[0]) {
                const gteVal = andConds[0].$gte
                if (item[key] < gteVal) match = false
              }
              if ('$lt' in andConds[1]) {
                const ltVal = andConds[1].$lt
                if (item[key] >= ltVal) match = false
              }
              return match
            }
            if ('$gte' in condVal && item[key] < condVal.$gte) return false
            if ('$lt' in condVal && item[key] >= condVal.$lt) return false
          }
          return item[key] === condVal
        })
      })
      return { data: filtered }
    },
    add: async (doc) => {
      const newDoc = { ...doc.data, _id: `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }
      if (!mockDbCollections[collectionName]) mockDbCollections[collectionName] = []
      mockDbCollections[collectionName].push(newDoc)
      return { _id: newDoc._id }
    },
    doc: (id) => ({
      get: async () => {
        const item = (mockDbCollections[collectionName] || []).find((i) => i._id === id)
        return { data: item || null }
      },
      update: async (data) => {
        const idx = (mockDbCollections[collectionName] || []).findIndex((i) => i._id === id)
        if (idx !== -1) {
          mockDbCollections[collectionName][idx] = {
            ...mockDbCollections[collectionName][idx],
            ...data.data
          }
        }
        return { stats: { updated: 1 } }
      }
    })
  }

  return chain
}

const mockDb = {
  collection: (name) => createCollectionMock(name),
  command: {
    and: (conditions) => conditions
  }
}

function getWXContext() {
  return mockWxContext
}

function init(options) {
  return {}
}

function cloudDatabase() {
  return mockDb
}

// 暴露 setMockOpenid 方便测试设置不同用户
function setMockOpenid(openid) {
  mockWxContext.OPENID = openid
}

function getMockCollections() {
  return mockDbCollections
}

function clearMockData() {
  Object.keys(mockDbCollections).forEach((k) => {
    mockDbCollections[k] = []
  })
}

module.exports = {
  cloud: {
    init,
    getWXContext,
    database: cloudDatabase,
    DYNAMIC_CURRENT_ENV: 'mock-env'
  },
  db: mockDb,
  _: {
    eq: (val) => val,
    ne: (val) => val,
    lt: (val) => ({ $lt: val }),
    lte: (val) => val,
    gt: (val) => ({ $gt: val }),
    gte: (val) => ({ $gte: val }),
    and: (conds) => ({ $and: conds })
  },
  getWXContext,
  init,
  DYNAMIC_CURRENT_ENV: 'mock-env',
  setMockOpenid,
  getMockCollections,
  clearMockData
}

module.exports.default = {
  init,
  getWXContext,
  database: cloudDatabase,
  DYNAMIC_CURRENT_ENV: 'mock-env'
}
