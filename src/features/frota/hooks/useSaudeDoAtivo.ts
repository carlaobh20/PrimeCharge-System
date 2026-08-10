import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { useManutencoesPorVeiculo } from '@/features/operacoes/hooks/useManutencoes';
import { useMultasPorVeiculo } from '@/features/operacoes/hooks/useMultas';
import { diasDesde } from '@/shared/lib/format';
import { calcularSaudeDoAtivo, type SaudeDoAtivoResult } from '../intelligence/saudeDoAtivo';
import type { VeiculoComRelacoes } from '../types';

export type UseSaudeDoAtivoResult = { isLoading: true } | { isLoading: false; saude: SaudeDoAtivoResult };

// Épico 4 — "Ativo Financeiro", Parte 5. Ponte dado→cálculo, mesmo papel de
// useVehicleIntelligence — as queries aqui usam os MESMOS hooks (mesma queryKey) já chamados
// por outras abas do Cockpit (FinanceiroTab usa useLancamentos({veiculoId}); Arquivos usa
// useArquivos), então React Query dedupe entre elas — nenhuma consulta nova de verdade além de
// manutenções/multas, que nenhuma outra parte do Cockpit ainda buscava por veículo.
export function useSaudeDoAtivo(veiculo: VeiculoComRelacoes | undefined): UseSaudeDoAtivoResult {
  const veiculoId = veiculo?.id ?? '';

  const { data: documentos, isLoading: loadingDocumentos } = useArquivos('veiculo', veiculoId, 'documento');
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentos({ veiculoId });
  const { data: manutencoes, isLoading: loadingManutencoes } = useManutencoesPorVeiculo(veiculoId);
  const { data: multas, isLoading: loadingMultas } = useMultasPorVeiculo(veiculoId);

  const isLoading = !veiculo || loadingDocumentos || loadingLancamentos || loadingManutencoes || loadingMultas;
  if (isLoading) return { isLoading: true };

  const receitaConfirmada = (lancamentos ?? [])
    .filter((l) => l.tipo === 'receita' && l.status === 'confirmada')
    .reduce((soma, l) => soma + l.valor, 0);
  const despesaConfirmada = (lancamentos ?? [])
    .filter((l) => l.tipo === 'despesa' && l.status === 'confirmada')
    .reduce((soma, l) => soma + l.valor, 0);

  const saude = calcularSaudeDoAtivo({
    veiculo,
    totalDocumentos: documentos?.length ?? 0,
    receitaConfirmada,
    despesaConfirmada,
    // diasDesde só retorna null pra data ausente/inválida — data_compra ?? criado_em nunca é
    // nulo (criado_em é NOT NULL), então na prática este ?? 0 nunca dispara; existe só pra
    // satisfazer o tipo sem inventar um valor que a função já garante não acontecer.
    diasNaFrota: diasDesde(veiculo.data_compra ?? veiculo.criado_em) ?? 0,
    manutencoes: manutencoes ?? [],
    multas: multas ?? [],
  });

  return { isLoading: false, saude };
}
