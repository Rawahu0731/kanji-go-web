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
  // 高閾値の連勝バッジ
  perfect_streak_50: {
    id: 'perfect_streak_50',
    name: '連勝の覇者',
    description: '50問連続正解した',
    icon: '🔥',
    category: 'achievement'
  },
  perfect_streak_100: {
    id: 'perfect_streak_100',
    name: '不屈の連勝',
    description: '100問連続正解した',
    icon: '💥',
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
  // 高閾値のレベルバッジ
  level_50: {
    id: 'level_50',
    name: '上級者',
    description: 'レベル50に到達した',
    icon: '🚀',
    category: 'milestone'
  },
  level_100: {
    id: 'level_100',
    name: '伝説の旅人',
    description: 'レベル100に到達した',
    icon: '🏅',
    category: 'milestone'
  },
  level_500: {
    id: 'level_500',
    name: '神速の学者',
    description: 'レベル500に到達した',
    icon: '🌠',
    category: 'milestone'
  },
  level_1000: {
    id: 'level_1000',
    name: '永遠の探求者',
    description: 'レベル1000に到達した',
    icon: '🛡️',
    category: 'milestone'
  },
  level_10000: {
    id: 'level_10000',
    name: '時空を超えし者',
    description: 'レベル10000に到達した',
    icon: '🌌',
    category: 'milestone'
  },
  quiz_master_500: {
    id: 'quiz_master_500',
    name: '熟達の学者',
    description: 'クイズを500問正解した',
    icon: '📘',
    category: 'achievement'
  },
  quiz_master_1000: {
    id: 'quiz_master_1000',
    name: '知の巨匠',
    description: 'クイズを1000問正解した',
    icon: '📜',
    category: 'achievement'
  },
  collector: {
    id: 'collector',
    name: 'コレクター',
    description: '10個のバッジを集めた',
    icon: '🏆',
    category: 'milestone'
  },
  super_collector: {
    id: 'super_collector',
    name: 'スーパーコレクター',
    description: '20個のバッジを集めた',
    icon: '🏅',
    category: 'milestone'
  },
  // コインマイルストーン（大きな数に対応）
  coin_million: {
    id: 'coin_million',
    name: '百万長者',
    description: '所持コインが1,000,000に到達した',
    icon: '💰',
    category: 'milestone'
  },
  coin_100m: {
    id: 'coin_100m',
    name: '億の支配者',
    description: '所持コインが100,000,000に到達した',
    icon: '💎',
    category: 'milestone'
  },
  coin_10b: {
    id: 'coin_10b',
    name: '十億の富豪',
    description: '所持コインが10,000,000,000に到達した',
    icon: '🏦',
    category: 'milestone'
  },
  coin_trillion: {
    id: 'coin_trillion',
    name: '桁外れの財',
    description: '所持コインが1,000,000,000,000に到達した',
    icon: '🪙',
    category: 'milestone'
  }
};

// メンテナンスのお詫び用バッジ
BADGES['apology_maintenance'] = {
  id: 'apology_maintenance',
  name: 'ごめんなさい',
  description: 'メンテナンスのお詫びとして付与された限定バッジ',
  icon: '🫶',
  category: 'achievement'
};
