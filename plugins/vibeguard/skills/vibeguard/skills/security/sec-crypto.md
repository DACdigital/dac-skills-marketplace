---
name: sec-crypto
description: Assess cryptographic practices — TLS, encryption at rest, key management, hashing, secure random generation
---

# Skill: sec-crypto

## Domain: Security
## Purpose
Assess cryptographic practices — TLS configuration, encryption at rest, key management, hashing algorithms, and secure random number generation.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Cryptographic failures sit at #2 in the OWASP Top 10. Using MD5 for password hashing means rainbow tables crack them in seconds. Using `Math.random()` for token generation means tokens are predictable. A hardcoded encryption key means the encryption is theater. ECB mode encryption preserves patterns in the plaintext. These are not theoretical — they're actively exploited. The fix is simple: use well-known libraries with safe defaults, never roll your own crypto.

### 1. TLS/Transport Security
- Is HTTPS enforced? (redirect HTTP→HTTPS, HSTS header, TLS-only configs)
- TLS version requirements — is TLS 1.2+ enforced? Any TLS 1.0/1.1 support?
- Certificate management — how are certs provisioned? (Let's Encrypt/ACME, manual, cloud-managed)
- Internal service communication — is TLS used between services? (mTLS, service mesh signals)
- Database connections — is `sslmode=require` or equivalent configured?
- Self-signed certificates in production configs (should be flagged)

### 2. Encryption at Rest
- Are sensitive fields encrypted before storage? (PII, payment data, health records)
- Database-level encryption signals (transparent data encryption config)
- File/object storage encryption (S3 bucket encryption, at-rest encryption config)
- What encryption algorithm is used? (AES-256 = good, DES/3DES/Blowfish = outdated)
- Encryption mode: GCM/CCM (authenticated encryption, good) vs ECB (bad) vs CBC (acceptable with HMAC)

### 3. Key Management
- Where are encryption keys stored? (Hardcoded = critical, env vars = medium, KMS/Vault = good)
- Key rotation — is there a mechanism for rotating keys?
- Separate keys for different purposes? (encryption, signing, API auth)
- Key derivation — if deriving keys from passwords, is PBKDF2/scrypt/Argon2 used?

### 4. Password & Credential Hashing
- Hashing algorithm: Argon2id/bcrypt/scrypt (good) vs SHA-256/SHA-1/MD5 (bad for passwords)
- Salt: unique per entry, cryptographically random?
- Work factor: bcrypt rounds ≥12, Argon2 memory/time parameters adequate?
- Any custom hashing implementations (almost always wrong — flag for review)

### 5. Secure Random Number Generation
- Cryptographic randomness for: session IDs, tokens, nonces, salts, OTPs
- Using `crypto.randomBytes`/`crypto.getRandomValues` (Node), `secrets` module (Python), `crypto/rand` (Go), `SecureRandom` (Java/Ruby) — not `Math.random()`, `random.random()`, or `rand()`
- UUID generation — UUIDv4 (random, good for tokens) vs UUIDv1 (time-based, predictable)

### 6. Digital Signatures & Verification
- JWT signing — algorithm strength, key management for signing keys
- Webhook signature verification — are incoming webhook signatures verified?
- Code/artifact signing signals
- Certificate pinning in mobile/desktop apps

### 7. Dangerous Patterns
- Rolling your own crypto (custom encryption/hashing implementations)
- Using `eval()` or `exec()` to process encrypted/encoded data
- Base64 used as "encryption" (it's encoding, not encryption)
- Hardcoded IVs/nonces (must be unique per encryption operation)
- Encryption without authentication (encrypt-then-MAC or use AEAD)

## How to Assess (by stack)

- **Node.js**: Check `crypto` module usage, `bcrypt`/`argon2` for passwords, `jose`/`jsonwebtoken` for JWTs, `helmet` for TLS headers
- **Python**: Check `cryptography` library, `hashlib` usage (context matters), `secrets` module, `passlib` for passwords, `bcrypt`
- **Go**: Check `crypto/*` packages, `golang.org/x/crypto`, bcrypt usage, TLS config in `http.Server`
- **Ruby**: Check `bcrypt-ruby`, `openssl`, Rails encrypted credentials, `ActiveSupport::MessageEncryptor`
- **Java**: Check `javax.crypto`/`java.security`, `BCryptPasswordEncoder` (Spring), `KeyStore` usage
- **.NET**: Check `System.Security.Cryptography`, `DataProtection` API, `PasswordHasher`
- **Elixir/Phoenix**: Check `:crypto` module, `Comeonin`/`Bcrypt`/`Argon2` for passwords, `Phoenix.Token` signing, `Plug.Crypto`, `:ssl` config
- **PHP/Laravel**: Check `openssl_*` functions, `sodium_crypto_*`, `Hash` facade, `Crypt` facade, `config/hashing.php`, `HTTPS` enforcement
- **Rust**: Check `ring`, `rustls`, `argon2`, `bcrypt` crates

## Shallow Mode
Config and dependency checks only — no source code tracing:
- Is a proper password hashing library present? (bcrypt, argon2, scrypt — not raw SHA/MD5)
- Is TLS configured in deployment/server config? (Check for `ssl`, `tls`, `https` in config files)
- Is HTTPS enforced? (Check for redirect config, HSTS header setup)
- Search config files for obvious hardcoded keys or weak algorithm names (`DES`, `MD5`, `SHA1`, `ECB`)

## Deep Mode (default)
All of Shallow Mode, plus:
- Trace all encryption/hashing calls: search for `encrypt`, `decrypt`, `hash`, `digest`, `sign`, `verify` and check algorithm parameters
- Review key storage: search for encryption keys and check where they come from (hardcoded = CRITICAL, env var = acceptable, KMS/Vault = good)
- Search for non-cryptographic random: `Math.random()`, `random.random()`, `rand()` used for security-sensitive values
- Check TLS in all service connections: database `sslmode`, Redis TLS, HTTP client configs for internal services
- Analyze JWT signing: algorithm, key strength, key storage
- Search for custom crypto implementations: anything that implements encryption/hashing from primitives instead of using a library

## Severity Guide
- **CRITICAL**: MD5/SHA1 for password hashing, hardcoded encryption keys, no TLS on sensitive connections, ECB mode encryption, custom crypto implementation
- **HIGH**: No HTTPS enforcement, weak bcrypt rounds (<10), `Math.random()` for security-critical values, missing salt, TLS 1.0/1.1 supported
- **MEDIUM**: No encryption at rest for PII, no key rotation mechanism, self-signed certs in production config, no mTLS between services
- **LOW**: No certificate automation, missing HSTS preload, no webhook signature verification

## Output
Write report to: `vibeguard-reports/skill-reports/sec-crypto.md`
Follow the output contract at `references/skill-output-contract.md`.
