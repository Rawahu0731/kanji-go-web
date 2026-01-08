import { useState, useEffect, useRef } from 'react';
import { type Item, type Level } from '../types/kanji';
import { loadKanjiData } from '../utils/dataLoader';
import { formatReadingWithOkurigana } from '../utils/kanjiUtils';
import './SimpleKanji.css';
import { FixedSizeList as List } from 'react-window';

type ViewMode = 'list' | 'quiz';

// 一覧表示コンポーネント
function ListView({ items }: { items: Item[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      setWidth(window.innerWidth || 800);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const CARD_WIDTH = 160;
  const CARD_HEIGHT = 200;
  const GAP = 12;

  const columnCount = Math.max(1, Math.floor((width + GAP) / (CARD_WIDTH + GAP)));
  const rowCount = Math.max(1, Math.ceil(items.length / columnCount));
  const listWidth = Math.floor(width);
  const listHeight = Math.min(800, rowCount * (CARD_HEIGHT + GAP));

  const Row = ({ index, style }: any) => {
    const from = index * columnCount;
    const cells = [];
    for (let i = 0; i < columnCount; i++) {
      const item = items[from + i];
      if (item) {
        cells.push(
          <div key={i} style={{ width: CARD_WIDTH, marginRight: GAP }}>
            <div className="simple-kanji-card">
              <img src={item.imageUrl} alt={item.filename} loading="lazy" decoding="async" />
              {item.additionalInfo && <div className="additional-info">{item.additionalInfo}</div>}
              <div className="reading">読み: {formatReadingWithOkurigana(item.reading)}</div>
            </div>
          </div>
        );
      } else {
        cells.push(<div key={i} style={{ width: CARD_WIDTH, marginRight: GAP }} />);
      }
    }

    return (
      <div style={{ ...style, display: 'flex', alignItems: 'flex-start' }}>
        {cells}
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <List
        height={listHeight}
        itemCount={rowCount}
        itemSize={CARD_HEIGHT + GAP}
        width={listWidth}
      >
        {Row}
      </List>
    </div>
  );
}

// 問題モードコンポーネント
function QuizView({ items, onBack }: { items: Item[]; onBack: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const currentItem = items[currentIndex];

  useEffect(() => {
    if (inputRef.current && !showResult) {
      inputRef.current.focus();
    }
  }, [currentIndex, showResult]);

  const normalizeAnswer = (answer: string): string => {
    return answer
      .trim()
      .toLowerCase()
      .replace(/[「」『』（）()]/g, '')
      .replace(/\s+/g, '');
  };

  const checkAnswer = () => {
    if (!currentItem) return;

    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const acceptableAnswers = [
      currentItem.reading,
      ...(currentItem.reading.includes('(') ? [currentItem.reading.split('(')[0].trim()] : []),
    ]
      .map(normalizeAnswer)
      .filter(Boolean);

    const correct = acceptableAnswers.some(acceptable => normalizedUserAnswer === acceptable);

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      // クイズ終了
      alert(`クイズ終了！\n正解: ${score.correct + (isCorrect ? 1 : 0)}問\n不正解: ${score.incorrect + (isCorrect ? 0 : 1)}問`);
      onBack();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showResult) {
      handleNext();
    } else {
      checkAnswer();
    }
  };

  if (!currentItem) {
    return <div>問題がありません</div>;
  }

  return (
    <div className="simple-quiz-container">
      <div className="simple-quiz-header">
        <button onClick={onBack} className="simple-back-button">戻る</button>
        <div className="simple-score">
          {currentIndex + 1} / {items.length} 問 | 正解: {score.correct} | 不正解: {score.incorrect}
        </div>
      </div>

      <div className="simple-quiz-content">
        <div className="simple-quiz-image">
          <img src={currentItem.imageUrl} alt={currentItem.filename} />
        </div>

        <form onSubmit={handleSubmit} className="simple-quiz-form">
          {!showResult ? (
            <>
              <label htmlFor="answer-input">この漢字の読みを答えてください:</label>
              <input
                id="answer-input"
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="読みを入力"
                disabled={showResult}
              />
              <button type="submit">回答</button>
            </>
          ) : (
            <div className={`simple-result ${isCorrect ? 'correct' : 'incorrect'}`}>
              <div className="simple-result-text">
                {isCorrect ? '✓ 正解！' : '✗ 不正解'}
              </div>
              {!isCorrect && (
                <div className="simple-correct-answer">
                  正解: {formatReadingWithOkurigana(currentItem.reading)}
                </div>
              )}
              <button type="submit" className="simple-next-button">次へ</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// メインコンポーネント
export default function SimpleKanji() {
  // ローカルストレージから前回のレベルを読み込む
  const getInitialLevel = (): Level => {
    const saved = localStorage.getItem('simpleKanjiLevel');
    if (saved) {
      const parsed = saved === 'extra' ? 'extra' : parseInt(saved);
      if ([4, 5, 6, 7, 8, 'extra'].includes(parsed as Level)) {
        return parsed as Level;
      }
    }
    return 7; // デフォルトはレベル7
  };

  const [selectedLevel, setSelectedLevel] = useState<Level>(getInitialLevel());
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    loadData();
  }, [selectedLevel]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadKanjiData(selectedLevel);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みエラー');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (items.length === 0) {
      alert('漢字データがありません');
      return;
    }
    // シャッフル
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setViewMode('quiz');
  };

  const levels: Level[] = [4, 5, 6, 7, 8, 'extra'];

  return (
    <div className="simple-kanji-root">
      <header className="simple-header">
        <h1>シンプル漢字学習</h1>
        <p>ゲーミフィケーション要素なしの漢字学習ページです</p>
      </header>

      {viewMode === 'list' ? (
        <>
          <div className="level-buttons">
            {levels.map(level => (
              <button
                key={level}
                onClick={() => {
                  setSelectedLevel(level);
                  localStorage.setItem('simpleKanjiLevel', String(level));
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

          <div className="simple-controls">
            <button onClick={startQuiz} className="start-quiz-button" disabled={loading || items.length === 0}>
              問題モード開始
            </button>
          </div>

          {loading && <div className="simple-loading">読み込み中...</div>}
          {error && <div className="simple-error">{error}</div>}

          {!loading && !error && items.length > 0 && (
            <div className="simple-list-container">
              <h2>漢字一覧 ({items.length}件)</h2>
              <ListView items={items} />
            </div>
          )}
        </>
      ) : (
        <QuizView items={items} onBack={() => setViewMode('list')} />
      )}
    </div>
  );
}
