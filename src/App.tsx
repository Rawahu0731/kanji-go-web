import { useState, useEffect } from 'react'
import './App.css'

type Item = {
  filename: string;
  reading: string;
  meaning?: string;
  imageUrl: string;
};

type Level = 4 | 5 | 6 | 7 | 8;
type Mode = 'list' | 'quiz';
type QuizFormat = 'input' | 'choice'; // 入力 or 四択

function App() {
  const [selectedLevel, setSelectedLevel] = useState<Level>(7);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 問題モード用のステート
  const [mode, setMode] = useState<Mode>('list');
  const [quizFormat, setQuizFormat] = useState<QuizFormat>('input'); // 問題形式
  const [quizItems, setQuizItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [choices, setChoices] = useState<string[]>([]); // 四択の選択肢
  // 単語帳モード: 一覧で読みを隠すかどうか
  const [studyMode, setStudyMode] = useState(false);
  // reveal 状態をファイル名（または imageUrl）をキーに管理
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  
  // 不具合情報の表示フラグ（true の場合、ページ上部にバナーを表示）
  const hasKnownIssues = false; // 修正完了のため false（必要に応じて true に変更）
  const [showIssueBanner, setShowIssueBanner] = useState(true); // バナーを閉じられるように
  
  // 四択: 正解のインデックスを保持（0-3）
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number>(-1);

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

      // レベル7以外は準備中
      if (selectedLevel !== 7 && selectedLevel !== 8) {
        setLoading(false);
        setError('準備中です');
        return;
      }

      try {
        // CSV を fetch
        const csvPath = `/kanji/level-${selectedLevel}/mappings.csv`;
        const res = await fetch(csvPath);
        if (!res.ok) {
          throw new Error(`CSV取得失敗: ${res.status}`);
        }
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift()?.split(',').map(h => h.trim().toLowerCase()) || [];
        const data = lines.map(line => {
          const cols = line.split(',');
          const obj: any = {};
          for (let i = 0; i < cols.length; i++) {
            obj[header[i] || `col${i}`] = cols[i].trim();
          }
          return obj;
        });

        // ヘッダ名は 'path' または 'filename' のどちらかが来る想定
        const filenameField = header.includes('path') ? 'path' : (header.includes('filename') ? 'filename' : header[0]);

        const mapped: Item[] = data.map(d => {
          const fname = d[filenameField];
          // CSV に画像パスが 'images/...' のように書かれているので、そのまま結合
          const imageUrl = fname?.startsWith('/') ? fname : `/kanji/level-${selectedLevel}/${fname}`;
          return {
            filename: fname,
            reading: d.reading || d['reading'] || '',
            meaning: d.meaning,
            imageUrl,
          } as Item;
        });
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
        choicesArray.push(correct);
      } else {
        choicesArray.push(wrongChoices[wrongIndex] || '');
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

  // 一覧モードに戻る
  const backToList = () => {
    setMode('list');
    setUserAnswer('');
    setShowResult(false);
  };

  // 解答をチェック
  const checkAnswer = () => {
    if (!quizItems[currentIndex]) return;
    
    const correctReading = quizItems[currentIndex].reading;
    // 正解が「、」で区切られている場合、いずれかに一致すればOK
    const correctOptions = correctReading.split('、').map(r => r.trim());
    const userInput = userAnswer.trim();
    const correct = correctOptions.includes(userInput);
    
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
  };

  // あきらめる（スキップ）: 不正解として扱い、正解を表示する
  const giveUp = () => {
    if (!quizItems[currentIndex]) return;
    setIsCorrect(false);
    setShowResult(true);
    setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
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

  const levels: Level[] = [4, 5, 6, 7, 8];

  return (
    <>
      {/* 不具合情報バナー */}
      {hasKnownIssues && showIssueBanner && (
        <div className="issue-banner">
          <div className="issue-banner-content">
            <span className="issue-icon">⚠️</span>
            <span className="issue-text">
              不具合が発生しています。詳細は
              <a href="/known-issues.html" target="_blank" rel="noopener noreferrer">こちら</a>
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

      <h1>漢字勉強サイト</h1>
      
      {/* レベル選択ボタン */}
      <div className="level-buttons">
        {levels.map(level => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`level-button ${selectedLevel === level ? 'active' : ''}`}
          >
            レベル{level}
          </button>
        ))}
      </div>

      {/* コンテンツ表示 */}
      {loading && <div className="loading">読み込み中…</div>}
      {error && <div className="error">{error}</div>}
      
      {/* 一覧モード */}
      {items && mode === 'list' && (
        <div>
          <div className="list-header">
            <p>レベル{selectedLevel}: {items.length}問</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
          <div className="card-grid">
            {items.map((it, i) => {
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
                      <div className="reading">読み: {it.reading}</div>
                    ) : (
                      <div className="hidden-reading">クリックで表示</div>
                    )
                  ) : (
                    <div className="reading">読み: {it.reading}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <div className="quiz-format-selector">
            <button
              onClick={() => {
                setQuizFormat('input');
                setUserAnswer('');
                setShowResult(false);
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
              }}
              className={`format-button ${quizFormat === 'choice' ? 'active' : ''}`}
            >
              四択形式
            </button>
          </div>

          <div className="quiz-card">
            <img 
              src={quizItems[currentIndex].imageUrl} 
              alt="問題の漢字" 
              className="quiz-image"
            />
            
            {quizFormat === 'input' ? (
              // 入力形式
              <div className="quiz-input-container">
                <label className="quiz-label">
                  この漢字の読みは？<br />（送り仮名も含めてすべて入力してください）
                </label>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !showResult) {
                      checkAnswer();
                    } else if (e.key === 'Enter' && showResult) {
                      nextQuestion();
                    }
                  }}
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
                          } else {
                            setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
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

            {!showResult && quizFormat === 'input' && (
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
                {!isCorrect && (
                  <div className="correct-answer">
                    正解: <span className="correct-answer-text">
                      {quizItems[currentIndex].reading}
                    </span>
                  </div>
                )}
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
        <a href="/disclaimer.html" target="_blank" rel="noopener noreferrer">免責事項</a>
        <span style={{ margin: '0 8px', color: '#c8ccd8' }}>|</span>
        <a href="/patch-notes.html" target="_blank" rel="noopener noreferrer">パッチノート</a>
        <span style={{ margin: '0 8px', color: '#c8ccd8' }}>|</span>
        <a href="/known-issues.html" target="_blank" rel="noopener noreferrer">既知の不具合</a>
      </footer>
    </>
  )
}

export default App
