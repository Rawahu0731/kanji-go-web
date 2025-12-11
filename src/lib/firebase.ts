import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { GamificationState } from '../contexts/GamificationContext';

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
  iconUrl?: string;
  updatedAt: number;
}

// ユーザーデータの保存
export const saveUserData = async (userId: string, data: GamificationState) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = doc(db, 'users', userId);
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

  const sanitized = sanitizeForFirestore(data) || {};
  await setDoc(userRef, {
    ...sanitized,
    updatedAt: Date.now()
  }, { merge: true });
  
  // ランキング用データも更新
  const rankingRef = doc(db, 'rankings', userId);
  const rankingObj = {
    userId,
    username: data.username,
    level: data.level,
    totalXp: data.totalXp,
    coins: data.coins,
    medals: data.medals,
    iconUrl: data.customIconUrl || data.activeIcon,
    updatedAt: Date.now()
  };
  const sanitizedRanking = sanitizeForFirestore(rankingObj) || {};
  await setDoc(rankingRef, sanitizedRanking, { merge: true });
};

// ユーザーデータの読み込み
export const loadUserData = async (userId: string): Promise<GamificationState | null> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    // updatedAtは除外して返す
    const { updatedAt, ...userData } = data;
    return userData as GamificationState;
  }
  
  return null;
};

// ランキングの取得
export const getRankings = async (limitCount: number = 100): Promise<RankingEntry[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const rankingsRef = collection(db, 'rankings');
  const q = query(rankingsRef, orderBy('totalXp', 'desc'), limit(limitCount));
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
  
  const rankingsRef = collection(db, 'rankings');
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

// Revolution（回転）用の状態を保存/読み込みするヘルパー
export const saveRevolutionState = async (userId: string, state: any) => {
  if (!db) throw new Error('Firestore not initialized');
  const revRef = doc(db, 'revolution', userId);

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
  const revRef = doc(db, 'revolution', userId);
  const snap = await getDoc(revRef);
  if (!snap.exists()) return null;
  const { updatedAt, ...data } = snap.data() as any;
  return data || null;
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
