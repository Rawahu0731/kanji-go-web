// プレゼントボックスの型定義

export type PresentRewardType = 'coins' | 'medals' | 'xp' | 'tickets' | 'character' | 'card';

export interface PresentReward {
  type: PresentRewardType;
  amount?: number; // coins, medals, xp, ticketsの場合
  ticketId?: string; // ticketsの場合
  characterId?: string; // characterの場合
  card?: any; // cardの場合
}

export interface Present {
  id: string;
  title: string;
  description: string;
  rewards: PresentReward[];
  createdAt: number; // タイムスタンプ
  expiresAt?: number; // 有効期限（オプション）
  claimed: boolean; // 受け取り済みかどうか
  claimedAt?: number; // 受け取り日時
}

export interface PresentBoxState {
  presents: Present[];
  lastChecked: number; // 最後にチェックした時刻
}
