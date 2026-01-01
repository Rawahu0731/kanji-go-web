import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePresentBox } from '../contexts/PresentBoxContext';
import type { Present } from '../types/present';
import '../styles/PresentBox.css';

export default function PresentBox() {
  const { presents, unclaimedCount, loading, claimPresent, claimAllPresents, refreshPresents, syncFromMicroCMS } = usePresentBox();
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [claimingAll, setClaimingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unclaimed' | 'claimed'>('unclaimed');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 通知を表示する関数
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // 3秒後に自動で消える
  };

  useEffect(() => {
    refreshPresents();
  }, [refreshPresents]);

  // ページ表示時に必ず microCMS 同期を行う
  useEffect(() => {
    let mounted = true;
    setSyncing(true);
    syncFromMicroCMS()
      .then(() => {
        if (mounted) refreshPresents();
      })
      .catch(err => console.warn('microCMS sync failed on PresentBox mount:', err))
      .finally(() => {
        if (mounted) setSyncing(false);
      });

    return () => {
      mounted = false;
    };
  }, [syncFromMicroCMS, refreshPresents]);

  // フィルター適用
  const filteredPresents = presents.filter(present => {
    if (filter === 'unclaimed') return !present.claimed;
    if (filter === 'claimed') return present.claimed;
    return true;
  });

  // 日付フォーマット
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 報酬の表示テキスト
  const getRewardText = (present: Present) => {
    return present.rewards.map(reward => {
      switch (reward.type) {
        case 'coins':
          return `コイン×${reward.amount?.toLocaleString()}`;
        case 'medals':
          return `メダル×${reward.amount?.toLocaleString()}`;
        case 'xp':
          return `経験値×${reward.amount?.toLocaleString()}`;
        case 'tickets':
          return `チケット×${reward.amount}`;
        case 'character':
          return 'キャラクター';
        case 'card':
          return 'カード';
        default:
          return '報酬';
      }
    }).join(', ');
  };

  // 個別受け取り
  const handleClaim = async (presentId: string) => {
    // 既に処理中の場合は何もしない
    if (claimingIds.has(presentId)) {
      return;
    }
    
    const present = presents.find(p => p.id === presentId);
    setClaimingIds(prev => new Set(prev).add(presentId));
    try {
      await claimPresent(presentId);
      if (present) {
        const rewardText = present.rewards.map(reward => {
          switch (reward.type) {
            case 'coins': return `コイン×${reward.amount?.toLocaleString()}`;
            case 'medals': return `メダル×${reward.amount?.toLocaleString()}`;
            case 'xp': return `経験値×${reward.amount?.toLocaleString()}`;
            case 'tickets': return `チケット×${reward.amount}`;
            default: return '報酬';
          }
        }).join(', ');
        showNotification(`${present.title}を受け取りました！(${rewardText})`, 'success');
      }
    } catch (error) {
      console.error('Failed to claim present:', error);
      showNotification('プレゼントの受け取りに失敗しました', 'error');
    } finally {
      setClaimingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(presentId);
        return newSet;
      });
    }
  };

  // 一括受け取り
  const handleClaimAll = async () => {
    if (unclaimedCount === 0 || claimingAll) return;
    
    const count = unclaimedCount;
    setClaimingAll(true);
    try {
      await claimAllPresents();
      showNotification(`${count}件のプレゼントを受け取りました！`, 'success');
    } catch (error) {
      console.error('Failed to claim all presents:', error);
      showNotification('プレゼントの受け取りに失敗しました', 'error');
    } finally {
      setClaimingAll(false);
    }
  };

  // microCMSから手動同期
  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncFromMicroCMS();
      await refreshPresents();
      showNotification('プレゼント情報を更新しました！', 'success');
    } catch (error) {
      console.error('Failed to sync presents:', error);
      showNotification('同期に失敗しました', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="present-box">
        <div className="present-box-loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="present-box page-root">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <header className="present-box-header">
        <Link to="/" className="back-button">← ホームへ戻る</Link>
        <h1>🎁 プレゼントボックス</h1>
        <p className="present-box-subtitle">
          未受け取り: <strong>{unclaimedCount}</strong>件
        </p>
      </header>

      <div className="present-box-controls">
        <div className="present-box-filters">
          <button
            className={`filter-button ${filter === 'unclaimed' ? 'active' : ''}`}
            onClick={() => setFilter('unclaimed')}
          >
            未受け取り ({presents.filter(p => !p.claimed).length})
          </button>
          <button
            className={`filter-button ${filter === 'claimed' ? 'active' : ''}`}
            onClick={() => setFilter('claimed')}
          >
            受け取り済み ({presents.filter(p => p.claimed).length})
          </button>
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            すべて ({presents.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="sync-button"
            onClick={handleSync}
            disabled={syncing}
            title="配布情報を更新"
          >
            {syncing ? '🔄 同期中...' : '🔄 更新'}
          </button>
          
          {unclaimedCount > 0 && (
            <button
              className="claim-all-button"
              onClick={handleClaimAll}
              disabled={claimingAll}
            >
              {claimingAll ? '受け取り中...' : 'すべて受け取る'}
            </button>
          )}
        </div>
      </div>

      <div className="present-list">
        {filteredPresents.length === 0 ? (
          <div className="present-empty">
            {filter === 'unclaimed' && 'プレゼントはありません'}
            {filter === 'claimed' && '受け取り済みのプレゼントはありません'}
            {filter === 'all' && 'プレゼントボックスは空です'}
          </div>
        ) : (
          filteredPresents.map(present => {
            const isExpired = present.expiresAt && present.expiresAt < Date.now();
            
            return (
              <div
                key={present.id}
                className={`present-item ${present.claimed ? 'claimed' : ''} ${isExpired ? 'expired' : ''}`}
              >
                <div className="present-icon">
                  {present.claimed ? '✅' : '🎁'}
                </div>
                
                <div className="present-content">
                  <h3 className="present-title">{present.title}</h3>
                  <p className="present-description">{present.description}</p>
                  <div className="present-rewards">
                    <span className="rewards-label">報酬:</span>
                    <span className="rewards-text">{getRewardText(present)}</span>
                  </div>
                  <div className="present-meta">
                    <span className="present-date">
                      配布: {formatDate(present.createdAt)}
                    </span>
                    {present.expiresAt && (
                      <span className={`present-expiry ${isExpired ? 'expired' : ''}`}>
                        期限: {formatDate(present.expiresAt)}
                        {isExpired && ' (期限切れ)'}
                      </span>
                    )}
                    {present.claimed && present.claimedAt && (
                      <span className="present-claimed-date">
                        受け取り: {formatDate(present.claimedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {!present.claimed && !isExpired && (
                  <button
                    className="claim-button"
                    onClick={() => handleClaim(present.id)}
                    disabled={claimingIds.has(present.id)}
                  >
                    {claimingIds.has(present.id) ? '受け取り中...' : '受け取る'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
