import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import { diasDesde, formatMoeda } from '@/shared/lib/format';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { calcularResumoFinanceiro, calcularRoi } from '@/features/financeiro/intelligence';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import {
  calcularCapitalRecuperado,
  calcularCustoPorKm,
  calcularLucroPorDia,
  calcularLucroPorKm,
  calcularPaybackMeses,
  calcularRoa,
} from '../../intelligence/investmentSimulator';
import { calcularResumoFinanciamentoReal } from '../../intelligence/financiamentoReal';
import { calcularResultadoEsperado } from '../../intelligence/resultadoEsperado';
import { YieldAtivoCard } from '../YieldAtivoCard';
import { CicloDeVidaTimeline } from '../CicloDeVidaTimeline';
import { CapitalRecuperadoCard } from '../CapitalRecuperadoCard';
import { ResultadoEsperadoCard } from '../ResultadoEsperadoCard';
import { ExtratoFinanceiroVeiculo } from '../ExtratoFinanceiroVeiculo';
import type { Veiculo } from '../../types';

// Antes desta correção (auditoria da Missão 2, 2026-08-06), esta aba era um EmptyState estático
// dizendo "aguardando o módulo Financeiro/Contratos" — desatualizado desde a Sprint 8, quando
// `lancamentos.veiculo_id` já existia e nunca tinha sido conectado aqui. Mesma classe de dívida
// que DEC-070 fechou para o Health Score Comercial.
//
// Simulador de Investimento (Missão 3, Parte 9): conecta `calcularRoi`/`calcularResumoFinanceiro`
// (financeiro/intelligence/, existentes desde a Sprint 8, sem nenhum consumidor até esta
// missão) pela primeira vez, mais custo-por-KM e payback estimado (novos, investmentSimulator.ts).
//
// Yield do Ativo + Capital Recuperado + Ciclo de Vida (Épico 4, Partes 3, 4 e 6): entram nesta
// mesma aba em vez de uma aba nova — a missão pede pra reaproveitar estrutura existente, e esta
// já é "a aba financeira do veículo". Por isso o `return` antecipado do EmptyState (linha ~90)
// foi movido pra só esconder a lista de Lançamentos, não a aba inteira: nenhum dos três depende
// de lançamento existir — Capital Recuperado usa o mesmo `resumo.lucroConfirmado` que já
// alimentava ROI/Payback (fica em 0%/— sem lançamento nenhum, não trava a tela).
// A partir da Parte 7 (Resultado Esperado) esta aba passou a precisar de campos de
// financiamento também (valor_financiado/taxa/prazo/sistema/primeiro vencimento) — em vez de ir
// alargando o Pick a cada Parte nova, aceita o Veiculo inteiro (VeiculoDetailPage já passa o
// objeto completo, então não é um Pick nunca de fato mais estreito que isso na prática).
export function FinanceiroTab({ veiculo }: { veiculo: Veiculo }) {
  const veiculoId = veiculo.id;
  const { data: lancamentos, isLoading } = useLancamentos({ veiculoId });
  // Achado da Fase 9 (auditoria geral): buscava a empresa inteira de contratos só para
  // filtrar por veiculo_id em memória logo abaixo — exatamente o anti-padrão que a Fase 1
  // (DEC-108) corrigiu nos 3 hooks de Intelligence, mas este consumidor de UI (não um hook de
  // intelligence) tinha ficado de fora daquela varredura. `useVehicleIntelligence` no mesmo
  // Cockpit já usa `useContratos({ veiculoId })` — agora as duas consultas dedupe.
  const { data: contratos, isLoading: loadingContratos } = useContratos({ veiculoId });

  const receitas = (lancamentos ?? []).filter((l) => l.tipo === 'receita' && l.status !== 'cancelada');
  const despesas = (lancamentos ?? []).filter((l) => l.tipo === 'despesa' && l.status !== 'cancelada');
  const totalReceita = receitas.reduce((soma, l) => soma + l.valor, 0);
  const totalDespesa = despesas.reduce((soma, l) => soma + l.valor, 0);

  const contratosDoVeiculo = contratos ?? [];
  const contratoAtivo = contratosDoVeiculo.find((c) => c.status === 'ativo') ?? null;
  const kmRodado = contratosDoVeiculo.reduce((soma, c) => {
    if (c.km_final !== null && c.km_inicial !== null && c.km_final >= c.km_inicial) return soma + (c.km_final - c.km_inicial);
    return soma;
  }, 0);

  const resumo = calcularResumoFinanceiro({
    lancamentos: lancamentos ?? [],
    pagamentos: [],
  });
  const roi = calcularRoi(resumo.lucroConfirmado, veiculo.valor_compra);
  const custoPorKm = calcularCustoPorKm(resumo.despesaConfirmada, kmRodado > 0 ? kmRodado : null);
  const mesesDeOperacao = veiculo.data_compra
    ? Math.max(1, Math.floor((Date.now() - new Date(veiculo.data_compra).getTime()) / (30 * 86_400_000)))
    : 0;
  const payback = calcularPaybackMeses(veiculo.valor_compra, resumo.lucroConfirmado, mesesDeOperacao);
  const capitalRecuperado = calcularCapitalRecuperado(veiculo.valor_compra, resumo.lucroConfirmado);
  const diasNaFrota = diasDesde(veiculo.data_compra ?? veiculo.criado_em);
  const lucroPorKm = calcularLucroPorKm(resumo.lucroConfirmado, kmRodado > 0 ? kmRodado : null);
  const lucroPorDia = calcularLucroPorDia(resumo.lucroConfirmado, diasNaFrota);
  const roa = calcularRoa(resumo.lucroConfirmado, resolverValorAtualVeiculo(veiculo));
  const resumoFinanciamento = calcularResumoFinanciamentoReal(veiculo);
  const lucroMedioMensal = mesesDeOperacao >= 1 ? resumo.lucroConfirmado / mesesDeOperacao : null;
  const resultadoEsperado = calcularResultadoEsperado(veiculo, resumoFinanciamento, resumo.lucroConfirmado, lucroMedioMensal);

  if (isLoading || loadingContratos) {
    return <div className="h-32 cockpit-shimmer rounded-2xl" />;
  }

  const semLancamentos = (lancamentos?.length ?? 0) === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <YieldAtivoCard veiculo={veiculo} contratoAtivo={contratoAtivo} />
        <CapitalRecuperadoCard resultado={capitalRecuperado} />
      </div>

      <CicloDeVidaTimeline status={veiculo.status} />

      <ResultadoEsperadoCard resultado={resultadoEsperado} />

      {semLancamentos ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum lançamento vinculado a este veículo ainda"
          description="Receita, despesa e manutenção aparecem aqui quando um Lançamento (ou uma Manutenção) marcar este veículo."
          action={
            <Link to="/financeiro/lancamentos">
              <Button type="button" variant="outline" size="sm">
                Ir para Lançamentos
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <p className="text-xs text-neutral-500">Receita</p>
              <p className="text-lg font-semibold text-emerald-600">{formatMoeda(totalReceita)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <p className="text-xs text-neutral-500">Despesa</p>
              <p className="text-lg font-semibold text-red-600">{formatMoeda(totalDespesa)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <p className="text-xs text-neutral-500">Resultado</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(totalReceita - totalDespesa)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Simulador de Investimento</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-neutral-400">ROI acumulado</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{roi.roiPercentual !== null ? `${roi.roiPercentual}%` : '—'}</p>
                {roi.roiPercentual === null && <p className="mt-0.5 text-[11px] text-neutral-400">{roi.motivos[0]}</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-400">ROA acumulado</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{roa.percentual !== null ? `${roa.percentual}%` : '—'}</p>
                {roa.percentual === null && <p className="mt-0.5 text-[11px] text-neutral-400">{roa.motivo}</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-400">Payback estimado</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{payback.meses !== null ? `${payback.meses} mês(es)` : '—'}</p>
                {payback.meses === null && <p className="mt-0.5 text-[11px] text-neutral-400">{payback.motivo}</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-400">Custo por KM</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{custoPorKm.valor !== null ? formatMoeda(custoPorKm.valor) : '—'}</p>
                {custoPorKm.valor === null && <p className="mt-0.5 text-[11px] text-neutral-400">{custoPorKm.motivo}</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-400">Lucro por KM</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{lucroPorKm.valor !== null ? formatMoeda(lucroPorKm.valor) : '—'}</p>
                {lucroPorKm.valor === null && <p className="mt-0.5 text-[11px] text-neutral-400">{lucroPorKm.motivo}</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-400">Lucro por dia</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{lucroPorDia.valor !== null ? formatMoeda(lucroPorDia.valor) : '—'}</p>
                {lucroPorDia.valor === null && <p className="mt-0.5 text-[11px] text-neutral-400">{lucroPorDia.motivo}</p>}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">
              Estimativa linear sobre lucro confirmado — não é fluxo de caixa descontado (TIR). Fundação da Missão 3, Parte 9.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Extrato Financeiro</h3>
            <ExtratoFinanceiroVeiculo lancamentos={lancamentos!} />
          </div>
        </>
      )}
    </div>
  );
}
