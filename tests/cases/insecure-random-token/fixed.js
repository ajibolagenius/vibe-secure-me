const crypto = require('node:crypto')

function createPasswordResetToken() {
  return crypto.randomBytes(32).toString('base64url')
}

module.exports = { createPasswordResetToken }
