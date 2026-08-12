app.post('/api/webhooks/stripe', express.json(), async (req, res) => {
  const event = req.body // unauthenticated attacker-controlled input

  if (event.type === 'checkout.session.completed') {
    await grantSubscription(event.data.object.client_reference_id)
  }
  res.json({ received: true })
})
