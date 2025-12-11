import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRankings, getUserRank, isFirebaseEnabled, getStorageDownloadUrl } from '../lib/firebase';
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
      let data = await getRankings(100);

      // Resolve storage URLs (gs://...) and map the literal 'default' to a bundled default image.
      const resolved = await Promise.all(
        data.map(async (entry) => {
          try {
            if (entry.iconUrl && typeof entry.iconUrl === 'string') {
              if (entry.iconUrl === 'default') {
                entry.iconUrl = '👤';
              } else if (entry.iconUrl === 'custom') {
                entry.iconUrl = '👤';
              } else if (entry.iconUrl.startsWith('gs://')) {
                const resolvedUrl = await getStorageDownloadUrl(entry.iconUrl);
                entry.iconUrl = resolvedUrl;
              }
            }
          } catch (e) {
            console.warn('Failed to resolve iconUrl for', entry.userId, e);
          }
          return entry;
        })
      );

      data = resolved;
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

  const isImageSource = (src?: string) => {
    if (!src || typeof src !== 'string') return false;
    if (/^https?:\/\//.test(src)) return true;
    if (/^data:/.test(src)) return true;
    if (src.startsWith('/')) return true; // local public assets
    if (/\.(png|jpe?g|gif|svg)$/i.test(src)) return true;
    return false;
  };

  const mapIconIdentifier = (icon?: string) => {
    if (!icon) return icon;
    // common identifiers used across the app
    switch (icon) {
      case 'default': return '👤';
      case 'custom': return '👤';
      case 'icon_fire': return '🔥';
      case 'icon_star': return '⭐';
      case 'icon_dragon': return '🐉';
      case 'icon_crown': return '👑';
      case 'icon_ninja': return '🥷';
      case 'icon_wizard': return '🧙';
      case 'icon_samurai': return '⚔️';
      case 'icon_robot': return '🤖';
      case 'icon_cherry_blossom': return '🌸';
      default:
        return icon;
    }
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
              <p className="xp">累計XP: {(state.totalXp ?? 0).toLocaleString()}</p>
              <p className="medals">メダル: {(state.medals ?? 0).toLocaleString()}</p>
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
                  <th>メダル</th>
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
                        <div className="user-avatar" aria-hidden>
                          {entry.iconUrl ? (
                            // アイコン識別子を解決（'icon_fire' 等 → 絵文字、'default' → ロゴ画像）
                            (() => {
                              const mapped = mapIconIdentifier(entry.iconUrl);
                              return isImageSource(mapped) ? (
                                <img src={mapped} alt={entry.username} className="user-icon" />
                              ) : (
                                <span className="avatar-emoji">{mapped}</span>
                              );
                            })()
                          ) : (
                            // フォールバック: ユーザー名の先頭1文字（日本語は1文字、英語は大文字化）
                            <span className="avatar-fallback">{(entry.username || '').slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="username">{entry.username}</span>
                      </div>
                    </td>
                    <td className="level-cell">{entry.level}</td>
                    <td className="xp-cell">{(entry.totalXp ?? 0).toLocaleString()}</td>
                    <td className="coin-cell">{(entry.coins ?? 0).toLocaleString()}</td>
                    <td className="medal-cell">{(entry.medals ?? 0).toLocaleString()}</td>
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
