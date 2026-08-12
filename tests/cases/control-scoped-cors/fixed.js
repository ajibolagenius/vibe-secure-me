const cors = require('cors')

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
])

// Credentials are enabled, but only for a fixed allowlist of origins —
// never a wildcard and never a reflected origin. This is correct.
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true)
      callback(new Error('origin not allowed'))
    },
  })
)
