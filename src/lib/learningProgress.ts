export interface LearningProgress {
  learnedCharacters: string[]
  completedLessons: string[]
  mistakes: Record<string, number>
}

const STORAGE_KEY = 'nkk-learning-progress-v2'
const emptyProgress = (): LearningProgress => ({ learnedCharacters: [], completedLessons: [], mistakes: {} })

export function getLearningProgress(): LearningProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nkk-learning-progress-v1')
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<LearningProgress>
    return { ...emptyProgress(), ...parsed, mistakes: parsed.mistakes || {} }
  } catch {
    return emptyProgress()
  }
}

function saveProgress(progress: LearningProgress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) } catch { /* Storage may be disabled or full. */ }
}

export function markCharacterLearned(characterId: string) {
  const progress = getLearningProgress()
  if (progress.learnedCharacters.includes(characterId)) return progress
  const next = { ...progress, learnedCharacters: [...progress.learnedCharacters, characterId] }
  saveProgress(next)
  return next
}

export function completeLearningLesson(lessonId: string) {
  const progress = getLearningProgress()
  if (progress.completedLessons.includes(lessonId)) return progress
  const next = { ...progress, completedLessons: [...progress.completedLessons, lessonId] }
  saveProgress(next)
  return next
}

export function recordLearningQuiz(lessonId: string, questions: Array<{ id: string }>, wrongIds: string[]) {
  const progress = getLearningProgress()
  const mistakes = { ...progress.mistakes }
  for (const question of questions) {
    const key = `${lessonId}:${question.id}`
    if (wrongIds.includes(question.id)) mistakes[key] = (mistakes[key] || 0) + 1
    else if (mistakes[key]) {
      mistakes[key] -= 1
      if (mistakes[key] <= 0) delete mistakes[key]
    }
  }
  const next = { ...progress, mistakes }
  saveProgress(next)
  return next
}

export function getMistakeIds(lessonId: string) {
  const prefix = `${lessonId}:`
  return Object.entries(getLearningProgress().mistakes)
    .filter(([key, count]) => key.startsWith(prefix) && count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.slice(prefix.length))
}
