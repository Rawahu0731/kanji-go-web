import './Maintenance.css'
import { useState } from 'react'
import { maintenancePassword,isBypassDisplay } from '../config'

export default function Maintenance() {
  const [input, setInput] = useState('')
  const [msg, setMsg] = useState('')
  const a = false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintenancePassword) {
      setMsg('バイパス用パスワードが未設定です。')
      return
    }
    if (input === maintenancePassword) {
      try {
        localStorage.setItem('maintenanceBypass', 'true')
      } catch (err) {
        // ignore
      }
      window.location.href = '/'
    } else {
      setMsg('パスワードが違います。')
    }
  }

  return (
    <div className="maintenance-root">
      <div className="maintenance-card">
        <img src="/kanji_logo.png" alt="漢字勉強サイト" className="maintenance-logo" />
        <h1>長らくのご愛顧、ありがとうございました</h1>
        <p>漢字勉強サイトはサービスを終了しました。これまでご利用いただき、心より感謝申し上げます。</p>
        <p>このサイトで学んだ漢字をこれからも生活に生かしていってください。</p>
        <p>運営チーム一同、心より御礼申し上げます。</p>
        <p>漢字勉強サイト運営チーム</p>
        <p className="since">Since October 24, 2025</p>

        {isBypassDisplay && a && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>メンテナンスバイパス（パスワード）</label>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}
            placeholder="パスワードを入力"
          />
          <div style={{ marginTop: 8 }}>
            <button type="submit" style={{ padding: '8px 12px' }}>解除</button>
          </div>
          {msg && <div style={{ color: 'red', marginTop: 8 }}>{msg}</div>}
        </form>
        )}
      </div>
    </div>
  )
}
