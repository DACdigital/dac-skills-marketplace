---
name: scout
description: Map a codebase for production readiness assessment — detect stack, topology, infrastructure, data layer, dependencies, security surface, tests, and documentation
---

# Skill: Scout

## Purpose
Map the entire codebase to produce a comprehensive manifest that all assessment skills depend on. This is the foundation — thoroughness here directly determines the quality of every downstream assessment.

## Input
- The root directory of the target codebase
- Mode: `deep` (default) | `shallow` (skip git history analysis, dependency deep-dive, and metric counting)

## Process

You are a senior engineering consultant performing initial discovery on a codebase you've never seen before. Your job is to produce a complete, accurate map that other specialists will use to assess production readiness. If you miss something, they won't check for it. Be exhaustive.

### Step 1 — Structural Survey

Scan the full directory tree. Identify:

- **Root markers**: README, LICENSE, CHANGELOG, .gitignore, .editorconfig, Makefile, justfile
- **Package manifests**: package.json, Cargo.toml, go.mod, pyproject.toml, requirements.txt, Gemfile, pom.xml, build.gradle, composer.json, mix.exs, pubspec.yaml, Package.swift, *.csproj, *.sln
- **Lock files**: package-lock.json, yarn.lock, pnpm-lock.yaml, Cargo.lock, poetry.lock, Pipfile.lock, Gemfile.lock, go.sum, composer.lock, mix.lock
- **Config files**: tsconfig.json, .babelrc, webpack.config.*, vite.config.*, next.config.*, nuxt.config.*, angular.json, .eslintrc*, .prettierrc*, biome.json, ruff.toml, .rubocop.yml, .golangci.yml, rustfmt.toml, clippy.toml, .formatter.exs, .credo.exs, phpunit.xml, phpstan.neon
- **Monorepo signals**: lerna.json, nx.json, turbo.json, pnpm-workspace.yaml, workspaces field in package.json, Cargo workspace members, multi-module Gradle/Maven

### Step 2 — Stack Detection

For each language/framework detected, record:

- **Language**: name, version (from config/runtime files), primary or secondary role
- **Framework**: name, version, type (web, API, CLI, library, mobile, desktop)
- **Package manager**: name, lock file present (yes/no)
- **Build tool**: name, config location
- **Runtime**: Node version (.nvmrc, .node-version, engines), Python version (.python-version, pyproject.toml), Ruby version (.ruby-version), Go version (go.mod), Rust edition (Cargo.toml), Java version (pom.xml, .java-version), Elixir version (.elixir-version, mix.exs), PHP version (composer.json require.php, .php-version)

Detect ALL of these if present — do not stop at the first language found. Many projects are polyglot.

### Step 3 — Topology Analysis

Determine the architecture:

- **Monolith**: single deployable unit, single entry point
- **Monorepo**: multiple packages/services in one repo (list each with its own stack)
- **Microservices**: multiple independently deployable services
- **Library/Package**: meant to be consumed by other code, not deployed standalone
- **Hybrid**: combination (e.g., monorepo with shared libraries and deployable services)

For each deployable unit, identify:
- Entry point(s) (main files, server startup, handler exports)
- Internal dependencies (which packages depend on which)
- Approximate boundary (directory path)

### Step 4 — Infrastructure Footprint

Scan for:

- **Containers**: Dockerfile, docker-compose.yml/.yaml, .dockerignore, container registry references
- **Orchestration**: Kubernetes manifests (*.yaml in k8s/kubernetes/deploy/helm dirs), Helm charts (Chart.yaml), docker-compose for orchestration, ECS task definitions, Nomad job files
- **IaC**: Terraform (.tf files, .terraform-lock.hcl), CloudFormation (template.yaml/json), Pulumi (Pulumi.yaml), CDK (cdk.json), Ansible, Chef, Puppet
- **CI/CD**: .github/workflows/*.yml, .gitlab-ci.yml, Jenkinsfile, .circleci/config.yml, .travis.yml, bitbucket-pipelines.yml, azure-pipelines.yml, .buildkite/, Earthfile, Dagger
- **Cloud provider signals**: AWS (aws-cdk, sam, .aws/), GCP (app.yaml, .gcloudignore, firebase.json), Azure (azure-*, .azure/), Vercel (vercel.json), Netlify (netlify.toml), Fly (fly.toml), Railway (railway.toml), Render (render.yaml), Heroku (Procfile, app.json)
- **Serverless**: serverless.yml, AWS SAM template, Vercel/Netlify functions directories, Cloudflare Workers (wrangler.toml)

### Step 5 — Data Layer

Identify all data stores:

- **Relational DBs**: PostgreSQL, MySQL, SQLite, MSSQL — look for connection strings, ORM configs (Prisma schema, Alembic, Knex, TypeORM, Sequelize, Django models, ActiveRecord, GORM, Diesel, Ecto, Entity Framework), migration directories
- **NoSQL**: MongoDB (mongoose, mongo connection), Redis (ioredis, redis-py), DynamoDB, Cassandra, CouchDB, Firestore
- **Search**: Elasticsearch, OpenSearch, Algolia, Meilisearch, Typesense
- **Message queues**: RabbitMQ, Kafka, SQS, Bull/BullMQ, Celery, Sidekiq, NATS, Pulsar
- **Caching**: Redis, Memcached, in-memory caches, CDN configs
- **Object storage**: S3, GCS, Azure Blob, MinIO references
- **Vector DBs**: Pinecone, Weaviate, Qdrant, Milvus, ChromaDB, pgvector

For each, record: type, connection mechanism, ORM/client library, migration system (if any).

### Step 6 — External Dependencies

Identify third-party integrations:

- **Auth providers**: Auth0, Clerk, Supabase Auth, Firebase Auth, Cognito, Keycloak, Okta
- **Payment**: Stripe, PayPal, Braintree, Adyen, Square
- **Email/SMS**: SendGrid, Mailgun, Postmark, Twilio, AWS SES, Resend
- **Analytics**: Segment, Mixpanel, Amplitude, Google Analytics, PostHog, Plausible
- **Error tracking**: Sentry, Bugsnag, Rollbar, Datadog, New Relic, Honeybadger
- **Monitoring/APM**: Datadog, New Relic, Grafana, Prometheus, OpenTelemetry, AWS CloudWatch
- **Feature flags**: LaunchDarkly, Unleash, Flagsmith, GrowthBook, ConfigCat, Split
- **AI/ML**: OpenAI, Anthropic, Hugging Face, Replicate, LangChain, LlamaIndex
- **Other SaaS**: any SDK imports, API base URLs, webhook handlers

Look in: imports, package manifests, environment variable names, config files, SDK initialization code.

### Step 7 — Security Surface

Map:

- **Auth implementation**: which libraries, middleware patterns, where auth is enforced
- **CORS configuration**: location and policy
- **Security headers**: middleware or config that sets them
- **Secrets management**: .env files, .env.example, vault references, AWS Secrets Manager, dotenv usage, secret scanning configs
- **Certificate/TLS references**: cert file paths, HTTPS enforcement, SSL termination signals
- **Security scanning**: Snyk, Dependabot, CodeQL, Trivy, Bandit, Brakeman, gosec, Sobelow (Elixir), phpstan-security configs

### Step 8 — Test Landscape

Discover:

- **Test directories**: test/, tests/, __tests__/, spec/, *_test.go, *_test.rs, test_*.py
- **Test frameworks**: Jest, Vitest, Mocha, Pytest, unittest, RSpec, Minitest, Go testing, Rust #[test], JUnit, NUnit, xUnit, PHPUnit, ExUnit
- **Test types present**: unit (test individual functions), integration (test systems together), e2e (Cypress, Playwright, Selenium, Puppeteer), contract (Pact), snapshot, visual regression
- **Coverage tools**: Istanbul/nyc, coverage.py, SimpleCov, go test -cover, tarpaulin, JaCoCo, ExCoveralls (Elixir), PCOV/Xdebug (PHP)
- **Test commands**: in package.json scripts, Makefile targets, CI pipeline test steps
- **Test configuration**: jest.config, pytest.ini, .rspec, vitest.config, test_helper.exs, phpunit.xml

### Step 9 — Documentation Inventory

Check for:

- **README**: exists, approximate quality (empty placeholder vs. comprehensive)
- **API docs**: OpenAPI/Swagger specs, GraphQL schema files, API Blueprint, Postman collections
- **Architecture docs**: docs/ directory, architecture decision records (ADR), diagrams (*.drawio, *.mermaid, *.puml)
- **Runbooks**: runbook/, playbook/, operations docs
- **Contributing guide**: CONTRIBUTING.md
- **Changelog**: CHANGELOG.md, HISTORY.md, releases
- **Code comments**: approximate density (light, moderate, heavy)
- **Type definitions**: .d.ts files, stub files (.pyi), type export files

### Step 10 — Codebase Metrics (skip in shallow mode)

Calculate:

- **Size**: total files, lines of code per language (use cloc/tokei if available, otherwise estimate from file counts)
- **Structure depth**: max directory nesting, widest directories
- **Contributors**: from git log (unique authors, active in last 90 days vs total)
- **Activity**: last commit date, commit frequency (daily/weekly/monthly), recent areas of change
- **Age**: first commit date, age of oldest and newest files

## Output

Write the scout report to: `vibeguard-reports/scout-report.md`

Read the exact template from `references/output-template.md` and follow it section by section. Every section must appear in the output — use "Not detected" or "No X detected" when a section has no findings. The template contains placeholder text in brackets — replace all of it with actual findings.

## Canonical Skill IDs

The Skill Relevance section of the output MUST use ONLY these exact skill IDs. The orchestrator reads this list literally and runs exactly the skills listed — any typo, abbreviation, or alias means a skill gets skipped or the wrong skill runs.

```
sec-secrets, sec-authentication, sec-authorization, sec-input-validation,
sec-dependencies, sec-crypto, sec-headers, sec-data-exposure,
sec-api-security, sec-supply-chain,

rel-error-handling, rel-config-hygiene, rel-health-checks, rel-resilience,
rel-logging, rel-concurrency, rel-dependency-health, rel-horizontal-scaling,
rel-event-reliability, rel-transaction-boundaries,

data-isolation, data-migrations, data-integrity, data-backup,
data-query-safety, data-privacy,

qual-test-existence, qual-test-coverage, qual-test-types, qual-linting,
qual-code-patterns, qual-documentation, qual-type-safety,

ops-ci-pipeline, ops-cd-pipeline, ops-containers, ops-orchestration,
ops-monitoring, ops-alerting, ops-iac, ops-environments,

perf-backend, perf-frontend, perf-database, perf-caching, perf-async,
perf-sync-blockers
```

## Critical Rules

1. **Never assume — only report what you find.** If you don't see evidence of something, report it as "Not detected." Don't infer that a project uses PostgreSQL just because it's a web app.
2. **File paths are sacred.** Every claim must have a file path. Skills will use these paths to navigate directly to relevant code.
3. **Be explicit about uncertainty.** If you find a database connection string but can't determine the DB type, say so.
4. **Monorepo awareness.** If the project is a monorepo, each package/service gets its own stack entry. Skills need to know which sub-project to assess.
5. **The Skill Relevance section is the most important output.** This directly controls which skills run. Be conservative — activate a skill if there's any signal, even weak. It's better to run an unnecessary skill than miss a real issue.
6. **Use EXACT canonical skill IDs.** The Skill Relevance section must use only IDs from the canonical list above. Never abbreviate, rename, or invent IDs. "sec-csrf" is not a valid ID — use `sec-api-security`. "rel-observability" is not a valid ID — use `rel-logging` and/or `ops-monitoring`.
7. **Shallow mode**: Skip Step 10 (Codebase Metrics). In all other steps, rely on file existence and config parsing only — do not read deep into source files, do not trace import graphs, do not analyze git history. Still be thorough about file discovery.
8. **Deep mode** (default): Read into source files, trace patterns, analyze git history, compute metrics. Take as long as needed. Quality over speed.
