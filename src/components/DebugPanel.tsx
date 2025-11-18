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
  const [error, setError] = useState('');
  
  const { state, setXp, setCoins } = useGamification();

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
    if (isNaN(value) || value < 0) {
      setError('正しい数値を入力してください（0以上）');
      return;
    }
    setCoins(value);
    setError('');
    setCoinsInput('');
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
                  placeholder="コインを入力"
                  min="0"
                />
                <button onClick={handleSetCoins} className="debug-set-btn">
                  設定
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
