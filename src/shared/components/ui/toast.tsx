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

// Códigos SQLSTATE do Postgres/PostgREST que aparecem sem passar por nenhum `raise exception`
// escrito à mão nos triggers deste projeto — mapeados para texto em português, para nunca
// repassar o texto técnico cru (nome de tabela/constraint/coluna em inglês) para quem está
// operando a plataforma. Lista não exaustiva de propósito — cobre os casos mais prováveis de
// aparecer numa operação real (duplicidade, vínculo obrigatório, campo obrigatório, permissão,
// sessão expirada); qualquer código fora desta lista cai no fallback genérico abaixo.
const CODIGOS_CONHECIDOS: Record<string, string> = {
  '23505': 'Já existe um registro com esse valor — verifique se não é duplicado (ex.: placa, CPF, e-mail).',
  '23503': 'Não é possível concluir: existem outros registros vinculados a este.',
  '23502': 'Preencha todos os campos obrigatórios antes de salvar.',
  '42501': 'Você não tem permissão para executar esta ação.',
  '28000': 'Sessão expirada — faça login novamente.',
  'PGRST301': 'Sessão expirada — faça login novamente.',
};

// Achado da auditoria de UX da Missão 4 (Fase 9): esta função repassava `error.message` cru
// para o usuário sempre que o erro não vinha de um `raise exception` escrito à mão — qualquer
// outro erro do Postgres/Supabase (violação de unique/FK, RLS "new row violates row-level
// security policy...", timeout de rede) aparecia em inglês, com nome de tabela/constraint,
// direto na tela de quem está operando. Correção: `P0001` é o código SQLSTATE padrão de um
// `raise exception '...'` escrito à mão nos triggers de banco deste projeto (ex.:
// fn_validar_transicao_veiculo, fn_bloquear_autoescalada_usuario) — sempre em português
// legível, e é o único caso em que repassamos `.message` diretamente. Qualquer outro código
// conhecido vira texto amigável (`CODIGOS_CONHECIDOS`); qualquer erro sem código reconhecido
// (rede, timeout, erro inesperado do Postgres) cai num texto genérico, nunca no texto técnico.
export function extrairMensagemDeErro(error: unknown): string {
  const GENERICA = 'Não foi possível concluir a ação. Tente novamente ou avise o suporte.';

  if (error && typeof error === 'object') {
    const err = error as { message?: unknown; code?: unknown };
    const code = typeof err.code === 'string' ? err.code : undefined;
    const message = typeof err.message === 'string' ? err.message : undefined;

    if (code === 'P0001' && message) return message;
    if (code && CODIGOS_CONHECIDOS[code]) return CODIGOS_CONHECIDOS[code];
    if (message) return GENERICA;
  }
  if (error instanceof Error) return GENERICA;
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
