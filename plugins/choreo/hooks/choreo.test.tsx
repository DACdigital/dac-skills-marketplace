import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { config } from './config.testkit'

const submitted: string[] = []

const TRACKER_OUT = JSON.stringify([
  { key: 'TASK-2', title: 'Write the release notes', state: 'Todo', url: 'https://tracker.example/TASK-2', rank: 5 },
  { key: 'TASK-1', title: 'Add a health check endpoint', state: 'In progress', url: 'https://tracker.example/TASK-1', rank: 1 },
])

function world(on: On, trackerOut = TRACKER_OUT) {
  on('prompt.submit' as any, (_$: any, e: any) => { submitted.push(e.text); return { text: e.text } as any })
  on('prompt.fill' as any, (_$: any, e: any) => { submitted.push(e.text); return { isFilled: true } as any })
  on('ui.close' as any, () => ({ value: undefined }) as any)
  mock.store(on)
  mock.env(on, {})
  on('clock.now', () => ({ value: Date.parse('2026-01-05T12:00:00Z') }))
  on('session.receive', (_$, e) => ({ text: e.text }))
  on('ui.toast' as any, () => ({ value: undefined }) as any)
  on('ui.status' as any, () => ({ value: undefined }) as any)
  // The tracker command runs through bash, every other call is a claude or python helper
  on('process.run' as any, (_$: any, e: any) => ({
    value: { exitCode: 0, stdout: (e.argv ?? e.command ?? [])[0] === 'bash' ? trackerOut : '[]', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }) as any)
}

const PANE = { component: 'Pane', requestId: 'choreo', props: {} } as any

test('a tagged question shows in the pane as waiting', async ($, on) => {
  world(on)
  await $.session.receive({ origin: { kind: 'peer' }, text: '[choreo TASK-1-develop question] A or B? I recommend A.' } as any)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'choreo', surface, ...PANE })
    expect((await ui.find({ key: 'tab-waiting' }))?.text).toBe('Waiting 1')
    expect(await ui.find({ type: 'Text', text: /A or B/ })).toBeDefined()
    await ui.press({ key: 'tab-fleet' })
    expect(await ui.find({ type: 'Text', text: /^waiting$/ })).toBeDefined()
    await ui.press({ key: 'tab-waiting' })
    await ui.unmount()
  }
})

test('an untagged message is left alone', async ($, on) => {
  world(on)
  await $.session.receive({ origin: { kind: 'peer' }, text: 'hello there' } as any)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /Nothing waiting on you/ })).toBeDefined()
  expect((await ui.find({ key: 'tab-fleet' }))?.text).toBe('Fleet 0')
  await ui.unmount()
})

test('the Fleet tab says how to start when there are no workers', async ($, on) => {
  world(on)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  await ui.press({ key: 'tab-fleet' })
  expect(await ui.find({ type: 'Text', text: /No workers yet/ })).toBeDefined()
  await ui.unmount()
})

test('my own question shows in Waiting with options, and a press answers it as a prompt', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'mcp__choreo__ask', title: 'TASK-7: scope', text: 'Ship part one now?', options: ['yes, part one', 'wait for TASK-8'] } as any)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /TASK-7: scope/ })).toBeDefined()
  expect((await ui.find({ key: 'tab-waiting' }))?.text).toBe('Waiting 1')
  expect(await ui.find({ type: 'Button', text: /^wait for TASK-8$/ } as any)).toBeDefined()
  const opt = await ui.find({ type: 'Button', text: /^yes, part one$/ } as any)
  expect(opt).toBeDefined()
  await ui.press({ key: (opt as any).key })
  expect(submitted.at(-1)).toMatch(/^Decision Choreographer#\S+ \(TASK-7: scope\): yes, part one$/)
  expect((await ui.find({ key: 'tab-waiting' }))?.text).toBe('Waiting 0')
  await ui.unmount()
})

test('Waiting lists every card oldest first, the coordinator\'s and the workers\' mixed by time', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'mcp__choreo__ask', title: 'first card', text: 'one' } as any)
  await new Promise(r => (globalThis as any).setTimeout(r, 5))
  await $.session.receive({ origin: { kind: 'peer' }, text: '[choreo TASK-9-develop question] second card' } as any)
  await new Promise(r => (globalThis as any).setTimeout(r, 5))
  await $.tool.call({ tool: 'mcp__choreo__ask', title: 'third card', text: 'three' } as any)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  const texts = ((await ui.find({ type: 'Box' } as any)) as any)?.text ?? ''
  const at = (s: string) => texts.indexOf(s)
  expect(at('first card')).toBeGreaterThan(-1)
  expect(at('first card')).toBeLessThan(at('second card'))
  expect(at('second card')).toBeLessThan(at('third card'))
  await ui.unmount()
})

test('without a tracker command there is no My tasks tab', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'mcp__choreo__list' } as any)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  expect(await ui.find({ key: 'tab-tasks' })).toBeUndefined()
  await ui.unmount()
})

test('a tracker command fills My tasks, by rank, and start worker fills the prompt', async ($, on) => {
  config(on, { trackerCommand: 'my-tracker --open' })
  world(on)
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__choreo__${e.name}` } }) as never)
  on('command.register', (_$, e) => ({ value: { command: e.name } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'test: no timer' }))
  await $.session.start({ cwd: '/work/proj', surface: 'terminal' } as never)
  await $.tool.call({ tool: 'mcp__choreo__list' } as any)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'tab-tasks' }))?.text).toBe('My tasks 2')
  await ui.press({ key: 'tab-tasks' })
  expect(await ui.find({ type: 'Link', text: /TASK-1$/ } as any)).toBeDefined()
  const texts = ((await ui.find({ type: 'Box' } as any)) as any)?.text ?? ''
  expect(texts.indexOf('In progress')).toBeLessThan(texts.indexOf('Todo'))
  await ui.press({ key: 'start-TASK-1' })
  expect(submitted.at(-1)).toBe('Prepare a worker for TASK-1 (Add a health check endpoint): read the item, pick repo and branch, draft the task, show it to me. Launch only after my yes.')
  await ui.unmount()
})

test('a tagged report keeps its body without the closing tag of the cross-session wrapper', async ($, on) => {
  world(on)
  await $.session.receive({ origin: { kind: 'peer' }, text: '<cross-session-message from="w">[choreo TASK-3-fix question] Rename it? I recommend yes.</cross-session-message>' } as any)
  const out = await $.tool.call({ tool: 'mcp__choreo__list' } as any)
  const text = JSON.stringify(out)
  expect(text).toContain('Rename it? I recommend yes.')
  expect(text).not.toContain('</cross-session-message>')
})

test('tracker.flow rules pick the buttons by state and label', async ($, on) => {
  on('fs.read', (_$: any, e: any) => ({
    value: JSON.stringify({
      tracker: {
        type: 'command',
        command: 'my-tracker',
        flow: [
          { label: 'hotfix', actions: [{ label: 'develop', kind: 'develop', brief: 'a hotfix for {key}, no spec.' }] },
          { states: ['Todo'], actions: [{ label: 'spec', kind: 'spec', brief: 'write the spec.' }, { label: 'quick fix', kind: 'develop', brief: 'a small change.' }] },
        ],
      },
    }),
  }) as never)
  on('fs.exists', () => ({ value: true }) as never)
  world(
    on,
    JSON.stringify([
      { key: 'TASK-5', title: 'Fix the crash', state: 'Todo', labels: ['hotfix'] },
      { key: 'TASK-6', title: 'New report', state: 'Todo' },
      { key: 'TASK-7', title: 'Other', state: 'In progress' },
    ]),
  )
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__choreo__${e.name}` } }) as never)
  on('command.register', (_$, e) => ({ value: { command: e.name } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'test: no timer' }))
  await $.session.start({ cwd: '/work/proj', surface: 'terminal' } as never)
  await $.tool.call({ tool: 'mcp__choreo__list' } as any)
  const ui = await $.ui.mount({ plugin: 'choreo', surface: 'terminal', ...PANE })
  await ui.press({ key: 'tab-tasks' })
  expect((await ui.find({ key: 'act0-TASK-5' }))?.text).toBe('develop')
  expect(await ui.find({ key: 'act1-TASK-5' })).toBeUndefined()
  expect((await ui.find({ key: 'act1-TASK-6' }))?.text).toBe('quick fix')
  expect(await ui.find({ key: 'start-TASK-7' })).toBeDefined()
  await ui.press({ key: 'act0-TASK-5' })
  expect(submitted.at(-1)).toBe('Prepare a develop worker for TASK-5 ("Fix the crash"): a hotfix for TASK-5, no spec. Read the tracker item, pick the repo and branch, draft the worker task, and show it to me. Launch only after my yes.')
  await ui.unmount()
})

test('launch tells the worker where visuals go and git-excludes that folder', async ($, on) => {
  const runs: string[][] = []
  on('fs.read', () => ({ value: JSON.stringify({ projectRoot: '/work/proj', scratchDir: 'shots' }) }) as never)
  on('fs.exists', () => ({ value: true }) as never)
  mock.store(on)
  mock.env(on, {})
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__choreo__${e.name}` } }) as never)
  on('command.register', (_$, e) => ({ value: { command: e.name } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'test: no timer' }))
  on('ui.status' as any, () => ({ value: undefined }) as any)
  on('process.run' as any, (_$: any, e: any) => {
    runs.push(e.argv)
    return { value: { exitCode: 0, stdout: (e.argv ?? [])[0] === 'claude' && e.argv[1] === '--bg' ? 'started abcdef12' : '[]', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/work/proj', surface: 'terminal' } as never)
  await $.tool.call({ tool: 'mcp__choreo__launch', kind: 'develop', repo: '.', name: 'w1', task: 'Do it.' } as any)
  const bg = runs.find(a => a[0] === 'claude' && a[1] === '--bg')
  expect(bg?.at(-1)).toContain('in /work/proj/shots/, not in your worktree')
  expect(runs.some(a => a[0] === 'bash' && /info\/exclude/.test(a[2] ?? '') && a[2]!.includes("'/shots/'"))).toBe(true)
  // launch starts a roster refresh it does not wait for
  await new Promise(r => (globalThis as unknown as { setTimeout: (f: unknown, ms: number) => void }).setTimeout(r, 50))
})

test('launch in a nested repo puts the worktree under its .worktrees folder and git-excludes it', async ($, on) => {
  const runs: string[][] = []
  on('fs.read', () => ({ value: JSON.stringify({ projectRoot: '/work/proj', scratchDir: '' }) }) as never)
  on('fs.exists', () => ({ value: true }) as never)
  mock.store(on)
  mock.env(on, {})
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__choreo__${e.name}` } }) as never)
  on('command.register', (_$, e) => ({ value: { command: e.name } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'test: no timer' }))
  on('ui.status' as any, () => ({ value: undefined }) as any)
  on('process.run' as any, (_$: any, e: any) => {
    runs.push(e.argv)
    return { value: { exitCode: 0, stdout: (e.argv ?? [])[0] === 'claude' && e.argv[1] === '--bg' ? 'started abcdef12' : '[]', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/work/proj', surface: 'terminal' } as never)
  await $.tool.call({ tool: 'mcp__choreo__launch', kind: 'develop', repo: 'workspace/svc', name: 'w1', task: 'Do it.' } as any)
  const wt = runs.find(a => a[0] === 'bash' && (a[2] ?? '').includes('git worktree add'))?.[2] ?? ''
  expect(wt).toContain("cd '/work/proj/workspace/svc'")
  expect(wt).toContain("'/work/proj/workspace/svc/.worktrees/w1'")
  expect(wt).not.toContain('svc-w1')
  expect(/info\/exclude/.test(wt) && wt.includes("'/.worktrees/'")).toBe(true)
  // launch starts a roster refresh it does not wait for
  await new Promise(r => (globalThis as unknown as { setTimeout: (f: unknown, ms: number) => void }).setTimeout(r, 50))
})

test('a session inside a nested repo worktree stays off', async ($, on) => {
  const registered: string[] = []
  on('fs.read', () => ({ value: JSON.stringify({ projectRoot: '/work/proj' }) }) as never)
  on('fs.exists', () => ({ value: true }) as never)
  mock.store(on)
  mock.env(on, {})
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__choreo__${e.name}` } }) as never)
  on('command.register', (_$, e) => {
    registered.push(e.name)
    return { value: { command: e.name } } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ deny: 'test: no timer' }))
  on('ui.status' as any, () => ({ value: undefined }) as any)
  on('process.run' as any, () => ({ value: { exitCode: 0, stdout: '[]', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.session.start({ cwd: '/work/proj/workspace/svc/.worktrees/w1', surface: 'terminal' } as never)
  expect(registered).toEqual([])
})
