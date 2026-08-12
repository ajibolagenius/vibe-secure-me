app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch {
      return res.status(400).send('invalid signature')
    }

    if (event.type === 'checkout.session.completed') {
      await grantSubscription(event.data.object.client_reference_id)
    }
    res.json({ received: true })
  }
)
