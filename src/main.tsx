import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from '@/state/AppContext';
import { registerSW } from '@/services/pwa';
import './index.css';

// Apply persisted accessibility classes early to avoid flash of unstyled state.
try {
  const saved = localStorage.getItem('neurosaathi:state:v1');
  if (saved) {
    const parsed = JSON.parse(saved);
    const s = parsed?.settings ?? {};
    document.documentElement.classList.toggle('large-text', Boolean(s.largeText));
    document.documentElement.classList.toggle('large-buttons', Boolean(s.largeButtons));
    document.documentElement.classList.toggle('high-contrast', Boolean(s.highContrast));
    document.documentElement.classList.toggle('reduced-motion', Boolean(s.reducedMotion));
  }
} catch {
  /* ignore */
}

registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);