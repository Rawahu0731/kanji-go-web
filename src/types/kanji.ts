export type Item = {
  filename: string;
  reading: string;
  meaning?: string;
  imageUrl: string;
  additionalInfo?: string;
  components?: string;
  kanji?: string;
  sentence?: string;
  katakana?: string;
  answer?: string;
};

export type Level = 4 | 5 | 6 | 7 | 8 | 'extra';
export type Mode = 'list' | 'quiz';
export type QuizFormat = 'input' | 'choice';
