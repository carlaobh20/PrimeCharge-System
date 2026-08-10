import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useContasBancarias } from '@/features/financeiro/hooks/useContasBancarias';
import { usePagamentosPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { calcularSaldoPorConta } from '@/features/financeiro/intelligence/resumoFinanceiro';
import { calcularResumoFinanciamentoReal } from '@/features/frota/intelligence/financiamentoReal';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';

export type PatrimonioEmpresaResult =
  | { isLoading: true }
  | {
      isLoading: false;
      caixa: number;
      valorVeiculos: number;
      outrosAtivos: number;
      saldoDevedorTotal: number;
      patrimonioLiquido: number;
    };

// Épico 4 — "Ativo Financeiro", Parte 10. "Patrimônio da Empresa" = Caixa + Veículos + Outros
// ativos − Saldo devedor. Cada termo reaproveita cálculo que já existe em outro lugar:
// - Caixa: calcularSaldoPorConta (financeiro/, já usado em ContasBancariasPage) somado entre
//   todas as contas — não uma coluna nova, mesmo princípio de "saldo é sempre derivado".
// - Veículos: resolverValorAtualVeiculo somado pela frota (mesmo cálculo do Parte 8, mas aqui
//   é uma query própria em vez de reusar useEmpresaHealth — este hook tem uma dependência que
//   useEmpresaHealth não tem, calcularResumoFinanciamentoReal por veículo, então vive separado
//   pra não inchar o hook do placar geral com uma varredura O(n) que só o Patrimônio precisa).
// - Outros ativos: 0 — mesmo motivo do Parte 8, nenhum modelo de dado pra Wallbox/Loja/etc. ainda.
// - Saldo devedor: soma de calcularResumoFinanciamentoReal(veiculo).saldoDevedorAtual por
//   veículo financiado (Parte 1/2), 0 pros que não têm financiamento.
//
// "Com evolução mensal" (pedido na missão) NÃO está implementado aqui — não existe nenhuma
// série histórica persistida no sistema (dashboard/pages/DashboardPage.tsx já documenta essa
// mesma limitação, DEC-024/DEC-110: "Fase 6/Data Platform, propositalmente adiado"). Construir
// uma curva de patrimônio mês a mês exigiria um snapshot mensal persistido (cron/job que grava
// o patrimônio do mês em uma tabela nova) — isso é maior que "adicionar um card" e foi
// deliberadamente deixado de fora desta missão em vez de fabricar uma curva sem dado real por
// trás. Fica registrado aqui como pendência explícita, não esquecimento.
export function usePatrimonioEmpresa(): PatrimonioEmpresaResult {
  const { data: veiculos, isLoading: loadingVeiculos } = useVeiculos();
  const { data: contas, isLoading: loadingContas } = useContasBancarias();
  const { data: pagamentos, isLoading: loadingPagamentos } = usePagamentosPorEmpresa();

  const isLoading = loadingVeiculos || loadingContas || loadingPagamentos;
  if (isLoading) return { isLoading: true };

  const pagamentosPagos = (pagamentos ?? [])
    .filter((p) => p.status === 'pago' && p.lancamento?.tipo)
    .map((p) => ({ conta_bancaria_id: p.conta_bancaria_id, valor: p.valor, tipo: p.lancamento!.tipo as 'receita' | 'despesa' }));

  const saldosPorConta = calcularSaldoPorConta(contas ?? [], pagamentosPagos);
  const caixa = Object.values(saldosPorConta).reduce((soma, s) => soma + s, 0);

  const veiculosAtivos = (veiculos ?? []).filter((v) => v.status !== 'encerrado');
  const valorVeiculos = veiculosAtivos.reduce((soma, v) => soma + (resolverValorAtualVeiculo(v) ?? 0), 0);
  const saldoDevedorTotal = veiculosAtivos.reduce(
    (soma, v) => soma + (calcularResumoFinanciamentoReal(v)?.saldoDevedorAtual ?? 0),
    0
  );

  const outrosAtivos = 0;
  const patrimonioLiquido = caixa + valorVeiculos + outrosAtivos - saldoDevedorTotal;

  return { isLoading: false, caixa, valorVeiculos, outrosAtivos, saldoDevedorTotal, patrimonioLiquido };
}
