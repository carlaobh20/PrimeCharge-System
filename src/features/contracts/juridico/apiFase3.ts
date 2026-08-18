// API da Fase 3 — políticas, seguros, rescisões, revisões jurídicas, parâmetros (migration 0044)
// + consultas por CONTRATO das entidades operacionais existentes (multas/sinistros/vistorias),
// usadas pela Ficha Jurídica e pelo Dossiê. Toda segurança é RLS; o front só consulta.
import { supabase } from '@/shared/lib/supabase';

// ============================ TIPOS ============================
export type ContratoPolitica = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  template_id: string | null;
  status: 'rascunho' | 'ativa' | 'arquivada';
  campos_obrigatorios: string[];
  anexos_obrigatorios: string[];
  regras: Record<string, unknown>;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type ContratoSeguro = {
  id: string;
  empresa_id: string;
  contrato_id: string;
  seguradora: string | null;
  apolice: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  franquia_valor: number | null;
  coberturas: Record<string, boolean | null>;
  assistencia: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type RescisaoStatus =
  | 'solicitada'
  | 'em_analise'
  | 'aprovada'
  | 'agendada'
  | 'devolucao_pendente'
  | 'devolvido'
  | 'encerrada'
  | 'cancelada';

export type ContratoRescisao = {
  id: string;
  empresa_id: string;
  contrato_id: string;
  status: RescisaoStatus;
  motivo: string;
  solicitante: 'motorista' | 'empresa' | 'acordo';
  solicitado_por: string | null;
  responsavel_id: string | null;
  data_agendada: string | null;
  checklist: Record<string, boolean>;
  valores: Record<string, number | string>;
  observacoes: string | null;
  encerrada_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const RESCISAO_STATUS_LABEL: Record<RescisaoStatus, string> = {
  solicitada: 'Solicitada',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  agendada: 'Agendada',
  devolucao_pendente: 'Devolução pendente',
  devolvido: 'Devolvido',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

// Espelha fn_validar_transicao_rescisao (0044) — só habilita botões; o banco valida de verdade.
export const RESCISAO_TRANSITIONS: Record<RescisaoStatus, RescisaoStatus[]> = {
  solicitada: ['em_analise', 'cancelada'],
  em_analise: ['aprovada', 'cancelada'],
  aprovada: ['agendada', 'cancelada'],
  agendada: ['devolucao_pendente', 'cancelada'],
  devolucao_pendente: ['devolvido'],
  devolvido: ['encerrada'],
  encerrada: [],
  cancelada: [],
};

// Checklist de encerramento (regra 17). Os 4 primeiros são o núcleo que o TRIGGER exige.
export const CHECKLIST_ENCERRAMENTO: { chave: string; rotulo: string; nucleo: boolean }[] = [
  { chave: 'veiculo_devolvido', rotulo: 'Veículo devolvido', nucleo: true },
  { chave: 'vistoria_final', rotulo: 'Vistoria final realizada', nucleo: true },
  { chave: 'pagamentos_verificados', rotulo: 'Pagamentos verificados', nucleo: true },
  { chave: 'caucao_apurada', rotulo: 'Caução apurada', nucleo: true },
  { chave: 'multas_verificadas', rotulo: 'Multas verificadas', nucleo: false },
  { chave: 'sinistros_verificados', rotulo: 'Sinistros verificados', nucleo: false },
  { chave: 'manutencao_verificada', rotulo: 'Manutenção verificada', nucleo: false },
  { chave: 'documentos_arquivados', rotulo: 'Documentos arquivados', nucleo: false },
  { chave: 'aceite_encerramento', rotulo: 'Assinatura/aceite de encerramento', nucleo: false },
  { chave: 'saldo_final_registrado', rotulo: 'Saldo final registrado', nucleo: false },
];

export type RevisaoJuridicaStatus = 'pendente' | 'em_analise' | 'aprovado' | 'aprovado_com_ressalvas' | 'reprovado';

export type ContratoRevisaoJuridica = {
  id: string;
  empresa_id: string;
  template_id: string;
  versao_template: number;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  status: RevisaoJuridicaStatus;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const REVISAO_JURIDICA_STATUS_LABEL: Record<RevisaoJuridicaStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  aprovado_com_ressalvas: 'Aprovado com ressalvas',
  reprovado: 'Reprovado',
};

export type JuridicoParametro = {
  id: string;
  empresa_id: string;
  chave: string;
  valor: Record<string, unknown>;
  atualizado_em: string;
};

// Chaves conhecidas de parâmetros (regras 8/9/10/12/15) — o CONTEÚDO é decisão do advogado.
export const PARAMETROS_CONHECIDOS: { chave: string; rotulo: string; descricao: string }[] = [
  { chave: 'manutencao_responsabilidades', rotulo: 'Responsabilidade por manutenção', descricao: 'Quem responde por preventiva, corretiva, desgaste, pneus, freios, bateria, revisões / mau uso, negligência, danos. [VALIDAR COM ADVOGADO]' },
  { chave: 'bateria_recarga', rotulo: 'Bateria e recarga (veículo elétrico)', descricao: 'Responsabilidade pela recarga, carregadores permitidos, recarga inadequada, degradação, telemetria. [VALIDAR COM ADVOGADO]' },
  { chave: 'lgpd_telemetria', rotulo: 'LGPD / Telemetria', descricao: 'Dados coletados (GPS, km, velocidade, bateria, eventos), finalidade, retenção, acesso, base legal, compartilhamento. [VALIDAR COM ADVOGADO]' },
  { chave: 'assinatura_prazo_dias', rotulo: 'Prazo de assinatura (dias)', descricao: 'Dias até o convite de assinatura expirar. Alertas derivados em 7/3/1 dias.' },
  { chave: 'renovacao_janelas_dias', rotulo: 'Janelas de renovação (dias)', descricao: 'Janelas de alerta antes do vencimento (padrão 90/60/30/15/7).' },
];

// ============================ POLÍTICAS ============================
export async function listPoliticas() {
  const { data, error } = await supabase.from('contrato_politicas').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoPolitica[];
}

export async function createPolitica(empresaId: string, payload: Partial<ContratoPolitica> & { nome: string }) {
  const { data, error } = await supabase
    .from('contrato_politicas')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoPolitica;
}

export async function updatePolitica(id: string, payload: Partial<ContratoPolitica>) {
  const { data, error } = await supabase.from('contrato_politicas').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as ContratoPolitica;
}

// ============================ SEGUROS ============================
export async function listSegurosPorContrato(contratoId: string) {
  const { data, error } = await supabase
    .from('contrato_seguros')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoSeguro[];
}

export async function upsertSeguro(empresaId: string, contratoId: string, payload: Partial<ContratoSeguro>, id?: string) {
  if (id) {
    const { data, error } = await supabase.from('contrato_seguros').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as ContratoSeguro;
  }
  const { data, error } = await supabase
    .from('contrato_seguros')
    .insert({ ...payload, empresa_id: empresaId, contrato_id: contratoId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoSeguro;
}

/** Seguros de TODOS os contratos da empresa (dashboard) — colunas mínimas. */
export async function listSegurosDaEmpresa() {
  const { data, error } = await supabase
    .from('contrato_seguros')
    .select('id, contrato_id, seguradora, apolice, vigencia_fim');
  if (error) throw error;
  return data as { id: string; contrato_id: string; seguradora: string | null; apolice: string | null; vigencia_fim: string | null }[];
}

// ============================ RESCISÕES ============================
export async function listRescisoesPorContrato(contratoId: string) {
  const { data, error } = await supabase
    .from('contrato_rescisoes')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoRescisao[];
}

export async function createRescisao(
  empresaId: string,
  payload: { contrato_id: string; motivo: string; solicitante: 'motorista' | 'empresa' | 'acordo'; solicitado_por?: string | null },
) {
  const { data, error } = await supabase
    .from('contrato_rescisoes')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoRescisao;
}

export async function updateRescisao(id: string, payload: Partial<Pick<ContratoRescisao, 'status' | 'checklist' | 'valores' | 'observacoes' | 'data_agendada' | 'responsavel_id'>>) {
  const { data, error } = await supabase.from('contrato_rescisoes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as ContratoRescisao;
}

// ============================ REVISÕES JURÍDICAS ============================
export async function listRevisoesPorTemplate(templateId: string) {
  const { data, error } = await supabase
    .from('contrato_revisoes_juridicas')
    .select('*')
    .eq('template_id', templateId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoRevisaoJuridica[];
}

export async function listRevisoes() {
  const { data, error } = await supabase.from('contrato_revisoes_juridicas').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ContratoRevisaoJuridica[];
}

export async function createRevisao(
  empresaId: string,
  payload: { template_id: string; versao_template: number; responsavel_id?: string | null; responsavel_nome?: string | null; status: RevisaoJuridicaStatus; observacoes?: string | null },
) {
  const { data, error } = await supabase
    .from('contrato_revisoes_juridicas')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContratoRevisaoJuridica;
}

/** O template está juridicamente aprovado NA VERSÃO ATUAL? (regra 25/26) */
export function templateAprovadoJuridicamente(revisoes: ContratoRevisaoJuridica[], versaoAtual: number): boolean {
  return revisoes.some(
    (r) => r.versao_template === versaoAtual && (r.status === 'aprovado' || r.status === 'aprovado_com_ressalvas'),
  );
}

// ============================ PARÂMETROS ============================
export async function listParametros() {
  const { data, error } = await supabase.from('juridico_parametros').select('*');
  if (error) throw error;
  return data as JuridicoParametro[];
}

export async function upsertParametro(empresaId: string, chave: string, valor: Record<string, unknown>, usuarioId?: string) {
  const { data, error } = await supabase
    .from('juridico_parametros')
    .upsert({ empresa_id: empresaId, chave, valor, atualizado_por: usuarioId ?? null }, { onConflict: 'empresa_id,chave' })
    .select()
    .single();
  if (error) throw error;
  return data as JuridicoParametro;
}

// ============================ ENTIDADES OPERACIONAIS POR CONTRATO ============================
// Multas/sinistros/vistorias têm contrato_id desde as migrations antigas; as APIs existentes
// filtram por veículo/motorista — aqui filtramos por contrato (Ficha Jurídica + Dossiê),
// selecionando só as colunas usadas.
export async function listMultasPorContrato(contratoId: string) {
  const { data, error } = await supabase
    .from('multas')
    .select('id, orgao_autuador, descricao, data_infracao, valor, status')
    .eq('contrato_id', contratoId)
    .order('data_infracao', { ascending: false });
  if (error) throw error;
  return data as { id: string; orgao_autuador: string; descricao: string; data_infracao: string; valor: number | null; status: string }[];
}

export async function listSinistrosPorContrato(contratoId: string) {
  const { data, error } = await supabase
    .from('sinistros')
    .select('id, tipo, data_ocorrencia, descricao')
    .eq('contrato_id', contratoId)
    .order('data_ocorrencia', { ascending: false });
  if (error) throw error;
  return data as { id: string; tipo: string; data_ocorrencia: string; descricao: string | null }[];
}

export async function listVistoriasPorContrato(contratoId: string) {
  const { data, error } = await supabase
    .from('checklists')
    .select('id, titulo, tipo, status, criado_em')
    .eq('contrato_id', contratoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as { id: string; titulo: string; tipo: string | null; status: string; criado_em: string }[];
}

/** Resumo financeiro derivado dos lançamentos do contrato (regra 18 — nada de penalidade
 * automática; só soma o que está REGISTRADO). */
export async function resumoFinanceiroContrato(contratoId: string) {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('tipo, valor, status, data_prevista')
    .eq('contrato_id', contratoId);
  if (error) throw error;
  // status reais do módulo financeiro (types.ts): prevista | confirmada | cancelada
  const linhas = data as { tipo: string; valor: number; status: string; data_prevista: string | null }[];
  const hoje = new Date().toISOString().slice(0, 10);
  let receitasConfirmadas = 0;
  let receitasPendentes = 0;
  let receitasVencidas = 0;
  let despesas = 0;
  for (const l of linhas) {
    if (l.tipo === 'receita') {
      if (l.status === 'confirmada') receitasConfirmadas += l.valor;
      else if (l.status === 'prevista') {
        receitasPendentes += l.valor;
        if (l.data_prevista && l.data_prevista < hoje) receitasVencidas += l.valor;
      }
    } else if (l.status !== 'cancelada') {
      despesas += l.valor;
    }
  }
  return { receitasConfirmadas, receitasPendentes, receitasVencidas, despesas, totalLancamentos: linhas.length };
}
