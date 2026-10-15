# choreo

choreo is a Claude Code plugin. One session, the coordinator ("Choreographer"), runs other Claude
Code sessions in the background. These are the workers.

- Each worker gets its own git worktree and branch.
- Workers report to the coordinator with short tagged messages.
- Their questions and the coordinator's own questions land in one Waiting tab.
- You answer and steer every worker from one pane, `/choreo`.
- Workers never push or post. Every outward action comes back to you through the coordinator.

Install at the prompt of a Claude Code session in your project:

```
/plugin marketplace add DACdigital/dac-skills-marketplace
/plugin install choreo@dac-skills-marketplace
```

Then follow [INSTALL.md](INSTALL.md) from step 3. Config: [CONFIG.md](CONFIG.md).

## What is in the folder

| Path | What it is |
|---|---|
| `.claude-plugin/plugin.json` | The manifest. |
| `hooks/register.tsx` | The plugin: tools, pane, band above the prompt, message handling. |
| `hooks/*.test.tsx` | Tests, run with `claude plugin test`. |
| `types/index.d.ts` | The types of the plugin's state. |
| `skills/choreographer/SKILL.md` | The coordinator's instructions and its two routines. |
| `bin/` | Helpers: worktree trust, MCP approval, session list, tracker adapters. |
| `choreo.config.example.json` | The config template. |

## Usage

In the coordinator session run `/choreo:choreographer` once. It checks the session name and
mode, and starts the two routines. Then open the pane with `/choreo`. Tabs:

- **Waiting**: the default tab. One list, oldest first. The coordinator's decision cards, with
  option buttons and a free answer. The workers' questions, with reply, handled, ask Claude and
  copy attach.
- **Fleet**: every worker, busiest first. Its state, last message, a message box, and copy
  attach, stop and forget.
- **My tasks**: when a tracker is set. Grouped by state. The buttons follow `tracker.flow`.
- With a git host: **My MRs** (or PRs), **To review** and **Unassigned**. Press a title for its
  threads. `b` back, `o` open in the browser, `c` copy the link.

`/comments <number>` walks you through the open comments on one of your merge or pull requests,
one at a time. Nothing is posted before you approve the exact text.

A line above the prompt shows what waits on you and how many workers are active. Press it to
open the pane.

## Coordinator tools

| Tool | What it does |
|---|---|
| `mcp__choreo__launch` | Start a worker in a new worktree. |
| `mcp__choreo__adopt` | Add a past or running session to the roster. |
| `mcp__choreo__sessions` | List recent sessions of the project, to adopt one. |
| `mcp__choreo__send` | Send a message to a worker. Respawns or resumes a stopped one. |
| `mcp__choreo__ask` | Put a decision for you in Waiting. |
| `mcp__choreo__list` | Roster, open questions, tracker items and the config file in use. |
| `mcp__choreo__stop` | Stop a worker. It stays in the roster. |
| `mcp__choreo__forget` | Remove a worker from the roster. Files stay. |
| `mcp__choreo__resolve` | Mark a waiting question as handled. |

## Messages between sessions

Workers start every message with a tag:

```
[choreo <name> status] short progress note
[choreo <name> question] a decision, with a recommendation
[choreo <name> blocked] what stops the worker
[choreo <name> done] summary, commits, what is left
```

`question` and `blocked` go to Waiting. `status` and `done` update Fleet. Untagged messages are
left alone.

- Run the coordinator in **auto** mode, not bypassPermissions. Sender and receiver must be in the
  same permission class, or the message is held for approval. Bypass is one class. Auto, default
  and acceptEdits are the other. Workers run in the second class.
- Workers start with `--settings '{"crossSessionInbound":"accept", ...}'`, so they take the
  coordinator's messages unasked.
- A held message is not lost. Do not send it again. Approve it in the receiving session
  (`claude attach <id>`), or respawn the worker.
- `claude respawn <id>` brings a stopped worker back under the same id. `claude --bg --resume`
  makes a copy under a new id. The plugin follows the new id.

## Limits

- Claude Code has no per-sender filter. Any local session can send a tagged message.
- The tests use made-up data. They do not run real `claude`, `gh`, GitLab or Plane calls.
- On GitHub an approval counts while it is the reviewer's latest verdict.
