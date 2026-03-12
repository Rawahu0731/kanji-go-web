import { useEffect, useRef, useState } from 'react';
import { useGamification } from './contexts/GamificationContext';

// Background images used in the story
const STORY_BACKGROUNDS = [
  'bg_arena_trial_fire.jpg',
  'bg_gathering_square.jpg',
  'bg_ink_city_street.jpg',
  'bg_ink_realm_landscape.jpg',
  'bg_inn_moonlight_room.jpg',
  'bg_oldman_farewell.jpg',
  'bg_room_lonely_night.jpg',
  'bg_silent_horizon.jpg',
  'bg_soul_spring.jpg',
  'bg_text_layer_city.jpg',
  'bg_warehouse_gate.jpg',
  'bg_classroom.jpg'
];

// エンドロールのスクロール速度（ピクセル/秒）
// この値を変更すると流れる速度が変わります
const ENDROLL_SCROLL_SPEED_PX_PER_SEC = 50;

// 最終メッセージが表示されるまでの時間（秒）
const ENDROLL_FINAL_MESSAGE_DELAY_SEC = 320;

// Support both array-style import and object-style import
const normalizeEndroll = (raw: any) => {
  // Handle case where JSON root is an array wrapping an object: [{ lines: [...] }]
  if (Array.isArray(raw) && Array.isArray(raw[0]?.lines)) {
    const obj = raw[0];
    return { lines: Array.isArray(obj.lines) ? obj.lines : [], finalMessage: obj.finalMessage ?? '漢字勉強サイト', gapBeforeFinal: obj.gapBeforeFinal ?? 8 };
  }
  // Old format: direct array of strings
  if (Array.isArray(raw) && raw.every((r: any) => typeof r === 'string')) {
    return { lines: raw, finalMessage: '漢字勉強サイト', gapBeforeFinal: 8 };
  }
  if (raw && Array.isArray(raw.lines)) {
    return { lines: raw.lines, finalMessage: raw.finalMessage ?? '漢字勉強サイト', gapBeforeFinal: raw.gapBeforeFinal ?? 8 };
  }
  return { lines: [], finalMessage: '漢字勉強サイト', gapBeforeFinal: 8 };
};

type EndRollProps = {
  onBackToTitle?: () => void;
  onGameClear?: () => void; // called when player clicks the game-clear button
};

export default function EndRoll({ onBackToTitle, onGameClear }: EndRollProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gamification = useGamification();
  // アニメーション時間は速度から計算される
  const [effectiveRollDuration, setEffectiveRollDuration] = useState(320);
  const startOffsetSec = 0; // Start from the beginning of the audio
  const [showFinal, setShowFinal] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Background image rotation state
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(0);
  const [bgStyle, setBgStyle] = useState(() => generateRandomStyle());
  const bgIntervalRef = useRef<number | null>(null);

  // Load endroll data at runtime (public/endroll.json)
  const [endrollData, setEndrollData] = useState(() => normalizeEndroll(null));
  useEffect(() => {
    let mounted = true;
    fetch('/endroll.json')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setEndrollData(normalizeEndroll(j));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Use fetched JSON (normalized)
  const lines: string[] = Array.isArray(endrollData.lines) ? endrollData.lines.map((d) => String(d)) : [];
  const finalMessage = String(endrollData.finalMessage ?? '漢字勉強サイト');
  const gapBeforeFinal = Number(endrollData.gapBeforeFinal ?? 8);

  // Generate random position and rotation for background image
  function generateRandomStyle() {
    const isLeft = Math.random() > 0.5;
    const horizontalPos = Math.random() * 20 + 5; // 5-25% from edge
    const verticalPos = Math.random() * 60 + 20; // 20-80% from top
    const rotation = (Math.random() - 0.5) * 20; // -10deg to +10deg
    const size = Math.random() * 15 + 20; // 20-35% of viewport height

    return {
      isLeft,
      horizontalPos,
      verticalPos,
      rotation,
      size,
    };
  }

  useEffect(() => {
    // Start audio and ensure we don't forcibly stop it when the roll "ends".
    const audio = audioRef.current;
    if (!audio) return;
    
    console.log('🎵 EndRoll: Starting audio playback');
    
    // 音声を即座に読み込み開始
    audio.load();
    
    // リトライ付き再生関数
    const playWithRetries = async (attempts = 3): Promise<boolean> => {
      for (let i = 0; i < attempts; i++) {
        try {
          await audio.play();
          console.log('✅ EndRoll: Audio playing successfully');
          setAudioReady(true); // 再生成功したらエンドロールを開始
          return true;
        } catch (e) {
          console.warn(`❌ EndRoll: Audio play attempt ${i + 1} failed:`, e);
          if (i < attempts - 1) {
            await new Promise(r => setTimeout(r, 300));
            try { audio.load(); } catch (err) {}
          }
        }
      }
      console.error('❌ EndRoll: All audio play attempts failed');
      // 全ての試行が失敗してもエンドロールは開始する（ユーザーをブロックしない）
      setAudioReady(true);
      return false;
    };
    
    // Wait for metadata to be loaded before setting currentTime
    let startCalled = false;
    const startPlayback = async () => {
      if (startCalled) return;
      startCalled = true;
      try {
        audio.currentTime = startOffsetSec;
      } catch (e) {
        console.warn('Failed to set audio start position:', e);
      }
      await playWithRetries();
    };

    // loadeddataイベントで再生開始（より早く再生可能）
    const onLoadedData = () => {
      console.log('🎵 EndRoll: Audio loadeddata event fired');
      startPlayback();
    };

    audio.addEventListener('loadeddata', onLoadedData, { once: true });

    // 2秒経ってもloadeddataが発火しない場合は強制的に試みる
    const fallbackTimer = setTimeout(() => {
      console.log('⏰ EndRoll: Fallback timer triggered, readyState:', audio.readyState);
      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        // 音声が読み込めない場合でも、3秒後にはエンドロールを開始
        setTimeout(() => {
          console.warn('⏰ EndRoll: Starting without audio after timeout');
          setAudioReady(true);
        }, 1000);
      }
    }, 2000);
    
    return () => {
      clearTimeout(fallbackTimer);
      audio.removeEventListener('loadeddata', onLoadedData);
    };
    // do not pause audio on unmount to avoid abrupt cuts
  }, []);

  // Background image rotation effect (8 seconds per image with fade)
  useEffect(() => {
    // Fade in the first image
    setTimeout(() => setBgOpacity(1), 100);

    const fadeOutDuration = 800; // Fade out duration in ms
    const fadeInDuration = 800; // Fade in duration in ms
    const displayDuration = 8000; // Display duration for each image (8 seconds)

    const rotateBackground = () => {
      // Fade out
      setBgOpacity(0);
      
      setTimeout(() => {
        // Change position and image after fade out
        setBgStyle(generateRandomStyle());
        setCurrentBgIndex((prev) => (prev + 1) % STORY_BACKGROUNDS.length);
        
        // Fade in
        setTimeout(() => setBgOpacity(1), 50);
      }, fadeOutDuration);
    };

    // Start rotation after initial display
    const initialTimeout = setTimeout(rotateBackground, displayDuration);
    
    // Set up interval for subsequent rotations
    bgIntervalRef.current = window.setInterval(
      rotateBackground,
      displayDuration + fadeOutDuration + fadeInDuration
    );

    return () => {
      clearTimeout(initialTimeout);
      if (bgIntervalRef.current !== null) {
        clearInterval(bgIntervalRef.current);
      }
    };
  }, []);

  // Fade out background images when endroll finishes
  useEffect(() => {
    if (showFinal) {
      setBgOpacity(0);
      if (bgIntervalRef.current !== null) {
        clearInterval(bgIntervalRef.current);
      }
      // 2秒後にタイトルに戻るボタンを表示
      const timer = setTimeout(() => {
        setShowBackButton(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFinal]);

  // エンドロール完了後、ボタン押下時は onGameClear (優先) を呼び出します

  // Use the lines once (no duplication) — final blank gap is added in the JSX below.
  // Duplicating lines caused the visible loop (repeating credits). Keep a single set so
  // the first pass completes and the final message is shown once.
  const longCredits = Array.from(lines);

  const lastLineRef = useRef<HTMLParagraphElement | null>(null);
  const creditsRef = useRef<HTMLDivElement | null>(null);
  const rollStartedAtRef = useRef<number | null>(null);

  // 速度から時間を計算してアニメーションを設定
  useEffect(() => {
    console.log('🎬 Endroll useEffect triggered, audioReady:', audioReady);
    if (!audioReady) {
      console.log('⏸️ Audio not ready yet');
      return;
    }
    const creditsEl = creditsRef.current;
    console.log('🎬 creditsEl:', creditsEl);
    if (!creditsEl) {
      console.log('❌ creditsEl is null');
      return;
    }
    if (showFinal) {
      console.log('⏭️ showFinal is true, skipping');
      return;
    }
    
    const setAnimation = () => {
      console.log('🎬 setAnimation called');
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const creditsHeight = creditsEl.scrollHeight;
      
      // 移動距離 = 画面の高さ + コンテンツの高さ
      const totalDistance = vh + creditsHeight;
      
      // 時間 = 距離 ÷ 速度
      const duration = totalDistance / ENDROLL_SCROLL_SPEED_PX_PER_SEC;
      
      console.log('🎬 Endroll Animation Settings:');
      console.log('  Speed:', ENDROLL_SCROLL_SPEED_PX_PER_SEC, 'px/s');
      console.log('  Distance:', totalDistance, 'px');
      console.log('  Duration:', duration, 's');
      
      setEffectiveRollDuration(duration);
      
      creditsEl.style.animationPlayState = 'paused';
      // 開始位置: 画面下の外側（コンテンツ全体が見えない位置）
      creditsEl.style.setProperty('--start', `${vh}px`);
      // 終了位置: 画面上の外側（コンテンツ全体が画面外に出る位置）
      creditsEl.style.setProperty('--end', `${-creditsHeight}px`);
      creditsEl.style.setProperty('--roll-duration', `${duration}s`);
      creditsEl.style.animationDuration = `${duration}s`;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      creditsEl.offsetHeight;
      creditsEl.style.animationPlayState = 'running';
      // record animation start time to avoid immediate onAnimationEnd races
      try { rollStartedAtRef.current = Date.now(); } catch (e) { rollStartedAtRef.current = null; }
    };
    
    setAnimation();
  }, [audioReady, showFinal]);

  // 固定時間後に最終メッセージを表示（計算なし）
  useEffect(() => {
    if (!audioReady) return;
    if (showFinal) return; // already shown
    let t = 0 as number;
    t = window.setTimeout(() => {
      // guard to avoid redundant state updates
      setShowFinal((prev) => prev || true);
    }, ENDROLL_FINAL_MESSAGE_DELAY_SEC * 1000);
    return () => clearTimeout(t);
  }, [audioReady]);

  // showFinal/ended will be set when the CSS animation ends (onAnimationEnd below)

  return (
    <div className="endroll-root" style={{position: 'fixed', inset: 0, zIndex: 200}}>
      <style>{`
            .endroll-viewport{ position:relative; height:100vh; width:100%; overflow:hidden; background:#000; color:#fff; display:flex; align-items:flex-start; }
            .endroll-credits{ width:100%; text-align:center; font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; font-size:20px; line-height:1; padding:40px 20px; animation: endrollScroll var(--roll-duration, ${effectiveRollDuration}s) linear forwards; position:absolute; top:0; left:0; right:0; z-index:3; }
          .endroll-credits p{ display:block; margin:0 0 24px 0; line-height:2.6 !important; opacity:0.95; position:static !important; height:auto !important; white-space:normal !important; }
        .endroll-fade-top, .endroll-fade-bottom{ position:absolute; left:0; right:0; height:12vh; pointer-events:none; z-index:4 }
        .endroll-fade-top{ top:0; background:linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0)); }
        .endroll-fade-bottom{ bottom:0; background:linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0)); }
        .endroll-skip{ position:fixed; right:18px; bottom:18px; z-index:60; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.08); padding:8px 12px; border-radius:6px; cursor:pointer }
        .endroll-loading{ position:fixed; inset:0; background:#000; color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; z-index:250; }
        @keyframes endrollScroll { from { transform: translateY(var(--start, 100%)); } to { transform: translateY(var(--end, -100%)); } }
      `}</style>

      {/* 音声が準備できるまでローディング表示 */}
      {!audioReady && (
        <div className="endroll-loading">
          読み込み中...
        </div>
      )}

      {/* 音声が準備できたらエンドロールを表示 */}
      {audioReady && (
        <div className="endroll-viewport" onClick={() => { const a = audioRef.current; if (a && a.paused) { a.play().catch(()=>{}); } }}>
        {/* Background image display */}
        <img
          key={currentBgIndex}
          src={`/images/backgrounds/${STORY_BACKGROUNDS[currentBgIndex]}`}
          alt=""
          style={{
            position: 'absolute',
            [bgStyle.isLeft ? 'left' : 'right']: `${bgStyle.horizontalPos}%`,
            top: `${bgStyle.verticalPos}%`,
            transform: `translate(-50%, -50%) rotate(${bgStyle.rotation}deg)`,
            height: `${bgStyle.size}vh`,
            width: 'auto',
            opacity: bgOpacity * 0.7,
            transition: 'opacity 800ms ease-in-out',
            objectFit: 'cover',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

          <div
          ref={creditsRef}
          className={`endroll-credits ${showFinal ? 'endroll-credits-hidden' : ''}`}
          aria-hidden
          style={{ animationDuration: `${effectiveRollDuration}s`, animationIterationCount: 1 as any }}
          onAnimationEnd={() => {
            // ignore spurious immediate animationend events that happen
            // when the animation was effectively 0ms or the element wasn't measured yet.
            const started = rollStartedAtRef.current;
            const now = Date.now();
            if (started && now - started < 800) {
              console.log('⏭️ Ignoring immediate animationend (too fast)', { deltaMs: now - started });
              return;
            }
            if (!showFinal) setShowFinal(true);
          }}
        >
          {longCredits.map((line, i) => {
            const lastIndex = longCredits.length - 1;
            const isTheEnd = line.includes('***THE END***');
            const displayText = isTheEnd ? line.replace(/\*\*\*/g, '') : line;
            return (
              <p
                key={i}
                ref={i === lastIndex ? lastLineRef : undefined}
                style={{ 
                  lineHeight: '5.0', 
                  marginBottom: '60px',
                  ...(isTheEnd && { 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    marginTop: '80px'
                  })
                }}
              >
                {displayText}
              </p>
            );
          })}
          {/* pad some blank lines before revealing final message */}
          {Array.from({ length: gapBeforeFinal }).map((_, i) => <p key={`gap-${i}`}>{''}</p>)}
        </div>

        {/* final centered message */}
        {showFinal && (
          <div className="endroll-final" aria-hidden>
            <div className="endroll-final-inner">
              <img src="/kanji_logo.png" alt={finalMessage} style={{ maxWidth: '400px', height: 'auto' }} />
            </div>
            {showBackButton && (onGameClear || onBackToTitle) && (
              <button
                onClick={() => {
                  // grant zero and mark completed as before
                  if (!gamification.state.hasCompletedEndroll) {
                    try { gamification.addCharacter('zero'); } catch (e) { console.warn('Failed to add character zero directly:', e); }
                    gamification.setHasCompletedEndroll(true);
                  }
                  // prefer onGameClear, fallback to onBackToTitle
                  if (onGameClear) { onGameClear(); } else if (onBackToTitle) { onBackToTitle(); }
                }}
                className="endroll-back-button"
                style={{
                  marginTop: '40px',
                  padding: '12px 24px',
                  fontSize: '18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(90deg,#ffd27a,#ff8aa1)',
                  color: '#0b1720',
                  border: 'none',
                  cursor: 'pointer',
                  animation: 'buttonFadeIn 800ms ease-out forwards',
                  opacity: 0,
                  fontWeight: 700
                }}
              >
                ゲームクリア
              </button>
            )}
          </div>
        )}

        {/* no persistent last-line rendering; finalMessage shows after animation only */}

        <div className="endroll-fade-top" />
        <div className="endroll-fade-bottom" />
        </div>
      )}

      <audio ref={audioRef} src={'/Still.mp3'} preload="auto" />

      <style>{`
        .endroll-final{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:30; flex-direction:column; }
        .endroll-final-inner{ color:#fff; font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; font-size:48px; font-weight:700; transform: translateY(30vh); opacity:0; animation: finalRise 900ms ease-out forwards; display:flex; flex-direction:column; align-items:center; }
        @keyframes finalRise { from { transform: translateY(30vh); opacity:0 } to { transform: translateY(0); opacity:1 } }
        @keyframes buttonFadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        .endroll-credits-hidden{ opacity:0; transition: opacity 600ms ease-out; pointer-events:none }
        .endroll-back-button:hover{ background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  );
}
