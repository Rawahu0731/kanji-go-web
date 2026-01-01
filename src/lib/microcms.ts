import { createClient } from 'microcms-js-sdk';

// microCMS のコンテンツ型定義
export type ArticleType = 'patch' | 'bug';
export type BugStatus = 'investigating' | 'fixed' | 'wontfix';

export interface Article {
  id: string;
  title: string;
  date: string;
  body: string; // リッチテキストエディタ or HTML
  type: ArticleType | ArticleType[]; // 配列の場合もある
  status?: BugStatus | BugStatus[]; // 不具合のステータス（オプション、配列の場合もある）
  tags?: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// プレゼント配布用の型定義
export type PresentRewardType = 'coins' | 'medals' | 'xp' | 'tickets' | 'character' | 'card';

export interface PresentReward {
  fieldId: string;
  rewardType: PresentRewardType | PresentRewardType[]; // 配列と文字列の両方に対応
  amount?: number;
  ticketId?: string;
  characterId?: string;
}

export interface PresentDistribution {
  id: string;
  title: string;
  description: string;
  rewards: PresentReward[];
  startDate: string; // 配布開始日時
  expiryDate?: string; // 有効期限（オプション）
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListResponse {
  contents: Article[];
  totalCount: number;
  offset: number;
  limit: number;
}

// microCMS クライアントの初期化
const serviceDomain = import.meta.env.VITE_MICROCMS_SERVICE_ID;
const apiKey = import.meta.env.VITE_MICROCMS_API_KEY;

if (!serviceDomain || !apiKey) {
  console.warn(
    'microCMS の環境変数が設定されていません。.env ファイルに VITE_MICROCMS_SERVICE_ID と VITE_MICROCMS_API_KEY を設定してください。'
  );
}

export const client = serviceDomain && apiKey 
  ? createClient({
      serviceDomain,
      apiKey,
    })
  : null;

// パッチノート取得
export async function getPatchNotes(limit = 100): Promise<Article[]> {
  if (!client) {
    throw new Error('microCMS クライアントが初期化されていません');
  }
  
  const response = await client.get<ArticleListResponse>({
    endpoint: 'articles',
    queries: {
      filters: 'type[contains]patch',
      orders: '-date',
      limit,
    },
  });

  return response.contents;
}

// 不具合情報取得
export async function getKnownIssues(limit = 100): Promise<Article[]> {
  if (!client) {
    throw new Error('microCMS クライアントが初期化されていません');
  }

  const response = await client.get<ArticleListResponse>({
    endpoint: 'articles',
    queries: {
      filters: 'type[contains]bug',
      orders: '-date',
      limit,
    },
  });

  return response.contents;
}

// 全記事取得（オプション）
export async function getAllArticles(limit = 100): Promise<Article[]> {
  if (!client) {
    throw new Error('microCMS クライアントが初期化されていません');
  }

  const response = await client.get<ArticleListResponse>({
    endpoint: 'articles',
    queries: {
      orders: '-date',
      limit,
    },
  });

  return response.contents;
}

// 特定記事取得
export async function getArticle(contentId: string): Promise<Article> {
  if (!client) {
    throw new Error('microCMS クライアントが初期化されていません');
  }

  return await client.get<Article>({
    endpoint: 'articles',
    contentId,
  });
}

// プレゼント配布情報取得
export async function getPresentDistributions(limit = 100): Promise<PresentDistribution[]> {
  if (!client) {
    // クライアントが初期化されていない場合は静かに空配列を返す
    console.log('[microCMS] クライアントが初期化されていません');
    return [];
  }

  try {
    console.log('[microCMS] プレゼント配布情報を取得中... endpoint: presents');
    const response = await client.get<{ contents: PresentDistribution[]; totalCount: number; offset: number; limit: number }>({
      endpoint: 'presents',
      queries: {
        orders: '-startDate',
        limit,
      },
    });

    console.log('[microCMS] プレゼント配布情報の取得成功:', response.contents.length, '件');

    // 現在有効なプレゼントのみを返す
    const now = new Date();
    const filtered = response.contents.filter(present => {
      const startDate = new Date(present.startDate);
      const expiryDate = present.expiryDate ? new Date(present.expiryDate) : null;
      
      // 配布開始日を過ぎていて、有効期限内（または有効期限なし）のもの
      return startDate <= now && (!expiryDate || expiryDate >= now);
    });

    console.log('[microCMS] 有効なプレゼント:', filtered.length, '件');
    return filtered;
  } catch (error: any) {
    console.error('[microCMS] プレゼント取得エラー:', {
      status: error?.status,
      message: error?.message,
      response: error?.response,
    });
    
    // 404エラー（APIエンドポイントが存在しない）の場合
    if (error?.status === 404 || error?.message?.includes('404')) {
      console.warn('[microCMS] "presents" エンドポイントが見つかりません。microCMSの設定を確認してください。');
      console.warn('確認事項:');
      console.warn('1. API名が"presents"であること');
      console.warn('2. エンドポイントが"presents"であること');
      console.warn('3. APIの型が「リスト形式」であること');
      console.warn('4. サービスID:', serviceDomain);
      return [];
    }
    // その他のエラーの場合のみログに記録
    console.warn('プレゼント配布情報の取得中にエラーが発生しました。プレゼント配布機能は無効です。', error?.message || error);
    return [];
  }
}

// 特定のプレゼント配布情報取得
export async function getPresentDistribution(contentId: string): Promise<PresentDistribution | null> {
  if (!client) {
    return null;
  }

  try {
    return await client.get<PresentDistribution>({
      endpoint: 'presents',
      contentId,
    });
  } catch (error: any) {
    // 404エラーの場合は静かにnullを返す
    if (error?.status === 404 || error?.message?.includes('404')) {
      return null;
    }
    console.warn('プレゼント配布情報の取得中にエラーが発生しました:', error?.message || error);
    return null;
  }
}
