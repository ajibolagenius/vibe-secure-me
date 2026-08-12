app.use((req, res, next) => {
  // Reflecting the origin with credentials lets any site read responses.
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  next()
})
