import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useGamification } from './GamificationContext';
import { isFirebaseEnabled } from '../lib/firebase';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import type { Present, PresentBoxState, PresentReward } from '../types/present';
import { getPresentDistributions } from '../lib/microcms';

interface PresentBoxContextType {
  presents: Present[];
  unclaimedCount: number;
  loading: boolean;
  claimPresent: (presentId: string) => Promise<void>;
  claimAllPresents: () => Promise<void>;
  addPresent: (present: Omit<Present, 'id' | 'claimed' | 'claimedAt'>) => Promise<void>;
  refreshPresents: () => Promise<void>;
  syncFromMicroCMS: () => Promise<void>;
}

const PresentBoxContext = createContext<PresentBoxContextType | undefined>(undefined);

const STORAGE_KEY = 'presentBox_state';
// (以前はゲームリセット検知で使用していたが、チュートリアルはmicroCMS管理に移行済み)
const MICROCMS_SYNC_KEY = 'microcms_last_sync';

// 初期状態
const INITIAL_STATE: PresentBoxState = {
  presents: [],
  lastChecked: Date.now()
};

export function PresentBoxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PresentBoxState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const gamification = useGamification();
  
  // 処理中のプレゼントIDを追跡（二重受け取り防止用）
  const claimingIdsRef = useRef<Set<string>>(new Set());

  // 重複するプレゼントを除去するユーティリティ
  const dedupePresents = (presents: Present[]) => {
    const map = new Map<string, Present>();
    for (const p of presents) {
      const existing = map.get(p.id);
      if (!existing) {
        map.set(p.id, p);
      } else {
        // 同じIDが複数ある場合は作成日時が新しい方を優先する
        if ((p.createdAt || 0) > (existing.createdAt || 0)) {
          map.set(p.id, p);
        }
      }
    }
    return Array.from(map.values());
  };

  // LocalStorageから読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PresentBoxState;
        parsed.presents = dedupePresents(parsed.presents || []);
        setState(parsed);
      }
    } catch (error) {
      console.error('Failed to load present box state from localStorage:', error);
    }
    setLoading(false);
  }, []);

  // ゲームデータ削除イベントを監視して in-memory state を即時クリア
  useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(MICROCMS_SYNC_KEY);
      } catch (e) {
        // ignore
      }
      setState({ ...INITIAL_STATE });
    };

    window.addEventListener('gameDataDeleted', handler);
    return () => window.removeEventListener('gameDataDeleted', handler);
  }, []);

  // LocalStorageに保存（loading完了後のみ）
  useEffect(() => {
    if (loading) return; // 初期読み込み中は保存しない
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('Present box state saved to localStorage:', state.presents.length, 'presents');
    } catch (error) {
      console.error('Failed to save present box state to localStorage:', error);
    }
  }, [state, loading]);

  // Firebaseからデータを読み込む
  const loadFromFirebase = useCallback(async (userId: string) => {
    if (!isFirebaseEnabled) return;

    try {
      const db = getFirestore();
      const docRef = doc(db, 'test', 'root', 'presentBox', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as PresentBoxState;
        data.presents = dedupePresents(data.presents || []);
        setState(data);
      }
    } catch (error: any) {
      // permissionエラーの場合は、Firestoreルールが未設定なので警告を抑制
      if (error?.code === 'permission-denied') {
        console.warn('プレゼントボックスのFirebase同期は無効です（Firestoreルール未設定）');
      } else {
        console.error('Failed to load present box from Firebase:', error);
      }
    }
  }, []);

  // Firebaseにデータを保存
  const saveToFirebase = useCallback(async (userId: string, data: PresentBoxState) => {
    if (!isFirebaseEnabled) return;

    try {
      const db = getFirestore();
      const docRef = doc(db, 'test', 'root', 'presentBox', userId);
      
      // undefinedフィールドを削除してFirestoreに保存（Firestoreはundefinedを許可しない）
      const cleanData = JSON.parse(JSON.stringify(data, (_k, v) => {
        return v === undefined ? null : v;
      }));
      
      await setDoc(docRef, cleanData);
    } catch (error: any) {
      // permissionエラーの場合は、Firestoreルールが未設定なので警告を抑制
      // LocalStorageには保存されているので機能に問題はない
      if (error?.code !== 'permission-denied') {
        console.error('Failed to save present box to Firebase:', error);
      }
    }
  }, []);

  // microCMSからプレゼント配布情報を同期
  const syncFromMicroCMS = useCallback(async () => {
    try {
      const distributions = await getPresentDistributions();
      if (distributions.length === 0) return;

      // 新しいプレゼントを作成
      const newPresents: Present[] = distributions.map(dist => {
        const rewards: PresentReward[] = dist.rewards.map(r => {
          const rewardType = Array.isArray(r.rewardType) ? r.rewardType[0] : r.rewardType;
          const reward: PresentReward = { type: rewardType };
          if (r.amount !== undefined) reward.amount = r.amount;
          if (r.ticketId !== undefined) reward.ticketId = r.ticketId;
          if (r.characterId !== undefined) reward.characterId = r.characterId;
          return reward;
        });

        const present: Present = {
          id: `microcms_${dist.id}`,
          title: dist.title,
          description: dist.description,
          rewards,
          createdAt: new Date(dist.startDate).getTime(),
          ...(dist.expiryDate ? { expiresAt: new Date(dist.expiryDate).getTime() } : {}),
          claimed: false
        };

        return present;
      });

      // 状態を安全に更新し、重複を避ける
      setState(prev => {
        const prevIds = new Set(prev.presents.map(p => p.id));
        const toAdd = newPresents.filter(np => !prevIds.has(np.id));
        if (toAdd.length === 0) return prev;
        const merged = [...toAdd, ...prev.presents];
        console.log(`microCMSから${toAdd.length}件の新しいプレゼントを同期しました`);
        return { ...prev, presents: merged };
      });

      // 最終同期時刻を保存
      localStorage.setItem(MICROCMS_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('microCMSからのプレゼント同期に失敗しました:', error);
    }
  }, []);

  // ユーザーログイン時にFirebaseから読み込み（microCMS同期はページ側で明示的に行う）
  useEffect(() => {
    if (auth.user && isFirebaseEnabled) {
      loadFromFirebase(auth.user.uid).catch(() => {
        // ignore
      });
    }
  }, [auth.user, loadFromFirebase]);

  // 状態が変更されたらFirebaseに保存
  useEffect(() => {
    if (auth.user && isFirebaseEnabled && !loading) {
      saveToFirebase(auth.user.uid, state);
    }
  }, [auth.user, state, loading, saveToFirebase]);

  // プレゼントを受け取る
  const claimPresent = useCallback(async (presentId: string) => {
    // 既に処理中の場合は何もしない（二重クリック防止）
    if (claimingIdsRef.current.has(presentId)) {
      console.log(`Present ${presentId} is already being claimed`);
      return;
    }

    // 処理開始を記録
    claimingIdsRef.current.add(presentId);

    try {
      // 現在の状態から対象のプレゼントを取得
      const present = state.presents.find(p => p.id === presentId);
      
      // プレゼントが存在しないか、既に受け取り済みなら何もしない
      if (!present || present.claimed) {
        console.log(`Present ${presentId} not found or already claimed`);
        return;
      }

      // 有効期限チェック
      if (present.expiresAt && present.expiresAt < Date.now()) {
        alert('このプレゼントは期限切れです');
        return;
      }

      // 報酬を付与（setState の外で実行）
      for (const reward of present.rewards) {
        switch (reward.type) {
          case 'coins':
            if (reward.amount) {
              gamification.addCoins(reward.amount);
            }
            break;
          case 'medals':
            if (reward.amount) {
              gamification.addMedals(reward.amount);
            }
            break;
          case 'xp':
            if (reward.amount) {
              gamification.addXp(reward.amount);
            }
            break;
          case 'tickets':
            if (reward.ticketId && reward.amount) {
              gamification.addTickets(reward.ticketId, reward.amount);
            }
            break;
          case 'character':
            // キャラクターの追加は今後実装
            console.log('Character reward not yet implemented');
            break;
          case 'card':
            // カードの追加は今後実装
            console.log('Card reward not yet implemented');
            break;
        }
      }

      // プレゼントを受け取り済みにする（報酬付与後に状態を更新）
      setState(prev => ({
        ...prev,
        presents: prev.presents.map(p =>
          p.id === presentId
            ? { ...p, claimed: true, claimedAt: Date.now() }
            : p
        )
      }));
    } finally {
      // 処理完了を記録（エラーが発生しても必ず実行）
      claimingIdsRef.current.delete(presentId);
    }
  }, [state.presents, gamification]);

  // すべてのプレゼントを受け取る
  const claimAllPresents = useCallback(async () => {
    const unclaimedPresents = state.presents.filter(p => !p.claimed);
    
    for (const present of unclaimedPresents) {
      // 有効期限チェック
      if (present.expiresAt && present.expiresAt < Date.now()) {
        continue;
      }

      // 報酬を付与
      for (const reward of present.rewards) {
        switch (reward.type) {
          case 'coins':
            if (reward.amount) {
              gamification.addCoins(reward.amount);
            }
            break;
          case 'medals':
            if (reward.amount) {
              gamification.addMedals(reward.amount);
            }
            break;
          case 'xp':
            if (reward.amount) {
              gamification.addXp(reward.amount);
            }
            break;
          case 'tickets':
            if (reward.ticketId && reward.amount) {
              gamification.addTickets(reward.ticketId, reward.amount);
            }
            break;
          case 'character':
            console.log('Character reward not yet implemented');
            break;
          case 'card':
            console.log('Card reward not yet implemented');
            break;
        }
      }
    }

    // すべてのプレゼントを受け取り済みにする
    setState(prev => ({
      ...prev,
      presents: prev.presents.map(p =>
        !p.claimed && (!p.expiresAt || p.expiresAt >= Date.now())
          ? { ...p, claimed: true, claimedAt: Date.now() }
          : p
      )
    }));
  }, [state.presents, gamification]);

  // プレゼントを追加
  const addPresent = useCallback(async (present: Omit<Present, 'id' | 'claimed' | 'claimedAt'>) => {
    const newPresent: Present = {
      ...present,
      id: `present_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      claimed: false
    };

    setState(prev => ({
      ...prev,
      presents: [...prev.presents, newPresent]
    }));
  }, []);

  // プレゼントボックスを更新（期限切れを削除など）
  const refreshPresents = useCallback(async () => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      presents: prev.presents.filter(p => {
        // 受け取り済みで30日以上経過したものは削除
        if (p.claimed && p.claimedAt && now - p.claimedAt > 30 * 24 * 60 * 60 * 1000) {
          return false;
        }
        // 未受け取りで期限切れのものは削除
        if (!p.claimed && p.expiresAt && p.expiresAt < now) {
          return false;
        }
        return true;
      }),
      lastChecked: now
    }));
  }, []);

  // 未受け取りのプレゼント数
  const unclaimedCount = state.presents.filter(p => !p.claimed).length;

  const value: PresentBoxContextType = {
    presents: state.presents,
    unclaimedCount,
    loading,
    claimPresent,
    claimAllPresents,
    addPresent,
    refreshPresents,
    syncFromMicroCMS
  };

  return (
    <PresentBoxContext.Provider value={value}>
      {children}
    </PresentBoxContext.Provider>
  );
}

export function usePresentBox() {
  const context = useContext(PresentBoxContext);
  if (!context) {
    throw new Error('usePresentBox must be used within PresentBoxProvider');
  }
  return context;
}
