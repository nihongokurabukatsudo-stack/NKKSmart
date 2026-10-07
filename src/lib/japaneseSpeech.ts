let japaneseVoices: SpeechSynthesisVoice[] = []

function loadVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    japaneseVoices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('ja'))
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
}

export function speakJapanese(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.85
  const voice = japaneseVoices.find((candidate) => candidate.lang.toLowerCase() === 'ja-jp') || japaneseVoices[0]
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}
