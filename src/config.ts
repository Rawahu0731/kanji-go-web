// プロジェクト内で管理する設定

// メンテナンスを有効にするかどうか。
// 優先順位: 環境変数 `VITE_MAINTENANCE` が設定されていればそれを使用。
export const isMaintenance = false;

// メンテナンスバイパス用のパスワード。Vite の環境変数を利用してください。
// .env に `VITE_MAINTENANCE_PASSWORD=yourpassword` を設定すると有効になります。
export const maintenancePassword = (import.meta as any).env?.VITE_MAINTENANCE_PASSWORD ?? '';

export const isBypassDisplay = false; // 表示バイパス機能の有効化