app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid payload' })
  }

  const user = await users.findOne({ email })
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  res.json({ token: issueToken(user) })
})
