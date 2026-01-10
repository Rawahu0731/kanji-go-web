import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChapterSelect from './ChapterSelect'
import { loadStory } from './storyParser'
import type { Scene } from './storyParser'
import { useGamification } from './contexts/GamificationContext'

type Chapter = {
  index: number
  title: string
  isUnlocked: boolean
  isQuizCleared: boolean
  isCompleted: boolean
}

export default function ChapterSelectPage() {
  const navigate = useNavigate()
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  
  // story.jsonから章データを読み込む
  useEffect(() => {
    loadStory().then((loadedScenes: Scene[]) => {
      setScenes(loadedScenes)
      setLoading(false)
    }).catch(error => {
      console.error('Failed to load story:', error)
      setLoading(false)
    })
  }, [])

  // タイトル画面から直接遷移してきた場合、SPAs の状態が不整合になることがあるため
  // 1回だけページをリロードして状態をリセットする（無限リロード対策に sessionStorage を使用）
  useEffect(() => {
    try {
      const ref = document.referrer || ''
      const cameFromTitle = ref.includes('/title') || ref.endsWith('/title')
      const alreadyReloaded = sessionStorage.getItem('chapterSelectReloadedFromTitle') === 'true'
      if (cameFromTitle && !alreadyReloaded) {
        sessionStorage.setItem('chapterSelectReloadedFromTitle', 'true')
        // 直ちに完全リロード
        window.location.reload()
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // ストーリー進行は GamificationContext の状態を優先して参照する（未設定時は localStorage をフォールバック）
  const { state: gamState } = useGamification()

  const unlockedScenes = (() => {
    try {
      if (Array.isArray(gamState.unlockedScenes) && gamState.unlockedScenes.length > 0) return new Set(gamState.unlockedScenes)
      const raw = localStorage.getItem('unlockedScenes')
      if (raw) return new Set(JSON.parse(raw) as number[])
    } catch (e) {
      console.error('Error loading unlockedScenes:', e)
    }
    return new Set([0])
  })()

  const clearedQuizzes = (() => {
    try {
      if (Array.isArray(gamState.clearedQuizzes) && gamState.clearedQuizzes.length > 0) return new Set(gamState.clearedQuizzes)
      const raw = localStorage.getItem('clearedQuizzes')
      if (raw) return new Set(JSON.parse(raw) as number[])
    } catch (e) {
      console.error('Error loading clearedQuizzes:', e)
    }
    return new Set()
  })()

  const completedChapters = (() => {
    try {
      if (Array.isArray(gamState.completedChapters) && gamState.completedChapters.length > 0) return new Set(gamState.completedChapters)
      const raw = localStorage.getItem('completedChapters')
      if (raw) return new Set(JSON.parse(raw) as number[])
    } catch (e) {
      console.error('Error loading completedChapters:', e)
    }
    return new Set()
  })()

  // story.jsonから読み込んだデータでchaptersを生成
  const chapters: Chapter[] = scenes.map((scene, index) => ({
    index,
    title: scene.title || `章 ${index + 1}`,
    isUnlocked: unlockedScenes.has(index),
    isQuizCleared: clearedQuizzes.has(index),
    isCompleted: completedChapters.has(index)
  }))

  const handleSelectChapter = (chapterIndex: number) => {
    // ユーザーのクリックでオーディオをアンロックしてから遷移
    try {
      // try Web Audio API resume
      const AnyWin: any = window as any;
      if (AnyWin && AnyWin.AudioContext) {
        const ac = new AnyWin.AudioContext();
        if (ac.state === 'suspended' && typeof ac.resume === 'function') {
          ac.resume().catch(() => {});
        }
        try {
          // play a tiny silent buffer to fully unlock
          const o = ac.createBufferSource();
          const buf = ac.createBuffer(1, 1, 22050);
          o.buffer = buf;
          o.connect(ac.destination);
          o.start(0);
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    // 章を選んだらlocalStorageに保存してストーリーページに遷移
    localStorage.setItem('selectedChapter', String(chapterIndex))
    localStorage.setItem('startFromChapterSelect', 'true')
    navigate('/story')
  }

  const handleStartQuiz = (chapterIndex: number) => {
    // オーディオをアンロック
    try {
      const AnyWin: any = window as any;
      if (AnyWin && AnyWin.AudioContext) {
        const ac = new AnyWin.AudioContext();
        if (ac.state === 'suspended' && typeof ac.resume === 'function') {
          ac.resume().catch(() => {});
        }
        try {
          const o = ac.createBufferSource();
          const buf = ac.createBuffer(1, 1, 22050);
          o.buffer = buf;
          o.connect(ac.destination);
          o.start(0);
        } catch (e) {}
      }
    } catch (e) {}

    // クイズを開始する章をlocalStorageに保存してストーリーページに遷移
    localStorage.setItem('quizChapter', String(chapterIndex))
    localStorage.setItem('startQuiz', 'true')
    navigate('/story')
  }

  const handleBack = () => {
    // タイトル画面に戻る
    navigate('/title')
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#ffffff,#f7fafc)'
      }}>
        <div style={{fontSize: 18, color: '#0b2545'}}>読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      <ChapterSelect
        chapters={chapters}
        onSelectChapter={handleSelectChapter}
        onStartQuiz={handleStartQuiz}
        onBack={handleBack}
      />
    </>
  )
}
