import { useQuery } from '@tanstack/react-query';
import { listMeusContratos, type MeuContrato } from '../api/meuContrato';

export type MeuContratoResult =
  | { isLoading: true }
  | { isLoading: false; isError: true }
  | { isLoading: false; isError: false; contratoAtivo: MeuContrato | null; historico: MeuContrato[] };

// "Contrato ativo" = o de status 'ativo' mais recente, se houver; senão, o mais recente entre
// todos (rascunho/em_analise/etc — ainda vale mostrar "seu processo está em andamento" em vez
// de tela vazia). `historico` = todos os outros, mais antigos, pra fases futuras (não usado
// ainda na Fase 1 — a tela só mostra o contratoAtivo).
export function useMeuContrato(): MeuContratoResult {
  const query = useQuery({ queryKey: ['motorista-app', 'meus-contratos'], queryFn: listMeusContratos });

  if (query.isLoading) return { isLoading: true };
  if (query.isError || !query.data) return { isLoading: false, isError: true };

  const contratos = query.data;
  const contratoAtivo = contratos.find((c) => c.status === 'ativo') ?? contratos[0] ?? null;
  const historico = contratos.filter((c) => c.id !== contratoAtivo?.id);

  return { isLoading: false, isError: false, contratoAtivo, historico };
}
