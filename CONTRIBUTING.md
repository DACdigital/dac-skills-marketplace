# Contributing to dac-skills-marketplace

Thanks for your interest in contributing! This project welcomes issues, pull requests, and new plugin proposals from DAC Digital engineers and community contributors alike.

We expect respectful, professional conduct in all project spaces (issues, PRs, discussions). Harassment, discrimination, or hostile behavior is not tolerated — maintainers will act on reports at their discretion.

## Ways to contribute

* **Report a bug** — open a [GitHub Issue](https://github.com/DACdigital/dac-skills-marketplace/issues) with reproduction steps and the Claude Code version you're on.
* **Suggest a feature or new plugin** — open a [GitHub Discussion](https://github.com/DACdigital/dac-skills-marketplace/discussions) so we can scope it before you invest implementation effort.
* **Improve an existing plugin** — PR against the plugin's directory under `plugins/<name>/`.
* **Add a new plugin** — follow the flow below.
* **Fix docs / typos** — small PRs welcome, no issue required.

For security vulnerabilities, **do not open a public issue** — see [SECURITY.md](SECURITY.md).

## Development setup

No build step. The repo is JSON manifests + Markdown. To work on a plugin locally:

1. Clone the repo.
2. Point Claude Code at your working copy:
   ```
   /plugin marketplace add /absolute/path/to/dac-skills-marketplace
   /plugin install <plugin>@dac-skills-marketplace
   ```
3. Edit files under `plugins/<name>/`. Re-run `/plugin marketplace update dac-skills-marketplace` after changes to manifests.

## Adding a new plugin

1. Create the plugin manifest at `plugins/<name>/.claude-plugin/plugin.json`:
   ```json
   {
     "name": "<name>",
     "description": "<one-line description>",
     "version": "0.1.0",
     "author": { "name": "DAC Digital" }
   }
   ```
2. Add content at the plugin root (not inside `.claude-plugin/`):
   * `skills/<skill-name>/SKILL.md` — skill with frontmatter
   * `commands/<name>.md` — slash commands
   * `agents/<name>.md` — subagents
   * `hooks/hooks.json` — hooks
3. Register the plugin by appending an entry to `.claude-plugin/marketplace.json` under `plugins`.
4. Test the install flow end-to-end against your local checkout.
5. Open a PR.

Keep `version` in `plugin.json` only. If it appears in both `plugin.json` and `marketplace.json`, `plugin.json` wins silently.

## Pull request process

1. Fork the repo (external contributors) or push a topic branch (maintainers).
2. Make your changes on a focused branch — one logical change per PR.
3. Run through the checklist below.
4. Open a PR with a clear description of what and why. Link related issues.
5. Address review feedback. Maintainers will merge once approved.

### PR checklist

* [ ] Plugin tested locally against a real Claude Code install
* [ ] `plugin.json` version bumped if behavior changed (semver)
* [ ] `marketplace.json` updated if adding or renaming a plugin
* [ ] Docs updated (plugin README, this repo's README if install flow changed)
* [ ] Commits are signed-off (see DCO below)

## Commit conventions

We recommend [Conventional Commits](https://www.conventionalcommits.org/) — not enforced, but appreciated:

```
feat(vibeguard): add performance-budget check
fix(marketplace): correct plugin source path
docs: clarify Cowork install steps
```

Keep commit messages concise. One subject line + optional body. Prefer present-tense imperative ("add", "fix", "remove").

## Developer Certificate of Origin (DCO)

All contributions must be signed off to certify you wrote the code (or otherwise have the right to submit it) under the project's license. The DCO is a lightweight alternative to a CLA — see [developercertificate.org](https://developercertificate.org/) for the full text.

Sign off commits with the `-s` flag:

```
git commit -s -m "feat(vibeguard): add performance-budget check"
```

This appends `Signed-off-by: Your Name <you@example.com>` to the commit message.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

## Questions?

Open a [Discussion](https://github.com/DACdigital/dac-skills-marketplace/discussions) or reach maintainers at `security@dac.digital`.
