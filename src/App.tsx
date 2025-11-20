import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getKnownIssues, getPatchNotes } from './lib/microcms'
import type { Article } from './lib/microcms'
import { useGamification } from './contexts/GamificationContext'
import { DebugPanel } from './components/DebugPanel'
import AuthButton from './components/AuthButton'
import './App.css'

type Item = {
  filename: string;
  reading: string;
  meaning?: string;
  imageUrl: string;
  additionalInfo?: string;
  components?: string; // 漢字の構成要素（例: "火,火" for 炎）
  kanji?: string; // エクストラ用: 画像なしで漢字文字を表示
  // エクストラ専用フィールド
  sentence?: string; // 問題文
  katakana?: string; // 漢字に変換するカタカナ部分
  answer?: string; // 正解の漢字
};

type Level = 4 | 5 | 6 | 7 | 8 | 'extra';
type Mode = 'list' | 'quiz';
type QuizFormat = 'input' | 'choice'; // 入力 or 四択

// CSV行をパースする関数（ダブルクォートで囲まれたカンマに対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// 読み方から送り仮名を抽出し、表示用にフォーマット
function formatReadingWithOkurigana(reading: string) {
  // 'で囲まれた部分を赤色にする
  const parts = [];
  let lastIndex = 0;
  const regex = /'([^']+)'/g;
  let match;
  let key = 0;
  
  while ((match = regex.exec(reading)) !== null) {
    // マッチ前の部分
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{reading.substring(lastIndex, match.index)}</span>
      );
    }
    // 送り仮名部分（赤色）
    parts.push(
      <span key={key++} style={{ color: '#ff6b6b' }}>{match[1]}</span>
    );
    lastIndex = regex.lastIndex;
  }
  
  // 残りの部分
  if (lastIndex < reading.length) {
    parts.push(
      <span key={key++}>{reading.substring(lastIndex)}</span>
    );
  }
  
  return <>{parts}</>;
}

// 読み方から送り仮名を除外した本体部分を取得
function extractReadingCore(reading: string): string {
  return reading.replace(/'[^']*'/g, '');
}

// XP/コイン獲得時のポップアップ表示
function showRewardPopup(xp: number, coins: number) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(102, 126, 234, 0.95);
    color: white;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    animation: rewardPop 0.6s ease-out;
    pointer-events: none;
  `;
  popup.innerHTML = `+${xp} XP &nbsp;&nbsp; +${coins} コイン`;
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.style.animation = 'rewardFade 0.3s ease-out forwards';
    setTimeout(() => popup.remove(), 300);
  }, 1000);
}

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
  `;
  document.head.appendChild(style);
}

function App() {
  const [selectedLevel, setSelectedLevel] = useState<Level>(7);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // デバッグモード裏コマンド用
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [debugTapTimer, setDebugTapTimer] = useState<number | null>(null);
  
  // ジャンル絞り込み用のステート
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
  
  // 検索機能のステート
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'reading' | 'component'>('reading');
  
  // 問題モード用のステート
  const [mode, setMode] = useState<Mode>('list');
  const [quizFormat, setQuizFormat] = useState<QuizFormat>('input'); // 問題形式
  const [quizItems, setQuizItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // 入力欄への参照
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ゲーミフィケーションシステム
  const { addXp, addCoins, updateStats, addCharacterXp, state: gamificationState, getTotalXpForNextLevel, getLevelProgress } = useGamification();
  const [choices, setChoices] = useState<string[]>([]); // 四択の選択肢
  // 単語帳モード: 一覧で読みを隠すかどうか
  const [studyMode, setStudyMode] = useState(false);
  // reveal 状態をファイル名（または imageUrl）をキーに管理
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  
  // 不具合情報バナー用のステート
  const [investigatingIssues, setInvestigatingIssues] = useState<Article[]>([]);
  const [showIssueBanner, setShowIssueBanner] = useState(true);
  
  // お知らせバナー用のステート
  const [latestAnnouncement, setLatestAnnouncement] = useState<Article | null>(null);
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState(false);
  
  // 四択: 正解のインデックスを保持（0-3）
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number>(-1);

  // 調査中の不具合を取得
  useEffect(() => {
    async function fetchInvestigatingIssues() {
      try {
        const issues = await getKnownIssues();
        // status が investigating のものだけフィルタ
        const investigating = issues.filter(issue => {
          const status = Array.isArray(issue.status) ? issue.status[0] : issue.status;
          return status === 'investigating';
        });
        setInvestigatingIssues(investigating);
      } catch (error) {
        console.error('不具合情報の取得に失敗:', error);
      }
    }
    
    fetchInvestigatingIssues();
  }, []);

  // 未読のお知らせをチェック
  useEffect(() => {
    async function checkUnreadAnnouncements() {
      try {
        const announcements = await getPatchNotes(1);
        if (announcements.length > 0) {
          const latest = announcements[0];
          const LAST_READ_KEY = 'last_read_announcement';
          const lastReadId = localStorage.getItem(LAST_READ_KEY);
          
          if (lastReadId !== latest.id) {
            setLatestAnnouncement(latest);
            setShowAnnouncementBanner(true);
          }
        }
      } catch (error) {
        console.error('お知らせの取得に失敗:', error);
      }
    }
    
    checkUnreadAnnouncements();
  }, []);

  // --- サービスワーカー登録: 画像キャッシュ用 ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // load イベント時に登録すると、公開ディレクトリの sw.js が確実に取得できる
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
    async function load() {
      setLoading(true);
      setError(null);
      setItems(null);

      // エクストラの期間限定チェック
      if (selectedLevel === 'extra') {
        // デバッグ用: URLパラメータで日時を上書き可能
        // 例: ?debugDate=2025-11-21
        const urlParams = new URLSearchParams(window.location.search);
        const debugDateStr = urlParams.get('debugDate');
        const now = debugDateStr ? new Date(debugDateStr) : new Date();
        
        const startDate = new Date('2025-11-21T00:00:00+09:00');
        const endDate = new Date('2025-12-05T23:59:59+09:00');
        
        console.log('エクストラ期間チェック:', {
          現在日時: now.toLocaleString('ja-JP'),
          開始日時: startDate.toLocaleString('ja-JP'),
          終了日時: endDate.toLocaleString('ja-JP'),
          期間内: now >= startDate && now <= endDate
        });
        
        if (now < startDate || now > endDate) {
          setLoading(false);
          setError(`エクストラモードは現在利用できません`);
          return;
        }
      }

      // レベル7, 8, extra以外は準備中
      if (selectedLevel !== 7 && selectedLevel !== 8 && selectedLevel !== 'extra') {
        setLoading(false);
        setError('準備中です');
        return;
      }

      try {
        // CSV を fetch
        const csvPath = selectedLevel === 'extra' 
          ? `/kanji/extra/mappings.csv`
          : `/kanji/level-${selectedLevel}/mappings.csv`;
        const res = await fetch(csvPath);
        if (!res.ok) {
          throw new Error(`CSV取得失敗: ${res.status}`);
        }
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(Boolean);
        
        // ヘッダー行を解析
        const headerLine = lines.shift() || '';
        const header = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
        
        const data = lines.map(line => {
          const cols = parseCSVLine(line);
          const obj: any = {};
          for (let i = 0; i < cols.length; i++) {
            obj[header[i] || `col${i}`] = cols[i].trim();
          }
          return obj;
        });

        let mapped: Item[];
        
        if (selectedLevel === 'extra') {
          // エクストラモード: sentence, katakana, answer 形式
          mapped = data.map(d => ({
            filename: d.answer || '',
            reading: d.answer || '',
            meaning: '',
            imageUrl: '',
            sentence: d.sentence || '',
            katakana: d.katakana || '',
            answer: d.answer || '',
          } as Item));
        } else {
          // 通常のレベル（4-8）
          const filenameField = header.includes('path') ? 'path' : (header.includes('filename') ? 'filename' : header[0]);
          const kanjiField = header.includes('kanji') ? 'kanji' : null;

          mapped = data.map(d => {
            const fname = d[filenameField];
            const kanjiChar = kanjiField ? d[kanjiField] : null;
            const imageUrl = fname?.startsWith('/') ? fname : `/kanji/level-${selectedLevel}/${fname}`;
            
            return {
              filename: fname || kanjiChar || '',
              reading: d.reading || d['reading'] || '',
              meaning: d.meaning,
              imageUrl,
              kanji: kanjiChar || null,
              additionalInfo: d.additional_info || d['additional_info'] || '',
              components: d.components || d['components'] || '',
            } as Item;
          });
        }
        setItems(mapped);
      } catch (err) {
        console.error('読み込み失敗', err);
        setError('読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedLevel]);

  // 問題モードを開始
  const startQuiz = () => {
    if (!items || items.length === 0) return;
    
    // シャッフル
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setQuizItems(shuffled);
    setCurrentIndex(0);
    setUserAnswer('');
    setShowResult(false);
    setScore({ correct: 0, incorrect: 0 });
    setCurrentStreak(0);
    setMode('quiz');
  };

  // 四択の選択肢を生成（正解のインデックスも返す）
  const generateChoices = (correctItem: Item, allItems: Item[]): { choices: string[], correctIndex: number } => {
    const correct = correctItem.reading;
    const others = allItems.filter(it => it.reading !== correct);
    const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
    const wrongChoices = shuffledOthers.slice(0, 3).map(it => it.reading);
    
    // 正解を含む4つの選択肢を作成
    const correctIndex = Math.floor(Math.random() * 4); // 0-3 のランダムな位置
    const choicesArray: string[] = [];
    let wrongIndex = 0;
    
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) {
        // 正解の選択肢から送り仮名を除外
        choicesArray.push(extractReadingCore(correct));
      } else {
        // 不正解の選択肢からも送り仮名を除外
        choicesArray.push(extractReadingCore(wrongChoices[wrongIndex] || ''));
        wrongIndex++;
      }
    }
    
    return { choices: choicesArray, correctIndex };
  };

  // 問題が変わったとき、四択の選択肢を更新
  useEffect(() => {
    if (mode === 'quiz' && quizFormat === 'choice' && quizItems.length > 0 && quizItems[currentIndex]) {
      const result = generateChoices(quizItems[currentIndex], quizItems);
      setChoices(result.choices);
      setCorrectChoiceIndex(result.correctIndex);
    }
  }, [mode, quizFormat, quizItems, currentIndex]);

  // 問題が変わったとき、または結果をクリアしたときに入力欄にフォーカス
  useEffect(() => {
    if (mode === 'quiz' && quizFormat === 'input' && !showResult && inputRef.current) {
      // 少し遅延させることで、DOM更新後に確実にフォーカス
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [mode, quizFormat, currentIndex, showResult]);

  // カードがクリックされたとき（単語帳モード時は読みを表示/非表示）
  const handleCardClick = (it: Item) => {
    if (!studyMode) return;
    const key = it.filename || it.imageUrl;
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // デバッグモード起動用の裏コマンド: タイトルを10回タップ
  const handleTitleTap = () => {
    // 既存のタイマーをクリア
    if (debugTapTimer) {
      clearTimeout(debugTapTimer);
    }

    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);

    if (newCount >= 10) {
      // 10回タップでデバッグモードを起動
      window.dispatchEvent(new Event('activateDebugMode'));
      setDebugTapCount(0);
      setDebugTapTimer(null);
    } else {
      // 2秒以内に次のタップがなければカウントをリセット
      const timer = setTimeout(() => {
        setDebugTapCount(0);
        setDebugTapTimer(null);
      }, 2000);
      setDebugTapTimer(timer);
    }
  };

  // 一覧モードに戻る
  const backToList = () => {
    setMode('list');
    setUserAnswer('');
    setShowResult(false);
  };

  // 解答をチェック
  const checkAnswer = () => {
    if (!quizItems[currentIndex]) return;
    
    let correct = false;
    const userInput = userAnswer.trim();
    
    if (selectedLevel === 'extra') {
      // エクストラモード: 正解の漢字と完全一致
      correct = userInput === quizItems[currentIndex].answer;
    } else {
      // 通常モード: 読みを答える
      const correctReading = quizItems[currentIndex].reading;
      // 正解が「、」で区切られている場合、いずれかに一致すればOK
      const correctOptions = correctReading.split('、').map(r => r.trim());
      
      // 各正解オプションについて、送り仮名を除いた部分で照合
      correct = correctOptions.some(option => {
        const coreReading = extractReadingCore(option);
        return userInput === coreReading;
      });
    }
    
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      
      // XPとコインを付与（入力形式は難しいので報酬が多い）
      const xpGain = 150;
      const coinGain = 100;
      addXp(xpGain);
      addCoins(coinGain);
      
      // キャラクターに経験値を付与（入力形式: 20XP）
      addCharacterXp(20);
      
      // ストリーク更新
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      
      // 統計更新
      updateStats({
        totalQuizzes: gamificationState.stats.totalQuizzes + 1,
        correctAnswers: gamificationState.stats.correctAnswers + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(gamificationState.stats.bestStreak, newStreak)
      });
      
      // XP/コイン獲得の視覺的フィードバック
      showRewardPopup(xpGain, coinGain);
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      
      // ストリークリセット
      setCurrentStreak(0);
      
      // 統計更新
      updateStats({
        totalQuizzes: gamificationState.stats.totalQuizzes + 1,
        incorrectAnswers: gamificationState.stats.incorrectAnswers + 1,
        currentStreak: 0
      });
    }
  };

  // あきらめる（スキップ）: 不正解として扱い、正解を表示する
  const giveUp = () => {
    if (!quizItems[currentIndex]) return;
    setIsCorrect(false);
    setShowResult(true);
    setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    
    // ストリークリセット
    setCurrentStreak(0);
    
    // 統計更新
    updateStats({
      totalQuizzes: gamificationState.stats.totalQuizzes + 1,
      incorrectAnswers: gamificationState.stats.incorrectAnswers + 1,
      currentStreak: 0
    });
  };

  // 次の問題へ
  const nextQuestion = () => {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      // 終了
      // score は既に各問題で更新済みのためそのまま表示
      alert(`問題終了！\n正解: ${score.correct}問\n不正解: ${score.incorrect}問`);
      backToList();
    }
  };

  // Enterキーの処理: 未解答なら解答チェック、結果表示中なら次へ
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && mode === 'quiz') {
        if (showResult) {
          // 結果表示中なら次の問題へ
          e.preventDefault();
          if (currentIndex < quizItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserAnswer('');
            setShowResult(false);
          } else {
            // 終了
            alert(`問題終了！\n正解: ${score.correct}問\n不正解: ${score.incorrect}問`);
            setMode('list');
            setUserAnswer('');
            setShowResult(false);
          }
        } else if (quizFormat === 'input') {
          // 入力形式の場合
          e.preventDefault();
          if (userAnswer.trim()) {
            // 入力がある場合は解答チェック
            const submitButton = document.querySelector('.submit-button') as HTMLButtonElement;
            if (submitButton && !submitButton.disabled) {
              submitButton.click();
            }
          } else {
            // 入力が空の場合は諦める
            const giveUpButton = document.querySelector('.give-up-button') as HTMLButtonElement;
            if (giveUpButton) {
              giveUpButton.click();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResult, mode, currentIndex, quizItems.length, score, quizFormat, userAnswer]);

  const levels: Level[] = [4, 5, 6, 7, 8, 'extra'];

  return (
    <>
      {/* ゲーミフィケーションヘッダー */}
      <div className="gamification-header">
        <div className="player-stats-bar">
          <Link to="/profile" className="header-profile-icon" title={gamificationState.username}>
            {gamificationState.activeIcon === 'custom' && gamificationState.customIconUrl ? (
              <img 
                src={gamificationState.customIconUrl} 
                alt="アイコン"
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
              {gamificationState.xp.toLocaleString()} / {getTotalXpForNextLevel().toLocaleString()} XP
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">💰</span>
            <span className="stat-value">{gamificationState.coins}</span>
          </div>
        </div>
        <div className="nav-links">
          <Link to="/profile" className="nav-link">プロフィール</Link>
          <Link to="/characters" className="nav-link">⭐ キャラクター</Link>
          <Link to="/shop" className="nav-link">ショップ</Link>
          <Link to="/collection" className="nav-link">📚 コレクション</Link>
          <Link to="/story" className="nav-link">ストーリー</Link>
          <Link to="/ranking" className="nav-link">🏆 ランキング</Link>
        </div>
        <div className="auth-section">
          <AuthButton />
        </div>
      </div>

      {/* 未読のお知らせバナー */}
      {showAnnouncementBanner && latestAnnouncement && (
        <div className="issue-banner">
          <div className="issue-banner-content">
            <span className="issue-icon">📢</span>
            <span className="issue-text">
              新しいお知らせがあります：{latestAnnouncement.title}
              <Link to="/announcements" style={{ color: '#fff', textDecoration: 'underline', marginLeft: '0.5rem' }}>詳細を見る</Link>
            </span>
            <button
              className="issue-close"
              onClick={() => {
                setShowAnnouncementBanner(false);
                localStorage.setItem('last_read_announcement', latestAnnouncement.id);
              }}
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 不具合情報バナー */}
      {investigatingIssues.length > 0 && showIssueBanner && (
        <div className="issue-banner">
          <div className="issue-banner-content">
            <span className="issue-icon">⚠️</span>
            <span className="issue-text">
              現在不具合が発生しています。詳細は
              <Link to="/known-issues" style={{ color: '#fff', textDecoration: 'underline', marginLeft: '0.3rem' }}>こちら</Link>
            </span>
            <button
              className="issue-close"
              onClick={() => setShowIssueBanner(false)}
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <h1 
        onClick={handleTitleTap}
        style={{ cursor: 'default', userSelect: 'none' }}
        title=""
      >
        漢字勉強サイト
      </h1>
      
      {/* レベル選択ボタン */}
      <div className="level-buttons">
        {levels.map(level => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
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

      {/* コンテンツ表示 */}
      {loading && <div className="loading">読み込み中…</div>}
      {error && <div className="error">{error}</div>}
      
      {/* 一覧モード */}
      {items && mode === 'list' && (() => {
        // 定義済みジャンルのリスト（'all'と'ジャンルなし'を除く）
        const definedGenres = [
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
        
        // ジャンルでフィルタリング
        let filteredItems = selectedGenre === 'all' 
          ? items 
          : selectedGenre === 'ジャンルなし'
          ? items.filter(item => {
              const info = item.additionalInfo || '';
              // 定義済みジャンルのいずれも含まれていないものを抽出
              return !definedGenres.some(genre => info.includes(genre));
            })
          : items.filter(item => {
              const info = item.additionalInfo || '';
              // ジャンル名が含まれているかチェック
              return info.includes(selectedGenre);
            });
        
        // 検索機能: 検索クエリでさらにフィルタリング
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          filteredItems = filteredItems.filter(item => {
            if (searchMode === 'reading') {
              // 送り仮名検索: 'で囲まれた部分（赤い部分）のみを抽出して検索
              const okuriganaMatches = item.reading.match(/'([^']+)'/g);
              if (!okuriganaMatches) return false;
              const okuriganaText = okuriganaMatches.map(m => m.replace(/'/g, '')).join('');
              return okuriganaText.toLowerCase().includes(query);
            } else {
              // 構成要素検索: componentsフィールドをスペースで分割して各要素で検索
              const components = item.components || '';
              const componentList = components.split(/\s+/).filter(c => c).map(c => c.trim().toLowerCase());
              return componentList.some(component => component.includes(query));
            }
          });
        }
        
        return (
        <div>
          <div className="list-header">
            <p>
              レベル{selectedLevel}: {filteredItems.length}問 {selectedGenre !== 'all' && `(${selectedGenre})`}
              {selectedLevel === 'extra' && (
                <span style={{ 
                  display: 'block', 
                  fontSize: '0.85em', 
                  color: '#667eea',
                  marginTop: '4px',
                  fontWeight: 'bold'
                }}>
                  ⏰ 期間限定: 2025/11/21 00:00 〜 2025/12/5 23:59
                </span>
              )}
            </p>
            
            {/* 検索ボックス（エクストラ以外） */}
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
                    setSearchQuery(''); // モード切替時に検索クエリをクリア
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
              {/* ジャンル選択ドロップダウン（エクストラ以外） */}
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
                  setRevealed(new Set());
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
          {/* エクストラモードのリスト表示 */}
          {selectedLevel === 'extra' ? (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {filteredItems.map((it, i) => {
                const key = it.answer || String(i);
                const isRevealed = revealed.has(key);
                return (
                <div
                  key={i}
                  className={studyMode ? 'clickable' : ''}
                  onClick={() => studyMode && handleCardClick({ ...it, filename: key })}
                  style={{
                    padding: '20px 24px',
                    margin: '16px 0',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: studyMode ? 'pointer' : 'default',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (studyMode) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (studyMode) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  <div 
                    style={{ marginBottom: '12px', fontSize: '20px', lineHeight: '1.8' }}
                    dangerouslySetInnerHTML={{
                      __html: it.sentence?.replace(
                        it.katakana || '',
                        `<span class="katakana-highlight">${it.katakana}</span>`
                      ) || ''
                    }}
                  />
                  {studyMode ? (
                    isRevealed ? (
                      <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '22px', marginTop: '8px' }}>
                        答え: {it.answer}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontSize: '18px', fontStyle: 'italic' }}>
                        クリックで表示
                      </div>
                    )
                  ) : (
                    <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '22px', marginTop: '8px' }}>
                      {it.katakana} → {it.answer}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            /* 通常レベルのグリッドレイアウト */
            <div className="card-grid">
              {filteredItems.map((it, i) => {
                const key = it.filename || it.imageUrl;
                const isRevealed = revealed.has(key);
                return (
                  <div
                    key={i}
                    className={`kanji-card ${studyMode ? 'clickable' : ''}`}
                    onClick={() => handleCardClick(it)}
                  >
                    <img src={it.imageUrl} alt={it.filename} />
                    {studyMode ? (
                      isRevealed ? (
                        <>
                          {it.additionalInfo && (
                            <div className="additional-info">{it.additionalInfo}</div>
                          )}
                          <div className="reading">読み: {formatReadingWithOkurigana(it.reading)}</div>
                        </>
                      ) : (
                        <div className="hidden-reading">クリックで表示</div>
                      )
                    ) : (
                      <>
                        {it.additionalInfo && (
                          <div className="additional-info">{it.additionalInfo}</div>
                        )}
                        <div className="reading">読み: {formatReadingWithOkurigana(it.reading)}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        );
      })()}

      {/* 問題モード */}
      {mode === 'quiz' && quizItems.length > 0 && (
        <div className="quiz-container">
          <div className="quiz-header">
            <button onClick={backToList} className="back-button">
              ← 一覧に戻る
            </button>
            <div className="quiz-progress">
              問題 {currentIndex + 1} / {quizItems.length}
            </div>
            <div className="quiz-score">
              正解: {score.correct} | 不正解: {score.incorrect}
            </div>
          </div>

          {/* 問題形式の選択 */}
          {selectedLevel !== 'extra' && (
          <div className="quiz-format-selector">
            <button
              onClick={() => {
                setQuizFormat('input');
                setUserAnswer('');
                setShowResult(false);
                nextQuestion(); // 新しい問題を取得
              }}
              className={`format-button ${quizFormat === 'input' ? 'active' : ''}`}
            >
              入力形式
            </button>
            <button
              onClick={() => {
                setQuizFormat('choice');
                setUserAnswer('');
                setShowResult(false);
                nextQuestion(); // 新しい問題を取得
              }}
              className={`format-button ${quizFormat === 'choice' ? 'active' : ''}`}
            >
              四択形式
            </button>
          </div>
          )}

          <div className="quiz-card">
            {selectedLevel === 'extra' ? (
              // エクストラ用の問題表示
              <div className="extra-quiz-content">
                <div 
                  className="extra-quiz-sentence"
                  dangerouslySetInnerHTML={{ 
                    __html: quizItems[currentIndex].sentence?.replace(
                      quizItems[currentIndex].katakana || '',
                      `<span class="katakana-highlight-large">${quizItems[currentIndex].katakana}</span>`
                    ) || '' 
                  }}
                />
                <div className="quiz-input-container">
                  <label className="quiz-label">
                    ハイライトされたカタカナを漢字に変換してください
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={showResult}
                    className="quiz-input"
                    placeholder="漢字で入力"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              // 通常レベルの問題表示
              <>
            <img 
              src={quizItems[currentIndex].imageUrl} 
              alt="問題の漢字" 
              className="quiz-image"
            />
            
            {quizFormat === 'input' ? (
              // 入力形式
              <div className="quiz-input-container">
                <label className="quiz-label">
                  この漢字の読みは？<br />（送り仮名（''で囲まれた部分）は入力しなくてもOK）
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={showResult}
                  className="quiz-input"
                  placeholder="ひらがなで入力"
                  autoFocus
                />
              </div>
            ) : (
              // 四択形式
              <div className="quiz-choices-container">
                <label className="quiz-label">
                  この漢字の読みは？（選択肢から選んでください）
                </label>
                <div className="quiz-choices">
                  {choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!showResult) {
                          setUserAnswer(choice);
                          // インデックスで正解判定（文字列比較を使わない）
                          const correct = idx === correctChoiceIndex;
                          setIsCorrect(correct);
                          setShowResult(true);
                          
                          if (correct) {
                            setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
                            
                            // XPとコインを付与（四択形式は簡単なので報酬が少ない）
                            const xpGain = 50;
                            const coinGain = 30;
                            addXp(xpGain);
                            addCoins(coinGain);
                            
                            // キャラクターに経験値を付与（四択形式: 5XP）
                            addCharacterXp(5);
                            
                            // ストリーク更新
                            addCharacterXp(5);
                            
                            // ストリーク更新
                            const newStreak = currentStreak + 1;
                            setCurrentStreak(newStreak);
                            
                            // 統計更新
                            updateStats({
                              totalQuizzes: gamificationState.stats.totalQuizzes + 1,
                              correctAnswers: gamificationState.stats.correctAnswers + 1,
                              currentStreak: newStreak,
                              bestStreak: Math.max(gamificationState.stats.bestStreak, newStreak)
                            });
                            
                            showRewardPopup(xpGain, coinGain);
                          } else {
                            setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
                            
                            // ストリークリセット
                            setCurrentStreak(0);
                            
                            // 統計更新
                            updateStats({
                              totalQuizzes: gamificationState.stats.totalQuizzes + 1,
                              incorrectAnswers: gamificationState.stats.incorrectAnswers + 1,
                              currentStreak: 0
                            });
                          }
                        }
                      }}
                      disabled={showResult}
                      className={`choice-button ${
                        showResult && idx === correctChoiceIndex ? 'correct-choice' : ''
                      } ${
                        showResult && choice === userAnswer && !isCorrect ? 'wrong-choice' : ''
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
            )}

            {!showResult && (selectedLevel === 'extra' || quizFormat === 'input') && (
              <div className="quiz-buttons">
                <button
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim()}
                  className="submit-button"
                >
                  解答する
                </button>
                <button onClick={giveUp} className="give-up-button">
                  あきらめる
                </button>
              </div>
            )}
            
            {showResult && (
              <div className="result-container">
                <div className={`result-message ${isCorrect ? 'correct' : 'incorrect'}`}>
                  {isCorrect ? '✓ 正解！' : '✗ 不正解'}
                </div>
                <div className="correct-answer">
                  {selectedLevel === 'extra' ? (
                    <>
                      {isCorrect ? '答え: ' : '正解: '}
                      <span className="correct-answer-text">{quizItems[currentIndex].answer}</span>
                    </>
                  ) : (
                    <>
                      {isCorrect ? '読み方: ' : '正解: '}
                      <span className="correct-answer-text">
                        {formatReadingWithOkurigana(quizItems[currentIndex].reading)}
                      </span>
                    </>
                  )}
                </div>
                <button onClick={nextQuestion} className="next-button">
                  {currentIndex < quizItems.length - 1 ? '次の問題へ' : '終了'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター: 免責事項・パッチノートへのリンク */}
      <footer className="app-footer" style={{ marginTop: '2.5rem' }}>
        <Link to="/announcements">お知らせ</Link>
        <span style={{ margin: '0 8px', color: '#c8ccd8' }}>|</span>
        <a href="/disclaimer.html" target="_blank" rel="noopener noreferrer">免責事項</a>
        <span style={{ margin: '0 8px', color: '#c8ccd8' }}>|</span>
        <a href="/patch-notes.html" target="_blank" rel="noopener noreferrer">パッチノート</a>
        <span style={{ margin: '0 8px', color: '#c8ccd8' }}>|</span>
        <Link to="/known-issues">不具合情報</Link>
      </footer>

      {/* デバッグパネル */}
      <DebugPanel />
    </>
  )
}

export default App
