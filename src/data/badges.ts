// バッジ定義
export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'story' | 'achievement' | 'milestone';
};

export const BADGES: Record<string, Badge> = {
  harmony_master: {
    id: 'harmony_master',
    name: '調和の達人',
    description: '送り仮名の調和を理解した証',
    icon: '🎭',
    category: 'story'
  },
  kanji_master: {
    id: 'kanji_master',
    name: '漢字マスター',
    description: 'すべての試練を乗り越えた証',
    icon: '👑',
    category: 'story'
  },
  first_quiz: {
    id: 'first_quiz',
    name: '初めの一歩',
    description: '初めてクイズに挑戦した',
    icon: '🌟',
    category: 'achievement'
  },
  quiz_master_10: {
    id: 'quiz_master_10',
    name: 'クイズ挑戦者',
    description: 'クイズを10問正解した',
    icon: '📝',
    category: 'achievement'
  },
  quiz_master_50: {
    id: 'quiz_master_50',
    name: 'クイズ達人',
    description: 'クイズを50問正解した',
    icon: '📚',
    category: 'achievement'
  },
  quiz_master_100: {
    id: 'quiz_master_100',
    name: 'クイズ博士',
    description: 'クイズを100問正解した',
    icon: '🎓',
    category: 'achievement'
  },
  perfect_streak_5: {
    id: 'perfect_streak_5',
    name: '連勝の始まり',
    description: '5問連続正解した',
    icon: '🔥',
    category: 'achievement'
  },
  perfect_streak_10: {
    id: 'perfect_streak_10',
    name: '完璧な連勝',
    description: '10問連続正解した',
    icon: '⚡',
    category: 'achievement'
  },
  level_5: {
    id: 'level_5',
    name: '成長の証',
    description: 'レベル5に到達した',
    icon: '⭐',
    category: 'milestone'
  },
  level_10: {
    id: 'level_10',
    name: '熟練者',
    description: 'レベル10に到達した',
    icon: '🌟',
    category: 'milestone'
  },
  level_20: {
    id: 'level_20',
    name: '達人の領域',
    description: 'レベル20に到達した',
    icon: '💫',
    category: 'milestone'
  },
  collector: {
    id: 'collector',
    name: 'コレクター',
    description: '10個のバッジを集めた',
    icon: '🏆',
    category: 'milestone'
  }
};
