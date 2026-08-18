// Camada de acesso do Centro Jurídico (migration 0042). Toda escrita passa pela RLS do banco
// (staff via pode('contratos',...); motorista só a própria assinatura). O front NÃO reimplementa
// segurança — só chama; o banco decide. As transições de status também são validadas por trigger:
// se o front pedir uma transição inválida, o banco aborta.
import { supabase } from '@/shared/lib/supabase';
import type {
  ContratoTemplate,
  ContratoTemplateInput,
  ContratoVersao,
  ContratoVersaoInput,
  ContratoVersaoStatus,
  ContratoAssinatura,
  ContratoAssinaturaInput,
  ContratoAssinaturaStatus,
  ContratoAssinaturaEvidencia,
  ContratoAditivo,
  ContratoAditivoInput,
} from './types';

// ============================ TEMPLATES ============================
export async function listTemplates() {
  const { data, error } = await supabase
    .from('contrato_templates')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoTemplate[];
}

export async function createTemplate(empresaId: string, payload: ContratoTemplateInput) {
  const { data, error } = await supabase
    .from('contrato_templates')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoTemplate;
}

export async function updateTemplate(id: string, payload: Partial<ContratoTemplateInput>) {
  const { data, error } = await supabase.from('contrato_templates').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as ContratoTemplate;
}

// ============================ VERSÕES ============================
export async function listVersoes(contratoId: string) {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('numero', { ascending: false });
  if (error) throw error;
  return data as ContratoVersao[];
}

export async function getVersao(id: string) {
  const { data, error } = await supabase.from('contrato_versoes').select('*').eq('id', id).single();
  if (error) throw error;
  return data as ContratoVersao;
}

/** Próximo número de versão do contrato (1 se não houver nenhuma). Some do lado do cliente porque
 * o unique(contrato_id,numero) do banco é a barreira real contra corrida. */
export async function proximoNumeroVersao(contratoId: string): Promise<number> {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select('numero')
    .eq('contrato_id', contratoId)
    .order('numero', { ascending: false })
    .limit(1);
  if (error) throw error;
  const maior = (data as { numero: number }[])[0]?.numero ?? 0;
  return maior + 1;
}

export async function createVersao(empresaId: string, payload: ContratoVersaoInput) {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .insert({ ...payload, empresa_id: empresaId, status: 'rascunho' })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoVersao;
}

/** Muda o status da versão. O trigger do banco valida a transição e, ao entrar em
 * 'aguardando_assinatura', CONGELA a versão automaticamente. Erro do banco = transição inválida. */
export async function mudarStatusVersao(id: string, status: ContratoVersaoStatus) {
  const { data, error } = await supabase.from('contrato_versoes').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as ContratoVersao;
}

/** Grava corpo + hash antes de congelar (só permitido enquanto NÃO congelada — o trigger de
 * imutabilidade bloqueia depois). */
export async function gravarCorpoVersao(id: string, corpo: string, hash_sha256: string) {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .update({ corpo, hash_sha256 })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ContratoVersao;
}

// ============================ ASSINATURAS ============================
export async function listAssinaturas(contratoVersaoId: string) {
  const { data, error } = await supabase
    .from('contrato_assinaturas')
    .select('*')
    .eq('contrato_versao_id', contratoVersaoId)
    .order('ordem', { ascending: true });
  if (error) throw error;
  return data as ContratoAssinatura[];
}

export async function createAssinatura(empresaId: string, payload: ContratoAssinaturaInput) {
  const { data, error } = await supabase
    .from('contrato_assinaturas')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoAssinatura;
}

/** Atualiza o status de uma assinatura. Staff pode qualquer linha; motorista só a própria
 * (parte='motorista') — a RLS decide. `evidencia` registra IP/user agent/etc. quando disponível. */
export async function mudarStatusAssinatura(
  id: string,
  status: ContratoAssinaturaStatus,
  extra?: { evidencia?: ContratoAssinaturaEvidencia; motivo_recusa?: string | null },
) {
  const patch: Record<string, unknown> = { status };
  const agora = new Date().toISOString();
  if (status === 'enviado') patch.enviado_em = agora;
  if (status === 'visualizado') patch.visualizado_em = agora;
  if (status === 'assinado' || status === 'aceito') patch.assinado_em = agora;
  if (extra?.evidencia) patch.evidencia = extra.evidencia;
  if (extra?.motivo_recusa !== undefined) patch.motivo_recusa = extra.motivo_recusa;
  const { data, error } = await supabase.from('contrato_assinaturas').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as ContratoAssinatura;
}

// ============================ ADITIVOS ============================
export async function listAditivos(contratoId: string) {
  const { data, error } = await supabase
    .from('contrato_aditivos')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoAditivo[];
}

export async function createAditivo(empresaId: string, payload: ContratoAditivoInput) {
  const { data, error } = await supabase
    .from('contrato_aditivos')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoAditivo;
}
