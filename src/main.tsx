import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { instalarCapturaGlobalDeErros } from '@/shared/lib/errorReporting';
import { App } from './app/App';

// DEC-027/DEC-036: captura o que o ErrorBoundary (app/App.tsx) não cobre — exceção fora da
// árvore React e Promise rejeitada sem catch. Instalado uma única vez, antes do primeiro render.
instalarCapturaGlobalDeErros();

// PWA (Fase 2): registra o service worker mínimo (public/sw.js) — instalabilidade + abertura
// rápida do shell. Só em produção (no dev do Vite atrapalharia o HMR) e só se o browser
// suportar. Falha de registro é silenciosa (PWA é progressive enhancement, nunca bloqueia).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sem PWA neste dispositivo — segue normal */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
