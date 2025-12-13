import type { GamificationState } from './types';
import { CURRENT_VERSION } from './utils';

// データマイグレーション関数
export function migrateData(data: any): GamificationState {
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
  if (!data.collectionPlus) {
    data.collectionPlus = [];
  }
  if (!data.skillLevels) {
    data.skillLevels = [];
  }
  if (data.streakProtectionCount === undefined) {
    data.streakProtectionCount = 0;
  }
  // (Challenge 機能削除)
  if (data.lastSkillPurchaseTime === undefined) {
    data.lastSkillPurchaseTime = undefined;
  }
  
  // バージョン番号を最新に更新
  if (!data.apologyCompensationClaimedVersion && !data.apologyCompensationAvailable) {
    data.apologyCompensationAvailable = true;
  }

  data.version = CURRENT_VERSION;
  
  return data;
}
