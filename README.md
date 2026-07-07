# Vibe Secure Me

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Vibe Secure Me** is a comprehensive, framework-agnostic security auditor plugin for Google Antigravity. It is designed to audit codebases for common vulnerabilities introduced by AI coding assistants in "vibe-coded" applications, as well as complex enterprise attack vectors across web, API, mobile, cloud, low-level architecture, and agentic AI platforms.

## Features

- **Automated Security Scanning Simulation:** Acts as a specialized security expert to review your architecture and code.
- **OWASP Alignment:** Maps to authoritative baselines including OWASP Top 10, API Security Top 10, Mobile Top 10, and LLM Applications Top 10.
- **Deep Architectural Review:** Looks beyond surface-level issues to find broken access controls (BOLA/IDOR), business logic flaws, and race conditions.
- **Remediation Guidance:** Provides concrete secure-code remediation examples without outputting exploitative payloads.

## Installation

You can install this plugin directly from your terminal using the Antigravity CLI (`agy`):

```bash
agy plugin install https://github.com/ajibolagenius/vibe-secure-me.git
```

## Usage

Once installed, simply ask Antigravity to run a security audit using the `secure-me` skill. For example:

- *"Run a security audit on this project using the `secure-me` skill."*
- *"Check the security of my authentication flow with `secure-me`."*
- *"Audit the new payment logic and ensure there are no business logic flaws."*

The agent will leverage the skill's comprehensive checklist to analyze your project's codebase, returning a prioritized list of findings ranging from Critical to Low severity.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
