import { supabase } from '@/shared/lib/supabase';
import type { Checklist, ChecklistComItens, ChecklistItem, ChecklistStatus } from '../types';

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
  payload: { resposta: boolean; observacao?: string | null }
) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('checklist_itens')
    .update({
      resposta: payload.resposta,
      observacao: payload.observacao ?? null,
      respondido_por: authData.user?.id ?? null,
      respondido_em: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data as ChecklistItem;
}
