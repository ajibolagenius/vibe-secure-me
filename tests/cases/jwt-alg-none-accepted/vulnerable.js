const jwt = require('jsonwebtoken')

function authenticate(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  // No algorithm pinning: accepts alg:none and HS/RS confusion.
  const claims = jwt.verify(token, process.env.JWT_PUBLIC_KEY)
  return claims.sub
}

module.exports = { authenticate }
