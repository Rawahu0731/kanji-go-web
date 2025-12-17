import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { GamificationProvider } from './contexts/GamificationContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import { isMaintenance } from './config'

// 動的インポートでコード分割
const App = lazy(() => import('./App.tsx'))
const KnownIssues = lazy(() => import('./pages/KnownIssues.tsx'))
const Announcements = lazy(() => import('./pages/Announcements.tsx'))
const StoryMode = lazy(() => import('./pages/StoryMode.tsx'))
const Shop = lazy(() => import('./pages/Shop.tsx'))
const Profile = lazy(() => import('./pages/Profile.tsx'))
const CardCollection = lazy(() => import('./pages/CardCollection.tsx'))
const CollectionPlus = lazy(() => import('./pages/CollectionPlus.tsx'))
const Characters = lazy(() => import('./pages/Characters.tsx'))
const Ranking = lazy(() => import('./pages/Ranking.tsx'))
const Terms = lazy(() => import('./pages/Terms.tsx'))
const SkillTree = lazy(() => import('./pages/SkillTree.tsx'))
const Revolution = lazy(() => import('./pages/Revolution.tsx'))
const Maintenance = lazy(() => import('./pages/Maintenance.tsx'))

// ローディングコンポーネント
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div style={{ fontSize: '24px', color: '#666' }}>読み込み中...</div>
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      {isMaintenance ? (
          <BrowserRouter>
            <Routes>
              <Route path="/known-issues" element={<KnownIssues />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="*" element={<Maintenance />} />
            </Routes>
          </BrowserRouter>
        ) : (
        <AuthProvider>
          <GamificationProvider>
            <ThemeProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<App />} />
                  <Route path="/known-issues" element={<KnownIssues />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/story" element={<StoryMode />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/collection" element={<CardCollection />} />
                  <Route path="/collection-plus" element={<CollectionPlus />} />
                  <Route path="/characters" element={<Characters />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/skill-tree" element={<SkillTree />} />
                  <Route path="/revolution" element={<Revolution />} />
                </Routes>
              </BrowserRouter>
            </ThemeProvider>
          </GamificationProvider>
        </AuthProvider>
      )}
    </Suspense>
  </StrictMode>,
)
