import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BADGES } from '../data/badges';
import type { Badge } from '../data/badges';
import type { KanjiCard, CardRarity } from '../data/cardCollection';
import { CARD_PACK_CONFIG } from '../data/cardCollection';
import { getRandomKanji } from '../data/allKanji';
import type { Character, OwnedCharacter } from '../data/characters';
import { pullGacha, getCharacterEffectValue, getXpForCharacterLevel, MAX_CHARACTER_LEVEL } from '../data/characters';
import { getKanjiAttributes } from '../data/kanjiAttributes';
import { saveUserData, loadUserData, isFirebaseEnabled } from '../lib/firebase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'kanji_gamification';

export interface GamificationState {
  version?: number; // データバージョン
  xp: number;
  level: number;
  coins: number;
  totalXp: number; // 累計XP（ストーリー解放などの判定に使用）
  unlockedBadges: string[];
  purchasedItems: string[];
  cardCollection: KanjiCard[]; // カードコレクション
  deck?: KanjiCard[]; // デッキ（試験的機能）
  characters: OwnedCharacter[]; // 所持キャラクター
  equippedCharacter: OwnedCharacter | null; // 装備中のキャラクター
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
}


type GamificationContextType = {
  state: GamificationState;
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  setXp: (amount: number) => void;
  setCoins: (amount: number) => void;
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
  syncWithFirebase: (userId: string) => Promise<void>;
  loadFromFirebase: (userId: string) => Promise<void>;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const CURRENT_VERSION = 7; // データバージョン（バージョン7：レベル計算の完全修正）

const INITIAL_STATE: GamificationState = {
  version: CURRENT_VERSION,
  xp: 0,
  level: 1,
  coins: 0,
  totalXp: 0,
  unlockedBadges: [],
  purchasedItems: [],
  cardCollection: [],
  deck: [],
  characters: [],
  equippedCharacter: null,
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
  const auth = useAuth();

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
      
      const boostedAmount = Math.floor(amount * multiplier);
      const newCoins = prev.coins + boostedAmount;
      
      // コインが負から正になった場合、または正から負になった場合にタイマーをリセット
      const crossedZero = (prev.coins < 0 && newCoins >= 0) || (prev.coins >= 0 && newCoins < 0);
      
      return { 
        ...prev, 
        coins: newCoins,
        lastInterestTime: crossedZero ? Date.now() : prev.lastInterestTime
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
    setState(prev => ({ 
      ...prev, 
      coins: amount,
      lastInterestTime: Date.now() // コインを設定したら利子計算のタイマーをリセット
    }));
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

      const newBadges = [...prev.unlockedBadges, badgeId];

      // コレクターバッジの自動付与
      if (newBadges.length >= 10 && !newBadges.includes('collector')) {
        newBadges.push('collector');
        setTimeout(() => showBadgeNotification(BADGES.collector), 1000);
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
      const newBadges = [...prev.unlockedBadges];

      // 実績バッジの自動チェック
      if (newStats.totalQuizzes >= 1 && !newBadges.includes('first_quiz')) {
        newBadges.push('first_quiz');
        showBadgeNotification(BADGES.first_quiz);
      }
      if (newStats.correctAnswers >= 10 && !newBadges.includes('quiz_master_10')) {
        newBadges.push('quiz_master_10');
        showBadgeNotification(BADGES.quiz_master_10);
      }
      if (newStats.correctAnswers >= 50 && !newBadges.includes('quiz_master_50')) {
        newBadges.push('quiz_master_50');
        showBadgeNotification(BADGES.quiz_master_50);
      }
      if (newStats.correctAnswers >= 100 && !newBadges.includes('quiz_master_100')) {
        newBadges.push('quiz_master_100');
        showBadgeNotification(BADGES.quiz_master_100);
      }
      if (newStats.currentStreak >= 5 && !newBadges.includes('perfect_streak_5')) {
        newBadges.push('perfect_streak_5');
        showBadgeNotification(BADGES.perfect_streak_5);
      }
      if (newStats.currentStreak >= 10 && !newBadges.includes('perfect_streak_10')) {
        newBadges.push('perfect_streak_10');
        showBadgeNotification(BADGES.perfect_streak_10);
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
    setState(prev => ({ ...prev, username: username.trim() || 'プレイヤー' }));
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
        newCollection.push({ ...cardWithAttributes, obtainedAt: Date.now(), count: card.count ?? 1 });
      } else {
        const existing = { ...newCollection[existingIndex] };
        // 最高レアを保持
        existing.rarity = rarityRank(card.rarity) > rarityRank(existing.rarity) ? card.rarity : existing.rarity;
        // 被り回数を増やす
        existing.count = (existing.count ?? 1) + (card.count ?? 1);
        // obtainedAt は最初に入手した日時を保持
        existing.obtainedAt = existing.obtainedAt ?? Date.now();
        // 属性情報を更新
        if (!existing.attributes) {
          existing.attributes = getKanjiAttributes(existing.kanji);
        }
        newCollection[existingIndex] = existing;
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
    if (config.guaranteed) {
      for (const [rarity, count] of Object.entries(config.guaranteed)) {
        for (let i = 0; i < count; i++) {
          const kanjiList = getRandomKanji(1, config.levelRange);
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
    const randomKanjis = getRandomKanji(remainingCount, config.levelRange);
    
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
    const results = pullGacha(count, guaranteedRarity);
    
    setState(prev => {
      const newCharacters = [...prev.characters];
      
      results.forEach(char => {
        // 同じIDのキャラクターを探す
        const existingIndex = newCharacters.findIndex(c => c.id === char.id);
        
      if (existingIndex !== -1) {
        // 既に持っているキャラクターの場合はレベルとカウントを上げる
        newCharacters[existingIndex] = {
          ...newCharacters[existingIndex],
          level: newCharacters[existingIndex].level + 1,
          count: newCharacters[existingIndex].count + 1
        };
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

    // 被りを含めた合計所持数を計算
    let totalCount = 0;
    cards.forEach(card => {
      const cCount = card.count ?? 1;
      totalCount += cCount;
    });

    // 所持数×0.01%（1枚で+0.01%、100枚で+1%）
    const bonus = totalCount * 0.0001;
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

  return (
    <GamificationContext.Provider value={{
      state,
      addXp,
      addCoins,
      setXp,
      setCoins,
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
  notification.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem 2.5rem;
    border-radius: 16px;
    font-weight: 700;
    font-size: 1.3rem;
    z-index: 10000;
    box-shadow: 0 20px 60px rgba(102, 126, 234, 0.6);
    animation: characterLevelUp 1.2s ease-out;
    pointer-events: none;
    text-align: center;
  `;
  notification.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 0.5rem;">${character.icon}</div>
    <div>${character.name}</div>
    <div style="font-size: 1.5rem; margin-top: 0.5rem;">Lv.${newLevel}!</div>
  `;
  document.body.appendChild(notification);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes characterLevelUp {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
      70% { transform: translate(-50%, -50%) scale(0.95); }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
      document.head.removeChild(style);
    }, 300);
  }, 2000);
}

function showLevelUpNotification(level: number) {
  // シンプルな通知（後でカスタムUIに置き換え可能）
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 3rem;
      border-radius: 16px;
      font-size: 1.5rem;
      font-weight: 700;
      z-index: 10000;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      animation: slideIn 0.5s ease-out;
    ">
      🎉 レベルアップ！<br/>
      <span style="font-size: 2rem;">レベル ${level}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.5s ease-out';
    setTimeout(() => notification.remove(), 500);
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
