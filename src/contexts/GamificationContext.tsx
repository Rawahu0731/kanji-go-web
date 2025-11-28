import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BADGES } from '../data/badges';
import type { Badge } from '../data/badges';
import type { KanjiCard, CardRarity } from '../data/cardCollection';
import { CARD_PACK_CONFIG } from '../data/cardCollection';
import { getRandomKanji } from '../data/allKanji';
import type { Character, OwnedCharacter } from '../data/characters';
import { CHARACTERS, pullGacha, getCharacterEffectValue, getXpForCharacterLevel, MAX_CHARACTER_LEVEL, MAX_CHARACTER_COUNT } from '../data/characters';
import { getKanjiAttributes } from '../data/kanjiAttributes';
import { SKILLS, type SkillLevel } from '../data/skillTree';
import { saveUserData, loadUserData, isFirebaseEnabled, getStorageDownloadUrl } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { computeNewBadges } from '../utils/badgeUtils';

const STORAGE_KEY = 'kanji_gamification';

// メダルシステムの有効化日（2025年11月26日 00:00:00 JST）
const MEDAL_SYSTEM_START_DATE = new Date('2025-11-26T00:00:00+09:00').getTime();

// デバッグ用の日付をURLパラメータから取得
const getDebugDate = (): number | null => {
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

export interface GamificationState {
  version?: number; // データバージョン
  xp: number;
  level: number;
  coins: number;
  medals: number; // 新通貨メダル
  totalXp: number; // 累計XP（ストーリー解放などの判定に使用）
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
  // チャレンジ関連: 永続的に付与されるボーナス (例: { "no_skill_purchase_10min": { xp: 0.05 } })
  challengeBonuses?: Record<string, { xp?: number; coin?: number }>;
  // 最後にスキルを購入(アップグレード)した時刻（ミリ秒）
  lastSkillPurchaseTime?: number;
}


type GamificationContextType = {
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
  updateStats: (updates: Partial<GamificationState['stats']>) => void;
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
  pullCharacterGacha: (count: number, guaranteedRarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic') => Character[];
  equipCharacter: (character: OwnedCharacter | null) => void;
  getCharacterBoost: (type: 'xp' | 'coin') => number;
  addCharacterXp: (amount: number) => void;
  getCollectionBoost: () => number;
  addCardsToDeck: (cards: KanjiCard[]) => void;
  removeCardFromDeck: (kanji: string) => void;
  upgradeCardInDeck: (kanji: string, cost: number) => void;
  getDeckBoost: () => { xp: number; coin: number };
  upgradeSkill: (skillId: string) => boolean;
  getSkillLevel: (skillId: string) => number;
  getSkillBoost: (type: 'xp_boost' | 'coin_boost' | 'medal_boost' | 'double_reward' | 'critical_hit' | 'lucky_coin' | 'xp_multiplier' | 'time_bonus') => number;
  useStreakProtection: () => boolean;
  // チャレンジを完了扱いにして恒久ボーナスを付与する
  completeChallenge: (challengeId: string, bonus: { xp?: number; coin?: number }) => void;
  // チャレンジ由来の現在のブーストを取得（合計）
  getChallengeBoost: (type: 'xp' | 'coin') => number;
  syncWithFirebase: (userId: string) => Promise<void>;
  loadFromFirebase: (userId: string) => Promise<void>;

};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const CURRENT_VERSION = 8; // データバージョン（バージョン8：カードcountリセット）

const INITIAL_STATE: GamificationState = {
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
  lastInterestTime: Date.now()
  ,
  challengeBonuses: {},
  lastSkillPurchaseTime: undefined
};

// データマイグレーション関数
function migrateData(data: any): GamificationState {
  const version = data.version || 0;
  
  // バージョン0から1へのマイグレーション
  if (version < 1) {
    // コイン数が異常に多い場合（99999999など）は0にリセット
    if (data.coins && data.coins > 10000) {
      console.log('異常なコイン数を検出しました。リセットします:', data.coins);
      data.coins = 0;
    }
    data.version = 1;
  }
  
  // バージョン1から2へのマイグレーション
  if (version < 2) {
    // アップデート記念：10500コイン配布
    console.log('アップデート記念コインを配布します！');
    data.coins = (data.coins || 0) + 10500;
    data.version = 2;
  }
  
  // バージョン2から3へのマイグレーション
  if (version < 3) {
    // 統計データの異常値をリセット
    console.log('統計データをリセットします');
    data.stats = {
      totalQuizzes: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      currentStreak: 0,
      bestStreak: 0
    };
    data.version = 3;
  }
  
  // バージョン3から4へのマイグレーション
  if (version < 4) {
    // XP計算式変更記念：10500コイン配布
    console.log('アップデート記念で10500コインを配布します！');
    data.coins = (data.coins || 0) + 10500;
    data.version = 4;
  }
  
  // バージョン4から5へのマイグレーション
  if (version < 5) {
    // XP計算式変更のための準備（バージョン5では何もしない）
    data.version = 5;
  }
  
  // バージョン5から6へのマイグレーション
  if (version < 6) {
    // レベルアップ必要XP増加に伴うレベル調整
    console.log('レベルアップ必要XPが増加しました。レベルを調整します。');
    const totalXp = data.totalXp || 0;
    let newLevel = 1;
    let accumulatedXp = 0;
    
    // 新しい計算式で適正レベルを計算
    while (true) {
      const nextLevelXp = Math.floor(100 * (newLevel + 1) * (newLevel + 1));
      if (accumulatedXp + nextLevelXp > totalXp) {
        break;
      }
      accumulatedXp += nextLevelXp;
      newLevel++;
    }
    
    // レベルとXPを調整
    console.log(`レベルを ${data.level} から ${newLevel} に調整しました`);
    data.level = newLevel;
    data.xp = Math.max(0, totalXp - accumulatedXp);
    
    data.version = 6;
  }
  
  // バージョン6から7へのマイグレーション
  if (version < 7) {
    // レベル計算ロジックの完全修正 - xpとtotalXpを常に一致させる
    console.log('レベル計算を修正します（xp = totalXp）。');
    const totalXp = data.totalXp || 0;
    let newLevel = 1;
    let accumulatedXp = 0;
    
    // totalXpから正しいレベルを再計算
    while (true) {
      const nextLevelXp = Math.floor(100 * (newLevel + 1) * (newLevel + 1));
      if (accumulatedXp + nextLevelXp > totalXp) {
        break;
      }
      accumulatedXp += nextLevelXp;
      newLevel++;
    }
    
    // レベルとXPを正しく設定（xpとtotalXpは常に一致）
    console.log(`レベルを ${data.level} から ${newLevel} に修正しました (累積XP: ${totalXp})`);
    data.level = newLevel;
    data.xp = totalXp;
    data.totalXp = totalXp;
    
    data.version = 7;
  }
  
  // バージョン7から8へのマイグレーション
  if (version < 8) {
    // カードのcountをリセット（異常値を修正）
    console.log('カードコレクションのcount値をリセットします');
    if (data.cardCollection && Array.isArray(data.cardCollection)) {
      data.cardCollection = data.cardCollection.map((card: any) => ({
        ...card,
        count: 1 // 全てのカードのcountを1にリセット
      }));
    }
    data.version = 8;
  }
  
  
  // キャラクター機能の追加（既存のデータにフィールドを追加）
  if (!data.characters) {
    data.characters = [];
  }
  if (!data.equippedCharacter) {
    data.equippedCharacter = null;
  }
  
  // 負債利子計算のタイムスタンプを初期化
  if (!data.lastInterestTime) {
    data.lastInterestTime = Date.now();
  }

  // メダルとスキルツリーの初期化
  if (data.medals === undefined) {
    data.medals = 0;
  }
  if (!data.skillLevels) {
    data.skillLevels = [];
  }
  if (data.streakProtectionCount === undefined) {
    data.streakProtectionCount = 0;
  }
  // チャレンジ関連の初期化
  if (!data.challengeBonuses) {
    data.challengeBonuses = {};
  }
  if (data.lastSkillPurchaseTime === undefined) {
    data.lastSkillPurchaseTime = undefined;
  }
  
  // バージョン番号を最新に更新
  data.version = CURRENT_VERSION;
  
  return data;
}

// ヘルパー: カードコレクションをマージ（filename をキーにユニオン）
function rarityRank(r: CardRarity) {
  switch (r) {
    case 'common': return 1;
    case 'rare': return 2;
    case 'epic': return 3;
    case 'legendary': return 4;
    default: return 0;
  }
}

// ヘルパー: カードコレクションをマージ（同一漢字で統合し、最高レアに昇格、count を合算）
function mergeCardCollections(a: KanjiCard[], b: KanjiCard[]): KanjiCard[] {
  const map = new Map<string, KanjiCard>();

  const mergeInto = (c: KanjiCard) => {
    const key = c.kanji;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...c, count: c.count ?? 1 });
      return;
    }

    // 既存と新しいカードをマージ
    const higherRarity = rarityRank(c.rarity) > rarityRank(existing.rarity) ? c.rarity : existing.rarity;
    const newCount = (existing.count ?? 1) + (c.count ?? 1);
    const obtainedAt = existing.obtainedAt ?? c.obtainedAt;

    map.set(key, {
      ...existing,
      rarity: higherRarity,
      count: newCount,
      obtainedAt
    });
  };

  for (const c of a) {
    try { mergeInto(c); } catch (e) { /* ignore */ }
  }
  for (const c of b) {
    try { mergeInto(c); } catch (e) { /* ignore */ }
  }

  return Array.from(map.values());
}

// ヘルパー: キャラクター配列をマージ（id または JSON をキーにユニオン）
function mergeCharacters(a: OwnedCharacter[], b: OwnedCharacter[]): OwnedCharacter[] {
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

// レベルアップに必要なXPを計算(2次関数的に増加: level^2)
function getXpForLevel(level: number): number {
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

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState>(INITIAL_STATE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [medalSystemEnabled, setMedalSystemEnabled] = useState(isMedalSystemEnabled());
  const auth = useAuth();

  // URLパラメータの変化を監視してメダルシステムの有効状態を更新
  useEffect(() => {
    const handleUrlChange = () => {
      setMedalSystemEnabled(isMedalSystemEnabled());
    };
    
    // 初回チェック
    handleUrlChange();
    
    // URLが変わったときに再チェック（popstateイベント）
    window.addEventListener('popstate', handleUrlChange);
    
    // 定期的にチェック（URLパラメータが変わった可能性があるため）
    const interval = setInterval(handleUrlChange, 1000);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  // 初期化：localStorageから読み込み
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = migrateData(parsed);
        setState(migrated);
        // マイグレーション後のデータを保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch (e) {
        console.error('Failed to parse gamification state:', e);
      }
    }
  }, []);

  // ログイン時にFirebaseからデータを読み込み
  useEffect(() => {
    if (auth.user && isFirebaseEnabled) {
      loadFromFirebase(auth.user.uid);
    }
  }, [auth.user]);

  // 負債の利子計算（5分ごと、複利10%）
  useEffect(() => {
    const calculateInterest = () => {
      setState(prev => {
        // コインが負の場合のみ利子を計算
        if (prev.coins >= 0) {
          return prev;
        }

        const now = Date.now();
        const lastTime = prev.lastInterestTime || now;
        const elapsedMinutes = (now - lastTime) / (1000 * 60);
        
        // 5分経過していない場合は何もしない
        if (elapsedMinutes < 5) {
          return prev;
        }

        // 5分単位で複利計算
        const periods = Math.floor(elapsedMinutes / 5);
        const interestRate = 0.10; // 10%の利子率
        
        // 複利計算: 負債 × (1 + 利子率)^期間
        const newCoins = Math.floor(prev.coins * Math.pow(1 + interestRate, periods));
        
        console.log(`負債利子計算: ${prev.coins} → ${newCoins} (${periods}期間経過)`);

        return {
          ...prev,
          coins: newCoins,
          lastInterestTime: now
        };
      });
    };

    // 初回実行
    calculateInterest();

    // 1分ごとにチェック
    const interval = setInterval(calculateInterest, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // 状態変更時にlocalStorageとFirebaseに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    // Firebaseにも自動保存（ログイン中の場合）
    if (auth.user && isFirebaseEnabled && !isSyncing) {
      syncWithFirebase(auth.user.uid);
    }
  }, [state]);

  // Firebaseへの同期
  const syncWithFirebase = async (userId: string) => {
    if (!isFirebaseEnabled || isSyncing) return;

    try {
      setIsSyncing(true);
      // 競合を避けるため、まずサーバ側のデータを読み込み、マージしてから保存する
      const remote = await loadUserData(userId);

      if (!remote) {
        // サーバ側にデータがなければそのまま保存
        await saveUserData(userId, state);
        console.log('Data synced to Firebase (no remote data)');
        return;
      }

      const migratedRemote = migrateData(remote as any);

      // マージ戦略：
      // - totalXp は大きい方を採用
      // - xp はローカルの進行を優先
      // - coins はローカルの値を優先（消費を反映するため）
      // - 配列はユニオン
      // - stats は大きい方を採用（合算ではなく）
      const merged: GamificationState = {
        ...migratedRemote,
        ...state,
        totalXp: Math.max(state.totalXp || 0, migratedRemote.totalXp || 0),
        xp: state.xp,
        level: Math.max(state.level, migratedRemote.level),
        coins: state.coins,
        unlockedBadges: Array.from(new Set([...(migratedRemote.unlockedBadges || []), ...(state.unlockedBadges || [])])),
        purchasedItems: Array.from(new Set([...(migratedRemote.purchasedItems || []), ...(state.purchasedItems || [])])),
        cardCollection: mergeCardCollections(migratedRemote.cardCollection || [], state.cardCollection || []),
        characters: mergeCharacters(migratedRemote.characters || [], state.characters || []),
        equippedCharacter: state.equippedCharacter || migratedRemote.equippedCharacter || null,
        stats: {
          totalQuizzes: Math.max(migratedRemote.stats?.totalQuizzes || 0, state.stats?.totalQuizzes || 0),
          correctAnswers: Math.max(migratedRemote.stats?.correctAnswers || 0, state.stats?.correctAnswers || 0),
          incorrectAnswers: Math.max(migratedRemote.stats?.incorrectAnswers || 0, state.stats?.incorrectAnswers || 0),
          currentStreak: Math.max(migratedRemote.stats?.currentStreak || 0, state.stats?.currentStreak || 0),
          bestStreak: Math.max(migratedRemote.stats?.bestStreak || 0, state.stats?.bestStreak || 0)
        },
        activeTheme: state.activeTheme || migratedRemote.activeTheme,
        activeIcon: state.activeIcon || migratedRemote.activeIcon,
        customIconUrl: state.customIconUrl || migratedRemote.customIconUrl,
        username: migratedRemote.username && migratedRemote.username !== 'プレイヤー' ? migratedRemote.username : state.username
      };

      // 更新日時をセット
      // @ts-ignore - 任意フィールドとして保存
      (merged as any).updatedAt = Date.now();

      // ローカル状態をマージ結果で更新してから保存
      setState(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      await saveUserData(userId, merged);
      console.log('Data merged and synced to Firebase');
    } catch (error) {
      console.error('Failed to sync with Firebase:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Firebaseからデータを読み込み
  const loadFromFirebase = async (userId: string) => {
    if (!isFirebaseEnabled) return;
    
    try {
      const data = await loadUserData(userId);
      if (data) {
        const migrated = migrateData(data);
        // If customIconUrl references Cloud Storage (gs://...), resolve to a downloadable URL
        try {
          if (migrated.customIconUrl && typeof migrated.customIconUrl === 'string' && migrated.customIconUrl.startsWith('gs://')) {
            const resolved = await getStorageDownloadUrl(migrated.customIconUrl);
            migrated.customIconUrl = resolved;
          }
        } catch (e) {
          console.warn('Failed to resolve customIconUrl to download URL:', e);
        }

        setState(migrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        console.log('Data loaded from Firebase');
      }
    } catch (error) {
      console.error('Failed to load from Firebase:', error);
    }
  };

  const addXp = (amount: number) => {
    setState(prev => {
      // キャラクターのブースト効果を適用
      let multiplier = 1;
      if (prev.equippedCharacter) {
        const char = prev.equippedCharacter;
        if (char.effect.type === 'xp_boost' || char.effect.type === 'both_boost') {
          multiplier = getCharacterEffectValue(char);
        }
      }
      
      // コレクションボーナスを適用（掛け算）
      const collectionBonus = calculateCollectionBonus(prev.cardCollection);
      multiplier *= (1 + collectionBonus);
      // チャレンジ由来の恒久XPボーナスを適用
      const challengeXpBoost = prev.challengeBonuses ? Object.values(prev.challengeBonuses).reduce((acc, b) => acc + (b.xp || 0), 0) : 0;
      multiplier *= (1 + challengeXpBoost);
      
      const boostedAmount = Math.floor(amount * multiplier);
      // xpとtotalXpは常に一致
      const newXp = prev.xp + boostedAmount;
      const newTotalXp = newXp;
      
      // 累積XPから適正レベルを計算
      let newLevel = 1;
      let accumulatedXp = 0;
      
      // totalXpからレベルを逆算
      while (true) {
        const nextLevelXp = getXpForLevel(newLevel + 1);
        if (accumulatedXp + nextLevelXp > newTotalXp) {
          break;
        }
        accumulatedXp += nextLevelXp;
        newLevel++;
      }

      // レベルアップバッジの自動付与
      const newBadges = [...prev.unlockedBadges];
      if (newLevel >= 5 && !newBadges.includes('level_5')) {
        newBadges.push('level_5');
        showBadgeNotification(BADGES.level_5);
      }
      if (newLevel >= 10 && !newBadges.includes('level_10')) {
        newBadges.push('level_10');
        showBadgeNotification(BADGES.level_10);
      }
      if (newLevel >= 20 && !newBadges.includes('level_20')) {
        newBadges.push('level_20');
        showBadgeNotification(BADGES.level_20);
      }
      if (newLevel >= 50 && !newBadges.includes('level_50')) {
        newBadges.push('level_50');
        showBadgeNotification(BADGES.level_50);
      }
      if (newLevel >= 100 && !newBadges.includes('level_100')) {
        newBadges.push('level_100');
        showBadgeNotification(BADGES.level_100);
      }
      if (newLevel >= 500 && !newBadges.includes('level_500')) {
        newBadges.push('level_500');
        showBadgeNotification(BADGES.level_500);
      }
      if (newLevel >= 1000 && !newBadges.includes('level_1000')) {
        newBadges.push('level_1000');
        showBadgeNotification(BADGES.level_1000);
      }
      if (newLevel >= 10000 && !newBadges.includes('level_10000')) {
        newBadges.push('level_10000');
        showBadgeNotification(BADGES.level_10000);
      }

      // コレクターバッジの自動付与（他の経路でバッジが増えた場合にも対応）
      if (newBadges.length >= 10 && !newBadges.includes('collector')) {
        newBadges.push('collector');
        setTimeout(() => showBadgeNotification(BADGES.collector), 1000);
      }
      // スーパーコレクター（20個）
      if (newBadges.length >= 20 && !newBadges.includes('super_collector')) {
        newBadges.push('super_collector');
        setTimeout(() => showBadgeNotification(BADGES.super_collector), 1200);
      }

      if (newLevel > prev.level) {
        showLevelUpNotification(newLevel);
      }

      return { ...prev, xp: newXp, level: newLevel, totalXp: newTotalXp, unlockedBadges: newBadges };
    });
  };

  const addCoins = (amount: number) => {
    setState(prev => {
      // キャラクターのブースト効果を適用
      let multiplier = 1;
      if (prev.equippedCharacter) {
        const char = prev.equippedCharacter;
        if (char.effect.type === 'coin_boost' || char.effect.type === 'both_boost') {
          multiplier = getCharacterEffectValue(char);
        }
      }
      
      // コレクションボーナスを適用（掛け算）
      const collectionBonus = calculateCollectionBonus(prev.cardCollection);
      multiplier *= (1 + collectionBonus);
      // チャレンジ由来の恒久コインボーナスを適用
      const challengeCoinBoost = prev.challengeBonuses ? Object.values(prev.challengeBonuses).reduce((acc, b) => acc + (b.coin || 0), 0) : 0;
      multiplier *= (1 + challengeCoinBoost);
      
      const boostedAmount = Math.floor(amount * multiplier);
      const newCoins = prev.coins + boostedAmount;

      // コインが負から正になった場合、または正から負になった場合にタイマーをリセット
      const crossedZero = (prev.coins < 0 && newCoins >= 0) || (prev.coins >= 0 && newCoins < 0);

      const candidate = { ...prev, coins: newCoins };
      const badgesToAdd = computeNewBadges(prev, candidate);
      const newBadges = [...prev.unlockedBadges];
      for (const b of badgesToAdd) {
        if (!newBadges.includes(b)) {
          newBadges.push(b);
          if (BADGES[b]) showBadgeNotification(BADGES[b]);
        }
      }

      return {
        ...prev,
        coins: newCoins,
        lastInterestTime: crossedZero ? Date.now() : prev.lastInterestTime,
        unlockedBadges: newBadges
      };
    });
  };

  const setXp = (amount: number) => {
    setState(prev => {
      // xpとtotalXpは常に一致
      const newXp = amount;
      const newTotalXp = amount;
      let newLevel = 1;
      let accumulatedXp = 0;
      
      // totalXpからレベルを逆算
      while (true) {
        const nextLevelXp = getXpForLevel(newLevel + 1);
        if (accumulatedXp + nextLevelXp > newTotalXp) {
          break;
        }
        accumulatedXp += nextLevelXp;
        newLevel++;
      }

      return { ...prev, xp: newXp, level: newLevel, totalXp: newTotalXp };
    });
  };

  const setCoins = (amount: number) => {
    setState(prev => {
      const candidate = { ...prev, coins: amount };
      const badgesToAdd = computeNewBadges(prev, candidate);
      const newBadges = [...prev.unlockedBadges];
      for (const b of badgesToAdd) {
        if (!newBadges.includes(b)) {
          newBadges.push(b);
          if (BADGES[b]) showBadgeNotification(BADGES[b]);
        }
      }

      return { ...prev, coins: amount, lastInterestTime: Date.now(), unlockedBadges: newBadges };
    });
  };

  const addMedals = (amount: number) => {
    if (!isMedalSystemEnabled()) return; // メダルシステムが無効な場合は何もしない
    setState(prev => ({ ...prev, medals: prev.medals + amount }));
  };

  const setMedals = (amount: number) => {
    setState(prev => ({ ...prev, medals: amount }));
  };

  const unlockBadge = (badgeId: string) => {
    setState(prev => {
      if (prev.unlockedBadges.includes(badgeId)) {
        return prev;
      }
      
      const badge = BADGES[badgeId];
      if (badge) {
        showBadgeNotification(badge);
      }
      // 明示的に付与されたバッジを追加
      let newBadges = [...prev.unlockedBadges, badgeId];

      // computeNewBadges を使って他に付与できるバッジを評価（例: コイン閾値や統計の変化が無くともコレクター判定など）
      const candidate = { ...prev, unlockedBadges: newBadges };
      const badgesToAdd = computeNewBadges(prev, candidate);
      for (const b of badgesToAdd) {
        if (!newBadges.includes(b)) {
          newBadges.push(b);
          if (BADGES[b]) showBadgeNotification(BADGES[b]);
        }
      }

      // 最終的なコレクターチェック（念のため）
      if (newBadges.length >= 10 && !newBadges.includes('collector')) {
        newBadges.push('collector');
        setTimeout(() => showBadgeNotification(BADGES.collector), 1000);
      }
      if (newBadges.length >= 20 && !newBadges.includes('super_collector')) {
        newBadges.push('super_collector');
        setTimeout(() => showBadgeNotification(BADGES.super_collector), 1200);
      }

      return { ...prev, unlockedBadges: newBadges };
    });
  };

  const purchaseItem = (itemId: string, price: number, addToPurchased: boolean = true): boolean => {
    if (state.coins < price) {
      return false;
    }
    
    setState(prev => ({
      ...prev,
      coins: prev.coins - price,
      purchasedItems: addToPurchased ? [...prev.purchasedItems, itemId] : prev.purchasedItems
    }));
    
    return true;
  };

  const updateStats = (updates: Partial<GamificationState['stats']>) => {
    setState(prev => {
      const newStats = { ...prev.stats, ...updates };

      const candidate = { ...prev, stats: newStats };
      const badgesToAdd = computeNewBadges(prev, candidate);
      const newBadges = [...prev.unlockedBadges];
      for (const b of badgesToAdd) {
        if (!newBadges.includes(b)) {
          newBadges.push(b);
          if (BADGES[b]) showBadgeNotification(BADGES[b]);
        }
      }

      return { ...prev, stats: newStats, unlockedBadges: newBadges };
    });
  };

  const setTheme = (themeId: string) => {
    setState(prev => ({ ...prev, activeTheme: themeId }));
  };

  const setIcon = (iconId: string) => {
    setState(prev => ({ ...prev, activeIcon: iconId }));
  };

  const setCustomIconUrl = (url: string) => {
    setState(prev => ({ ...prev, customIconUrl: url, activeIcon: 'custom' }));
  };

  const setUsername = (username: string) => {
    const cleaned = username.trim() || 'プレイヤー';

    // ローカルのゲーム状態のみ更新（プレイヤー名）。アカウントの displayName は変更しない。
    const updatedState = { ...state, username: cleaned };
    setState(updatedState);

    // ログイン中かつFirebase有効なら、Firestoreのユーザーデータとランキングを直接更新する（非同期・fire-and-forget）
    if (auth && auth.user && isFirebaseEnabled) {
      const uid = auth.user.uid;
      (async () => {
        try {
          await saveUserData(uid, updatedState);
        } catch (e) {
          console.error('Failed to save username to Firestore:', e);
        }
      })();
    }
  };

  const getXpForNextLevel = () => {
    return getXpForLevel(state.level + 1);
  };

  // 現在のレベルまでに必要な累積XP
  const getTotalXpForCurrentLevel = () => {
    let accumulatedXp = 0;
    for (let i = 2; i <= state.level; i++) {
      accumulatedXp += getXpForLevel(i);
    }
    return accumulatedXp;
  };

  // 次のレベルまでに必要な累積XP
  const getTotalXpForNextLevel = () => {
    let accumulatedXp = 0;
    for (let i = 2; i <= state.level + 1; i++) {
      accumulatedXp += getXpForLevel(i);
    }
    return accumulatedXp;
  };

  const getLevelProgress = () => {
    const currentLevelXp = getTotalXpForCurrentLevel();
    const nextLevelXp = getTotalXpForNextLevel();
    const totalXpNeeded = nextLevelXp - currentLevelXp;
    const currentProgress = state.xp - currentLevelXp;
    return (currentProgress / totalXpNeeded) * 100;
  };

  const addCardToCollection = (card: KanjiCard) => {
    setState(prev => {
      const existingIndex = prev.cardCollection.findIndex(c => c.kanji === card.kanji);
      // 深くコピーして不変性を保持
      const newCollection = [...prev.cardCollection];

      // 属性情報を付与（まだない場合）
      const cardWithAttributes = card.attributes 
        ? card 
        : { ...card, attributes: getKanjiAttributes(card.kanji) };

      if (existingIndex === -1) {
        // 新規カードのみ追加（被りは無視）
        newCollection.push({ ...cardWithAttributes, obtainedAt: Date.now() });
      } else {
        // 既に持っている場合は最高レアリティのみ更新
        const existing = { ...newCollection[existingIndex] };
        if (rarityRank(card.rarity) > rarityRank(existing.rarity)) {
          existing.rarity = card.rarity;
          // 属性情報を更新
          if (!existing.attributes) {
            existing.attributes = getKanjiAttributes(existing.kanji);
          }
          newCollection[existingIndex] = existing;
        }
      }

      return { ...prev, cardCollection: newCollection };
    });
  };

  const openCardPack = (packType: string): KanjiCard[] => {
    const config = CARD_PACK_CONFIG[packType];
    if (!config) return [];

    const cards: KanjiCard[] = [];

    // レアリティの重み付き抽選
    const selectRarity = (): CardRarity => {
      const totalWeight = Object.values(config.rarityWeights).reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      
      for (const [rarity, weight] of Object.entries(config.rarityWeights)) {
        random -= weight;
        if (random <= 0) {
          return rarity as CardRarity;
        }
      }
      return 'common';
    };

    // 保証枠を先に生成
    // 仕様変更: パックによる差異は「枚数」と「レアリティ」のみとする（出現漢字のプールは全漢字）
    if (config.guaranteed) {
      for (const [rarity, count] of Object.entries(config.guaranteed)) {
        for (let i = 0; i < count; i++) {
          // levelRange を使わず、全漢字プールから抽出する（どのパックでも全漢字が出る）
          const kanjiList = getRandomKanji(1);
          if (kanjiList.length > 0) {
            const kanjiData = kanjiList[0];
            cards.push({
              id: `${Date.now()}-${Math.random()}`,
              kanji: kanjiData.kanji,
              reading: kanjiData.reading,
              meaning: kanjiData.meaning,
              level: kanjiData.level,
              rarity: rarity as CardRarity,
              imageUrl: `/kanji/level-${kanjiData.level}/images/${kanjiData.kanji}.png`
            });
          }
        }
      }
    }

    // 残りのカードを生成
    const remainingCount = config.cardCount - cards.length;
    // 仕様変更: levelRange を無視して全漢字プールから選ぶ
    const randomKanjis = getRandomKanji(remainingCount);
    
    for (let i = 0; i < randomKanjis.length; i++) {
      const rarity = selectRarity();
      const kanjiData = randomKanjis[i];
      
      cards.push({
        id: `${Date.now()}-${Math.random()}-${i}`,
        kanji: kanjiData.kanji,
        reading: kanjiData.reading,
        meaning: kanjiData.meaning,
        level: kanjiData.level,
        rarity,
        imageUrl: `/kanji/level-${kanjiData.level}/images/${kanjiData.kanji}.png`
      });
    }

    return cards;
  };

  // キャラクターガチャを引く
  const pullCharacterGacha = (count: number, guaranteedRarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'): Character[] => {
    // 上限に達していないキャラクターのIDセットを作成
    const availableCharacterIds = new Set<string>();
    const maxedOutCharacterIds = new Set<string>();
    
    // 既存のキャラクターをチェック
    state.characters.forEach(char => {
      if (char.count >= MAX_CHARACTER_COUNT) {
        maxedOutCharacterIds.add(char.id);
      }
    });
    
    // 全キャラクターから上限に達したものを除外
    Object.keys(CHARACTERS).forEach(id => {
      if (!maxedOutCharacterIds.has(id)) {
        availableCharacterIds.add(id);
      }
    });
    
    // 利用可能なキャラクターがない場合は空配列を返す
    if (availableCharacterIds.size === 0) {
      return [];
    }
    
    // 利用可能なキャラクターのみでガチャを引く
    const availableCharacters = Object.fromEntries(
      Object.entries(CHARACTERS).filter(([id]) => availableCharacterIds.has(id))
    ) as Record<string, Character>;
    
    const results = pullGacha(count, guaranteedRarity, availableCharacters);
    
    setState(prev => {
      const newCharacters = [...prev.characters];
      
      results.forEach(char => {
        // 同じIDのキャラクターを探す
        const existingIndex = newCharacters.findIndex(c => c.id === char.id);
        
      if (existingIndex !== -1) {
        // 既に持っているキャラクターの場合はレベルとカウントを上げる（上限チェック）
        const currentCount = newCharacters[existingIndex].count;
        if (currentCount < MAX_CHARACTER_COUNT) {
          newCharacters[existingIndex] = {
            ...newCharacters[existingIndex],
            level: newCharacters[existingIndex].level + 1,
            count: Math.min(currentCount + 1, MAX_CHARACTER_COUNT)
          };
        }
      } else {
        // 新しいキャラクターの場合は追加
        newCharacters.push({
          ...char,
          level: 1,
          count: 1,
          xp: 0
        });
      }
      });
      
      return { ...prev, characters: newCharacters };
    });
    
    return results;
  };

  // キャラクターを装備/解除
  const equipCharacter = (character: OwnedCharacter | null) => {
    setState(prev => ({ ...prev, equippedCharacter: character }));
  };

  // コレクションボーナスを計算
  const calculateCollectionBonus = (cards: KanjiCard[]): number => {
    if (cards.length === 0) return 0;

    // レアリティに応じたボーナスを計算（被りカウントは廃止）
    let bonus = 0;
    cards.forEach(card => {
      switch (card.rarity) {
        case 'common':
          bonus += 0.01; // 1%
          break;
        case 'rare':
          bonus += 0.025; // 2.5%
          break;
        case 'epic':
          bonus += 0.05; // 5%
          break;
        case 'legendary':
          bonus += 0.1; // 10%
          break;
      }
    });

    return bonus;
  };

  // コレクションボーナスを取得（外部公開用）
  const getCollectionBoost = (): number => {
    return calculateCollectionBonus(state.cardCollection);
  };

  // 装備中のキャラクターのブースト効果を取得
  const getCharacterBoost = (type: 'xp' | 'coin'): number => {
    if (!state.equippedCharacter) return 1;
    
    const char = state.equippedCharacter;
    const effectValue = getCharacterEffectValue(char);
    
    if (char.effect.type === 'both_boost') {
      return effectValue;
    } else if (char.effect.type === 'xp_boost' && type === 'xp') {
      return effectValue;
    } else if (char.effect.type === 'coin_boost' && type === 'coin') {
      return effectValue;
    }
    
    return 1;
  };

  // キャラクターに経験値を追加（装備中のキャラクターのみ）
  const addCharacterXp = (amount: number) => {
    setState(prev => {
      if (!prev.equippedCharacter) return prev;

      // 装備中のキャラクターのインデックスを探す
      const charIndex = prev.characters.findIndex(c => c.id === prev.equippedCharacter!.id);
      if (charIndex === -1) return prev;

      const currentChar = prev.characters[charIndex];
      if (currentChar.level >= MAX_CHARACTER_LEVEL) return prev; // 最大レベルなら何もしない

      let newXp = currentChar.xp + amount;
      let newLevel = currentChar.level;

      // レベルアップ判定
      while (newLevel < MAX_CHARACTER_LEVEL && newXp >= getXpForCharacterLevel(newLevel)) {
        newXp -= getXpForCharacterLevel(newLevel);
        newLevel++;
      }

      // キャラクター配列を更新
      const newCharacters = [...prev.characters];
      newCharacters[charIndex] = {
        ...currentChar,
        level: newLevel,
        xp: newLevel >= MAX_CHARACTER_LEVEL ? 0 : newXp
      };

      // 装備中のキャラクターも更新
      const newEquippedCharacter = newCharacters[charIndex];

      // レベルアップした場合は通知
      if (newLevel > currentChar.level) {
        showCharacterLevelUpNotification(newEquippedCharacter, newLevel);
      }

      return {
        ...prev,
        characters: newCharacters,
        equippedCharacter: newEquippedCharacter
      };
    });
  };

  // デッキにカードを追加（試験的機能）
  const addCardsToDeck = (cards: KanjiCard[]) => {
    setState(prev => {
      const deck = prev.deck || [];
      const newDeck = [...deck];
      
      cards.forEach(card => {
        // すでにデッキに入っているか確認
        if (!newDeck.find(c => c.kanji === card.kanji)) {
          newDeck.push({ ...card, deckLevel: 0 });
        }
      });
      
      return { ...prev, deck: newDeck };
    });
  };

  // デッキからカードを削除（試験的機能）
  const removeCardFromDeck = (kanji: string) => {
    setState(prev => {
      const deck = prev.deck || [];
      return { ...prev, deck: deck.filter(c => c.kanji !== kanji) };
    });
  };

  // デッキのカードを強化（試験的機能）
  const upgradeCardInDeck = (kanji: string, cost: number) => {
    setState(prev => {
      if (prev.coins < cost) return prev;
      
      const deck = prev.deck || [];
      const cardIndex = deck.findIndex(c => c.kanji === kanji);
      if (cardIndex === -1) return prev;
      
      const newDeck = [...deck];
      newDeck[cardIndex] = {
        ...newDeck[cardIndex],
        deckLevel: (newDeck[cardIndex].deckLevel || 0) + 1
      };
      
      return {
        ...prev,
        deck: newDeck,
        coins: prev.coins - cost
      };
    });
  };

  // デッキからのブースト効果を取得（試験的機能）
  const getDeckBoost = (): { xp: number; coin: number } => {
    const deck = state.deck || [];
    let xpBoost = 0;
    let coinBoost = 0;
    
    deck.forEach(card => {
      const level = card.deckLevel || 0;
      xpBoost += level * 0.05; // 1レベルあたり5%
      coinBoost += level * 0.03; // 1レベルあたり3%
    });
    
    return { xp: xpBoost, coin: coinBoost };
  };

  // スキルをアップグレード
  const upgradeSkill = (skillId: string): boolean => {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;

    const currentLevel = getSkillLevel(skillId);
    if (currentLevel >= skill.maxLevel) return false;

    // 前提スキルのチェック（配列に対応）
    if (skill.prerequisite && skill.prerequisite.length > 0) {
      const allPrereqsMet = skill.prerequisite.every(prereqId => {
        const prereqLevel = getSkillLevel(prereqId);
        return prereqLevel > 0; // 少なくとも1レベル必要
      });
      
      if (!allPrereqsMet) {
        return false; // 前提スキルが満たされていない
      }
    }

    // コストチェック（固定コスト）
    const cost = skill.cost;
    if (state.medals < cost) return false;

    setState(prev => {
      const newSkillLevels = [...prev.skillLevels];
      const existingIndex = newSkillLevels.findIndex(sl => sl.skillId === skillId);
      
      if (existingIndex >= 0) {
        newSkillLevels[existingIndex] = {
          ...newSkillLevels[existingIndex],
          level: newSkillLevels[existingIndex].level + 1
        };
      } else {
        newSkillLevels.push({ skillId, level: 1 });
      }

      // ストリーク保護スキルの場合、使用可能回数を増やす
      let newStreakProtectionCount = prev.streakProtectionCount;
      if (skill.effect.type === 'streak_protection') {
        newStreakProtectionCount += skill.effect.value;
      }

      return {
        ...prev,
        medals: prev.medals - cost,
        skillLevels: newSkillLevels,
        streakProtectionCount: newStreakProtectionCount
        , lastSkillPurchaseTime: Date.now()
      };
    });

    return true;
  };

  // スキルレベルを取得
  const getSkillLevel = (skillId: string): number => {
    const skillLevel = state.skillLevels.find(sl => sl.skillId === skillId);
    return skillLevel?.level || 0;
  };

  // スキルのブースト効果を取得
  const getSkillBoost = (type: 'xp_boost' | 'coin_boost' | 'medal_boost' | 'double_reward' | 'critical_hit' | 'lucky_coin' | 'xp_multiplier' | 'time_bonus'): number => {
    let totalBoost = 0;
    
    state.skillLevels.forEach(sl => {
      const skill = SKILLS.find(s => s.id === sl.skillId);
      if (skill && skill.effect.type === type) {
        totalBoost += skill.effect.value * sl.level;
      }
    });
    
    return totalBoost / 100; // パーセンテージから倍率に変換
  };

  // ストリーク保護を使用
  const useStreakProtection = (): boolean => {
    if (state.streakProtectionCount <= 0) return false;
    
    setState(prev => ({
      ...prev,
      streakProtectionCount: prev.streakProtectionCount - 1
    }));
    
    return true;
  };

  // チャレンジを完了扱いにして恒久ボーナスを付与する
  const completeChallenge = (challengeId: string, bonus: { xp?: number; coin?: number }) => {
    setState(prev => {
      const existing = prev.challengeBonuses || {};
      if (existing[challengeId]) return prev; // 既に付与済み

      const newBonuses = { ...(prev.challengeBonuses || {}), [challengeId]: bonus };

      // 簡易通知
      try {
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 16px;background:#2b6cb0;color:white;border-radius:10px;z-index:12000;box-shadow:0 8px 20px rgba(0,0,0,0.2);';
        n.textContent = '🎖️ チャレンジ達成！恒久ボーナスを獲得しました';
        document.body.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.4s'; setTimeout(() => n.remove(), 450); }, 2000);
      } catch (e) {
        // ignore
      }

      return { ...prev, challengeBonuses: newBonuses };
    });
  };

  const getChallengeBoost = (type: 'xp' | 'coin') => {
    const c = state.challengeBonuses || {};
    return Object.values(c).reduce((acc, b) => acc + (type === 'xp' ? (b.xp || 0) : (b.coin || 0)), 0);
  };

  return (
    <GamificationContext.Provider value={{
      state,
      isMedalSystemEnabled: medalSystemEnabled,
      addXp,
      addCoins,
      addMedals,
      setXp,
      setCoins,
      setMedals,
      unlockBadge,
      purchaseItem,
      updateStats,
      setTheme,
      setIcon,
      setCustomIconUrl,
      setUsername,
      getXpForNextLevel,
      getTotalXpForCurrentLevel,
      getTotalXpForNextLevel,
      getLevelProgress,
      addCardToCollection,
      openCardPack,
      pullCharacterGacha,
      equipCharacter,
      getCharacterBoost,
      addCharacterXp,
      getCollectionBoost,
      addCardsToDeck,
      removeCardFromDeck,
      upgradeCardInDeck,
      getDeckBoost,
      upgradeSkill,
      getSkillLevel,
      getSkillBoost,
      useStreakProtection,
      completeChallenge,
      getChallengeBoost,
      syncWithFirebase,
      loadFromFirebase
    }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return context;
}

// 通知表示用のヘルパー関数
function showCharacterLevelUpNotification(character: OwnedCharacter, newLevel: number) {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1rem;
      z-index: 1200;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.25);
      animation: slideInRight 0.45s ease-out;
      display: flex;
      gap: 0.75rem;
      align-items: center;
      min-width: 220px;
    ">
      <div style="font-size: 1.75rem;">${character.icon}</div>
      <div>
        <div style="font-weight:700;">${character.name}</div>
        <div style="font-size:0.9rem; opacity:0.95;">Lv.${newLevel}</div>
      </div>
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    const el = notification.firstElementChild as HTMLElement | null;
    if (el) {
      el.style.animation = 'slideOutRight 0.4s ease-out';
    }
    setTimeout(() => notification.remove(), 400);
  }, 2000);
}

function showLevelUpNotification(level: number) {
  // シンプルな通知（後でカスタムUIに置き換え可能）
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.9rem 1.2rem;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 700;
      z-index: 1200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      animation: slideInRight 0.45s ease-out;
      min-width: 180px;
      text-align: left;
    ">
      🎉 レベルアップ！ <span style="display:block; font-size:1.05rem; margin-top:4px;">レベル ${level}</span>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    const el = notification.firstElementChild as HTMLElement | null;
    if (el) {
      el.style.animation = 'slideOutRight 0.4s ease-out';
    }
    setTimeout(() => notification.remove(), 400);
  }, 2000);
}

function showBadgeNotification(badge: Badge) {
  const notification = document.createElement('div');
  notification.className = 'badge-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(30, 30, 46, 0.95);
      border: 2px solid rgba(102, 126, 234, 0.5);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-size: 1rem;
      z-index: 10000;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: slideInRight 0.5s ease-out;
      min-width: 250px;
    ">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 2rem;">${badge.icon}</span>
        <div>
          <div style="font-weight: 700; margin-bottom: 0.25rem;">🏆 バッジ獲得！</div>
          <div style="font-size: 0.9rem; color: #a0a0c0;">${badge.name}</div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.5s ease-out';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// CSSアニメーションを追加
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      to { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    }
    @keyframes slideInRight {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
