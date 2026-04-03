// wx-server-sdk mock
// 所有云函数共享同一个 mock 实例

export const mockDbCollections: Record<string, any[]> = {
  users: [],
  letters: [],
  invites: [],
  streaks: []
}

export const mockWxContext = {
  OPENID: 'test-openid-001'
}

function createMockDb() {
  const collections: Record<string, any[]> = mockDbCollections

  const queryMock = (collectionName: string) => {
    const data = collections[collectionName] || []
    return {
      where: (condition: Record<string, any>) => {
        const filtered = data.filter((item: any) => {
          return Object.entries(condition).every(([key, value]) => {
            if (key === '_openid') return item._openid === value
            if (typeof value === 'object' && value !== null && '$gte' in value) {
              const itemVal = item[key]
              if ('$gte' in value && itemVal < value.$gte) return false
              if ('$lt' in value && itemVal >= value.$lt) return false
              return true
            }
            return item[key] === value
          })
        })
        return {
          get: jest.fn().mockResolvedValue({ data: filtered }),
          update: jest.fn().mockResolvedValue({ stats: { updated: 1 } })
        }
      },
      get: jest.fn().mockResolvedValue({ data }),
      add: jest.fn().mockImplementation((doc) => {
        const newDoc = { ...doc.data, _id: `mock-id-${Date.now()}` }
        collections[collectionName].push(newDoc)
        return Promise.resolve({ _id: newDoc._id })
      }),
      doc: (id: string) => ({
        update: jest.fn().mockResolvedValue({ stats: { updated: 1 } }),
        get: jest.fn().mockResolvedValue({
          data: collections[collectionName].find((item: any) => item._id === id) || null
        })
      })
    }
  }

  return {
    collection: queryMock,
    command: {
      and: (conditions: any[]) => conditions
    }
  }
}

const mockDb = createMockDb()

// 导出 getWXContext mock
export function getWXContext() {
  return mockWxContext
}

// 导出 cloud.init mock
export function init(options?: any) {
  return {}
}

export const cloud = {
  init,
  getWXContext,
  database: () => mockDb
}

export const db = mockDb

export default {
  init,
  getWXContext,
  DYNAMIC_CURRENT_ENV: 'mock-env'
}
