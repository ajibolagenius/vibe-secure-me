app.post('/api/checkout', async (req, res) => {
  const { productId, quantity } = req.body

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return res.status(400).json({ error: 'invalid quantity' })
  }

  // Price comes from the catalogue, never from the client.
  const product = await db.products.findUnique({ where: { id: productId } })
  if (!product) return res.status(404).json({ error: 'unknown product' })

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: product.stripePriceId, quantity }],
    mode: 'payment',
  })
  res.json({ url: session.url })
})
