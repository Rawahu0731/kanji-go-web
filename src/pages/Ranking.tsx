import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRankings, getUserRank, isFirebaseEnabled } from '../lib/firebase';
import type { RankingEntry } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import '../styles/Ranking.css';

export default function Ranking() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const { state } = useGamification();

  useEffect(() => {
    loadRankings();
  }, [user]);

  const loadRankings = async () => {
    if (!isFirebaseEnabled) {
      setError('ランキング機能を使用するにはFirebaseの設定が必要です');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getRankings(100);
      setRankings(data);

      if (user) {
        const rank = await getUserRank(user.uid);
        setUserRank(rank);
      }

      setError('');
    } catch (err) {
      console.error('Failed to load rankings:', err);
      setError('ランキングの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}位`;
  };

  return (
    <div className="ranking-page">
      <header>
        <h1>🏆 ランキング</h1>
        <Link to="/" className="back-link">← メニューに戻る</Link>
      </header>

      {!isFirebaseEnabled && (
        <div className="notice-box">
          <p>⚠️ ランキング機能を使用するにはFirebaseの設定が必要です</p>
          <p>詳細は.env.exampleファイルを参照してください</p>
        </div>
      )}

      {!user && isFirebaseEnabled && (
        <div className="notice-box">
          <p>ℹ️ ランキングに参加するにはログインが必要です</p>
        </div>
      )}

      {user && userRank > 0 && (
        <div className="user-rank-box">
          <h2>あなたの順位</h2>
          <div className="user-rank">
            <span className="rank-number">{getRankIcon(userRank)}</span>
            <div className="user-stats">
              <p className="username">{state.username}</p>
              <p className="level">レベル {state.level}</p>
              <p className="xp">累計XP: {state.totalXp.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div className="ranking-content">
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : rankings.length === 0 ? (
          <div className="empty-message">まだランキングデータがありません</div>
        ) : (
          <div className="ranking-list">
            <table>
              <thead>
                <tr>
                  <th>順位</th>
                  <th>プレイヤー</th>
                  <th>レベル</th>
                  <th>累計XP</th>
                  <th>コイン</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((entry, index) => (
                  <tr 
                    key={entry.userId} 
                    className={user?.uid === entry.userId ? 'current-user' : ''}
                  >
                    <td className="rank-cell">
                      <span className={`rank-badge ${index < 3 ? 'top-three' : ''}`}>
                        {getRankIcon(index + 1)}
                      </span>
                    </td>
                    <td className="user-cell">
                      <div className="user-info">
                        {entry.iconUrl && (
                          <img 
                            src={entry.iconUrl} 
                            alt={entry.username} 
                            className="user-icon"
                          />
                        )}
                        <span className="username">{entry.username}</span>
                      </div>
                    </td>
                    <td className="level-cell">{entry.level}</td>
                    <td className="xp-cell">{entry.totalXp.toLocaleString()}</td>
                    <td className="coin-cell">{entry.coins.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="refresh-button-container">
        <button onClick={loadRankings} disabled={loading}>
          {loading ? '更新中...' : '🔄 ランキング更新'}
        </button>
      </div>
    </div>
  );
}
