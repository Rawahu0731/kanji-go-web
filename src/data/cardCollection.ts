// カードのレアリティ定義
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

// カードデータ型
export type KanjiCard = {
  id: string;
  kanji: string;
  reading: string;
  meaning: string;
  level: number;
  imageUrl: string;
  rarity: CardRarity;
  obtainedAt?: number; // タイムスタンプ
  count?: number; // 所持枚数（被り回数を記録）
  deckLevel?: number; // デッキでの強化レベル（試験的機能）
};

// カードパック設定型
export type CardPackConfig = {
  cardCount: number;
  levelRange: [number, number];
  rarityWeights: Record<CardRarity, number>;
  guaranteed?: Partial<Record<CardRarity, number>>;
};

// カードパックから出るカードの枚数と確率
export const CARD_PACK_CONFIG: Record<string, CardPackConfig> = {
  card_pack_basic: {
    cardCount: 3,
    levelRange: [4, 5],
    rarityWeights: { common: 85, rare: 15, epic: 0, legendary: 0 }
  },
  card_pack_bronze: {
    cardCount: 5,
    levelRange: [4, 6],
    rarityWeights: { common: 70, rare: 25, epic: 5, legendary: 0 }
  },
  card_pack_silver: {
    cardCount: 5,
    levelRange: [5, 7],
    rarityWeights: { common: 50, rare: 35, epic: 14, legendary: 1 },
    guaranteed: { rare: 1 }
  },
  card_pack_gold: {
    cardCount: 7,
    levelRange: [6, 8],
    rarityWeights: { common: 30, rare: 40, epic: 25, legendary: 5 },
    guaranteed: { rare: 1 }
  },
  card_pack_platinum: {
    cardCount: 10,
    levelRange: [6, 8],
    rarityWeights: { common: 20, rare: 35, epic: 35, legendary: 10 },
    guaranteed: { epic: 1 }
  }
};

// レアリティに応じた重複確率（レアなカードほど重複しにくい）
export const DUPLICATE_PROBABILITY = {
  common: 0.3,    // 30%で重複
  rare: 0.15,     // 15%で重複
  epic: 0.05,     // 5%で重複
  legendary: 0.01 // 1%で重複
};

// レベルに応じたレアリティの基本確率調整
export const LEVEL_RARITY_MODIFIER = {
  4: { common: 1.5, rare: 0.8, epic: 0.5, legendary: 0.3 },
  5: { common: 1.2, rare: 1.0, epic: 0.7, legendary: 0.5 },
  6: { common: 1.0, rare: 1.0, epic: 1.0, legendary: 0.8 },
  7: { common: 0.7, rare: 1.0, epic: 1.2, legendary: 1.0 },
  8: { common: 0.5, rare: 0.8, epic: 1.5, legendary: 1.5 }
};
