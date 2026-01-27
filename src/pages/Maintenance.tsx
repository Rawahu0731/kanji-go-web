import './Maintenance.css'
import { useState } from 'react'
import { maintenancePassword,isBypassDisplay } from '../config'

export default function Maintenance() {
  const [input, setInput] = useState('')
  const [msg, setMsg] = useState('')

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
        <h1>メンテナンス中</h1>
        <p>ただいまサービスを一時停止しています。ご不便をおかけして申し訳ありません。復旧までお待ちください。</p>
        <p>
          <a href="/simple">漢字学習</a>
        </p>

        {isBypassDisplay && (
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
