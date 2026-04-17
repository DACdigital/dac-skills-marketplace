# dac-skills-marketplace

`dac-skills-marketplace` is a [Claude Code](https://code.claude.com) plugin marketplace that ships skills, commands, agents, and hooks used across DAC Digital's projects. It gives our teams (and anyone else who finds it useful) a single, versioned source of truth for Claude Code extensions — so engineers get the same tooling on every repo, upgrades propagate cleanly, and new plugins roll out through standard pull-request review.

The marketplace is a thin layer of JSON manifests over a `plugins/` directory. Each plugin is self-contained and installable on its own; the marketplace just catalogs them.

This project is maintained by **DAC Digital** and released as Open Source under the Apache 2.0 license. It is not a CNCF project; the README follows the CNCF project-template structure for clarity, nothing more.

## Plugins

| Plugin | Description |
|--------|-------------|
| [vibeguard](plugins/vibeguard/) | Production readiness assessment — security, reliability, data, quality, operations, performance |

## Getting Started

### Claude Code CLI — GitHub shorthand

```
/plugin marketplace add DACdigital/dac-skills-marketplace
/plugin install vibeguard@dac-skills-marketplace
```

### Claude Code CLI — git URL

Works with any git host; uses local git credentials.

```
/plugin marketplace add https://github.com/DACdigital/dac-skills-marketplace.git
/plugin marketplace add git@github.com:DACdigital/dac-skills-marketplace.git
/plugin install vibeguard@dac-skills-marketplace
```

### Auto-install per project

Drop into a project's `.claude/settings.json` so teammates get the marketplace and plugins on folder trust.

```json
{
  "extraKnownMarketplaces": {
    "dac-skills-marketplace": {
      "source": { "source": "github", "repo": "DACdigital/dac-skills-marketplace" }
    }
  },
  "enabledPlugins": ["vibeguard@dac-skills-marketplace"]
}
```

### Cowork desktop (org-managed)

Requires a private/internal GitHub repo and an Owner / Primary Owner on a Team or Enterprise plan:

1. Organization settings → Plugins
2. Connect GitHub → select `DACdigital/dac-skills-marketplace`
3. Set install preference per plugin: Installed by default / Available / Required / Not available

## Contributing

Contributions are welcome from anyone — DAC Digital employees and community contributors alike. See [CONTRIBUTING.md](CONTRIBUTING.md) for the plugin contribution flow, commit conventions, DCO sign-off, and PR checklist.

## Scope

### In Scope

`dac-skills-marketplace` is intended to distribute Claude Code plugins. It implements or will implement:

* Plugin manifest conventions (`.claude-plugin/plugin.json`, `marketplace.json`)
* Versioning and release process for shipped plugins
* Packaging of skills, slash commands, subagents, and hooks
* Install paths for CLI, project auto-install, and Cowork org-managed rollout
* Documentation for authoring and contributing new plugins

### Out of Scope

The marketplace is consumed by Claude Code and runs inside it; the following are therefore explicitly out of scope:

* The Claude Code runtime itself
* LLM hosting, inference, or model training
* Tooling unrelated to Claude Code plugins
* Plugin content that does not align with DAC Digital's engineering workflows

## Adding a new plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json` with `name`, `description`, `version`, `author`.
2. Add content under `plugins/<name>/skills/<skill-name>/SKILL.md` (or `commands/`, `agents/`, `hooks/hooks.json` — at plugin root, not inside `.claude-plugin/`).
3. Append an entry to `.claude-plugin/marketplace.json` under `plugins`.
4. Commit, open a PR. Once merged, users re-run `/plugin marketplace update dac-skills-marketplace`.

Keep `version` in `plugin.json` only — if set in both manifests, `plugin.json` wins silently.

## Repo layout

```
dac-skills-marketplace/
├── .claude-plugin/
│   └── marketplace.json          # marketplace manifest (name, owner, plugins list)
└── plugins/
    └── vibeguard/
        ├── .claude-plugin/
        │   └── plugin.json       # plugin manifest (name, version, author)
        └── skills/
            └── vibeguard/
                ├── SKILL.md      # skill entrypoint with frontmatter
                └── ...           # scout, skills, synthesizer, tools, references
```

## Communications

* **Bugs, feature requests, proposals:** [GitHub Issues](https://github.com/DACdigital/dac-skills-marketplace/issues)
* **Q&A, discussion:** [GitHub Discussions](https://github.com/DACdigital/dac-skills-marketplace/discussions)
* **Security reports:** see [SECURITY.md](SECURITY.md) — do not file public issues for vulnerabilities
* **Maintainers:** `security@dac.digital`

## Resources

* [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
* [Cowork org plugin management](https://support.claude.com/en/articles/13837433-manage-claude-cowork-plugins-for-your-organization)

## License

This project is licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE).
