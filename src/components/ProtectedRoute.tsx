import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useGamification } from '../contexts/GamificationContext'

type RequireKey = 'story' | 'skill-tree' | 'collection-plus' | 'revolution' | 'title'

export default function ProtectedRoute({ element, require }: { element: ReactElement; require?: RequireKey }) {
  const { state: gamState, isCollectionComplete, getSkillLevel } = useGamification()
  const location = useLocation()

  const allowed = (() => {
    switch (require) {
      case 'story':
      case 'title':
        return !!gamState.hasStoryInvitation
      case 'skill-tree':
      case 'collection-plus':
        return typeof isCollectionComplete === 'function' ? isCollectionComplete() : false
      case 'revolution':
        return typeof getSkillLevel === 'function' ? getSkillLevel('unlock_rotation') > 0 : false
      default:
        return true
    }
  })()

  if (allowed) return element

  // redirect to root preserving the attempted location
  return <Navigate to="/" replace state={{ from: location }} />
}
