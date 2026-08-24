import { supabase } from '@/shared/lib/supabase';
import { ehRecursoAusente, registrarAusente } from '@/shared/lib/schemaGuard';

// FASE 20 — Módulo 6: captura/persistência da localização operacional do motorista.
// Nenhuma coluna client-side além do essencial: motorista_id/veiculo_id/empresa_id são
// derivados no banco (trigger fn_validar_localizacao_operacional, migration 0051) — nunca
// enviados por este arquivo, mesmo princípio de menor privilégio de meuContrato.ts.

const MODULO = 'motorista_localizacoes';

export type ResultadoGravarLocalizacao =
  | { ok: true }
  | { ok: false; motivo: 'schema_indisponivel' }
  | { ok: false; motivo: 'vinculo_inativo'; mensagem: string }
  | { ok: false; motivo: 'erro'; mensagem: string };

/**
 * Grava uma captura de localização operacional. `contratoId` é sempre o contrato ATIVO do
 * motorista (resolvido pela tela chamadora, mesmo `contratoAtivo.id` que `useMinhaMeta` já
 * carrega — nenhuma query de contrato nova). Nunca envia motorista_id/veiculo_id/empresa_id: o
 * banco deriva os três a partir do `contrato_id` (migration 0051) e rejeita se o vínculo não
 * estiver ativo — esta função só traduz essa rejeição num motivo legível, nunca insiste sozinha.
 */
export async function gravarLocalizacaoOperacional(input: {
  contratoId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  timestampLocalizacaoMs: number;
}): Promise<ResultadoGravarLocalizacao> {
  const { error } = await supabase.from('motorista_localizacoes').insert({
    contrato_id: input.contratoId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_m: input.accuracyM,
    timestamp_localizacao: new Date(input.timestampLocalizacaoMs).toISOString(),
  });
  if (!error) return { ok: true };
  if (ehRecursoAusente(error)) {
    registrarAusente(MODULO);
    return { ok: false, motivo: 'schema_indisponivel' };
  }
  // O trigger (fn_validar_localizacao_operacional) rejeita com uma mensagem legível quando o
  // vínculo operacional não está ativo (contrato encerrado, motorista desativado/bloqueado) —
  // repassa essa mensagem em vez de um erro genérico, mas NUNCA insiste tentando de novo aqui.
  if (error.code === 'P0001') {
    return { ok: false, motivo: 'vinculo_inativo', mensagem: error.message };
  }
  return { ok: false, motivo: 'erro', mensagem: error.message };
}

export type MinhaLocalizacaoRecente = {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  timestamp_localizacao: string;
};

/** Última captura do PRÓPRIO motorista — usada só pelo card "Localização operacional" do
 *  Centro de Controle (Módulo 18), nunca por telas de staff (essa é a api de frota). */
export async function getMinhaLocalizacaoRecente(): Promise<MinhaLocalizacaoRecente | null> {
  try {
    const { data, error } = await supabase
      .from('motorista_localizacoes')
      .select('latitude, longitude, accuracy_m, timestamp_localizacao')
      .order('timestamp_localizacao', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as MinhaLocalizacaoRecente | null;
  } catch (error) {
    if (ehRecursoAusente(error)) {
      registrarAusente(MODULO);
      return null;
    }
    throw error;
  }
}
