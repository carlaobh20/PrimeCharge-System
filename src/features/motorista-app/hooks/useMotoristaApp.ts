import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMinhasCobrancas, listMeusPagamentos } from '../api/pagamentos';
import { listCatalogo, listMeusPedidos, listItensDosMeusPedidos } from '../api/lojinha';
import { listMeusDocumentos } from '../api/documentos';
import { listMinhasVistorias } from '../api/vistorias';
import { listMeusChamados, abrirChamado, cancelarChamado, type NovoChamado } from '../api/chamados';
import { listMinhasNotificacoes, marcarNotificacaoLida, marcarTodasLidas } from '../api/notificacoes';

// Hooks do portal do motorista. Chave de cache sempre prefixada 'motorista-app' pra isolar do
// admin. staleTime herdado do QueryClient (30s). Nenhuma lógica de negócio aqui — só ligação
// query ↔ api; derivações (status de cobrança) ficam nos motores em lib/.

const K = (...parts: string[]) => ['motorista-app', ...parts];

export function useMinhasCobrancas() {
  return useQuery({ queryKey: K('cobrancas'), queryFn: listMinhasCobrancas });
}
export function useMeusPagamentos() {
  return useQuery({ queryKey: K('pagamentos'), queryFn: listMeusPagamentos });
}
export function useCatalogo() {
  return useQuery({ queryKey: K('catalogo'), queryFn: listCatalogo });
}
export function useMeusPedidos() {
  return useQuery({ queryKey: K('pedidos'), queryFn: listMeusPedidos });
}
export function useItensDosMeusPedidos() {
  return useQuery({ queryKey: K('pedido-itens'), queryFn: listItensDosMeusPedidos });
}
export function useMeusDocumentos() {
  return useQuery({ queryKey: K('documentos'), queryFn: listMeusDocumentos });
}
export function useMinhasVistorias() {
  return useQuery({ queryKey: K('vistorias'), queryFn: listMinhasVistorias });
}
export function useMeusChamados() {
  return useQuery({ queryKey: K('chamados'), queryFn: listMeusChamados });
}

export function useAbrirChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: NovoChamado) => abrirChamado(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('chamados') }),
  });
}
export function useCancelarChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarChamado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('chamados') }),
  });
}

export function useMinhasNotificacoes() {
  return useQuery({ queryKey: K('notificacoes'), queryFn: listMinhasNotificacoes });
}
export function useMarcarNotificacaoLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarNotificacaoLida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('notificacoes') }),
  });
}
export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marcarTodasLidas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('notificacoes') }),
  });
}
