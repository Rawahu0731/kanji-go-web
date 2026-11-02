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
  endless?: boolean;
}

function tryGetMedal(quizFormat: QuizFormat, medalBoost: number): number {
  const baseChance = quizFormat === 'input' ? 10 : 2.5;
  const boostPercentage = medalBoost * 100;
  const totalChance = baseChance + boostPercentage;
  
  if (totalChance >= 100) {
    const guaranteedMedals = Math.floor(totalChance / 100);
    const extraChance = totalChance % 100;
    const random = Math.random() * 100;
    const result = guaranteedMedals + (random < extraChance ? 1 : 0);
    console.log(`[MEDAL] format=${quizFormat}, base=${baseChance}%, boost=${medalBoost}, total=${totalChance}%, random=${random.toFixed(2)}, result=${result}`);
    return result;
  }
  
  const random = Math.random() * 100;
  const result = random < totalChance ? 1 : 0;
  console.log(`[MEDAL] format=${quizFormat}, base=${baseChance}%, boost=${medalBoost}, total=${totalChance}%, random=${random.toFixed(2)}, result=${result}`);
  return result;
}

function showRewardPopup(xp: number, coins: number, medals?: number, showMedals: boolean = true) {
  const popup = document.createElement('div');
  popup.className = 'reward-popup';
  
  // メダル獲得時は目立つように表示
  if (medals && medals > 0 && showMedals) {
    popup.style.cssText = 'background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); font-size: 1.3rem; padding: 1.2rem 1.5rem; box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);';
    popup.textContent = `+${xp} XP  +${coins} コイン  🎉 +${medals} メダル🪙 🎉`;
    console.log(`[MEDAL POPUP] Showing medal reward popup: ${medals} medals`);
  } else {
    popup.textContent = showMedals 
      ? `+${xp} XP  +${coins} コイン  +0 メダル`
      : `+${xp} XP  +${coins} コイン`;
  }
  
  document.body.appendChild(popup);
  
  setTimeout(() => popup.remove(), 1300);
}

const QuizMode = memo(({ items, selectedLevel, onBack, onReady, endless = false }: QuizModeProps) => {
  const [quizFormat, setQuizFormat] = useState<QuizFormat>('input');
  const [quizItems, setQuizItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false); // 正誤判定中フラグ
  // デバッグ用: 入手したXPの詳細情報
  const [_xpDebugInfo, setXpDebugInfo] = useState<{
    baseXp: number;
    xpBoost: number;
    totalXp: number;
    actualXp?: number; // デバッグ用: 実際に追加されたXP量
  } | null>(null);
  
  // スコア変化を監視してログ出力（正解時にメダル判定ログと突合するため）
  useEffect(() => {
    console.log(`[SCORE] score changed: correct=${score.correct}, incorrect=${score.incorrect}, currentIndex=${currentIndex}`);
  }, [score.correct, score.incorrect, currentIndex]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEndlessIntro, setShowEndlessIntro] = useState(false);
  
  const { 
    updateStats, 
    getSkillBoost,
    getCollectionPlusEffect,
    getCharacterMedalBoost,
    recordKanjiAnswer,
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
    setSelectedCharIndex(null);
    // エンドレス時は四択を無効化して入力形式に固定
    if (endless) {
      setQuizFormat('input');
    }
    // エンドレス開始演出
    if (endless) {
      setShowEndlessIntro(true);
      const t = setTimeout(() => setShowEndlessIntro(false), 1400);
      return () => clearTimeout(t);
    }

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
      const item = quizItems[currentIndex];
      if (item.questionType === 'correction') {
        const sentence = item.sentence || '';
        const selectedChar = (selectedCharIndex !== null && sentence.length > selectedCharIndex) ? sentence[selectedCharIndex] : '';
        const answerOptions = (item.answer || '').split('、').map(s => s.trim()).filter(Boolean);
        const answer2Options = (item.answer2 || '').split('、').map(s => s.trim()).filter(Boolean);
        const normalizedInput = userInput.trim();
        const selectedMatches = !!(selectedChar && answerOptions.some(a => selectedChar === a));
        const inputMatches = answer2Options.length > 0 ? answer2Options.some(a => normalizedInput === a) : normalizedInput === (item.answer2 || '').trim();
        correct = !!(selectedMatches && inputMatches);
      } else {
        const correctReading = item.reading || item.answer || '';
        const correctOptions = correctReading.split('、').map(o => o.trim()).filter(Boolean);
        const normalizedInput = userInput.replace(/\s+/g, '');
        correct = correctOptions.some(option => {
          const core = extractReadingCore(option);
          const full = readingWithoutQuotes(option);
          return normalizedInput === core || normalizedInput === full;
        });
      }
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
      const correctKanjiCount = recordKanjiAnswer(quizItems[currentIndex].kanji, true);
      const newStreak = currentStreak + 1;
      // デバッグ用: XP計算の詳細を記録
      const baseXp = 150;
      const xpBoost = getSkillBoost('xp_boost');
      const xpMultiplierBoost = getSkillBoost('xp_multiplier');
      const coinMultiplier = 1 + correctKanjiCount * 0.5;
      const xpGain = Math.floor(baseXp * (1 + xpBoost) * (1 + xpMultiplierBoost) * coinMultiplier);
      const coinGain = Math.floor(100 * (1 + getSkillBoost('coin_boost')) * coinMultiplier);
      const medalBoost = getSkillBoost('medal_boost') + (getCollectionPlusEffect()?.medalBoost || 0) + getCharacterMedalBoost();
      const medalGain = tryGetMedal(quizFormat, medalBoost);
      console.log(`[MEDAL REWARD] Calling addQuizRewards with medalGain=${medalGain}`);
      
      // デバッグ情報を保存
      setXpDebugInfo({
        baseXp,
        xpBoost,
        totalXp: xpGain
      });
      
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
        const statsUpdate: any = {
          totalQuizzes: gamificationState.stats.totalQuizzes + 1,
          correctAnswers: gamificationState.stats.correctAnswers + 1,
          currentStreak: newStreak
        };
        if (endless) {
          statsUpdate.endlessBestStreak = Math.max((gamificationState.stats.endlessBestStreak || 0), newStreak);
        } else {
          statsUpdate.bestStreak = Math.max(gamificationState.stats.bestStreak, newStreak);
        }
        const actualRewards = addQuizRewards(xpGain, coinGain, medalGain, 20, statsUpdate);
        console.log(`[MEDAL REWARD] actualRewards.actualMedals=${actualRewards.actualMedals}`);
        // デバッグ用: 実際に追加されたXP量を更新
        setXpDebugInfo(prev => prev ? { ...prev, actualXp: actualRewards.actualXp } : null);
        // 実際に追加された量を表示
        showRewardPopup(actualRewards.actualXp, actualRewards.actualCoins, actualRewards.actualMedals || undefined, isMedalSystemEnabled);
        
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          setShowResult(true); // 判定終了後に結果表示
          setIsProcessing(false); // ローディング終了
        }, delay);
      });
    } else {
      recordKanjiAnswer(quizItems[currentIndex].kanji, false);
      const protectionUsed = useStreakProtection();
      const newStreak = protectionUsed ? currentStreak : 0;
      
      // デバッグ情報をクリア
      setXpDebugInfo(null);
      
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

    recordKanjiAnswer(quizItems[currentIndex].kanji, false);
    
    // デバッグ情報をクリア
    setXpDebugInfo(null);
    
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
    console.log(`[NEXT] Moving to next question. currentIndex=${currentIndex}, showResult=${showResult}, score=${score.correct}/${score.correct + score.incorrect}`);
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
      setSelectedCharIndex(null);
      setXpDebugInfo(null); // デバッグ情報をクリア
    } else {
      if (endless) {
        // 末尾に到達したらアイテムを追加して継続する
        const more = shuffleArray([...items]).slice(0, Math.max(20, items.length));
        setQuizItems(prev => prev.concat(more));
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setUserAnswer('');
        setShowResult(false);
        setSelectedCharIndex(null);
        setXpDebugInfo(null);
      } else {
        alert(`問題終了！\n正解: ${score.correct}問\n不正解: ${score.incorrect}問`);
        onBack();
      }
    }
  };

  

  const handleChoiceClick = (choice: string, idx: number) => {
    if (showResult) return;
    
    const correct = idx === correctChoiceIndex;
    
    if (correct) {
      const correctKanjiCount = recordKanjiAnswer(quizItems[currentIndex].kanji, true);
      const newStreak = currentStreak + 1;
      // デバッグ用: XP計算の詳細を記録
      const baseXp = 50;
      const xpBoost = getSkillBoost('xp_boost');
      const xpMultiplierBoost = getSkillBoost('xp_multiplier');
      const coinMultiplier = 1 + correctKanjiCount * 0.5;
      const xpGain = Math.floor(baseXp * (1 + xpBoost) * (1 + xpMultiplierBoost) * coinMultiplier);
      const coinGain = Math.floor(30 * (1 + getSkillBoost('coin_boost')) * coinMultiplier);
      const medalBoost = getSkillBoost('medal_boost') + (getCollectionPlusEffect()?.medalBoost || 0) + getCharacterMedalBoost();
      const medalGain = tryGetMedal(quizFormat, medalBoost);
      console.log(`[MEDAL REWARD CHOICE] Calling addQuizRewards with medalGain=${medalGain}`);
      
      // デバッグ情報を保存
      setXpDebugInfo({
        baseXp,
        xpBoost,
        totalXp: xpGain
      });
      
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
        const statsUpdateChoice: any = {
          totalQuizzes: gamificationState.stats.totalQuizzes + 1,
          correctAnswers: gamificationState.stats.correctAnswers + 1,
          currentStreak: newStreak
        };
        if (endless) {
          statsUpdateChoice.endlessBestStreak = Math.max((gamificationState.stats.endlessBestStreak || 0), newStreak);
        } else {
          statsUpdateChoice.bestStreak = Math.max(gamificationState.stats.bestStreak, newStreak);
        }
        const actualRewards = addQuizRewards(xpGain, coinGain, medalGain, 5, statsUpdateChoice);
        // デバッグ用: 実際に追加されたXP量を更新
        setXpDebugInfo(prev => prev ? { ...prev, actualXp: actualRewards.actualXp } : null);
        // 実際に追加された量を表示
        showRewardPopup(actualRewards.actualXp, actualRewards.actualCoins, actualRewards.actualMedals || undefined, isMedalSystemEnabled);
        setIsProcessing(false); // ローディング終了
      });
    } else {
      recordKanjiAnswer(quizItems[currentIndex].kanji, false);
      const protectionUsed = useStreakProtection();
      const newStreak = protectionUsed ? currentStreak : 0;
      
      // デバッグ情報をクリア
      setXpDebugInfo(null);
      
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
      {endless && (
        <div className="endless-mode-label" aria-hidden>
          エンドレスモード
        </div>
      )}
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
        {endless && (() => {
          const cap: number = 100;
          const level = Math.min(currentStreak, cap);

          const hexToRgb = (hex: string) => {
            const h = hex.replace('#', '');
            const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
            return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
          };

          const rgbToCss = (r: number, g: number, b: number, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`;

          const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

          // ベース色 -> ゴールドへの補間 (t: 0..1)
          const t = cap === 0 ? 0 : level / cap;
          const from1 = hexToRgb('#ffffff');
          const to1 = hexToRgb('#ffe58a');
          const from2 = hexToRgb('#fffaf0');
          const to2 = hexToRgb('#ffb700');

          const stop1 = rgbToCss(lerp(from1.r, to1.r, t), lerp(from1.g, to1.g, t), lerp(from1.b, to1.b, t), 0.86);
          const stop2 = rgbToCss(lerp(from2.r, to2.r, t), lerp(from2.g, to2.g, t), lerp(from2.b, to2.b, t), 0.9);

          const color = t > 0.6 ? '#2b2200' : '#444';
          const shadowAlpha = 0.06 + t * 0.18;
          const boxShadow = `0 ${6 + t * 12}px ${18 + t * 44}px rgba(255, 160, 40, ${shadowAlpha})`;

          const style: React.CSSProperties = {
            background: `linear-gradient(90deg, ${stop1}, ${stop2})`,
            color,
            boxShadow,
            transform: t > 0 ? 'scale(1.01)' : undefined,
          };

          return (
            <div className={`quiz-streak streak-level-${Math.min(level, 10)}`} style={style} aria-hidden>
              連続正解: {currentStreak}
            </div>
          );
        })()}
      </div>

      {showEndlessIntro && (
        <div className="endless-intro-overlay" aria-hidden>
          <div className="endless-intro-card">
            <div className="endless-intro-title">ENDLESS</div>
            <div className="endless-intro-sub">— 無限の挑戦 —</div>
          </div>
        </div>
      )}

      {selectedLevel !== 'extra' && !endless && (
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
            {!endless && (
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
            )}
        </div>
      )}

      <div className="quiz-card">
        {selectedLevel === 'extra' ? (
          <div className="extra-quiz-content">
            {(() => {
              const item = quizItems[currentIndex];
              if (item.questionType === 'correction') {
                const sentence = item.sentence || '';
                return (
                  <>
                    <div className="extra-quiz-sentence">
                      {Array.from(sentence).map((ch, i) => (
                        <span
                          key={i}
                          className={`extra-char ${selectedCharIndex === i ? 'selected-char' : ''}`}
                          onClick={() => { if (!showResult) setSelectedCharIndex(i); }}
                          role="button"
                          aria-label={`文字${i + 1}`}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <div className="quiz-input-container">
                      <label className="quiz-label">
                        間違っている漢字を選択して、正しい漢字を入力してください
                      </label>
                      <input
                        ref={inputRef}
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        disabled={showResult}
                        className="quiz-input"
                        placeholder="正しい漢字を入力"
                        autoFocus
                      />
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div className="extra-quiz-sentence">
                    <span className="extra-word">{item.sentence}</span>
                  </div>
                  <div className="quiz-input-container">
                    <label className="quiz-label">
                      この語の読みを答えてください
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
                </>
              );
            })()}
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
              disabled={(() => {
                if (selectedLevel === 'extra') {
                  const item = quizItems[currentIndex];
                  if (item?.questionType === 'correction') {
                    return !(userAnswer.trim() && selectedCharIndex !== null);
                  }
                }
                return !userAnswer.trim();
              })()}
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
            {/* デバッグ表示は無効化 */}
            <div className="correct-answer">
              {selectedLevel === 'extra' ? (
                (() => {
                  const item = quizItems[currentIndex];
                  if (item.questionType === 'correction') {
                    const sentence = item.sentence || '';
                    return (
                      <>
                        <div className="extra-quiz-sentence" style={{ marginBottom: '12px' }}>
                          {Array.from(sentence).map((ch, i) => {
                            const answerOptions = (item.answer || '').split('、').map(s => s.trim()).filter(Boolean);
                            const isWrongChar = answerOptions.length > 0 ? answerOptions.includes(ch) : (item.answer && ch === item.answer);
                            const isUserSelected = selectedCharIndex === i;
                            const classNames = [isWrongChar ? 'wrong-highlight' : '', isUserSelected && !isWrongChar ? 'user-selected-wrong' : '', selectedCharIndex === i ? 'selected-char' : ''].filter(Boolean).join(' ');
                            return (
                              <span key={i} className={classNames}>
                                {ch}
                              </span>
                            );
                          })}
                        </div>
                        <div>
                          {isCorrect ? '答え: ' : '正解: '}
                          <span className="correction-correct">{item.answer2}</span>
                        </div>
                      </>
                    );
                  }

                  // reading
                  return (
                    <>
                      {isCorrect ? '答え: ' : '正解: '}
                      <span className="correct-answer-text">{formatReadingWithOkurigana(item.reading || item.answer || '')}</span>
                    </>
                  );
                })()
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
