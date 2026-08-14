import { supabase } from '@/shared/lib/supabase';
import type { FunilEtapa, FunilEtapaGrupo } from '../types';

// Épico 6 — CRM, Fase 1.1 (migration 0026). Fonte de verdade das colunas do Kanban — substitui
// o enum fixo motorista_etapa_funil. Só etapas ativas entram na tela por padrão; arquivadas
// (soft-delete) ficam de fora, mas continuam existindo pra não quebrar motoristas antigos que
// ainda apontem pra elas (funilMetrics.agruparPorEtapa trata isso caindo em "não classificado").
export async function listFunilEtapas(empresaId: string) {
  const { data, error } = await supabase
    .from('funil_etapas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativa', true)
    .order('ordem', { ascending: true });
  if (error) throw error;
  return data as FunilEtapa[];
}

export async function createFunilEtapa(empresaId: string, nome: string, grupo: FunilEtapaGrupo, ordem: number) {
  const { data, error } = await supabase
    .from('funil_etapas')
    .insert({ empresa_id: empresaId, nome, grupo, ordem })
    .select()
    .single();
  if (error) throw error;
  return data as FunilEtapa;
}

// Soft-delete (DEC-022) — nunca DELETE físico de etapa (perderia a referência de qualquer
// motorista histórico que já tenha passado por ela). O bloqueio "não deixa arquivar com
// motorista dentro" é responsabilidade de quem chama isto (GerenciarFunilDialog), não desta
// função — mantém a API burra e a regra de negócio visível na tela, não escondida aqui.
export async function arquivarFunilEtapa(id: string) {
  const { data, error } = await supabase.from('funil_etapas').update({ ativa: false }).eq('id', id).select().single();
  if (error) throw error;
  return data as FunilEtapa;
}
