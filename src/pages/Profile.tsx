import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { BADGES } from '../data/badges';
import '../styles/Profile.css';

function Profile() {
  const { state, getXpForNextLevel, getLevelProgress } = useGamification();

  const unlockedBadgesList = state.unlockedBadges.map(id => BADGES[id]).filter(Boolean);
  const totalBadges = Object.keys(BADGES).length;

  return (
    <div className="profile-container">
      <header className="profile-header">
        <Link to="/" className="back-button">← ホームへ戻る</Link>
        <h1>プロフィール</h1>
      </header>

      <div className="profile-content">
        {/* プレイヤー情報 */}
        <div className="player-info-card">
          <div className="player-icon">
            {state.activeIcon === 'default' ? '👤' : 
             state.activeIcon === 'icon_fire' ? '🔥' :
             state.activeIcon === 'icon_star' ? '⭐' :
             state.activeIcon === 'icon_dragon' ? '🐉' : '👤'}
          </div>
          <div className="player-stats">
            <h2>レベル {state.level}</h2>
            <div className="xp-bar-container">
              <div className="xp-bar" style={{ width: `${getLevelProgress()}%` }}></div>
            </div>
            <div className="xp-text">
              {state.xp} / {getXpForNextLevel()} XP
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="stats-section">
          <h2>統計</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">{state.coins}</div>
              <div className="stat-label">コイン</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{state.stats.totalQuizzes}</div>
              <div className="stat-label">総クイズ数</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✓</div>
              <div className="stat-value">{state.stats.correctAnswers}</div>
              <div className="stat-label">正解数</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✗</div>
              <div className="stat-value">{state.stats.incorrectAnswers}</div>
              <div className="stat-label">不正解数</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{state.stats.currentStreak}</div>
              <div className="stat-label">現在の連勝</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{state.stats.bestStreak}</div>
              <div className="stat-label">最高連勝</div>
            </div>
          </div>
          
          {state.stats.totalQuizzes > 0 && (
            <div className="accuracy-card">
              <h3>正答率</h3>
              <div className="accuracy-value">
                {((state.stats.correctAnswers / state.stats.totalQuizzes) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* バッジコレクション */}
        <div className="badges-section">
          <h2>バッジコレクション ({unlockedBadgesList.length} / {totalBadges})</h2>
          <div className="badges-grid">
            {Object.values(BADGES).map(badge => {
              const isUnlocked = state.unlockedBadges.includes(badge.id);
              return (
                <div 
                  key={badge.id}
                  className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                  title={isUnlocked ? badge.description : '???'}
                >
                  <div className="badge-icon">
                    {isUnlocked ? badge.icon : '🔒'}
                  </div>
                  <div className="badge-name">
                    {isUnlocked ? badge.name : '???'}
                  </div>
                  {isUnlocked && (
                    <div className="badge-description">
                      {badge.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
