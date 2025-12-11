// プロジェクト内で管理する設定
// メンテナンスを終了する日時（日本時間） — 2025-12-12 08:00 に終了
export const maintenanceEndsAt = new Date('2025-12-12T08:00:00+09:00')

// 現在時刻が終了時刻より前ならメンテナンス中
export const isMaintenance = Date.now() < maintenanceEndsAt.getTime()
