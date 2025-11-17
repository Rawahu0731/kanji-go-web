import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BADGES } from '../data/badges';
import type { Badge } from '../data/badges';

const STORAGE_KEY = 'kanji_gamification';

export type GamificationState = {
  xp: number;
  level: number;
  coins: number;
  unlockedBadges: string[];
  purchasedItems: string[];
  stats: {
    totalQuizzes: number;
    correctAnswers: number;
    incorrectAnswers: number;
    currentStreak: number;
    bestStreak: number;
  };
  activeTheme: string;
  activeIcon: string;
};

type GamificationContextType = {
  state: GamificationState;
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  unlockBadge: (badgeId: string) => void;
  purchaseItem: (itemId: string, price: number) => boolean;
  updateStats: (updates: Partial<GamificationState['stats']>) => void;
  setTheme: (themeId: string) => void;
  setIcon: (iconId: string) => void;
  getXpForNextLevel: () => number;
  getLevelProgress: () => number;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const INITIAL_STATE: GamificationState = {
  xp: 0,
  level: 1,
  coins: 0,
  unlockedBadges: [],
  purchasedItems: [],
  stats: {
    totalQuizzes: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    currentStreak: 0,
    bestStreak: 0
  },
  activeTheme: 'default',
  activeIcon: 'default'
};

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
        setState(parsed);
      } catch (e) {
        console.error('Failed to parse gamification state:', e);
      }
    }
  }, []);

  // 状態変更時にlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addXp = (amount: number) => {
    setState(prev => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      
      // レベルアップ判定
      while (newXp >= getXpForLevel(newLevel)) {
        newXp -= getXpForLevel(newLevel);
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

      return { ...prev, xp: newXp, level: newLevel, unlockedBadges: newBadges };
    });
  };

  const addCoins = (amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }));
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

  const purchaseItem = (itemId: string, price: number): boolean => {
    if (state.coins < price) {
      return false;
    }
    
    setState(prev => ({
      ...prev,
      coins: prev.coins - price,
      purchasedItems: [...prev.purchasedItems, itemId]
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

  const getXpForNextLevel = () => {
    return getXpForLevel(state.level);
  };

  const getLevelProgress = () => {
    const xpNeeded = getXpForNextLevel();
    return (state.xp / xpNeeded) * 100;
  };

  return (
    <GamificationContext.Provider value={{
      state,
      addXp,
      addCoins,
      unlockBadge,
      purchaseItem,
      updateStats,
      setTheme,
      setIcon,
      getXpForNextLevel,
      getLevelProgress
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
