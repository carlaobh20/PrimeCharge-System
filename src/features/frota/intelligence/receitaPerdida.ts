import type { ContratoPeriodicidade } from '@/features/contracts/types';

export type CausaReceitaPerdida = 'vacancia' | 'oficina' | 'documentacao' | 'sinistro' | 'indisponibilidade';

export type ReceitaPerdida = {
  taxaDiariaMedia: number | null;
  porCausa: Record<CausaReceitaPerdida, { valor: number | null; motivo: string | null }>;
};

// Épico 5 — "Consolidação da Arquitetura", item 6. Achado da auditoria: `contratos.valor_periodico`
// + `periodicidade` (migration 0005) é a taxa real acordada com o motorista — normalizada pra
// diária, multiplicada pelos dias parado/oficina que a Fase E.4 (tempoPorStatus.ts) já
// reconstrói, dá uma ESTIMATIVA real (rotulada como tal, não "confirmada") de quanto deixou de
// entrar. Usa a MÉDIA dos contratos do veículo (não só o último) pra não enviesar por um
// contrato atípico.
//
// Documentação e Sinistro ficam sempre "Dados insuficientes" — dependem do mesmo gap
// registrado na auditoria (documento não tem workflow de vencimento; sinistro tem tabela nova,
// migration 0023, sem histórico ainda). "Indisponibilidade" genérica também — misturar tudo
// que não é vacância/oficina/venda/trânsito na mesma conta de vacância inflaria o número
// (mesmo motivo que tempoPorStatus.ts separa "outros" de "parado"). Nunca inventa número:
// null real vira "Dados insuficientes" na tela, não 0.
function normalizarParaDiaria(valorPeriodico: number, periodicidade: ContratoPeriodicidade): number {
  if (periodicidade === 'diaria') return valorPeriodico;
  if (periodicidade === 'semanal') return valorPeriodico / 7;
  return valorPeriodico / 30; // mensal — aproximação, mesmo padrão já usado em cálculos financeiros do projeto (ex.: mesesDeOperacao em FinanceiroTab)
}

export function calcularReceitaPerdida(
  contratos: Array<{ valor_periodico: number; periodicidade: ContratoPeriodicidade }>,
  tempoPorStatus: { paradoDias: number; oficinaDias: number }
): ReceitaPerdida {
  const taxasDiarias = contratos.map((c) => normalizarParaDiaria(c.valor_periodico, c.periodicidade));
  const taxaDiariaMedia = taxasDiarias.length > 0 ? taxasDiarias.reduce((s, v) => s + v, 0) / taxasDiarias.length : null;

  const semTaxa = { valor: null, motivo: 'Sem contrato cadastrado neste veículo — não há taxa diária pra estimar.' };
  const semFonte = (rotulo: string) => ({ valor: null, motivo: `Sem fonte de dado confiável ainda para "${rotulo}".` });

  return {
    taxaDiariaMedia,
    porCausa: {
      vacancia:
        taxaDiariaMedia !== null ? { valor: taxaDiariaMedia * tempoPorStatus.paradoDias, motivo: null } : semTaxa,
      oficina:
        taxaDiariaMedia !== null ? { valor: taxaDiariaMedia * tempoPorStatus.oficinaDias, motivo: null } : semTaxa,
      documentacao: semFonte('documentação'),
      sinistro: semFonte('sinistro'),
      indisponibilidade: semFonte('indisponibilidade genérica'),
    },
  };
}
