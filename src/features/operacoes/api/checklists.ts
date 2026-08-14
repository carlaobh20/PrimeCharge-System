import { supabase } from '@/shared/lib/supabase';
import { VISTORIA_ITENS_PADRAO } from '../components/vistoriaItensPadrao';
import type { Checklist, ChecklistComItens, ChecklistItem, ChecklistStatus, ChecklistTipo } from '../types';

// Sem camada de template nesta sprint (DEC-059) — cada checklist recebe seus itens direto na
// criação. `template_id` nullable é a extensão aditiva prevista quando a Sprint 10 confirmar
// o formato real de reuso.
export type ChecklistInput = {
  titulo: string;
  entidade_tipo: string;
  entidade_id: string;
  responsavel_id?: string | null;
  itens: { descricao: string; obrigatorio?: boolean }[];
};

export async function listChecklistsPorEntidade(entidadeTipo: string, entidadeId: string) {
  const { data, error } = await supabase
    .from('checklists')
    .select('*, itens:checklist_itens(*)')
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as ChecklistComItens[];
}

// Variante em lote — mesmo padrão de listContratosPorEmpresa/listMultasPorEmpresa, usada
// pelo gerador de Ações Operacionais "checklist aberto há muito tempo" (Missão 4, Fase 3)
// sem N+1. Só os campos da tabela `checklists`, sem itens (o gerador não precisa deles).
export async function listChecklistsPorEmpresa() {
  const { data, error } = await supabase.from('checklists').select('*').eq('status', 'aberto');
  if (error) throw error;
  return data as Checklist[];
}

export async function getChecklist(id: string) {
  const { data, error } = await supabase.from('checklists').select('*, itens:checklist_itens(*)').eq('id', id).single();
  if (error) throw error;
  return data as unknown as ChecklistComItens;
}

export async function createChecklist(empresaId: string, payload: ChecklistInput) {
  const { itens, ...checklistPayload } = payload;
  const { data: checklist, error } = await supabase
    .from('checklists')
    .insert({ ...checklistPayload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;

  if (itens.length > 0) {
    const { error: erroItens } = await supabase.from('checklist_itens').insert(
      itens.map((item, index) => ({
        checklist_id: checklist.id,
        ordem: index,
        descricao: item.descricao,
        obrigatorio: item.obrigatorio ?? true,
      }))
    );
    if (erroItens) throw erroItens;
  }

  return checklist as Checklist;
}

// Validação de transição/permissão no banco (fn_validar_transicao_checklist, migration 0007).
export async function updateChecklistStatus(id: string, status: ChecklistStatus) {
  const { data, error } = await supabase.from('checklists').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Checklist;
}

export async function responderChecklistItem(
  itemId: string,
  payload: { resposta: boolean | null; observacao?: string | null; aplicavel?: boolean }
) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('checklist_itens')
    .update({
      resposta: payload.resposta,
      observacao: payload.observacao ?? null,
      aplicavel: payload.aplicavel ?? true,
      respondido_por: authData.user?.id ?? null,
      respondido_em: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data as ChecklistItem;
}

// ============================================================
// Épico 8 — Vistoria real de entrega/devolução. Reaproveita checklists/checklist_itens
// (createChecklist/responderChecklistItem acima) — as funções abaixo só existem porque
// vistoria tem campos e um fluxo de conclusão que o checklist genérico não tinha até agora,
// não porque é uma capability diferente.
// ============================================================

export type VistoriaInput = {
  tipo: Extract<ChecklistTipo, 'entrega' | 'devolucao'>;
  veiculoId: string;
  contratoId: string;
  motoristaId: string;
  titulo: string;
  checklistAnteriorId?: string | null;
};

// Itens sempre nascem do checklist mínimo padrão (ETAPA 9) — editável depois (marcar "não se
// aplica", adicionar observação/foto), mas a lista de partida é sempre a mesma pros dois tipos,
// de propósito: é isso que permite comparar item a item na devolução (mesma `descricao`).
export async function createVistoria(empresaId: string, input: VistoriaInput) {
  const { data: checklist, error } = await supabase
    .from('checklists')
    .insert({
      empresa_id: empresaId,
      titulo: input.titulo,
      entidade_tipo: 'veiculo',
      entidade_id: input.veiculoId,
      contrato_id: input.contratoId,
      motorista_id: input.motoristaId,
      tipo: input.tipo,
      checklist_anterior_id: input.checklistAnteriorId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: erroItens } = await supabase.from('checklist_itens').insert(
    VISTORIA_ITENS_PADRAO.map((item, index) => ({
      checklist_id: checklist.id,
      ordem: index,
      descricao: item.descricao,
      obrigatorio: true,
    }))
  );
  if (erroItens) throw erroItens;

  return checklist as Checklist;
}

export async function updateVistoriaCampos(
  id: string,
  payload: Partial<{
    odometro_km: number | null;
    carga_pct: number | null;
    observacoes: string | null;
    destino_veiculo: 'disponivel' | 'manutencao' | null;
    houve_sinistro: boolean;
  }>
) {
  const { data, error } = await supabase.from('checklists').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Checklist;
}

// Upload de foto por item — mesmo bucket `checklists-fotos` já criado na migration 0022, mesmo
// padrão de path empresa/entidade da capability `arquivos` genérica (shared/capabilities/api/
// arquivos.ts), mas grava direto em checklist_itens.foto_url (não na tabela `arquivos` — foto
// de item é parte do checklist, não um documento solto).
export async function uploadFotoItem(params: { itemId: string; checklistId: string; empresaId: string; file: File }) {
  const { itemId, checklistId, empresaId, file } = params;
  const path = `${empresaId}/${checklistId}/itens/${itemId}-${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from('checklists-fotos').upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('checklist_itens')
    .update({ foto_url: `checklists-fotos/${path}` })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data as ChecklistItem;
}

export async function removeFotoItem(itemId: string, fotoUrl: string) {
  const [bucket, ...rest] = fotoUrl.split('/');
  const path = rest.join('/');
  const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
  if (storageError) throw storageError;

  const { data, error } = await supabase.from('checklist_itens').update({ foto_url: null }).eq('id', itemId).select().single();
  if (error) throw error;
  return data as ChecklistItem;
}

// Assinatura — capturada em canvas no navegador (ver SignaturePad), exportada como PNG e
// enviada pro mesmo bucket. `assinatura_url` existe desde a migration 0010, nunca teve
// consumidor real até agora.
export async function uploadAssinaturaVistoria(params: { checklistId: string; empresaId: string; blob: Blob }) {
  const { checklistId, empresaId, blob } = params;
  const path = `${empresaId}/${checklistId}/assinatura-${crypto.randomUUID()}.png`;

  const { error: uploadError } = await supabase.storage.from('checklists-fotos').upload(path, blob, { contentType: 'image/png' });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('checklists')
    .update({ assinatura_url: `checklists-fotos/${path}` })
    .eq('id', checklistId)
    .select()
    .single();
  if (error) throw error;
  return data as Checklist;
}

export async function getUrlAssinada(caminhoStorage: string) {
  const [bucket, ...rest] = caminhoStorage.split('/');
  const path = rest.join('/');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// Conclusão real da vistoria — um único UPDATE. Toda a validação (odômetro/carga/assinatura/
// confirmação/itens obrigatórios respondidos/foto em avaria/destino do veículo) e a propagação
// pro contrato e pro veículo acontecem no banco (fn_validar_transicao_checklist +
// fn_propagar_status_vistoria, migration 0030) — o client só manda a intenção, igual ao padrão
// já usado em ativarContrato/encerrarContrato.
export async function concluirVistoria(
  id: string,
  payload: {
    confirmacaoMotorista: boolean;
    destinoVeiculo?: 'disponivel' | 'manutencao' | null;
    houveSinistro?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('checklists')
    .update({
      confirmacao_motorista: payload.confirmacaoMotorista,
      destino_veiculo: payload.destinoVeiculo ?? null,
      houve_sinistro: payload.houveSinistro ?? false,
      status: 'concluido',
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Checklist;
}

// Comparação entrega↔devolução (ETAPA 5) — usa `checklist_anterior_id`, setado na criação da
// vistoria de devolução (ver createVistoria/ContratoDetailPage), não uma busca por
// contrato_id+tipo (que seria ambígua em contratos com mais de um ciclo entrega/devolução).
export async function getVistoriaComComparacao(id: string) {
  const atual = await getChecklist(id);
  if (!atual.checklist_anterior_id) return { atual, anterior: null };
  const anterior = await getChecklist(atual.checklist_anterior_id);
  return { atual, anterior };
}
