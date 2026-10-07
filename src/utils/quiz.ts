import type { KanaCharacter, QuizQuestion } from "../types/kana";

const questionCount = 10;
const optionCount = 4;

export function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createQuizQuestions(kanaCharacters: KanaCharacter[]): QuizQuestion[] {
  const selectedCharacters = shuffleItems(kanaCharacters).slice(0, questionCount);

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
