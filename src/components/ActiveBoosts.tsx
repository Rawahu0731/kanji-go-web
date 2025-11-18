import { useState, useEffect } from 'react';
import { useGamification } from '../contexts/GamificationContext';
import './ActiveBoosts.css';

function ActiveBoosts() {
  const { state } = useGamification();
  const [, setTick] = useState(0);

  // 残り時間を更新するために1秒ごとに再レンダリング
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = Math.max(0, expiresAt - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    }
    return `${seconds}秒`;
  };

  const activeBoosts = state.activeBoosts.filter(boost => boost.expiresAt > Date.now());

  if (activeBoosts.length === 0) {
    return null;
  }

  return (
    <div className="active-boosts-container">
      <div className="active-boosts-header">
        <span className="boost-title">⚡ アクティブなブースト</span>
      </div>
      <div className="active-boosts-list">
        {activeBoosts.map((boost, index) => (
          <div key={`${boost.id}-${index}`} className="active-boost-item">
            <span className="boost-icon">{boost.icon}</span>
            <div className="boost-info">
              <div className="boost-name">{boost.name}</div>
              <div className="boost-time">残り {formatTimeRemaining(boost.expiresAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActiveBoosts;
