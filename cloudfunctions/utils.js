// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 错误码定义
const ErrorCode = {
  SUCCESS: 0,
  NOT_LOGIN: 1001,
  NOT_PAIRED: 1002,
  INVALID_PARAMS: 1003,
  NOT_FOUND: 1004,
  FORBIDDEN: 1005,
  SERVER_ERROR: 5000
}

// 统一响应格式
function response(code = ErrorCode.SUCCESS, data = null, message = 'ok') {
  return { code, data, message }
}

module.exports = {
  cloud,
  db,
  _,
  ErrorCode,
  response
}
