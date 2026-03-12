import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type RequireConditionProps = {
  check: boolean | (() => boolean)
  message?: string
  children: ReactNode
}

export default function RequireCondition({ check, message, children }: RequireConditionProps) {
  const allowed = typeof check === 'function' ? check() : check

  if (allowed) return <>{children}</>

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>条件を満たしていません</h2>
      <p>{message || 'このページを表示する条件を満たしていません。'}</p>
      <div style={{ marginTop: '1rem' }}>
        <Link to="/" style={{ padding: '0.5rem 1rem', border: '1px solid #666', borderRadius: 6, textDecoration: 'none' }}>
          ホームへ戻る
        </Link>
      </div>
    </div>
  )
}
