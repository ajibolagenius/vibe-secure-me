app.post('/api/checkout', async (req, res) => {
  const { productId, price, quantity } = req.body

  const session = await stripe.checkout.sessions.create({
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: price, // attacker sets this to 1
        product_data: { name: productId },
      },
      quantity,
    }],
    mode: 'payment',
  })
  res.json({ url: session.url })
})
