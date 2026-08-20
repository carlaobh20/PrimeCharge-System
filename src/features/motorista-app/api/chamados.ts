import { supabase } from '@/shared/lib/supabase';

// Chamados / ocorrências do motorista — canal de suporte (tabela `chamados`, migration 0040).
// O motorista abre e vê os próprios; o staff analisa/resolve pelo sistema administrativo. O
// motorista NUNCA resolve o próprio chamado (state machine no banco).

export type ChamadoCategoria =
  | 'financeiro' | 'veiculo' | 'pagamento' | 'lojinha' | 'vistoria' | 'documento' | 'manutencao' | 'ocorrencia' | 'outro';
export type ChamadoStatus = 'aberto' | 'em_analise' | 'aguardando_motorista' | 'resolvido' | 'cancelado';

export const CHAMADO_CATEGORIA_LABEL: Record<ChamadoCategoria, string> = {
  financeiro: 'Financeiro',
  veiculo: 'Veículo',
  pagamento: 'Pagamento',
  lojinha: 'Lojinha',
  vistoria: 'Vistoria',
  documento: 'Documento',
  manutencao: 'Manutenção',
  ocorrencia: 'Ocorrência',
  outro: 'Outro',
};

export const CHAMADO_STATUS_LABEL: Record<ChamadoStatus, string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  aguardando_motorista: 'Aguardando você',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
};

export type MeuChamado = {
  id: string;
  categoria: ChamadoCategoria;
  assunto: string;
  descricao: string;
  status: ChamadoStatus;
  contrato_id: string | null;
  veiculo_id: string | null;
  criado_em: string;
  resolvido_em: string | null;
};

export async function listMeusChamados(): Promise<MeuChamado[]> {
  const { data, error } = await supabase
    .from('chamados')
    .select('id, categoria, assunto, descricao, status, contrato_id, veiculo_id, criado_em, resolvido_em')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MeuChamado[];
}

export type NovoChamado = {
  categoria: ChamadoCategoria;
  assunto: string;
  descricao: string;
  contratoId: string | null;
  veiculoId: string | null;
};

// Abre um chamado próprio. empresa_id/motorista_id/aberto_por são preenchidos pela RLS+defaults
// no banco — o insert precisa mandar motorista_id/empresa_id/aberto_por explícitos porque a
// policy de INSERT os valida. Buscamos o vínculo do usuário logado uma vez.
export async function abrirChamado(dados: NovoChamado): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Sessão expirada.');

  const { data: usuario, error: erroUsuario } = await supabase
    .from('usuarios')
    .select('empresa_id, motorista_id')
    .eq('id', uid)
    .single();
  if (erroUsuario) throw erroUsuario;

  const { data, error } = await supabase
    .from('chamados')
    .insert({
      empresa_id: usuario.empresa_id,
      motorista_id: usuario.motorista_id,
      aberto_por: uid,
      categoria: dados.categoria,
      assunto: dados.assunto,
      descricao: dados.descricao,
      contrato_id: dados.contratoId,
      veiculo_id: dados.veiculoId,
      status: 'aberto',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function cancelarChamado(chamadoId: string): Promise<void> {
  const { error } = await supabase.from('chamados').update({ status: 'cancelado' }).eq('id', chamadoId);
  if (error) throw error;
}
