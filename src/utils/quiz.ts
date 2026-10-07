import type { KanaCharacter, QuizQuestion } from "../types/kana";

const questionCount = 10;
const optionCount = 4;

export function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createQuizQuestions(kanaCharacters: KanaCharacter[], preferredIds: string[] = [], count = questionCount): QuizQuestion[] {
  const preferred = preferredIds.map((id) => kanaCharacters.find((item) => item.id === id)).filter((item): item is KanaCharacter => Boolean(item));
  const remaining = shuffleItems(kanaCharacters.filter((item) => !preferredIds.includes(item.id)));
  const selectedCharacters = shuffleItems([...preferred, ...remaining].slice(0, count));

  return selectedCharacters.map((kanaCharacter) => {
    const wrongAnswers = shuffleItems(
      kanaCharacters
        .filter((item) => item.id !== kanaCharacter.id)
        .map((item) => item.romaji),
    ).slice(0, optionCount - 1);

    return {
      id: kanaCharacter.id,
      character: kanaCharacter.character,
      correctAnswer: kanaCharacter.romaji,
      answerOptions: shuffleItems([kanaCharacter.romaji, ...wrongAnswers]),
    };
  });
}
