# File Upload Security

## Extension and MIME Type Validation
- **Do not rely on the client-provided file extension or `Content-Type` header.** Both can be easily spoofed.
- Use a library (e.g., `file-type` in Node.js) to inspect the actual "magic bytes" of the file to determine its true type.
- Maintain a strict **allowlist** of permitted extensions and MIME types. Never use a denylist.

```typescript
// BAD: Trusting the file name from the client
if (!file.name.endsWith('.jpg')) throw new Error('Only JPGs allowed');

// GOOD: Checking magic bytes
import { fileTypeFromBuffer } from 'file-type';
const type = await fileTypeFromBuffer(fileBuffer);
if (type?.mime !== 'image/jpeg') throw new Error('Only JPGs allowed');
```

## Malware and Antivirus Scanning
- Treat all uploaded files as untrusted. If you are accepting PDFs, DOCX, or executables, pass them through a malware scanner (e.g., ClamAV) before persisting them or sharing them with users.

## Size Limits
- Always enforce strict maximum file sizes on the server. Do not rely on client-side constraints.
- Without size limits, attackers can exhaust your server's disk space or cloud storage budget (Denial of Wallet).

## Serving Uploaded Files (XSS Risk)
- **Do not serve user-uploaded files from your main application domain.** If an attacker uploads an HTML or SVG file containing JavaScript, and you serve it on `myapp.com`, it will execute in the context of your application (Stored XSS).
- Serve uploads from a separate, sandboxed domain (e.g., `myapp-usercontent.com`).
- Always serve user-uploaded files with the `Content-Disposition: attachment` header, or enforce a strict `Content-Security-Policy` to prevent script execution.
