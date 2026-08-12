app.post('/api/login', async (req, res) => {
  const { email, password } = req.body

  // {"password": {"$ne": null}} authenticates as any user.
  const user = await users.findOne({ email, password })
  if (!user) return res.status(401).json({ error: 'invalid credentials' })

  res.json({ token: issueToken(user) })
})
