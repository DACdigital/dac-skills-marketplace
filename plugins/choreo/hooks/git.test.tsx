import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Mr, Thread } from '../types'
import { sortThreads, toWalk, walkContext } from './register'
import { config } from './config.testkit'

type On = Parameters<TestBody>[1]

const ROOT = '/work/proj'
const settle = () => new Promise(r => (globalThis as unknown as { setTimeout: (f: unknown, ms: number) => void }).setTimeout(r, 50))
const ok = (data: unknown) => ({ value: { status: 200, ok: true, headers: {}, text: JSON.stringify(data) } })
const run = (stdout: string, exitCode = 0) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
const pane = (surface: 'terminal' | 'desktop') =>
  ({ plugin: 'choreo', surface, component: 'Pane', requestId: 'choreo', props: { bodyColumns: 80 } }) as never

// What the mod wrote to the host, per test
let writes: unknown[] = []

// The engine around the mod, without the host calls
function base(on: On, env: Record<string, string> = {}, isCommandsMocked = true) {
  mock.store(on)
  mock.env(on, env)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__choreo__${e.name}` } }) as never)
  if (isCommandsMocked) on('command.register', (_$, e) => ({ value: { command: e.name } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'test: no timer' }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.status', () => ({ value: undefined }))
  on('ui.close', () => ({ value: undefined }) as never)
  on('clock.now', () => ({ value: Date.parse('2026-01-05T12:00:00Z') }))
}

// ---- GitLab: REST v4 through http.fetch ----

const GL = { gitHost: 'gitlab', gitlabUrl: 'https://gitlab.example', gitlabGroup: 'acme', projectRoot: ROOT }
const glMr = (project: number, iid: number, title: string, author: string, extra: Record<string, unknown> = {}) => ({
  project_id: project,
  iid,
  title,
  web_url: `https://gitlab.example/acme/${project === 101 ? 'web' : 'api'}/-/merge_requests/${iid}`,
  detailed_merge_status: 'mergeable',
  author: { username: author },
  source_branch: `feature/${iid}`,
  references: { full: `acme/${project === 101 ? 'web' : 'api'}!${iid}` },
  draft: false,
  ...extra,
})
const GL_TEAM = [
  { id: 7, username: 'alice', name: 'Alice Example', state: 'active' },
  { id: 8, username: 'bob', name: 'Bob Example', state: 'active' },
  { id: 9, username: 'carol', name: 'Carol Example', state: 'active' },
]
const GL_DISCUSSIONS = [
  { id: 'd1', notes: [{ system: false, resolvable: false, author: { username: 'bob' }, body: 'FYI the numbers moved', created_at: '2026-01-05T11:00:00Z' }] },
  {
    id: 'd2',
    notes: [{ system: false, resolvable: true, resolved: false, position: { new_path: 'src/parse.py', new_line: 42 }, author: { username: 'bob' }, body: 'Please rename match', created_at: '2026-01-05T11:05:00Z' }],
  },
]

function gitlab(on: On, opts: { mineStatus?: string; onAfter?: () => void } = {}) {
  base(on, { GITLAB_TOKEN: 'test-token' })
  on('process.run', () => run('[]') as never)
  on('clock.after', () => {
    opts.onAfter?.()
    return { deny: 'test' }
  })
  on('http.fetch', (_$, e) => {
    const url = e.url
    if (e.init?.method === 'PUT') {
      writes.push({ url, body: JSON.parse(e.init.body ?? '{}') })
      return ok({}) as never
    }
    if (url.endsWith('/api/v4/user')) return ok({ id: 7, username: 'alice', name: 'Alice Example' }) as never
    if (url.includes('/members/all')) return ok(GL_TEAM) as never
    if (url.includes('/discussions')) return ok(url.includes('/merge_requests/21/') ? GL_DISCUSSIONS : []) as never
    if (url.includes('/approvals')) return ok({ approved_by: [] }) as never
    if (url.includes('/pipelines')) return ok([{ status: 'failed' }]) as never
    if (url.includes('author_username=alice')) return ok([glMr(101, 21, 'Add the health check', 'alice', { detailed_merge_status: opts.mineStatus ?? 'mergeable' })]) as never
    if (url.includes('reviewer_username=alice')) return ok([glMr(102, 30, 'Speed up the parser', 'bob', { detailed_merge_status: 'not_approved' })]) as never
    if (url.includes('reviewer_id=None'))
      return ok([
        glMr(101, 22, 'Fix the login form', 'bob'),
        glMr(101, 12, 'Draft: notes', 'alice', { draft: true }),
        glMr(101, 31, 'WIP by bob', 'bob', { draft: true }),
      ]) as never
    return ok([]) as never
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`gitlab: tabs show one list at a time (${surface})`, async ($, on) => {
  config(on, GL)
    gitlab(on)
    await $.session.start({ cwd: ROOT, surface } as never)
    await settle()
    const ui = await $.ui.mount(pane(surface))
    expect((await ui.find({ key: 'tab-mrs' }))?.text).toBe('My MRs 1')
    await ui.press({ key: 'tab-mrs' })
    expect(await ui.find({ text: /Add the health check/ })).toBeDefined()
    expect(await ui.find({ text: /Speed up the parser/ })).toBeUndefined()
    // Mergeable, but an open thread keeps it from reading as ready, and it is the user's turn
    expect(await ui.find({ text: /mergeable, 1 open thread/ })).toBeDefined()
    expect(await ui.find({ text: /^your turn: 1 thread to answer$/ })).toBeDefined()

    await ui.press({ key: 'tab-reviews' })
    expect(await ui.find({ text: /Speed up the parser/ })).toBeDefined()
    expect(await ui.find({ text: /^your turn: not reviewed yet$/ })).toBeDefined()

    await ui.press({ key: 'tab-free' })
    // Others' MRs without a reviewer: not the user's own, not drafts
    expect(await ui.find({ text: /Fix the login form/ })).toBeDefined()
    expect(await ui.find({ text: /Draft: notes/ })).toBeUndefined()
    expect(await ui.find({ text: /WIP by bob/ })).toBeUndefined()
    expect(await ui.find({ key: 'Review-101!22' })).toBeDefined()
    await ui.unmount()
  })
}

test('gitlab: an MR opens a detail screen with its threads, b goes back', async ($, on) => {
  config(on, GL)
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-mrs' })
  await ui.press({ key: 'mr-101!21' })
  await settle()
  expect(await ui.find({ key: 'back' })).toBeDefined()
  expect(await ui.find({ key: 'd-open' })).toBeDefined()
  expect((await ui.find({ key: 'd-act' }))?.text).toMatch(/Go through comments/)
  const labels = (await ui.findAll({ type: 'Text', text: /^(open thread|comment)$/ })).map(f => f.text)
  expect(labels).toEqual(['open thread', 'comment'])
  expect(await ui.find({ text: /Please rename match/ })).toBeDefined()
  await ui.press({ key: 'back' })
  expect(await ui.find({ key: 'back' })).toBeUndefined()
  expect(await ui.find({ text: /Add the health check/ })).toBeDefined()
  await ui.unmount()
})

test("gitlab: a review MR's detail offers Review", async ($, on) => {
  config(on, GL)
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-reviews' })
  await ui.press({ key: 'mr-102!30' })
  await settle()
  expect((await ui.find({ key: 'd-act' }))?.text).toMatch(/Review/)
  await ui.unmount()
})

test('gitlab: the band shows comments, reviews and unassigned', async ($, on) => {
  config(on, GL)
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const band = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 100 } as never })
  expect(await band.find({ text: /1 to review/ })).toBeDefined()
  expect(await band.find({ text: /1 unassigned/ })).toBeDefined()
  expect(await band.find({ text: /^1 MR$/ })).toBeDefined()
  expect(await band.find({ key: 'band-open' })).toBeDefined()
  const row = await band.drawn()
  expect(row.type).toBe('Box')
  await band.unmount()
})

test('gitlab: Take asks first, then sets the user as reviewer', async ($, on) => {
  config(on, GL)
  writes = []
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-free' })
  await ui.press({ key: 'take-101!22' })
  expect(await ui.find({ text: /Set you as reviewer of web!22\?/ })).toBeDefined()
  expect(writes).toEqual([])
  await ui.press({ key: 'assign-no' })
  expect(await ui.find({ key: 'assign-yes' })).toBeUndefined()
  expect(writes).toEqual([])
  await ui.press({ key: 'take-101!22' })
  await ui.press({ key: 'assign-yes' })
  await settle()
  expect(writes).toEqual([{ url: 'https://gitlab.example/api/v4/projects/101/merge_requests/22', body: { reviewer_ids: [7] } }])
  await ui.unmount()
})

test('gitlab: Assign offers the team but not the author or the user', async ($, on) => {
  config(on, GL)
  writes = []
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-free' })
  await ui.press({ key: 'assign-101!22' })
  await settle()
  expect(await ui.find({ key: 'pick-9' })).toBeDefined()
  expect(await ui.find({ key: 'pick-8' })).toBeUndefined()
  expect(await ui.find({ key: 'pick-7' })).toBeUndefined()
  await ui.press({ key: 'pick-9' })
  expect(await ui.find({ text: /Set Carol Example as reviewer of web!22\?/ })).toBeDefined()
  expect(writes).toEqual([])
  await ui.press({ key: 'assign-yes' })
  await settle()
  expect(writes.map(w => (w as { body: { reviewer_ids: number[] } }).body.reviewer_ids)).toEqual([[9]])
  await ui.unmount()
})

test('gitlab: an MR the host is still checking reads so and is asked again', async ($, on) => {
  config(on, GL)
  let afters = 0
  gitlab(on, { mineStatus: 'unchecked', onAfter: () => (afters += 1) })
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-mrs' })
  expect(await ui.find({ text: /GitLab is checking/ })).toBeDefined()
  expect(afters).toBe(1)
  // A status that never settles gets two quick rechecks, then waits for the normal poll
  await ui.press({ key: 'refresh' })
  await settle()
  await ui.press({ key: 'refresh' })
  await settle()
  expect(afters).toBe(2)
  await ui.unmount()
})

test('gitlab: /comments answers with the MR it fetched, or lists the user\'s MRs', async ($, on) => {
  config(on, GL)
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const res = await $.command.run({ command: 'comments', args: '!21' } as never)
  expect(res.text).toMatch(/Fetched the comments on web!21/)
  const none = await $.command.run({ command: 'comments', args: '!999' } as never)
  expect(none.text).toMatch(/No matching MR. Yours: !21 Add the health check/)
})

test('gitlab: without a token the error shows on the tab', async ($, on) => {
  config(on, GL)
  base(on)
  on('process.run', () => run('[]') as never)
  on('http.fetch', () => ok([]) as never)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-mrs' })
  expect(await ui.find({ text: /GITLAB_TOKEN is not set/ })).toBeDefined()
  await ui.unmount()
})

test('no git host: no git tabs, no host calls', async ($, on) => {
  config(on, { projectRoot: ROOT })
  let calls = 0
  base(on)
  on('process.run', () => run('[]') as never)
  on('http.fetch', () => {
    calls += 1
    return ok([]) as never
  })
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ key: 'tab-mrs' })).toBeUndefined()
  expect(await ui.find({ key: 'tab-free' })).toBeUndefined()
  expect(calls).toBe(0)
  await ui.unmount()
})

test('outside the project root it stays off', async ($, on) => {
  config(on, GL)
  const registered: string[] = []
  let calls = 0
  base(on, {}, false)
  on('command.register', (_$, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  on('process.run', () => run('[]') as never)
  on('http.fetch', () => {
    calls += 1
    return ok([]) as never
  })
  await $.session.start({ cwd: '/work/other', surface: 'terminal' } as never)
  // A sibling folder whose name only starts the same is not the project
  await $.session.start({ cwd: '/work/proj-old', surface: 'terminal' } as never)
  await settle()
  expect(registered).toEqual([])
  expect(calls).toBe(0)
})

// ---- GitHub: the gh CLI through process.run ----

const GH = { gitHost: 'github', projectRoot: ROOT }
const pr = (number: number, title: string, author: string, extra: Record<string, unknown> = {}) => ({
  number,
  title,
  url: `https://github.example/acme/web/pull/${number}`,
  author: { login: author },
  headRefName: `feature/${number}`,
  isDraft: false,
  mergeStateStatus: 'CLEAN',
  reviewDecision: '',
  reviewRequests: [],
  latestReviews: [],
  ...extra,
})
const GH_THREADS = {
  data: {
    repository: {
      pullRequest: {
        reviewThreads: { nodes: [{ id: 't1', isResolved: false, path: 'src/parse.py', line: 42, comments: { nodes: [{ author: { login: 'bob' }, body: 'Please rename match', createdAt: '2026-01-05T11:05:00Z' }] } }] },
        comments: { nodes: [{ id: 'c1', author: { login: 'bob' }, body: 'FYI the numbers moved', createdAt: '2026-01-05T11:00:00Z' }] },
        reviews: { nodes: [{ id: 'r1', author: { login: 'carol' }, state: 'APPROVED', body: '', createdAt: '2026-01-05T11:10:00Z' }] },
      },
    },
  },
}
const NO_THREADS = { data: { repository: { pullRequest: { reviewThreads: { nodes: [] }, comments: { nodes: [] }, reviews: { nodes: [] } } } } }

function github(on: On) {
  base(on)
  on('clock.after', () => ({ deny: 'test' }))
  on('http.fetch', () => ok([]) as never)
  on('process.run', (_$, e) => {
    const a = e.argv
    if (a[0] !== 'gh') return run('[]') as never
    const has = (s: string) => a.some(x => x.includes(s))
    if (a[1] === 'api' && a[2] === 'user') return run(JSON.stringify({ login: 'alice', id: 7, name: 'Alice Example' })) as never
    if (a[1] === 'repo' && a[2] === 'view') return run(JSON.stringify({ nameWithOwner: 'acme/web' })) as never
    if (a[1] === 'api' && a[2] === 'graphql') return run(JSON.stringify(a.includes('n=21') ? GH_THREADS : NO_THREADS)) as never
    if (a[1] === 'api' && has('collaborators'))
      return run(JSON.stringify([{ login: 'alice', id: 7 }, { login: 'bob', id: 8 }, { login: 'carol', id: 9 }])) as never
    if (a[1] === 'pr' && a[2] === 'edit') {
      writes.push([...a])
      return run('') as never
    }
    if (a[1] === 'pr' && a[2] === 'list') {
      if (has('--author')) return run(JSON.stringify([pr(21, 'Add the health check', 'alice')])) as never
      if (has('review-requested:@me')) return run(JSON.stringify([pr(30, 'Speed up the parser', 'bob', { mergeStateStatus: 'BLOCKED', reviewDecision: 'REVIEW_REQUIRED' })])) as never
      if (has('reviewed-by:@me')) return run('[]') as never
      return run(
        JSON.stringify([
          pr(21, 'Add the health check', 'alice'),
          pr(22, 'Fix the login form', 'bob'),
          pr(23, 'WIP by bob', 'bob', { isDraft: true }),
          pr(24, 'Already asked', 'carol', { reviewRequests: [{ login: 'bob' }] }),
        ]),
      ) as never
    }
    return run('[]') as never
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`github: tabs list PRs of the project's repo (${surface})`, async ($, on) => {
  config(on, GH)
    github(on)
    await $.session.start({ cwd: ROOT, surface } as never)
    await settle()
    const ui = await $.ui.mount(pane(surface))
    expect((await ui.find({ key: 'tab-mrs' }))?.text).toBe('My PRs 1')
    await ui.press({ key: 'tab-mrs' })
    expect(await ui.find({ text: /Add the health check/ })).toBeDefined()
    expect(await ui.find({ text: /^your turn: 1 thread to answer$/ })).toBeDefined()
    expect(await ui.find({ text: /^web#21$/ })).toBeDefined()

    await ui.press({ key: 'tab-reviews' })
    expect(await ui.find({ text: /Speed up the parser/ })).toBeDefined()
    expect(await ui.find({ text: /needs approval/ })).toBeDefined()

    await ui.press({ key: 'tab-free' })
    // Not the user's own, not drafts, not one with a review request
    expect(await ui.find({ text: /Fix the login form/ })).toBeDefined()
    expect(await ui.find({ text: /WIP by bob/ })).toBeUndefined()
    expect(await ui.find({ text: /Already asked/ })).toBeUndefined()
    expect(await ui.find({ text: /Add the health check/ })).toBeUndefined()
    await ui.unmount()
  })
}

test('github: a PR opens a detail screen with review threads and comments', async ($, on) => {
  config(on, GH)
  github(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-mrs' })
  await ui.press({ key: 'mr-acme/web#21' })
  await settle()
  const labels = (await ui.findAll({ type: 'Text', text: /^(open thread|comment)$/ })).map(f => f.text)
  expect(labels).toEqual(['open thread', 'comment'])
  expect(await ui.find({ text: /src\/parse\.py/ })).toBeDefined()
  expect(await ui.find({ text: /1 open thread/ })).toBeDefined()
  await ui.unmount()
})

test('github: Take asks first, then adds the user as reviewer with gh', async ($, on) => {
  config(on, GH)
  writes = []
  github(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-free' })
  await ui.press({ key: 'take-acme/web#22' })
  expect(await ui.find({ text: /Set you as reviewer of web#22\?/ })).toBeDefined()
  expect(writes).toEqual([])
  await ui.press({ key: 'assign-yes' })
  await settle()
  expect(writes).toEqual([['gh', 'pr', 'edit', '22', '-R', 'acme/web', '--add-reviewer', 'alice']])
  await ui.unmount()
})

test("github: Assign offers the repo's collaborators but not the author or the user", async ($, on) => {
  config(on, GH)
  writes = []
  github(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-free' })
  await ui.press({ key: 'assign-acme/web#22' })
  await settle()
  expect(await ui.find({ key: 'pick-9' })).toBeDefined()
  expect(await ui.find({ key: 'pick-8' })).toBeUndefined()
  expect(await ui.find({ key: 'pick-7' })).toBeUndefined()
  await ui.press({ key: 'pick-9' })
  await ui.press({ key: 'assign-yes' })
  await settle()
  expect(writes).toEqual([['gh', 'pr', 'edit', '22', '-R', 'acme/web', '--add-reviewer', 'carol']])
  await ui.unmount()
})

test('github: /comments finds a PR by its number', async ($, on) => {
  config(on, GH)
  github(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const res = await $.command.run({ command: 'comments', args: '#21' } as never)
  expect(res.text).toMatch(/Fetched the comments on web#21/)
})

// ---- The walkthrough text ----

test('the walkthrough picks open threads and unanswered comments, open first', () => {
  const threads: Thread[] = [
    { id: 'c1', resolvable: false, resolved: null, path: null, line: null, notes: [{ author: 'bob', body: 'FYI the numbers moved', at: '2026-01-05T11:00:00Z' }] },
    { id: 'c2', resolvable: false, resolved: null, path: null, line: null, notes: [{ author: 'bob', body: 'Q?', at: 'x' }, { author: 'alice', body: 'A.', at: 'y' }] },
    { id: 'r1', resolvable: true, resolved: true, path: 'a.py', line: 3, notes: [{ author: 'bob', body: 'done', at: 'x' }] },
    { id: 'o1', resolvable: true, resolved: false, path: 'src/parse.py', line: 42, notes: [{ author: 'bob', body: 'Please rename match', at: 'x' }] },
  ]
  const walk = toWalk(sortThreads(threads), 'alice')
  // Resolved and already answered are left out
  expect(walk.map(t => t.id)).toEqual(['o1', 'c1'])

  const mr = { project: '101', iid: '21', repo: 'web', title: 'Add the health check', url: 'https://gitlab.example/acme/web/-/merge_requests/21' } as Mr
  const ctx = walkContext(mr, walk, 'alice', 'gitlab')
  expect(ctx).toMatch(/ONE AT A TIME/)
  expect(ctx).toMatch(/Never post a reply or resolve a thread in GitLab before the person approves/)
  expect(ctx).toMatch(/project_id 101, merge_request_iid 21/)
  expect(ctx).toMatch(/### 1\/2: open thread at src\/parse\.py:42 \(id o1\)/)
  expect(ctx).toMatch(/### 2\/2: comment \(id c1\)/)

  const hub = walkContext({ ...mr, project: 'acme/web' }, walk, 'alice', 'github')
  expect(hub).toMatch(/^PR web#21: Add the health check/)
  expect(hub).toMatch(/in GitHub before the person approves/)
})

test('gitlab: an MR waiting on CI reads CI failed when its latest pipeline failed', async ($, on) => {
  config(on, GL)
  gitlab(on, { mineStatus: 'ci_must_pass' })
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-mrs' })
  expect(await ui.find({ text: /CI failed/ })).toBeDefined()
  await ui.unmount()
})

test('gitlab: a thread links to its note and resolves only from its own button', async ($, on) => {
  config(on, GL)
  writes = []
  gitlab(on)
  await $.session.start({ cwd: ROOT, surface: 'terminal' } as never)
  await settle()
  const ui = await $.ui.mount(pane('terminal'))
  await ui.press({ key: 'tab-mrs' })
  await ui.press({ key: 'mr-101!21' })
  await settle()
  expect(await ui.find({ key: 'web-d2' })).toBeDefined()
  expect(await ui.find({ key: 'resolve-d1' })).toBeUndefined()
  expect(writes).toEqual([])
  await ui.press({ key: 'resolve-d2' })
  await settle()
  expect(writes.map(w => (w as { url: string }).url)).toEqual(['https://gitlab.example/api/v4/projects/101/merge_requests/21/discussions/d2?resolved=true'])
  await ui.unmount()
})
