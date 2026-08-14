import { supabase } from '@/shared/lib/supabase';

// Vistoria iniciada pelo motorista (migration 0041). O motorista CRIA, preenche os itens, tira
// fotos e ENVIA pra análise. NÃO conclui — concluir ativa/encerra o contrato, e isso é do staff.
// A vistoria fica 'aberto' com enviada_motorista_em preenchido; o staff a vê na fila e conclui.

// Itens padrão de uma vistoria de carro (mesma espinha da vistoriaItensPadrao do admin, mas o
// motorista monta a própria — o schema é o mesmo checklist_itens).
export const ITENS_VISTORIA_PADRAO = [
  'Frente', 'Traseira', 'Lateral esquerda', 'Lateral direita', 'Teto',
  'Pneus', 'Rodas', 'Vidros', 'Faróis e lanternas', 'Interior',
  'Painel', 'Bancos', 'Carregador e cabos', 'Documentação',
] as const;

export type RespostaItem = 'ok' | 'avaria' | 'nao_aplica';

export type ItemVistoriaLocal = {
  descricao: string;
  resposta: RespostaItem | null;
  observacao: string;
  fotoStoragePath: string | null; // preenchido após upload
};

// Cria a vistoria (aberto) do próprio contrato/veículo e insere os itens escolhidos.
// Retorna o id do checklist e os ids dos itens (pra vincular fotos depois).
export async function iniciarVistoria(
  tipo: 'entrega' | 'devolucao',
  contratoId: string,
  veiculoId: string,
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', auth.user?.id ?? '').single();
  const { data, error } = await supabase
    .from('checklists')
    .insert({
      empresa_id: u?.empresa_id,
      titulo: `Vistoria de ${tipo === 'entrega' ? 'entrega' : 'devolução'} (app)`,
      tipo,
      entidade_tipo: 'veiculo',
      entidade_id: veiculoId,
      contrato_id: contratoId,
      status: 'aberto',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function adicionarItens(checklistId: string, descricoes: readonly string[]): Promise<{ id: string; descricao: string }[]> {
  const linhas = descricoes.map((d, i) => ({ checklist_id: checklistId, descricao: d, ordem: i, obrigatorio: false }));
  const { data, error } = await supabase.from('checklist_itens').insert(linhas).select('id, descricao');
  if (error) throw error;
  return (data ?? []) as { id: string; descricao: string }[];
}

const RESP_TO_DB: Record<RespostaItem, { resposta: boolean | null; aplicavel: boolean }> = {
  ok: { resposta: true, aplicavel: true },
  avaria: { resposta: false, aplicavel: true },
  nao_aplica: { resposta: null, aplicavel: false },
};

export async function responderItem(
  itemId: string,
  resposta: RespostaItem,
  observacao: string,
  fotoStoragePath: string | null,
): Promise<void> {
  const { resposta: r, aplicavel } = RESP_TO_DB[resposta];
  const { error } = await supabase
    .from('checklist_itens')
    .update({ resposta: r, aplicavel, observacao: observacao || null, foto_url: fotoStoragePath })
    .eq('id', itemId);
  if (error) throw error;
}

// Envia a vistoria pra análise: grava odômetro/carga/observações/confirmação e marca
// enviada_motorista_em. Status continua 'aberto' (não conclui, não propaga contrato).
export async function enviarVistoria(
  checklistId: string,
  dados: { odometroKm: number | null; cargaPct: number | null; observacoes: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('checklists')
    .update({
      odometro_km: dados.odometroKm,
      carga_pct: dados.cargaPct,
      observacoes: dados.observacoes,
      confirmacao_motorista: true,
      enviada_motorista_em: new Date().toISOString(),
    })
    .eq('id', checklistId);
  if (error) throw error;
}
