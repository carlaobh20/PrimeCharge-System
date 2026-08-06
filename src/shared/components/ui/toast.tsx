import { useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Toast — Tailwind-only, sem dependência nova (mesmo princípio de dialog.tsx/confirm-dialog.tsx:
// "sem dependência nova" já é convenção deste projeto, não uma escolha nova desta auditoria).
//
// Achado da auditoria de CTO anterior (2026-08-06, DEC-069 e relatório executivo): nenhuma
// mutação do sistema tinha feedback de erro visível — e isso ficou mais grave depois que essa
// mesma auditoria fechou RBAC real em Veículos/Motoristas/Contratos, porque agora existem
// rejeições reais (permissão negada, transição inválida) que antes passavam batido em
// silêncio. Este módulo fecha esse gap.
//
// Store fora do React (não é um Context) de propósito: o `MutationCache.onError` global em
// `app/providers/QueryProvider.tsx` roda fora de qualquer componente React, então precisa
// poder chamar `toast.error(...)` diretamente, sem passar por um hook. `useSyncExternalStore`
// é o jeito correto (React 18+) de um componente assinar um store externo sem gambiarra de
// `useState`+`useEffect` manual.

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
};

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 0;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

const DURATION_MS = 5000;

function push(variant: ToastVariant, message: string, description?: string) {
  // Dois toasts idênticos seguidos (comum quando uma mutation falha e o usuário tenta de novo
  // sem mudar nada) só reiniciam o tempo do que já existe, em vez de empilhar duplicata.
  const existente = toasts.find((t) => t.variant === variant && t.message === message && t.description === description);
  const id = existente?.id ?? String(nextId++);
  toasts = [...toasts.filter((t) => t.id !== id), { id, variant, message, description }];
  emit();
  return id;
}

export const toast = {
  success: (message: string, description?: string) => push('success', message, description),
  error: (message: string, description?: string) => push('error', message, description),
  info: (message: string, description?: string) => push('info', message, description),
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};

// Extrai a mensagem de erro no formato mais legível disponível — o erro do supabase-js
// (PostgrestError) já traz em `.message` exatamente o texto do `raise exception '...'` dos
// triggers de banco (ex.: fn_validar_transicao_veiculo, fn_bloquear_autoescalada_usuario),
// que já foram escritos em português legível — nenhum mapeamento adicional é necessário para
// a maioria dos casos que mais importam (permissão negada, transição inválida).
export function extrairMensagemDeErro(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) return error.message;
  return 'Ocorreu um erro inesperado.';
}

function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const VARIANT_STYLE: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  error: {
    icon: AlertTriangle,
    className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
  },
  info: {
    icon: Info,
    className: 'border-neutral-200 bg-white text-neutral-800 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200',
  },
};

function ToastCard({ item }: { item: ToastItem }) {
  const { icon: Icon, className } = VARIANT_STYLE[item.variant];

  useEffect(() => {
    const timer = setTimeout(() => toast.dismiss(item.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [item.id]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm animate-cockpit-fade-in items-start gap-2.5 rounded-xl border p-3 shadow-lg',
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.message}</p>
        {item.description && <p className="mt-0.5 text-xs opacity-80">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Fechar aviso"
        className="rounded p-0.5 opacity-60 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Montado uma única vez em app/App.tsx — toda a árvore chama `toast.success/error/info(...)`
// sem precisar de um hook ou de estar dentro de um Provider específico.
export function Toaster() {
  const items = useToasts();
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
