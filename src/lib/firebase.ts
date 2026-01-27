// Local-only Firebase replacement (single-file stub).
// Provides the minimal API the app expects, backed by localStorage and in-memory fallbacks.

export interface RankingEntry {
  userId: string;
  username: string;
  level: number;
  totalXp: number;
  coins: number;
  medals: number;
  endlessMaxStreak?: number;
  iconUrl?: string;
  updatedAt: number;
}

export const isFirebaseEnabled = false;
export const auth: null = null;
export const db: null = null;
export const googleProvider: null = null;

export const onAuthStateChange = (callback: (user: any | null) => void) => {
  // Immediately notify as signed-out in local-only mode.
  setTimeout(() => callback(null), 0);
  return () => {};
};

export const signInWithGoogle = async () => { throw new Error('Sign-in disabled in local-only mode'); };
export const signOut = async () => { return; };
export const signUpWithEmail = async (_email: string, _password: string, _username: string) => { throw new Error('Sign-up disabled in local-only mode'); };
export const signInWithEmail = async (_email: string, _password: string) => { throw new Error('Sign-in disabled in local-only mode'); };
export const updateDisplayName = async (_user: any, _displayName: string) => { return; };

const USER_PREFIX = 'user:';
const RANKINGS_KEY = 'rankings';

export const saveUserData = async (userId: string, data: any) => {
  try {
    const key = `${USER_PREFIX}${userId}`;
    const payload = { ...data, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));

    // Maintain a simplified rankings store for compatibility with ranking UI removal.
    try {
      const raw = localStorage.getItem(RANKINGS_KEY);
      const arr: RankingEntry[] = raw ? JSON.parse(raw) : [];
      const totalXp = typeof data.totalXp === 'number' ? data.totalXp : Number(data.totalXp || 0);
      const existingIndex = arr.findIndex(r => r.userId === userId);
      const entry: RankingEntry = {
        userId,
        username: data.username || '',
        level: data.level || 0,
        totalXp,
        coins: data.coins || 0,
        medals: data.medals || 0,
        endlessMaxStreak: data?.stats?.endlessBestStreak ?? data?.stats?.endlessMaxStreak ?? 0,
        iconUrl: data.customIconUrl || data.activeIcon || '',
        updatedAt: Date.now()
      };
      if (existingIndex >= 0) arr[existingIndex] = entry; else arr.push(entry);
      localStorage.setItem(RANKINGS_KEY, JSON.stringify(arr));
    } catch (e) {
      // ignore ranking maintenance errors
    }

    return true;
  } catch (e) {
    console.warn('Failed to save user data locally', e);
    throw e;
  }
};

export const loadUserData = async (userId: string) => {
  try {
    const key = `${USER_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.updatedAt) delete parsed.updatedAt;
    return parsed;
  } catch (e) {
    console.warn('Failed to load user data locally', e);
    return null;
  }
};

export const getRankings = async (limitCount: number = 100): Promise<RankingEntry[]> => {
  try {
    const raw = localStorage.getItem(RANKINGS_KEY);
    const arr: RankingEntry[] = raw ? JSON.parse(raw) : [];
    return arr.sort((a,b) => b.totalXp - a.totalXp).slice(0, limitCount);
  } catch (e) {
    return [];
  }
};

export const getRankingsByMaxStreak = async (limitCount: number = 100): Promise<RankingEntry[]> => {
  try {
    const raw = localStorage.getItem(RANKINGS_KEY);
    const arr: RankingEntry[] = raw ? JSON.parse(raw) : [];
    return arr.sort((a,b) => (b.endlessMaxStreak || 0) - (a.endlessMaxStreak || 0)).slice(0, limitCount);
  } catch (e) {
    return [];
  }
};

export const getUserRank = async (userId: string): Promise<number> => {
  try {
    const list = await getRankings(10000);
    const idx = list.findIndex(r => r.userId === userId);
    return idx >= 0 ? idx + 1 : 0;
  } catch (e) {
    return 0;
  }
};

export const getUserRankByMaxStreak = async (userId: string): Promise<number> => {
  try {
    const list = await getRankingsByMaxStreak(10000);
    const idx = list.findIndex(r => r.userId === userId);
    return idx >= 0 ? idx + 1 : 0;
  } catch (e) {
    return 0;
  }
};

export const saveRevolutionState = async (userId: string, state: any) => {
  try {
    const key = `revolution:${userId}`;
    localStorage.setItem(key, JSON.stringify({ ...state, updatedAt: Date.now() }));
    return true;
  } catch (e) {
    console.warn('Failed to save revolution state locally', e);
    throw e;
  }
};

export const loadRevolutionState = async (userId: string) => {
  try {
    const key = `revolution:${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.updatedAt) delete parsed.updatedAt;
    return parsed;
  } catch (e) {
    console.warn('Failed to load revolution state locally', e);
    return null;
  }
};

export const deleteUserData = async (userId: string) => {
  try {
    const keys = [`user:${userId}`, `revolution:${userId}`, `presentBox:${userId}`];
    for (const k of keys) localStorage.removeItem(k);
    // remove ranking entry
    try {
      const raw = localStorage.getItem(RANKINGS_KEY);
      const arr: RankingEntry[] = raw ? JSON.parse(raw) : [];
      const filtered = arr.filter(r => r.userId !== userId);
      localStorage.setItem(RANKINGS_KEY, JSON.stringify(filtered));
    } catch (e) {}
    return true;
  } catch (e) {
    console.warn('Failed to delete local user data', e);
    throw e;
  }
};

export const saveInquiry = async (name: string, email: string, message: string, replyRequested = false, uid: string | null = null) => {
  try {
    const raw = localStorage.getItem('inquiries');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ id: `inquiry_${Date.now()}_${Math.floor(Math.random()*100000)}`, name, email, message, replyRequested, uid, createdAt: Date.now() });
    localStorage.setItem('inquiries', JSON.stringify(arr));
    return true;
  } catch (e) {
    console.warn('Failed to save inquiry locally', e);
    throw e;
  }
};

export const getStorageDownloadUrl = async (gsUri: string): Promise<string> => { return gsUri; };

export { auth as firebaseAuth, db as firebaseDb, isFirebaseEnabled as firebaseEnabled };
