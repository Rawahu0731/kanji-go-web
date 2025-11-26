import { useEffect, useState } from 'react';
import { useGamification } from '../contexts/GamificationContext';
import { Link } from 'react-router-dom';

const ChallengePage = () => {
  const { state, completeChallenge, getChallengeBoost } = useGamification();

  // feature flag check (URL param)
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
  const enabled = params.get('challenge') || params.get('enableChallenge') || params.get('feature');
  const challengeFeatureEnabled = !!enabled && !['0','false','no'].includes((enabled||'').toLowerCase());

  const CHALLENGE_ID = 'no_skill_purchase_10min';
  const CHALLENGE_DURATION_MS = 10 * 60 * 1000;

  const [activeChallenge, setActiveChallenge] = useState<{ id: string; start: number; end: number } | null>(() => {
    if (!challengeFeatureEnabled) return null;
    try {
      const raw = localStorage.getItem('active_challenge');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.start && parsed.end) return parsed;
    } catch (e) {}
    return null;
  });

  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    if (!challengeFeatureEnabled) return;
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [challengeFeatureEnabled]);

  useEffect(() => {
    if (!challengeFeatureEnabled) return;
    if (!activeChallenge) return;

    if (Date.now() >= activeChallenge.end) {
      // 判定: lastSkillPurchaseTime を参照
      const lastPurchase = state.lastSkillPurchaseTime || 0;
      const success = lastPurchase < activeChallenge.start;
      if (success) {
        completeChallenge(CHALLENGE_ID, { xp: 0.05 });
      } else {
        try {
          const n = document.createElement('div');
          n.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 16px;background:#a0aec0;color:white;border-radius:10px;z-index:12000;box-shadow:0 8px 20px rgba(0,0,0,0.2);';
          n.textContent = 'チャレンジ失敗: 期間中にスキルを購入しました';
          document.body.appendChild(n);
          setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.4s'; setTimeout(() => n.remove(), 450); }, 2000);
        } catch (e) {}
      }
      setActiveChallenge(null);
      localStorage.removeItem('active_challenge');
    }
  }, [nowTs, activeChallenge, state.lastSkillPurchaseTime, challengeFeatureEnabled]);

  const startChallenge = () => {
    const start = Date.now();
    const end = start + CHALLENGE_DURATION_MS;
    const payload = { id: CHALLENGE_ID, start, end };
    setActiveChallenge(payload);
    localStorage.setItem('active_challenge', JSON.stringify(payload));
  };

  const abandon = () => {
    setActiveChallenge(null);
    localStorage.removeItem('active_challenge');
  };

  if (!challengeFeatureEnabled) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h2>チャレンジ</h2>
        <div style={{ color: '#6b7280' }}>チャレンジ機能は現在非公開です。</div>
        <div style={{ marginTop: 10 }}><Link to="/">メインへ戻る</Link></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h2>チャレンジ</h2>
      <h3>スキル購入禁止チャレンジ（10分）</h3>
      <p>条件: チャレンジ開始後10分間、スキルの購入（アップグレード）を行わないでください。成功すると恒久的な XP +5% ボーナスを獲得します。</p>

      {activeChallenge ? (
        <div>
          <div>状態: 進行中</div>
          <div>残り: {Math.max(0, Math.ceil((activeChallenge.end - nowTs) / 1000))} 秒</div>
          <div style={{ marginTop: 10 }}><button onClick={abandon}>中止</button></div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <button onClick={startChallenge}>チャレンジを開始する（10分）</button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <strong>現在の恒久ボーナス:</strong>
        <div>XP: +{(getChallengeBoost('xp') * 100).toFixed(1)}%</div>
        <div>コイン: +{(getChallengeBoost('coin') * 100).toFixed(1)}%</div>
      </div>

      <div style={{ marginTop: 12 }}><Link to="/skill-tree">スキルツリーへ戻る</Link></div>
    </div>
  );
};

export default ChallengePage;
