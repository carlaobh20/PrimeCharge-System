import { supabase } from '@/shared/lib/supabase';

// Central de Atendimento ao Motorista (staff, Fase 4). NÃO cria backend novo — consome as
// filas que já existem via RLS de staff (eh_staff): vistorias enviadas pelo motorista,
// documentos aguardando revisão, chamados abertos. Fecha o "outro lado" do produto: o que o
// motorista envia pelo app aparece aqui pro staff agir. Nenhuma migration necessária — todas as
// policies (staff select/update em checklists/arquivos/chamados) já vêm de 0007/0036/0040/0041.

// ---- Fila: vistorias enviadas pelo motorista, aguardando análise ----
// checklists status='aberto' com enviada_motorista_em preenchido = motorista enviou, staff não
// concluiu ainda. A conclusão em si continua no cockpit do contrato (fluxo existente), que é o
// único lugar que ativa/encerra contrato — aqui é triagem/visibilidade.
export type VistoriaFila = {
  id: string;
  titulo: string;
  tipo: string | null;
  contrato_id: string | null;
  enviada_motorista_em: string | null;
  criado_em: string;
  motorista: { nome_completo: string } | null;
  veiculo: { placa: string } | null;
};

export async function listVistoriasAguardando(): Promise<VistoriaFila[]> {
  const { data, error } = await supabase
    .from('checklists')
    .select('id, titulo, tipo, contrato_id, enviada_motorista_em, criado_em, motorista:motoristas(nome_completo), veiculo:veiculos(placa)')
    .eq('status', 'aberto')
    .not('enviada_motorista_em', 'is', null)
    .order('enviada_motorista_em', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as VistoriaFila[];
}

// ---- Fila: documentos aguardando revisão ----
export type DocumentoStatusRevisao = 'aguardando' | 'em_analise' | 'aprovado' | 'rejeitado';

export type DocumentoFila = {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  categoria: string | null;
  nome_arquivo: string;
  caminho_storage: string;
  status_revisao: DocumentoStatusRevisao | null;
  criado_em: string;
};

export async function listDocumentosAguardando(): Promise<DocumentoFila[]> {
  const { data, error } = await supabase
    .from('arquivos')
    .select('id, entidade_tipo, entidade_id, categoria, nome_arquivo, caminho_storage, status_revisao, criado_em')
    .eq('entidade_tipo', 'motorista')
    .in('status_revisao', ['aguardando', 'em_analise'])
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DocumentoFila[];
}

// Revisar documento: staff aprova/rejeita. O trigger 0041 (fn_notif_documento) notifica o
// motorista automaticamente. revisado_por/revisado_em preenchidos pra auditoria.
export async function revisarDocumento(
  arquivoId: string,
  status: 'aprovado' | 'rejeitado',
  motivo: string | null,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('arquivos')
    .update({
      status_revisao: status,
      motivo_rejeicao: status === 'rejeitado' ? motivo : null,
      revisado_por: auth.user?.id ?? null,
      revisado_em: new Date().toISOString(),
    })
    .eq('id', arquivoId);
  if (error) throw error;
}

// ---- Fila: chamados abertos ----
export type ChamadoStatus = 'aberto' | 'em_analise' | 'aguardando_motorista' | 'resolvido' | 'cancelado';

export type ChamadoFila = {
  id: string;
  categoria: string;
  assunto: string;
  descricao: string;
  status: ChamadoStatus;
  prioridade: string;
  contrato_id: string | null;
  veiculo_id: string | null;
  criado_em: string;
  motorista: { nome_completo: string } | null;
  veiculo: { placa: string } | null;
};

export async function listChamadosAbertos(): Promise<ChamadoFila[]> {
  const { data, error } = await supabase
    .from('chamados')
    .select('id, categoria, assunto, descricao, status, prioridade, contrato_id, veiculo_id, criado_em, motorista:motoristas(nome_completo), veiculo:veiculos(placa)')
    .in('status', ['aberto', 'em_analise', 'aguardando_motorista'])
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ChamadoFila[];
}

// Muda o status do chamado (state machine validada no banco). Notifica o motorista via trigger.
export async function mudarStatusChamado(chamadoId: string, status: ChamadoStatus): Promise<void> {
  const { error } = await supabase.from('chamados').update({ status }).eq('id', chamadoId);
  if (error) throw error;
}

// Anexos de um chamado (staff): arquivos entidade_tipo='chamado'. Retorna signed URL pra abrir.
export type AnexoChamado = { id: string; nome_arquivo: string; caminho_storage: string; criado_em: string };

export async function listAnexosDoChamado(chamadoId: string): Promise<AnexoChamado[]> {
  const { data, error } = await supabase
    .from('arquivos')
    .select('id, nome_arquivo, caminho_storage, criado_em')
    .eq('entidade_tipo', 'chamado')
    .eq('entidade_id', chamadoId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnexoChamado[];
}

export async function assinarUrlArquivo(caminhoStorage: string): Promise<string | null> {
  const barra = caminhoStorage.indexOf('/');
  if (barra < 0) return null;
  const bucket = caminhoStorage.slice(0, barra);
  const path = caminhoStorage.slice(barra + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
