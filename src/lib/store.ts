import { writable, get } from 'svelte/store'
import type { Announcement, Cue, CueStatus, DeskState, MergeAction, MergeRecord, Reminder, ReviewItem, Session, Speaker, Term } from './types'

const STORAGE_KEY = 'conference-cue-desk-v1'
const speakers: Speaker[] = [
  { id: 'sp-1', name: 'Dr. Maya Chen', title: '首席气候科学家', language: '英语 → 中文', color: '#0f766e' },
  { id: 'sp-2', name: '刘启明', title: '城市韧性研究员', language: '中文 → 英语', color: '#b45309' },
  { id: 'sp-3', name: 'Prof. Daniel Ortiz', title: '公共卫生政策顾问', language: '西班牙语 → 中文', color: '#6d28d9' },
  { id: 'sp-4', name: '佐藤 美咲', title: '社区能源设计师', language: '日语 → 中文', color: '#be123c' }
]
const sessions: Session[] = [
  { id: 'se-1', order: 1, time: '09:00', title: '开幕式与议程说明', speakerId: 'sp-2', room: '主会场 A', status: 'done' },
  { id: 'se-2', order: 2, time: '09:20', title: '城市热岛与适应性基础设施', speakerId: 'sp-1', room: '主会场 A', status: 'live' },
  { id: 'se-3', order: 3, time: '10:05', title: '社区健康数据的地方行动', speakerId: 'sp-3', room: '主会场 A', status: 'upcoming' },
  { id: 'se-4', order: 4, time: '10:45', title: '分布式能源与社区共治', speakerId: 'sp-4', room: '主会场 A', status: 'upcoming' }
]
const terms: Term[] = [
  { id: 'term-1', source: 'urban heat island', target: '城市热岛', note: '首次出现完整译出，后可简称热岛', speakerId: 'sp-1', priority: 'high' },
  { id: 'term-2', source: 'resilience', target: '韧性', note: '不使用“恢复力”', speakerId: 'sp-1', priority: 'high' },
  { id: 'term-3', source: 'co-benefit', target: '协同效益', note: '环境与健康共同收益', speakerId: 'sp-1', priority: 'normal' },
  { id: 'term-4', source: 'distributed energy resource', target: '分布式能源资源', note: '缩写 DER', speakerId: 'sp-4', priority: 'high' },
  { id: 'term-5', source: 'health equity', target: '健康公平', note: '不译为健康平等', speakerId: 'sp-3', priority: 'high' }
]
function initialCues(): Cue[] {
  const now = Date.now()
  return [
    { id: 'cue-101', speakerId: 'sp-1', text: 'The urban heat island effect is not evenly distributed across a city.', receivedAt: now - 36000, status: 'confirmed', manual: false, offline: false, reviewPending: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['城市热岛'], mergeRecords: [], linkedCueId: null },
    { id: 'cue-102', speakerId: 'sp-1', text: 'Neighborhoods with less tree canopy can be several degrees warmer at night.', receivedAt: now - 19000, status: 'confirmed', manual: false, offline: false, reviewPending: false, delaySeconds: 6, duplicateOf: null, followupText: '补译：“夜间温差可达数摄氏度。”', tags: ['树冠覆盖率'], mergeRecords: [], linkedCueId: null },
    { id: 'cue-103', speakerId: 'sp-1', text: 'Our resilience strategy links cooling corridors with public health investments.', receivedAt: now - 9000, status: 'pending', manual: false, offline: false, reviewPending: false, delaySeconds: 11, duplicateOf: null, followupText: '', tags: ['韧性', '协同效益'], mergeRecords: [], linkedCueId: null },
    { id: 'cue-104', speakerId: 'sp-1', text: 'That data also reveals health equity gaps between districts.', receivedAt: now - 2500, status: 'pending', manual: false, offline: false, reviewPending: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['健康公平'], mergeRecords: [], linkedCueId: null }
  ]
}
function demoState(): DeskState {
  return {
    speakers, sessions, terms, cues: initialCues(), reviews: [], reminders: [], activeCueId: 'cue-103', fontScale: 100,
    announcements: [
      { id: 'ann-1', level: 'info', text: '十点整有消防联动测试，请提醒会场人员保持镇定。', visibleOnStage: false, createdAt: new Date().toISOString() },
      { id: 'ann-2', level: 'urgent', text: '请下一位发言人提前到侧台候场。', visibleOnStage: false, createdAt: new Date().toISOString() }
    ],
    online: true, liveSimulation: true, updatedAt: new Date().toISOString()
  }
}
function clone<T>(value: T): T { return structuredClone(value) }
/** 旧版本存档补齐新字段，保证升级后待核对队列仍可继续处理 */
function migrate(state: DeskState): DeskState {
  state.cues.forEach(cue => {
    if (!Array.isArray(cue.mergeRecords)) cue.mergeRecords = []
    if (cue.linkedCueId === undefined) cue.linkedCueId = null
    if (cue.reviewPending === undefined) cue.reviewPending = false
  })
  if (!Array.isArray(state.reviews)) state.reviews = []
  return state
}
function loadState(): DeskState {
  if (typeof localStorage === 'undefined') return demoState()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? migrate({ ...demoState(), ...JSON.parse(saved), online: navigator.onLine }) : demoState()
  } catch { return demoState() }
}
const history: DeskState[] = []
const future: DeskState[] = []
export const desk = writable<DeskState>(loadState())

function persist(state: DeskState) {
  state.updatedAt = new Date().toISOString()
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
function commit(recipe: (state: DeskState) => void) {
  const current = clone(get(desk))
  const next = clone(current)
  recipe(next)
  history.push(current)
  if (history.length > 60) history.shift()
  future.length = 0
  persist(next)
  desk.set(next)
}
export function undoDesk() {
  const previous = history.pop()
  if (!previous) return
  future.push(clone(get(desk)))
  desk.set(previous); persist(previous)
}
export function redoDesk() {
  const next = future.pop()
  if (!next) return
  history.push(clone(get(desk)))
  desk.set(next); persist(next)
}
export const canUndo = () => history.length > 0
export const canRedo = () => future.length > 0

export function addSpeaker() {
  commit(state => state.speakers.push({ id: `sp-${Date.now()}`, name: '新发言人', title: '待填写机构与职务', language: '待设置语言方向', color: '#475569' }))
}
export function updateSpeaker(id: string, patch: Partial<Speaker>) { commit(state => { const item = state.speakers.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
export function addSession() {
  commit(state => state.sessions.push({ id: `se-${Date.now()}`, order: Math.max(0, ...state.sessions.map(item => item.order)) + 1, time: '11:30', title: '新演讲', speakerId: state.speakers[0]?.id || '', room: '主会场 A', status: 'upcoming' }))
}
export function updateSession(id: string, patch: Partial<Session>) { commit(state => { const item = state.sessions.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
export function addTerm() { commit(state => state.terms.push({ id: `term-${Date.now()}`, source: 'new term', target: '新术语', note: '', speakerId: state.speakers[0]?.id || '', priority: 'normal' })) }
export function updateTerm(id: string, patch: Partial<Term>) { commit(state => { const item = state.terms.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
export function addAnnouncement(text: string, level: Announcement['level']) {
  if (!text.trim()) return
  commit(state => state.announcements.unshift({ id: `ann-${Date.now()}`, level, text: text.trim(), visibleOnStage: false, createdAt: new Date().toISOString() }))
}
export function publishAnnouncement(id: string, visible: boolean) { commit(state => { const item = state.announcements.find(row => row.id === id); if (item) item.visibleOnStage = visible }) }

export interface ReconnectResult {
  identical: number
  similar: number
  released: number
  /** 恢复时不存在离线暂存，没有任何条目需要核对 */
  nothing: boolean
}

export function setOnline(online: boolean): ReconnectResult | null {
  if (get(desk).online === online) return null
  let result: ReconnectResult = { identical: 0, similar: 0, released: 0, nothing: false }
  commit(state => {
    state.online = online
    if (online) result = runReconnectReview(state)
  })
  return result
}

/**
 * 恢复连接后的合并闸门：
 * - 完全相同：自动并入原条目，在原条目留下合并记录，暂存条目不进入现场队列；
 * - 相近内容：生成待核对单并保留两版，核对完成前双方都不得进入现场输出；
 * - 不重复：正常放行进入现场队列。
 */
function runReconnectReview(state: DeskState): ReconnectResult {
  const offlineCues = state.cues.filter(cue => cue.offline)
  if (!offlineCues.length) return { identical: 0, similar: 0, released: 0, nothing: true }
  const result: ReconnectResult = { identical: 0, similar: 0, released: 0, nothing: false }
  for (const incoming of offlineCues) {
    incoming.offline = false
    const baseline = state.cues.filter(item => item.id !== incoming.id && !item.offline && !item.reviewPending)
    const identical = baseline.find(item => normalizeText(item.text) === normalizeText(incoming.text))
    if (identical) {
      appendMergeRecord(identical, {
        at: Date.now(), action: 'identical', otherCueId: incoming.id,
        detail: `离线暂存的完全相同内容（${formatClock(incoming.receivedAt)} 录入）已自动并入本条。`
      })
      state.cues = state.cues.filter(item => item.id !== incoming.id)
      result.identical++
      continue
    }
    const similar = findDuplicate(incoming.text, baseline)
    if (similar) {
      incoming.reviewPending = true
      similar.reviewPending = true
      state.reviews.unshift({
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        status: 'pending', incomingCueId: incoming.id, existingCueId: similar.id,
        incomingText: incoming.text, existingText: similar.text, incomingReceivedAt: incoming.receivedAt,
        similarity: similarity(incoming.text, similar.text),
        resolution: null, relationNote: '', createdAt: Date.now(), resolvedAt: null
      })
      result.similar++
      continue
    }
    incoming.duplicateOf = findDuplicate(incoming.text, baseline)?.id || null
    result.released++
  }
  return result
}

function appendMergeRecord(cue: Cue, record: MergeRecord) {
  cue.mergeRecords.unshift(record)
  if (cue.mergeRecords.length > 20) cue.mergeRecords.length = 20
}

/** 待核对未处理完的条目不得进入现场输出（也不允许确认已传） */
export function isHeldFromStage(cue: Cue, state: DeskState = get(desk)): boolean {
  return cue.reviewPending || state.reviews.some(review => review.status === 'pending' && (review.incomingCueId === cue.id || review.existingCueId === cue.id))
}

const resolutionLabels: Record<MergeAction, string> = {
  identical: '完全相同 · 自动合并',
  'keep-existing': '采用现场原条目',
  'use-incoming': '采用离线版本',
  linked: '保留两版并关联'
}
export function resolutionLabel(action: MergeAction): string { return resolutionLabels[action] }

export function resolveReview(reviewId: string, action: MergeAction, note = '') {
  const state = get(desk)
  const review = state.reviews.find(item => item.id === reviewId)
  if (!review || review.status !== 'pending') return
  const incoming = state.cues.find(item => item.id === review.incomingCueId)
  const existing = state.cues.find(item => item.id === review.existingCueId)
  if (!existing && !incoming) return
  commit(next => {
    const target = next.reviews.find(item => item.id === reviewId)
    if (!target || target.status !== 'pending') return
    const inc = next.cues.find(item => item.id === target.incomingCueId)
    const exc = next.cues.find(item => item.id === target.existingCueId)
    const resolvedAt = Date.now()
    // 其中一版在核对前被删除：保留尚存版本并解除闸门
    if (!inc || !exc) {
      const survivor = inc || exc
      if (survivor) {
        survivor.reviewPending = false
        appendMergeRecord(survivor, {
          at: resolvedAt, action: !inc ? 'keep-existing' : 'use-incoming', otherCueId: (!inc ? target.incomingCueId : target.existingCueId),
          detail: '其中一版在核对前被删除，自动按保留版本处理。'
        })
      }
      target.status = 'resolved'
      target.resolution = !inc ? 'keep-existing' : 'use-incoming'
      target.relationNote = '其中一版在核对前被删除，自动按保留版本处理。'
      target.resolvedAt = resolvedAt
      return
    }
    target.status = 'resolved'
    target.resolution = action
    target.relationNote = note.trim()
    target.resolvedAt = resolvedAt

    if (action === 'use-incoming' && inc && exc) {
      exc.text = inc.text
      exc.tags = detectTerms(inc.text, next.terms)
      appendMergeRecord(exc, {
        at: resolvedAt, action, otherCueId: inc.id,
        detail: `采用离线暂存版本（${formatClock(inc.receivedAt)} 录入），原现场版本已被替换。`
      })
      next.cues = next.cues.filter(item => item.id !== inc.id)
    } else if (action === 'keep-existing' && inc && exc) {
      appendMergeRecord(exc, {
        at: resolvedAt, action, otherCueId: inc.id,
        detail: `内容相近，经同传人员核对采用现场原条目；离线版本（${formatClock(inc.receivedAt)} 录入）未采用。`
      })
      next.cues = next.cues.filter(item => item.id !== inc.id)
    } else if (action === 'linked') {
      const relation = note.trim()
      if (inc) {
        inc.reviewPending = false
        inc.linkedCueId = exc?.id || null
        appendMergeRecord(inc, {
          at: resolvedAt, action, otherCueId: exc?.id || '',
          detail: relation ? `保留两版关联：${relation}` : '与现场版本内容相近，保留两版并建立关联。'
        })
      }
      if (exc) {
        exc.reviewPending = false
        exc.linkedCueId = inc?.id || null
        appendMergeRecord(exc, {
          at: resolvedAt, action, otherCueId: inc?.id || '',
          detail: relation ? `保留两版关联：${relation}` : '与离线暂存版本内容相近，保留两版并建立关联。'
        })
      }
    }
    if (exc) exc.reviewPending = false
  })
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}
function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}
export function setLiveSimulation(enabled: boolean) { commit(state => { state.liveSimulation = enabled }) }
export function setActiveCue(id: string) { commit(state => { state.activeCueId = id }) }
export function moveCue(direction: 1 | -1) {
  const state = get(desk)
  const index = state.cues.findIndex(item => item.id === state.activeCueId)
  const next = state.cues[index + direction]
  if (next) setActiveCue(next.id)
}
export function setFontScale(scale: number) { commit(state => { state.fontScale = Math.min(150, Math.max(85, scale)) }) }

export function ingestCue(text: string, options: { manual?: boolean; speakerId?: string; receivedAt?: number } = {}) {
  const trimmed = text.trim()
  if (!trimmed) return
  commit(state => {
    const existing = state.cues.filter(item => item.text !== trimmed)
    const duplicate = findDuplicate(trimmed, existing)
    const speakerId = options.speakerId || state.sessions.find(item => item.status === 'live')?.speakerId || state.speakers[0]?.id || ''
    const receivedAt = options.receivedAt || Date.now()
    const cue: Cue = {
      id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, speakerId, text: trimmed, receivedAt,
      status: 'pending', manual: Boolean(options.manual), offline: !state.online, reviewPending: false, delaySeconds: Math.max(0, Math.round((Date.now() - receivedAt) / 1000)),
      duplicateOf: duplicate?.id || null, followupText: '', tags: detectTerms(trimmed, state.terms), mergeRecords: [], linkedCueId: null
    }
    state.cues.push(cue); state.activeCueId = cue.id
  })
}
export function updateCue(id: string, patch: Partial<Cue>) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) Object.assign(cue, patch) }) }
export function setCueStatus(id: string, status: CueStatus) {
  commit(state => {
    const cue = state.cues.find(item => item.id === id)
    // 待核对未处理完的内容不能进入现场输出（确认即会进入现场）
    if (cue && status === 'confirmed' && isHeldFromStage(cue, state)) return
    if (cue) cue.status = status
  })
}
export function deleteCue(id: string) {
  commit(state => {
    state.cues = state.cues.filter(item => item.id !== id)
    // 若删除的是待核对条目，解除对方闸门并把核对单标记为已处理，避免卡死
    const linked = state.reviews.filter(review => review.status === 'pending' && (review.incomingCueId === id || review.existingCueId === id))
    linked.forEach(review => {
      review.status = 'resolved'
      review.resolution = review.incomingCueId === id ? 'keep-existing' : 'use-incoming'
      review.relationNote = '其中一版在核对前被删除，按保留版本处理。'
      review.resolvedAt = Date.now()
      const otherId = review.incomingCueId === id ? review.existingCueId : review.incomingCueId
      const other = state.cues.find(item => item.id === otherId)
      if (other) other.reviewPending = false
    })
    state.cues.forEach(cue => { if (cue.linkedCueId === id) cue.linkedCueId = null })
    if (state.activeCueId === id) state.activeCueId = state.cues.at(-1)?.id || ''
  })
}
export function clearDuplicate(id: string) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) cue.duplicateOf = null }) }
export function sendReminder(termId: string, cueId: string) {
  commit(state => {
    const exists = state.reminders.some(item => item.termId === termId && item.cueId === cueId)
    if (exists) return
    state.reminders.unshift({ id: `rem-${Date.now()}`, termId, cueId, target: state.terms.find(item => item.id === termId)?.target || '', createdAt: Date.now(), acknowledged: false })
  })
}
export function acknowledgeReminder(id: string) { commit(state => { const item = state.reminders.find(row => row.id === id); if (item) item.acknowledged = true }) }

export function getDelay(cue: Cue, now = Date.now()): number { return Math.max(cue.delaySeconds, Math.round((now - cue.receivedAt) / 1000)) }
export function speakerName(state: DeskState, id: string): string { return state.speakers.find(item => item.id === id)?.name || '未指定' }
export function termTarget(state: DeskState, id: string): string { return state.terms.find(item => item.id === id)?.target || '' }
function detectTerms(text: string, terms: Term[]): string[] {
  const lower = text.toLowerCase()
  return terms.filter(term => lower.includes(term.source.toLowerCase()) || lower.includes(term.target)).map(term => term.target)
}
function findDuplicate(text: string, cues: Cue[]): Cue | undefined {
  return cues.find(cue => similarity(text, cue.text) >= 0.72)
}
function similarity(a: string, b: string): number {
  const grams = (value: string) => {
    const clean = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    return new Set(Array.from({ length: Math.max(0, clean.length - 1) }, (_, index) => clean.slice(index, index + 2)))
  }
  const left = grams(a), right = grams(b)
  if (!left.size || !right.size) return a.trim() === b.trim() ? 1 : 0
  let intersection = 0
  left.forEach(item => { if (right.has(item)) intersection++ })
  return intersection / (left.size + right.size - intersection)
}
