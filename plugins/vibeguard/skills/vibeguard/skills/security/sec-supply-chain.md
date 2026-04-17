---
name: sec-supply-chain
description: Assess supply chain security — lock files, version pinning, integrity verification, CI/CD pipeline security
---

# Skill: sec-supply-chain

## Domain: Security
## Purpose
Assess supply chain security — lock files, version pinning, integrity verification, build reproducibility, and CI/CD pipeline security.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Supply chain attacks are rising fast — attackers compromise a popular package and every downstream project is affected. The event-stream attack hit 8M downloads/week. The ua-parser-js compromise hijacked 7M weekly installs to run crypto miners. A missing lock file means any `npm install` could pull a compromised version. A `curl | bash` in CI runs arbitrary code from the internet. These aren't theoretical — they happen regularly and at scale.

### 1. Lock Files
- Are lock files committed to version control? (CRITICAL if missing — builds aren't reproducible)
- Lock file type matches package manager: `package-lock.json` for npm, `yarn.lock` for Yarn, `pnpm-lock.yaml` for pnpm, etc.
- Are lock files up to date with manifest files? (No drift between `package.json` and lock)
- Are there multiple conflicting lock files? (e.g., both `package-lock.json` and `yarn.lock`)

### 2. Version Pinning
- **Direct dependencies**: Are versions pinned exactly (`1.2.3`) or using ranges (`^1.2.3`, `~1.2.3`, `>=1.0.0`)?
- **Docker base images**: Are images pinned by digest (`sha256:...`) or tag? Tags can be overwritten.
- **CI/CD actions**: Are GitHub Actions, GitLab CI includes, etc. pinned by SHA or by tag? (Tags can be hijacked)
- **Terraform providers**: Are provider versions pinned with `required_providers`?
- **Build tools**: Are build tool versions pinned? (`.tool-versions`, `.nvmrc`, `rust-toolchain.toml`)

### 3. Integrity Verification
- **npm/yarn**: Do lock files contain integrity hashes? (SHA-512 checksums)
- **Subresource Integrity (SRI)**: For CDN-loaded scripts, are `integrity` attributes present?
- **Checksum verification**: For manually downloaded binaries in CI, are checksums verified?
- **GPG signature verification**: For packages that support it, are signatures verified?

### 4. Build Reproducibility
- Can the build be reproduced from a clean checkout? (All dependencies specified, no implicit system deps)
- Are build outputs deterministic? (Same inputs → same outputs)
- Is the build environment documented? (Required system packages, runtime versions)
- Are there any `curl | bash` install patterns in build scripts or CI? (Runs arbitrary code)

### 5. CI/CD Pipeline Security
- **Secrets in CI logs**: Are secrets masked? Are build logs scrubbed?
- **Untrusted code execution**: Do CI pipelines run on PRs from forks? (Can access secrets?)
- **CI action security**: Are third-party CI actions from trusted sources? Pinned by SHA?
- **Artifact integrity**: Are build artifacts signed or checksummed?
- **Pipeline permissions**: Is the CI runner scoped minimally? (Not running as root, not having write access to production)
- **Environment variable exposure**: Are secrets available to all jobs or scoped to specific stages?
- **Pull request privileges**: Can PRs modify CI config? (Allows injecting malicious build steps)

### 6. Registry Security
- **Private registries**: Is there a private npm/PyPI/Maven registry? Is it properly authenticated?
- **Registry proxying**: Is there a proxy/cache (Artifactory, Nexus, Verdaccio) for supply chain control?
- **Package scoping**: Are organization-scoped packages used to prevent typosquatting? (`@org/package`)
- **`.npmrc`/`.pypirc` security**: Are registry credentials in these files? Are they in `.gitignore`?

### 7. Post-Install Scripts
- **npm lifecycle scripts**: `postinstall`, `preinstall` scripts in dependencies (can run arbitrary code)
- **Python setup.py**: `setup.py` with custom install commands
- **Allowlisting**: Is there a mechanism to allowlist which packages can run install scripts?

## How to Assess (by stack)

- **Node.js**: Check lock file, `.npmrc`, `package.json` scripts, `npm audit signatures`, CI action pinning
- **Python**: Check lock file (poetry.lock, Pipfile.lock, requirements.txt with hashes), `pip --require-hashes`, CI config
- **Go**: Check `go.sum` (built-in integrity), `GONOSUMCHECK`, `GONOSUMDB`, `GOPRIVATE`
- **Rust**: Check `Cargo.lock`, `cargo-vet`/`cargo-crev` for supply chain review
- **Ruby**: Check `Gemfile.lock`, `.gemrc`, bundler config
- **Elixir/Phoenix**: Check `mix.lock` integrity, Hex package checksums, `mix deps.compile --force` in CI, Mix task security
- **PHP/Laravel**: Check `composer.lock` integrity, `--no-scripts` flag, Composer plugin allow-list, `composer audit`
- **Docker**: Check base image pinning, multi-stage builds, `COPY --from` with pinned images
- **CI/CD**: Check GitHub Actions `uses:` for SHA pinning, GitLab includes, CircleCI orbs

## Shallow Mode
File and config existence checks only — no deep analysis:
- Are lock files committed? (Check for their presence in the repo, not just on disk)
- Are Docker base images pinned by digest or at least specific tag (not `:latest`)?
- Are CI actions pinned by SHA? (Check `.github/workflows/*.yml` `uses:` lines)
- Search CI/build scripts for `curl | bash`, `wget | sh`, `curl | python` patterns
- Are there conflicting lock files? (Both `package-lock.json` and `yarn.lock`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Verify lock files contain integrity hashes (SHA-512/SHA-256 checksums)
- Analyze CI pipeline configuration for secret exposure: are secrets available to fork PR builds? Are logs masked?
- Check all external dependency sources: CDN-loaded scripts (SRI?), manually downloaded binaries (checksum verified?), private registries
- Review post-install scripts in direct dependencies: search `package.json` for `postinstall`/`preinstall` hooks in node_modules
- Assess build reproducibility: can the project be built from a clean checkout with only declared dependencies?
- Check for organization-scoped packages to prevent typosquatting

## Severity Guide
- **CRITICAL**: No lock files committed, `curl | bash` in CI/build without verification, CI secrets accessible to fork PRs, post-install scripts executing network calls in dependencies
- **HIGH**: Docker base images using mutable tags (`:latest`), CI actions pinned by mutable tags, no integrity hashes in lock files, secrets in CI logs
- **MEDIUM**: Version ranges instead of exact pins for critical dependencies, no SRI on CDN scripts, no private registry for organization packages
- **LOW**: Build not fully reproducible, no artifact signing, no `cargo-vet`/supply chain review tooling

## Output
Write report to: `vibeguard-reports/skill-reports/sec-supply-chain.md`
Follow the output contract at `references/skill-output-contract.md`.
