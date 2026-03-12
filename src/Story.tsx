import VisualNovel from './VisualNovel'
import './Story.css'
import RequireCondition from './components/RequireCondition'
import { useGamification } from './contexts/GamificationContext'

function StoryContent() {
  return <VisualNovel />
}

export default function StoryWrapper() {
  const { state } = useGamification()
  return (
    <RequireCondition check={() => !!state.hasStoryInvitation} message="ストーリーの招待がありません。コレクション+などを確認してください。">
      <StoryContent />
    </RequireCondition>
  )
}
