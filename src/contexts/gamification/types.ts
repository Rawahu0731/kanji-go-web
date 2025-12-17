// Badge型は必要に応じて個別にインポート
import type { KanjiCard } from '../../data/cardCollection';
import type { OwnedCharacter } from '../../data/characters';
import type { SkillLevel } from '../../data/skillTree';
import type { BigNumber } from '../../utils/bigNumber';

export interface GamificationState {
  version?: number; // データバージョン
  xp: number | BigNumber; // 現在のXP（BigNumberで大きい値も扱える）
  level: number;
  coins: number;
  medals: number; // 新通貨メダル
  totalXp: number | BigNumber; // 累計XP（ストーリー解放などの判定に使用、BigNumberで大きい値も扱える）
  unlockedBadges: string[];
  purchasedItems: string[];
  cardCollection: KanjiCard[]; // カードコレクション
  deck?: KanjiCard[]; // デッキ（試験的機能）
  characters: OwnedCharacter[]; // 所持キャラクター
  equippedCharacter: OwnedCharacter | null; // 装備中のキャラクター
  skillLevels: SkillLevel[]; // スキルツリーのレベル情報
  streakProtectionCount: number; // ストリーク保護の残り使用回数
  stats: {
    totalQuizzes: number;
    correctAnswers: number;
    incorrectAnswers: number;
    currentStreak: number;
    bestStreak: number;
  };
  activeTheme: string;
  activeIcon: string;
  customIconUrl: string; // カスタムアイコンのURL
  username: string; // ユーザーネーム
  lastInterestTime?: number; // 最後に利子を計算した時刻（ミリ秒）
  // デバッグ: 最後に計算した報酬や倍率などの情報（UIで確認するため）
  debugLastReward?: Record<string, any>;
  // (Challenge 機能削除)
  // 最後にスキルを購入(アップグレード)した時刻（ミリ秒）
  lastSkillPurchaseTime?: number;
  // コレクション（漢字ごとの + 値。最大30でカンスト）
  collectionPlus?: { kanji: string; plus: number; obtainedAt?: number }[];
  // コレクション++（漢字ごとの + 値。最大100でカンスト）
  collectionPlusPlus?: { kanji: string; plus: number; obtainedAt?: number }[];
  // チケット（キー: ticketId, 値: 所持数）
  tickets?: Record<string, number>;
  // マイグレーションで使用: 更新配信後の「お詫びアイテム」配布フラグ
  apologyCompensationAvailable?: boolean;
  // 配布済みバージョン（重複配布防止のために記録）
  apologyCompensationClaimedVersion?: number;
}

export type GamificationContextType = {
  initializing: boolean;
  state: GamificationState;
  isMedalSystemEnabled: boolean;
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  addMedals: (amount: number) => void;
  setXp: (amount: number) => void;
  setCoins: (amount: number) => void;
  setMedals: (amount: number) => void;
  unlockBadge: (badgeId: string) => void;
  purchaseItem: (itemId: string, price: number, addToPurchased?: boolean) => boolean;
  purchaseWithMedals: (itemId: string, price: number, addToPurchased?: boolean) => boolean;
  updateStats: (updates: Partial<GamificationState['stats']>) => void;
  addQuizRewards: (xp: number, coins: number, medals: number, characterXp: number, statsUpdate: Partial<GamificationState['stats']>) => { actualXp: number; actualCoins: number; actualMedals: number };
  addTickets: (ticketId: string, count?: number) => void;
  useTicket: (ticketId: string, count?: number) => KanjiCard[] | null;
  grantMaintenanceCompensation: () => void;
  setTheme: (themeId: string) => void;
  setIcon: (iconId: string) => void;
  setCustomIconUrl: (url: string) => void;
  setUsername: (username: string) => void;
  getXpForNextLevel: () => number;
  getTotalXpForCurrentLevel: () => number;
  getTotalXpForNextLevel: () => number;
  getLevelProgress: () => number;
  addCardToCollection: (card: KanjiCard) => void;
  openCardPack: (packType: string) => KanjiCard[];
  // メダルで引くコレクション+ガチャ（返り値は表示用のカードオブジェクト）
  pullCollectionPlusGacha: (count: number) => KanjiCard[];
  // コレクション++用のガチャ
  pullCollectionPlusPlusGacha: (count: number) => KanjiCard[];
  // コレクション+ に+値を追加（内部でカンスト処理）
  addToCollectionPlus: (kanji: string, amount?: number) => void;
  // コレクション++ に+値を追加（内部でカンスト処理、最大+100）
  addToCollectionPlusPlus: (kanji: string, amount?: number) => void;
  pullCharacterGacha: (count: number, guaranteedRarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic') => Character[];
  equipCharacter: (character: OwnedCharacter | null) => void;
  getCharacterBoost: (type: 'xp' | 'coin') => number;
  addCharacterXp: (amount: number) => void;
  getCollectionBoost: () => number;
  getCollectionPlusEffect: () => { totalPlus: number; xpCoinBonusFraction: number; medalBoost: number };
  getCollectionPlusPlusEffect: () => { totalPlus: number; xpCoinBonusFraction: number; medalBoost: number };
  addCardsToDeck: (cards: KanjiCard[]) => void;
  removeCardFromDeck: (kanji: string) => void;
  upgradeCardInDeck: (kanji: string, cost: number) => void;
  getDeckBoost: () => { xp: number; coin: number };
  upgradeSkill: (skillId: string) => boolean;
  getSkillLevel: (skillId: string) => number;
  getSkillBoost: (type: 'xp_boost' | 'coin_boost' | 'medal_boost' | 'streak_amp' | 'double_reward' | 'critical_hit' | 'lucky_coin' | 'xp_multiplier' | 'time_bonus') => number;
  useStreakProtection: () => boolean;
  // (Challenge 機能削除)
  // デバッグ情報をセット/クリアする
  setDebugInfo: (info: Record<string, any> | null) => void;
  syncWithFirebase: (userId: string) => Promise<void>;
  loadFromFirebase: (userId: string, preferRemote?: boolean) => Promise<void>;

  // コレクション（漢字ごとの値。最大30でカンスト）
  collectionPlus?: { kanji: string; plus: number; obtainedAt?: number }[];
  collectionPlusPlus?: { kanji: string; plus: number; obtainedAt?: number }[];
};

export type Character = any; // 必要に応じて正確な型を定義
