import { supabase } from '@/shared/lib/supabase';
import type { Interacao, InteracaoCanal } from '../types';

// Não existe listInteracoes aqui de propósito — a UI só lê interações via a timeline genérica
// (TimelinePanel), que já mostra o evento espelhado (trigger fn_timeline_interacao, migration
// 0027). Criar aqui é o único caminho de escrita.
export async function createInteracao(params: {
  empresaId: string;
  entidadeTipo: string;
  entidadeId: string;
  ocorridaEm: string;
  canal: InteracaoCanal;
  conteudo: string;
  usuarioId: string;
}) {
  const { empresaId, entidadeTipo, entidadeId, ocorridaEm, canal, conteudo, usuarioId } = params;
  const { data, error } = await supabase
    .from('interacoes')
    .insert({
      empresa_id: empresaId,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      ocorrida_em: ocorridaEm,
      canal,
      conteudo,
      usuario_id: usuarioId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Interacao;
}
