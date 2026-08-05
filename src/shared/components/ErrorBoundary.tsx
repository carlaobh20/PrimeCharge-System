import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from './ui/button';
import { capturarErro } from '../lib/errorReporting';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { temErro: boolean };

// Cobre erro de render dentro da árvore React (DEC-027/DEC-036) — o outro lado da captura
// mínima de erro é `instalarCapturaGlobalDeErros` (shared/lib/errorReporting.ts), que cobre o
// que Error Boundary NÃO cobre (listener de evento, Promise sem catch). Um só Boundary no
// topo do app (ver app/App.tsx) — granularidade por seção/rota fica para quando um caso real
// mostrar que um erro isolado numa tela não deveria derrubar o app inteiro (hoje não há esse
// caso registrado).
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { temErro: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { temErro: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    capturarErro(erro, { tipo: 'react-error-boundary', componentStack: info.componentStack });
  }

  render() {
    if (!this.state.temErro) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center dark:bg-neutral-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Algo deu errado nesta tela.</p>
          <p className="max-w-sm text-xs text-neutral-500">
            O erro já foi registrado. Recarregar a página costuma resolver — se persistir, avise a equipe.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
      </div>
    );
  }
}
