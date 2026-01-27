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
const Shop = lazy(() => import('./pages/Shop.tsx'))
const Profile = lazy(() => import('./pages/Profile.tsx'))
const CardCollection = lazy(() => import('./pages/CardCollection.tsx'))
const CollectionPlus = lazy(() => import('./pages/CollectionPlus.tsx'))
const Characters = lazy(() => import('./pages/Characters.tsx'))
// Ranking page removed (local-only mode)
const SkillTree = lazy(() => import('./pages/SkillTree.tsx'))
const Revolution = lazy(() => import('./pages/Revolution.tsx'))
const Maintenance = lazy(() => import('./pages/Maintenance.tsx'))
// PresentBox removed — no longer importing
const TitleScreen = lazy(() => import('./TitleScreen.tsx'))
const ChapterSelectPage = lazy(() => import('./ChapterSelectPage.tsx'))
const Story = lazy(() => import('./Story.tsx'))
const SimpleKanji = lazy(() => import('./pages/SimpleKanji.tsx'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'))

// ローディングコンポーネント
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div style={{ fontSize: '24px', color: '#666' }}>読み込み中...</div>
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      {isMaintenance && !(typeof window !== 'undefined' && localStorage.getItem('maintenanceBypass') === 'true') ? (
          <BrowserRouter>
            <Routes>
              <Route path="/simple" element={<SimpleKanji />} />
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
                    {/* KnownIssues and Announcements removed */}
                    <Route path="/simple" element={<SimpleKanji />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/collection" element={<CardCollection />} />
                    <Route path="/collection-plus" element={<ProtectedRoute require="collection-plus" element={<CollectionPlus />} />} />
                    <Route path="/characters" element={<Characters />} />
                    {/* Ranking route removed */}
                    <Route path="/skill-tree" element={<ProtectedRoute require="skill-tree" element={<SkillTree />} />} />
                    <Route path="/revolution" element={<ProtectedRoute require="revolution" element={<Revolution />} />} />
                    {/* PresentBox route removed */}
                    {/* Contact page removed */}
                    <Route path="/title" element={<ProtectedRoute require="title" element={<TitleScreen onStart={() => { window.location.href = '/chapter-select'; }} />} />} />
                    <Route path="/chapter-select" element={<ProtectedRoute require="story" element={<ChapterSelectPage />} />} />
                    <Route path="/story" element={<ProtectedRoute require="story" element={<Story />} />} />
                  </Routes>
                </BrowserRouter>
              </ThemeProvider>
          </GamificationProvider>
        </AuthProvider>
      )}
    </Suspense>
  </StrictMode>,
)
