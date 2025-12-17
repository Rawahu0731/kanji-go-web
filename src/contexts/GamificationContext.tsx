import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { BADGES } from '../data/badges';
import type { Badge } from '../data/badges';
import type { KanjiCard, CardRarity } from '../data/cardCollection';
import { CARD_PACK_CONFIG } from '../data/cardCollection';
import { getRandomKanji, ALL_KANJI } from '../data/allKanji';
import shuffleArray from '../lib/shuffle';
import type { Character, OwnedCharacter } from '../data/characters';
import { CHARACTERS, pullGacha, getCharacterEffectValue, getXpForCharacterLevel, MAX_CHARACTER_LEVEL, MAX_CHARACTER_COUNT } from '../data/characters';
import { getKanjiAttributes } from '../data/kanjiAttributes';
import { SKILLS } from '../data/skillTree';
import { saveUserData, loadUserData, isFirebaseEnabled, getStorageDownloadUrl } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { computeNewBadges } from '../utils/badgeUtils';
import * as BN from '../utils/bigNumber';
import { toNumber } from '../utils/bigNumber';

// 分離したモジュールからインポート
import type { GamificationState, GamificationContextType } from './gamification/types';
import { 
  STORAGE_KEY, 
  CURRENT_VERSION, 
  INITIAL_STATE, 
  isMedalSystemEnabled,
  getXpForLevel,
  getXpForLevelBN,
  mergeCardCollections,
  mergeCharacters,
  rarityRank
} from './gamification/utils';
import { migrateData } from './gamification/migrations';
import { showBadgeNotification, showLevelUpNotification, showCharacterLevelUpNotification } from './gamification/notifications';

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

// ヘルパー関数とマイグレーション関数は別ファイルに分離済み

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState>(INITIAL_STATE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [medalSystemEnabled, setMedalSystemEnabled] = useState(isMedalSystemEnabled());
  const auth = useAuth();
  const prevAuthRef = useRef<typeof auth.user | null>(auth.user || null);
  const saveTimerRef = useRef<number | null>(null);
  const localLoadedRef = useRef(false);

  // requestIdleCallback の安全なラッパー
  const idleCallback = (fn: () => void, options?: any) => {
    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(fn, options);
    } else {
      window.setTimeout(fn, options && options.timeout ? options.timeout : 0);
    }
  };

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
    localLoadedRef.current = true;
    // Firebase が有効かつユーザーがログインしている場合はリモート読み込みを待つ
    if (!isFirebaseEnabled || !auth.user) {
      setInitializing(false);
    }
  }, []);

  // ログイン時にFirebaseからデータを読み込み
  useEffect(() => {
    if (auth.user && isFirebaseEnabled) {
      const comingFromLoggedOut = !prevAuthRef.current && !!auth.user;
      // 読み込み中フラグを立ててからリモート読み込み
      setInitializing(true);
      loadFromFirebase(auth.user.uid, comingFromLoggedOut).finally(() => {
        setInitializing(false);
      });
    }
    prevAuthRef.current = auth.user || null
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

  // 状態変更時は localStorage にのみ保存する（デバウンス処理で最適化）
  useEffect(() => {
    // 既存のタイマーをクリア
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    
    // 100ms後に保存（連続した状態更新を1回にまとめる）
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const toSave = { ...state, updatedAt: Date.now() } as any;
        // JSON.stringify は大きなオブジェクトでメインスレッドをブロックする可能性があるため
        // 可能であればアイドルタイムに保存を行う（UIレスポンスを優先）
        const doSave = () => {
          try {
            console.time('gamification:serialize');
            const serialized = JSON.stringify(toSave);
            console.timeEnd('gamification:serialize');
            localStorage.setItem(STORAGE_KEY, serialized);
          } catch (err) {
            console.warn('Failed to persist gamification state to localStorage:', err);
          }
        };

        if (typeof (window as any).requestIdleCallback === 'function') {
          (window as any).requestIdleCallback(() => doSave(), { timeout: 1000 });
        } else {
          // フォールバック：短い遅延で実行してUI優先
          window.setTimeout(() => doSave(), 200);
        }
      } catch (e) {
        console.warn('Failed to schedule gamification state persist:', e);
      }
      saveTimerRef.current = null;
    }, 100);
    
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
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
        totalXp: Math.max(
          (typeof state.totalXp === 'number' ? state.totalXp : toNumber(state.totalXp)) || 0,
          (typeof migratedRemote.totalXp === 'number' ? migratedRemote.totalXp : toNumber(migratedRemote.totalXp)) || 0
        ),
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

      // merged の totalXp に基づき level/xp の整合性を保証する
      try {
        const mergedTotalXpBN = BN.ensureBigNumber(merged.totalXp);
        const mergedTotalXpNum = BN.toNumber(mergedTotalXpBN);
        if (isFinite(mergedTotalXpNum)) {
          let recalculatedLevel = 1;
          let accumulated = 0;
          while (true) {
            const nextXp = getXpForLevel(recalculatedLevel + 1);
            if (accumulated + nextXp > mergedTotalXpNum) break;
            accumulated += nextXp;
            recalculatedLevel++;
          }
          merged.level = recalculatedLevel;
          merged.xp = BN.fromNumber ? BN.fromNumber(mergedTotalXpNum) : BN.fromNumber(mergedTotalXpNum);
          merged.totalXp = BN.fromNumber ? BN.fromNumber(mergedTotalXpNum) : BN.fromNumber(mergedTotalXpNum);
        }
      } catch (e) {
        console.warn('Failed to normalize merged level/XP from totalXp:', e);
      }

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
  const loadFromFirebase = async (userId: string, preferRemote: boolean = false) => {
    if (!isFirebaseEnabled) return;
    
    try {
      const data = await loadUserData(userId);

      // ローカルに保存されているデータ（updatedAt を含む可能性あり）を取得
      const localRaw = localStorage.getItem(STORAGE_KEY);
      let localParsed: any = null;
      if (localRaw) {
        try { localParsed = JSON.parse(localRaw); } catch (e) { localParsed = null; }
      }

      const migratedRemote = data ? migrateData(data) : null;
      const migratedLocal = localParsed ? migrateData(localParsed) : null;

      const remoteTs = migratedRemote ? ((migratedRemote as any).updatedAt || 0) : 0;
      const localTs = migratedLocal ? ((migratedLocal as any).updatedAt || 0) : 0;

      // 最新の方を採用する（ただし未ログイン→ログインの場合は preferRemote フラグでリモートを優先）
      let chosen: any = null;

      if (preferRemote && migratedRemote) {
        chosen = migratedRemote;
      } else if (migratedRemote && remoteTs > localTs) {
        chosen = migratedRemote;
      } else if (migratedLocal && localTs >= remoteTs) {
        chosen = migratedLocal;
      } else if (migratedRemote) {
        chosen = migratedRemote;
      }

      if (chosen) {
        // If customIconUrl references Cloud Storage (gs://...), resolve to a downloadable URL
        try {
          if (chosen.customIconUrl && typeof chosen.customIconUrl === 'string' && chosen.customIconUrl.startsWith('gs://')) {
            const resolved = await getStorageDownloadUrl(chosen.customIconUrl);
            chosen.customIconUrl = resolved;
          }
        } catch (e) {
          console.warn('Failed to resolve customIconUrl to download URL:', e);
        }

        // 初回ログイン時のみの配布フラグはクリアするが、実際のコイン/メダル付与は行わない
        if (chosen.apologyCompensationAvailable && chosen.apologyCompensationClaimedVersion !== CURRENT_VERSION) {
          try {
            // 配布を無効化：付与せずに既受領扱いにする
            chosen.apologyCompensationClaimedVersion = CURRENT_VERSION;
            chosen.apologyCompensationAvailable = false;
          } catch (e) {
            console.error('Failed to clear maintenance compensation flags during loadFromFirebase:', e);
          }
        }

        // 状態を反映してローカルに保存（ローカルが新しい場合でもサーバへ自動送信は行わない）
        setState(chosen);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chosen)); } catch (e) { /* ignore */ }

        if (migratedLocal && localTs >= remoteTs) {
          console.log('Local data is newer; keeping local state and not pushing to Firebase');
        } else {
          console.log('Data loaded from Firebase (remote chosen)');
        }
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
      // (Challenge 機能削除)
      
      // BigNumberとして処理（倍率適用もBigNumberで）
      const prevXpBN = BN.ensureBigNumber(prev.xp);
      const prevTotalXpBN = BN.ensureBigNumber(prev.totalXp);
      const amountBN = BN.fromNumber(amount);
      const boostedBN = BN.multiply(amountBN, multiplier);
      const boostedAmount = BN.toNumber(boostedBN);
      
      // 累計XP(totalXp)は常に加算する
      const newTotalXp = BN.add(prevTotalXpBN, boostedBN);
      // 現在のXP(xp)も加算するが、レベルアップ時に消費しない（差し引かない）
      const newXp = BN.add(prevXpBN, boostedBN);
      
      // 現在レベル内の進捗を計算（BigNumberで）
      let accumulatedXpBN = BN.fromNumber(0);
      for (let i = 2; i <= prev.level; i++) {
        accumulatedXpBN = BN.add(accumulatedXpBN, getXpForLevelBN(i));
      }
      const currentProgressBN = BN.subtract(prevTotalXpBN, accumulatedXpBN);
      
      // 現在の進捗 + 獲得XP でレベルアップ判定（BigNumberで）
      let newLevel = prev.level;
      let progressXpBN = BN.add(currentProgressBN, boostedBN);

      // progressXpBN を消費して複数レベルアップ判定を行う
      while (true) {
        const nextLevelXpBN = getXpForLevelBN(newLevel + 1);
        if (BN.compare(progressXpBN, nextLevelXpBN) < 0) {
          break;
        }
        progressXpBN = BN.subtract(progressXpBN, nextLevelXpBN);
        newLevel++;
      }

      // レベルアップバッジの自動付与
      const newBadges = [...prev.unlockedBadges];
      const badgesToNotify: Badge[] = [];
      
      if (newLevel >= 5 && !newBadges.includes('level_5')) {
        newBadges.push('level_5');
        badgesToNotify.push(BADGES.level_5);
      }
      if (newLevel >= 10 && !newBadges.includes('level_10')) {
        newBadges.push('level_10');
        badgesToNotify.push(BADGES.level_10);
      }
      if (newLevel >= 20 && !newBadges.includes('level_20')) {
        newBadges.push('level_20');
        badgesToNotify.push(BADGES.level_20);
      }
      if (newLevel >= 50 && !newBadges.includes('level_50')) {
        newBadges.push('level_50');
        badgesToNotify.push(BADGES.level_50);
      }
      if (newLevel >= 100 && !newBadges.includes('level_100')) {
        newBadges.push('level_100');
        badgesToNotify.push(BADGES.level_100);
      }
      if (newLevel >= 500 && !newBadges.includes('level_500')) {
        newBadges.push('level_500');
        badgesToNotify.push(BADGES.level_500);
      }
      if (newLevel >= 1000 && !newBadges.includes('level_1000')) {
        newBadges.push('level_1000');
        badgesToNotify.push(BADGES.level_1000);
      }
      if (newLevel >= 10000 && !newBadges.includes('level_10000')) {
        newBadges.push('level_10000');
        badgesToNotify.push(BADGES.level_10000);
      }

      if (newBadges.length >= 10 && !newBadges.includes('collector')) {
        newBadges.push('collector');
        badgesToNotify.push(BADGES.collector);
      }
      if (newBadges.length >= 20 && !newBadges.includes('super_collector')) {
        newBadges.push('super_collector');
        badgesToNotify.push(BADGES.super_collector);
      }

      // 通知を非同期化
      if (badgesToNotify.length > 0 || newLevel > prev.level) {
        idleCallback(() => {
          badgesToNotify.forEach(badge => showBadgeNotification(badge));
          if (newLevel > prev.level) showLevelUpNotification(newLevel);
        });
      }

      // デバッグログ: 現在の進捗・獲得XP・進捗後・次レベル必要XP・レベルアップ有無を出力
      try {
        const nextReq = getXpForLevel(newLevel + 1);
        console.log('[Gamification] addXp -> prevLevel:', prev.level, 'currentProgress:', BN.toString(currentProgressBN), 'gained:', boostedAmount, 'progressAfter:', BN.toString(progressXpBN), 'nextReq:', nextReq, 'newLevel:', newLevel, 'levelUp:', newLevel > prev.level);
      } catch (e) {
        console.log('[Gamification] addXp -> logging failed', e);
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
      // (Challenge 機能削除)
      
      // BigNumberで倍率計算（大きな数値でも正確に計算）
      const amountBN = BN.fromNumber(amount);
      const boostedBN = BN.multiply(amountBN, multiplier);
      const boostedAmount = Math.floor(BN.toNumber(boostedBN));
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
      // BigNumberに変換
      const amountBN = BN.fromNumber(amount);
      
      let newLevel = 1;
      let accumulatedXp = 0;
      
      // totalXpからレベルを逆算
      while (true) {
        const nextLevelXp = getXpForLevel(newLevel + 1);
        if (accumulatedXp + nextLevelXp > amount) {
          break;
        }
        accumulatedXp += nextLevelXp;
        newLevel++;
      }

      // デバッグログ
      try {
        const nextThreshold = accumulatedXp + getXpForLevel(newLevel + 1);
        console.log('[Gamification] setXp -> amount:', amount, 'level:', newLevel, 'nextThreshold:', nextThreshold);
      } catch (e) {
        console.log('[Gamification] setXp -> logging failed', e);
      }

      return { ...prev, xp: amountBN, level: newLevel, totalXp: amountBN };
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
    // コレクションコンプリートでない場合はメダル付与を無効化
    const isCollectionCompleteLocal = (new Set(state.cardCollection.map(c => c.kanji)).size) >= ALL_KANJI.length;
    if (!isCollectionCompleteLocal) return;
    // Apply optional multiplier from Revolution's Infinity Upgrade node (node14)
    let finalAmount = amount
    try {
      const raw = localStorage.getItem('revolution_state_v1')
      if (raw) {
        const rev = JSON.parse(raw)
        const ipUp = rev?.ipUpgrades || {}
        const hasNode14 = (ipUp.node14 || 0) >= 1
        if (hasNode14) {
          const n = Number(rev.infinityPoints || 0)
          if (isFinite(n) && n >= 0) {
            const mul = Math.floor(Math.sqrt(n))
            if (mul >= 1) {
              finalAmount = Math.floor(amount * mul)
            }
          }
        }
      }
    } catch (e) {
      // ignore parse errors and fall back to base amount
    }
    if (finalAmount <= 0) return
    setState(prev => ({ ...prev, medals: prev.medals + finalAmount }));
  };

  const setMedals = (amount: number) => {
    setState(prev => ({ ...prev, medals: amount }));
  };

  // チケットを付与する（配布用）。ticketId は shopItems の id と合わせる。
  const addTickets = (ticketId: string, count: number = 1) => {
    if (count <= 0) return;
    setState(prev => {
      const newTickets = { ...(prev.tickets || {}) };
      // collection+ tickets are removed: ignore these specific ticket ids
      if (ticketId.startsWith('ticket_collection_plus')) {
        return prev;
      }
      newTickets[ticketId] = (newTickets[ticketId] || 0) + count;
      return { ...prev, tickets: newTickets };
    });
  };

  // チケットを使用してガチャを引く。成功すると対応するガチャ処理を実行してカードを返す。
  const useTicket = (ticketId: string, count: number = 1): KanjiCard[] | null => {
    if (count <= 0) return null;
    let available = 0;
    try {
      available = (state.tickets && state.tickets[ticketId]) || 0;
    } catch (e) {
      available = 0;
    }
    if (available < count) return null;

    // チケットを消費
    setState(prev => {
      const newTickets = { ...(prev.tickets || {}) };
      newTickets[ticketId] = Math.max(0, (newTickets[ticketId] || 0) - count);
      return { ...prev, tickets: newTickets };
    });

    // collection+ チケットは削除されたため、消費しても何も返さない
    if (ticketId.startsWith('ticket_collection_plus')) {
      return null;
    }

    return null;
  };

  // メンテナンス補償を現在のユーザーに付与する（管理画面やスクリプトから呼ぶ想定）
  const grantMaintenanceCompensation = () => {
    // 要求: コイン30000, メダル50, ごめんなさいバッジ, コレクション+チケット×3
    addCoins(30000);
    addMedals(50);
    unlockBadge('apology_maintenance');
    // 追加で同期する場合は syncWithFirebase を呼ぶ実装側で行ってください
    // 追加で同期する場合は syncWithFirebase を呼ぶ実装側で行ってください
  };

  // デバッグ情報を保存/クリアする（UIのDebugPanelから参照される）
  const setDebugInfo = (info: Record<string, any> | null) => {
    setState(prev => ({ ...prev, debugLastReward: info ?? undefined }));
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

  // メダルで購入（メダル通貨用）
  const purchaseWithMedals = (itemId: string, price: number, addToPurchased: boolean = true): boolean => {
    if (!medalSystemEnabled) return false;
    if (state.medals < price) return false;

    setState(prev => ({
      ...prev,
      medals: prev.medals - price,
      purchasedItems: addToPurchased ? [...prev.purchasedItems, itemId] : prev.purchasedItems
    }));

    return true;
  };

  const updateStats = (updates: Partial<GamificationState['stats']>) => {
    setState(prev => {
      const newStats = { ...prev.stats, ...updates };
      
      // バッジ計算の条件: 重要な閾値に達した時のみ実行
      const shouldCheckBadges = (
        // 初回クイズ達成
        (prev.stats.totalQuizzes === 0 && newStats.totalQuizzes === 1) ||
        // クイズ数が閾値に到達（10, 50, 100, 500, 1000）
        ([10, 50, 100, 500, 1000].includes(newStats.totalQuizzes)) ||
        // 連勝が閾値に到達（5, 10, 50, 100）
        ([5, 10, 50, 100].includes(newStats.currentStreak))
      );

      if (!shouldCheckBadges) {
        return { ...prev, stats: newStats };
      }

      const candidate = { ...prev, stats: newStats };
      const badgesToAdd = computeNewBadges(prev, candidate);
      const newBadges = [...prev.unlockedBadges];
      const badgesToNotify: Badge[] = [];
      
      for (const b of badgesToAdd) {
        if (!newBadges.includes(b)) {
          newBadges.push(b);
          if (BADGES[b]) badgesToNotify.push(BADGES[b]);
        }
      }
      
      // 通知を非同期化
      if (badgesToNotify.length > 0) {
        idleCallback(() => {
          badgesToNotify.forEach(badge => showBadgeNotification(badge));
        }, { timeout: 2000 });
      }

      return { ...prev, stats: newStats, unlockedBadges: newBadges };
    });
  };

  // クイズ報酬をまとめて付与（パフォーマンス最適化 - useCallbackでメモ化）
  // 実際に追加された報酬量を返す
  const addQuizRewards = useCallback((xp: number, coins: number, medals: number, characterXp: number, statsUpdate: Partial<GamificationState['stats']>) => {
    // 実際に追加された報酬量を格納する変数
    let actualXp = 0;
    let actualCoins = 0;
    let actualMedals = 0;
    
    setState(prev => {
      console.time('gamification:addQuizRewards');
      // 全ての更新を1つのsetStateでまとめて処理
      
      // コレクションボーナスを1回だけ計算（最適化）
      const collectionBonus = calculateCollectionBonus(prev.cardCollection);
      
      // XP計算 - スキルブースト、キャラクターブースト、コレクションボーナスを適用
      // 注意: QuizModeで既にスキルブースト(xp_boost, xp_multiplier)は適用済みのため、
      // ここではキャラクターとコレクションのブーストのみを追加で適用
      let xpMultiplier = 1;
      if (prev.equippedCharacter) {
        const char = prev.equippedCharacter;
        if (char.effect.type === 'xp_boost' || char.effect.type === 'both_boost') {
          xpMultiplier = getCharacterEffectValue(char);
        }
      }
      xpMultiplier *= (1 + collectionBonus);
      // BigNumberで倍率計算（大きな数値でも正確に計算）
      const xpBN = BN.fromNumber(xp);
      const boostedXpBN = BN.multiply(xpBN, xpMultiplier);
      const boostedXp = Math.floor(BN.toNumber(boostedXpBN));
      
      // コイン計算
      let coinMultiplier = 1;
      if (prev.equippedCharacter) {
        const char = prev.equippedCharacter;
        if (char.effect.type === 'coin_boost' || char.effect.type === 'both_boost') {
          coinMultiplier = getCharacterEffectValue(char);
        }
      }
      coinMultiplier *= (1 + collectionBonus);
      // BigNumberで倍率計算（大きな数値でも正確に計算）
      const coinsBN = BN.fromNumber(coins);
      const boostedCoinsBN = BN.multiply(coinsBN, coinMultiplier);
      const boostedCoins = Math.floor(BN.toNumber(boostedCoinsBN));
      
      // BigNumberとして処理
      const prevXpBN = BN.ensureBigNumber(prev.xp);
      const prevTotalXpBN = BN.ensureBigNumber(prev.totalXp);
      // boostedXpBNは既に上で宣言済み（line 764）
      
      // 累計XP更新とレベル計算
      const newTotalXp = BN.add(prevTotalXpBN, boostedXpBN);
      const newXp = BN.add(prevXpBN, boostedXpBN);
      
      // 現在レベル内の進捗を計算（BigNumberで）
      let accumulatedXpBN = BN.fromNumber(0);
      for (let i = 2; i <= prev.level; i++) {
        accumulatedXpBN = BN.add(accumulatedXpBN, getXpForLevelBN(i));
      }
      const currentProgressBN = BN.subtract(prevTotalXpBN, accumulatedXpBN);
      
      // 現在の進捗 + 獲得XP でレベルアップ判定（BigNumberで）
      let newLevel = prev.level;
      let progressXpBN = BN.add(currentProgressBN, boostedXpBN);
      
      console.log('[DEBUG] Level-up check START - level:', newLevel, 'progressXp:', BN.toString(progressXpBN));

      // progressXpBN を消費して複数レベルアップ判定を行う
      while (true) {
        const nextLevelXpBN = getXpForLevelBN(newLevel + 1);
        const compareResult = BN.compare(progressXpBN, nextLevelXpBN);
        console.log('[DEBUG] Checking level', newLevel, '-> next:', BN.toString(nextLevelXpBN), 'progress:', BN.toString(progressXpBN), 'compare:', compareResult);
        if (compareResult < 0) {
          break;
        }
        progressXpBN = BN.subtract(progressXpBN, nextLevelXpBN);
        newLevel++;
        console.log('[DEBUG] LEVEL UP to', newLevel, 'remaining:', BN.toString(progressXpBN));
      }
      
      console.log('[DEBUG] Level-up check END - finalLevel:', newLevel);
      
      // メダル更新 - node14の倍率を適用
      let finalMedals = medals;
      if (medals > 0) {
        try {
          const raw = localStorage.getItem('revolution_state_v1');
          if (raw) {
            const rev = JSON.parse(raw);
            const ipUp = rev?.ipUpgrades || {};
            const hasNode14 = (ipUp.node14 || 0) >= 1;
            if (hasNode14) {
              const n = Number(rev.infinityPoints || 0);
              if (isFinite(n) && n >= 0) {
                const mul = Math.floor(Math.sqrt(n));
                if (mul >= 1) {
                  finalMedals = Math.floor(medals * mul);
                }
              }
            }
          }
        } catch (e) {
          // ignore parse errors and fall back to base amount
        }
      }
      
      // 実際に追加される報酬量を記録
      actualXp = boostedXp;
      actualCoins = boostedCoins;
      actualMedals = finalMedals;
      
      // コイン・メダル更新
      const newCoins = prev.coins + boostedCoins;
      const newMedals = prev.medals + finalMedals;
      
      // キャラクターXP更新（最適化：必要な場合のみディープコピー）
      let updatedEquippedCharacter = prev.equippedCharacter;
      let updatedCharacters = prev.characters;
      
      if (prev.equippedCharacter && characterXp > 0) {
        const char = { ...prev.equippedCharacter };
        char.xp += characterXp;
        
        // レベルアップチェック
        while (char.level < MAX_CHARACTER_LEVEL) {
          const xpNeeded = getXpForCharacterLevel(char.level + 1);
          if (char.xp >= xpNeeded) {
            char.level++;
            char.xp -= xpNeeded;
          } else {
            break;
          }
        }
        updatedEquippedCharacter = char;
        
        // キャラクターリストも更新
        updatedCharacters = prev.characters.map(c => 
          c.id === char.id ? char : c
        );
      }
      
      // stats更新
      const newStats = { ...prev.stats, ...statsUpdate };
      
      // 非同期でレベルアップ通知（レベルアップした場合のみ）
      if (newLevel > prev.level) {
        setTimeout(() => showLevelUpNotification(newLevel), 0);
      }
      
      // デバッグログ: 現在の進捗・獲得XP・進捗後・次レベル必要XP・レベルアップ有無を出力
      try {
        const nextReq = getXpForLevelBN(prev.level + 1);
        console.log('[Gamification] addQuizRewards -> prevLevel:', prev.level, 'currentProgress:', BN.toString(currentProgressBN), 'gained:', BN.toString(boostedXpBN), 'progressAfter:', BN.toString(progressXpBN), 'nextReq:', BN.toString(nextReq), 'newLevel:', newLevel, 'levelUp:', newLevel > prev.level);
      } catch (e) {
        console.log('[Gamification] addQuizRewards -> logging failed', e);
      }

      const newState = {
        ...prev,
        xp: newXp,
        totalXp: newTotalXp,
        level: newLevel,
        coins: newCoins,
        medals: newMedals,
        equippedCharacter: updatedEquippedCharacter,
        characters: updatedCharacters,
        stats: newStats
      };
      console.timeEnd('gamification:addQuizRewards');
      return newState;
    });
    
    return { actualXp, actualCoins, actualMedals };
  }, []); // 依存配列を空にして、関数を一度だけ作成

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
    // Firebaseへの保存は state の変更を監視するデバウンス同期に任せる（過剰な書き込みを防ぐ）
    const updatedState = { ...state, username: cleaned };
    setState(updatedState);
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
    // レベル進捗は累計XPを基準に計算する（レベルアップで現在XPを消費しないため）
    const totalXpBN = BN.ensureBigNumber(state.totalXp);
    const totalXpNum = BN.toNumber(totalXpBN);
    const currentProgress = totalXpNum - currentLevelXp;
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

  // コレクション+ に+値を追加（カンストは30）
  const addToCollectionPlus = (kanji: string, amount: number = 1) => {
    setState(prev => {
      const list = prev.collectionPlus ? [...prev.collectionPlus] : [];
      const idx = list.findIndex(e => e.kanji === kanji);
      const now = Date.now();

      if (idx === -1) {
        list.push({ kanji, plus: Math.min(30, Math.max(1, amount)), obtainedAt: now });
      } else {
        const entry = { ...list[idx] };
        entry.plus = Math.min(30, (entry.plus || 0) + amount);
        list[idx] = entry;
      }

      return { ...prev, collectionPlus: list };
    });
  };

  // collection++ は削除

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

    // メダルで引くコレクション+ガチャ
    const pullCollectionPlusGacha = (count: number): KanjiCard[] => {
      // 除外リスト: 既に+30の漢字は出現しない
      const excluded = new Set<string>((state.collectionPlus || []).filter(e => (e.plus || 0) >= 30).map(e => e.kanji));

      // プール作成（常用漢字プールから除外）
      const pool = ALL_KANJI.filter(k => !excluded.has(k.kanji));
      if (pool.length === 0) return [];

      // シャッフルして先頭から選択
      const shuffled = shuffleArray(pool.slice());
      const picks = shuffled.slice(0, Math.min(count, shuffled.length));

      const cards: KanjiCard[] = picks.map((k, i) => ({
        id: `${Date.now()}-${Math.random()}-${i}`,
        kanji: k.kanji,
        reading: k.reading,
        meaning: k.meaning,
        level: k.level,
        rarity: 'common',
        imageUrl: `/kanji/level-${k.level}/images/${k.kanji}.png`
      }));

      // コレクション+ の値を増やす（同じ漢字が出たら+1ずつ加算）
      setState(prev => {
        const list = prev.collectionPlus ? [...prev.collectionPlus] : [];
        const map = new Map<string, { kanji: string; plus: number; obtainedAt?: number }>();
        for (const e of list) map.set(e.kanji, { ...e });

        for (const c of cards) {
          const existing = map.get(c.kanji);
          if (!existing) {
            map.set(c.kanji, { kanji: c.kanji, plus: 1, obtainedAt: Date.now() });
          } else {
            existing.plus = Math.min(30, (existing.plus || 0) + 1);
            map.set(c.kanji, existing);
          }
        }

        return { ...prev, collectionPlus: Array.from(map.values()) };
      });

      return cards;
    };

    // collection++ は削除

  // キャラクターを装備/解除
  const equipCharacter = (character: OwnedCharacter | null) => {
    setState(prev => ({ ...prev, equippedCharacter: character }));
  };

  // コレクションボーナスを計算（最適化：ループを高速化）
  const calculateCollectionBonus = (cards: KanjiCard[]): number => {
    if (cards.length === 0) return 0;
    
    // レアリティボーナスのマップ（switch文より高速）
    const rarityBonus: Record<string, number> = {
      'common': 0.01,
      'rare': 0.025,
      'epic': 0.05,
      'legendary': 0.1
    };
    
    // レアリティに応じたボーナスを計算（最適化：forループとマップアクセス）
    let bonus = 0;
    for (let i = 0; i < cards.length; i++) {
      bonus += rarityBonus[cards[i].rarity] || 0;
    }

    // collectionPlus によるボーナスを追加
    // 仕様: collectionPlus の +1 ごとに XP/コインを +100% (= +1.0) 増加させる（弱体化）
    const COLLECTION_PLUS_XP_PER_POINT = 1;
    const plusList = state.collectionPlus || [];
    for (let i = 0; i < plusList.length; i++) {
      bonus += (plusList[i].plus || 0) * COLLECTION_PLUS_XP_PER_POINT;
    }

    // collection++ は削除

    return bonus;
  };

  // コレクションボーナスを取得（外部公開用）
  const getCollectionBoost = (): number => {
    return calculateCollectionBonus(state.cardCollection);
  };

  // Collection+ の合算効果を取得
  const getCollectionPlusEffect = () => {
    const plusList = state.collectionPlus || [];
    const totalPlus = plusList.reduce((s, e) => s + (e.plus || 0), 0);
    // メダル確率は +1 ごとに +1% (0.01) を追加
    const COLLECTION_PLUS_MEDAL_PERCENT_PER_POINT = 1; // % per +1
    const medalBoost = (totalPlus * COLLECTION_PLUS_MEDAL_PERCENT_PER_POINT) / 100; // fraction
    const xpCoinBonusFraction = totalPlus * 1; // e.g. +1 -> 1.0 (weakened)
    return { totalPlus, xpCoinBonusFraction, medalBoost };
  };

  // collection++ は削除

  // コレクションがコンプリートしているか判定
  const isCollectionComplete = (): boolean => {
    try {
      const total = new Set(state.cardCollection.map(c => c.kanji)).size;
      return total >= ALL_KANJI.length;
    } catch (e) {
      return false;
    }
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

    // コレクション未完了ならスキルツリーのアップグレードは不可
    if (!((new Set(state.cardCollection.map(c => c.kanji)).size) >= ALL_KANJI.length)) {
      return false;
    }

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
  const getSkillBoost = (type: 'xp_boost' | 'coin_boost' | 'medal_boost' | 'streak_amp' | 'double_reward' | 'critical_hit' | 'lucky_coin' | 'xp_multiplier' | 'time_bonus'): number => {
    let totalBoost = 0;
    
    state.skillLevels.forEach(sl => {
      const skill = SKILLS.find(s => s.id === sl.skillId);
      if (skill) {
        // streak_amp はパーセンテージのまま扱う（例: 5 -> 5%）
        if ((skill.effect.type === type) || (type === 'streak_amp' && skill.effect.type === 'streak_amp')) {
          totalBoost += skill.effect.value * sl.level;
        }
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

  // (Challenge 機能削除)

  // Context value をメモ化してパフォーマンス最適化
  // 注意: 関数の再作成を防ぐため、必要なもののみを依存配列に追加
  const contextValue = useMemo(() => ({
    initializing,
    state,
    isMedalSystemEnabled: medalSystemEnabled,
    addXp,
    addCoins,
    addMedals,
    setXp,
    setCoins,
    setMedals,
    purchaseWithMedals,
    unlockBadge,
    purchaseItem,
    addToCollectionPlus,
    updateStats,
    addQuizRewards,
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
    // チケット関係: 所持数付与 / 使用
    addTickets,
    useTicket,
    // 管理者向け: メンテナンス補償を付与
    grantMaintenanceCompensation,
    pullCollectionPlusGacha,
    equipCharacter,
    getCharacterBoost,
    addCharacterXp,
    getCollectionBoost,
    getCollectionPlusEffect,
    addCardsToDeck,
    removeCardFromDeck,
    upgradeCardInDeck,
    getDeckBoost,
    upgradeSkill,
    isCollectionComplete,
    getSkillLevel,
    getSkillBoost,
    useStreakProtection,
    setDebugInfo,
    syncWithFirebase,
    loadFromFirebase
  }), [
    state, 
    medalSystemEnabled,
    addQuizRewards,
    // その他の関数は state に依存するため、state が変わると再作成される
  ]);

  return (
    <GamificationContext.Provider value={contextValue}>
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

// 通知関数は別ファイル (gamification/notifications.ts) に分離済み
