export interface KanaCharacter {
  id: string;
  character: string;
  romaji: string;
}

export interface QuizQuestion {
  id: string;
  character: string;
  correctAnswer: string;
  answerOptions: string[];
}
