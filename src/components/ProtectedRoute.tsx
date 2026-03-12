import type { ReactElement } from 'react'

// ProtectedRoute の保護処理は各ページ内で行うため、ここでは単に要素を返すパススルーにします。
export default function ProtectedRoute({ element }: { element: ReactElement }) {
  return element
}
