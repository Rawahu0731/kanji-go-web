import { Link } from 'react-router-dom';
import { useGamification } from '../contexts/GamificationContext';
import { BADGES } from '../data/badges';
import { useState } from 'react';
import '../styles/Profile.css';
import * as BN from '../utils/bigNumber';

function Profile() {
  const { state, isMedalSystemEnabled, getTotalXpForNextLevel, getLevelProgress, setUsername, deleteGameData } = useGamification();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.username);

  const unlockedBadgesList = (state.unlockedBadges ?? []).map(id => BADGES[id]).filter(Boolean);
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
    <div className="profile-container page-root">
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
              {BN.toString(BN.ensureBigNumber(state.totalXp))} / {BN.toString(BN.fromNumber(getTotalXpForNextLevel()))} XP
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
            {isMedalSystemEnabled && (
              <div className="stat-card">
                <div className="stat-icon">🪙</div>
                <div className="stat-value">{state.medals}</div>
                <div className="stat-label">メダル</div>
              </div>
            )}
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
            {state.characters && state.characters.some((c: any) => c?.id === 'zero') && (
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{state.stats.endlessBestStreak ?? 0}</div>
                <div className="stat-label">エンドレス最高連勝</div>
              </div>
            )}
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
              const isUnlocked = (state.unlockedBadges ?? []).includes(badge.id);
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

        {/* データ削除ボタン */}
        <div className="stats-card">
          <h2>データ管理</h2>
          <p style={{ textAlign: 'center', color: '#a0a0c0', padding: '0.5rem' }}>
          ゲーム内の進行状況・所持品・統計などをlocalStorageから消去します。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={async () => {
                const ok = window.confirm('本当にローカルのゲームデータを完全に削除しますか？');
                if (!ok) return;
                try {
                  await deleteGameData();
                  alert('ゲームデータを削除しました。');
                } catch (e) {
                  console.error('Failed to delete game data:', e);
                  alert('ゲームデータの削除に失敗しました。コンソールを確認してください。');
                }
              }}
              style={{
                background: '#e02424',
                color: 'white',
                padding: '0.8rem 1.2rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700
              }}
              title="ゲームデータを削除"
            >
              ゲームデータを削除する
            </button>
          </div>
        </div>
    </div>
  );
}

export default Profile;
