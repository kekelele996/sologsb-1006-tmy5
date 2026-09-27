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

export type MergeAction = 'identical' | 'keep-existing' | 'use-incoming' | 'linked'

export interface MergeRecord {
  at: number
  action: MergeAction
  otherCueId: string
  detail: string
}

export interface Cue {
  id: string
  speakerId: string
  text: string
  receivedAt: number
  status: CueStatus
  manual: boolean
  offline: boolean
  /** 恢复合并后进入待核对队列，核对完成前不得进入现场输出 */
  reviewPending: boolean
  delaySeconds: number
  duplicateOf: string | null
  followupText: string
  tags: string[]
  /** 与离线暂存条目的合并/核对历史，始终保留在原条目上 */
  mergeRecords: MergeRecord[]
  /** 相近内容选择“保留两版”后，互相关联的另一条目 */
  linkedCueId: string | null
}

export type ReviewResolution = MergeAction

export interface ReviewItem {
  id: string
  status: 'pending' | 'resolved'
  incomingCueId: string
  existingCueId: string
  /** 创建核对单时快照的两版文本，便于核对后仍能比对 */
  incomingText: string
  existingText: string
  incomingReceivedAt: number
  similarity: number
  resolution: ReviewResolution | null
  relationNote: string
  createdAt: number
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
  /** 恢复连接后生成的待核对队列，本机持久化，重开可继续处理 */
  reviews: ReviewItem[]
  reminders: Reminder[]
  activeCueId: string
  fontScale: number
  online: boolean
  liveSimulation: boolean
  updatedAt: string
}
