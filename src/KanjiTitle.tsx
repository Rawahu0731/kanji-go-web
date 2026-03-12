import { startRta } from './utils/rtaTimer';

type Props = {
  onStarted?: () => void;
};

export default function KanjiTitle({ onStarted }: Props) {
  const handleStart = async () => {
    try {
      await startRta();
    } catch (e) {
      // ignore - startRta falls back to local time
    }
    try {
      // Ensure new start info is picked up by reloading the app
      window.location.reload();
    } catch (e) {
      if (typeof onStarted === 'function') onStarted();
    }
  };

  return (
    <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#ffffff,#f5f7fb)', color: '#0f1720', zIndex: 160, padding: 24}}>
      <div style={{textAlign: 'center', background: '#fff', padding: '36px 48px', borderRadius: 16, boxShadow: '0 8px 30px rgba(15,23,32,0.08)', maxWidth: 720, width: '100%'}}>
        <h1 style={{fontSize: 48, margin: '12px 0 0 0', color: '#0b2545'}}>漢字勉強</h1>
        <p style={{marginTop: 12, color: '#334155'}}>学習を開始するには「はじめる」を押してください。開始時刻はサーバ時刻に基づき保存されます。</p>
        <div style={{marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center'}}>
          <button onClick={handleStart} style={{padding: '12px 24px', fontSize: 16, borderRadius: 10, cursor: 'pointer', background: '#0b6cff', color: '#fff', border: 'none', boxShadow: '0 6px 18px rgba(11,108,255,0.16)'}}>はじめる</button>
        </div>
      </div>
    </div>
  );
}
