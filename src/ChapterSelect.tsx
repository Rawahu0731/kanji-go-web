type Chapter = {
  index: number;
  title: string;
  isUnlocked: boolean;
  isQuizCleared: boolean;
  isCompleted: boolean; // 章を読み終えたかどうか
};

type Props = {
  chapters: Chapter[];
  onSelectChapter: (chapterIndex: number) => void;
  onStartQuiz: (chapterIndex: number) => void;
  onBack: () => void;
};

export default function ChapterSelect({ chapters, onSelectChapter, onStartQuiz, onBack }: Props) {
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg,#ffffff,#f7fafc)',
      color: '#0f1720',
      zIndex: 150,
      overflowY: 'auto',
      padding: '40px 20px'
    }}>
      {/* エンドロール再生ボタンは UI から削除 */}
      <div style={{maxWidth: '1000px', width: '100%'}}>
        <h1 style={{fontSize: 32, textAlign: 'center', marginBottom: 6, color: '#0b2545'}}>意味を持たないままで</h1>
        <p style={{textAlign: 'center', opacity: 0.8, marginBottom: 28, color: '#64748b'}}>読みたい章を選んでください</p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginBottom: 24
        }}>
          {chapters.map((chapter) => (
            <div
              key={chapter.index}
              style={{
                background: '#fff',
                border: '1px solid rgba(15,23,32,0.06)',
                borderRadius: 12,
                padding: 18,
                position: 'relative',
                boxShadow: chapter.isUnlocked ? '0 6px 20px rgba(15,23,32,0.04)' : 'none',
                opacity: chapter.isUnlocked ? 1 : 0.6
              }}
            >
              {
                (() => {
                  // 章タイトルに既に序章/第X章/終章が含まれている場合は見出しを重複表示しない
                  const t = String(chapter.title || '');
                  const hasOrdinalPrefix = /^(序章|終章|第\d+章)/.test(t);
                  const ordinalLabel = chapter.index === 0 ? '序章' : chapter.index === chapters.length - 1 ? '終章' : `第${chapter.index}章`;
                  return (
                    <>
                      {!hasOrdinalPrefix && (
                        <div style={{fontSize: 14, opacity: 0.7, marginBottom: 4}}>{ordinalLabel}</div>
                      )}
                      <div style={{fontSize: 18, fontWeight: 600, marginBottom: 12}}>{chapter.title}</div>
                    </>
                  );
                })()
              }
              
              {!chapter.isUnlocked && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 14,
                  color: '#ffaa00'
                }}>
                  <span>🔒</span>
                  <span>前の章のクイズをクリアして解放</span>
                </div>
              )}

              {chapter.isUnlocked && (
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  <button
                    onClick={() => onSelectChapter(chapter.index)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: 14,
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: '#0b6cff',
                      color: '#fff',
                      border: 'none',
                      boxShadow: '0 6px 18px rgba(11,108,255,0.12)'
                    }}
                  >
                    📖 読む
                  </button>
                  
                  {chapter.index < chapters.length - 1 && (
                    <button
                      onClick={() => {
                        console.log('Quiz button clicked:', chapter.index, 'isCompleted:', chapter.isCompleted, 'isQuizCleared:', chapter.isQuizCleared);
                        onStartQuiz(chapter.index);
                      }}
                      disabled={!chapter.isCompleted}
                      style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: 14,
                          borderRadius: 10,
                          cursor: chapter.isCompleted ? 'pointer' : 'not-allowed',
                          background: chapter.isQuizCleared ? '#16a34a' : chapter.isCompleted ? '#f59e0b' : '#e2e8f0',
                          color: chapter.isCompleted ? '#07201a' : '#94a3b8',
                          border: 'none',
                          opacity: 1
                        }}
                    >
                      {chapter.isQuizCleared ? '✓ クイズを見る' : chapter.isCompleted ? '📝 クイズに挑戦' : '🔒 章を読んで解放'}
                    </button>
                  )}
                  {/* 終章のエンドロールボタンは削除 */}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{textAlign: 'center', marginTop: 24}}>
          <button
            onClick={onBack}
            style={{
                padding: '10px 24px',
                fontSize: 16,
                borderRadius: 10,
                cursor: 'pointer',
                background: '#fff',
                color: '#0b2545',
                border: '1px solid rgba(15,23,32,0.06)',
                boxShadow: '0 6px 18px rgba(2,6,23,0.04)'
            }}
          >
            タイトルに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
