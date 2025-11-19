import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { BADGES } from '../data/badges';
import { useState } from 'react';
import '../styles/Profile.css';

function Profile() {
  const { state, getXpForNextLevel, getLevelProgress, setUsername } = useGamification();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.username);

  const unlockedBadgesList = state.unlockedBadges.map(id => BADGES[id]).filter(Boolean);
  const totalBadges = Object.keys(BADGES).length;

  const handleNameSave = () => {
    setUsername(nameInput);
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setNameInput(state.username);
    setIsEditingName(false);
  };

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
            {state.activeIcon === 'custom' && state.customIconUrl ? (
              <img 
                src={state.customIconUrl} 
                alt="カスタムアイコン"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.textContent = '👤';
                }}
              />
            ) : (
              <>
                {state.activeIcon === 'default' ? '👤' : 
                 state.activeIcon === 'icon_fire' ? '🔥' :
                 state.activeIcon === 'icon_star' ? '⭐' :
                 state.activeIcon === 'icon_dragon' ? '🐉' :
                 state.activeIcon === 'icon_crown' ? '👑' :
                 state.activeIcon === 'icon_ninja' ? '🥷' :
                 state.activeIcon === 'icon_wizard' ? '🧙' :
                 state.activeIcon === 'icon_samurai' ? '⚔️' :
                 state.activeIcon === 'icon_robot' ? '🤖' :
                 state.activeIcon === 'icon_cherry_blossom' ? '🌸' : '👤'}
              </>
            )}
          </div>
          <div className="player-stats">
            <div className="username-container">
              {isEditingName ? (
                <div className="username-edit">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    className="username-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                  />
                  <div className="username-buttons">
                    <button onClick={handleNameSave} className="username-save-btn">
                      ✓
                    </button>
                    <button onClick={handleNameCancel} className="username-cancel-btn">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="username-display">
                  <h2>{state.username}</h2>
                  <button 
                    onClick={() => setIsEditingName(true)} 
                    className="username-edit-btn"
                    title="ユーザーネームを編集"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
            <h3 style={{ margin: '0.5rem 0', color: '#a0a0c0', fontSize: '1.2rem' }}>
              レベル {state.level}
            </h3>
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

        {/* キャラクター管理へのリンク */}
        <div className="stats-card">
          <h2>キャラクター</h2>
          <p style={{ textAlign: 'center', color: '#a0a0c0', padding: '1rem', marginBottom: '1rem' }}>
            所持キャラクター: {state.characters.length}体
          </p>
          <Link 
            to="/characters" 
            style={{
              display: 'block',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            キャラクター管理へ →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Profile;
