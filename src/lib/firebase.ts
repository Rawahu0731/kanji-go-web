import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { deleteDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { GamificationState } from '../contexts/gamification/types';
import { toNumber } from '../utils/bigNumber';
import { firebaseEnvironment } from '../config';

// Firebase設定（環境変数から読み込み）
// 実際に使う際は .env ファイルに以下を追加してください:
// VITE_FIREBASE_API_KEY=your-api-key
// VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
// VITE_FIREBASE_PROJECT_ID=your-project-id
// VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
// VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
// VITE_FIREBASE_APP_ID=your-app-id

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Firebase初期化
let app: any;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isFirebaseEnabled = false;

try {
  // 設定が全て存在する場合のみFirebaseを初期化
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseEnabled = true;
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase configuration not found. Running in offline mode.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const googleProvider = new GoogleAuthProvider();

// Firestore の保存先を `test/root` に切り替えるかどうかを `src/config.ts` の
// `firebaseEnvironment` で制御するヘルパー
// 例) doc(db, withTestRoot('users', userId).join('/')) =>
//   - test 時: 'test/root/users/{userId}'
//   - prod 時: 'users/{userId}'
const withTestRoot = (...segments: string[]) => {
  if (firebaseEnvironment === 'test') {
    return ['test', 'root', ...segments];
  }
  return segments;
};

// 認証関連
export const signInWithGoogle = async () => {
  if (!auth) throw new Error('Firebase not initialized');

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    // ポップアップがブロックされるなどで失敗することがあるため、リダイレクト方式をフォールバックで試す
    console.warn('signInWithPopup failed, attempting signInWithRedirect fallback:', err);
    try {
      await signInWithRedirect(auth, googleProvider);
      return;
    } catch (err2: any) {
      console.error('signInWithRedirect also failed:', err2);
      throw err2;
    }
  }
};

export const signOut = async () => {
  if (!auth) throw new Error('Firebase not initialized');
  return firebaseSignOut(auth);
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

// メールアドレス/パスワードでのサインアップ
export const signUpWithEmail = async (email: string, password: string, username: string) => {
  if (!auth) throw new Error('Firebase not initialized');
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // ユーザー名を設定
  if (userCredential.user) {
    await updateProfile(userCredential.user, {
      displayName: username
    });
  }
  
  return userCredential;
};

// ログイン中ユーザーの表示名を更新するヘルパー
export const updateDisplayName = async (user: User, displayName: string) => {
  if (!auth) throw new Error('Firebase not initialized');
  try {
    await updateProfile(user, { displayName });
  } catch (err) {
    console.error('Failed to update auth displayName:', err);
    throw err;
  }
};

// メールアドレス/パスワードでのサインイン
export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase not initialized');
  return signInWithEmailAndPassword(auth, email, password);
};

// Firestore関連
export interface RankingEntry {
  userId: string;
  username: string;
  level: number;
  totalXp: number;
  coins: number;
  medals: number;
  // エンドレスモード専用の最高連続正解数
  endlessMaxStreak?: number;
  iconUrl?: string;
  updatedAt: number;
}

// ユーザーデータの保存
export const saveUserData = async (userId: string, data: GamificationState) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = doc(db, withTestRoot('users', userId).join('/'));
  // Firestore rejects `undefined` field values. sanitize object first.
  const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      const arr = obj
        .map(v => sanitizeForFirestore(v))
        .filter(v => v !== undefined);
      return arr;
    }
    if (typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        const sv = sanitizeForFirestore(v);
        if (sv !== undefined) out[k] = sv;
      }
      return out;
    }
    // primitive (string, number, boolean)
    return obj;
  };

  // 分離する大きな配列を切り出してサブドキュメントへ保存する
  const {
    cardCollection,
    characters,
    collectionPlus,
    skillLevels,
    // これらはユーザードキュメントに残す
    username,
    activeTheme,
    activeIcon,
    customIconUrl,
    level,
    xp,
    totalXp,
    coins,
    medals,
    unlockedBadges,
    purchasedItems,
    stats,
    streakProtectionCount,
    tickets,
    apologyCompensationAvailable,
    apologyCompensationClaimedVersion,
    lastInterestTime,
    lastSkillPurchaseTime,
    debugLastReward,
    version,
    ...rest
  } = data as any;

  const core = sanitizeForFirestore({
    username,
    activeTheme,
    activeIcon,
    customIconUrl,
    level,
    xp,
    totalXp,
    coins,
    medals,
    unlockedBadges,
    purchasedItems,
    stats,
    streakProtectionCount,
    tickets,
    apologyCompensationAvailable,
    apologyCompensationClaimedVersion,
    lastInterestTime,
    lastSkillPurchaseTime,
    debugLastReward,
    version,
    ...rest
  }) || {};

  await setDoc(userRef, { ...core, updatedAt: Date.now() }, { merge: true });

  // ヘルパー: サブドキュメントに配列/オブジェクトを保存（doc id = 'data'）
  const saveSubDoc = async (key: string, value: any) => {
    try {
      if (value === undefined) return;
      const subRef = doc(db!, withTestRoot('users', userId, key, 'data').join('/'));
      const sv = sanitizeForFirestore(value) || {};
      await setDoc(subRef, { value: sv, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn(`Failed to save subdoc ${key} for ${userId}:`, err);
    }
  };

  await Promise.all([
    saveSubDoc('cardCollection', cardCollection),
    saveSubDoc('characters', characters),
    saveSubDoc('collectionPlus', collectionPlus),
    saveSubDoc('skillLevels', skillLevels)
  ]);
  
  // ランキング用データも更新
  const rankingRef = doc(db, withTestRoot('rankings', userId).join('/'));
  
  // totalXpをBigNumberから数値に変換
  const totalXpNumber = typeof data.totalXp === 'number' 
    ? data.totalXp 
    : toNumber(data.totalXp);
  
  const rankingObj = {
    userId,
    username: data.username,
    level: data.level,
    totalXp: totalXpNumber,
    coins: data.coins,
    medals: data.medals,
    // 正しいフィールド名: `endlessMaxStreak`
    endlessMaxStreak: data?.stats?.endlessBestStreak ?? data?.stats?.endlessMaxStreak ?? 0,
    iconUrl: data.customIconUrl || data.activeIcon,
    updatedAt: Date.now()
  };
  const sanitizedRanking = sanitizeForFirestore(rankingObj) || {};
  await setDoc(rankingRef, sanitizedRanking, { merge: true });
};

// ユーザーデータの読み込み
export const loadUserData = async (userId: string): Promise<GamificationState | null> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = doc(db, withTestRoot('users', userId).join('/'));
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    // updatedAtは除外して返す
    const { updatedAt, ...userData } = data as any;

    // サブドキュメントから分離保存された配列を読み込むヘルパー
    const loadSubDoc = async (key: string) => {
      try {
        const subRef = doc(db!, withTestRoot('users', userId, key, 'data').join('/'));
        const snap = await getDoc(subRef);
        if (!snap.exists()) return undefined;
        const d = snap.data() as any;
        return d?.value;
      } catch (err) {
        console.warn(`Failed to read subdoc ${key} for ${userId}:`, err);
        return undefined;
      }
    };

    const [cardCollection, characters, collectionPlus, skillLevels] = await Promise.all([
      loadSubDoc('cardCollection'),
      loadSubDoc('characters'),
      loadSubDoc('collectionPlus'),
      loadSubDoc('skillLevels')
    ]);

    const merged: any = {
      ...userData,
      cardCollection: cardCollection || [],
      characters: characters || [],
      collectionPlus: collectionPlus || [],
      skillLevels: skillLevels || []
    };

    return merged as GamificationState;
  }
  
  return null;
};

// ランキングの取得
export const getRankings = async (limitCount: number = 100): Promise<RankingEntry[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const rankingsRef = collection(db, withTestRoot('rankings').join('/'));
  const q = query(rankingsRef, orderBy('totalXp', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  
  const rankings: RankingEntry[] = [];
  querySnapshot.forEach((doc) => {
    rankings.push(doc.data() as RankingEntry);
  });
  
  return rankings;
};

// 連続正解（エンドレス専用）でのランキング取得
export const getRankingsByMaxStreak = async (limitCount: number = 100): Promise<RankingEntry[]> => {
  if (!db) throw new Error('Firestore not initialized');

  const rankingsRef = collection(db, withTestRoot('rankings').join('/'));
  const q = query(rankingsRef, orderBy('endlessMaxStreak', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);

  const rankings: RankingEntry[] = [];
  querySnapshot.forEach((doc) => {
    rankings.push(doc.data() as RankingEntry);
  });

  return rankings;
};

// 自分の順位を取得
export const getUserRank = async (userId: string): Promise<number> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const rankingsRef = collection(db, withTestRoot('rankings').join('/'));
  const q = query(rankingsRef, orderBy('totalXp', 'desc'));
  const querySnapshot = await getDocs(q);
  
  let rank = 0;
  let userRank = 0;
  querySnapshot.forEach((doc) => {
    rank++;
    if (doc.id === userId) {
      userRank = rank;
    }
  });
  
  return userRank;
};

// 自分のエンドレス専用最高連続正解による順位を取得
export const getUserRankByMaxStreak = async (userId: string): Promise<number> => {
  if (!db) throw new Error('Firestore not initialized');

  const rankingsRef = collection(db, withTestRoot('rankings').join('/'));
  const q = query(rankingsRef, orderBy('endlessMaxStreak', 'desc'));
  const querySnapshot = await getDocs(q);

  let rank = 0;
  let userRank = 0;
  querySnapshot.forEach((doc) => {
    rank++;
    if (doc.id === userId) {
      userRank = rank;
    }
  });

  return userRank;
};

// Revolution（回転）用の状態を保存/読み込みするヘルパー
export const saveRevolutionState = async (userId: string, state: any) => {
  if (!db) throw new Error('Firestore not initialized');
  const revRef = doc(db, withTestRoot('revolution', userId).join('/'));

  const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      const arr = obj
        .map(v => sanitizeForFirestore(v))
        .filter(v => v !== undefined);
      return arr;
    }
    if (typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        const sv = sanitizeForFirestore(v);
        if (sv !== undefined) out[k] = sv;
      }
      return out;
    }
    return obj;
  };

  const sanitized = sanitizeForFirestore(state) || {};
  await setDoc(revRef, { ...sanitized, updatedAt: Date.now() }, { merge: true });
};

export const loadRevolutionState = async (userId: string): Promise<any | null> => {
  if (!db) throw new Error('Firestore not initialized');
  const revRef = doc(db, withTestRoot('revolution', userId).join('/'));
  const snap = await getDoc(revRef);
  if (!snap.exists()) return null;
  const { updatedAt, ...data } = snap.data() as any;
  return data || null;
};

// ユーザーデータをFirestoreから完全に削除する（サブドキュメントも含む）
export const deleteUserData = async (userId: string) => {
  if (!db) throw new Error('Firestore not initialized');

  const docsToDelete = [
    // コアユーザードキュメント
    doc(db, withTestRoot('users', userId).join('/')),
    // サブドキュメント
    doc(db, withTestRoot('users', userId, 'cardCollection', 'data').join('/')),
    doc(db, withTestRoot('users', userId, 'characters', 'data').join('/')),
    doc(db, withTestRoot('users', userId, 'collectionPlus', 'data').join('/')),
    doc(db, withTestRoot('users', userId, 'skillLevels', 'data').join('/')),
    // ランキング、Revolution
    doc(db, withTestRoot('rankings', userId).join('/')),
    doc(db, withTestRoot('revolution', userId).join('/')),
    // PresentBox (プレゼントボックス)
    doc(db, withTestRoot('presentBox', userId).join('/'))
  ];

  for (const d of docsToDelete) {
    try {
      await deleteDoc(d);
    } catch (err) {
      console.warn('Failed to delete doc', d.path, err);
    }
  }
};

// 問い合わせを保存するヘルパー
export const saveInquiry = async (name: string, email: string, message: string, replyRequested: boolean = false, uid: string | null = null) => {
  if (!db) throw new Error('Firestore not initialized');

  const id = `inquiry_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const inquiryRef = doc(db, withTestRoot('inquiries', id).join('/'));

  const payload = {
    name: name || null,
    email: email || null,
    userId: uid || null,
    message: message || null,
    replyRequested: !!replyRequested,
    createdAt: Date.now()
  };

  await setDoc(inquiryRef, payload, { merge: true });
  
  // Webhookフォールバック: Firebase Functions が使えない環境（Spark等）では
  // 管理者メールへ転送する外部Webhook（Google Apps Script / Formspree など）を設定できます。
  // .env に `VITE_INQUIRY_WEBHOOK_URL` を追加してください。
  try {
    const webhookUrl = (import.meta as any).env?.VITE_INQUIRY_WEBHOOK_URL || '';
    if (webhookUrl) {
      // GAS の公開 exec URL はブラウザからの POST でプリフライト（OPTIONS）を要求し、
      // そのままだと CORS エラーになることが多いです。
      // そこで簡易にクエリ文字列を付けた GET で送信します（サイズに注意）。
      try {
        // webhook 用にメッセージを安全に切り詰める（JSONP/GET の URL 長制限対策）
        const MAX_WEBHOOK_MESSAGE = 800; // 送信時は最大800文字に制限
        const isTruncated = (message || '').length > MAX_WEBHOOK_MESSAGE;
        // 切り詰めが発生する場合、メール本文には一切本文を載せない（ユーザ要求）
        const safeMessage = isTruncated ? '' : (message || '').slice(0, MAX_WEBHOOK_MESSAGE);
        const truncatedFlag = isTruncated ? '1' : '0';

        const params = new URLSearchParams({
          id,
          name: name || '',
          email: email || '',
          uid: uid || '',
          // 本文は切り詰め発生時は空にする
          message: safeMessage,
          truncated: truncatedFlag,
          replyRequested: replyRequested ? '1' : '0',
          createdAt: String(Date.now())
        });
        // webhookUrl に既にクエリが含まれている可能性を考慮
        const sep = webhookUrl.includes('?') ? '&' : '?';
        const url = `${webhookUrl}${sep}${params.toString()}`;
        // まず通常の fetch を試して、成功したらレスポンスを確認して完了扱いにする。
        // CORS 等で fetch が失敗した場合は JSONP フォールバックを試み、JSONP の完了まで待つ。
        try {
          const resp = await fetch(url, { method: 'GET' });
          // fetch が成功した場合、可能なら JSON を読んで OK を確認する
          try {
            const text = await resp.text();
            // よくある JSONP 応答 (callback(...)) の場合はそのまま成功とみなす
            if (text) {
              // もし JSON なら解析して ok フィールドを確認
              try {
                const j = JSON.parse(text);
                if (j && j.ok === false) {
                  throw new Error('Webhook responded with error: ' + (j.error || 'unknown'));
                }
              } catch (e) {
                // JSON 以外（JSONP等）は成功とみなす
              }
            }
          } catch (e) {
            console.warn('Failed to read webhook response body, but request succeeded', e);
          }
        } catch (err) {
          console.warn('Inquiry webhook delivery failed (GET):', err);

          // CORS 等で失敗した場合、JSONP (script タグ) でフォールバックする — Promiseで待機
          try {
            await new Promise<void>((resolve, reject) => {
              const cbName = `__inquiry_cb_${Date.now()}_${Math.floor(Math.random()*100000)}`;
              let finished = false;
              (window as any)[cbName] = (resp: any) => {
                if (finished) return;
                finished = true;
                try { console.log('inquiry webhook jsonp response', resp); } catch (e) {}
                try { delete (window as any)[cbName]; } catch (e) {}
                const s = document.getElementById(cbName);
                if (s && s.parentNode) s.parentNode.removeChild(s);
                if (resp && resp.ok === false) {
                  reject(new Error('Webhook responded with error: ' + (resp.error || 'unknown')));
                } else {
                  resolve();
                }
              };

              const jsonpSep = url.includes('?') ? '&' : '?';
              const jsonpUrl = `${url}${jsonpSep}callback=${cbName}`;
              const script = document.createElement('script');
              script.src = jsonpUrl;
              script.id = cbName;
              script.onerror = () => {
                if (finished) return;
                finished = true;
                console.warn('Inquiry webhook JSONP script load failed');
                try { delete (window as any)[cbName]; } catch (e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('JSONP script load failed'));
              };
              document.body.appendChild(script);
              // タイムアウト
              setTimeout(() => {
                if (finished) return;
                finished = true;
                try { delete (window as any)[cbName]; } catch (e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('JSONP callback timeout'));
              }, 10000);
            });
          } catch (e) {
            console.warn('Inquiry webhook JSONP fallback failed', e);
            throw e; // webhook 全失敗は呼び出し元に伝える
          }
        }
      } catch (err) {
        console.warn('Inquiry webhook prepare failed:', err);
      }
    }
  } catch (err) {
    console.warn('Inquiry webhook step failed:', err);
  }
};

export { auth, db, isFirebaseEnabled };

// Storage helper: convert gs:// URIs to browser-downloadable URLs
export const getStorageDownloadUrl = async (gsUri: string): Promise<string> => {
  if (!gsUri || typeof gsUri !== 'string') return gsUri;
  try {
    // If already an http/https URL, return as-is
    if (gsUri.startsWith('http://') || gsUri.startsWith('https://')) return gsUri;

    if (!gsUri.startsWith('gs://')) return gsUri;
    if (!app) throw new Error('Firebase app not initialized');

    const storage = getStorage(app);
    // Using storageRef with a gs:// URL is supported by the SDK
    const ref = storageRef(storage, gsUri);
    const url = await getDownloadURL(ref);
    return url;
  } catch (err) {
    console.warn('Failed to resolve storage URL for', gsUri, err);
    return gsUri; // fallback to original value
  }
};
