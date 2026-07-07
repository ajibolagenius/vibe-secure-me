# Mobile Security Reference

Baseline: **OWASP Mobile Top 10 (2024)**, **OWASP MASVS/MASTG**.

## 1. Improper Credential Usage / Hardcoded Secrets (M1; CWE-798)
- **Root cause:** Hardcoded API keys/credentials in the app binary; credentials handled insecurely. Binaries are decompilable.
- **Remediation:** Never ship secrets in the client; fetch short-lived tokens from a backend; store tokens in Keychain (iOS)/Keystore (Android); use attestation (Play Integrity API).

## 2. Insecure Data Storage (M9; CWE-312)
- **Root cause:** Sensitive data in plaintext `SharedPreferences`/`UserDefaults`/SQLite/files.
- **Remediation:** iOS Keychain (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`) / Secure Enclave; Android Keystore (hardware-backed) + `EncryptedSharedPreferences`; SQLCipher (AES-256) for local DBs.

## 3. Insecure Communication / Cert Pinning (M5; CWE-295)
- **Root cause:** Cleartext traffic; disabled/soft cert validation (accepting self-signed/invalid certs).
- **Remediation:** Enforce TLS 1.2+/1.3; never disable validation; consider SPKI public-key pinning (with backup pins and rotation plans) using Network Security Config or URLSession delegate.

## 4. IPC: Deep Links, Intents, Universal Links (M8; CWE-926)
- **Root cause:** Over-exported components; unvalidated intent extras; intent redirection; deep-link/URL-scheme hijacking.
- **Attack scenario:** Malicious app sends a crafted intent forwarded by a proxy component to a protected component, enabling data theft. Or WebView XSS via deep link parameters.
- **Remediation:** Set `exported=false` by default; require signature-level permissions; validate/sanitize intent data; verify redirect targets against an allowlist; use App Links / Universal Links with host verification (Digital Asset Links).

## 5. Insufficient Binary Protections (M7; CWE-919)
- **Root cause:** No obfuscation, anti-tampering, or integrity checks.
- **Remediation:** Obfuscation (R8/ProGuard); integrity/anti-tamper checks; Play Integrity API (Android) / DeviceCheck/App Attest (iOS); root/jailbreak detection. Keep logic server-side.

## 6. React Native Specifics
- **Root cause:** Secrets in JS bundle (extractable); insecure `AsyncStorage` (unencrypted); insecure bridge.
- **Remediation:** Use `react-native-keychain` / encrypted storage; keep secrets server-side; validate deep links; sign/verify OTA updates (CodePush integrity).
