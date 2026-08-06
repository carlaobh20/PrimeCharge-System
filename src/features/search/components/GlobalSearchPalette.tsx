import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, FileSignature, Search, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useGlobalSearch, type SearchResult, type SearchResultTipo } from '../hooks/useGlobalSearch';

const ICONE_POR_TIPO: Record<SearchResultTipo, typeof Car> = {
  veiculo: Car,
  motorista: Users,
  contrato: FileSignature,
};

// Shell próprio, não o `Dialog` genérico (`shared/components/ui/dialog.tsx`) — aquele exige
// `title` fixo com `<h2>`+botão de fechar num layout de formulário; um command palette não tem
// título, o próprio input de busca é o elemento principal. Reaproveita só a linguagem visual
// (overlay com blur, animações `animate-cockpit-*`, fecha com Escape/clique fora), não o
// componente. Não vira um `Dialog` genérico com `title` opcional porque nenhum outro dos ~15
// usos existentes precisaria disso — mudar o componente compartilhado por um único consumidor
// nesta sprint seria abstração ao contrário da Regra dos 3 (DEC-010).
export function GlobalSearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [termo, setTermo] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const { resultados, isLoading } = useGlobalSearch(termo, open);

  useEffect(() => {
    if (open) {
      setTermo('');
      setIndiceAtivo(0);
      // foco no próximo tick, depois do elemento montar
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setIndiceAtivo(0);
  }, [resultados.length]);

  function selecionar(resultado: SearchResult) {
    onOpenChange(false);
    navigate(resultado.href);
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceAtivo((i) => Math.min(i + 1, resultados.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceAtivo((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const alvo = resultados[indiceAtivo];
        if (alvo) selecionar(alvo);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resultados, indiceAtivo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
      <div className="absolute inset-0 animate-cockpit-fade-in bg-neutral-950/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="relative w-full max-w-lg animate-cockpit-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-white/10">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar veículo (placa), motorista (nome/CPF) ou contrato…"
            className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          <kbd className="hidden shrink-0 rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:border-white/10 sm:block">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {termo.trim() === '' && <p className="px-3 py-6 text-center text-xs text-neutral-400">Digite para buscar em toda a plataforma.</p>}
          {termo.trim() !== '' && isLoading && <p className="px-3 py-6 text-center text-xs text-neutral-400">Buscando…</p>}
          {termo.trim() !== '' && !isLoading && resultados.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-neutral-400">Nenhum resultado para "{termo}".</p>
          )}
          {resultados.map((resultado, i) => {
            const Icone = ICONE_POR_TIPO[resultado.tipo];
            return (
              <button
                key={`${resultado.tipo}-${resultado.id}`}
                type="button"
                onClick={() => selecionar(resultado)}
                onMouseEnter={() => setIndiceAtivo(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  i === indiceAtivo ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-neutral-50 dark:hover:bg-white/5'
                )}
              >
                <Icone className="h-4 w-4 shrink-0 text-neutral-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{resultado.titulo}</span>
                  <span className="block truncate text-xs text-neutral-400">{resultado.subtitulo}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
