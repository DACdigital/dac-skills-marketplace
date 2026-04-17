# dac-skills-marketplace

DAC Digital's Claude Code plugin marketplace. Ships skills, commands, agents, and hooks that the team uses across projects.

## Plugins

| Plugin | Description |
|--------|-------------|
| [vibeguard](plugins/vibeguard/) | Production readiness assessment — security, reliability, data, quality, operations, performance |

## Install

### Claude Code CLI — GitHub shorthand

```
/plugin marketplace add dac-digital/dac-skills-marketplace
/plugin install vibeguard@dac-skills-marketplace
```

### Claude Code CLI — git URL (GitLab, HTTPS or SSH)

Works with any git host. Uses local git credentials.

```
/plugin marketplace add https://gitlab.dac.digital/dacdigital/dac-skills-marketplace.git
/plugin marketplace add git@gitlab.dac.digital:dacdigital/dac-skills-marketplace.git
/plugin install vibeguard@dac-skills-marketplace
```

### Auto-install per project

Drop into project's `.claude/settings.json` so teammates get the marketplace and plugins on folder trust.

GitHub source:

```json
{
  "extraKnownMarketplaces": {
    "dac-skills-marketplace": {
      "source": { "source": "github", "repo": "dac-digital/dac-skills-marketplace" }
    }
  },
  "enabledPlugins": ["vibeguard@dac-skills-marketplace"]
}
```

Git URL source (GitLab):

```json
{
  "extraKnownMarketplaces": {
    "dac-skills-marketplace": {
      "source": { "source": "git", "url": "https://gitlab.dac.digital/dacdigital/dac-skills-marketplace.git" }
    }
  },
  "enabledPlugins": ["vibeguard@dac-skills-marketplace"]
}
```

### Cowork desktop (org-managed)

Requires a private/internal GitHub repo. Owner / Primary Owner on Team or Enterprise plan:

1. Organization settings → Plugins
2. Connect GitHub → select `dac-digital/dac-skills-marketplace`
3. Set install preference per plugin: Installed by default / Available / Required / Not available

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

## Adding a new plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json` with `name`, `description`, `version`, `author`.
2. Add skill content under `plugins/<name>/skills/<skill-name>/SKILL.md` (or `commands/`, `agents/`, `hooks/hooks.json` as needed — at plugin root, not inside `.claude-plugin/`).
3. Append an entry to `.claude-plugin/marketplace.json` under `plugins`.
4. Commit and push. Users re-run `/plugin marketplace update dac-skills-marketplace`.

Keep `version` in `plugin.json` only — if set in both, `plugin.json` wins silently.

## Docs

- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Cowork org plugin management](https://support.claude.com/en/articles/13837433-manage-claude-cowork-plugins-for-your-organization)
