import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import KnownIssues from './pages/KnownIssues.tsx'
import Announcements from './pages/Announcements.tsx'
import StoryMode from './pages/StoryMode.tsx'
import Shop from './pages/Shop.tsx'
import Profile from './pages/Profile.tsx'
import CardCollection from './pages/CardCollection.tsx'
import CollectionPlus from './pages/CollectionPlus.tsx'
import CollectionPlusPlus from './pages/CollectionPlusPlus.tsx'
import Characters from './pages/Characters.tsx'
import Ranking from './pages/Ranking.tsx'
import Terms from './pages/Terms.tsx'
import SkillTree from './pages/SkillTree.tsx'
import Revolution from './pages/Revolution.tsx'
import Maintenance from './pages/Maintenance.tsx'
import { GamificationProvider } from './contexts/GamificationContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'

import { isMaintenance } from './config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMaintenance ? (
        <BrowserRouter>
          <Routes>
            <Route path="/known-issues" element={<KnownIssues />} />
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
                <Route path="/collection-plus-plus" element={<CollectionPlusPlus />} />
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
  </StrictMode>,
)
