# Install choreo

This file is for a Claude Code agent. Follow the steps in order. Each step ends with a check. Do
not go on until the check passes. If a check fails, tell the user what failed and stop.

Ask the user one question at a time. Never write a secret (token, password, API key) into a
file. Secrets stay in env variables the user sets in their shell profile.

In the commands below:

- `<PROJECT>` is the absolute path of the user's main repo, the project root.
- `<PLUGIN_DIR>` is the folder Claude Code installed the plugin into. Step 3 finds it.

The plugin comes from the marketplace `dac-skills-marketplace`, the GitHub repo
`DACdigital/dac-skills-marketplace`.

## 1. Check the requirements

```bash
claude --version
python3 --version
git --version
git -C <PROJECT> remote get-url origin
git ls-remote https://github.com/DACdigital/dac-skills-marketplace.git HEAD
claude plugin test --help
claude agents --help
claude respawn --help
```

Check:

- Every command exits 0.
- Claude Code is 2.1.300 or newer. The plugin was tested on 2.1.300. Older builds may lack
  function hooks (`claude plugin test`) or background sessions (`claude agents`,
  `claude respawn`, `claude --bg`).
- The project has a remote named `origin`. Worktrees start from it.
- `git ls-remote` reaches the marketplace repo on GitHub. If it fails, the machine has no access
  to github.com. Tell the user and stop.

Then ask the user which parts they want. The plugin works without any of them.

1. "Which git host shows your merge or pull requests: GitLab, GitHub, or none?"
   - GitHub needs the `gh` CLI, logged in: `gh auth status` exits 0.
   - GitLab needs a personal access token with the `api` scope in the env variable
     `GITLAB_TOKEN`. Check without printing it: `test -n "$GITLAB_TOKEN" && echo set`.
2. "Which tracker holds your tasks: Plane, GitHub issues, another one, or none?"
   - Plane needs an API key in an env variable, by default `PLANE_API_KEY`.
   - GitHub issues need `gh`, as above.
   - Another tracker needs a small script. See step 4.

The plugin talks to the tracker and the git host through REST and the `gh` CLI. It needs no MCP
server. Workers do get every server in the project's `.mcp.json` approved at launch, so a tracker
MCP server there is available to them.

## 2. Install from the marketplace

Add the marketplace once per user, then install the plugin with local scope in the project. Local
scope loads it only in this project, and only for this user.

```bash
claude plugin marketplace add DACdigital/dac-skills-marketplace
cd <PROJECT>
claude plugin install choreo@dac-skills-marketplace --scope local
```

The same at the prompt of a Claude Code session in `<PROJECT>`:

```
/plugin marketplace add DACdigital/dac-skills-marketplace
/plugin install choreo@dac-skills-marketplace
```

In the interactive install, pick the local scope.

Check: `claude plugin list` shows `choreo@dac-skills-marketplace` as enabled, version 0.1.0.

The install writes `"enabledPlugins": { "choreo@dac-skills-marketplace": true }` into
`<PROJECT>/.claude/settings.local.json`. Check that this file is gitignored:
`git -C <PROJECT> check-ignore .claude/settings.local.json` prints the path.

The plugin has no hooks or MCP entries of its own in `settings.json`. Its tools
(`mcp__choreo__*`), the `/choreo` and `/comments` commands, the pane and the
`choreo:choreographer` skill all come with the plugin.

To update later: `claude plugin marketplace update dac-skills-marketplace`, then
`claude plugin update choreo@dac-skills-marketplace`.

## 3. Find and check the installed plugin

Run `claude plugin list` and read the "Read from" line of
`choreo@dac-skills-marketplace`. That folder is
`<PLUGIN_DIR>`. It is usually `~/.claude/plugins/cache/dac-skills-marketplace/choreo/0.1.0`.

```bash
claude plugin validate <PLUGIN_DIR>
claude plugin test <PLUGIN_DIR>
```

Check: validate ends with "Validation passed" (warnings are fine). All tests pass.

## 4. Fill the config

```bash
cp <PLUGIN_DIR>/choreo.config.example.json <PROJECT>/.claude/choreo.json
```

Edit `<PROJECT>/.claude/choreo.json` with the user's answers. Every field is explained in
`<PLUGIN_DIR>/CONFIG.md`. Read it first.

1. `coordinatorName`: keep `Choreographer` unless the user wants another name.
2. `repos`: list the git repos workers may work in. `"."` is `<PROJECT>`. A nested or sibling
   repo is a path relative to `<PROJECT>`. Ask the user what each holds, in a few words.
3. `scratchDir`: keep `scratchpad` unless the user names another folder for visuals and their
   build scripts. The plugin git-excludes it in `.git/info/exclude`, so it needs no `.gitignore` line.
4. `workerRules`: ask "Is there a rule every worker must follow? For example: ask the coordinator
   before using the GPU." Delete the placeholder if not.
5. `tracker`: set `type`, then the fields for that type. Delete the fields of the other types.
   - `plane`: `url`, `workspace` (the slug in the Plane URL), `projectId` (the project UUID),
     `apiKeyEnv`.
   - `github`: `githubRepos`, or `[]` for the repo of `<PROJECT>`.
   - `command`: write a script that prints the JSON described in
     `<PLUGIN_DIR>/bin/tracker_example.sh`. Put it outside the repo, for example
     `~/.local/bin/choreo-tracker`. Read tokens from env variables.
   - `none`: delete the other tracker fields.
6. `tracker.flow`: ask the user which states their items go through and which button each state
   should offer (spec, plan, develop, review comments). Write one rule per group of states. Put
   label rules (for example `hotfix`) first. If the user does not care, delete `flow`: every item
   then gets one "start worker" button.
7. `git`: set `host`, then `githubRepos` or `gitlabUrl` and `gitlabGroup`.

Check that no placeholder is left and the file parses:

```bash
grep -n '"<' <PROJECT>/.claude/choreo.json ; python3 -m json.tool <PROJECT>/.claude/choreo.json > /dev/null && echo parses
```

Check: the grep prints nothing (lines starting with `"$` are notes and may stay), and the last
command prints `parses`.

Test the tracker, if one is set. For `plane`:

```bash
cd <PROJECT> && python3 -I <PLUGIN_DIR>/bin/tracker_plane.py <url> <workspace> <projectId> PLANE_API_KEY | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d), "items"); print(d[:1])'
```

For `github`: `python3 -I <PLUGIN_DIR>/bin/tracker_github.py <owner/repo>`. For
`command`: run the command. Check: it prints a JSON array. Show the user the first item and ask
if it looks right.

Make git ignore what the plugin creates:

```bash
cd <PROJECT>
git check-ignore -q .claude/choreo.json || echo ".claude/choreo.json" >> .gitignore
git check-ignore -q .claude/worktrees/x || echo ".claude/worktrees/" >> .gitignore
```

Show the user the `.gitignore` change. They decide whether to commit it. A worktree of a nested
repo goes to `<repo>/.worktrees/<worker name>`. The mod git-excludes that folder in the repo's
`.git/info/exclude`, so it needs no `.gitignore` line.

## 5. Set up messaging

Workers and the coordinator talk through Claude Code's cross-session messages. The tools are
`SendMessage` and `ListAgents`. They are built into Claude Code 2.1.300. Nothing is installed
for them.

What must hold:

1. **The coordinator runs in auto mode.** Never in bypassPermissions. A message passes unasked
   only between sessions of the same permission class. Bypass is one class. Auto, default and
   acceptEdits are the other. Workers run in the second class. A bypass coordinator gets every
   worker message held for approval. Set auto for the project:

   ```json
   { "permissions": { "defaultMode": "auto" } }
   ```

   Merge it into `<PROJECT>/.claude/settings.local.json`. Or switch with shift+tab in the session.
2. **The coordinator's session name equals `coordinatorName`.** Workers send to that name.
   Start it with `claude -n Choreographer`, or run `/rename Choreographer` in it.
3. **Workers accept the coordinator's messages.** The plugin starts each worker with
   `--settings '{"crossSessionInbound":"accept","enabledMcpjsonServers":[...]}'`. Only a CLI flag
   or the user's own `~/.claude/settings.json` can set `crossSessionInbound`. A project file
   cannot. Nothing to do here.
4. **Start the coordinator from a normal shell.** The plugin stays off in a session whose env holds
   `CHOREO_WORKER` (set for workers) and in any folder under `.claude/worktrees/` or `.worktrees/`.

Check (after step 6, inside the coordinator session): run `ToolSearch` with
`select:SendMessage,ListAgents`. Both tools load.

## 6. Start the Choreographer session

Tell the user to run, in a new terminal:

```bash
cd <PROJECT>
claude -n Choreographer
```

In that session:

1. Switch to auto mode if it is not the default (shift+tab).
2. Run `/choreo:choreographer`. The skill checks the name and mode, calls `mcp__choreo__list`,
   and creates the two routines with `CronCreate`:
   - worker health check, `*/5 * * * *`
   - Waiting-tab check, `7,27,47 * * * *`
3. Run `/choreo`. The pane opens on the Waiting tab.

Check:

- `CronList` shows the two jobs.
- `mcp__choreo__list` returns JSON whose `config` field names `<PROJECT>/.claude/choreo.json`.
  If it says "no config", the file is not where the plugin looks. Fix the path.
- The pane shows the tabs: Waiting, Fleet, and My tasks or the git tabs when those are set.

The routines live as long as the session. In every new coordinator session, run
`/choreo:choreographer` again.

## 7. Smoke test: a worker reports to the coordinator

In the Choreographer session ask:

> Launch a worker with mcp__choreo__launch: kind "develop", repo ".", name "smoke-test", task
> "Change no files. 1. Send one status message to the coordinator. 2. Send one question: 'Is
> this a test?' with your recommendation 'yes'. 3. Wait for the answer. 4. When it comes, send
> done and stop."

Check each step:

1. The tool answers "Launched smoke-test (bg <id>) in <PROJECT>/.claude/worktrees/smoke-test on
   develop/smoke-test".
2. Within two minutes Fleet shows `smoke-test` with its status message. This proves a worker's
   report reaches the coordinator.
3. A card from `smoke-test` appears in Waiting with "Is this a test?". A toast says it asks.
4. Type "yes" in the card's reply box and press Enter. The card leaves Waiting. The toast says
   "Queued for smoke-test". This proves the coordinator's message reaches the worker.
5. Fleet shows `smoke-test` as `done` with its summary.
6. Ask the coordinator: "Stop smoke-test, then send it 'one more status please'." The send
   respawns or resumes it, and a new status arrives in Fleet. This proves a stopped worker can
   be reached.
7. Clean up: ask the coordinator to stop and forget `smoke-test`. Then:

   ```bash
   cd <PROJECT>
   git worktree remove .claude/worktrees/smoke-test
   git branch -D develop/smoke-test
   ```

If no message arrives in step 2:

- `claude agents --json` lists the worker. `claude logs <id>` shows what it does.
- If the worker sits on a permission prompt or a startup dialog, run `claude attach <id>` and
  answer it.
- If the coordinator is in bypass mode, the message is held. Switch to auto and approve the
  held message.
- Do not resend a held message. Approve it in the receiving session, or respawn the worker.

Tell the user the setup is done. Show them `<PLUGIN_DIR>/README.md` for daily use.

## 8. Uninstall

```bash
cd <PROJECT>
claude plugin uninstall choreo@dac-skills-marketplace --scope local
rm <PROJECT>/.claude/choreo.json
```

Remove the marketplace only if no other project uses a plugin from it:

```bash
claude plugin marketplace remove dac-skills-marketplace
```

In the Choreographer session, delete the two routines with `CronDelete` (ids from `CronList`),
or end the session.

What stays: worker worktrees and branches (`git worktree list`, then `git worktree remove
<path>`), session transcripts under `~/.claude/projects/`, the trust entries the plugin added for
worktrees in `~/.claude.json`, and the `.gitignore` lines from step 4.
