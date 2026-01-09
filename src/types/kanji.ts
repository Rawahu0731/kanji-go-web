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
  // extra 用の追加フィールド
  answer2?: string; // CSV の 3 列目（誤字訂正での正しい文字など）
  questionType?: 'correction' | 'reading';
};

export type Level = 4 | 5 | 6 | 7 | 8 | 'extra';
export type Mode = 'list' | 'quiz' | 'endless';
export type QuizFormat = 'input' | 'choice';
