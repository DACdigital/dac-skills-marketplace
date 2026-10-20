import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ask, Assign, Detail, Inbox, Member, Mr, Task, Thread, Worker, WorkerKind } from '../types'


const PANE = 'choreo'
const TAG = /\[choreo\s+(\S+)\s+(status|question|blocked|done)\]\s*([\s\S]*)/
const KINDS = ['spec', 'plan', 'develop', 'review', 'fix']

// ---- Config: <session root>/.claude/choreo.json, or the file named in env CHOREO_CONFIG ----
// See choreo.config.example.json and CONFIG.md. Read at each session.start. A missing file
// means the defaults: no tracker, no git host, the session root as the project root

// One rule for the My tasks buttons: items in these states (or with this label) get these buttons
export type FlowAction = { label: string; kind: WorkerKind | 'comments' | 'prompt'; brief?: string }
export type FlowRule = { states?: string[]; label?: string; actions: FlowAction[] }

let ME = 'Choreographer'
let ROOT = ''
let BASE = ''
let TRUST = true
let TRACKER_CMD = ''
// Repos the coordinator may launch workers in: "." is the project root, others are relative to it
let REPOS: { path: string; about: string }[] = []
// Extra lines added to every worker's rules, e.g. a rule for a shared GPU
let EXTRA_RULES: string[] = []
let FLOW: FlowRule[] = []
// Folder for visuals and the scripts that build them, relative to the project root and
// git-excluded there. Empty: no such rule
let SCRATCH = 'scratchpad'
// Where the config came from, or why it did not load
let configNote = 'no config loaded yet'
// Off outside the project root, inside a worker, and inside a worktree folder
let isOn = false

export function applyConfig(c: any) {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const t = c?.tracker ?? {}
  const g = c?.git ?? {}
  ME = s(c?.coordinatorName) || 'Choreographer'
  ROOT = s(c?.projectRoot).replace(/\/+$/, '')
  BASE = s(c?.baseBranch)
  TRUST = c?.trustWorktrees !== false
  REPOS = (Array.isArray(c?.repos) ? c.repos : [])
    .filter((r: any) => r && typeof r.path === 'string')
    .map((r: any) => ({ path: String(r.path), about: s(r.about) }))
  EXTRA_RULES = (Array.isArray(c?.workerRules) ? c.workerRules : []).filter((r: unknown): r is string => typeof r === 'string')
  const scratch = typeof c?.scratchDir === 'string' ? c.scratchDir.trim().replace(/^\.?\/+|\/+$/g, '') : 'scratchpad'
  SCRATCH = scratch.split('/').includes('..') || scratch.startsWith('/') ? 'scratchpad' : scratch
  FLOW = (Array.isArray(t.flow) ? t.flow : []).filter((r: any) => r && Array.isArray(r.actions))
  TRACKER_CMD = trackerCommand(t)
  HOST = g.host === 'github' || g.host === 'gitlab' ? g.host : 'none'
  GH_REPOS = (Array.isArray(g.githubRepos) ? g.githubRepos : []).map((r: unknown) => String(r).trim()).filter(Boolean)
  GL_URL = (s(g.gitlabUrl) || 'https://gitlab.com').replace(/\/+$/, '')
  GL_GROUP = s(g.gitlabGroup)
  gitMe = null
  teamFor = ''
  membersError = null
  rechecks = 0
}

// The shell command that prints the tracker items. The built-in types run a script in bin/
// with the config's values as arguments. Tokens stay in the environment
function trackerCommand(t: any): string {
  const arg = (v: unknown) => quote(typeof v === 'string' ? v : '')
  switch (t.type) {
    case 'command':
      return typeof t.command === 'string' ? t.command.trim() : ''
    case 'github':
      return `python3 -I "$CHOREO_BIN/tracker_github.py" ${arg((Array.isArray(t.githubRepos) ? t.githubRepos : []).join(','))}`
    case 'plane':
      return `python3 -I "$CHOREO_BIN/tracker_plane.py" ${arg(t.url)} ${arg(t.workspace)} ${arg(t.projectId)} ${arg(t.apiKeyEnv || 'PLANE_API_KEY')}`
    default:
      return ''
  }
}

async function loadConfig($: $, cwd: string) {
  const root = (await $.session.root().catch(() => '')) || cwd
  const path = (await $.env.get('CHOREO_CONFIG')) || `${root}/.claude/choreo.json`
  let raw: any = {}
  try {
    const text = String(await $.fs.read(path))
    raw = JSON.parse(text)
    configNote = `config ${path}`
    // A value still holding a <PLACEHOLDER> from the example file
    if (/"<[^"]*>"/.test(text.replace(/"\$[^"]*"\s*:\s*"[^"]*"/g, ''))) $.ui.toast(`choreo: ${path} still has <...> placeholders`)
  } catch (err) {
    const isThere = await $.fs.exists(path).catch(() => false)
    configNote = isThere ? `config ${path} did not parse: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}` : `no config at ${path}, defaults in use`
    if (isThere) $.ui.toast(`choreo: ${configNote}`)
  }
  applyConfig(raw)
  if (!ROOT) ROOT = root
}

const ROSTER = { plugin: 'choreo', key: 'roster' } as const
const INBOX = { plugin: 'choreo', key: 'inbox' } as const
const TASKS = { plugin: 'choreo', key: 'tasks' } as const
const TASKS_AT = { plugin: 'choreo', key: 'tasksAt' } as const
const roster = atom(ROSTER, [])
const inbox = atom(INBOX, [])
const tasks = atom(TASKS, [])
const tasksAt = atom(TASKS_AT, 0)
const TAB = { plugin: 'choreo', key: 'tab' } as const
const tab = atom(TAB, 'waiting')

type $ = EngineInterface

// The store is shared by every project the mod runs in, so each key carries the project root
const stored = (key: string) => (ROOT ? `${key}@${ROOT}` : key)

async function save($: $) {
  await $.store.set(stored('roster'), await read($, roster))
  await $.store.set(stored('inbox'), await read($, inbox))
}

async function upsert($: $, name: string, patch: Partial<Worker>) {
  await update($, roster, list => {
    const now = Date.now()
    const found = list.some(w => w.name === name)
    return found
      ? list.map(w => (w.name === name ? { ...w, ...patch, updatedAt: now } : w))
      : [...list, { name, item: '', kind: 'develop', task: '', cwd: ROOT, state: 'new', ...patch, updatedAt: now } as Worker]
  })
  await save($)
}

async function find($: $, name: string) {
  return (await read($, roster)).find(w => w.name === name)
}

function sh(cmd: string) {
  return ['bash', '-lc', cmd]
}

function quote(s: string) {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

// A branch name part from free text: lower case, safe characters only
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'task'
}

// A task that opens with a slash command keeps it on the first line, so the session runs it
function preamble(w: Pick<Worker, 'name' | 'item' | 'kind' | 'task'>) {
  const m = w.task.match(/^(\/\S+[^\n]*)\n?([\s\S]*)$/)
  if (m) return `${m[1]}\n\n${rules({ ...w, task: (m[2] ?? '').trim() || '(see the command above)' })}`
  return rules(w)
}

function rules(w: Pick<Worker, 'name' | 'item' | 'kind' | 'task'>) {
  return [
    `You are a worker session named "${w.name}". The session "${ME}" coordinates you for the person in charge.`,
    `Item: ${w.item || 'none'}. Kind: ${w.kind}.`,
    '',
    'Rules:',
    '- Work only in your current directory (your git worktree). Follow CLAUDE.md and AGENTS.md there if they exist.',
    '- Never push, open or comment on pull or merge requests, write to the tracker, or post to chat. When you reach such a step, send the draft to the coordinator and wait.',
    `- Report with SendMessage to "${ME}". Start every message with one tag:`,
    `  [choreo ${w.name} status] short progress note`,
    `  [choreo ${w.name} question] a decision you need, with your recommendation`,
    `  [choreo ${w.name} blocked] what stops you and what you need`,
    `  [choreo ${w.name} done] a short summary, commit hashes, what is left`,
    '- Keep messages short. Answers come back to you as messages from the coordinator.',
    ...(SCRATCH ? [`- Put visuals (images, crops, PDFs to look at) and the scripts that build them in ${ROOT}/${SCRATCH}/, not in your worktree. That folder is git-excluded. Never commit it.`] : []),
    ...EXTRA_RULES.map(r => `- ${r}`),
    '',
    'Task:',
    w.task,
  ].join('\n')
}

// What a worker is started with: messages from the coordinator accepted unasked, and the
// project's .mcp.json servers approved. Only a CLI flag or user settings can set the first
function workerSettings(servers: string[]) {
  return JSON.stringify({ crossSessionInbound: 'accept', enabledMcpjsonServers: servers })
}

async function bgIdFrom(out: string) {
  const m = out.match(/\b([0-9a-f]{8})\b/)
  return m?.[1]
}

async function agentsJson($: $): Promise<any[]> {
  const r = await $.process.run(['claude', 'agents', '--json', '--all'], { timeoutMs: 20000 })
  try {
    return JSON.parse(r.stdout)
  } catch {
    return []
  }
}

async function refresh($: $) {
  const live = await agentsJson($)
  const list = await read($, roster)
  let isChanged = false
  const next = list.map(w => {
    // The background id first: a resumed worker runs under a new id and a new session id,
    // and the stopped run it came from stays listed as failed
    const hit = (w.bgId && live.find(a => a.id === w.bgId)) || (w.sessionId && live.find(a => a.sessionId === w.sessionId))
    if (!hit) return w
    const state = String(hit.state ?? hit.status ?? w.state)
    const sessionId = hit.sessionId ?? w.sessionId
    // An adopted or resumed worker learns its background id here, so respawn can reach it
    const bgId = hit.kind === 'background' && hit.id ? String(hit.id) : w.bgId
    if (state === w.state && sessionId === w.sessionId && bgId === w.bgId) return w
    isChanged = true
    return { ...w, state, sessionId, bgId, updatedAt: Date.now() }
  })
  if (isChanged) {
    await $.state.set(ROSTER, next)
    await save($)
  }
  await showStatus($)
}

// The user's tracker items, from the tracker command. Its stdout is a JSON array of
// { key, title, state, url?, labels?, rank?, priority? }. A failure keeps the last list and says so
const PRIORITY = ['urgent', 'high', 'medium', 'low', 'none']

async function refreshTasks($: $) {
  if (!TRACKER_CMD) return
  try {
    const r = await $.process.run(sh(TRACKER_CMD), { ...(ROOT ? { cwd: ROOT } : {}), timeoutMs: 60000, env: { CHOREO_BIN: `${$.plugin.root}/bin` } })
    if (r.exitCode !== 0) throw new Error(r.stderr.trim().slice(0, 120) || `exit ${r.exitCode}`)
    const raw = JSON.parse(r.stdout)
    if (!Array.isArray(raw)) throw new Error('the output is not a JSON array')
    const found: Task[] = raw
      .filter((t: any) => t && t.key && t.title)
      .map((t: any) => ({
        key: String(t.key),
        title: String(t.title),
        state: String(t.state ?? 'open'),
        url: t.url ? String(t.url) : undefined,
        labels: Array.isArray(t.labels) ? t.labels.map(String) : [],
        rank: typeof t.rank === 'number' ? t.rank : undefined,
        priority: t.priority ? String(t.priority) : undefined,
      }))
    const prio = (t: Task) => (t.priority && PRIORITY.includes(t.priority) ? PRIORITY.indexOf(t.priority) : PRIORITY.length)
    found.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || prio(a) - prio(b) || a.key.localeCompare(b.key, undefined, { numeric: true }))
    await $.state.set(TASKS, found)
    await $.state.set(TASKS_AT, Date.now())
    await $.store.set(stored('tasks'), found)
  } catch (err) {
    $.ui.toast(`choreo: the tracker command failed: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`)
  }
}

async function showStatus($: $) {
  const list = await read($, roster)
  const asks = (await read($, inbox)).filter(a => !a.isResolved)
  if (list.length === 0 && asks.length === 0) return $.ui.status(undefined)
  const busy = list.filter(w => /running|busy|working/.test(w.state)).length
  $.ui.status(`choreo ${busy}/${list.length} active${asks.length ? ` · ${asks.length} waiting on you` : ''}`)
}

// Approves the .mcp.json servers a worker folder sees, in its gitignored local settings,
// and trusts the folder as the trust prompt would. Returns the approved server names
async function approveMcp($: $, dir: string): Promise<string[]> {
  const r = await $.process.run(['python3', '-I', `${$.plugin.root}/bin/approve_mcp.py`, dir], { timeoutMs: 20000 })
  if (TRUST) await $.process.run(['python3', '-I', `${$.plugin.root}/bin/trust.py`, dir, ROOT], { timeoutMs: 20000 })
  if (r.exitCode !== 0) return []
  return r.stdout.split(',').map(s => s.trim()).filter(Boolean)
}

// "." is the project root repo, its worktree under .claude/worktrees/. Any other value is a
// git repo relative to the root, its worktree under <repo>/.worktrees/, git-excluded there
function worktreePaths(repo: string, name: string) {
  const r = (repo || '.').replace(/^\.\//, '').replace(/\/+$/, '') || '.'
  if (r.startsWith('/') || r.split('/').includes('..')) throw new Error(`repo must be "." or a path inside ${ROOT}, got ${repo}`)
  if (r === '.') return { repoDir: ROOT, path: `${ROOT}/.claude/worktrees/${name}` }
  return { repoDir: `${ROOT}/${r}`, path: `${ROOT}/${r}/.worktrees/${name}`, exclude: '/.worktrees/' }
}

// The scratch folder exists and the project root's git ignores it, through .git/info/exclude
async function ensureScratch($: $) {
  if (!SCRATCH || !ROOT) return
  const cmd = [
    `cd ${quote(ROOT)}`,
    `mkdir -p ${quote(SCRATCH)}`,
    'ex=$(git rev-parse --git-path info/exclude) || exit 0',
    'mkdir -p "$(dirname "$ex")"',
    `grep -qxF ${quote(`/${SCRATCH}/`)} "$ex" 2>/dev/null || echo ${quote(`/${SCRATCH}/`)} >> "$ex"`,
  ].join('\n')
  await $.process.run(sh(cmd), { timeoutMs: 20000 })
}

async function worktreeFor($: $, repo: string, name: string, branch: string) {
  const { repoDir, path, exclude } = worktreePaths(repo, name)
  const cmd = [
    `cd ${quote(repoDir)}`,
    // The repo's git ignores its worktree folder, through .git/info/exclude
    ...(exclude
      ? [
          'ex=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$ex")" &&',
          `{ grep -qxF ${quote(exclude)} "$ex" 2>/dev/null || echo ${quote(exclude)} >> "$ex"; }`,
        ]
      : []),
    'git fetch -q origin',
    `if [ -d ${quote(path)} ]; then exit 0; fi`,
    // The base: the configured branch, else origin/HEAD, else origin/main, else origin/master
    `base=${quote(BASE)}`,
    'if [ -n "$base" ] && git show-ref -q --verify "refs/remotes/origin/$base"; then base="origin/$base"; fi',
    'if [ -z "$base" ]; then base=$(git symbolic-ref -q --short refs/remotes/origin/HEAD); fi',
    'if [ -z "$base" ]; then if git show-ref -q --verify refs/remotes/origin/main; then base=origin/main; else base=origin/master; fi; fi',
    `if git show-ref -q --verify refs/heads/${quote(branch)}; then git worktree add -q ${quote(path)} ${quote(branch)};`,
    `elif git show-ref -q --verify refs/remotes/origin/${quote(branch)}; then git worktree add -q --track -b ${quote(branch)} ${quote(path)} origin/${quote(branch)};`,
    `else git worktree add -q -b ${quote(branch)} ${quote(path)} "$base"; fi`,
  ].join('\n')
  const r = await $.process.run(sh(cmd), { timeoutMs: 120000 })
  if (r.exitCode !== 0) throw new Error(`worktree failed: ${r.stderr.trim() || r.stdout.trim()}`)
  return path
}

async function sendTo($: $, w: Worker, message: string, withRules = false): Promise<{ isSent: boolean; text: string }> {
  const text = withRules ? `${preamble(w)}\n\nMessage from the coordinator:\n${message}` : message
  const hit = await live($, w)
  if (hit && hit.sessionId && !/done|stopped|failed|exited/.test(String(hit.state ?? hit.status))) {
    await $.session.send({ to: { sessionId: hit.sessionId }, text })
    await upsert($, w.name, { last: `you: ${message.slice(0, 120)}` })
    return { isSent: true, text: `Queued for ${w.name}. Workers started by choreo accept it directly. An older one may hold it, and a delivery notice says so.` }
  }
  // A stopped worker: respawn it under its own id, then deliver from a timer once it runs.
  // Waiting here would outlast the hook's own time budget
  // Respawn wakes only a worker that stopped mid-task. A finished one ('done') stays done
  // after a respawn, so it goes to the resume path below, the message as its prompt
  const lastState = String(hit?.state ?? hit?.status ?? w.state)
  if (w.bgId && !/done/.test(lastState)) {
    const r = await $.process.run(['claude', 'respawn', w.bgId], { timeoutMs: 60000 })
    if (r.exitCode === 0) {
      deliverLater($, w.name, w.bgId, text, 0)
      await upsert($, w.name, { state: 'respawning', last: `you: ${message.slice(0, 120)}` })
      return { isSent: true, text: `Respawned ${w.name} under the same id (bg ${w.bgId}). The message goes out as soon as it runs. A toast confirms.` }
    }
  }
  // Fallback: resume the transcript with the message as the next prompt. Claude Code may
  // start a copy under a new id, and says so in its output, which goes back unchanged
  if (!w.sessionId) return { isSent: false, text: `${w.name} has no session id to resume.` }
  const servers = await approveMcp($, w.cwd)
  const r = await $.process.run(['claude', '--bg', '--resume', w.sessionId, '--settings', workerSettings(servers), '-n', w.name, text], { cwd: w.cwd, timeoutMs: 60000, env: { CHOREO_WORKER: '1' } })
  if (r.exitCode !== 0) return { isSent: false, text: `resume failed: ${r.stderr.trim() || r.stdout.trim()}` }
  const out = `${r.stdout}\n${r.stderr}`.trim()
  const bgId = (await bgIdFrom(out)) ?? w.bgId
  const isCopy = /cop(y|ied)/i.test(out)
  await upsert($, w.name, { bgId, state: 'running', last: `you: ${message.slice(0, 120)}` })
  return { isSent: true, text: `Resumed ${w.name} in the background (bg ${bgId})${isCopy ? ' as a COPY under a new id' : ''}. Claude Code said: ${out.slice(0, 400)}` }
}

// Sends to a respawned worker once it is listed as running, polling every 2 s for 40 s
function deliverLater($: $, name: string, bgId: string, text: string, tries: number) {
  $.clock.after(2000, () => {
    void (async () => {
      const hit = (await agentsJson($)).find(a => a.id === bgId)
      const state = String(hit?.state ?? hit?.status ?? '')
      if (hit?.sessionId && state && !/done|stopped|failed|exited/.test(state)) {
        await $.session.send({ to: { sessionId: hit.sessionId }, text })
        await upsert($, name, { sessionId: hit.sessionId, state })
        $.ui.toast(`choreo: message delivered to ${name}`)
      } else if (tries < 20) {
        deliverLater($, name, bgId, text, tries + 1)
      } else {
        $.ui.toast(`choreo: ${name} did not come back after respawn, message NOT sent`)
      }
    })().catch(() => $.ui.toast(`choreo: delivery to ${name} failed`))
  })
}

async function resolveAsk($: $, id: string) {
  await update($, inbox, l => l.map(x => (x.id === id ? { ...x, isResolved: true } : x)))
  await save($)
  void showStatus($)
}

function attachCmd(w: Worker) {
  return w.bgId ? `claude attach ${w.bgId}` : `cd ${w.cwd} && claude --resume ${w.sessionId}`
}

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? 'now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}

const STATE_RANK: Record<string, number> = { running: 0, busy: 0, working: 0, waiting: 1, blocked: 1, adopted: 2, done: 3, failed: 3, stopped: 4 }
const byActivity = (a: { state: string; updatedAt: number }, b: { state: string; updatedAt: number }) =>
  (STATE_RANK[a.state] ?? 2) - (STATE_RANK[b.state] ?? 2) || b.updatedAt - a.updatedAt
const STATE_COLOR: Record<string, string> = { running: 'cyan', busy: 'cyan', working: 'cyan', waiting: 'yellow', done: 'green', failed: 'red', stopped: 'gray', adopted: 'magenta' }

const inRoot = (cwd: string) => cwd === ROOT || cwd.startsWith(`${ROOT}/`)

// ---- Git host: merge requests (GitLab) or pull requests (GitHub) ----

// Set from the config. 'none' hides the git tabs and starts no polling
let HOST: 'none' | 'github' | 'gitlab' = 'none'
let GH_REPOS: string[] = []
let GL_URL = 'https://gitlab.com'
let GL_GROUP = ''
// The user on the git host, asked once per session
let gitMe: Member | null = null

const NOUN = () => (HOST === 'github' ? 'PR' : 'MR')
const HOST_NAME = () => (HOST === 'github' ? 'GitHub' : 'GitLab')
const SEP = () => (HOST === 'github' ? '#' : '!')
const ref = (m: Pick<Mr, 'repo' | 'iid'>) => `${m.repo}${SEP()}${m.iid}`

const POLL_MS = 60_000
const RECHECK_MS = 30_000
const MAX_RECHECKS = 2
let rechecks = 0
let recheck: { cancel: () => void } | undefined
const PENDING = ['unchecked', 'checking', 'preparing', 'approvals_syncing']
const EMPTY: Inbox = { mine: [], review: [], free: [], polledAt: null, error: null }
const MRS = { plugin: 'choreo', key: 'mrs' } as const
const DETAIL = { plugin: 'choreo', key: 'detail' } as const
const mrsAtom = atom(MRS, EMPTY)
const detailAtom = atom(DETAIL, null as Detail | null)
const members = atom({ plugin: 'choreo', key: 'members' } as const, [] as Member[])
const assign = atom({ plugin: 'choreo', key: 'assign' } as const, null as Assign | null)

type RawMr = Omit<Mr, 'key' | 'notes' | 'newNotes' | 'lastBy' | 'openThreads' | 'mine' | 'waiting' | 'approvedBy'>

// -- GitHub, through the gh CLI (logged in with gh auth login) --

async function ghText($: $, args: string[]) {
  const r = await $.process.run(['gh', ...args], { ...(ROOT ? { cwd: ROOT } : {}), timeoutMs: 60000 })
  if (r.exitCode !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')}: ${(r.stderr || r.stdout).trim().slice(0, 120)}`)
  return r.stdout
}

async function gh($: $, args: string[]): Promise<any> {
  const out = (await ghText($, args)).trim()
  return out ? JSON.parse(out) : null
}

const GH_FIELDS = 'number,title,url,author,headRefName,isDraft,mergeStateStatus,reviewDecision,reviewRequests,latestReviews'

// GitHub's merge state, in the words the rows use for both hosts
function ghStatus(p: any): string {
  if (p.isDraft) return 'draft_status'
  switch (p.mergeStateStatus) {
    case 'CLEAN':
    case 'HAS_HOOKS':
      return 'mergeable'
    case 'UNSTABLE':
      return 'checks_failing'
    case 'DIRTY':
      return 'conflict'
    case 'BEHIND':
      return 'need_rebase'
    case 'BLOCKED':
      return p.reviewDecision === 'APPROVED' ? 'ci_must_pass' : 'not_approved'
    case 'UNKNOWN':
    case undefined:
      return 'checking'
    default:
      return String(p.mergeStateStatus).toLowerCase()
  }
}

function ghRaw(p: any, repo: string): RawMr {
  return {
    project: repo,
    iid: String(p.number),
    repo: repo.split('/')[1] ?? repo,
    title: String(p.title ?? ''),
    url: String(p.url ?? ''),
    status: ghStatus(p),
    author: p.author?.login ?? '',
    branch: p.headRefName,
  }
}

// The repos to watch: the githubRepos setting, else the project root's own repo
async function ghRepos($: $) {
  if (GH_REPOS.length === 0) {
    const r = await gh($, ['repo', 'view', '--json', 'nameWithOwner'])
    if (r?.nameWithOwner) GH_REPOS = [String(r.nameWithOwner)]
  }
  return GH_REPOS
}

async function ghLists($: $, me: string) {
  const mine: RawMr[] = []
  const review: RawMr[] = []
  const free: RawMr[] = []
  for (const repo of await ghRepos($)) {
    const list = (extra: string[]) => gh($, ['pr', 'list', '-R', repo, '--state', 'open', '--limit', '50', '--json', GH_FIELDS, ...extra]).then(x => (x ?? []) as any[])
    const [own, asked, reviewed, open] = await Promise.all([
      list(['--author', '@me']),
      list(['--search', 'review-requested:@me']),
      // Reviewed ones stay on the list, so the row can say whose turn it is
      list(['--search', 'reviewed-by:@me -author:@me']),
      list([]),
    ])
    mine.push(...own.map(p => ghRaw(p, repo)))
    const seen = new Set<string>()
    for (const p of [...asked, ...reviewed]) {
      if (seen.has(String(p.number))) continue
      seen.add(String(p.number))
      review.push(ghRaw(p, repo))
    }
    // Others' open PRs that nobody was asked to review and nobody reviewed. Drafts are not ready
    free.push(
      ...open
        .filter(p => !p.isDraft && p.author?.login !== me && (p.reviewRequests ?? []).length === 0 && (p.latestReviews ?? []).length === 0)
        .map(p => ghRaw(p, repo)),
    )
  }
  return { mine, review, free }
}

const GH_QUERY = `query($owner: String!, $name: String!, $n: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $n) {
      reviewThreads(first: 100) { nodes { id isResolved path line comments(first: 50) { nodes { url author { login } body createdAt } } } }
      comments(first: 100) { nodes { id url author { login } body createdAt } }
      reviews(first: 100) { nodes { id url author { login } state body createdAt } }
    }
  }
}`

async function ghDetail($: $, m: Pick<Mr, 'project' | 'iid'>): Promise<{ threads: Thread[]; approvedBy: string[] }> {
  const [owner = '', name = ''] = m.project.split('/')
  const d = await gh($, ['api', 'graphql', '-f', `query=${GH_QUERY}`, '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `n=${m.iid}`])
  const pr = d?.data?.repository?.pullRequest ?? {}
  const note = (c: any) => ({ author: c.author?.login ?? 'ghost', body: String(c.body ?? ''), at: String(c.createdAt ?? '') })
  const single = (c: any): Thread => ({ id: String(c.id), ...(c.url ? { link: String(c.url) } : {}), resolvable: false, resolved: null, path: null, line: null, notes: [note(c)] })
  const reviews: any[] = pr.reviews?.nodes ?? []
  const threads: Thread[] = [
    ...(pr.reviewThreads?.nodes ?? []).map((t: any) => ({
      id: String(t.id),
      ...(t.comments?.nodes?.[0]?.url ? { link: String(t.comments.nodes[0].url) } : {}),
      resolvable: true,
      resolved: Boolean(t.isResolved),
      path: t.path ?? null,
      line: t.line ?? null,
      notes: (t.comments?.nodes ?? []).map(note),
    })),
    ...(pr.comments?.nodes ?? []).map(single),
    ...reviews.filter(r => String(r.body ?? '').trim()).map(single),
  ]
  // An approval counts while it is the reviewer's latest verdict
  const verdict = new Map<string, string>()
  for (const r of reviews) if (r.state !== 'COMMENTED' && r.author?.login) verdict.set(r.author.login, r.state)
  return { threads, approvedBy: [...verdict].filter(([, s]) => s === 'APPROVED').map(([u]) => u) }
}

// -- GitLab, through REST v4 with the token in GITLAB_TOKEN --

async function gl($: $, path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const token = await $.env.get('GITLAB_TOKEN')
  if (!token) throw new Error('GITLAB_TOKEN is not set')
  const res = await $.http.fetch(`${GL_URL}/api/v4${path}`, {
    method: init.method ?? 'GET',
    headers: { 'PRIVATE-TOKEN': token, ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  })
  if (!res.ok) throw new Error(`GitLab ${res.status}: ${res.text.slice(0, 120)}`)
  return res.text ? JSON.parse(res.text) : null
}

function glRaw(m: any): RawMr {
  const full = String(m.references?.full ?? '')
  return {
    project: String(m.project_id),
    iid: String(m.iid),
    repo: full.split('!')[0]?.split('/').pop() || String(m.project_id),
    title: String(m.title ?? ''),
    url: String(m.web_url ?? ''),
    status: String(m.detailed_merge_status ?? m.merge_status ?? ''),
    author: m.author?.username ?? '',
    branch: m.source_branch,
  }
}

async function glLists($: $, me: string) {
  const q = 'state=opened&order_by=updated_at&per_page=50'
  const group = GL_GROUP ? `/groups/${encodeURIComponent(GL_GROUP)}/merge_requests` : ''
  const u = encodeURIComponent(me)
  // Without a scope GitLab lists only MRs the user created, whatever the other filters say
  const [mine, review, open] = await Promise.all([
    gl($, group ? `${group}?${q}&scope=all&author_username=${u}` : `/merge_requests?${q}&scope=created_by_me`),
    gl($, `${group || '/merge_requests'}?${q}&scope=all&reviewer_username=${u}`),
    // Unassigned needs a group: across all of the host it would list strangers' MRs
    group ? gl($, `${group}?${q}&scope=all&reviewer_id=None`) : Promise.resolve([]),
  ])
  return {
    mine: (mine ?? []).map(glRaw),
    review: (review ?? []).map(glRaw),
    free: ((open ?? []) as any[]).filter(m => !m.draft && m.author?.username !== me).map(glRaw),
  }
}

async function glDetail($: $, m: Pick<Mr, 'project' | 'iid' | 'url'>): Promise<{ threads: Thread[]; approvedBy: string[] }> {
  const base = `/projects/${encodeURIComponent(m.project)}/merge_requests/${m.iid}`
  const [items, approvals] = await Promise.all([
    gl($, `${base}/discussions?per_page=100`),
    gl($, `${base}/approvals`).catch(() => null),
  ])
  const threads: Thread[] = []
  for (const d of (items ?? []) as any[]) {
    const human = (d.notes ?? []).filter((n: any) => !n.system)
    if (human.length === 0) continue
    const first = human[0]
    threads.push({
      id: String(d.id),
      // A link straight to the thread's first note
      ...(first.id && m.url ? { link: `${m.url}#note_${first.id}` } : {}),
      resolvable: Boolean(first.resolvable),
      resolved: first.resolvable ? Boolean(first.resolved) : null,
      path: first.position?.new_path ?? null,
      line: first.position?.new_line ?? null,
      notes: human.map((n: any) => ({ author: n.author?.username ?? '', body: String(n.body ?? ''), at: String(n.created_at ?? '') })),
    })
  }
  const approvedBy = ((approvals?.approved_by ?? []) as any[]).map(a => String(a.user?.username ?? '')).filter(Boolean)
  return { threads, approvedBy }
}

// -- Host-neutral calls --

async function hostMe($: $): Promise<Member> {
  if (gitMe) return gitMe
  const u = HOST === 'github' ? await gh($, ['api', 'user']) : await gl($, '/user')
  const username = String(HOST === 'github' ? u?.login : u?.username)
  if (!u || !username) throw new Error(`could not read the ${HOST_NAME()} user`)
  gitMe = { id: Number(u.id), username, name: String(u.name || username) }
  return gitMe
}

const hostLists = ($: $, me: string) => (HOST === 'github' ? ghLists($, me) : glLists($, me))
const hostDetail = ($: $, m: Pick<Mr, 'project' | 'iid' | 'url'>) => (HOST === 'github' ? ghDetail($, m) : glDetail($, m))

// Who can review: the GitLab group's members (or the project's), or the GitHub repo's collaborators
async function hostTeam($: $, m: Mr): Promise<Member[]> {
  if (HOST === 'github') {
    const list = (await gh($, ['api', `repos/${m.project}/collaborators?per_page=100`])) ?? []
    return (list as any[]).map(u => ({ id: Number(u.id), username: String(u.login), name: String(u.login) }))
  }
  const path = GL_GROUP ? `/groups/${encodeURIComponent(GL_GROUP)}/members/all?per_page=100` : `/projects/${encodeURIComponent(m.project)}/members/all?per_page=100`
  const list = (await gl($, path)) ?? []
  return (list as any[]).filter(u => (u.state ?? 'active') === 'active').map(u => ({ id: Number(u.id), username: String(u.username), name: String(u.name || u.username) }))
}

// A write to the host: only called from the confirm bar's Yes
async function hostSetReviewer($: $, m: Mr, who: Member) {
  if (HOST === 'github') await ghText($, ['pr', 'edit', m.iid, '-R', m.project, '--add-reviewer', who.username])
  else await gl($, `/projects/${encodeURIComponent(m.project)}/merge_requests/${m.iid}`, { method: 'PUT', body: { reviewer_ids: [who.id] } })
}

// A write to the host: only from the thread's own button, pressed on the thread the person
// reads. The same button on a resolved thread reopens it
async function hostResolve($: $, m: Mr, t: Thread, resolved: boolean) {
  if (HOST === 'github') {
    const op = resolved ? 'resolveReviewThread' : 'unresolveReviewThread'
    await gh($, ['api', 'graphql', '-f', `query=mutation($id: ID!) { ${op}(input: { threadId: $id }) { thread { id } } }`, '-f', `id=${t.id}`])
  } else {
    await gl($, `/projects/${encodeURIComponent(m.project)}/merge_requests/${m.iid}/discussions/${t.id}?resolved=${resolved}`, { method: 'PUT' })
  }
}

async function setResolved($: $, m: Mr, t: Thread, resolved: boolean) {
  try {
    await hostResolve($, m, t, resolved)
    $.ui.toast(`${resolved ? 'Resolved' : 'Reopened'} a thread on ${ref(m)}`)
    await openDetail($, m)
    void poll($)
  } catch (err) {
    $.ui.toast(`Could not ${resolved ? 'resolve' : 'reopen'} the thread: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`)
  }
}

// The status of the latest pipeline, asked only when the MR waits on CI: GitLab's
// detailed_merge_status says ci_must_pass for a failed pipeline too
async function glPipeline($: $, m: RawMr): Promise<string | undefined> {
  if (HOST !== 'gitlab' || !/^ci_/.test(m.status)) return undefined
  const list = await gl($, `/projects/${encodeURIComponent(m.project)}/merge_requests/${m.iid}/pipelines?per_page=1`).catch(() => null)
  return Array.isArray(list) && list[0]?.status ? String(list[0].status) : undefined
}

// Counts per MR from its threads. The latest comment is the newest by time
function countsOf(threads: Thread[], me: string) {
  const all = threads.flatMap(t => t.notes)
  const newest = [...all].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1)
  const isOpen = (t: Thread) => t.resolvable && !t.resolved
  return {
    count: all.length,
    lastBy: newest?.author ?? '',
    open: threads.filter(isOpen).length,
    mine: all.filter(n => n.author === me).length,
    waiting: threads.filter(t => isOpen(t) && t.notes[t.notes.length - 1]?.author !== me).length,
  }
}

// The team for one MR, loaded when Assign needs it and again until it works,
// so one failed call does not stick
let membersError: string | null = null
let teamFor = ''

async function ensureMembers($: $, m: Mr) {
  const want = HOST === 'gitlab' && GL_GROUP ? 'group' : m.project
  if (teamFor === want && (await read($, members)).length > 0) return
  try {
    const list = await hostTeam($, m)
    if (list.length === 0) throw new Error(`${HOST_NAME()} returned nobody who can review`)
    membersError = null
    teamFor = want
    await update($, members, () => list)
  } catch (err) {
    membersError = err instanceof Error ? err.message.slice(0, 120) : String(err)
    await update($, members, () => [])
  }
}

async function setReviewer($: $, m: Mr, who: Member) {
  try {
    await hostSetReviewer($, m, who)
    $.ui.toast(`${who.username === gitMe?.username ? 'You review' : `${who.name} reviews`} ${ref(m)} now`)
    await update($, assign, () => null)
    await poll($)
  } catch (err) {
    $.ui.toast(`Could not set the reviewer: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`)
  }
}

async function withNotes($: $, mrs: RawMr[], before: Mr[], me: string): Promise<Mr[]> {
  return Promise.all(
    mrs.map(async mr => {
      const key = `${mr.project}${SEP()}${mr.iid}`
      const [{ threads, approvedBy }, pipeline] = await Promise.all([hostDetail($, mr), glPipeline($, mr)])
      const n = countsOf(threads, me)
      const old = before.find(m => m.key === key)
      // Count a comment as new only when someone else wrote the latest one
      const grew = old && n.count > old.notes && n.lastBy !== me ? n.count - old.notes : 0
      return { ...mr, ...(pipeline ? { pipeline } : {}), key, notes: n.count, lastBy: n.lastBy, openThreads: n.open, mine: n.mine, waiting: n.waiting, approvedBy, newNotes: (old?.newNotes ?? 0) + grew }
    }),
  )
}

async function poll($: $) {
  try {
    const me = (await hostMe($)).username
    const before = await read($, mrsAtom)
    const lists = await hostLists($, me)
    const [mine, review, free] = await Promise.all([
      withNotes($, lists.mine, before.mine, me),
      withNotes($, lists.review, before.review, me),
      withNotes($, lists.free, before.free, me),
    ])
    const fresh = [...mine, ...review].filter(m => m.newNotes > ([...before.mine, ...before.review].find(o => o.key === m.key)?.newNotes ?? 0))
    const added = review.filter(m => !before.review.some(o => o.key === m.key))
    const unclaimed = free.filter(m => !before.free.some(o => o.key === m.key))
    if (before.polledAt !== null) {
      for (const m of fresh) $.ui.toast(`New comment on ${ref(m)} by ${m.lastBy}`)
      for (const m of added) $.ui.toast(`Review requested: ${m.title}`)
      for (const m of unclaimed) $.ui.toast(`New ${NOUN()} without a reviewer: ${m.title}`)
    }
    const polledAt = await $.clock.now()
    await update($, mrsAtom, () => ({ mine, review, free, polledAt, error: null }))
    // Ask again soon instead of showing a pending status for a minute, but only a
    // couple of times: the host can leave an MR unchecked until someone opens it
    recheck?.cancel()
    recheck = undefined
    const isPending = [...mine, ...review, ...free].some(m => PENDING.includes(m.status))
    if (isPending && rechecks < MAX_RECHECKS) {
      rechecks += 1
      recheck = $.clock.after(RECHECK_MS, () => void poll($))
    } else if (!isPending) {
      rechecks = 0
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await update($, mrsAtom, d => ({ ...d, error }))
  }
}

function glAge(ms: number | null, now: number) {
  if (ms === null) return 'not yet'
  const min = Math.round((now - ms) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

// Open first, then plain comments, resolved last
export function sortThreads(threads: Thread[]) {
  const open = (t: Thread) => (t.resolvable && !t.resolved ? 0 : t.resolvable ? 2 : 1)
  return [...threads].sort((a, b) => open(a) - open(b))
}

async function openDetail($: $, m: Mr) {
  await update($, detailAtom, () => ({ key: m.key, threads: null, error: null }))
  try {
    const threads = sortThreads((await hostDetail($, m)).threads)
    await update($, detailAtom, x => (x?.key === m.key ? { ...x, threads } : x))
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await update($, detailAtom, x => (x?.key === m.key ? { ...x, error } : x))
  }
}

const closeDetail = ($: $) => update($, detailAtom, () => null)

// Threads for the walkthrough: open ones, and plain comments whose last word is not the user's
export const toWalk = (threads: Thread[], me: string) =>
  threads.filter(t => (t.resolvable && !t.resolved) || (!t.resolvable && t.notes[t.notes.length - 1]?.author !== me))

export function walkContext(m: Pick<Mr, 'project' | 'iid' | 'repo' | 'title' | 'url'>, threads: Thread[], me: string, host: 'github' | 'gitlab') {
  const isHub = host === 'github'
  const noun = isHub ? 'PR' : 'MR'
  const name = isHub ? 'GitHub' : 'GitLab'
  const lines = [
    `${noun} ${m.repo}${isHub ? '#' : '!'}${m.iid}: ${m.title}`,
    `URL: ${m.url}`,
    isHub
      ? `GitHub repo ${m.project}, pull request ${m.iid}. Each thread below has its id. Use the gh CLI.`
      : `GitLab project_id ${m.project}, merge_request_iid ${m.iid}. Each thread below has its discussion id.`,
    '',
    'Walk the person through these threads ONE AT A TIME, in this order. For each thread:',
    '1. Say who wrote it, where (file and line if any) and what they ask, in two or three lines.',
    '2. Check the code or docs it points at when that helps.',
    '3. Propose a reply, and a code change if one is needed.',
    '4. Stop and wait. The person says reply, edit, skip or resolve.',
    `Never post a reply or resolve a thread in ${name} before the person approves that exact text.`,
    "After the last thread, list what was approved, then post it only on the person's go.",
    '',
  ]
  threads.forEach((t, i) => {
    const kind = t.resolvable ? 'open thread' : 'comment'
    const where = t.path !== null ? ` at ${t.path}${t.line !== null ? `:${t.line}` : ''}` : ''
    lines.push(`### ${i + 1}/${threads.length}: ${kind}${where} (id ${t.id})`)
    for (const n of t.notes) lines.push(`- ${n.author === me ? 'me' : n.author} (${n.at}): ${n.body.replace(/\n/g, '\n  ')}`)
    lines.push('')
  })
  return lines.join('\n')
}

async function walkComments($: $, m: Mr) {
  const me = (await hostMe($)).username
  const threads = toWalk(sortThreads((await hostDetail($, m)).threads), me)
  if (threads.length === 0) return `No open threads or unanswered comments on ${ref(m)}.`
  await $.ui.close({ id: PANE })
  const text = `Go through the ${threads.length} open ${threads.length === 1 ? 'comment' : 'comments'} on ${ref(m)} with me, one by one.`
  const context = walkContext(m, threads, me, HOST === 'github' ? 'github' : 'gitlab')
  // Submit after the command or press that started this has finished: a prompt
  // submitted from inside it would wait on the very turn it holds
  $.clock.after(1, async () => {
    // The threads go in as a note only the model reads, then the short visible prompt
    await $.session.append({ message: { type: 'user', content: [{ type: 'text', text: context }] } })
    await $.prompt.submit({ text })
  })
  return null
}

// /comments 21, /comments !21, /comments #21 or a word of the title. With no argument, the one MR with open threads
function findMr(all: Mr[], arg: string): Mr[] {
  const a = arg.trim().replace(/^[!#]/, '')
  if (a === '') return all.filter(m => (m.openThreads ?? 0) > 0 || m.newNotes > 0)
  return all.filter(m => m.iid === a || m.key === a || m.title.toUpperCase().includes(a.toUpperCase()))
}

async function openUrl($: $, url: string) {
  const res = await $.process.run(sh(`xdg-open ${quote(url)} >/dev/null 2>&1 || open ${quote(url)}`))
  $.ui.toast(res.exitCode === 0 ? 'Opened in the browser' : `Could not open the browser: ${res.stderr.slice(0, 80)}`)
}

async function copyUrl($: $, url: string, surface: Parameters<EngineInterface['ui']['copy']>[0]['surface']) {
  const res = await $.ui.copy({ text: url, surface })
  $.ui.toast(res.isCopied ? 'Link copied' : 'Could not copy the link')
}

// One paragraph of a comment, short enough for a row
function excerpt(body: string, max: number) {
  const flat = body.replace(/```[\s\S]*?```/g, '[code]').replace(/(\n\|.*\|)+/g, ' [table]').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

// The status word to a short label, a marker and a color
function mrStatus(status: string, pipeline?: string): { label: string; glyph: string; color: string } {
  if (/^ci_/.test(status) && pipeline) {
    if (pipeline === 'failed') return { label: 'CI failed', glyph: '▲', color: 'red' }
    if (pipeline === 'canceled') return { label: 'CI canceled', glyph: '▲', color: 'red' }
    if (pipeline === 'success') return { label: `${HOST_NAME()} is checking`, glyph: '◌', color: 'gray' }
    if (pipeline === 'manual') return { label: 'CI waits for a manual job', glyph: '◐', color: 'yellow' }
  }
  switch (status) {
    case 'mergeable':
      return { label: 'ready to merge', glyph: '●', color: 'green' }
    case 'draft_status':
      return { label: 'draft', glyph: '○', color: 'gray' }
    case 'conflict':
      return { label: 'conflict', glyph: '▲', color: 'red' }
    case 'need_rebase':
      return { label: 'needs rebase', glyph: '▲', color: 'red' }
    case 'checks_failing':
      return { label: 'checks failing', glyph: '▲', color: 'red' }
    case 'ci_still_running':
      return { label: 'CI running', glyph: '◐', color: 'yellow' }
    case 'ci_must_pass':
      return { label: 'CI not passed', glyph: '◐', color: 'yellow' }
    case 'not_approved':
      return { label: 'needs approval', glyph: '◐', color: 'yellow' }
    case 'discussions_not_resolved':
      return { label: 'open threads', glyph: '◐', color: 'yellow' }
    // The host recomputes mergeability after a push. These pass within seconds
    case 'unchecked':
    case 'checking':
    case 'preparing':
    case 'approvals_syncing':
      return { label: `${HOST_NAME()} is checking`, glyph: '◌', color: 'gray' }
    default:
      return { label: status.replace(/_/g, ' '), glyph: '◐', color: 'yellow' }
  }
}

// What the row says: the host's status, but open threads keep an MR from reading as ready
function shownStatus(m: Mr) {
  const n = m.openThreads ?? 0
  if (m.status === 'mergeable' && n > 0) return { label: `mergeable, ${n} open ${n === 1 ? 'thread' : 'threads'}`, glyph: '◐', color: 'yellow' }
  return mrStatus(m.status, m.pipeline)
}

// Whose move it is on an MR, from the user's side: as its author or as a reviewer
function turn(m: Mr, asReviewer: boolean, me: string): { label: string; mine: boolean; approved?: true } {
  const waiting = m.waiting ?? 0
  const threads = `${waiting} ${waiting === 1 ? 'thread' : 'threads'}`
  const approvers = (m.approvedBy ?? []).filter(u => u !== m.author)
  if (asReviewer) {
    // Once the user approved, the next move is the author's merge
    if (approvers.includes(me)) return { label: `approved, to be merged by ${m.author}`, mine: false, approved: true }
    if ((m.mine ?? 0) === 0) return { label: 'your turn: not reviewed yet', mine: true }
    if (waiting > 0) return { label: `your turn: ${threads} answered`, mine: true }
    if (m.lastBy !== '' && m.lastBy !== me) return { label: 'your turn: new comments', mine: true }
    return { label: `waiting for ${m.author}`, mine: false }
  }
  if (waiting > 0) return { label: `your turn: ${threads} to answer`, mine: true }
  if (approvers.length > 0) return { label: `approved by ${approvers.join(', ')}: merge it`, mine: true, approved: true }
  if (m.lastBy !== '' && m.lastBy !== me) return { label: 'your turn: new comments', mine: true }
  if (m.notes === 0) return { label: 'waiting for review', mine: false }
  return { label: 'waiting for reviewers', mine: false }
}

// The MR or PR an item is worked in: its key in the title or the source branch
function mrFor(d: Inbox, key: string): Mr | undefined {
  const k = key.toLowerCase()
  return [...d.mine, ...d.review, ...d.free].find(m => m.title.toLowerCase().includes(k) || (m.branch ?? '').toLowerCase().includes(k))
}

function hhmm(t: number) {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const unreadOf = (list: Mr[]) => list.reduce((n, m) => n + m.newNotes, 0)

// The git tabs, drawn inside the pane
async function gitView($: $, e: any, fill: (text: string) => () => void) {
  const { Box, Text, Button } = $.ui.resolve(e)
  const d = await read($, mrsAtom)
  const shown = await read($, detailAtom)
  const pending = await read($, assign)
  const team = await read($, members)
  const now = await $.clock.now()
  const me = gitMe?.username ?? ''
  const cols = e.props.bodyColumns ?? 80
  const narrow = cols < 70
  const noun = NOUN()
  const markRead = () =>
    void update($, mrsAtom, x => ({
      ...x,
      mine: x.mine.map(m => ({ ...m, newNotes: 0 })),
      review: x.review.map(m => ({ ...m, newNotes: 0 })),
    }))
  const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
  const reviewPrompt = (m: Mr) => `Review the ${noun} ${m.url}`
  const isReview = (m: Mr) => !d.mine.some(r => r.key === m.key)
  const isFree = (m: Mr) => d.free.some(r => r.key === m.key)
  const walk = async (m: Mr) => {
    try {
      const said = await walkComments($, m)
      if (said !== null) $.ui.toast(said)
    } catch (err) {
      $.ui.toast(`Could not read the comments: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`)
    }
  }

  const header = (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold>{HOST_NAME()}</Text>
        {unreadOf([...d.mine, ...d.review]) > 0 ? (
          <Text color="yellow" bold>
            {unreadOf([...d.mine, ...d.review])} new
          </Text>
        ) : (
          <Text dimColor>all read</Text>
        )}
      </Box>
      <Box flexDirection="row" gap={1}>
        {!narrow && <Text dimColor>updated {glAge(d.polledAt, now)}</Text>}
        <Button key="refresh" label="Refresh" hotkey="r" onPress={() => void poll($)} />
        <Button key="read" label="Mark read" hotkey="m" onPress={markRead} />
      </Box>
    </Box>
  )

  const all = [...d.mine, ...d.review, ...d.free]
  const pendingMr = pending === null ? undefined : all.find(m => m.key === pending.key)
  const cancel = () => void update($, assign, () => null)
  // Picking a reviewer, then a yes before anything is written
  const assignBar =
    pending !== null && pendingMr !== undefined ? (
      <Box flexDirection="row" gap={1} paddingX={1} borderStyle="round" borderColor="yellow">
        {pending.member === null ? (
          <Box flexDirection="row" gap={1}>
            <Text>Reviewer for {ref(pendingMr)}:</Text>
            {team
              .filter(u => u.username !== pendingMr.author && u.username !== me)
              .map((u, i) => (
                <Button
                  key={`pick-${u.id}`}
                  label={u.name}
                  autoFocus={i === 0 ? true : undefined}
                  onPress={() => void update($, assign, a => (a === null ? a : { ...a, member: u }))}
                />
              ))}
            {team.length === 0 && membersError === null && <Text dimColor>Loading the team…</Text>}
            {team.length === 0 && membersError !== null && <Text color="red">{membersError}</Text>}
            {team.length === 0 && membersError !== null && <Button key="pick-retry" label="Retry" onPress={() => void ensureMembers($, pendingMr)} />}
            {team.length > 0 && team.every(u => u.username === pendingMr.author || u.username === me) && <Text dimColor>Nobody else can review this one.</Text>}
            <Button key="pick-cancel" label="Cancel" hotkey="n" onPress={cancel} />
          </Box>
        ) : (
          <Box flexDirection="row" gap={1}>
            <Text>
              Set {pending.member.username === me ? 'you' : pending.member.name} as reviewer of {ref(pendingMr)}?
            </Text>
            <Button key="assign-yes" variant="primary" label="Yes" hotkey="y" onPress={() => void setReviewer($, pendingMr, pending.member as Member)} />
            <Button key="assign-no" label="Cancel" hotkey="n" onPress={cancel} />
          </Box>
        )}
      </Box>
    ) : null
  const take = (m: Mr) => () => {
    if (gitMe === null) return void $.ui.toast(`Could not read your ${HOST_NAME()} user yet, try again in a moment`)
    void update($, assign, () => ({ key: m.key, member: gitMe }))
  }
  const pick = (m: Mr) => () => {
    void update($, assign, () => ({ key: m.key, member: null }))
    void ensureMembers($, m)
  }

  const error = d.error !== null && (
    <Box borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red">{d.error}</Text>
    </Box>
  )

  // One MR on a line or two. Enter on the title opens the detail screen
  const mrRow = (m: Mr, action: string, prompt: string) => {
    const st = shownStatus(m)
    const t = turn(m, isReview(m), me)
    return (
      <Box key={m.key} flexDirection="row" gap={1}>
        <Text color={st.color}>{st.glyph}</Text>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Button key={`mr-${m.key}`} plain label={cut(m.title, Math.max(20, cols - 22))} onPress={() => void openDetail($, m)} />
          <Box flexDirection="row" gap={1}>
            <Text dimColor>{ref(m)}</Text>
            <Text color={st.color}>{st.label}</Text>
            {m.author !== me && !narrow && <Text dimColor>by {m.author}</Text>}
            {m.newNotes > 0 && (
              <Text color="yellow" bold>
                +{m.newNotes} new from {m.lastBy}
              </Text>
            )}
            {!isFree(m) && (
              <Text color={t.approved ? 'green' : t.mine ? 'magenta' : undefined} dimColor={!t.mine && !t.approved} bold={t.mine}>
                {t.label}
              </Text>
            )}
          </Box>
        </Box>
        {action === 'Comments' ? (
          <Button key={`${action}-${m.key}`} label={action} onPress={() => void walk(m)} />
        ) : (
          <Button key={`${action}-${m.key}`} label={action} onPress={fill(prompt)} />
        )}
        {isFree(m) && <Button key={`take-${m.key}`} label="Take" onPress={take(m)} />}
        {isFree(m) && <Button key={`assign-${m.key}`} label="Assign" onPress={pick(m)} />}
      </Box>
    )
  }

  // The user's turn first, the rest after, each part in the host's order (latest update first)
  const byTurn = (items: Mr[]) => [...items].sort((a, b) => Number(turn(b, isReview(b), me).mine) - Number(turn(a, isReview(a), me).mine))
  const list = (items: Mr[], action: string, prompt: (m: Mr) => string, empty: string) => (
    <Box flexDirection="column" paddingX={1} gap={1}>
      {items.length === 0 ? <Text dimColor>{empty}</Text> : byTurn(items).map(m => mrRow(m, action, prompt(m)))}
    </Box>
  )

  const detailScreen = (x: Detail) => {
    const m = all.find(r => r.key === x.key)
    if (m === undefined) {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Text dimColor>This {noun} is no longer open.</Text>
          <Button key="back" label="Back" hotkey="b" autoFocus onPress={() => void closeDetail($)} />
        </Box>
      )
    }
    const st = shownStatus(m)
    const review = isReview(m)
    const open = x.threads?.filter(t => t.resolvable && !t.resolved).length ?? 0
    const max = Math.max(60, cols - 10)
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" gap={1}>
          <Button key="back" label="‹ Back" hotkey="b" onPress={() => void closeDetail($)} />
          <Text dimColor>{ref(m)}</Text>
        </Box>
        <Box marginTop={1}>
          <Text bold wrap="wrap">
            {m.title}
          </Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={st.color}>
            {st.glyph} {st.label}
          </Text>
          <Text dimColor>· by {m.author === me ? 'you' : m.author}</Text>
          {x.threads !== null && (
            <Text color={open > 0 ? 'yellow' : 'green'}>· {open > 0 ? `${open} open ${open === 1 ? 'thread' : 'threads'}` : 'no open threads'}</Text>
          )}
        </Box>
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Button key="d-open" label="Open" hotkey="o" onPress={() => void openUrl($, m.url)} />
          <Button key="d-copy" label="Copy link" hotkey="c" onPress={(p: { surface: Parameters<EngineInterface['ui']['copy']>[0]['surface'] }) => void copyUrl($, m.url, p.surface)} />
          <Button key="d-act" variant="primary" autoFocus label={review ? 'Review' : 'Go through comments'} hotkey="a" onPress={review ? fill(reviewPrompt(m)) : () => void walk(m)} />
          {isFree(m) && <Button key="d-take" label="Take" hotkey="t" onPress={take(m)} />}
          {isFree(m) && <Button key="d-assign" label="Assign" hotkey="s" onPress={pick(m)} />}
        </Box>
        {x.error !== null && <Text color="red">{x.error}</Text>}
        {x.error === null && x.threads === null && <Text dimColor>Loading threads…</Text>}
        {x.threads !== null && x.threads.length === 0 && <Text dimColor>No comments yet.</Text>}
        {(x.threads ?? []).map(t => {
          const isOpen = t.resolvable && !t.resolved
          const notes = t.notes.slice(-5)
          const hidden = t.notes.length - notes.length
          return (
            <Box key={t.id} flexDirection="column" marginTop={1} borderStyle="round" borderDimColor={!isOpen} borderColor={isOpen ? 'yellow' : undefined} paddingX={1}>
              <Box flexDirection="row" gap={1}>
                <Text color={isOpen ? 'yellow' : t.resolvable ? 'green' : 'gray'}>{isOpen ? 'open thread' : t.resolvable ? 'resolved' : 'comment'}</Text>
                {t.path !== null && <Text dimColor>{t.path}</Text>}
                {hidden > 0 && <Text dimColor>+{hidden} earlier</Text>}
                <Button key={`web-${t.id}`} label={`open in ${HOST_NAME()}`} onPress={() => void openUrl($, t.link ?? m.url)} />
                {t.resolvable && (
                  <Button key={`${isOpen ? 'resolve' : 'reopen'}-${t.id}`} label={isOpen ? 'resolve' : 'reopen'} onPress={() => void setResolved($, m, t, isOpen)} />
                )}
              </Box>
              {notes.map((n, i) => (
                <Box key={`${t.id}-${i}`} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
                  <Box flexDirection="row" gap={1}>
                    <Text bold color={n.author === me ? 'cyan' : undefined}>
                      {n.author === me ? 'you' : n.author}
                    </Text>
                    <Text dimColor>{glAge(Date.parse(n.at), now)}</Text>
                  </Box>
                  <Text wrap="wrap">{excerpt(n.body, isOpen ? max * 6 : max * 2)}</Text>
                </Box>
              ))}
            </Box>
          )
        })}
      </Box>
    )
  }

  // A worker of its own for a review: a worktree on the MR's branch
  const withWorker = (items: Mr[], empty: string) => (
    <Box flexDirection="column" paddingX={1} gap={1}>
      {items.length === 0 ? (
        <Text dimColor>{empty}</Text>
      ) : (
        byTurn(items).map(m => (
          <Box key={`rw-${m.key}`} flexDirection="column">
            {mrRow(m, 'Review', reviewPrompt(m))}
            <Box flexDirection="row" paddingLeft={2}>
              <Button
                key={`rworker-${m.key}`}
                label="review worker"
                onPress={fill(`Prepare a review worker for ${m.url} (branch ${m.branch ?? '?'}). Pick the repo, draft the worker task, and show it to me. Launch only after my yes.`)}
              />
            </Box>
          </Box>
        ))
      )}
    </Box>
  )

  const freeEmpty = HOST === 'gitlab' && !GL_GROUP ? 'Set gitlabGroup to see open MRs without a reviewer.' : `Every open ${noun} has a reviewer.`
  return {
    data: d,
    header,
    error,
    assignBar,
    detail: shown === null ? null : detailScreen(shown),
    mrs: list(d.mine, 'Comments', () => '', `No open ${noun}s.`),
    reviews: withWorker(d.review, 'Nothing to review.'),
    free: list(d.free, 'Review', reviewPrompt, freeEmpty),
  }
}

// ---- Coordinator tools ----

const TOOLS = {
  launch: {
    name: 'launch',
    description:
      'Start a new background worker session in its own git worktree (branched off the base branch, or tracking an existing branch). The worker reports back with tagged messages.',
    inputSchema: {
      type: 'object',
      properties: {
        item: { type: 'string', description: 'Tracker id or short label, optional' },
        kind: { type: 'string', enum: KINDS },
        task: { type: 'string', description: 'What the worker must do, self-contained' },
        repo: { type: 'string', description: '"." for the project root repo, or a git repo path relative to the root' },
        branch: { type: 'string', description: 'Branch to create or check out. Default <kind>/<item or name>' },
        name: { type: 'string', description: "Worker name. Default <item or 'task'>-<kind>" },
        worktree: { type: 'string', description: 'Use this existing directory instead of creating a worktree' },
      },
      required: ['kind', 'task', 'repo'],
    },
  },
  adopt: {
    name: 'adopt',
    description: 'Add a past or running session to the roster by session id, so it can be resumed or messaged.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        name: { type: 'string', description: 'Roster name, e.g. TASK-1-spec' },
        item: { type: 'string', description: 'Tracker id or short label, optional' },
        kind: { type: 'string', enum: KINDS },
        task: { type: 'string', description: 'What this session was doing' },
      },
      required: ['sessionId', 'name'],
    },
  },
  sessions: {
    name: 'sessions',
    description: 'List recent past sessions of this project and its worktrees (id, title, cwd, first prompt), to pick one to adopt.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'number' } },
    },
  },
  send: {
    name: 'send',
    description:
      'Send a message to a roster worker. A live session gets it directly. A stopped or past session is resumed in the background with the message as its next prompt.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, text: { type: 'string' }, withRules: { type: 'boolean', description: 'Prefix the worker rules (use when resuming an adopted session for the first time)' } },
      required: ['name', 'text'],
    },
  },
  ask: {
    name: 'ask',
    description:
      "Put a decision for the user in the Waiting tab of the choreo pane. Use it for EVERY question you need the user to answer, besides asking in chat. Options become buttons (first = recommended). The user can also type a free answer. The answer comes back to you as a prompt starting with 'Decision <id>'.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short, e.g. "TASK-12: scope"' },
        text: { type: 'string', description: 'The question with the context needed to decide, plain text' },
        options: { type: 'array', items: { type: 'string' }, description: 'Short answers, recommended first' },
      },
      required: ['title', 'text'],
    },
  },
  list: {
    name: 'list',
    description: "Show the roster, the open questions waiting on the user, and the user's tracker items when a tracker command is set. Refreshes live state first.",
    inputSchema: { type: 'object', properties: {} },
  },
  stop: {
    name: 'stop',
    description: 'Stop a background worker session (kept in the roster, can be resumed with send).',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  forget: {
    name: 'forget',
    description: 'Remove a worker from the roster. Does not touch its worktree or transcript.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  resolve: {
    name: 'resolve',
    description: 'Mark a waiting question as handled.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
}

// The launch tool, its repo field naming the repos from the config
function launchTool() {
  const t = TOOLS.launch
  if (REPOS.length === 0) return t
  const list = REPOS.map(r => `"${r.path}"${r.about ? ` (${r.about})` : ''}`).join(', ')
  const repo = { ...t.inputSchema.properties.repo, description: `${t.inputSchema.properties.repo.description}. Repos of this project: ${list}` }
  return { ...t, inputSchema: { ...t.inputSchema, properties: { ...t.inputSchema.properties, repo } } }
}

// A plugin tool's result is what the model reads: a string.
const ok = (text: string) => ({ result: text })
const fail = (text: string) => ({ result: text, isError: true as const })

async function live($: $, w: Worker) {
  const a = await agentsJson($)
  return (w.bgId && a.find(x => x.id === w.bgId)) || (w.sessionId && a.find(x => x.sessionId === w.sessionId)) || undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Never inside a worker: workers carry CHOREO_WORKER, older ones are known by their worktree folder
    if (e.cwd.includes('/.claude/worktrees/') || e.cwd.includes('/.worktrees/') || (await $.env.get('CHOREO_WORKER'))) return next(e)
    await loadConfig($, e.cwd)
    if (!inRoot(e.cwd)) return next(e)
    isOn = true
    const r = (await $.store.get(stored('roster'))) as Worker[] | undefined
    const i = (await $.store.get(stored('inbox'))) as Ask[] | undefined
    const m = (await $.store.get(stored('tasks'))) as Task[] | undefined
    if (r) await $.state.set(ROSTER, r)
    if (i) await $.state.set(INBOX, i)
    if (m) await $.state.set(TASKS, m)
    for (const t of Object.values(TOOLS)) await $.tool.register(t.name === 'launch' ? launchTool() : t)
    await $.command.register({ name: 'choreo', description: `Open the ${ME} control center (args: waiting, fleet, tasks, mrs, reviews, free)` })
    $.clock.every(30000, () => void refresh($).catch(() => {}))
    if (TRACKER_CMD) {
      $.clock.every(300000, () => void refreshTasks($))
      void refreshTasks($)
    }
    if (HOST !== 'none') {
      await $.command.register({ name: 'comments', description: 'Go through the open comments on one of your merge or pull requests, one by one (arg: its number)' })
      void poll($)
      $.clock.every(POLL_MS, () => void poll($))
    }
    void showStatus($)
    return next(e)
  })

  on('command.run', { command: 'choreo' }, async ($, e) => {
    const arg = e.args.trim()
    const git = HOST === 'none' ? [] : ['mrs', 'reviews', 'free']
    await openTab($, ['waiting', 'fleet', 'tasks', ...git].includes(arg) ? arg : 'waiting')
    void refresh($)
    void refreshTasks($)
    return { text: 'choreo pane opened.' }
  })

  on('command.run', { command: 'comments' }, async ($, e) => {
    if (HOST === 'none') return { text: 'Set gitHost to use /comments.' }
    const d = await read($, mrsAtom)
    const found = findMr(d.mine, e.args)
    if (found.length !== 1) {
      const names = (found.length === 0 ? d.mine : found).map(m => `${SEP()}${m.iid} ${m.title}`).join(', ')
      return { text: found.length === 0 ? `No matching ${NOUN()}. Yours: ${names}` : `Several match, name one: ${names}` }
    }
    const m = found[0] as Mr
    const said = await walkComments($, m)
    return { text: said ?? `Fetched the comments on ${ref(m)}.` }
  })

  on('tool.call', { tool: 'mcp__choreo__launch' }, async ($, e: any) => {
    const x = e.input ?? e
    const kind = x.kind as WorkerKind
    const item = String(x.item ?? '')
    const name = x.name || `${item || 'task'}-${kind}`
    if (await find($, name)) return fail(`A worker named ${name} already exists. Use send, or pick another name.`)
    const branch = x.branch || `${kind}/${slug(item || name)}`
    let cwd: string
    let servers: string[]
    try {
      cwd = x.worktree || (await worktreeFor($, x.repo ?? '.', name, branch))
      servers = await approveMcp($, cwd)
      await ensureScratch($)
    } catch (err) {
      return fail(String(err))
    }
    const w = { name, item, kind, task: x.task }
    const r = await $.process.run(['claude', '--bg', '--settings', workerSettings(servers), '-n', name, preamble(w)], { cwd, timeoutMs: 60000, env: { CHOREO_WORKER: '1' } })
    if (r.exitCode !== 0) return fail(`claude --bg failed: ${r.stderr.trim() || r.stdout.trim()}`)
    const bgId = await bgIdFrom(r.stdout + r.stderr)
    await upsert($, name, { ...w, cwd, branch, bgId, state: 'running' })
    void refresh($)
    return ok(`Launched ${name} (bg ${bgId ?? '?'}) in ${cwd} on ${branch}. Attach: claude attach ${bgId ?? name}`)
  })

  on('tool.call', { tool: 'mcp__choreo__adopt' }, async ($, e: any) => {
    const x = e.input ?? e
    const r = await $.process.run(['python3', '-I', `${$.plugin.root}/bin/sessions.py`, x.sessionId, '1', ROOT], { timeoutMs: 30000 })
    let meta: any = {}
    try {
      meta = JSON.parse(r.stdout)[0] ?? {}
    } catch {}
    if (!meta.sessionId) return fail(`No transcript found for session ${x.sessionId}.`)
    await upsert($, x.name, {
      item: x.item ?? '',
      kind: (x.kind ?? 'develop') as WorkerKind,
      task: x.task ?? meta.title ?? meta.firstPrompt ?? '',
      cwd: meta.cwd ?? ROOT,
      sessionId: meta.sessionId,
      state: 'adopted',
    })
    void refresh($)
    return ok(`Adopted ${x.name} (${meta.title ?? meta.sessionId}) in ${meta.cwd}.`)
  })

  on('tool.call', { tool: 'mcp__choreo__sessions' }, async ($, e: any) => {
    const x = e.input ?? e
    const r = await $.process.run(['python3', '-I', `${$.plugin.root}/bin/sessions.py`, x.query ?? '', String(x.limit ?? 15), ROOT], { timeoutMs: 30000 })
    return r.exitCode === 0 ? ok(r.stdout) : fail(r.stderr)
  })

  on('tool.call', { tool: 'mcp__choreo__send' }, async ($, e: any) => {
    const x = e.input ?? e
    const w = await find($, x.name)
    if (!w) return fail(`No worker named ${x.name}.`)
    const r = await sendTo($, w, x.text, x.withRules)
    return r.isSent ? ok(r.text) : fail(r.text)
  })

  on('tool.call', { tool: 'mcp__choreo__ask' }, async ($, e: any) => {
    const x = e.input ?? e
    const id = `${ME}#${Date.now().toString(36)}`
    const ask: Ask = { id, from: ME, title: x.title, text: x.text, options: x.options ?? [], at: Date.now(), isResolved: false }
    await update($, inbox, list => [...list, ask].slice(-50))
    await save($)
    void showStatus($)
    return ok(`Posted to Waiting as ${id}.`)
  })

  on('tool.call', { tool: 'mcp__choreo__list' }, async $ => {
    await refresh($)
    await refreshTasks($)
    const list = await read($, roster)
    const asks = (await read($, inbox)).filter(a => !a.isResolved)
    const myTasks = await read($, tasks)
    // A short roster, busiest first: the full task and log would crowd the model's context
    const clip = (t: unknown, n: number) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s }
    const compact = [...list].sort(byActivity).map(w => ({
      name: w.name, item: w.item, kind: w.kind, state: w.state, bgId: w.bgId, branch: w.branch, cwd: w.cwd,
      updated: new Date(w.updatedAt).toISOString().slice(0, 16), task: clip(w.task, 120), last: clip(w.last, 300),
    }))
    return ok(JSON.stringify({ config: configNote, roster: compact, waiting: asks, ...(TRACKER_CMD ? { myTasks } : {}), ...(REPOS.length ? { repos: REPOS } : {}) }))
  })

  on('tool.call', { tool: 'mcp__choreo__stop' }, async ($, e: any) => {
    const x = e.input ?? e
    const w = await find($, x.name)
    if (!w?.bgId) return fail(`${x.name} is not a background session I started.`)
    const r = await $.process.run(['claude', 'stop', w.bgId], { timeoutMs: 30000 })
    await upsert($, w.name, { state: 'stopped' })
    return ok(r.stdout.trim() || `Stopped ${w.name}.`)
  })

  on('tool.call', { tool: 'mcp__choreo__forget' }, async ($, e: any) => {
    const x = e.input ?? e
    await update($, roster, list => list.filter(w => w.name !== x.name))
    await save($)
    void showStatus($)
    return ok(`Removed ${x.name} from the roster.`)
  })

  on('tool.call', { tool: 'mcp__choreo__resolve' }, async ($, e: any) => {
    const x = e.input ?? e
    await update($, inbox, list => list.map(a => (a.id === x.id ? { ...a, isResolved: true } : a)))
    await save($)
    void showStatus($)
    return ok(`Resolved ${x.id}.`)
  })

  on('session.receive', async ($, e, next) => {
    // Tags are read only in the coordinator session. Before any session.start (a test) it counts as on
    const m = e.text.match(TAG)
    if (m && (isOn || ROOT === '')) {
      const [, from = '?', tag = 'status', body = ''] = m
      // The message arrives wrapped in <cross-session-message>, so drop the closing tag the body ends with
      const text = body.replace(/<\/cross-session-message>\s*$/, '').trim()
      const state = tag === 'done' ? 'done' : tag === 'status' ? 'running' : 'waiting'
      await upsert($, from, { state, last: `${tag}: ${text.slice(0, 160)}` })
      if (tag === 'question' || tag === 'blocked') {
        const id = `${from}#${Date.now().toString(36)}`
        await update($, inbox, list => [...list, { id, from, text, at: Date.now(), isResolved: false }].slice(-50))
        await save($)
        $.ui.toast(`${from} asks: ${text.slice(0, 80)}`)
      } else if (tag === 'done') {
        $.ui.toast(`${from} is done`)
      }
      void showStatus($)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input, Link } = $.ui.resolve(e) as any
    const list = await read($, roster)
    const asks = (await read($, inbox)).filter(a => !a.isResolved)
    const items = await read($, tasks)
    const current = await read($, tab)
    const width = Math.max(30, (e.props as any)?.bodyColumns ?? 60)
    const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
    // Put the prompt in the box, then close the pane so the keys go back to the prompt
    const fill = (text: string) => () => void $.prompt.fill({ text }).then(() => $.ui.close({ id: PANE })).catch(() => $.ui.toast('choreo: could not fill the prompt'))

    const waiting = (
      <Box key="p-waiting" flexDirection="column" paddingX={1}>
        {asks.length === 0 && <Text dimColor>Nothing waiting on you.</Text>}
        {[...asks].sort((x, y) => x.at - y.at).map(a => {
          // Oldest on top, newest at the bottom, the coordinator's questions and the workers' together
          if (a.from === ME) {
            const answer = (value: string) => async () => {
              if (!value.trim()) return
              await resolveAsk($, a.id)
              await $.prompt.submit({ text: `Decision ${a.id} (${a.title ?? ''}): ${value.trim()}`, asUser: true }).catch(() => $.ui.toast('choreo: could not send the answer'))
            }
            return (
              <Box key={`ask-${a.id}`} flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} marginBottom={1}>
                <Text>
                  <Text bold color="magenta">{a.title ?? 'Decision'}</Text>
                  <Text dimColor>{`  from ${ME} · ${ago(a.at)}`}</Text>
                </Text>
                <Text>{a.text}</Text>
                <Box flexDirection="row" gap={1} flexWrap="wrap">
                  {(a.options ?? []).map((o, i) => (
                    <Button key={`opt-${a.id}-${i}`} label={o} variant={i === 0 ? 'primary' : undefined} onPress={answer(o)} />
                  ))}
                </Box>
                <Input key={`ans-${a.id}`} placeholder="Or type your answer, Enter sends" submitLabel="send" onSubmit={(v: string) => void answer(v)()} />
                <Button key={`res-${a.id}`} label="drop" onPress={() => resolveAsk($, a.id)} />
              </Box>
            )
          }

          const w = list.find(x => x.name === a.from)
          return (
            <Box key={`ask-${a.id}`} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginBottom={1}>
              <Text>
                <Text bold color="yellow">{a.from}</Text>
                <Text dimColor>{`  ${w?.item ?? ''} ${w?.kind ?? ''} · ${ago(a.at)}`}</Text>
              </Text>
              <Text>{a.text}</Text>
              <Input
                key={`reply-${a.id}`}
                placeholder={`Reply to ${a.from}, Enter sends`}
                submitLabel="send"
                onSubmit={async (value: string) => {
                  if (!value.trim() || !w) return $.ui.toast(w ? 'Empty reply' : `${a.from} is not in the roster`)
                  const r = await sendTo($, w, value.trim())
                  $.ui.toast(r.text)
                  if (r.isSent) await resolveAsk($, a.id)
                }}
              />
              <Box flexDirection="row" gap={1}>
                <Button key={`res-${a.id}`} label="handled" onPress={() => resolveAsk($, a.id)} />
                <Button
                  key={`askc-${a.id}`}
                  label="ask Claude"
                  onPress={() => void $.prompt.submit({ text: `Worker ${a.from} asks:\n\n${a.text}\n\nHelp me decide. Read what you need, give a recommendation, and draft the reply. Do not send it yet.` }).catch(() => $.ui.toast('choreo: could not hand this to Claude'))}
                />
                {w && <Button key={`att-a-${a.id}`} label="copy attach" onPress={async () => { await $.ui.copy({ text: attachCmd(w) }); $.ui.toast(`Copied: ${attachCmd(w)}`) }} />}
              </Box>
            </Box>
          )
        })}
      </Box>
    )

    // The next step for an item, from the tracker.flow rules in the config: the first rule whose
    // states and label both match. Without a matching rule, one "start worker" button
    const mrs = await read($, mrsAtom)
    const itemsAt = await read($, tasksAt)
    const actions = (t: Task) => {
      const mr = HOST === 'none' ? undefined : mrFor(mrs, t.key)
      const ws = list.filter(w => w.item === t.key)
      const fillIn = (text: string) => text.replace(/\{key\}/g, t.key).replace(/\{title\}/g, t.title)
      const b = (id: string, label: string, onPress: () => void, isPrimary = false) => (
        <Button key={`${id}-${t.key}`} label={label} variant={isPrimary ? 'primary' : undefined} onPress={onPress} />
      )
      const openMr = mr ? b('mr', `open ${ref(mr)}`, () => void openUrl($, mr.url)) : null
      const attach = ws[0] ? b('att', `attach ${ws[0].name}`, async () => { await $.ui.copy({ text: attachCmd(ws[0]!) }); $.ui.toast(`Copied: ${attachCmd(ws[0]!)}`) }) : null
      const rule = FLOW.find(r => (!r.states || r.states.includes(t.state)) && (!r.label || (t.labels ?? []).includes(r.label)))
      if (!rule) {
        return [b('start', 'start worker', fill(`Prepare a worker for ${t.key} (${t.title}): read the item, pick repo and branch, draft the task, show it to me. Launch only after my yes.`), true), attach, openMr]
      }
      const buttons = rule.actions.map((a, i) => {
        const id = `act${i}`
        const brief = fillIn(a.brief ?? '')
        if (a.kind === 'comments') {
          return mr
            ? b(id, a.label, () => void walkComments($, mr).then(said => said !== null && $.ui.toast(said)).catch(() => $.ui.toast('choreo: could not read the comments')), i === 0)
            : b(id, a.label, fill(`Find the ${NOUN()} for ${t.key} and show its review state.`), i === 0)
        }
        if (a.kind === 'prompt') return b(id, a.label, fill(brief), i === 0)
        return b(id, a.label, fill(`Prepare a ${a.kind} worker for ${t.key} ("${t.title}"): ${brief} Read the tracker item, pick the repo and branch, draft the worker task, and show it to me. Launch only after my yes.`), i === 0)
      })
      return [...buttons, attach, openMr]
    }

    // The tracker items, grouped by state in the order of their best rank
    const groups: string[] = []
    for (const t of items) if (!groups.includes(t.state)) groups.push(t.state)
    const myTasks = (
      <Box key="p-tasks" flexDirection="column" paddingX={1}>
        {items.length === 0 && <Text dimColor>{itemsAt ? 'Nothing open in the tracker.' : 'Loading from the tracker…'}</Text>}
        {groups.map(g => (
          <Box key={`g-${g}`} flexDirection="column" marginBottom={1}>
            <Text bold>{g}</Text>
            {items.filter(t => t.state === g).map(t => {
              const ws = list.filter(w => w.item === t.key)
              return (
                <Box key={`t-${t.key}`} flexDirection="column" paddingLeft={2} marginBottom={1}>
                  <Text>
                    {t.url ? <Link key={`l-${t.key}`} href={t.url}>{t.key}</Link> : <Text bold>{t.key}</Text>}
                    {(t.labels ?? []).length > 0 && <Text dimColor>{`  ${(t.labels ?? []).join(', ')}`}</Text>}
                    {t.priority && t.priority !== 'none' && <Text dimColor>{`  prio ${t.priority}`}</Text>}
                    {ws.map(w => <Text color={STATE_COLOR[w.state] ?? undefined}>{`  ${w.name}: ${w.state}`}</Text>)}
                  </Text>
                  <Text>{cut(t.title, width - 4)}</Text>
                  <Box flexDirection="row" gap={1}>{actions(t).filter(Boolean)}</Box>
                </Box>
              )
            })}
          </Box>
        ))}
        <Box flexDirection="row" gap={1}>
          <Text dimColor>{itemsAt ? `tracker ${hhmm(itemsAt)}` : ''}</Text>
          <Button key="refresh-tasks" label="refresh" onPress={() => void refreshTasks($)} />
        </Box>
      </Box>
    )

    const fleet = (
      <Box key="p-fleet" flexDirection="column" paddingX={1}>
        {list.length === 0 && <Text dimColor>No workers yet. Ask me to launch one, or to adopt a past session.</Text>}
        {[...list].sort(byActivity).map(w => (
          <Box key={`w-${w.name}`} flexDirection="column" borderStyle="round" borderColor={STATE_COLOR[w.state] ?? 'gray'} paddingX={1} marginBottom={1}>
            <Text>
              <Text bold>{w.name}</Text>
              <Text>{'  '}</Text>
              <Text color={STATE_COLOR[w.state] ?? undefined}>{w.state}</Text>
              <Text dimColor>{`  ${w.kind} · ${ago(w.updatedAt)}`}</Text>
            </Text>
            <Text dimColor>{cut(`${w.branch ?? ''} ${ROOT && w.cwd.startsWith(ROOT) ? `.${w.cwd.slice(ROOT.length)}` : w.cwd}`.trim(), width - 4)}</Text>
            <Text>{cut(w.task.split('\n')[0] ?? '', width - 4)}</Text>
            {w.last && <Text color="cyan">{cut(w.last, (width - 4) * 2)}</Text>}
            <Input
              key={`msg-${w.name}`}
              placeholder={`Message ${w.name}, Enter sends`}
              submitLabel="send"
              onSubmit={async (value: string) => {
                if (!value.trim()) return
                const r = await sendTo($, w, value.trim())
                $.ui.toast(r.text)
              }}
            />
            <Box flexDirection="row" gap={1}>
              <Button key={`att-${w.name}`} label="copy attach" onPress={async () => { await $.ui.copy({ text: attachCmd(w) }); $.ui.toast(`Copied: ${attachCmd(w)}`) }} />
              {w.bgId && (
                <Button
                  key={`stop-${w.name}`}
                  label="stop"
                  onPress={async () => {
                    await $.process.run(['claude', 'stop', w.bgId!], { timeoutMs: 30000 })
                    await upsert($, w.name, { state: 'stopped' })
                  }}
                />
              )}
              <Button
                key={`forget-${w.name}`}
                label="forget"
                onPress={async () => {
                  await update($, roster, l => l.filter(x => x.name !== w.name))
                  await save($)
                  void showStatus($)
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    )

    // The tabs, in order. A tab with no body is hidden. More tabs are appended here
    const git = HOST === 'none' ? null : await gitView($, e, fill)
    const d = git?.data ?? EMPTY
    const unread = (l: Mr[]) => (unreadOf(l) ? ` +${unreadOf(l)}` : '')
    const TABS: { id: string; label: string; count: string; body: unknown }[] = [
      { id: 'waiting', label: 'Waiting', count: `${asks.length}`, body: waiting },
      { id: 'fleet', label: 'Fleet', count: `${list.length}`, body: fleet },
      { id: 'tasks', label: 'My tasks', count: `${items.length}`, body: TRACKER_CMD ? myTasks : null },
      { id: 'mrs', label: `My ${NOUN()}s`, count: `${d.mine.length}${unread(d.mine)}`, body: git?.mrs ?? null },
      { id: 'reviews', label: 'To review', count: `${d.review.length}${unread(d.review)}`, body: git?.reviews ?? null },
      { id: 'free', label: 'Unassigned', count: `${d.free.length}`, body: git?.free ?? null },
    ].filter(t => t.body !== null)
    const isGit = ['mrs', 'reviews', 'free'].includes(current) || Boolean(git?.detail)
    const shown = TABS.find(t => t.id === current) ?? TABS[0]!
    const tabs = (
      <Box key="tabs" flexDirection="column">
        <Box flexDirection="row" gap={2} paddingX={1}>
          {TABS.map((t, i) => (
            <Button
              key={`tab-${t.id}`}
              plain
              hotkey={String(i + 1)}
              variant={t.id === shown.id ? 'primary' : undefined}
              dimColor={t.id !== shown.id}
              label={`${t.label} ${t.count}`}
              onPress={() => void selectTab($, t.id)}
            />
          ))}
        </Box>
        <Text dimColor>{'─'.repeat(Math.max(10, width))}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column">
        {tabs}
        {isGit && git?.header}
        {isGit && git?.error}
        {git?.assignBar}
        <Box flexDirection="column" paddingY={1}>
          {git?.detail ?? shown.body}
        </Box>
        <Text dimColor>{git?.detail ? 'b back · o open · c copy link · a comments or review · Esc close' : `1-${TABS.length} tabs · Tab/arrows move · Enter press · Esc close`}</Text>
      </Box>
    )
  })

  // One line above the prompt: what needs you, and a way into the pane
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if ((e.props as any).hasSurvey) return next(e)
    const asks = (await read($, inbox)).filter(a => !a.isResolved).length
    const list = await read($, roster)
    const d = await read($, mrsAtom)
    const hasGit = HOST !== 'none' && d.polledAt !== null
    const items = TRACKER_CMD ? await read($, tasks) : []
    if (asks === 0 && list.length === 0 && !hasGit && items.length === 0) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const active = list.filter(w => /running|busy|working/.test(w.state)).length
    const unread = unreadOf([...d.mine, ...d.review])
    const target = asks > 0 ? 'waiting' : hasGit && d.review.length > 0 ? 'reviews' : hasGit && unread > 0 ? 'mrs' : hasGit && d.free.length > 0 ? 'free' : items.length > 0 ? 'tasks' : 'fleet'
    return (
      <Box flexDirection="row" gap={1} paddingX={1}>
        <Text bold color="cyan">{ME}</Text>
        <Text color={asks > 0 ? 'yellow' : undefined} bold={asks > 0} dimColor={asks === 0}>{asks} waiting on you</Text>
        <Text dimColor>·</Text>
        <Text dimColor>{active}/{list.length} workers active</Text>
        {hasGit && <Text dimColor>·</Text>}
        {hasGit && (unread > 0 ? <Text color="yellow" bold>{plural(unread, 'new comment')}</Text> : <Text dimColor>no new comments</Text>)}
        {hasGit && <Text dimColor>·</Text>}
        {hasGit && <Text color={d.review.length > 0 ? 'magenta' : undefined} dimColor={d.review.length === 0}>{d.review.length} to review</Text>}
        {hasGit && d.free.length > 0 && <Text color="yellow">{d.free.length} unassigned</Text>}
        {hasGit && <Text dimColor>{plural(d.mine.length, NOUN())}</Text>}
        {TRACKER_CMD !== '' && <Text dimColor>· {plural(items.length, 'task')}</Text>}
        {d.error !== null && HOST !== 'none' && <Text color="red">poll failed</Text>}
        <Button key="band-open" plain label="open" hotkey="i" onPress={() => void openTab($, target)} />
      </Box>
    )
  })
}

async function selectTab($: $, to: string) {
  await $.state.set(TAB, to)
  await closeDetail($)
}

async function openTab($: $, to: string) {
  await selectTab($, to)
  await $.ui.open({ id: PANE, title: ME, focus: true, closeOnEscape: true })
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
