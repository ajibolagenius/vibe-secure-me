# Advanced & Emerging Threats

This section covers critical vulnerabilities that are often overlooked by automated scanners because they rely on complex business logic, timing, or language-specific quirks.

## Business Logic Errors
Automated tools cannot understand the intended behavior of an application. 
- **Parameter Tampering:** Ensure negative amounts cannot be processed (e.g., transferring `-100` dollars to increase an account balance).
- **State Machine Bypasses:** Ensure a user cannot skip mandatory steps in a workflow (e.g., moving directly from a cart to the confirmation page without visiting the payment page).

## Race Conditions / TOCTOU (Time-of-Check to Time-of-Use)
A race condition occurs when an application checks a condition (e.g., "does the user have a coupon?"), and then executes an action based on it, but the state changes in the split-second between the check and the action.
- **Limit Overruns:** Attackers can send 50 simultaneous requests to redeem a single-use coupon. If not synchronized, all 50 threads might pass the "check" before the first one completes the "use" (deletion).
- **Mitigation:** Use database transactions, row-level locking (e.g., `SELECT ... FOR UPDATE`), or atomic operations (e.g., Redis `DECR`) to handle concurrency securely.

## Prototype Pollution (JavaScript Specific)
Prototype pollution occurs when an attacker can inject properties into `Object.prototype`. Since almost all JavaScript objects inherit from this prototype, the injected properties are accessible globally.
- **The Exploit:** If an attacker passes `{"__proto__": {"isAdmin": true}}` to a vulnerable deep-merge or clone function, they can set `isAdmin` to true across the entire application.
- **Mitigation:** Use `Object.create(null)` for plain maps, freeze the prototype with `Object.freeze(Object.prototype)`, or use `Map` structures instead of plain objects for key-value storage. Validate and strip `__proto__` or `constructor.prototype` keys in any merge logic.

## Insecure Deserialization
When an application takes untrusted serialized data (e.g., a serialized Java object, PHP object, or Python Pickle) and restores it without validation, an attacker can manipulate the serialized data to alter application logic or execute arbitrary code (RCE).
- **Mitigation:** Avoid native serialization formats for untrusted data. Use pure data formats like JSON. If you must deserialize, use cryptographic signatures (e.g., HMAC) to verify the data hasn't been tampered with before deserializing.

## Server-Side Template Injection (SSTI)
SSTI occurs when user input is unsafely embedded directly into a template engine (e.g., Jinja2, Twig, Pug, Handlebars). Attackers can inject template directives to execute code on the server.
- **Mitigation:** Pass user input to the template as context variables, never as part of the template string itself.

## HTTP Request Smuggling
This occurs when a frontend server (like a load balancer or reverse proxy) and a backend server interpret the boundaries of an HTTP request differently (e.g., one looks at `Content-Length`, the other at `Transfer-Encoding`). 
- **The Exploit:** An attacker can "smuggle" a second request inside the first one, which the backend will process as if it belonged to the next user in the queue.
- **Mitigation:** Ensure frontend and backend servers use consistent, strict HTTP parsing, or ideally upgrade all hops to HTTP/2.

## Web Cache Poisoning
An attacker manipulates a server's cache by sending requests with unkeyed inputs (e.g., custom HTTP headers like `X-Forwarded-Host`) that cause the server to generate and cache a malicious response (like an XSS payload). This malicious response is then served to subsequent legitimate users.
- **Mitigation:** Strictly limit which headers influence the application's response and cache keys, and ensure caching layers do not blindly cache responses containing unvalidated dynamic input.
