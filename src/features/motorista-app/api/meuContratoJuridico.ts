import { supabase } from '@/shared/lib/supabase';
import type { ContratoAssinaturaStatus, ContratoVersaoStatus } from '@/features/contracts/juridico/types';

// App do Motorista — documento jurídico do PRÓPRIO contrato (Centro Jurídico Fase 2).
// Regras do portal (Fase 1 de segurança, fix R4): PROIBIDO select('*') — colunas explícitas,
// tipo espelha exatamente o que trafega. Nenhum filtro .eq('motorista_id') manual: a RLS da
// 0042 já entrega SÓ as versões do próprio contrato em estado compartilhável
// (aguardando_assinatura/assinada/vigente) e SÓ a própria linha de assinatura (parte='motorista').
// snapshot NÃO é selecionado de propósito (contém dados internos da geração); o corpo renderizado
// é o documento que o motorista deve ler.

export type MinhaVersaoContrato = {
  id: string;
  contrato_id: string;
  numero: number;
  rotulo: string | null;
  status: ContratoVersaoStatus; // via RLS: só aguardando_assinatura/assinada/vigente chegam
  corpo: string | null;
  hash_sha256: string | null;
  congelada_em: string | null;
  criado_em: string;
};

const COLUNAS_VERSAO = 'id, contrato_id, numero, rotulo, status, corpo, hash_sha256, congelada_em, criado_em';

export async function listMinhasVersoesContrato() {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select(COLUNAS_VERSAO)
    .order('numero', { ascending: false });
  if (error) throw error;
  return data as MinhaVersaoContrato[];
}

export type MinhaAssinatura = {
  id: string;
  contrato_versao_id: string;
  status: ContratoAssinaturaStatus;
  enviado_em: string | null;
  visualizado_em: string | null;
  assinado_em: string | null;
  motivo_recusa: string | null;
};

const COLUNAS_ASSINATURA = 'id, contrato_versao_id, status, enviado_em, visualizado_em, assinado_em, motivo_recusa';

export async function listMinhasAssinaturas() {
  const { data, error } = await supabase.from('contrato_assinaturas').select(COLUNAS_ASSINATURA);
  if (error) throw error;
  return data as MinhaAssinatura[];
}

/** Evidência registrada no aceite — o que dá pra capturar honestamente do lado do cliente.
 * (IP não é capturável client-side; entra quando houver provedor de assinatura/backend.) */
function evidenciaLocal(extra?: Record<string, unknown>) {
  return {
    user_agent: navigator.userAgent,
    tela: `${window.screen.width}x${window.screen.height}`,
    registrado_em: new Date().toISOString(),
    origem: 'app_motorista',
    ...extra,
  };
}

export async function marcarVersaoVisualizada(assinaturaId: string) {
  const { data, error } = await supabase
    .from('contrato_assinaturas')
    .update({ status: 'visualizado', visualizado_em: new Date().toISOString() })
    .eq('id', assinaturaId)
    .in('status', ['enviado'])
    .select(COLUNAS_ASSINATURA);
  if (error) throw error;
  return (data as MinhaAssinatura[])[0] ?? null;
}

export async function assinarMeuContrato(assinaturaId: string, email: string | undefined) {
  const { data, error } = await supabase
    .from('contrato_assinaturas')
    .update({
      status: 'assinado',
      assinado_em: new Date().toISOString(),
      evidencia: evidenciaLocal({ email: email ?? null, acao: 'aceite_assinatura' }),
    })
    .eq('id', assinaturaId)
    .select(COLUNAS_ASSINATURA)
    .single();
  if (error) throw error;
  return data as MinhaAssinatura;
}

export async function recusarMeuContrato(assinaturaId: string, motivo: string) {
  const { data, error } = await supabase
    .from('contrato_assinaturas')
    .update({
      status: 'recusado',
      motivo_recusa: motivo,
      evidencia: evidenciaLocal({ acao: 'recusa' }),
    })
    .eq('id', assinaturaId)
    .select(COLUNAS_ASSINATURA)
    .single();
  if (error) throw error;
  return data as MinhaAssinatura;
}
