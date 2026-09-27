import { writable, get } from 'svelte/store'
import type { Announcement, Cue, CueStatus, DeskState, Reminder, ReviewItem, Session, Speaker, Term } from './types'

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
    { id: 'cue-101', speakerId: 'sp-1', text: 'The urban heat island effect is not evenly distributed across a city.', receivedAt: now - 36000, status: 'confirmed', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['城市热岛'], relatedTo: null },
    { id: 'cue-102', speakerId: 'sp-1', text: 'Neighborhoods with less tree canopy can be several degrees warmer at night.', receivedAt: now - 19000, status: 'confirmed', manual: false, offline: false, delaySeconds: 6, duplicateOf: null, followupText: '补译：“夜间温差可达数摄氏度。”', tags: ['树冠覆盖率'], relatedTo: null },
    { id: 'cue-103', speakerId: 'sp-1', text: 'Our resilience strategy links cooling corridors with public health investments.', receivedAt: now - 9000, status: 'pending', manual: false, offline: false, delaySeconds: 11, duplicateOf: null, followupText: '', tags: ['韧性', '协同效益'], relatedTo: null },
    { id: 'cue-104', speakerId: 'sp-1', text: 'That data also reveals health equity gaps between districts.', receivedAt: now - 2500, status: 'pending', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['健康公平'], relatedTo: null }
  ]
}
function demoState(): DeskState {
  return {
    speakers, sessions, terms, cues: initialCues(), reminders: [], reviewQueue: [], activeCueId: 'cue-103', fontScale: 100,
    announcements: [
      { id: 'ann-1', level: 'info', text: '十点整有消防联动测试，请提醒会场人员保持镇定。', visibleOnStage: false, createdAt: new Date().toISOString() },
      { id: 'ann-2', level: 'urgent', text: '请下一位发言人提前到侧台候场。', visibleOnStage: false, createdAt: new Date().toISOString() }
    ],
    online: true, liveSimulation: true, updatedAt: new Date().toISOString()
  }
}
function clone<T>(value: T): T { return structuredClone(value) }
function loadState(): DeskState {
  if (typeof localStorage === 'undefined') return demoState()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return demoState()
    const parsed = JSON.parse(saved) as Partial<DeskState>
    const base: DeskState = { ...demoState(), ...parsed, online: navigator.onLine }
    base.cues = base.cues.map(cue => ({ ...cue, relatedTo: cue.relatedTo ?? null }))
    base.reviewQueue = base.reviewQueue ?? []
    return base
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

export function setOnline(online: boolean) {
  const current = get(desk)
  if (current.online === online && !current.cues.some(cue => cue.offline)) return
  commit(state => {
    state.online = online
    if (online) recoverStagedCues(state)
  })
}
function recoverStagedCues(state: DeskState) {
  const staged = state.cues.filter(cue => cue.offline)
  if (!staged.length) return
  state.cues = state.cues.filter(cue => !cue.offline)
  for (const cue of staged) {
    const base = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stagedText: cue.text, speakerId: cue.speakerId, receivedAt: cue.receivedAt, manual: cue.manual
    }
    const exact = state.cues.find(item => normalizeText(item.text) === normalizeText(cue.text))
    if (exact) {
      state.reviewQueue.unshift({ ...base, matchKind: 'exact', matchCueId: exact.id, similarity: 1, status: 'resolved', resolution: 'merged', resultCueId: exact.id, resolvedAt: Date.now() })
      continue
    }
    const match = bestMatch(cue.text, state.cues)
    if (match && match.score >= SIMILAR_THRESHOLD) {
      state.reviewQueue.unshift({ ...base, matchKind: 'similar', matchCueId: match.cue.id, similarity: match.score, status: 'pending', resolution: null, resultCueId: null, resolvedAt: null })
      continue
    }
    cue.offline = false
    cue.duplicateOf = null
    state.cues.push(cue)
    state.reviewQueue.unshift({ ...base, matchKind: 'none', matchCueId: null, similarity: match?.score ?? 0, status: 'resolved', resolution: 'admitted', resultCueId: cue.id, resolvedAt: Date.now() })
  }
  if (!state.cues.some(cue => cue.id === state.activeCueId && !cue.offline)) state.activeCueId = state.cues.filter(cue => !cue.offline).at(-1)?.id || ''
}
export function resolveReview(id: string, action: 'use-staged' | 'keep-live' | 'linked') {
  commit(state => {
    const item = state.reviewQueue.find(row => row.id === id)
    if (!item || item.status !== 'pending') return
    const target = state.cues.find(cue => cue.id === item.matchCueId)
    if (!target) {
      admitStaged(state, item)
    } else if (action === 'use-staged') {
      target.text = item.stagedText
      target.tags = detectTerms(item.stagedText, state.terms)
      target.duplicateOf = null
      item.resultCueId = target.id
      item.resolution = 'use-staged'
    } else if (action === 'linked') {
      const cue = stagedAsCue(state, item, item.matchCueId)
      state.cues.push(cue)
      item.resultCueId = cue.id
      item.resolution = 'linked'
    } else {
      item.resultCueId = target.id
      item.resolution = 'keep-live'
    }
    item.status = 'resolved'
    item.resolvedAt = Date.now()
  })
}
function admitStaged(state: DeskState, item: ReviewItem) {
  const cue = stagedAsCue(state, item, null)
  state.cues.push(cue)
  item.resultCueId = cue.id
  item.resolution = 'admitted'
}
function stagedAsCue(state: DeskState, item: ReviewItem, relatedTo: string | null): Cue {
  return {
    id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    speakerId: item.speakerId, text: item.stagedText, receivedAt: item.receivedAt,
    status: 'pending', manual: item.manual, offline: false,
    delaySeconds: Math.max(0, Math.round((Date.now() - item.receivedAt) / 1000)),
    duplicateOf: null, followupText: '', tags: detectTerms(item.stagedText, state.terms), relatedTo
  }
}
export function clearResolvedReviews() { commit(state => { state.reviewQueue = state.reviewQueue.filter(item => item.status === 'pending') }) }
export function setLiveSimulation(enabled: boolean) { commit(state => { state.liveSimulation = enabled }) }
export function setActiveCue(id: string) { commit(state => { state.activeCueId = id }) }
export function moveCue(direction: 1 | -1) {
  const state = get(desk)
  const live = state.cues.filter(item => !item.offline)
  const index = live.findIndex(item => item.id === state.activeCueId)
  const next = live[index + direction]
  if (next) setActiveCue(next.id)
}
export function setFontScale(scale: number) { commit(state => { state.fontScale = Math.min(150, Math.max(85, scale)) }) }

export function ingestCue(text: string, options: { manual?: boolean; speakerId?: string; receivedAt?: number } = {}) {
  const trimmed = text.trim()
  if (!trimmed) return
  commit(state => {
    const existing = state.cues.filter(item => item.text !== trimmed)
    const duplicate = state.online ? findDuplicate(trimmed, existing) : undefined
    const speakerId = options.speakerId || state.sessions.find(item => item.status === 'live')?.speakerId || state.speakers[0]?.id || ''
    const receivedAt = options.receivedAt || Date.now()
    const cue: Cue = {
      id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, speakerId, text: trimmed, receivedAt,
      status: 'pending', manual: Boolean(options.manual), offline: !state.online, delaySeconds: Math.max(0, Math.round((Date.now() - receivedAt) / 1000)),
      duplicateOf: duplicate?.id || null, followupText: '', tags: detectTerms(trimmed, state.terms), relatedTo: null
    }
    state.cues.push(cue); state.activeCueId = cue.id
  })
}
export function updateCue(id: string, patch: Partial<Cue>) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) Object.assign(cue, patch) }) }
export function setCueStatus(id: string, status: CueStatus) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) cue.status = status }) }
export function deleteCue(id: string) {
  commit(state => {
    state.cues = state.cues.filter(item => item.id !== id)
    if (state.activeCueId === id) state.activeCueId = state.cues.filter(item => !item.offline).at(-1)?.id || ''
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
  return cues.find(cue => similarity(text, cue.text) >= SIMILAR_THRESHOLD)
}
const SIMILAR_THRESHOLD = 0.72
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}
function bestMatch(text: string, cues: Cue[]): { cue: Cue; score: number } | null {
  let best: Cue | null = null
  let score = 0
  for (const cue of cues) {
    const value = similarity(text, cue.text)
    if (value > score) { score = value; best = cue }
  }
  return best ? { cue: best, score } : null
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
