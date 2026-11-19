# AI, Smart Contracts & Low-Level Security Reference

Baseline: **OWASP Top 10 for LLM Applications (2025)**, **OWASP Smart Contract Top 10 (2026)**, **C/C++ Memory Safety**.

## 1. LLM Application Security (OWASP LLM Top 10 2025)
- **Prompt Injection (LLM01):** User inputs alter the behavior of the LLM. Direct (jailbreaks) or Indirect (processing untrusted external data). Remediate with input sanitization, deterministic output validation (guardrails), and strict privilege control.
- **Excessive Agency (LLM06):** Granting the LLM unchecked autonomy to invoke external tools or APIs. Remediate with human-in-the-loop approvals for sensitive actions, least-privilege tool scopes.
- **Improper Output Handling (LLM05):** Downstream applications executing LLM-generated code without sanitization, leading to XSS, SSRF, or RCE. Remediate with a zero-trust approach to LLM outputs.
- **Sensitive Information Disclosure (LLM02):** The LLM leaks confidential training data, proprietary algorithms, or user PII.

## 2. Smart Contracts & Web3 (DeFi)
- **Reentrancy Attacks (SC08):** External calls hijacking control flow to recursively drain contract funds before state is updated. Remediate with Checks-Effects-Interactions (CEI) pattern and mutex locks (ReentrancyGuard).
- **Price Oracle Manipulation (SC03):** Skewing reference prices on an AMM to enable under-collateralized borrowing (often via Flash Loans). Remediate using decentralized, time-weighted average price (TWAP) oracles.
- **Arithmetic Errors (SC07):** Precision loss and rounding errors in share and interest calculations, siphoning protocol value.
- **Access Control (SC01):** Failure to restrict sensitive functions (e.g., selfdestruct, minting) via modifiers like `onlyOwner`.

## 3. Low-Level Architecture & Memory Safety (C/C++, Node.js Native Addons)
- **Use-After-Free (UAF) and Double-Free:** Accessing or writing to a dangling pointer, or calling `free()` twice on the same memory address, corrupting the heap and allowing RCE.
- **Memory Leaks (Alloc-Free Imbalance):** Allocations that are never deallocated, leading to Out of Memory (OOM) crashes. Ensure all error-handling paths properly release resources.
- **Buffer Overflows:** Writing data beyond the strict bounds of an allocated array, hijacking instruction pointers. Remediate by using bounds-checked functions and modern memory-safe constructs (or languages like Rust).
