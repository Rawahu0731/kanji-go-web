import type { GamificationState } from './types';
import type { KanjiCard, CardRarity } from '../../data/cardCollection';
import type { OwnedCharacter } from '../../data/characters';

export const STORAGE_KEY = 'kanji_gamification';
export const CURRENT_VERSION = 8; // データバージョン（バージョン8：カードcountリセット）

// メダルシステムの有効化日（2025年11月26日 00:00:00 JST）
const MEDAL_SYSTEM_START_DATE = new Date('2025-11-26T00:00:00+09:00').getTime();

// デバッグ用の日付をURLパラメータから取得
export const getDebugDate = (): number | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const debugDate = params.get('debugDate');
  if (debugDate) {
    const parsed = new Date(debugDate).getTime();
    if (!isNaN(parsed)) {
      console.log(`🐛 デバッグモード: 日付を ${debugDate} に設定`);
      return parsed;
    }
  }
  return null;
};

// メダルシステムが有効かどうかを判定
export const isMedalSystemEnabled = (): boolean => {
  const debugDate = getDebugDate();
  const currentTime = debugDate !== null ? debugDate : Date.now();
  return currentTime >= MEDAL_SYSTEM_START_DATE;
};

export const INITIAL_STATE: GamificationState = {
  version: CURRENT_VERSION,
  xp: 0,
  level: 1,
  coins: 0,
  medals: 0,
  totalXp: 0,
  unlockedBadges: [],
  purchasedItems: [],
  cardCollection: [],
  deck: [],
  characters: [],
  equippedCharacter: null,
  skillLevels: [],
  streakProtectionCount: 0,
  stats: {
    totalQuizzes: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    currentStreak: 0,
    bestStreak: 0
  },
  activeTheme: 'default',
  activeIcon: 'default',
  customIconUrl: '',
  username: 'プレイヤー',
  lastInterestTime: Date.now(),
  lastSkillPurchaseTime: undefined,
  collectionPlus: [],
  collectionPlusPlus: [],
  tickets: {}
};

// レベルアップに必要なXPを計算(2次関数的に増加: level^2)
export function getXpForLevel(level: number): number {
  // 序盤(レベル10まで)は2次関数、それ以降は緩やかに
  if (level <= 10) {
    return Math.floor(100 * level * level);
  } else {
    // レベル10以降は1.6次関数で緩やかに
    const base = 100 * 10 * 10; // レベル10までの基準値
    const additional = Math.floor(120 * Math.pow(level - 10, 1.6));
    return base + additional;
  }
}

// カードのレアリティランク
export function rarityRank(r: CardRarity) {
  const ranks: Record<CardRarity, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4
  };
  return ranks[r] || 0;
}

// カードコレクションをマージ
export function mergeCardCollections(a: KanjiCard[], b: KanjiCard[]): KanjiCard[] {
  const map = new Map<string, KanjiCard>();
  for (const card of a) {
    map.set(card.kanji, card);
  }
  for (const card of b) {
    const existing = map.get(card.kanji);
    if (!existing) {
      map.set(card.kanji, card);
    } else {
      // 既に存在する場合、レアリティが高い方を採用
      if (rarityRank(card.rarity) > rarityRank(existing.rarity)) {
        map.set(card.kanji, card);
      }
    }
  }
  return Array.from(map.values());
}

// キャラクターをマージ
export function mergeCharacters(a: OwnedCharacter[], b: OwnedCharacter[]): OwnedCharacter[] {
  const map = new Map<string, OwnedCharacter>();
  for (const c of a) {
    try {
      const key = (c as any).id || JSON.stringify(c);
      map.set(key, c);
    } catch (e) {
      // ignore
    }
  }
  for (const c of b) {
    try {
      const key = (c as any).id || JSON.stringify(c);
      map.set(key, c);
    } catch (e) {
      // ignore
    }
  }
  return Array.from(map.values());
}
