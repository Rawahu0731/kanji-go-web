import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BADGES } from '../data/badges';
import type { Badge } from '../data/badges';
import type { KanjiCard, CardRarity } from '../data/cardCollection';
import { CARD_PACK_CONFIG } from '../data/cardCollection';
import { getRandomKanji } from '../data/allKanji';

const STORAGE_KEY = 'kanji_gamification';

export type ActiveBoost = {
  id: string;
  name: string;
  effect: string;
  icon: string;
  expiresAt: number; // タイムスタンプ
};

export interface GamificationState {
  version?: number; // データバージョン
  xp: number;
  level: number;
  coins: number;
  totalXp: number; // 累計XP（ストーリー解放などの判定に使用）
  unlockedBadges: string[];
  purchasedItems: string[];
  activeBoosts: ActiveBoost[]; // アクティブなブースト
  cardCollection: KanjiCard[]; // カードコレクション
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
}

type GamificationContextType = {
  state: GamificationState;
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  setXp: (amount: number) => void;
  setCoins: (amount: number) => void;
  unlockBadge: (badgeId: string) => void;
  purchaseItem: (itemId: string, price: number, addToPurchased?: boolean) => boolean;
  activateBoost: (boostId: string, name: string, effect: string, icon: string, durationMinutes: number) => void;
  updateStats: (updates: Partial<GamificationState['stats']>) => void;
  setTheme: (themeId: string) => void;
  setIcon: (iconId: string) => void;
  setCustomIconUrl: (url: string) => void;
  setUsername: (username: string) => void;
  getXpForNextLevel: () => number;
  getLevelProgress: () => number;
  getActiveBoostMultiplier: (type: 'xp' | 'coin') => number;
  addCardToCollection: (card: KanjiCard) => void;
  openCardPack: (packType: string) => KanjiCard[];
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const CURRENT_VERSION = 1; // データバージョン

const INITIAL_STATE: GamificationState = {
  version: CURRENT_VERSION,
  xp: 0,
  level: 1,
  coins: 0,
  totalXp: 0,
  unlockedBadges: [],
  purchasedItems: [],
  activeBoosts: [],
  cardCollection: [],
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
  username: 'プレイヤー'
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
  
  // バージョン番号を最新に更新
  data.version = CURRENT_VERSION;
  
  return data;
}

// レベルアップに必要なXPを計算（指数関数的に増加）
function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState>(INITIAL_STATE);

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

  // 状態変更時にlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // 期限切れのブーストを定期的に削除
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const validBoosts = prev.activeBoosts.filter(boost => boost.expiresAt > now);
        
        if (validBoosts.length !== prev.activeBoosts.length) {
          return { ...prev, activeBoosts: validBoosts };
        }
        return prev;
      });
    }, 1000); // 1秒ごとにチェック

    return () => clearInterval(interval);
  }, []);

  // アクティブなブーストの倍率を計算
  const getActiveBoostMultiplier = (type: 'xp' | 'coin'): number => {
    const now = Date.now();
    let multiplier = 1;

    // 永続アップグレードの効果
    if (state.purchasedItems.includes('permanent_xp_boost') && type === 'xp') {
      multiplier *= 1.1;
    }
    if (state.purchasedItems.includes('permanent_coin_boost') && type === 'coin') {
      multiplier *= 1.1;
    }
    if (state.purchasedItems.includes('master_learner')) {
      multiplier *= 1.2;
    }
    if (state.purchasedItems.includes('ultimate_power')) {
      multiplier *= 1.5;
    }

    // 時限ブーストの効果
    state.activeBoosts.forEach(boost => {
      if (boost.expiresAt > now) {
        // XPブースト
        if (type === 'xp') {
          if (boost.effect === 'xp_boost_2x_1h') multiplier *= 2;
          else if (boost.effect === 'xp_boost_3x_30m') multiplier *= 3;
          else if (boost.effect === 'xp_boost_5x_15m') multiplier *= 5;
          else if (boost.effect === 'xp_boost_10x_5m') multiplier *= 10;
          else if (boost.effect === 'all_boost_15m') multiplier *= 1.5;
          else if (boost.effect === 'mega_boost_1h') multiplier *= 3;
          else if (boost.effect === 'double_reward_24h') multiplier *= 2;
          else if (boost.effect === 'legendary_boost_30m') multiplier *= 5;
        }
        // コインブースト
        if (type === 'coin') {
          if (boost.effect === 'coin_boost_2x_1h') multiplier *= 2;
          else if (boost.effect === 'all_boost_15m') multiplier *= 1.5;
          else if (boost.effect === 'mega_boost_1h') multiplier *= 3;
          else if (boost.effect === 'double_reward_24h') multiplier *= 2;
          else if (boost.effect === 'legendary_boost_30m') multiplier *= 5;
        }
      }
    });

    return multiplier;
  };

  const addXp = (amount: number) => {
    const multiplier = getActiveBoostMultiplier('xp');
    const boostedAmount = Math.floor(amount * multiplier);
    
    setState(prev => {
      const newXp = prev.xp + boostedAmount;
      const newTotalXp = prev.totalXp + boostedAmount;
      let newLevel = prev.level;
      
      // レベルアップ判定（XPは消費しない）
      while (newXp >= getXpForLevel(newLevel)) {
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
    const multiplier = getActiveBoostMultiplier('coin');
    const boostedAmount = Math.floor(amount * multiplier);
    setState(prev => ({ ...prev, coins: prev.coins + boostedAmount }));
  };

  const setXp = (amount: number) => {
    setState(prev => {
      const newXp = amount;
      const newTotalXp = amount;
      let newLevel = 1;
      
      // XPからレベルを再計算（XPは消費されないので、累計XPと同じ）
      while (newXp >= getXpForLevel(newLevel)) {
        newLevel++;
      }

      return { ...prev, xp: newXp, level: newLevel, totalXp: newTotalXp };
    });
  };

  const setCoins = (amount: number) => {
    setState(prev => ({ ...prev, coins: amount }));
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

  const activateBoost = (boostId: string, name: string, effect: string, icon: string, durationMinutes: number) => {
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    
    setState(prev => {
      // 同じ効果のブーストが既にアクティブな場合は時間を延長
      const existingBoostIndex = prev.activeBoosts.findIndex(b => b.effect === effect);
      
      if (existingBoostIndex !== -1) {
        const updatedBoosts = [...prev.activeBoosts];
        updatedBoosts[existingBoostIndex].expiresAt = Math.max(
          updatedBoosts[existingBoostIndex].expiresAt,
          expiresAt
        );
        return { ...prev, activeBoosts: updatedBoosts };
      }
      
      // 新しいブーストを追加
      return {
        ...prev,
        activeBoosts: [...prev.activeBoosts, { id: boostId, name, effect, icon, expiresAt }]
      };
    });
    
    // ブースト有効化の通知
    showBoostNotification(name, icon, durationMinutes);
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
    return getXpForLevel(state.level);
  };

  const getLevelProgress = () => {
    const xpNeeded = getXpForNextLevel();
    return (state.xp / xpNeeded) * 100;
  };

  const addCardToCollection = (card: KanjiCard) => {
    setState(prev => ({
      ...prev,
      cardCollection: [...prev.cardCollection, { ...card, obtainedAt: Date.now() }]
    }));
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

  return (
    <GamificationContext.Provider value={{
      state,
      addXp,
      addCoins,
      setXp,
      setCoins,
      unlockBadge,
      purchaseItem,
      activateBoost,
      updateStats,
      setTheme,
      setIcon,
      setCustomIconUrl,
      setUsername,
      getXpForNextLevel,
      getLevelProgress,
      getActiveBoostMultiplier,
      addCardToCollection,
      openCardPack
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

function showBoostNotification(name: string, icon: string, durationMinutes: number) {
  const notification = document.createElement('div');
  notification.className = 'boost-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
        <span style="font-size: 2rem;">${icon}</span>
        <div>
          <div style="font-weight: 700; margin-bottom: 0.25rem;">ブースト有効化！</div>
          <div style="font-size: 0.9rem;">${name}</div>
          <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 0.25rem;">残り ${durationMinutes}分</div>
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
