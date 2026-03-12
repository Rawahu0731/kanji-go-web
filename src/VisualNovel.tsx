import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { Scene } from './storyParser';
import { loadStory } from './storyParser';
import { useGamification } from './contexts/GamificationContext';
import './VisualNovel.css';
import EndRoll from './EndRoll';
import CenterScrollText from './CenterScrollText';
import Quiz from './Quiz';
import TitleScreen from './TitleScreen';
import ChapterSelect from './ChapterSelect';
import RtaResult from './RtaResult';
import { startRta, endRta } from './utils/rtaTimer';

const CHARACTER_IMAGES: Record<string, string> = {
  '太郎': '/images/man.png',
  '彁': '/images/sei.png',
  '零': '/images/zeroAnime/frame01.png',
  '焔': '/images/en.png', 
  '結': '/images/yui.png', 
  '守': '/images/mamoru.png', 
  '問': '/images/toi.png', 
  '希': '/images/nozomi.png', 
  '老人': '/images/keirou_ojiichan_smile2.png', 
  'クラスメイト': '/images/boy_face_smile.png', 
};

export default function VisualNovel() {
  const location = useLocation();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [showChapterTitle, setShowChapterTitle] = useState(true); // 章タイトルを表示するかどうか
  const [loading, setLoading] = useState(true);
  const ZERO_FRAMES = 16;
  const ZERO_FPS = 24; // default frames per second for the animation (adjustable)
  const [zeroUnlocked, setZeroUnlocked] = useState(false);
  const [zeroTriggers, setZeroTriggers] = useState<Set<string>>(new Set());
  // ゲート用アンロック管理（シーン単位）
  const [unlockedScenes, setUnlockedScenes] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem('unlockedScenes');
      if (raw) {
        return new Set(JSON.parse(raw) as number[]);
      }
    } catch (e) {
      console.error('❌ Error loading unlockedScenes:', e);
    }
    return new Set([0]);
  });
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTargetScene, setQuizTargetScene] = useState<number | null>(null);
  const [showTitle, setShowTitle] = useState(true);
  const [showChapterSelect, setShowChapterSelect] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const check = () => {
      try {
        const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
        const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
        const hasFinePointer = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;
        setIsDesktop(!isMobile && Boolean(hasFinePointer));
      } catch (e) {
        setIsDesktop(true);
      }
    };
    check();
    try { window.addEventListener('resize', check); } catch (e) { /* ignore */ }
    return () => { try { window.removeEventListener('resize', check); } catch (e) { /* ignore */ } };
  }, []);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterLoadProgress, setChapterLoadProgress] = useState<{loaded:number; total:number}>({loaded:0, total:0});
  const [, setChapterLoadingText] = useState('');
  // クイズクリア状態を管理（章インデックスをキーとする）
  const [clearedQuizzes, setClearedQuizzes] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem('clearedQuizzes');
      if (raw) {
        return new Set(JSON.parse(raw) as number[]);
      }
    } catch (e) {
      console.error('❌ Error loading clearedQuizzes:', e);
    }
    return new Set();
  });
  // 章の読了状態を管理（章インデックスをキーとする）
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem('completedChapters');
      if (raw) {
        return new Set(JSON.parse(raw) as number[]);
      }
    } catch (e) {
      console.error('❌ Error loading completedChapters:', e);
    }
    return new Set();
  });
  // endroll transition state
  const [pendingEndroll, setPendingEndroll] = useState(false);
  const [showEndroll, setShowEndroll] = useState(false);
  const ENDROLL_FADE_MS = 2000;
  const rtaStartedRef = useRef(false);
  const [showRtaResult, setShowRtaResult] = useState(false);
  const [rtaResult, setRtaResult] = useState<{startIso:string; endIso:string; elapsedMs:number} | null>(null);
  // When true, suppress story/BGM/dialogue playback (used while RTA result modal is open)
  const [suppressStory, setSuppressStory] = useState(false);
  // video-only: use /images/zero.mp4 (looped)
  // ログ表示機能
  // ログ表示機能（内部 state を使わずコンソール出力のみ）
  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    // 併せてコンソールにも出す
    // eslint-disable-next-line no-console
    console.log(`${ts} ${msg}`);
  };

  // keep refs in sync with latest indices for async handlers
  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex;
    currentDialogueIndexRef.current = currentDialogueIndex;
  }, [currentSceneIndex, currentDialogueIndex]);
  // 表示済み台詞の履歴（トランスクリプト）表示フラグ
  const [showTranscript, setShowTranscript] = useState(false);

  // 自動進行 (音声終了後に自動で次へ進む) の設定
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('autoAdvanceEnabled');
      if (raw !== null) return JSON.parse(raw) === true;
    } catch (e) {
      // ignore
    }
    return true;
  });
  useEffect(() => {
    try { localStorage.setItem('autoAdvanceEnabled', JSON.stringify(autoAdvanceEnabled)); } catch (e) {}
  }, [autoAdvanceEnabled]);

  useEffect(() => {
    loadStory().then((loadedScenes: Scene[]) => {
      setScenes(loadedScenes as Scene[]);
      // compute zero trigger positions from dialogues in the parsed scenes
      const triggers = new Set<string>();
      const zeroRegex = /^\s*[「『]?\s*零\s*[。\.!！…]*\s*[」』]?\s*$/;
      loadedScenes.forEach((s: Scene, si: number) => {
        (s.dialogues || []).forEach((d: any, di: number) => {
          const txt = (d.text || '').toString();
          if (zeroRegex.test(txt)) {
            // only register zero triggers for scenes 7 and 8 (1-based)
            if (si === 6 || si === 7) triggers.add(`${si}:${di}`);
          }
        });
      });
      setZeroTriggers(triggers);
      setLoading(false);
      addLog(`Story loaded: ${loadedScenes.length} scenes`);
    });
  }, []);

  // helper: preload assets (images, voice, zero frames, bgm) for a given chapter
  const preloadChapterAssets = async (chapterIndex: number) => {
    const scene = scenes[chapterIndex];
    if (!scene) return;
    const urls = new Set<string>();

    // include BGM (第8章は /BGM2.mp3 を使用)
    if (chapterIndex === 8) {
      urls.add('/BGM2.mp3');
    } else {
      urls.add('/BGM.mp3');
    }

    if ((scene as any).background) {
      const name = (scene as any).background;
      ['.jpg', '.png', '.jpeg', '.webp'].forEach(ext => urls.add(`/images/backgrounds/${name}${ext}`));
    }

    (scene.dialogues || []).forEach((d: any) => {
      if (d.background) {
        const name = d.background;
        ['.jpg', '.png', '.jpeg', '.webp'].forEach(ext => urls.add(`/images/backgrounds/${name}${ext}`));
      }
      if (Array.isArray(d.characters)) {
        d.characters.forEach((c: string) => {
          const img = CHARACTER_IMAGES[c];
          if (img) urls.add(img);
          if (c === '零') {
            for (let i = 1; i <= ZERO_FRAMES; i++) {
              urls.add(`/images/zeroAnime/frame${String(i).padStart(2, '0')}.png`);
            }
          }
        });
      }
      if (Array.isArray(d.voice)) {
        d.voice.forEach((v: string) => {
          let src = String(v || '').replace(/\\/g, '/');
          if (!src.startsWith('/')) src = '/' + src.replace(/^\/+/,'');
          urls.add(src);
          console.log('📦 Preloading voice:', src);
        });
      }
    });

    const urlArray = Array.from(urls);
    setChapterLoadProgress({loaded: 0, total: urlArray.length});
    setChapterLoading(true);
    setChapterLoadingText('読み込み中...');

    let loaded = 0;
    const promises = urlArray.map((u) => new Promise<void>((resolve) => {
      if (u.endsWith('.wav') || u.endsWith('.mp3') || u.endsWith('.ogg')) {
        const audio = new Audio();
        audio.oncanplaythrough = () => { loaded++; setChapterLoadProgress({loaded, total: urlArray.length}); resolve(); };
        audio.onerror = () => { loaded++; setChapterLoadProgress({loaded, total: urlArray.length}); resolve(); };
        audio.preload = 'auto';
        audio.src = u;
      } else {
        const img = new Image();
        img.onload = () => { loaded++; setChapterLoadProgress({loaded, total: urlArray.length}); resolve(); };
        img.onerror = () => { loaded++; setChapterLoadProgress({loaded, total: urlArray.length}); resolve(); };
        img.src = u;
      }
    }));

    // wait for all or timeout
    await Promise.race([Promise.all(promises), new Promise(res => setTimeout(res, 10000))]);
    setTimeout(() => {
      setChapterLoading(false);
      setChapterLoadingText('');
    }, 200);
  };

  // Gamification state と同期: Firebase に保存された進行状況があればローカル state に反映する
  const { state: gamState, setStoryProgress } = useGamification();

  // Only update local Sets when remote arrays actually differ to avoid
  // triggering unnecessary setState -> render cycles that can lead to
  // maximum update depth errors.
  useEffect(() => {
    try {
      if (Array.isArray(gamState.unlockedScenes)) {
        const remote = new Set<number>(gamState.unlockedScenes as number[]);
        setUnlockedScenes(prev => {
          const equal = remote.size === prev.size && Array.from(remote).every(n => prev.has(n));
          return equal ? prev : remote;
        });
      }
    } catch (e) { /* ignore */ }

    try {
      if (Array.isArray(gamState.clearedQuizzes)) {
        const remote = new Set<number>(gamState.clearedQuizzes as number[]);
        setClearedQuizzes(prev => {
          const equal = remote.size === prev.size && Array.from(remote).every(n => prev.has(n));
          return equal ? prev : remote;
        });
      }
    } catch (e) { /* ignore */ }

    try {
      if (Array.isArray(gamState.completedChapters)) {
        const remote = new Set<number>(gamState.completedChapters as number[]);
        setCompletedChapters(prev => {
          const equal = remote.size === prev.size && Array.from(remote).every(n => prev.has(n));
          return equal ? prev : remote;
        });
      }
    } catch (e) { /* ignore */ }
  // Removed local sets from deps to prevent infinite loop
  }, [gamState.unlockedScenes, gamState.clearedQuizzes, gamState.completedChapters]);

  // ChapterSelectPageからの章選択・クイズ開始を処理
  useEffect(() => {
    if (scenes.length === 0) return;
    
    // 章選択から来た場合
    const selectedChapter = localStorage.getItem('selectedChapter');
    const startFromChapterSelect = localStorage.getItem('startFromChapterSelect');
    if (selectedChapter && startFromChapterSelect === 'true') {
      const chapterIndex = parseInt(selectedChapter);
      if (!isNaN(chapterIndex) && chapterIndex >= 0 && chapterIndex < scenes.length) {
        (async () => {
          try {
            await preloadChapterAssets(chapterIndex);
          } catch (e) {
            console.error('Preload error from ChapterSelectPage:', e);
          }
          setCurrentSceneIndex(chapterIndex);
          setCurrentDialogueIndex(0);
          setShowChapterTitle(true);
          setShowTitle(false);
          setShowChapterSelect(false);
        })();
      }
      localStorage.removeItem('selectedChapter');
      localStorage.removeItem('startFromChapterSelect');
    }
    
    // クイズ開始から来た場合
    const quizChapter = localStorage.getItem('quizChapter');
    const startQuiz = localStorage.getItem('startQuiz');
    if (quizChapter && startQuiz === 'true') {
      const chapterIndex = parseInt(quizChapter);
      if (!isNaN(chapterIndex) && chapterIndex >= 0 && chapterIndex < scenes.length) {
        setQuizTargetScene(chapterIndex);
        setQuizOpen(true);
        setShowTitle(false);
        openChapterSelect(); // クイズ中は章選択画面を表示したまま
      }
      localStorage.removeItem('quizChapter');
      localStorage.removeItem('startQuiz');
    }

  }, [scenes]);

  

  // テスト用: ChapterSelectPage からエンドロールを直接開始するフラグを監視（location.state 経由）
  useEffect(() => {
    const state = location.state as any;
    // showRtaOnly: 直接結果画面を表示（エンドロールは開始しない）
    if (state?.showRtaOnly === true) {
      console.log('🎬 showRtaOnly flag detected from navigation state');
      stopAllAudio();
      // If a synthesized rtaResult is provided in navigation state, use it directly.
      if (state.rtaResult) {
        try {
          setRtaResult(state.rtaResult as any);
          // suppress story playback while showing the result modal
          setSuppressStory(true);
          setShowRtaResult(true);
        } catch (e) {
          console.warn('Failed to apply rtaResult from state', e);
        }
      } else {
        // fallback: call existing handler which uses endRta()
        try { handleGameClear(); } catch (e) { console.warn('showRtaOnly handler failed', e); }
      }
      try { window.history.replaceState({}, document.title); } catch (e) {}
      return;
    }

    if (state?.startEndroll === true) {
      console.log('🎬 startEndroll flag detected from navigation state');
      // タイトルや章選択がまだ表示されている場合は解除してから遷移
      setShowTitle(false);
      setShowChapterSelect(false);
      // 音声類は停止してからエンドロールに移行
      stopAllAudio();
      if (!pendingEndroll && !showEndroll) {
        console.log('🎬 Triggering endroll from test button (navigation state)');
        setPendingEndroll(true);
        setTimeout(() => {
          setShowEndroll(true);
          // autoFinishRta オプションがあれば、少し遅らせてクリア処理を実行
          if (state?.autoFinishRta) {
            setTimeout(() => {
              try { handleGameClear(); } catch (e) { console.warn('autoFinishRta handler failed', e); }
            }, 300);
          }
        }, ENDROLL_FADE_MS);
      }
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // エンドロール上のゲームクリア処理を共通化（EndRoll のボタンや外部トリガーから呼べる）
  const handleGameClear = async () => {
    try {
      const result = await endRta(true);
      if (result) {
        setRtaResult(result);
        // suppress story playback while showing the result modal
        setSuppressStory(true);
        setShowRtaResult(true);
      } else {
        try { alert('RTAタイマーが開始されていませんでした'); } catch (e) { console.log('RTA not started'); }
        // fallback to title
        setShowTitle(true);
      }
    } catch (e) {
      console.warn('RTA end error', e);
      setShowTitle(true);
    } finally {
      // 再生中の音声を停止して、エンドロール状態をリセット
      try { stopAllAudio(); } catch (e) { /* ignore */ }
      setShowEndroll(false);
      setPendingEndroll(false);
      setShowChapterSelect(false);
    }
  };

  // unlockedScenes を保存
  useEffect(() => {
    try {
      const data = Array.from(unlockedScenes);
      localStorage.setItem('unlockedScenes', JSON.stringify(data));
      console.log('💾 Saved unlockedScenes:', data);
      // Firebaseへも保存
      if (typeof setStoryProgress === 'function') {
        setStoryProgress({ unlockedScenes: data });
      }
    } catch (e) {
      console.error('❌ Error saving unlockedScenes:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedScenes]);

  // clearedQuizzes を保存
  useEffect(() => {
    try {
      const data = Array.from(clearedQuizzes);
      localStorage.setItem('clearedQuizzes', JSON.stringify(data));
      console.log('💾 Saved clearedQuizzes:', data);
      // Firebaseへも保存
      if (typeof setStoryProgress === 'function') {
        setStoryProgress({ clearedQuizzes: data });
      }
    } catch (e) {
      console.error('❌ Error saving clearedQuizzes:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearedQuizzes]);

  // completedChapters を保存
  useEffect(() => {
    try {
      const data = Array.from(completedChapters);
      localStorage.setItem('completedChapters', JSON.stringify(data));
      console.log('💾 Saved completedChapters:', data);
      // Firebaseへも保存
      if (typeof setStoryProgress === 'function') {
        setStoryProgress({ completedChapters: data });
      }
    } catch (e) {
      console.error('❌ Error saving completedChapters:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedChapters]);

  // ページ全体のスクロールを無効化する（コンポーネントマウント時）
  useEffect(() => {
    try {
      document.body.classList.add('vn-no-scroll');
    } catch (e) {
      // ignore server-side or non-browser environments
    }
    return () => {
      try {
        document.body.classList.remove('vn-no-scroll');
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // video playback handled in render when `零` is visible

  // 現在の台詞からstory.jsonのcharactersフィールドを取得
  const getCurrentCharacters = (): string[] => {
    const currentScene = scenes[currentSceneIndex];
    if (!currentScene) return [];
    const currentDialogue = currentScene.dialogues[currentDialogueIndex];
    const dialogueChars = (currentDialogue as any)?.characters;
    if (Array.isArray(dialogueChars)) {
      return dialogueChars;
    }
    return [];
  };

  // シーン／台詞の変更をログに残す
  // useEffect(() => {
  //   const scene = scenes[currentSceneIndex];
  //   const dlg = scene?.dialogues?.[currentDialogueIndex];
  //   const text = (dlg && dlg.text) ? dlg.text.toString() : '';
  //   addLog(`Scene ${currentSceneIndex + 1}/${scenes.length} Dialogue ${currentDialogueIndex + 1}/${scene?.dialogues?.length || 0}: ${text}`);
  // }, [currentSceneIndex, currentDialogueIndex, scenes]);

  // 現在のシーンに零が含まれるか判定するユーティリティ
  function sceneContainsZero(scene: any) {
    if (!scene) return false;
    return Array.isArray(scene.characters) && scene.characters.includes('零');
  }

  // ヘルパー: dialogue.speaker が特定の名前を含むか判定
  function speakerIncludes(s: any, name: string) {
    if (!s) return false;
    if (Array.isArray(s)) return s.includes(name);
    if (typeof s === 'string') return s === name || s.includes(name);
    return false;
  }

  // (zero utterance detection is handled via `zeroTriggers` derived from the parsed story)

  // zero フレームを事前読み込みして滑らかに再生する
  const zeroFramesRef = React.useRef<HTMLImageElement[] | null>(null);
  const animRef = React.useRef<number | null>(null);
  const frameIndexRef = React.useRef(0);
  // audio players for dialogue voice playback
  const audioPlayersRef = React.useRef<HTMLAudioElement[]>([]);
  // background music (separate from dialogue audioPlayers)
  const bgmRef = React.useRef<HTMLAudioElement | null>(null);

  // helper: try to play an HTMLAudioElement with retries to handle transient autoplay/resume issues
  const playAudioWithRetries = async (audio: HTMLAudioElement, attempts = 3, delayMs = 250) => {
    try {
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        await p;
        return true;
      }
      return true;
    } catch (err) {
      if (attempts <= 1) {
        return false;
      }
      // wait and retry
      await new Promise(r => setTimeout(r, delayMs));
      try {
        audio.load();
      } catch (e) {}
      return playAudioWithRetries(audio, attempts - 1, delayMs);
    }
  };

  // track how many audio items are pending/playing for the current dialogue
  const pendingAudioCountRef = React.useRef(0);
  // timeout id for delayed auto-advance after audio finishes
  const pendingAdvanceTimeoutRef = React.useRef<number | null>(null);
  // timeout id for auto-advancing from chapter title
  const pendingTitleTimeoutRef = React.useRef<number | null>(null);
  // prevent rapid toggling of chapter select which can cause UI thrash
  const pendingChapterSelectRef = React.useRef(false);
  const openChapterSelect = () => {
    if (pendingChapterSelectRef.current) return;
    pendingChapterSelectRef.current = true;
    stopAllAudio();
    setShowChapterSelect(true);
    // clear the flag after a short window
    setTimeout(() => { pendingChapterSelectRef.current = false; }, 500);
  };
  // keep latest indices in refs so async handlers can verify current position
  const currentSceneIndexRef = React.useRef(currentSceneIndex);
  const currentDialogueIndexRef = React.useRef(currentDialogueIndex);

  const stopAllAudio = () => {
    try {
      audioPlayersRef.current.forEach((a) => {
        try {
          // remove any attached handlers to avoid triggering after stop
          const anyA = a as any;
          if (anyA._vn_onended) try { a.removeEventListener('ended', anyA._vn_onended); } catch(e){}
          if (anyA._vn_onerror) try { a.removeEventListener('error', anyA._vn_onerror); } catch(e){}
          a.pause();
          a.currentTime = 0;
        } catch (e) {
          // ignore
        }
      });
    } finally {
      audioPlayersRef.current = [];
      pendingAudioCountRef.current = 0;
      if (pendingAdvanceTimeoutRef.current !== null) {
        try { clearTimeout(pendingAdvanceTimeoutRef.current); } catch (e) {}
        pendingAdvanceTimeoutRef.current = null;
      }
    }
  };

  // BGM: play when entering story screen (not title, not chapter select, not endroll)
  useEffect(() => {
    const inStory = !showTitle && !showChapterSelect && !showEndroll && !loading && !suppressStory;
    if (inStory) {
      if (!bgmRef.current) {
        try {
          const bgm = new Audio();
          bgm.loop = true;
          bgm.preload = 'auto';
          bgm.src = currentSceneIndex === 8 ? '/BGM2.mp3' : '/BGM.mp3';
          // BGMを控えめにする（ボイスを相対的に聞きやすくするため）
          bgm.volume = 0.4;
          bgmRef.current = bgm;
          
          let bgmStarted = false;
          
          // BGM再生開始関数
          const startBGM = () => {
            if (bgmStarted) return;
            
            console.log('🎵 BGM state:', { readyState: bgm.readyState, duration: bgm.duration });
            
            // readyStateが十分でない場合はスキップ
            if (bgm.readyState < 3) {
              console.log('⏸️ BGM not ready yet, readyState:', bgm.readyState);
              return;
            }
            
            if (!bgm.duration || bgm.duration === Infinity || isNaN(bgm.duration)) {
              console.log('⏸️ BGM invalid duration:', bgm.duration);
              return;
            }
            
            bgmStarted = true;
            
            playAudioWithRetries(bgm).then(ok => {
              if (ok) {
                console.log('✅ BGM playing, duration:', bgm.duration);
              } else {
                console.warn('❌ BGM play failed after retries');
              }
            }).catch(e => { console.warn('❌ BGM play failed', e); });
          };
          
          // canplaythroughイベントを待つ
          bgm.addEventListener('canplaythrough', startBGM, { once: true });
          
          // 読み込み開始
          bgm.load();
          
          // 3秒経ってもcanplaythroughが発火しない場合は強制的に試みる
          setTimeout(() => {
            if (!bgmStarted && bgm.readyState >= 3) {
              console.log('⏰ BGM timeout fallback');
              startBGM();
            }
          }, 3000);
        } catch (e) {
          console.warn('BGM init failed', e);
        }
      }
    } else {
      if (bgmRef.current) {
        try { bgmRef.current.pause(); bgmRef.current.currentTime = 0; } catch (e) {}
        bgmRef.current = null;
      }
    }

    return () => {
      // do not interfere with dialogue audioPlayers; just stop bgm when cleaning up
      if (bgmRef.current) {
        try { bgmRef.current.pause(); bgmRef.current = null; } catch (e) {}
      }
    };
  }, [showTitle, showChapterSelect, showEndroll, loading, currentSceneIndex, suppressStory]);

  // 一度だけフレームをプリロード
  useEffect(() => {
    if (zeroFramesRef.current) return;

    // First try deterministic frameNN pattern and keep order
    const frameOrdered: Array<HTMLImageElement | null> = new Array(ZERO_FRAMES).fill(null);
    let remainingFrame = ZERO_FRAMES;
    let anyFrameLoaded = false;

    for (let i = 1; i <= ZERO_FRAMES; i++) {
      const idx = i - 1;
      const src = `/images/zeroAnime/frame${String(i).padStart(2, '0')}.png`;
      const img = new Image();
      img.onload = () => {
        frameOrdered[idx] = img;
        anyFrameLoaded = true;
        remainingFrame--;
        if (remainingFrame <= 0) {
          if (anyFrameLoaded) {
            zeroFramesRef.current = frameOrdered.filter(Boolean) as HTMLImageElement[];
          }
        }
        // addLog(`Preloaded zero frame: ${src}`);
      };
      img.onerror = () => {
        remainingFrame--;
        if (remainingFrame <= 0) {
          if (anyFrameLoaded) {
            zeroFramesRef.current = frameOrdered.filter(Boolean) as HTMLImageElement[];
          }
        }
      };
      img.src = src;
    }

    // If none of the frameNN pattern existed, try Scene1_000..Scene1_099 deterministically
    setTimeout(() => {
      if (zeroFramesRef.current && zeroFramesRef.current.length > 0) return;
      const sceneMapSize = 100;
      const sceneOrdered: Array<HTMLImageElement | null> = new Array(sceneMapSize).fill(null);
      let remainingScene = sceneMapSize;
      let anySceneLoaded = false;
      for (let i = 0; i < sceneMapSize; i++) {
        const src = `/images/zeroAnime/Scene1_${String(i).padStart(3, '0')}.png`;
        const img = new Image();
        img.onload = () => {
          sceneOrdered[i] = img;
          anySceneLoaded = true;
          remainingScene--;
          if (remainingScene <= 0 && anySceneLoaded) {
            zeroFramesRef.current = sceneOrdered.filter(Boolean) as HTMLImageElement[];
          }
          // addLog(`Preloaded zero frame (alt): ${src}`);
        };
        img.onerror = () => {
          remainingScene--;
          if (remainingScene <= 0 && anySceneLoaded) {
            zeroFramesRef.current = sceneOrdered.filter(Boolean) as HTMLImageElement[];
          }
        };
        img.src = src;
      }
      // final safety: if none loaded, set null
      setTimeout(() => {
        if (!zeroFramesRef.current) zeroFramesRef.current = null;
      }, 1000);
    }, 300);
  }, []);

  // アニメーションループを常時回し、表示されているときのみ img.src を更新する。
  // こうすることで表示・非表示を切り替えても再生位置がリセットされない。
  useEffect(() => {
    const frames = zeroFramesRef.current;
    if (!frames || frames.length === 0) return;
    if (animRef.current) return; // 既にループ中

    const frameDuration = 1000 / ZERO_FPS;
    let lastTs = 0;

    const step = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const elapsed = ts - lastTs;
      if (elapsed >= frameDuration) {
        frameIndexRef.current = (frameIndexRef.current + 1) % frames.length;
        lastTs = ts;
      }

      // 画像要素が存在し、表示条件が満たされているときだけ src を更新
      const imgEl = document.getElementById('zero-sprite-img') as HTMLImageElement | null;
      // テスト用のキャラクター配列も考慮して零が含まれるか判定
      const currentChars = getCurrentCharacters();
      const hasZero = currentChars.includes('零');
      const sceneHasZeroNow = sceneContainsZero(scenes[currentSceneIndex]);
      const key = `${currentSceneIndex}:${currentDialogueIndex}`;
      const triggerNow = zeroTriggers.has(key);
      const shouldShow = zeroUnlocked || sceneHasZeroNow || triggerNow || hasZero;
      if (imgEl && shouldShow && frames[frameIndexRef.current]) {
        imgEl.src = frames[frameIndexRef.current].src;
      }

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [zeroTriggers, zeroUnlocked, scenes, currentSceneIndex, currentDialogueIndex, ZERO_FPS]);

  // シーンが変わったとき、もしそのシーンの characters に 零 が含まれていたら
  // 一度フラグを立てて以後表示を永続化する
  useEffect(() => {
    const sceneHas = sceneContainsZero(scenes[currentSceneIndex]);
    const key = `${currentSceneIndex}:${currentDialogueIndex}`;
    // If the scene is one that should contain 零, or the current dialogue
    // matches a zero trigger, unlock zero. Also unlock when the specific
    // line in scene7 appears: "久しぶりだね、彁。君は、また意味を持とうとしてるんだね"
    const currentText = scenes[currentSceneIndex]?.dialogues?.[currentDialogueIndex]?.text || '';
    const triggerLine = '久しぶりだね、彁。君は、また意味を持とうとしてるんだね';
    if (sceneHas || zeroTriggers.has(key) || currentText.includes(triggerLine)) {
      if (!zeroUnlocked) {
        setZeroUnlocked(true);
        addLog('Zero unlocked');
      }
    }
  }, [scenes, currentSceneIndex, currentDialogueIndex, zeroTriggers]);

  // 台詞が表示された瞬間に対応する voice ファイルを再生する
  useEffect(() => {
    // If story playback is suppressed (e.g., result modal open), do nothing
    if (suppressStory) {
      stopAllAudio();
      return;
    }
    // 章タイトル表示中は音声を再生しない
    if (showChapterTitle) {
      stopAllAudio();
      return;
    }

    // 章選択・タイトル・エンドロール（フェード中含む）・クイズ表示中は音声を再生しない
    if (showChapterSelect || showTitle || showEndroll || pendingEndroll || quizOpen) {
      stopAllAudio();
      return;
    }

    // ensure any previous dialogue audio stopped before starting new ones
    stopAllAudio();
    try {
      const dialog = scenes?.[currentSceneIndex]?.dialogues?.[currentDialogueIndex];
      const voices = dialog?.voice;
      console.log('🎵 Dialogue voice check:', { sceneIndex: currentSceneIndex, dialogueIndex: currentDialogueIndex, voices, text: dialog?.text?.substring(0, 30) });
      if (!voices || !Array.isArray(voices) || voices.length === 0) return;

      // set count of pending audios for this dialogue
      if (pendingAdvanceTimeoutRef.current !== null) {
        try { clearTimeout(pendingAdvanceTimeoutRef.current); } catch (e) {}
        pendingAdvanceTimeoutRef.current = null;
      }
      pendingAudioCountRef.current = voices.length;
      const localScene = currentSceneIndex;
      const localDialogue = currentDialogueIndex;

      const onOneFinished = () => {
        pendingAudioCountRef.current = Math.max(0, pendingAudioCountRef.current - 1);
        console.log('🎵 Audio finished, remaining:', pendingAudioCountRef.current);
        if (pendingAudioCountRef.current <= 0) {
          console.log('🎵 All audio finished for dialogue');
          // do nothing if auto-advance is disabled
          if (!autoAdvanceEnabled) {
            console.log('🎵 Auto-advance is disabled');
            return;
          }
          // schedule a short delay before auto-advancing
          if (pendingAdvanceTimeoutRef.current !== null) return;
          pendingAdvanceTimeoutRef.current = window.setTimeout(() => {
            pendingAdvanceTimeoutRef.current = null;
            console.log('⏱️ Auto-advance timeout triggered:', { localScene, localDialogue, currentSceneRef: currentSceneIndexRef.current, currentDialogueRef: currentDialogueIndexRef.current });
            // only auto-advance if still at the same dialogue
            if (currentSceneIndexRef.current === localScene && currentDialogueIndexRef.current === localDialogue) {
              // do not auto-advance when quiz or chapter title/select/endroll is active
              console.log('⏱️ Checking conditions:', { quizOpen, showChapterTitle, showChapterSelect, pendingEndroll, showEndroll, suppressStory });
              if (quizOpen || showChapterTitle || showChapterSelect || pendingEndroll || showEndroll || suppressStory) {
                console.log('⏱️ Auto-advance blocked by active UI state');
                return;
              }

              const currentScene = scenes[localScene];
              if (!currentScene) return;
              console.log('🎬 Auto-advance:', { localScene, localDialogue, totalScenes: scenes.length, dialoguesInScene: currentScene.dialogues.length });
              if (localDialogue < currentScene.dialogues.length - 1) {
                setCurrentDialogueIndex(localDialogue + 1);
              } else {
                // If this was the last dialogue of the last scene, start the endroll
                console.log('🎬 Last dialogue of scene:', { localScene, totalScenes: scenes.length, isLastScene: localScene === scenes.length - 1 });
                if (localScene === scenes.length - 1) {
                  console.log('🎬 Starting endroll transition');
                  if (!pendingEndroll && !showEndroll) {
                    // Stop all audio immediately and clear any pending timers
                    stopAllAudio();
                    if (pendingAdvanceTimeoutRef.current !== null) {
                      try { clearTimeout(pendingAdvanceTimeoutRef.current); } catch (e) {}
                      pendingAdvanceTimeoutRef.current = null;
                    }
                    setPendingEndroll(true);
                    setTimeout(() => {
                      setShowEndroll(true);
                    }, ENDROLL_FADE_MS);
                  }
                } else {
                  console.log('🎬 Returning to chapter select');
                  setCompletedChapters((prev) => new Set(Array.from(prev).concat([localScene])));
                  openChapterSelect();
                }
              }
            }
          }, 200);
        }
      };

      voices.forEach((entry: any) => {
        try {
          let src = String(entry || '');
          src = src.replace(/\\/g, '/');
          if (!src.startsWith('/')) src = '/' + src.replace(/^\/+/, '');
          console.log('🎵 Attempting to play:', src);
          const audio = new Audio();
          audio.preload = 'auto';
          audio.src = src;
          // ボイスは最大に近い音量で再生（Audio.volume の上限は 1.0）
          try { audio.volume = 1.0; } catch (e) { /* ignore */ }

          const endedHandler = () => { try { onOneFinished(); } catch (e) {} };
          const errorHandler = () => { try { onOneFinished(); } catch (e) {} };
          (audio as any)._vn_onended = endedHandler;
          (audio as any)._vn_onerror = errorHandler;
          (audio as any)._vn_playStarted = false;
          audio.addEventListener('ended', endedHandler);
          audio.addEventListener('error', errorHandler);

          audioPlayersRef.current.push(audio);
          
          // 再生開始関数（重複呼び出し防止付き）
          const startPlayback = () => {
            if ((audio as any)._vn_playStarted) {
              console.log('⏭️ Already started playback:', src);
              return;
            }
            
            // readyStateとdurationをチェック
            console.log('📊 Audio state:', { src, readyState: audio.readyState, duration: audio.duration, networkState: audio.networkState });
            
            // readyStateが十分でない、またはdurationが不正な場合はスキップ
            if (audio.readyState < 3) { // HAVE_FUTURE_DATA未満
              console.log('⏸️ Not ready yet:', src, 'readyState:', audio.readyState);
              return;
            }
            
            if (!audio.duration || audio.duration === Infinity || isNaN(audio.duration)) {
              console.log('⏸️ Invalid duration:', src, audio.duration);
              return;
            }
            
            (audio as any)._vn_playStarted = true;
            
            playAudioWithRetries(audio).then(ok => {
              if (ok) {
                console.log('✅ Audio playing:', src, 'duration:', audio.duration);
              } else {
                console.warn('❌ Audio play failed after retries', src);
                try { errorHandler(); } catch (err) {}
              }
            }).catch((e) => {
              console.warn('❌ Audio play failed', src, e);
              try { errorHandler(); } catch (err) {}
            });
          };
          
          // canplaythroughイベントを待つ（十分なデータが読み込まれた）
          audio.addEventListener('canplaythrough', startPlayback, { once: true });
          
          // 読み込み開始
          audio.load();
          
          // 3秒経ってもcanplaythroughが発火しない場合は強制的に試みる
          setTimeout(() => {
            if (!(audio as any)._vn_playStarted && audio.readyState >= 3) {
              console.log('⏰ Timeout fallback for:', src);
              startPlayback();
            }
          }, 3000);
        } catch (e) {
          console.warn('voice playback error', entry, e);
          // count this as finished
          pendingAudioCountRef.current = Math.max(0, pendingAudioCountRef.current - 1);
        }
      });
    } catch (e) {
      // ignore
    }

    return () => {
      stopAllAudio();
    };
  }, [currentSceneIndex, currentDialogueIndex, scenes, showChapterTitle, quizOpen, showChapterSelect, pendingEndroll, showEndroll, autoAdvanceEnabled, suppressStory]);

  // コンポーネントアンマウント時に音声停止
  useEffect(() => {
    return () => { stopAllAudio(); };
  }, []);

  // 章選択画面に戻る、タイトル表示、またはエンドロール表示が始まったときは
  // 再生中のボイスを止める
  useEffect(() => {
    if (showChapterSelect || showTitle || showEndroll) {
      stopAllAudio();
    }
  }, [showChapterSelect, showTitle, showEndroll]);

  // 章タイトル表示中に、自動進行がONなら3秒後に自動で章タイトルを閉じて先に進める
  useEffect(() => {
    if (!showChapterTitle) {
      if (pendingTitleTimeoutRef.current !== null) {
        try { clearTimeout(pendingTitleTimeoutRef.current); } catch (e) {}
        pendingTitleTimeoutRef.current = null;
      }
      return;
    }

    // schedule auto-close only when autoAdvanceEnabled is true
    if (autoAdvanceEnabled) {
      if (pendingTitleTimeoutRef.current !== null) return;
      pendingTitleTimeoutRef.current = window.setTimeout(() => {
        pendingTitleTimeoutRef.current = null;
        // hide the chapter title to start the scene
        setShowChapterTitle(false);
      }, 3000);
    }

    return () => {
      if (pendingTitleTimeoutRef.current !== null) {
        try { clearTimeout(pendingTitleTimeoutRef.current); } catch (e) {}
        pendingTitleTimeoutRef.current = null;
      }
    };
  }, [showChapterTitle, autoAdvanceEnabled]);

  // Start RTA when chapter title closes for the first time (actual story begins)
  useEffect(() => {
    const shouldStart = !showChapterTitle && !showTitle && !showChapterSelect && !rtaStartedRef.current;
    if (shouldStart) {
      rtaStartedRef.current = true;
      (async () => {
        try {
          const info = await startRta();
          console.log('⏱️ RTA started (server anchor):', info);
        } catch (e) {
          console.warn('⏱️ RTA start failed (fallback used):', e);
        }
      })();
    }
  }, [showChapterTitle, showTitle, showChapterSelect]);

  // Also start RTA when game data becomes initialized (first access or after profile deletion)
  useEffect(() => {
    const handler = async () => {
      if (rtaStartedRef.current) return;
      rtaStartedRef.current = true;
      try {
        const info = await startRta();
        console.log('⏱️ RTA started from gameDataInitialized:', info);
      } catch (e) {
        console.warn('⏱️ RTA start failed from event:', e);
      }
    };
    window.addEventListener('gameDataInitialized', handler);
    return () => { window.removeEventListener('gameDataInitialized', handler); };
  }, []);

  // クイズの結果ハンドラ
  const handleQuizResult = (success: boolean) => {
    if (quizTargetScene === null) {
      setQuizOpen(false);
      return;
    }
    if (success) {
      // クイズをクリアした章を記録
      setClearedQuizzes((prev) => new Set(Array.from(prev).concat([quizTargetScene])));
      // 次の章を解放
      const nextScene = quizTargetScene + 1;
      if (nextScene < scenes.length) {
        setUnlockedScenes((prev) => new Set(Array.from(prev).concat([nextScene])));
      }
      // 章選択画面に戻る
      openChapterSelect();
    }
    setQuizTargetScene(null);
    setQuizOpen(false);
  };

  const handleClick = () => {
    if (quizOpen) return;
    const currentScene = scenes[currentSceneIndex];
    
    if (!currentScene) return;

    // 章タイトル表示中の場合は、タイトルを非表示にしてストーリーを開始
    if (showChapterTitle) {
      setShowChapterTitle(false);
      return;
    }

    // 音声が再生中の場合はクリックで先に進めないようにする
    if (pendingAudioCountRef.current > 0) {
      return;
    }

    // If this is the last dialogue, initiate endroll fade on click
    console.log('🖱️ Click check:', { currentSceneIndex, totalScenes: scenes.length, currentDialogueIndex, dialoguesInScene: currentScene.dialogues.length });
    if (currentSceneIndex === scenes.length - 1 && currentDialogueIndex === currentScene.dialogues.length - 1) {
      console.log('🖱️ Last dialogue clicked - starting endroll');
      if (!pendingEndroll && !showEndroll) {
        // Stop all audio immediately and clear auto-advance timer
        stopAllAudio();
        if (pendingAdvanceTimeoutRef.current !== null) {
          try { clearTimeout(pendingAdvanceTimeoutRef.current); } catch (e) {}
          pendingAdvanceTimeoutRef.current = null;
        }
        setPendingEndroll(true);
        // after fade, show endroll (unmount VN and mount EndRoll)
        setTimeout(() => {
          setShowEndroll(true);
        }, ENDROLL_FADE_MS);
      }
      return;
    }

    // 次の台詞に進む
    if (currentDialogueIndex < currentScene.dialogues.length - 1) {
      setCurrentDialogueIndex(currentDialogueIndex + 1);
    } else {
      // 章の終わりに到達 → 章を読了済みとしてマーク
      setCompletedChapters((prev) => new Set(Array.from(prev).concat([currentSceneIndex])));
      // 章選択画面に戻る
      openChapterSelect();
    }
  };

  if (loading) {
    return (
      <div className="visual-novel loading">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="visual-novel error">
        <div className="error-text">ストーリーを読み込めませんでした</div>
      </div>
    );
  }

  // 非PC（スマホ等）でアクセスされた場合は案内を表示してそれ以外のUIを隠す
  if (!isDesktop) {
    return (
      <div className="visual-novel non-pc-overlay" onClick={(e) => e.stopPropagation()}>
        <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.96)', color: '#fff', zIndex: 999}}>
          <div style={{maxWidth: 680, padding: 20, textAlign: 'center'}}>
            <div style={{fontSize: 22, fontWeight: 700, marginBottom: 12}}>パソコンでアクセスしてください</div>
            <div style={{opacity: 0.9}}>このサイトはパソコンでの閲覧を想定しています。PCからアクセスしてお楽しみください。</div>
          </div>
        </div>
      </div>
    );
  }

  if (showTitle) {
    return <TitleScreen onStart={() => {
      setShowTitle(false);
      openChapterSelect();
    }} />;
  }

  // 章ごとに1対1対応するクイズデータ
  // 各章に専用のクイズを設定
  // correctAnswer: ユーザーが入力すべき正解の文字列
  // imageUrl: クイズ画像のパス（後で追加）
  const chapterQuizzes = [
    // 序章（index: 0）
    { correctAnswer: '日', imageUrl: '/images/quizzes/chapter0.png', hints: ['一般的な和同開珎パズルとは違うようです', '４つの熟語を作るわけではありません', '漢字１字を４つ作りましょう'] },
    // 第1章（index: 1）
    { correctAnswer: '水晶', imageUrl: '/images/quizzes/chapter1.png', hints: ['WとSを漢字に置き換えることで熟語ができます', 'Wは水です', 'WはWednesdayのWです'] },
    // 第2章（index: 2）
    { correctAnswer: '枠', imageUrl: '/images/quizzes/chapter2.png', hints: ['数字と漢字が大切です', '助詞と数詞は無視しましょう', '数字を漢数字に直すと？'] },
    // 第3章（index: 3）
    { correctAnswer: '蛙', imageUrl: '/images/quizzes/chapter3.png', hints: ['この色の配置どこかで見たことがありませんか？', 'どこかで見たことがあるとすればそれはカレンダーです', '蟻が左側だけになってますね'] },
    // 第4章（index: 4）
    { correctAnswer: '亜音速', imageUrl: '/images/quizzes/chapter4.png', hints: ['さっきの問題にひっぱられてませんか？', '曜日は関係ありません', '色を入れましょう'] },
    // 第5章（index: 5）
    { correctAnswer: ['得点', '特典'], imageUrl: '/images/quizzes/chapter5.png', hints: ['ひらがなにして考えましょう', 'すべての文字が上の文章に含まれていますね', '。は句点です'] },
    // 第6章（index: 6）
    { correctAnswer: '迂路', imageUrl: '/images/quizzes/chapter6.png', hints: ['ヒントいりますか？', '最短で進むと出た文章の指示に従いましょう', '答えの単語が少し難しいかもしれませんね'] },
    // 第7章（index: 7）
    { correctAnswer: ['クサ', '草'], imageUrl: '/images/quizzes/chapter7.png', hints: ['https://www.kanjipedia.jp/sakuin/bushu/detail/6/140#kakusuHead', '全部塗りつぶしてくださいね', 'もし文字が出ないとしたらまだ草冠を付けられる漢字があります'] },
    // 第8章（index: 8）
    { correctAnswer: '稜線', imageUrl: '/images/quizzes/chapter8.png', hints: ['緑の枠とオレンジの枠、どこかで見たことがありませんか？', '通った漢字に番号を付けていきましょう', '番号に従って漢字を入れると熟語が現れます'] },
    // 終章（index: 9）- クイズなし
    null,
  ];

  // 章選択画面を表示
  if (showChapterSelect) {
    const chapters = scenes.map((scene, index) => ({
      index,
      title: scene.title || `章 ${index + 1}`,
      isUnlocked: unlockedScenes.has(index),
      isQuizCleared: clearedQuizzes.has(index),
      isCompleted: completedChapters.has(index)
    }));

    // preload handled by outer helper `preloadChapterAssets`

    return (
      <>
        <ChapterSelect
          chapters={chapters}
          onSelectChapter={(chapterIndex: number) => {
            (async () => {
              try {
                await preloadChapterAssets(chapterIndex);
              } catch (e) {
                console.error('Chapter preload error', e);
              }
              setCurrentSceneIndex(chapterIndex);
              setCurrentDialogueIndex(0);
              setShowChapterTitle(true); // 章タイトルを表示する
              setShowChapterSelect(false);
            })();
          }}
          onStartQuiz={(chapterIndex: number) => {
            console.log('onStartQuiz called:', chapterIndex, 'quizData:', chapterQuizzes[chapterIndex]);
            setQuizTargetScene(chapterIndex);
            setQuizOpen(true);
            // setShowChapterSelect(false); を削除 - 章選択画面を閉じない
          }}
          onBack={() => {
            setShowTitle(true);
            setShowChapterSelect(false);
          }}
          
        />
        {quizOpen && quizTargetScene !== null && chapterQuizzes[quizTargetScene] && (
          <Quiz
            open={quizOpen}
            quizId={quizTargetScene}
            correctAnswer={chapterQuizzes[quizTargetScene].correctAnswer}
            imageUrl={chapterQuizzes[quizTargetScene].imageUrl}
            hints={chapterQuizzes[quizTargetScene].hints}
            isAlreadyCleared={clearedQuizzes.has(quizTargetScene)}
            onClose={() => { setQuizOpen(false); setQuizTargetScene(null); }}
            onResult={handleQuizResult}
          />
        )}

        {chapterLoading && (
          <div className="chapter-loading-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="chapter-loading-box">
              <div className="spinner" aria-hidden />
              <div style={{color:'#fff'}}>
                <div style={{fontSize:16, fontWeight:700}}>読み込み中...</div>
                <div style={{fontSize:13, opacity:0.9}}>{chapterLoadProgress.loaded} / {chapterLoadProgress.total}</div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const currentScene = scenes[currentSceneIndex];
  const currentDialogue = currentScene?.dialogues[currentDialogueIndex];
  const isLastDialogue = 
    currentSceneIndex === scenes.length - 1 && 
    currentDialogueIndex === currentScene.dialogues.length - 1;

  if (showEndroll) {
    // 共通のクリア処理を呼び出す
    return <EndRoll onGameClear={handleGameClear} />;
  }

  const bgClass = (currentDialogue as any)?.background || '';
  const needBrighten = (() => {
    const title = currentScene?.title || '';
    if (currentSceneIndex === 2) return true; // scene3 (1-based) を明るくする
    if (/第三章|消えゆく|消えゆく世界/.test(title)) return true;
    return false;
  })();

  return (
    <div className="visual-novel" onClick={handleClick} onMouseDown={(e) => e.preventDefault()}>
      <style>{`
        .end-fade-overlay{ position:fixed; inset:0; background:#000; pointer-events:none; opacity:0; transition:opacity 2000ms linear; z-index:150 }
        .end-fade-overlay.active{ opacity:1 }
      `}</style>
      {showRtaResult && (
        <RtaResult result={rtaResult} onClose={() => {
          setShowRtaResult(false);
          // allow story playback again
          setSuppressStory(false);
          setShowTitle(true);
        }} />
      )}
      {/* 背景エリア */}
      <div className={`background ${bgClass}`}>
        <div className={`background-brighten ${needBrighten ? 'active' : ''}`}></div>
        <div className="background-overlay"></div>
      </div>

      {/* タイトル・章名の中央表示（下から上がって中央で止まる） */}
      {showChapterTitle && (
        <CenterScrollText duration={900}>
          <div className="center-title">
            <div className="center-title-text">{currentScene.title}</div>
          </div>
        </CenterScrollText>
      )}

      {/* キャラクター表示エリア */}
      <div className="character-area">
        {!showChapterTitle && (() => {
          const characters = getCurrentCharacters();
          
          // キャラクター画像マッピング（定義は上部の定数を参照）
          const characterImages = CHARACTER_IMAGES;

          // 背後に白いもやもや（やや濃いめ）を表示するキャラクター一覧
          const glowCharacters = new Set(['焔', '守', '希', '彁', '問', '結']);

          // キャラクター組み合わせごとの完全な配置定義
          type CharacterLayout = {
            left: string;
            bottom: string;
            scale: number;
            width: number;
            height: number;
            zIndex: number;
          };
          
          const layoutConfigs: Record<string, Record<string, CharacterLayout>> = {
            '["太郎"]': {
              '太郎': {left: '50%', bottom: '8%', scale: 1.0, width: 200, height: 400, zIndex: 10}
            },
            '["太郎","彁"]': {
              '太郎': {left: '35%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '彁': {left: '65%', bottom: '8%', scale: 1.0, width: 200, height: 400, zIndex: 10}
            },
            '["太郎","彁","零"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '75%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '零': {left: '50%', bottom: '-75%', scale: 1.0, width: 900, height: 1485, zIndex: 10}
            },
            '["太郎","彁","零","結"]': {
              '太郎': {left: '20%', bottom: '8%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '彁': {left: '40%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '零': {left: '60%', bottom: '-87%', scale: 1.0, width: 855, height: 1395, zIndex: 10},
              '結': {left: '80%', bottom: '8%', scale: 1.0, width: 165, height: 330, zIndex: 10}
            },
            '["太郎","彁","零","結","守","問","希"]': {
              '太郎': {left: '20%', bottom: '2%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '彁': {left: '80%', bottom: '-5%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '零': {left: '50%', bottom: '-75%', scale: 1.0, width: 810, height: 1350, zIndex: 5},
              '結': {left: '10%', bottom: '35%', scale: 1.0, width: 160, height: 320, zIndex: 5},
              '守': {left: '35%', bottom: '35%', scale: 1.0, width: 170, height: 340, zIndex: 5},
              '問': {left: '65%', bottom: '35%', scale: 1.0, width: 160, height: 320, zIndex: 10},
              '希': {left: '90%', bottom: '35%', scale: 1.0, width: 155, height: 310, zIndex: 5}
            },
            '["太郎","彁","零","結","守","問","希","焔"]': {
              '太郎': {left: '20%', bottom: '2%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '彁': {left: '80%', bottom: '-5%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '零': {left: '50%', bottom: '-92%', scale: 1.0, width: 810, height: 1350, zIndex: 5},
              '結': {left: '10%', bottom: '35%', scale: 1.0, width: 160, height: 320, zIndex: 5},
              '守': {left: '30%', bottom: '35%', scale: 1.0, width: 170, height: 340, zIndex: 5},
              '問': {left: '70%', bottom: '35%', scale: 1.0, width: 160, height: 320, zIndex: 10},
              '希': {left: '90%', bottom: '35%', scale: 1.0, width: 155, height: 310, zIndex: 5},
              '焔': {left: '50%', bottom: '45%', scale: 1.0, width: 165, height: 330, zIndex: 10}
            },
            '["太郎","彁","零","結","守","問","希","焔","老人"]': {
              '太郎': {left: '20%', bottom: '1%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '彁': {left: '80%', bottom: '-5%', scale: 1.0, width: 170, height: 340, zIndex: 10},
              '零': {left: '50%', bottom: '-92%', scale: 1.0, width: 810, height: 1350, zIndex: 5},
              '結': {left: '10%', bottom: '45%', scale: 1.0, width: 160, height: 320, zIndex: 5},
              '守': {left: '26%', bottom: '44%', scale: 1.0, width: 170, height: 340, zIndex: 5},
              '問': {left: '72%', bottom: '45%', scale: 1.0, width: 160, height: 320, zIndex: 10},
              '希': {left: '90%', bottom: '45%', scale: 1.0, width: 155, height: 310, zIndex: 5},
              '焔': {left: '41%', bottom: '45%', scale: 1.0, width: 165, height: 330, zIndex: 10},
              '老人': {left: '57%', bottom: '52%', scale: 1.0, width: 140, height: 260, zIndex: 10}
            },
            '["太郎","彁","焔"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '50%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '焔': {left: '75%', bottom: '8%', scale: 1.0, width: 175, height: 350, zIndex: 10}
            },
            '["太郎","彁","老人"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '50%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '老人': {left: '75%', bottom: '8%', scale: 1.0, width: 160, height: 300, zIndex: 10}
            },
            '["太郎","彁","結"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '50%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '結': {left: '75%', bottom: '8%', scale: 1.0, width: 165, height: 330, zIndex: 10}
            },
            '["太郎","彁","守"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '50%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '守': {left: '75%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10}
            },
            '["太郎","彁","問"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '50%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '問': {left: '75%', bottom: '8%', scale: 1.0, width: 170, height: 340, zIndex: 10}
            },
            '["太郎","彁","希"]': {
              '太郎': {left: '25%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10},
              '彁': {left: '50%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              '希': {left: '75%', bottom: '8%', scale: 1.0, width: 165, height: 330, zIndex: 10}
            },
            '["太郎","クラスメイト"]': {
              '太郎': {left: '35%', bottom: '8%', scale: 1.0, width: 190, height: 380, zIndex: 10},
              'クラスメイト': {left: '65%', bottom: '8%', scale: 1.0, width: 180, height: 360, zIndex: 10}
            },
            '["彁","零"]': {
              '彁': {left: '40%', bottom: '8%', scale: 1.0, width: 200, height: 400, zIndex: 10},
              '零': {left: '60%', bottom: '-89%', scale: 1.0, width: 945, height: 1575, zIndex: 10}
            }
          };

          // 組み合わせキーを生成（順序を保持）
          const layoutKey = JSON.stringify(characters);
          const layout = layoutConfigs[layoutKey];

          if (!layout) {
            // 定義されていない組み合わせの場合はデフォルト配置
            const charCount = characters.length;
            return characters.map((charName, index) => {
              const isSpeaking = speakerIncludes(currentDialogue?.speaker, charName);
              const imageSrc = characterImages[charName] || '/images/man.png';
              
              const leftPosition = charCount === 1 ? 50 : 10 + (80 / (charCount - 1)) * index;
              const scale = Math.max(0.6, 1 - (charCount * 0.08));
              
              const style = {
                position: 'absolute' as const,
                left: `${leftPosition}%`,
                bottom: '8%',
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: 'bottom center',
                transition: 'all 0.3s ease',
                zIndex: 10,
                width: '160px',
                height: '320px',
              };

              if (charName === '零') {
                return (
                  <div key={`${charName}-${index}`} className={`zero-gif-container ${isSpeaking ? 'speaking' : ''}`} style={style} aria-hidden>
                    <img
                      src={imageSrc}
                      alt="零"
                      className="zero-sprite"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      id="zero-sprite-img"
                      style={{width: '100%', height: '100%', objectFit: 'contain'}}
                    />
                    <div className="character-name-tag zero-name-tag" style={{position: 'fixed', bottom: '500px', left: `${leftPosition}%`, transform: 'translateX(-50%)', zIndex: 100}}>零</div>
                  </div>
                );
              }

              // デフォルト配置時のもやもや
              const glowNeeded = glowCharacters.has(charName);
              // 正円で上下左右を大きくし、円全体を上へずらす
              const baseSize = 260; // 大きめの円サイズ基準
              const size = Math.round(baseSize * 1.0);
              const glowStyle: React.CSSProperties = {
                position: 'absolute',
                left: '50%',
                bottom: '8%',
                transform: 'translateX(-50%) translateY(-22%)',
                width: `${size}px`,
                height: `${size}px`,
                background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 36%, rgba(255,255,255,0.0) 70%)',
                filter: 'blur(14px)',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 9,
              };

              return (
                <div key={`${charName}-${index}`} className={`character-container ${isSpeaking ? 'speaking' : ''}`} style={style}>
                  {glowNeeded ? <div className="character-glow" style={glowStyle} /> : null}
                  <img 
                    src={imageSrc}
                    alt={charName}
                    className="character-image"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    style={{width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 11}}
                  />
                  <div className="character-name-tag">{charName}</div>
                </div>
              );
            });
          }

          // 定義された配置を使用
          const isCrowded = characters.length >= 7;
          const veryCloseCharacters = ['守', '彁', '問', '結', '希', '焔'];
          return characters.map((charName, index) => {
            const isSpeaking = speakerIncludes(currentDialogue?.speaker, charName);
            const imageSrc = characterImages[charName] || '/images/man.png';
            const config = layout[charName];
            
            if (!config) return null;

            const style = {
              position: 'absolute' as const,
              left: config.left,
              bottom: config.bottom,
              transform: `translateX(-50%) scale(${config.scale})`,
              transformOrigin: 'bottom center',
              transition: 'all 0.3s ease',
              zIndex: config.zIndex,
              width: `${config.width}px`,
              height: `${config.height}px`,
            };
            
            const isVeryClose = isCrowded && veryCloseCharacters.includes(charName);
            
            if (charName === '零') {
              return (
                <div key={`${charName}-${index}`} className={`zero-gif-container ${isSpeaking ? 'speaking' : ''}`} style={style} aria-hidden>
                  <img
                    src={imageSrc}
                    alt="零"
                    className="zero-sprite"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    id="zero-sprite-img"
                    style={{width: '100%', height: '100%', objectFit: 'contain'}}
                  />
                  <div className={`character-name-tag zero-name-tag ${isCrowded ? 'crowded' : ''}`} style={{position: 'fixed', bottom: '500px', left: '50%', transform: 'translateX(-50%)', zIndex: 100}}>零</div>
                </div>
              );
            }

            // 背後のもやもやを表示（指定キャラのみ）
            const glowNeeded = new Set(['焔', '守', '希', '彁', '問', '結']).has(charName);
            // 正円で上下左右を大きくし、円全体を上へずらす（定義済みレイアウト用）
            const confW = typeof config.width === 'number' ? config.width : parseInt(String(config.width)) || 160;
            const confH = typeof config.height === 'number' ? config.height : parseInt(String(config.height)) || confW;
            const size2 = Math.round(Math.min(confW, confH) * 1.6);
            const glowStyle: React.CSSProperties = {
              position: 'absolute',
              left: '50%',
              bottom: config.bottom,
              transform: 'translateX(-50%) translateY(-15%)',
              width: `${size2}px`,
              height: `${size2}px`,
              background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 36%, rgba(255,255,255,0.0) 70%)',
              filter: 'blur(14px)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: config.zIndex - 1,
            };

            return (
              <div key={`${charName}-${index}`} className={`character-container ${isSpeaking ? 'speaking' : ''}`} style={style}>
                {glowNeeded ? <div className="character-glow" style={glowStyle} /> : null}
                <img 
                  src={imageSrc}
                  alt={charName}
                  className="character-image"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  style={{width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 11}}
                />
                <div className={`character-name-tag ${isVeryClose ? 'very-close' : isCrowded ? 'crowded' : ''}`}>{charName}</div>
              </div>
            );
          });
        })()}
      </div>

      {/* テキストボックス */}
      {!showChapterTitle && (
        <div className="text-box">
          <div className="dialogue-text">
            {currentDialogue?.text}
          </div>
          {!isLastDialogue && (
            <div className="continue-indicator">▼</div>
          )}
        </div>
      )}

      {/* プログレス表示 */}
      <div className="progress-bar">
        Scene {currentSceneIndex + 1} / {scenes.length}
        <span className="dialogue-progress">
          {' '}({currentDialogueIndex + 1} / {currentScene.dialogues.length})
        </span>
      </div>

      {/* 履歴トグル / 履歴パネル */}
      <div style={{position: 'fixed', left: 12, top: 12, zIndex: 60}} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowTranscript(s => !s); }}
          style={{padding: '6px 8px', borderRadius: 4, cursor: 'pointer'}}
        >
          ログ
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openChapterSelect();
          }}
          style={{padding: '6px 8px', borderRadius: 4, cursor: 'pointer', marginLeft: 8}}
        >
          章選択
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setAutoAdvanceEnabled(v => !v); }}
          style={{padding: '6px 8px', borderRadius: 4, cursor: 'pointer', marginLeft: 8}}
          title="音声再生後の自動進行を切り替え"
        >
          {autoAdvanceEnabled ? '自動: ON' : '自動: OFF'}
        </button>
        {showTranscript && (
          (() => {
            // 表示済み台詞を計算: 先頭シーンから現在のシーン/台詞まで
            const entries: {speaker?: any; text: any; sceneIndex: number; dialogueIndex: number}[] = [];
            for (let si = 0; si <= currentSceneIndex; si++) {
              const s = scenes[si];
              if (!s || !s.dialogues) continue;
              const end = si === currentSceneIndex ? currentDialogueIndex : s.dialogues.length - 1;
              for (let di = 0; di <= end; di++) {
                const d = s.dialogues[di];
                entries.push({speaker: d?.speaker, text: d?.text, sceneIndex: si, dialogueIndex: di});
              }
            }

            return (
              <div className="history-panel" style={{width: 420, maxHeight: 360, overflowY: 'auto', background: 'rgba(0,0,0,0.9)', color: '#fff', fontSize: 13, padding: 10, marginTop: 8, borderRadius: 6}} onClick={(e) => e.stopPropagation()}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <div style={{fontWeight: 600}}>ログ</div>
                  <div>
                    <button onClick={(e) => { e.stopPropagation(); setShowTranscript(false); }} style={{marginLeft: 8}}>閉じる</button>
                  </div>
                </div>
                <div style={{whiteSpace: 'pre-wrap'}}>
                  {entries.length === 0 ? (
                    <div style={{opacity: 0.7}}>まだ表示された台詞はありません</div>
                  ) : (
                    entries.map((en, idx) => {
                      const sp = en.speaker;
                      let spLabel = '';
                      if (!sp) spLabel = '';
                      else if (Array.isArray(sp)) spLabel = sp.join(' / ');
                      else spLabel = String(sp);

                      const text = en.text ?? '';
                      return (
                        <div key={`${en.sceneIndex}-${en.dialogueIndex}-${idx}`} style={{marginBottom: 8}}>
                          {spLabel ? (<span style={{color: '#ffd'}}>{spLabel} : </span>) : null}
                          <span style={{color: '#fff'}}>{String(text)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>
      {quizOpen && quizTargetScene !== null && chapterQuizzes[quizTargetScene] ? (
        <Quiz
          quizId={quizTargetScene}
          open={quizOpen}
          correctAnswer={chapterQuizzes[quizTargetScene].correctAnswer}
          imageUrl={chapterQuizzes[quizTargetScene].imageUrl}
          hints={chapterQuizzes[quizTargetScene].hints}
          isAlreadyCleared={clearedQuizzes.has(quizTargetScene)}
          onClose={() => { setQuizOpen(false); setQuizTargetScene(null); }}
          onResult={handleQuizResult}
        />
      ) : null}

      {quizOpen && quizTargetScene !== null && !chapterQuizzes[quizTargetScene] && (
        <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200}}>
          <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)'}} onClick={() => { setQuizOpen(false); setQuizTargetScene(null); }} />
          <div style={{zIndex:210, width: 'min(640px, 92%)', background: '#111', color: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 6px 30px rgba(0,0,0,0.6)'}} onClick={(e)=>e.stopPropagation()}>
            <div style={{fontSize: 18, marginBottom: 12, fontWeight: 700}}>クイズ - 未設定</div>
            <div style={{marginBottom: 12}}>この章に設定されたクイズはありません。画像がまだアップロードされていない可能性があります。</div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
              <button onClick={() => { setQuizOpen(false); setQuizTargetScene(null); }} style={{padding: '8px 12px', borderRadius: 6}}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      <div className={`end-fade-overlay ${pendingEndroll ? 'active' : ''}`} />
    </div>
  );
}
