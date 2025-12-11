import { useState, useEffect } from 'react';
import { useGamification } from '../contexts/GamificationContext';
import './DebugPanel.css';

const DEBUG_PASSWORD = 'kanjiDebug2025'; // デバッグモードのパスワード

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [xpInput, setXpInput] = useState('');
  const [coinsInput, setCoinsInput] = useState('');
  const [medalsInput, setMedalsInput] = useState('');
  const [error, setError] = useState('');
  
  const { state, setXp, setCoins, setMedals, addMedals, setDebugInfo, grantMaintenanceCompensation } = useGamification();

  // 裏コマンド用のグローバルイベントリスナーを設定
  useEffect(() => {
    const handleDebugActivation = () => {
      setIsOpen(true);
    };

    window.addEventListener('activateDebugMode', handleDebugActivation);
    
    return () => {
      window.removeEventListener('activateDebugMode', handleDebugActivation);
    };
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEBUG_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('パスワードが間違っています');
      setPassword('');
    }
  };

  const handleSetXp = () => {
    const value = parseInt(xpInput);
    if (isNaN(value) || value < 0) {
      setError('正しい数値を入力してください（0以上）');
      return;
    }
    setXp(value);
    setError('');
    setXpInput('');
  };

  const handleSetCoins = () => {
    const value = parseInt(coinsInput);
    if (isNaN(value)) {
      setError('正しい数値を入力してください');
      return;
    }
    setCoins(value);
    setError('');
    setCoinsInput('');
  };

  const handleSetMedals = () => {
    const value = parseInt(medalsInput);
    if (isNaN(value) || value < 0) {
      setError('正しい数値を入力してください（0以上）');
      return;
    }
    setMedals(value);
    setError('');
    setMedalsInput('');
  };

  const handleAddMedals = (delta?: number) => {
    let amount = 0;
    if (typeof delta === 'number') amount = delta;
    else amount = parseInt(medalsInput) || 0;

    if (isNaN(amount)) {
      setError('正しい数値を入力してください');
      return;
    }

    addMedals(amount);
    setError('');
    setMedalsInput('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsAuthenticated(false);
    setPassword('');
    setXpInput('');
    setCoinsInput('');
    setError('');
  };

  // デバッグボタンは表示しない（裏コマンドでのみ起動）
  if (!isOpen) {
    return null;
  }

  return (
    <div className="debug-panel-overlay" onClick={handleClose}>
      <div className="debug-panel" onClick={(e) => e.stopPropagation()}>
        <div className="debug-panel-header">
          <h2>🔧 デバッグモード</h2>
          <button className="debug-panel-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handlePasswordSubmit} className="debug-auth-form">
            <div className="debug-input-group">
              <label htmlFor="debug-password">パスワード</label>
              <input
                id="debug-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoFocus
              />
            </div>
            {error && <div className="debug-error">{error}</div>}
            <button type="submit" className="debug-submit-btn">
              認証
            </button>
          </form>
        ) : (
          <div className="debug-controls">
            <div className="debug-info">
              <div className="debug-stat">
                <span className="debug-label">現在のXP:</span>
                <span className="debug-value">{state.xp}</span>
              </div>
              <div className="debug-stat">
                <span className="debug-label">累計XP:</span>
                <span className="debug-value">{state.totalXp}</span>
              </div>
              <div className="debug-stat">
                <span className="debug-label">現在のレベル:</span>
                <span className="debug-value">{state.level}</span>
              </div>
              <div className="debug-stat">
                <span className="debug-label">現在のコイン:</span>
                <span className="debug-value">{state.coins}</span>
              </div>
              <div className="debug-stat">
                <span className="debug-label">現在のメダル:</span>
                <span className="debug-value">{state.medals}</span>
              </div>
            </div>

            <div className="debug-controls-section">
              <h3>XP設定</h3>
              <div className="debug-input-group">
                <input
                  type="number"
                  value={xpInput}
                  onChange={(e) => setXpInput(e.target.value)}
                  placeholder="XPを入力"
                  min="0"
                />
                <button onClick={handleSetXp} className="debug-set-btn">
                  設定
                </button>
              </div>
            </div>

            <div className="debug-controls-section">
              <h3>コイン設定</h3>
              <div className="debug-input-group">
                <input
                  type="number"
                  value={coinsInput}
                  onChange={(e) => setCoinsInput(e.target.value)}
                  placeholder="コインを入力（負の値も可）"
                />
                <button onClick={handleSetCoins} className="debug-set-btn">
                  設定
                </button>
              </div>
            </div>

            <div className="debug-controls-section">
              <h3>メダル設定</h3>
              <div className="debug-input-group">
                <input
                  type="number"
                  value={medalsInput}
                  onChange={(e) => setMedalsInput(e.target.value)}
                  placeholder="メダルを入力（0以上）"
                  min="0"
                />
                <button onClick={handleSetMedals} className="debug-set-btn">
                  設定
                </button>
                <button onClick={() => handleAddMedals()} className="debug-set-btn">
                  追加
                </button>
              </div>
            </div>

            {error && <div className="debug-error">{error}</div>}

            <div className="debug-quick-actions">
              <h3>クイックアクション</h3>
              <div className="debug-quick-buttons">
                <button onClick={() => setXp(1000)}>
                  XP → 1000
                </button>
                <button onClick={() => setXp(10000)}>
                  XP → 10000
                </button>
                <button onClick={() => setCoins(1000)}>
                  コイン → 1000
                </button>
                <button onClick={() => setCoins(10000)}>
                  コイン → 10000
                </button>
                <button onClick={() => setMedals(0)}>
                  メダル → 0
                </button>
                <button onClick={() => setMedals(1)}>
                  メダル → 1
                </button>
                <button onClick={() => handleAddMedals(1)}>
                  +1 メダル
                </button>
                <button onClick={() => handleAddMedals(10)}>
                  +10 メダル
                </button>
                <button onClick={() => grantMaintenanceCompensation()}>
                  メンテ補償を付与 (デバッグ)
                </button>
              </div>
            </div>

            <div className="debug-controls-section">
              <h3>最後の報酬計算（デバッグ）</h3>
              <div className="debug-input-group">
                {state.debugLastReward ? (
                  <>
                    <pre className="debug-json" style={{ maxHeight: '220px', overflow: 'auto', background: '#0f1724', color: '#e6eef8', padding: '8px', borderRadius: '6px' }}>{JSON.stringify(state.debugLastReward, null, 2)}</pre>
                    <div style={{ marginTop: '8px' }}>
                      <button onClick={() => setDebugInfo(null)} className="debug-set-btn">クリア</button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#9aa4b2' }}>デバッグ情報はありません</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
