import { Link } from 'react-router-dom';
import RequireCondition from './components/RequireCondition';
import { useGamification } from './contexts/GamificationContext';

type Props = {
  onStart: () => void;
};

function TitleScreenContent({ onStart }: Props) {
  return (
    <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#ffffff,#f5f7fb)', color: '#0f1720', zIndex: 150, padding: 24}}>
      <div style={{textAlign: 'center', background: '#fff', padding: '36px 48px', borderRadius: 16, boxShadow: '0 8px 30px rgba(15,23,32,0.08)', maxWidth: 720, width: '100%'}}>
        <h1 style={{fontSize: 48, margin: '12px 0 0 0', color: '#0b2545'}}>漢字ストーリー</h1>

        <div style={{marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center'}}>
          <Link to="/" style={{padding: '12px 24px', fontSize: 16, borderRadius: 10, textDecoration: 'none', background: '#e2e8f0', color: '#0b2545', border: 'none', display: 'inline-block', textAlign: 'center'}}>← ホームへ戻る</Link>
          <button onClick={onStart} style={{padding: '12px 24px', fontSize: 16, borderRadius: 10, cursor: 'pointer', background: '#0b6cff', color: '#fff', border: 'none', boxShadow: '0 6px 18px rgba(11,108,255,0.16)'}}>はじめる</button>
        </div>
      </div>
    </div>
  );
}

export default function TitleScreen(props: Props) {
  const { state } = useGamification()
  return (
    <RequireCondition check={() => !!state.hasStoryInvitation} message="ストーリーの招待がありません。コレクション+などを確認してください。">
      <TitleScreenContent {...props} />
    </RequireCondition>
  )
}
