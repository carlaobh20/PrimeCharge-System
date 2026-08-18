// API da Biblioteca Contratual (Fase 5): instalação das minutas, histórico de corpos (0046),
// importação do retorno do advogado (RPC com metadados), contratos por template e o STATUS
// COMPOSTO da biblioteca — derivado de estruturas EXISTENTES (template.status × revisões
// jurídicas × origem da última fotografia), sem alterar o enum do banco (regra 20/27 da missão).
import { supabase } from '@/shared/lib/supabase';
import { BIBLIOTECA, type EntradaBiblioteca } from './biblioteca';
import { extrairVariaveis } from './lib';
import { variaveisSemCatalogo } from './variaveisCatalogo';
import { templateAprovadoJuridicamente, type ContratoRevisaoJuridica } from './apiFase3';
import type { ContratoTemplate } from './types';

// ============================ INSTALAÇÃO ============================
/** Cria os templates da biblioteca que ainda não existem (por nome). NUNCA sobrescreve um
 * existente — atualização passa pelo fluxo normal (edição/import), protegido pelo histórico. */
export async function instalarBiblioteca(empresaId: string, existentes: ContratoTemplate[]) {
  const nomesExistentes = new Set(existentes.map((t) => t.nome));
  const faltantes: EntradaBiblioteca[] = BIBLIOTECA.filter((e) => !nomesExistentes.has(e.nome));
  const criados: string[] = [];
  for (const e of faltantes) {
    const { error } = await supabase.from('contrato_templates').insert({
      empresa_id: empresaId,
      nome: e.nome,
      descricao: `${e.descricao} — ${e.finalidade}`,
      tipo: e.categoria,
      corpo: e.corpo,
      variaveis: extrairVariaveis(e.corpo),
      status: 'rascunho',
    });
    if (error) throw error;
    criados.push(e.nome);
  }
  return { criados, jaExistiam: BIBLIOTECA.length - faltantes.length };
}

// ============================ HISTÓRICO (0046) ============================
export type TemplateVersaoHistorico = {
  id: string;
  template_id: string;
  versao_template: number;
  corpo: string;
  hash_sha256: string | null;
  origem: 'edicao' | 'retorno_advogado' | 'ajuste_interno' | 'publicacao' | 'instalacao_biblioteca';
  responsavel_id: string | null;
  responsavel_nome: string | null;
  observacao: string | null;
  criado_em: string;
};

export const ORIGEM_HISTORICO_LABEL: Record<TemplateVersaoHistorico['origem'], string> = {
  edicao: 'Edição interna',
  retorno_advogado: 'Retorno do advogado',
  ajuste_interno: 'Ajuste interno',
  publicacao: 'Publicação',
  instalacao_biblioteca: 'Instalação da biblioteca',
};

export async function listHistoricoTemplate(templateId: string) {
  const { data, error } = await supabase
    .from('contrato_template_versoes')
    .select('*')
    .eq('template_id', templateId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as TemplateVersaoHistorico[];
}

// ============================ IMPORTAÇÃO DO RETORNO ============================
/** Valida e importa a nova redação (retorno do advogado ou ajuste interno). O corpo anterior é
 * fotografado AUTOMATICAMENTE pelo trigger da 0046 com a origem/responsável informados —
 * impossível perder a versão anterior. Variável órfã (fora do catálogo) BLOQUEIA o import. */
export async function importarCorpoTemplate(params: {
  templateId: string;
  corpoNovo: string;
  origem: 'retorno_advogado' | 'ajuste_interno';
  responsavel: string;
  observacao?: string;
}) {
  const orfas = variaveisSemCatalogo(extrairVariaveis(params.corpoNovo));
  if (orfas.length > 0) {
    throw new Error(`Importação bloqueada: variáveis fora do catálogo — ${orfas.join(', ')}. Adicione-as ao catálogo antes.`);
  }
  const { error } = await supabase.rpc('fn_atualizar_corpo_template', {
    p_template_id: params.templateId,
    p_corpo: params.corpoNovo,
    p_origem: params.origem,
    p_responsavel: params.responsavel,
    p_observacao: params.observacao ?? null,
  });
  if (error) throw error;
  // variáveis do template acompanham o corpo novo
  const { error: e2 } = await supabase
    .from('contrato_templates')
    .update({ variaveis: extrairVariaveis(params.corpoNovo) })
    .eq('id', params.templateId);
  if (e2) throw e2;
}

// ============================ CONTRATOS POR TEMPLATE ============================
/** Quantos documentos de contrato usam cada template (contrato_versoes.template_id) — em lote. */
export async function contarContratosPorTemplate(templateIds: string[]) {
  if (templateIds.length === 0) return new Map<string, number>();
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select('template_id')
    .in('template_id', templateIds);
  if (error) throw error;
  const mapa = new Map<string, number>();
  for (const r of data as { template_id: string | null }[]) {
    if (r.template_id) mapa.set(r.template_id, (mapa.get(r.template_id) ?? 0) + 1);
  }
  return mapa;
}

// ============================ ENVIO AO ADVOGADO ============================
/** Registra o envio do pacote: cria uma revisão jurídica 'pendente' por template enviado
 * (reuso de contrato_revisoes_juridicas — nada novo no banco). */
export async function registrarEnvioAdvogado(empresaId: string, templates: ContratoTemplate[], destinatario: string) {
  for (const t of templates) {
    const { error } = await supabase.from('contrato_revisoes_juridicas').insert({
      empresa_id: empresaId,
      template_id: t.id,
      versao_template: t.versao_template,
      responsavel_nome: destinatario,
      status: 'pendente',
      observacoes: `Enviado ao advogado no pacote jurídico de ${new Date().toLocaleDateString('pt-BR')}.`,
    });
    if (error) throw error;
  }
}

// ============================ STATUS COMPOSTO (8 estados — Fase 20/21) ============================
export type StatusBiblioteca =
  | 'rascunho'
  | 'em_revisao'
  | 'enviado_advogado'
  | 'retorno_recebido'
  | 'em_ajuste'
  | 'aprovado_juridicamente'
  | 'publicado'
  | 'arquivado';

export const STATUS_BIBLIOTECA_LABEL: Record<StatusBiblioteca, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  enviado_advogado: 'Enviado ao advogado',
  retorno_recebido: 'Retorno recebido',
  em_ajuste: 'Em ajuste',
  aprovado_juridicamente: 'Aprovado juridicamente',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
};

/**
 * Deriva o estado da biblioteca SEM mudar o enum do banco (rascunho/publicado/arquivado):
 * o refinamento vem das revisões jurídicas da VERSÃO ATUAL e da origem da última fotografia.
 * Puro e testado (audit fase 5).
 */
export function statusBiblioteca(
  template: Pick<ContratoTemplate, 'status' | 'versao_template'>,
  revisoesDoTemplate: ContratoRevisaoJuridica[],
  ultimaOrigemHistorico: TemplateVersaoHistorico['origem'] | null,
): StatusBiblioteca {
  if (template.status === 'arquivado') return 'arquivado';
  if (template.status === 'publicado') return 'publicado';
  const daVersao = revisoesDoTemplate.filter((r) => r.versao_template === template.versao_template);
  if (templateAprovadoJuridicamente(daVersao, template.versao_template)) return 'aprovado_juridicamente';
  if (ultimaOrigemHistorico === 'retorno_advogado') return 'retorno_recebido';
  if (ultimaOrigemHistorico === 'ajuste_interno') return 'em_ajuste';
  const maisRecente = daVersao[0]; // listas vêm ordenadas desc
  if (maisRecente?.status === 'reprovado') return 'em_ajuste';
  if (maisRecente?.status === 'em_analise') return 'em_revisao';
  if (maisRecente?.status === 'pendente') return 'enviado_advogado';
  return 'rascunho';
}

/** OFICIAL = publicado + aprovado juridicamente na versão atual (Fase 21). Antes disso, MINUTA. */
export function ehVersaoOficial(
  template: Pick<ContratoTemplate, 'status' | 'versao_template'>,
  revisoesDoTemplate: ContratoRevisaoJuridica[],
): boolean {
  return (
    template.status === 'publicado' &&
    templateAprovadoJuridicamente(
      revisoesDoTemplate.filter((r) => r.versao_template === template.versao_template),
      template.versao_template,
    )
  );
}
