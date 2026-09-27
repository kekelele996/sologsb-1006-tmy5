export type CueStatus = 'pending' | 'confirmed' | 'followup'
export type TabId = 'live' | 'backstage' | 'terms' | 'offline'

export interface Speaker {
  id: string
  name: string
  title: string
  language: string
  color: string
}

export interface Session {
  id: string
  order: number
  time: string
  title: string
  speakerId: string
  room: string
  status: 'upcoming' | 'live' | 'done'
}

export interface Term {
  id: string
  source: string
  target: string
  note: string
  speakerId: string
  priority: 'normal' | 'high'
}

export interface Announcement {
  id: string
  level: 'info' | 'warning' | 'urgent'
  text: string
  visibleOnStage: boolean
  createdAt: string
}

export interface Cue {
  id: string
  speakerId: string
  text: string
  receivedAt: number
  status: CueStatus
  manual: boolean
  offline: boolean
  delaySeconds: number
  duplicateOf: string | null
  followupText: string
  tags: string[]
  relatedTo: string | null
}

export type ReviewResolution = 'merged' | 'admitted' | 'use-staged' | 'keep-live' | 'linked'

export interface ReviewItem {
  id: string
  stagedText: string
  speakerId: string
  receivedAt: number
  manual: boolean
  matchKind: 'exact' | 'similar' | 'none'
  matchCueId: string | null
  similarity: number
  status: 'pending' | 'resolved'
  resolution: ReviewResolution | null
  resultCueId: string | null
  resolvedAt: number | null
}

export interface Reminder {
  id: string
  termId: string
  cueId: string
  target: string
  createdAt: number
  acknowledged: boolean
}

export interface DeskState {
  speakers: Speaker[]
  sessions: Session[]
  terms: Term[]
  announcements: Announcement[]
  cues: Cue[]
  reminders: Reminder[]
  reviewQueue: ReviewItem[]
  activeCueId: string
  fontScale: number
  online: boolean
  liveSimulation: boolean
  updatedAt: string
}
