function createPasswordResetToken() {
  // Math.random is not a CSPRNG; output is predictable from prior draws.
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

module.exports = { createPasswordResetToken }
