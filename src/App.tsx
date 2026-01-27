import { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
// microCMS integration removed (banners and present box disabled)
import { useGamification } from './contexts/GamificationContext'
import AuthButton from './components/AuthButton'
import { DebugPanel } from './components/DebugPanel'
import './App.css'
import { type Item, type Level, type Mode } from './types/kanji'
import { loadKanjiData } from './utils/dataLoader'
import * as BN from './utils/bigNumber'

const QuizMode = lazy(() => import('./components/QuizMode'));
const ListMode = lazy(() => import('./components/ListMode'));

// アニメーション定義
if (typeof document !== 'undefined' && !document.getElementById('reward-animations')) {
  const style = document.createElement('style');
  style.id = 'reward-animations';
  style.textContent = `
    @keyframes rewardPop {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes rewardFade {
      to { opacity: 0; transform: translate(-50%, -60%) scale(0.8); }
    }
    @keyframes rewardPopTR {
      0% { transform: translateY(-8px) scale(0.96); opacity: 0; }
      60% { transform: translateY(0) scale(1.02); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes rewardFadeTR {
      to { opacity: 0; transform: translateY(-12px) scale(0.98); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}


function App() {
  // ローカルストレージから前回のレベルを読み込む
  const getInitialLevel = (): Level => {
    const saved = localStorage.getItem('selectedLevel');
    if (saved) {
      const parsed = saved === 'extra' ? 'extra' : parseInt(saved);
      if ([4, 5, 6, 7, 8, 'extra'].includes(parsed as Level)) {
        return parsed as Level;
      }
    }
    return 7; // デフォルトはレベル7
  };

  const [selectedLevel, setSelectedLevel] = useState<Level>(getInitialLevel());
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [debugTapTimer, setDebugTapTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const genres = [
    'all',
    'ジャンルなし',
    '動物',
    '植物・藻類',
    '地名・建造物',
    '人名',
    'スラング',
    '飲食',
    '単位',
    '演目・外題',
    '則天文字',
    'チュノム',
    '元素',
    '嘘字',
    '簡体字',
    '文学の漢字',
    '字義未詳',
    '西夏文字'
  ];
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'reading' | 'component'>('reading');
  
  const [mode, setMode] = useState<Mode>('list');
  const [studyMode, setStudyMode] = useState(false);
  
  // Issue/announcement banners removed

  const { 
    getSkillLevel,
    state: gamificationState,
    isMedalSystemEnabled,
    getTotalXpForNextLevel, 
    getLevelProgress,
    initializing,
    isCollectionComplete
  } = useGamification();

  // microCMS sync removed (PresentBox removed)
  // 調査中の不具合を取得
  // Investigating issues banner removed

  // Announcement banner removed

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('ServiceWorker registered:', reg);
          })
          .catch((err) => {
            console.warn('ServiceWorker registration failed:', err);
          });
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      setLoading(true);
      setError(null);
      setItems(null);

      try {
        const data = await loadKanjiData(selectedLevel);
        if (!cancelled) {
          setItems(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('読み込み失敗', err);
          setError(err.message || '読み込みに失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (typeof (window as any).requestIdleCallback === 'function') {
      idleId = (window as any).requestIdleCallback(() => {
        load();
      }, { timeout: 500 });
    } else {
      timeoutId = setTimeout(() => {
        load();
      }, 300);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedLevel]);

  const startQuiz = () => {
    if (!items || items.length === 0) return;
    setLoading(true);
    // setMode は同期的に行っても良い。QuizMode が準備できたら onReady で loading を解除する。
    setMode('quiz');
  };

  const startEndlessWithZero = async () => {
    // load level 7 and 8 and combine
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const [lv7, lv8] = await Promise.all([loadKanjiData(7), loadKanjiData(8)]);
      const combined = [...lv7, ...lv8];
      // shuffle combined for randomness
      try {
        // lightweight shuffle: use sort with random for now
        combined.sort(() => Math.random() - 0.5);
      } catch (e) {
        // ignore
      }
      setItems(combined);
      setMode('endless');
    } catch (err: any) {
      console.error('エンドレスモード読み込み失敗', err);
      setError(err?.message || 'エンドレスモードの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const backToList = () => {
    setMode('list');
  };

  const handleTitleTap = () => {
    // If player has zero equipped, start endless mode
    if (gamificationState.equippedCharacter && gamificationState.equippedCharacter.id === 'zero') {
      startEndlessWithZero();
      return;
    }

    if (debugTapTimer) {
      clearTimeout(debugTapTimer);
    }

    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);

    if (newCount >= 10) {
      window.dispatchEvent(new Event('activateDebugMode'));
      setDebugTapCount(0);
      setDebugTapTimer(null);
    } else {
      const timer = setTimeout(() => {
        setDebugTapCount(0);
        setDebugTapTimer(null);
      }, 2000);
      setDebugTapTimer(timer);
    }
  };

  const levels: Level[] = [4, 5, 6, 7, 8, 'extra'];

  return (
    <>
      <div className="gamification-header">
        <div className="player-stats-bar">
          <Link to="/profile" className="header-profile-icon" title={gamificationState.username}>
            {gamificationState.activeIcon === 'custom' && gamificationState.customIconUrl ? (
              <img 
                src={gamificationState.customIconUrl} 
                alt="アイコン"
                loading="lazy"
                decoding="async"
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
                {gamificationState.activeIcon === 'default' ? '👤' : 
                 gamificationState.activeIcon === 'icon_fire' ? '🔥' :
                 gamificationState.activeIcon === 'icon_star' ? '⭐' :
                 gamificationState.activeIcon === 'icon_dragon' ? '🐉' :
                 gamificationState.activeIcon === 'icon_crown' ? '👑' :
                 gamificationState.activeIcon === 'icon_ninja' ? '🥷' :
                 gamificationState.activeIcon === 'icon_wizard' ? '🧙' :
                 gamificationState.activeIcon === 'icon_samurai' ? '⚔️' :
                 gamificationState.activeIcon === 'icon_robot' ? '🤖' :
                 gamificationState.activeIcon === 'icon_cherry_blossom' ? '🌸' : '👤'}
              </>
            )}
          </Link>
          <div className="header-username">{gamificationState.username}</div>
          <div className="stat-item">
            <span className="stat-label">レベル</span>
            <span className="stat-value">{gamificationState.level}</span>
          </div>
          <div className="xp-progress">
            <div className="xp-bar-bg">
              <div 
                className="xp-bar-fill" 
                style={{ width: `${getLevelProgress()}%` }}
              ></div>
            </div>
            <span className="xp-text">
              {BN.toString(BN.ensureBigNumber(gamificationState.totalXp))} / {BN.toString(BN.fromNumber(getTotalXpForNextLevel()))} XP
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">💰</span>
            <span className="stat-value">{gamificationState.coins}</span>
          </div>
          {isMedalSystemEnabled && isCollectionComplete() && (
            <div className="stat-item">
              <span className="stat-label">🪙</span>
              <span className="stat-value">{gamificationState.medals}</span>
            </div>
          )}
        </div>
        <div className="nav-links">
          <Link to="/profile" className="nav-link">プロフィール</Link>
          <Link to="/characters" className="nav-link">⭐ キャラクター</Link>
          {/* プレゼントリンク削除 */}
          <Link to="/shop" className="nav-link">ショップ</Link>
          {isCollectionComplete() && (
            <Link to="/skill-tree" className="nav-link">🌳 スキルツリー</Link>
          )}
          {typeof getSkillLevel === 'function' && getSkillLevel('unlock_rotation') > 0 && (
            <Link to="/revolution" className="nav-link">回転</Link>
          )}
          <Link to="/collection" className="nav-link">📚 コレクション</Link>
          {isCollectionComplete() && (
            <Link to="/collection-plus" className="nav-link">🪙 コレクション+</Link>
          )}
          {gamificationState.hasStoryInvitation && (
            <Link to="/title" className="nav-link">ストーリー</Link>
          )}
          {/* ランキング機能を削除しました */}
        </div>
        <div className="auth-section">
          <AuthButton />
        </div>
      </div>

      {/* Issue and announcement banners removed */}

      <img
        src="/kanji_logo.png"
        alt="漢字勉強サイト"
        onClick={handleTitleTap}
        className="site-logo"
        loading="lazy"
        decoding="async"
        style={{ cursor: 'default', userSelect: 'none' }}
      />
      
      <div className="level-buttons">
        {levels.map(level => (
          <button
            key={level}
            onClick={() => {
              setSelectedLevel(level);
              localStorage.setItem('selectedLevel', String(level));
            }}
            className={`level-button ${selectedLevel === level ? 'active' : ''}`}
          >
            {level === 'extra' ? (
              <>
                エクストラ
                <span style={{ 
                  fontSize: '0.75em', 
                  display: 'block', 
                  marginTop: '2px',
                  fontWeight: 'normal',
                  opacity: 0.9
                }}>
                  期間限定
                </span>
              </>
            ) : (
              `レベル${level}`
            )}
          </button>
        ))}
      </div>

      {(initializing || loading) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.95)',
          zIndex: 9999
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 12 }}>読み込み中…</div>
            <div style={{ width: 48, height: 48, margin: '0 auto', borderRadius: 24, border: '6px solid #eee', borderTopColor: '#4f46e5', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      
      {items && mode === 'list' && (
        <div>
          <div className="list-header">
            <p>
              レベル{selectedLevel}: {items.length}問 {selectedGenre !== 'all' && `(${selectedGenre})`}
              {selectedLevel === 'extra' && (
                <span style={{ 
                  display: 'block', 
                  fontSize: '0.85em', 
                  color: '#667eea',
                  marginTop: '4px',
                  fontWeight: 'bold'
                }}>
                  ⏰ 期間限定: 2026/01/13 00:00 〜 2026/01/26 23:59
                </span>
              )}
            </p>
            
            {selectedLevel !== 'extra' && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label htmlFor="search-mode-select" style={{ fontWeight: 600, color: '#333' }}>
                    検索モード:
                  </label>
                  <select
                    id="search-mode-select"
                    value={searchMode}
                    onChange={(e) => {
                      setSearchMode(e.target.value as 'reading' | 'component');
                      setSearchQuery('');
                    }}
                    className="genre-select"
                  >
                    <option value="reading">送り仮名検索</option>
                    <option value="component">構成要素検索</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchMode === 'reading' ? '送り仮名で検索（例: しい）' : '構成要素で検索（例: 火）'}
                  className="search-input"
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    minWidth: '250px'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="clear-search-button"
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    検索クリア
                  </button>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {selectedLevel !== 'extra' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label htmlFor="genre-select" style={{ fontWeight: 600, color: '#333' }}>
                    ジャンル:
                  </label>
                  <select
                    id="genre-select"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="genre-select"
                  >
                    {genres.map(genre => (
                      <option key={genre} value={genre}>
                        {genre === 'all' ? 'すべて' : genre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <button
                onClick={() => {
                  setStudyMode(prev => !prev);
                }}
                className={`study-toggle ${studyMode ? 'active' : ''}`}
                aria-pressed={studyMode}
              >
                単語帳モード: {studyMode ? 'ON' : 'OFF'}
              </button>

              <button onClick={startQuiz} className="start-quiz-button">
                問題モード開始
              </button>
            </div>
          </div>
          
          <Suspense fallback={<div className="loading">読み込み中…</div>}>
            <ListMode 
              items={items}
              selectedLevel={selectedLevel}
              selectedGenre={selectedGenre}
              searchQuery={searchQuery}
              searchMode={searchMode}
              studyMode={studyMode}
            />
          </Suspense>
        </div>
      )}

      {items && (mode === 'quiz' || mode === 'endless') && (
        <Suspense fallback={<div className="loading">読み込み中…</div>}>
          <QuizMode 
            items={items}
            selectedLevel={selectedLevel}
            onBack={backToList}
            onReady={() => setLoading(false)}
            endless={mode === 'endless'}
          />
        </Suspense>
      )}

      <footer className="app-footer" style={{ marginTop: '2.5rem' }}>
        {/* Footer links removed */}
      </footer>
      
      <DebugPanel />

    </>
  )
}

export default App
