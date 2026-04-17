# Security Policy

## Supported versions

| Component | Supported |
|-----------|-----------|
| `dac-skills-marketplace` (this repo, `main` branch) | Yes |
| Plugins shipped from this repo, latest version | Yes |
| Older plugin versions | No — please upgrade |

The marketplace itself is a rolling release: only the current `main` is supported.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via one of:

* Email: **`security@dac.digital`**
* GitHub [private vulnerability reporting](https://github.com/DACdigital/dac-skills-marketplace/security/advisories/new)

Please include:

* A description of the issue and its impact
* Steps to reproduce (a minimal example is ideal)
* The affected plugin and version (`plugin.json`), or commit SHA of the marketplace
* Any known mitigations or workarounds
* Your preferred credit / attribution (or anonymous, if you prefer)

## Response SLA

We aim for:

* **Acknowledgement:** within 3 business days
* **Initial triage and severity assessment:** within 7 business days
* **Fix and coordinated disclosure:** within 90 days of the initial report

If a fix requires longer, we will communicate the timeline and reasons to the reporter.

## Scope

**In scope:**

* The marketplace manifest and install flow (`.claude-plugin/marketplace.json`, plugin manifests)
* Content shipped from `plugins/` in this repository (skills, commands, agents, hooks)
* Documentation that could mislead users into insecure configurations

**Out of scope:**

* The [Claude Code](https://code.claude.com) runtime itself — report upstream to Anthropic
* Vulnerabilities in third-party tools referenced by plugins but not shipped here
* Social-engineering, phishing, or physical-access attacks against DAC Digital

## Disclosure

Once a fix is released, we will publish a GitHub Security Advisory with the affected versions, fixed versions, and (with the reporter's consent) credit.

## Questions

Non-vulnerability security questions (hardening guidance, install-flow concerns) are welcome in [GitHub Discussions](https://github.com/DACdigital/dac-skills-marketplace/discussions).
