import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useGamification } from './GamificationContext';
import { isFirebaseEnabled } from '../lib/firebase';
import { firebaseEnvironment } from '../config';
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

// localStorage は使用しない（状態は Firebase のみで管理）

// 初期状態
const INITIAL_STATE: PresentBoxState = {
  presents: [],
  lastChecked: Date.now()
};

export function PresentBoxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PresentBoxState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const remoteLoadedRef = useRef(false);
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

  // 初期はローカル読み込みを行わない。Firebase の読み込み完了を待つ。
  useEffect(() => {
    setLoading(false);
  }, []);

  // ゲームデータ削除イベントを監視して in-memory state を即時クリア
  useEffect(() => {
    const handler = () => {
      // in-memory state を即時クリア
      setState({ ...INITIAL_STATE });
    };

    window.addEventListener('gameDataDeleted', handler);
    return () => window.removeEventListener('gameDataDeleted', handler);
  }, []);

  // localStorage への保存は行わない

  // state.presents に招待状（受け取り済み/未受け取り問わず）が含まれている場合は
  // ゲーミフィケーション側のフラグを設定する（ロード時対応）
  useEffect(() => {
    try {
      const hasInvitation = state.presents.some(p => p.title === '文霊世界への招待状');
      const already = gamification?.state?.hasStoryInvitation;
      if (hasInvitation && !already) {
        gamification.setHasStoryInvitation(true);
      }
    } catch (e) {
      // ignore
    }
  }, [state.presents, gamification?.state?.hasStoryInvitation, gamification?.setHasStoryInvitation]);

  // Firebaseからデータを読み込む
  const loadFromFirebase = useCallback(async (userId: string) => {
    if (!isFirebaseEnabled) return;

    try {
      const db = getFirestore();
      const pathParts = firebaseEnvironment === 'test'
        ? ['test', 'root', 'presentBox', userId]
        : ['presentBox', userId];
      const docRef = doc(db as any, ...pathParts);
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
  const saveToFirebase = useCallback(async (userId: string, data: PresentBoxState): Promise<boolean> => {
    if (!isFirebaseEnabled) return false;

    try {
      const db = getFirestore();
      const pathParts = firebaseEnvironment === 'test'
        ? ['test', 'root', 'presentBox', userId]
        : ['presentBox', userId];
      const docRef = doc(db as any, ...pathParts);
      
      // undefinedフィールドを削除してFirestoreに保存（Firestoreはundefinedを許可しない）
      const cleanData = JSON.parse(JSON.stringify(data, (_k, v) => {
        return v === undefined ? null : v;
      }));
      
      await setDoc(docRef, cleanData);
      return true;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.warn('プレゼントボックスのFirebase保存は無効です（Firestoreルール未設定）');
      } else {
        console.error('Failed to save present box to Firebase:', error);
      }
      return false;
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

      // 最終同期時刻はローカルに保存しない
    } catch (error) {
      console.error('microCMSからのプレゼント同期に失敗しました:', error);
    }
  }, []);

  // ユーザーログイン時にFirebaseから読み込み（microCMS同期はページ側で明示的に行う）
  useEffect(() => {
    if (auth.user && isFirebaseEnabled) {
      // 読み込み中は保存を抑止する
      setLoading(true);
      remoteLoadedRef.current = false;
      loadFromFirebase(auth.user.uid).finally(() => {
        remoteLoadedRef.current = true;
        setLoading(false);
      });
    }
  }, [auth.user, loadFromFirebase]);

  // 状態が変更されたらFirebaseに保存（リモート読み込みが終わっている場合のみ）
  useEffect(() => {
    if (auth.user && isFirebaseEnabled && !loading && remoteLoadedRef.current) {
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

      // まず、Firebase に受け取り状態を保存して成功を確認する
      const newState: PresentBoxState = {
        ...state,
        presents: state.presents.map(p =>
          p.id === presentId ? { ...p, claimed: true, claimedAt: Date.now() } : p
        )
      };

      if (auth.user && isFirebaseEnabled) {
        const ok = await saveToFirebase(auth.user.uid, newState);
        if (!ok) {
          alert('プレゼントの受け取りを保存できませんでした。通信環境を確認してください。');
          return;
        }
      }

      // 保存が確認できたら報酬を付与
      for (const reward of present.rewards) {
        switch (reward.type) {
          case 'coins':
            if (reward.amount) gamification.addCoins(reward.amount);
            break;
          case 'medals':
            if (reward.amount) gamification.addMedals(reward.amount);
            break;
          case 'xp':
            if (reward.amount) gamification.addXp(reward.amount);
            break;
          case 'tickets':
            if (reward.ticketId && reward.amount) gamification.addTickets(reward.ticketId, reward.amount);
            break;
          case 'character':
            if (reward.characterId) gamification.addCharacter(reward.characterId);
            break;
          case 'card':
            console.log('Card reward not yet implemented');
            break;
        }
      }

      // 文霊世界への招待状を受け取った場合、フラグを立てる
      if (present.title === '文霊世界への招待状') {
        gamification.setHasStoryInvitation(true);
      }

      // in-memory state を更新
      setState(newState);
    } finally {
      // 処理完了を記録（エラーが発生しても必ず実行）
      claimingIdsRef.current.delete(presentId);
    }
  }, [state, gamification, auth.user, saveToFirebase]);

  // すべてのプレゼントを受け取る
  const claimAllPresents = useCallback(async () => {
    const unclaimedPresents = state.presents.filter(p => !p.claimed && (!p.expiresAt || p.expiresAt >= Date.now()));

    if (unclaimedPresents.length === 0) return;

    const now = Date.now();
    const newState: PresentBoxState = {
      ...state,
      presents: state.presents.map(p =>
        !p.claimed && (!p.expiresAt || p.expiresAt >= now) ? { ...p, claimed: true, claimedAt: now } : p
      )
    };

    if (auth.user && isFirebaseEnabled) {
      const ok = await saveToFirebase(auth.user.uid, newState);
      if (!ok) {
        alert('プレゼントの受け取りを保存できませんでした。通信環境を確認してください。');
        return;
      }
    }

    // 保存が確認できたら報酬を付与
    for (const present of unclaimedPresents) {
      for (const reward of present.rewards) {
        switch (reward.type) {
          case 'coins':
            if (reward.amount) gamification.addCoins(reward.amount);
            break;
          case 'medals':
            if (reward.amount) gamification.addMedals(reward.amount);
            break;
          case 'xp':
            if (reward.amount) gamification.addXp(reward.amount);
            break;
          case 'tickets':
            if (reward.ticketId && reward.amount) gamification.addTickets(reward.ticketId, reward.amount);
            break;
          case 'character':
            if (reward.characterId) gamification.addCharacter(reward.characterId);
            break;
          case 'card':
            console.log('Card reward not yet implemented');
            break;
        }
      }
    }

    // 文霊世界への招待状が含まれている場合はフラグを立てる
    if (unclaimedPresents.some(p => p.title === '文霊世界への招待状')) {
      gamification.setHasStoryInvitation(true);
    }

    // in-memory state を更新
    setState(newState);
  }, [state, gamification, auth.user, saveToFirebase]);

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
