export type WorkerKind = 'spec' | 'plan' | 'develop' | 'review' | 'fix'

export type Worker = {
  name: string
  // A tracker id or a short label; empty when the task has none
  item: string
  kind: WorkerKind
  task: string
  cwd: string
  branch?: string
  sessionId?: string
  bgId?: string
  state: string
  last?: string
  updatedAt: number
}

export type Ask = {
  id: string
  from: string
  text: string
  at: number
  isResolved: boolean
  // The coordinator's own questions: a short title and the choices offered as buttons
  title?: string
  options?: string[]
}

// One item from the trackerCommand's JSON output
export type Task = {
  key: string
  title: string
  state: string
  url?: string
  labels?: string[]
  // Lower needs the user sooner
  rank?: number
  // urgent, high, medium, low or none: breaks ties within a rank
  priority?: string
}

// A merge request (GitLab) or pull request (GitHub), the same shape for both hosts
export type Mr = {
  // project and iid: GitLab project id and MR iid, or GitHub owner/repo and PR number
  key: string
  project: string
  iid: string
  // The repo name for display, e.g. web for owner/web
  repo: string
  title: string
  url: string
  // A GitLab detailed_merge_status, or the same words mapped from GitHub
  status: string
  // Status of the latest pipeline, asked only when a GitLab MR waits on CI
  pipeline?: string
  author: string
  branch?: string
  notes: number
  newNotes: number
  lastBy: string
  // Resolvable threads not resolved yet. The host may still call such an MR mergeable
  openThreads: number
  // Comments the user wrote, and open threads where someone else had the last word
  mine: number
  waiting: number
  // Who approved it, by username
  approvedBy: string[]
}

export type Inbox = {
  mine: Mr[]
  review: Mr[]
  // Open MRs of others with no reviewer yet
  free: Mr[]
  polledAt: number | null
  error: string | null
}

export type Note = { author: string; body: string; at: string }

export type Thread = {
  id: string
  // A link straight to the thread on the host
  link?: string
  resolvable: boolean
  resolved: boolean | null
  path: string | null
  line: number | null
  notes: Note[]
}

// The MR on the detail screen, with its threads once fetched
export type Detail = { key: string; threads: Thread[] | null; error: string | null }

export type Member = { id: number; username: string; name: string }

// A reviewer change waiting for the user's yes: picking someone, then confirming
export type Assign = { key: string; member: Member | null }

declare module 'claude-code' {
  interface PluginState {
    choreo: { roster: Worker[]; inbox: Ask[]; tasks: Task[]; tasksAt: number; tab: string
      mrs: Inbox; detail: Detail | null; members: Member[]; assign: Assign | null }
  }
}
