import './Maintenance.css'

export default function Maintenance() {
  return (
    <div className="maintenance-root">
      <div className="maintenance-card">
        <h1>メンテナンス中</h1>
        <p>ただいまサービスを一時停止しています。ご不便をおかけして申し訳ありません。復旧までお待ちください。</p>
        <p>
          <a href="/known-issues">不具合情報</a> |
          <a href="/announcements" style={{ marginLeft: '8px' }}>お知らせ</a>
        </p>
      </div>
    </div>
  )
}
