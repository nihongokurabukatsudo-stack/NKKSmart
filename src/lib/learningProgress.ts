export interface LearningProgress {
  learnedCharacters: string[]
  completedLessons: string[]
  xp: number
  quizCount: number
  quizCorrect: number
  quizAnswered: number
  streak: number
  lastStudyDate: string | null
  dailyPracticeDate: string | null
  placementScore: number | null
  mistakes: Record<string, number>
}

const STORAGE_KEY = 'nkk-learning-progress-v1'
const emptyProgress = (): LearningProgress => ({
  learnedCharacters: [], completedLessons: [], xp: 0, quizCount: 0,
  quizCorrect: 0, quizAnswered: 0, streak: 0, lastStudyDate: null, dailyPracticeDate: null, placementScore: null, mistakes: {},
})

export function getLearningProgress(): LearningProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

function markStudyDay(progress: LearningProgress): LearningProgress {
  const today = new Date().toLocaleDateString('en-CA')
  if (progress.lastStudyDate === today) return progress
  const previous = new Date(`${today}T12:00:00`)
  previous.setDate(previous.getDate() - 1)
  const yesterday = previous.toLocaleDateString('en-CA')
  return { ...progress, streak: progress.lastStudyDate === yesterday ? progress.streak + 1 : 1, lastStudyDate: today }
}

export function markCharacterLearned(characterId: string) {
  const progress = getLearningProgress()
  if (progress.learnedCharacters.includes(characterId)) return progress
  const next = markStudyDay({ ...progress, learnedCharacters: [...progress.learnedCharacters, characterId], xp: progress.xp + 1 })
  saveProgress(next)
  return next
}

export function completeLearningLesson(lessonId: string) {
  const progress = getLearningProgress()
  if (progress.completedLessons.includes(lessonId)) return progress
  const next = markStudyDay({ ...progress, completedLessons: [...progress.completedLessons, lessonId], xp: progress.xp + 5 })
  saveProgress(next)
  return next
}

export function recordLearningQuiz(lessonId: string, questions: Array<{ id: string }>, wrongIds: string[], correct: number) {
  const progress = markStudyDay(getLearningProgress())
  const mistakes = { ...progress.mistakes }
  for (const question of questions) {
    if (wrongIds.includes(question.id)) mistakes[`${lessonId}:${question.id}`] = (mistakes[`${lessonId}:${question.id}`] || 0) + 1
    else if (mistakes[`${lessonId}:${question.id}`]) {
      mistakes[`${lessonId}:${question.id}`] -= 1
      if (mistakes[`${lessonId}:${question.id}`] <= 0) delete mistakes[`${lessonId}:${question.id}`]
    }
  }
  const perfect = questions.length > 0 && correct === questions.length
  const next = { ...progress, mistakes, quizCount: progress.quizCount + 1, quizCorrect: progress.quizCorrect + correct, quizAnswered: progress.quizAnswered + questions.length, xp: progress.xp + (perfect ? 30 : 20) }
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

export function completeDailyPractice() {
  const progress = markStudyDay(getLearningProgress())
  const today = new Date().toLocaleDateString('en-CA')
  if (progress.dailyPracticeDate === today) return progress
  const next = { ...progress, dailyPracticeDate: today, xp: progress.xp + 10 }
  saveProgress(next)
  return next
}

export function recordPlacementResult(score: number, total: number) {
  const progress = markStudyDay(getLearningProgress())
  const next = { ...progress, placementScore: total ? Math.round(score * 100 / total) : 0 }
  saveProgress(next)
  return next
}
