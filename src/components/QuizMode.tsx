import { useState, useEffect, useRef, memo } from 'react';
import { type Item, type QuizFormat, type Level } from '../types/kanji';
import { formatReadingWithOkurigana, extractReadingCore, readingWithoutQuotes } from '../utils/kanjiUtils';
import { useGamification } from '../contexts/GamificationContext';
import shuffleArray from '../lib/shuffle';

interface QuizModeProps {
  items: Item[];
  selectedLevel: Level;
  onBack: () => void;
  onReady?: () => void;
}

function tryGetMedal(quizFormat: QuizFormat, medalBoost: number): number {
  const baseChance = quizFormat === 'input' ? 10 : 2.5;
  const boostPercentage = medalBoost * 100;
  const totalChance = baseChance + boostPercentage;
  
  if (totalChance >= 100) {
    const guaranteedMedals = Math.floor(totalChance / 100);
    const extraChance = totalChance % 100;
    const random = Math.random() * 100;
    return guaranteedMedals + (random < extraChance ? 1 : 0);
  }
  
  const random = Math.random() * 100;
  return random < totalChance ? 1 : 0;
}

function showRewardPopup(xp: number, coins: number, medals?: number, showMedals: boolean = true) {
  const popup = document.createElement('div');
  popup.className = 'reward-popup';
  popup.textContent = medals && showMedals 
    ? `+${xp} XP  +${coins} コイン  +${medals} メダル🏅`
    : `+${xp} XP  +${coins} コイン`;
  document.body.appendChild(popup);
  
  setTimeout(() => popup.remove(), 1300);
}

const QuizMode = memo(({ items, selectedLevel, onBack, onReady }: QuizModeProps) => {
  const [quizFormat, setQuizFormat] = useState<QuizFormat>('input');
  const [quizItems, setQuizItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false); // 正誤判定中フラグ
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    updateStats, 
    getSkillBoost,
    getCollectionPlusEffect,
    useStreakProtection,
    addQuizRewards,
    state: gamificationState,
    isMedalSystemEnabled
  } = useGamification();

  useEffect(() => {
    const shuffled = shuffleArray([...items]);
    setQuizItems(shuffled);
    setCurrentIndex(0);
    setScore({ correct: 0, incorrect: 0 });
    setCurrentStreak(0);
    
    // 最初の5問の画像を事前読み込み（パフォーマンス向上）
    if (selectedLevel !== 'extra') {
      const preloadImages = () => {
        shuffled.slice(0, 5).forEach(item => {
          if (item.imageUrl) {
            const img = new Image();
            img.src = item.imageUrl;
          }
        });
      };

      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(preloadImages, { timeout: 1000 });
      } else {
        // フォールバック: idle callback が無ければ短い遅延で実行
        setTimeout(preloadImages, 200);
      }
    }
  }, [items, selectedLevel]);

  // 初回準備完了を通知（親が全画面ローディングを消すために使用）
  const readyNotifiedRef = useRef(false);
  useEffect(() => {
    if (quizItems.length > 0 && !readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      try {
        onReady?.();
      } catch (e) {
        // ignore
      }
    }
  }, [quizItems, onReady]);

  // questionStartTimeはシンプル化のため削除（タイムボーナスなし）

  useEffect(() => {
    if (quizFormat === 'input' && !showResult && inputRef.current) {
      // フォーカスを即座に実行（遅延なし）
      inputRef.current.focus();
    }
  }, [quizFormat, currentIndex, showResult]);

  const generateChoices = (correctItem: Item, allItems: Item[]): { choices: string[], correctIndex: number } => {
    const correct = correctItem.reading;
    
    // 最適化: filter を使わずに直接ランダムサンプリング（O(n) → O(1)相当）
    const wrongChoices: string[] = [];
    const usedIndices = new Set<number>();
    const maxAttempts = Math.min(allItems.length * 2, 100); // 無限ループ防止
    let attempts = 0;
    
    while (wrongChoices.length < 3 && attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * allItems.length);
      attempts++;
      
      if (!usedIndices.has(randomIndex) && allItems[randomIndex].reading !== correct) {
        usedIndices.add(randomIndex);
        wrongChoices.push(allItems[randomIndex].reading);
      }
    }
    
    const correctIndex = Math.floor(Math.random() * 4);
    const choicesArray: string[] = [];
    let wrongIndex = 0;
    
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) {
        choicesArray.push(extractReadingCore(correct));
      } else {
        choicesArray.push(extractReadingCore(wrongChoices[wrongIndex] || ''));
        wrongIndex++;
      }
    }
    
    return { choices: choicesArray, correctIndex };
  };

  useEffect(() => {
    if (quizFormat === 'choice' && quizItems.length > 0 && quizItems[currentIndex]) {
      // 選択肢生成を即座に実行（シンプル化）
      const result = generateChoices(quizItems[currentIndex], quizItems);
      setChoices(result.choices);
      setCorrectChoiceIndex(result.correctIndex);
    }
  }, [quizFormat, quizItems, currentIndex]);

  const checkAnswer = () => {
    if (!quizItems[currentIndex]) return;
    
    console.log('checkAnswer called, setting isProcessing to true');
    const userInput = userAnswer.trim();
    let correct = false;
    
    if (selectedLevel === 'extra') {
      correct = userInput === quizItems[currentIndex].answer;
    } else {
      const correctReading = quizItems[currentIndex].reading;
      const correctOptions = correctReading.split('、');
      
      correct = correctOptions.some(option => {
        const core = extractReadingCore(option);
        const full = readingWithoutQuotes(option);
        return userInput === core || userInput === full;
      });
    }
    
    if (correct) {
      const newStreak = currentStreak + 1;
      const xpGain = Math.floor(150 * (1 + getSkillBoost('xp_boost')));
      const coinGain = Math.floor(100 * (1 + getSkillBoost('coin_boost')));
      const medalBoost = getSkillBoost('medal_boost') + (getCollectionPlusEffect()?.medalBoost || 0);
      const medalGain = tryGetMedal(quizFormat, medalBoost);
      
      // ローディング開始
      setIsProcessing(true);
      
      // UI更新（スコアのみ即座に更新）
      setIsCorrect(true);
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      setCurrentStreak(newStreak);
      
      // 重い計算（レベル計算など）は非同期化してUIブロックを防ぐ
      // 最低300ms表示して、ユーザーがスピナーを認識できるようにする
      const startTime = Date.now();
      setTimeout(() => {
        addQuizRewards(xpGain, coinGain, medalGain, 20, {
          totalQuizzes: gamificationState.stats.totalQuizzes + 1,
          correctAnswers: gamificationState.stats.correctAnswers + 1,
          currentStreak: newStreak,
          bestStreak: Math.max(gamificationState.stats.bestStreak, newStreak)
        });
        showRewardPopup(xpGain, coinGain, medalGain || undefined, isMedalSystemEnabled);
        
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          setShowResult(true); // 判定終了後に結果表示
          setIsProcessing(false); // ローディング終了
        }, delay);
      });
    } else {
      const protectionUsed = useStreakProtection();
      const newStreak = protectionUsed ? currentStreak : 0;
      
      // ローディング開始
      setIsProcessing(true);
      
      // UI更新（スコアのみ即座に更新）
      setIsCorrect(false);
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      setCurrentStreak(newStreak);
      
      // stats更新は非同期化してUIブロックを防ぐ
      // 最低300ms表示して、ユーザーがスピナーを認識できるようにする
      const startTime = Date.now();
      setTimeout(() => {
        updateStats({
          totalQuizzes: gamificationState.stats.totalQuizzes + 1,
          incorrectAnswers: gamificationState.stats.incorrectAnswers + 1,
          currentStreak: newStreak
        });
        
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          setShowResult(true); // 判定終了後に結果表示
          setIsProcessing(false); // ローディング終了
        }, delay);
      });
    }
  };

  const giveUp = () => {
    if (!quizItems[currentIndex]) return;
    
    // ローディング開始
    setIsProcessing(true);
    
    // UI更新（スコアのみ即座に更新）
    setIsCorrect(false);
    setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    setCurrentStreak(0);
    
    // stats更新は非同期化してUIブロックを防ぐ
    // 最低300ms表示して、ユーザーがスピナーを認識できるようにする
    const startTime = Date.now();
    setTimeout(() => {
      updateStats({
        totalQuizzes: gamificationState.stats.totalQuizzes + 1,
        incorrectAnswers: gamificationState.stats.incorrectAnswers + 1,
        currentStreak: 0
      });
      
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => {
        setShowResult(true); // 判定終了後に結果表示
        setIsProcessing(false); // ローディング終了
      }, delay);
    });
  };

  const nextQuestion = () => {
    if (currentIndex < quizItems.length - 1) {
      const nextIndex = currentIndex + 1;
      
      // 次の画像を事前読み込み（extra以外）
      if (selectedLevel !== 'extra' && quizItems[nextIndex]?.imageUrl) {
        const img = new Image();
        img.src = quizItems[nextIndex].imageUrl;
      }
      
      // 状態更新を1つのバッチで実行（最適化: requestAnimationFrameを削除）
      setCurrentIndex(nextIndex);
      setUserAnswer('');
      setShowResult(false);
    } else {
      alert(`問題終了！\n正解: ${score.correct}問\n不正解: ${score.incorrect}問`);
      onBack();
    }
  };

  const handleChoiceClick = (choice: string, idx: number) => {
    if (showResult) return;
    
    const correct = idx === correctChoiceIndex;
    
    if (correct) {
      const newStreak = currentStreak + 1;
      const xpGain = Math.floor(50 * (1 + getSkillBoost('xp_boost')));
      const coinGain = Math.floor(30 * (1 + getSkillBoost('coin_boost')));
      const medalBoost = getSkillBoost('medal_boost') + (getCollectionPlusEffect()?.medalBoost || 0);
      const medalGain = tryGetMedal(quizFormat, medalBoost);
      
      // ローディング開始
      setIsProcessing(true);
      
      // UI更新（即座に実行してフィードバック）
      setUserAnswer(choice);
      setIsCorrect(true);
      setShowResult(true);
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      setCurrentStreak(newStreak);
      
      // 重い計算（レベル計算など）は非同期化してUIブロックを防ぐ
      setTimeout(() => {
        addQuizRewards(xpGain, coinGain, medalGain, 5, {
          totalQuizzes: gamificationState.stats.totalQuizzes + 1,
          correctAnswers: gamificationState.stats.correctAnswers + 1,
          currentStreak: newStreak,
          bestStreak: Math.max(gamificationState.stats.bestStreak, newStreak)
        });
        showRewardPopup(xpGain, coinGain, medalGain || undefined, isMedalSystemEnabled);
        setIsProcessing(false); // ローディング終了
      });
    } else {
      const protectionUsed = useStreakProtection();
      const newStreak = protectionUsed ? currentStreak : 0;
      
      // ローディング開始
      setIsProcessing(true);
      
      // UI更新（即座に実行してフィードバック）
      setUserAnswer(choice);
      setIsCorrect(false);
      setShowResult(true);
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      setCurrentStreak(newStreak);
      
      // stats更新は非同期化してUIブロックを防ぐ
      setTimeout(() => {
        updateStats({
          totalQuizzes: gamificationState.stats.totalQuizzes + 1,
          incorrectAnswers: gamificationState.stats.incorrectAnswers + 1,
          currentStreak: newStreak
        });
        setIsProcessing(false); // ローディング終了
      });
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      
      if (showResult) {
        e.preventDefault();
        const nextButton = document.querySelector('.next-button') as HTMLButtonElement;
        if (nextButton) nextButton.click();
      } else if (quizFormat === 'input') {
        e.preventDefault();
        const submitButton = document.querySelector('.submit-button') as HTMLButtonElement;
        const giveUpButton = document.querySelector('.give-up-button') as HTMLButtonElement;
        const hasInput = (e.target as HTMLInputElement)?.value?.trim();
        
        if (hasInput && submitButton && !submitButton.disabled) {
          submitButton.click();
        } else if (!hasInput && giveUpButton) {
          giveUpButton.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResult, quizFormat]);

  if (quizItems.length === 0) return null;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <button onClick={onBack} className="back-button">
          ← 一覧に戻る
        </button>
        <div className="quiz-progress">
          問題 {currentIndex + 1} / {quizItems.length}
        </div>
        <div className="quiz-score">
          正解: {score.correct} | 不正解: {score.incorrect}
        </div>
      </div>

      {selectedLevel !== 'extra' && (
        <div className="quiz-format-selector">
          <button
            onClick={() => {
              setQuizFormat('input');
              setUserAnswer('');
              setShowResult(false);
              nextQuestion();
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
              nextQuestion();
            }}
            className={`format-button ${quizFormat === 'choice' ? 'active' : ''}`}
          >
            四択形式
          </button>
        </div>
      )}

      <div className="quiz-card">
        {selectedLevel === 'extra' ? (
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
          <>
            <img 
              src={quizItems[currentIndex].imageUrl} 
              alt="問題の漢字" 
              className="quiz-image"
              loading="eager"
              decoding="sync"
            />
            
            {quizFormat === 'input' ? (
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
              <div className="quiz-choices-container">
                <label className="quiz-label">
                  この漢字の読みは？（選択肢から選んでください）
                </label>
                <div className="quiz-choices">
                  {choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => { if (!showResult) handleChoiceClick(choice, idx); }}
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
        
        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <div className="processing-text">正誤判定中...</div>
          </div>
        )}

        {showResult && !isProcessing && (
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
  );
});

QuizMode.displayName = 'QuizMode';

export default QuizMode;
