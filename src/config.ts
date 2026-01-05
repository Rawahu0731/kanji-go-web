// プロジェクト内で管理する設定

export const isMaintenance = true;

// メンテナンスバイパス用のパスワード。Vite の環境変数を利用してください。
// .env に `VITE_MAINTENANCE_PASSWORD=yourpassword` を設定すると有効になります。
export const maintenancePassword = (import.meta as any).env?.VITE_MAINTENANCE_PASSWORD ?? '';

// Firebase の保存先を切り替える設定。
// 'prod' => 本番（通常のコレクション path）
// 'test' => Firestore のパスを `test/root/...` に置き換えて保存／読み込みする
export const firebaseEnvironment: 'prod' | 'test' = 'prod';
