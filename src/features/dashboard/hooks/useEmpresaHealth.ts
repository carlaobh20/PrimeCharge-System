import { useCommandCenter } from '@/features/command-center/hooks/useCommandCenter';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { useAcoesPorEmpresa } from '@/features/operacoes/hooks/useAcoes';
import { calcularResumoFinanceiro, type ResumoFinanceiro } from '@/features/financeiro/intelligence';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import { diasAte } from '@/shared/lib/format';
import type { VeiculoStatus } from '@/features/frota/types';
import type { ContratoStatus } from '@/features/contracts/types';
import type { MotoristaStatus } from '@/features/motoristas/types';
import type { AcaoPrioridade } from '@/features/operacoes/types';

export type EmpresaHealthResult =
  | { isLoading: true }
  | {
      isLoading: false;
      financeiro: ResumoFinanceiro & { pagamentosPendentesAtrasados: number; valorPendenteAtrasado: number };
      frota: {
        total: number;
        healthMedio: number | null;
        criticos: number;
        porStatus: Partial<Record<VeiculoStatus, number>>;
      };
      contratos: {
        total: number;
        ativos: number;
        vencendoEm30Dias: number;
        porStatus: Partial<Record<ContratoStatus, number>>;
      };
      motoristas: {
        total: number;
        ativos: number;
        cnhVencendoEm30Dias: number;
        porStatus: Partial<Record<MotoristaStatus, number>>;
      };
      filaOperacional: {
        total: number;
        porPrioridade: Partial<Record<AcaoPrioridade, number>>;
      };
      // Épico 4, Parte 8 — só "Veículos" tem dado real hoje. Wallbox/Loja/Software/Imóveis/
      // Outros aparecem na tela sempre zerados (`pending`, mesma convenção de KpiCard já usada
      // pra "módulo ainda não existe") — o objetivo é mudar a mentalidade ("a empresa tem mais
      // de um tipo de ativo"), não fingir que já existe dado que não existe.
      ativos: {
        valorTotalVeiculos: number;
      };
    };

function contarPorStatus<T extends string>(itens: { status: T }[]): Partial<Record<T, number>> {
  const contagem: Partial<Record<T, number>> = {};
  for (const item of itens) {
    contagem[item.status] = (contagem[item.status] ?? 0) + 1;
  }
  return contagem;
}

// Ponte "Saúde da Empresa" (Missão 5, Fase 2 — Business Operating System) — mesmo papel que
// useVehicleIntelligence/useCommandCenter cumprem para suas telas: nem a página, nem os
// widgets, calculam nada, só recebem o resultado pronto. Reaproveita agressivamente o que já
// existe em vez de recalcular: `useCommandCenter()` já computa a Saúde da Frota (fixed-N
// queries, DEC-069) — chamado aqui só para ler `resumoFrota`, e o React Query dedupe garante
// que abrir Dashboard depois de Home não dispara nenhuma consulta nova. `calcularResumoFinanceiro`
// (DEC-046) já foi desenhado para "no futuro, uma Visão Geral consolidada — mesma função,
// filtro diferente de quem chama" — é exatamente este consumidor. Contratos/Motoristas usam
// contagem simples sobre o dado já bruto (sem rodar Health Score por entidade — isso seria o
// mesmo padrão O(n) no browser que a auditoria da Fase 1 acabou de corrigir, DEC-108).
export function useEmpresaHealth(): EmpresaHealthResult {
  const commandCenter = useCommandCenter();
  const { data: veiculos, isLoading: loadingVeiculos } = useVeiculos();
  const { data: contratos, isLoading: loadingContratos } = useContratos();
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristas();
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentosPorEmpresa();
  const { data: pagamentos, isLoading: loadingPagamentos } = usePagamentosPorEmpresa();
  const { data: acoes, isLoading: loadingAcoes } = useAcoesPorEmpresa();

  const isLoading =
    commandCenter.isLoading ||
    loadingVeiculos ||
    loadingContratos ||
    loadingMotoristas ||
    loadingLancamentos ||
    loadingPagamentos ||
    loadingAcoes;

  if (isLoading) return { isLoading: true };

  const pagamentosParaResumo = (pagamentos ?? [])
    .filter((p) => p.lancamento?.tipo)
    .map((p) => ({
      status: p.status,
      data_prevista: p.data_prevista,
      data_pagamento: p.data_pagamento,
      valor: p.valor,
      tipo: p.lancamento!.tipo as 'receita' | 'despesa',
    }));

  const resumoFinanceiroBase = calcularResumoFinanceiro({ lancamentos: lancamentos ?? [], pagamentos: pagamentosParaResumo });

  const hoje = new Date().toISOString().slice(0, 10);
  const pendentesAtrasados = (pagamentos ?? []).filter((p) => p.status === 'pendente' && p.data_prevista < hoje);

  const contratosLista = contratos ?? [];
  const contratosVencendo = contratosLista.filter((c) => {
    const dias = diasAte(c.data_fim_prevista);
    return c.status === 'ativo' && dias !== null && dias >= 0 && dias <= 30;
  });

  const motoristasLista = motoristas ?? [];
  const cnhVencendo = motoristasLista.filter((m) => {
    const dias = diasAte(m.cnh_validade);
    return dias !== null && dias >= 0 && dias <= 30;
  });

  const acoesAbertas = (acoes ?? []).filter((a) => a.status === 'pendente' || a.status === 'em_andamento');

  return {
    isLoading: false,
    financeiro: {
      ...resumoFinanceiroBase,
      pagamentosPendentesAtrasados: pendentesAtrasados.length,
      valorPendenteAtrasado: pendentesAtrasados.reduce((soma, p) => soma + p.valor, 0),
    },
    frota: {
      // Épico 1: useCommandCenter agora também pode devolver isError (ver comentário lá) —
      // mesmo fallback "sem dado" que já existia pra isLoading, dado que aqui é só o placar
      // da empresa (Dashboard), não vale travar a tela inteira por causa disso.
      total: commandCenter.isLoading || commandCenter.isError ? 0 : commandCenter.resumoFrota.totalVeiculos,
      healthMedio: commandCenter.isLoading || commandCenter.isError ? null : commandCenter.resumoFrota.healthMedio,
      criticos: commandCenter.isLoading || commandCenter.isError ? 0 : commandCenter.resumoFrota.veiculosCriticos.length,
      porStatus: contarPorStatus(veiculos ?? []),
    },
    contratos: {
      total: contratosLista.length,
      ativos: contratosLista.filter((c) => c.status === 'ativo').length,
      vencendoEm30Dias: contratosVencendo.length,
      porStatus: contarPorStatus(contratosLista),
    },
    motoristas: {
      total: motoristasLista.length,
      ativos: motoristasLista.filter((m) => m.status === 'ativo').length,
      cnhVencendoEm30Dias: cnhVencendo.length,
      porStatus: contarPorStatus(motoristasLista),
    },
    filaOperacional: {
      total: acoesAbertas.length,
      porPrioridade: contarPorStatus(acoesAbertas.map((a) => ({ status: a.prioridade }))),
    },
    ativos: {
      // 'encerrado' é o único status realmente terminal (venda concluída e baixada) — um
      // veículo 'venda' (anunciado, ainda não vendido) continua sendo patrimônio da empresa até
      // a venda de fato acontecer, por isso entra na soma.
      valorTotalVeiculos: (veiculos ?? [])
        .filter((v) => v.status !== 'encerrado')
        .reduce((soma, v) => soma + (resolverValorAtualVeiculo(v) ?? 0), 0),
    },
  };
}
