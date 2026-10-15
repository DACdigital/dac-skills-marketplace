// Test helper, not loaded by the engine: hooks.json names register.tsx only
// The config file the mod reads at session.start, from the flat test settings
export function config(on: any, o: Record<string, string>) {
  const file = {
    projectRoot: o.projectRoot ?? '',
    tracker: o.trackerCommand ? { type: 'command', command: o.trackerCommand } : { type: 'none' },
    git: { host: o.gitHost ?? 'none', gitlabUrl: o.gitlabUrl ?? '', gitlabGroup: o.gitlabGroup ?? '' },
  }
  on('fs.read', (_$: any, e: any) => (e.path.endsWith('/.claude/choreo.json') ? { value: JSON.stringify(file) } : { deny: 'test: no such file' }))
  on('fs.exists', () => ({ value: true }))
}
