import { supabase } from './supabase';
import { extrairMensagemDeErro } from './errors';

export type ErroContexto = Record<string, unknown>;

// Captura mínima de erro em produção (DEC-027/DEC-036) — grava em `erros_sistema`
// (migration 0005_modulo_contratos.sql). Deliberadamente simples: nenhuma dependência de
// React/React Query aqui (shared/lib não depende de app/) — funciona tanto dentro da árvore
// React (via ErrorBoundary) quanto fora dela (listeners globais, abaixo).
//
// Nunca lança: uma falha ao REPORTAR um erro não pode virar um novo erro não tratado (loop
// ou crash secundário). empresa_id/usuario_id são melhor-esforço — se a sessão ainda não
// estiver resolvida (ex.: erro na tela de login, antes de qualquer usuário autenticado), a
// linha simplesmente não é gravada (RLS de erros_sistema exige `authenticated`, ver
// migration 0005) e o erro cai no console como última linha de defesa.
export async function capturarErro(erro: unknown, contexto?: ErroContexto): Promise<void> {
  try {
    const mensagem = extrairMensagemDeErro(erro);
    const stack = erro instanceof Error ? (erro.stack ?? null) : null;

    const { data: authData } = await supabase.auth.getUser();
    const usuarioId = authData.user?.id ?? null;

    let empresaId: string | null = null;
    if (usuarioId) {
      const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', usuarioId).single();
      empresaId = usuario?.empresa_id ?? null;
    }

    await supabase.from('erros_sistema').insert({
      empresa_id: empresaId,
      usuario_id: usuarioId,
      mensagem,
      stack,
      contexto: contexto ?? null,
      url: typeof window !== 'undefined' ? window.location.href : null,
    });
  } catch {
    // Se até a captura falhar (ex.: sem sessão, rede fora), cai pro console — nunca deixa a
    // falha de telemetria virar uma exceção não tratada nova.
    console.error('[errorReporting] falha ao registrar erro em erros_sistema:', erro);
  }
}

// Cobre os dois casos que React Error Boundaries NÃO capturam: exceção síncrona fora da
// árvore React (listeners de evento, timers) e Promise rejeitada sem `.catch`. Chamada uma
// única vez, no bootstrap (main.tsx) — junto com ErrorBoundary (que cobre erro de render
// dentro da árvore React), fecha o mínimo que DEC-027 pede.
export function instalarCapturaGlobalDeErros(): void {
  window.addEventListener('error', (event) => {
    capturarErro(event.error ?? event.message, { tipo: 'window.onerror' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    capturarErro(event.reason, { tipo: 'unhandledrejection' });
  });
}
