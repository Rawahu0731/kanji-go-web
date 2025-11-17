import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import KnownIssues from './pages/KnownIssues.tsx'
import StoryMode from './pages/StoryMode.tsx'
import Shop from './pages/Shop.tsx'
import Profile from './pages/Profile.tsx'
import { GamificationProvider } from './contexts/GamificationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GamificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/known-issues" element={<KnownIssues />} />
          <Route path="/story" element={<StoryMode />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </GamificationProvider>
  </StrictMode>,
)
