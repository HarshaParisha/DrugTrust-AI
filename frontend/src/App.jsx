import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Result from './pages/Result';
import History from './pages/History';
import Search from './pages/Search';
import SearchCategory from './pages/SearchCategory';
import SetupGuide from './pages/SetupGuide';
import LLMSetup from './pages/LLMSetup';
import FakeMedicineGuide from './pages/FakeMedicineGuide';
import MedGuideBot from './pages/MedGuideBot';

export default function App() {
  const [scanResult, setScanResult] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined'
      ? (localStorage.getItem('drugtrust_theme') || localStorage.getItem('medverify_theme'))
      : null;
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('drugtrust_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <BrowserRouter>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="tap-target fixed bottom-4 right-4 md:bottom-6 md:right-6 mv-button mv-button-secondary clinical-card clinical-card-hover"
        style={{ zIndex: 1201 }}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
      <Routes>
        <Route path="/"              element={<Landing />} />
        <Route path="/home"          element={<Home setScanResult={setScanResult} />} />
        <Route path="/result/:scanId" element={<Result cachedResult={scanResult} />} />
        <Route path="/history"       element={<History />} />
        <Route path="/search"        element={<Search />} />
        <Route path="/search/category/:categoryKey" element={<SearchCategory />} />
        <Route path="/setup"         element={<SetupGuide />} />
        <Route path="/llm-setup"     element={<LLMSetup />} />
        <Route path="/fake-medicine-guide" element={<FakeMedicineGuide />} />
        <Route path="/med-guide"     element={<MedGuideBot />} />
      </Routes>
    </BrowserRouter>
  );
}
