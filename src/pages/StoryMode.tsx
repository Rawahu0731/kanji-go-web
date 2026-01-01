import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storyChapters } from '../data/storyChapters';
import type { Chapter } from '../data/storyChapters';
import { useGamification } from '../contexts/GamificationContext';
import { toNumber } from '../utils/bigNumber';
import '../styles/StoryMode.css';

const STORAGE_KEY = 'kanji_story_progress';

type StoryProgress = {
  completedChapters: number[];
  currentChapter: number;
  totalXp: number;
};

function StoryMode() {
  const { state: gamificationState, addXp, addCoins, unlockBadge } = useGamification();
  
  const [progress, setProgress] = useState<StoryProgress>({
    completedChapters: [],
    currentChapter: 1,
    totalXp: typeof gamificationState.totalXp === 'number' ? gamificationState.totalXp : toNumber(gamificationState.totalXp) // ゲーミフィケーションシステムから累計XPを取得
  });
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    // 進捗をロード
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProgress(JSON.parse(saved));
    }
  }, []);

  const saveProgress = (newProgress: StoryProgress) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    setProgress(newProgress);
  };

  const isChapterUnlocked = (chapter: Chapter): boolean => {
    const totalXpValue = typeof gamificationState.totalXp === 'number' ? gamificationState.totalXp : toNumber(gamificationState.totalXp);
    return totalXpValue >= chapter.requiredXp;
  };

  const isChapterCompleted = (chapterId: number): boolean => {
    return progress.completedChapters.includes(chapterId);
  };

  const openChapter = (chapter: Chapter) => {
    if (isChapterUnlocked(chapter)) {
      setSelectedChapter(chapter);
      setShowReward(false);
    }
  };

  const completeChapter = () => {
    if (!selectedChapter) return;

    const isAlreadyCompleted = isChapterCompleted(selectedChapter.id);
    
    if (!isAlreadyCompleted) {
      // ゲーミフィケーションシステムで報酬付与
      if (selectedChapter.reward.type === 'xp') {
        addXp(selectedChapter.reward.value as number);
      } else if (selectedChapter.reward.type === 'coin') {
        addCoins(selectedChapter.reward.value as number);
      } else if (selectedChapter.reward.type === 'badge') {
        unlockBadge(selectedChapter.reward.value as string);
      }
      
      const newProgress = {
        ...progress,
        completedChapters: [...progress.completedChapters, selectedChapter.id],
        currentChapter: Math.max(progress.currentChapter, selectedChapter.id + 1),
        totalXp: typeof gamificationState.totalXp === 'number' ? gamificationState.totalXp : toNumber(gamificationState.totalXp) // 最新の累計XPを反映
      };
      saveProgress(newProgress);
      setShowReward(true);
    }
    // 既に完了済みの場合は何もしない（報酬画面を表示しない）
  };

  const closeChapter = () => {
    setSelectedChapter(null);
    setShowReward(false);
  };

  return (
    <div className="story-mode-container page-root">
      <header className="story-header">
        <Link to="/" className="back-button">← ホームへ戻る</Link>
        <h1>ストーリーモード</h1>
        <div className="xp-display">累計XP: {typeof gamificationState.totalXp === 'number' ? gamificationState.totalXp : toNumber(gamificationState.totalXp)}</div>
      </header>

      <div className="story-content">
        <div className="chapter-list">
          {storyChapters.map((chapter) => {
            const unlocked = isChapterUnlocked(chapter);
            const completed = isChapterCompleted(chapter.id);

            return (
              <div
                key={chapter.id}
                className={`chapter-card ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''}`}
                onClick={() => openChapter(chapter)}
                style={{
                  background: unlocked && chapter.bgColor 
                    ? `${chapter.bgColor}, rgba(255, 255, 255, 0.05)` 
                    : undefined
                }}
              >
                {chapter.illustration && unlocked && (
                  <div className="chapter-illustration">{chapter.illustration}</div>
                )}
                <div className="chapter-number">
                  {completed ? '✓' : chapter.id}
                </div>
                <div className="chapter-info">
                  <h3>{chapter.title}</h3>
                  {!unlocked && (
                    <p className="unlock-requirement">
                      🔒 必要XP: {chapter.requiredXp}
                    </p>
                  )}
                  {unlocked && !completed && (
                    <p className="unlock-requirement">
                      読んでみよう
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 章の詳細モーダル */}
      {selectedChapter && (
        <div className="chapter-modal-overlay" onClick={closeChapter}>
          <div className="chapter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedChapter.title}</h2>
              <button className="close-button" onClick={closeChapter}>×</button>
            </div>
            
            {!showReward ? (
              <div className="modal-content">
                {selectedChapter.illustration && (
                  <div className="modal-illustration">
                    {selectedChapter.illustration}
                  </div>
                )}
                <div className="story-text">
                  {selectedChapter.story}
                </div>
                {!isChapterCompleted(selectedChapter.id) && (
                  <button 
                    className="complete-button"
                    onClick={completeChapter}
                  >
                    章を完了する
                  </button>
                )}
              </div>
            ) : (
              <div className="modal-content">
                <div className="reward-display">
                  <div className="reward-animation">✨</div>
                  <h3>🎉 報酬を獲得しました！</h3>
                  <div className="reward-item">
                    {selectedChapter.reward.type === 'xp' && (
                      <p>経験値 +{selectedChapter.reward.value} XP</p>
                    )}
                    {selectedChapter.reward.type === 'coin' && (
                      <p>コイン +{selectedChapter.reward.value}</p>
                    )}
                    {selectedChapter.reward.type === 'badge' && (
                      <p>バッジ「{selectedChapter.reward.value}」を獲得！</p>
                    )}
                  </div>
                  <button className="continue-button" onClick={closeChapter}>
                    続ける
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryMode;
