# Web Vulnerabilities (OWASP Top 10)

## Cross-Site Scripting (XSS)
- **Never use `dangerouslySetInnerHTML`** or equivalent functions without heavily sanitizing the input first (using a library like DOMPurify). 
- Avoid directly manipulating the DOM using user input.
- Always escape user input when rendering outside of framework-provided safe methods (e.g., in raw HTML strings or template literals used as HTML).

```tsx
// BAD: Direct injection of user input
<div dangerouslySetInnerHTML={{ __html: userProvidedHTML }} />

// GOOD: Sanitized before rendering
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userProvidedHTML) }} />
```

## Cross-Site Request Forgery (CSRF)
- Use CSRF tokens for all state-changing operations (POST, PUT, DELETE) unless you rely strictly on `Authorization: Bearer` headers combined with strict CORS policies.
- **SameSite Cookies:** Always set `SameSite=Lax` or `SameSite=Strict` on session cookies to prevent the browser from sending them during cross-origin POST requests.

## Server-Side Request Forgery (SSRF)
- If your application fetches data from URLs provided by the user (e.g., link previews, webhooks), **restrict the allowed domains**.
- Block requests to internal IP addresses (e.g., `127.0.0.1`, `169.254.169.254` (cloud metadata), `10.x.x.x`, `192.168.x.x`).

```typescript
// BAD: Fetching arbitrary user-provided URL
const response = await fetch(req.body.url);

// GOOD: Validating domain before fetching
const url = new URL(req.body.url);
if (!ALLOWED_DOMAINS.includes(url.hostname)) {
  throw new Error("Invalid domain");
}
const response = await fetch(url.toString());
```

## Cross-Origin Resource Sharing (CORS)
- **Do not use `Access-Control-Allow-Origin: *`** for authenticated endpoints. 
- Explicitly define allowed origins based on environment (e.g., `https://myapp.com` in production).
- Avoid reflecting the `Origin` header dynamically without validation.

## Clickjacking
- Implement the `X-Frame-Options: DENY` or `SAMEORIGIN` header.
- For modern browsers, set the Content Security Policy (CSP) `frame-ancestors` directive to restrict where your app can be framed.
