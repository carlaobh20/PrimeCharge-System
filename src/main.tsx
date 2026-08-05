import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { instalarCapturaGlobalDeErros } from '@/shared/lib/errorReporting';
import { App } from './app/App';

// DEC-027/DEC-036: captura o que o ErrorBoundary (app/App.tsx) não cobre — exceção fora da
// árvore React e Promise rejeitada sem catch. Instalado uma única vez, antes do primeiro render.
instalarCapturaGlobalDeErros();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
