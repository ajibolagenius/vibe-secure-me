const jwt = require('jsonwebtoken')

function authenticate(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const claims = jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  })
  return claims.sub
}

module.exports = { authenticate }
