# choreo config

The plugin reads one file per project: `<project root>/.claude/choreo.json`. Set the env variable
`CHOREO_CONFIG` to use another path. Start from `choreo.config.example.json` and replace every
`<...>` placeholder. The plugin shows a toast while a placeholder is left.

The file is read when the coordinator session starts. After a change, start a new session or run
`/reload-plugins`. `mcp__choreo__list` shows which file was read, in its `config` field.

Keys that start with `$` are notes. The plugin ignores them. A missing file means the defaults.

Keep the file out of git if it holds anything private. It holds no secrets: tokens stay in env
variables.

## Top level

| Key | Default | What it does |
|---|---|---|
| `coordinatorName` | `Choreographer` | The session name workers report to. Name the coordinator session the same (`/rename`). |
| `projectRoot` | the session root | Absolute path of the main repo. The plugin is off in sessions outside it. |
| `baseBranch` | empty | Branch new worktrees start from. Empty: `origin/HEAD`, then `origin/main`, then `origin/master`. |
| `trustWorktrees` | `true` | Mark each worktree the plugin creates as trusted in `~/.claude.json`, so the worker does not stop at the trust prompt. Only paths under the project root. |
| `scratchDir` | `scratchpad` | Folder under the project root for visuals (images, crops, PDFs to look at) and the scripts that build them. Every worker is told to put them there, not in its worktree. The plugin creates it at the first launch and adds it to the root repo's `.git/info/exclude`. An empty string turns the rule off. |
| `repos` | `[]` | The repos workers may start in, as `{ "path", "about" }`. `"."` is the project root. Any other path is relative to the root. The launch tool lists them for the coordinator. |
| `workerRules` | `[]` | Extra lines added to every worker's rules. Use it for standing project rules, for example "Ask the coordinator for the GPU before any run on it." |
| `tracker` | `{ "type": "none" }` | Fills the My tasks tab. See below. |
| `git` | `{ "host": "none" }` | Adds the merge or pull request tabs. See below. |

## Worktrees

`mcp__choreo__launch` takes `repo`:

- `"."`: the worktree goes to `<root>/.claude/worktrees/<name>`.
- `"a/b"`: a git repo at `<root>/a/b`. Its worktree is the sibling folder `<root>/a/b-<name>`.

An existing local or remote branch is checked out. Otherwise a new branch starts from the base
branch. Add `.claude/worktrees/` and the sibling folders to `.gitignore` if git would see them.

## tracker

| Key | Used with | What it does |
|---|---|---|
| `type` | all | `none`, `plane`, `github` or `command`. |
| `url` | plane | Base URL of the Plane instance, no trailing slash. |
| `workspace` | plane | The workspace slug, as in the Plane URL. |
| `projectId` | plane | The project UUID. |
| `apiKeyEnv` | plane | Name of the env variable with the Plane API key. Default `PLANE_API_KEY`. |
| `githubRepos` | github | Repos whose issues assigned to you are listed. Empty: the repo of the project root. |
| `command` | command | Any shell command that prints the JSON array described in `bin/tracker_example.sh`. |
| `flow` | all | Rules for the buttons on each item. See below. |

The tracker runs every 5 minutes and on `/choreo`, in the project root, with a 60 second
timeout. `$CHOREO_BIN` points to the plugin's `bin/` folder while it runs.

- `plane` lists open work items assigned to the API key's user. Items in completed or cancelled
  states are left out. The key is `<PROJECT IDENTIFIER>-<number>`.
- `github` lists open issues assigned to you, through the `gh` CLI. An issue with the label
  `in progress` shows under "In progress", the others under "Open".
- `command` is for any other tracker (Jira, Linear, a file). Write a small script. Read tokens
  from the environment.

### flow

`flow` is a list of rules. For each item the first rule that matches decides its buttons. A rule
matches when every condition it has holds:

- `states`: the item's state is one of these names.
- `label`: the item has this label.

Each rule has `actions`. Each action is one button:

| Key | What it does |
|---|---|
| `label` | The button text. |
| `kind` | `spec`, `plan`, `develop`, `review` or `fix`: the button fills the prompt with "Prepare a `<kind>` worker for `<key>`: `<brief>` ..." for the coordinator. `comments`: walks you through the open comments of the item's merge or pull request. `prompt`: fills the prompt with `brief` as it is. |
| `brief` | What the worker must do. `{key}` and `{title}` are replaced with the item's. |

The first action is the primary button. Every item also gets "attach <worker>" when a worker has
its key, and "open <MR>" when a merge or pull request has the key in its title or branch.

An item no rule matches gets one "start worker" button.

Put label rules before state rules. Example: a `hotfix` label rule first, so a hotfix in Todo
gets the hotfix buttons, not the spec buttons.

## git

| Key | Used with | What it does |
|---|---|---|
| `host` | all | `none`, `gitlab` or `github`. |
| `githubRepos` | github | Repos to watch, as `owner/repo`. Empty: the repo of the project root. |
| `gitlabUrl` | gitlab | Base URL of your GitLab. Default `https://gitlab.com`. |
| `gitlabGroup` | gitlab | Group path or id. Scopes the lists to that group. The Unassigned tab needs it. |

- GitHub uses the `gh` CLI. Log in with `gh auth login`.
- GitLab uses REST v4. Put a personal access token with the `api` scope in the env variable
  `GITLAB_TOKEN`. The plugin reads that name only.

The lists refresh every minute. The plugin writes to the host only after a button press that you
confirm: set a reviewer (Take, Assign, then Yes), or resolve or reopen one thread.
