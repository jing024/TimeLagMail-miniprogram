// 云函数：获取词云data
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 停用词字符集——含任一字符的 n-gram 将被过滤
const STOP_CHARS = new Set(
  '的了在是我你他她它有和也都到要会能这那就不很吧吗呢啊哦嗯呀啦嘛么得着过被把给让跟被从向往对于与及其' +
  '个们地可以已经不是没有就是因为所以但是而且或者如果虽然这样那样怎么为什么应该不会知道觉得希望' +
  '什么时候现在今天明天昨天'
)

// 清理文本：去除标点、数字、英文、空白、emoji
function cleanText(text) {
  return text
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/[a-zA-Z0-9]/g, '')
    .replace(/\s+/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
}

// 检查 n-gram 是否包含停用词字符
function containsStopChar(ngram) {
  for (const ch of ngram) {
    if (STOP_CHARS.has(ch)) return true
  }
  return false
}

// 提取 n-gram 词频
function extractWords(texts) {
  const allText = texts.join('')
  const cleaned = cleanText(allText)

  if (cleaned.length < 4) return []

  const freq = {}

  // 2-gram
  for (let i = 0; i < cleaned.length - 1; i++) {
    const gram = cleaned.substring(i, i + 2)
    if (!containsStopChar(gram)) {
      freq[gram] = (freq[gram] || 0) + 1
    }
  }

  // 3-gram
  for (let i = 0; i < cleaned.length - 2; i++) {
    const gram = cleaned.substring(i, i + 3)
    if (!containsStopChar(gram)) {
      freq[gram] = (freq[gram] || 0) + 1
    }
  }

  // 过滤词频 < 2，排序，取 top 30
  const words = Object.entries(freq)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)

  if (words.length === 0) return []

  const maxCount = words[0][1]
  return words.map(([text, count]) => ({
    text,
    count,
    weight: Math.round((count / maxCount) * 100) / 100
  }))
}

// 获取所有信件内容（分页处理超过 100 条的情况）
async function getAllLetters(query) {
  const MAX_LIMIT = 100
  const countRes = await query.count()
  const total = countRes.total
  const batches = Math.ceil(total / MAX_LIMIT)

  const tasks = []
  for (let i = 0; i < batches; i++) {
    tasks.push(query.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get())
  }

  const results = await Promise.all(tasks)
  return results.reduce((acc, cur) => acc.concat(cur.data), [])
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 1001, message: '未登录' }
  }

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { code: 1001, message: '用户不存在' }
    }

    const user = userRes.data[0]

    if (!user.isPaired) {
      return { code: 1002, message: '请先完成配对' }
    }

    const partnerOpenid = user.partnerOpenid
    const now = new Date()

    // 构建缓存 key
    const cacheKey = [openid, partnerOpenid].sort().join('_')

    // 统计信件总数
    const myCount = await db.collection('letters').where({
      _openid: openid
    }).count()
    const partnerCount = await db.collection('letters').where({
      _openid: partnerOpenid,
      unlockAt: _.lte(now)
    }).count()
    const totalLetters = myCount.total + partnerCount.total

    // 信件太少时不生成词云
    if (totalLetters < 5) {
      return {
        code: 0,
        data: { words: [], totalLetters }
      }
    }

    // 检查缓存
    const cacheRes = await db.collection('word_clouds').where({
      cacheKey: cacheKey
    }).get()

    if (cacheRes.data.length > 0) {
      const cached = cacheRes.data[0]
      if (cached.letterCount === totalLetters) {
        return {
          code: 0,
          data: {
            words: cached.words,
            totalLetters: cached.letterCount
          }
        }
      }
    }

    // 缓存未命中，获取所有信件内容
    const myLetters = await getAllLetters(
      db.collection('letters').where({ _openid: openid })
    )
    const partnerLetters = await getAllLetters(
      db.collection('letters').where({
        _openid: partnerOpenid,
        unlockAt: _.lte(now)
      })
    )

    const allContents = [...myLetters, ...partnerLetters].map(l => l.content || '')

    // 提取词频
    const words = extractWords(allContents)

    // 更新缓存
    if (cacheRes.data.length > 0) {
      await db.collection('word_clouds').doc(cacheRes.data[0]._id).remove()
    }
    await db.collection('word_clouds').add({
      data: {
        cacheKey,
        words,
        letterCount: totalLetters,
        updatedAt: db.serverDate()
      }
    })

    return {
      code: 0,
      data: { words, totalLetters }
    }
  } catch (err) {
    console.error('获取词云失败:', err)
    return { code: 5000, message: '服务器错误' }
  }
}
