import { useState, useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  correctAnswer: string | string[]; // 正解の文字列（複数可）
  onClose: () => void;
  onResult: (success: boolean) => void;
  imageUrl: string; // クイズ問題の画像URL
  isAlreadyCleared?: boolean; // 既にクリア済みかどうか
};

export default function Quiz({ open, correctAnswer, onClose, onResult, imageUrl, isAlreadyCleared = false }: Props) {
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // 次のtickでフォーカスを当てる（モーダル描画後）
    const t = setTimeout(() => {
      try {
        inputRef.current?.focus();
        // テキストがある場合は全選択して即入力可能にする
        inputRef.current?.select?.();
      } catch (e) {
        // ignore
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  console.log('Quiz opened - isAlreadyCleared:', isAlreadyCleared);

  if (!open) return null;

  const handleSubmit = () => {
    if (showResult || !userInput.trim()) return; // 既に結果表示中または入力なしの場合は無視
    
    // 正解判定（大文字小文字、前後の空白を無視）
    const userAnswer = userInput.trim().toLowerCase();
    const answers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const correct = answers.some(ans => userAnswer === ans.trim().toLowerCase());
    
    setIsCorrect(correct);
    setShowResult(true);
    
    // 正解の場合のみ2秒後に結果を返す
    if (correct) {
      setTimeout(() => {
        onResult(true);
        setUserInput('');
        setShowResult(false);
      }, 2000);
    }
    // 不正解の場合はユーザーが手動で閉じるまで待つ
  };

  const handleClose = () => {
    setUserInput('');
    setShowResult(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200}}>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.45)'}} onClick={handleClose} />
      <div style={{zIndex:210, width: 'min(720px, 92%)', background: '#fff', color: '#0b2545', padding: 22, borderRadius: 12, boxShadow: '0 10px 40px rgba(2,6,23,0.12)'}} onClick={(e)=>e.stopPropagation()}>
        <div style={{fontSize: 18, marginBottom: 12, fontWeight: 700}}>クイズチャレンジ</div>
        
        <div style={{marginBottom: 16, textAlign: 'center'}}>
          {imageUrl ? (
            <img src={imageUrl} alt="クイズ画像" style={{maxWidth: '100%', maxHeight: '420px', borderRadius: 10, border: '1px solid rgba(15,23,32,0.04)'}} />
          ) : (
            <div style={{width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#f1f5f9', color: '#94a3b8'}}>画像が設定されていません（プレビュー）</div>
          )}
        </div>
        
        {showResult && (
          <div style={{
            marginBottom: 16,
            padding: '12px',
            borderRadius: 8,
            background: isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
            fontSize: 16,
            fontWeight: 700,
            textAlign: 'center',
            color: isCorrect ? '#065f46' : '#7f1d1d'
          }}>
            {isCorrect ? (
              isAlreadyCleared ? '🎉 正解！' : '🎉 正解！次の章が解放されました'
            ) : (
              '❌ 不正解...もう一度挑戦してください'
            )}
          </div>
        )}
        
        <div style={{marginBottom: 16}}>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={showResult}
            placeholder="答えを入力してください"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 16,
              borderRadius: 10,
              background: '#fff',
              color: '#0b2545',
              border: '1px solid rgba(15,23,32,0.06)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{display: 'flex', gap: 10, justifyContent: 'center'}}>
          <button
            onClick={handleSubmit}
            disabled={showResult || !userInput.trim()}
            style={{
              padding: '10px 24px',
              fontSize: 16,
              borderRadius: 10,
              background: showResult || !userInput.trim() ? '#e6eefc' : '#0b6cff',
              color: showResult || !userInput.trim() ? '#94a3b8' : '#fff',
              border: 'none',
              cursor: showResult || !userInput.trim() ? 'not-allowed' : 'pointer',
              opacity: 1,
              transition: 'all 0.18s'
            }}
          >
            回答する
          </button>
          {showResult && !isCorrect && (
            <button
              onClick={() => {
                setUserInput('');
                setShowResult(false);
              }}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                borderRadius: 10,
                background: '#f97316',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.18s'
              }}
            >
              再挑戦
            </button>
          )}
        </div>
        <div style={{marginTop: 14, textAlign: 'right'}}>
          <button onClick={handleClose} disabled={showResult} style={{padding: '6px 10px', borderRadius: 8, cursor: showResult ? 'not-allowed' : 'pointer', opacity: showResult ? 0.6 : 1, border: 'none', background: 'transparent', color: '#64748b'}}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
