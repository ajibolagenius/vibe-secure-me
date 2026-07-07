# Cryptography Best Practices

## Password Hashing
- **Never store passwords in plain text or use fast/weak hashing algorithms** like MD5, SHA-1, or even standard SHA-256. These can be easily brute-forced using rainbow tables or GPUs.
- Always use a slow, memory-hard hashing algorithm specifically designed for passwords, such as **Argon2, bcrypt, or scrypt**.

```typescript
// BAD: Weak, fast hashing
import crypto from 'crypto';
const hash = crypto.createHash('md5').update(password).digest('hex');

// GOOD: Using bcrypt
import bcrypt from 'bcrypt';
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);
```

## Predictable Random Numbers
- **Never use `Math.random()` for anything security-related** (e.g., generating session IDs, reset tokens, or passwords). It is deterministic and highly predictable.
- Use a Cryptographically Secure Pseudorandom Number Generator (CSPRNG).

```typescript
// BAD: Predictable token
const resetToken = Math.random().toString(36).substring(2);

// GOOD: Cryptographically secure token
import crypto from 'crypto';
const resetToken = crypto.randomBytes(32).toString('hex');
```

## Encryption
- Do not roll your own cryptography. Use established, well-vetted libraries (like `libsodium` or the built-in Node `crypto` module).
- When encrypting sensitive data at rest or in transit, use authenticated encryption modes (like AES-GCM or ChaCha20-Poly1305). Modes like ECB or CBC without proper MACs are vulnerable to tampering and padding oracle attacks.
