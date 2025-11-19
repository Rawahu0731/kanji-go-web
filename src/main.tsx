import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import KnownIssues from './pages/KnownIssues.tsx'
import StoryMode from './pages/StoryMode.tsx'
import Shop from './pages/Shop.tsx'
import Profile from './pages/Profile.tsx'
import CardCollection from './pages/CardCollection.tsx'
import Characters from './pages/Characters.tsx'
import Ranking from './pages/Ranking.tsx'
import { GamificationProvider } from './contexts/GamificationContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <GamificationProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/known-issues" element={<KnownIssues />} />
              <Route path="/story" element={<StoryMode />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/collection" element={<CardCollection />} />
              <Route path="/characters" element={<Characters />} />
              <Route path="/ranking" element={<Ranking />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </GamificationProvider>
    </AuthProvider>
  </StrictMode>,
)
