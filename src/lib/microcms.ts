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
