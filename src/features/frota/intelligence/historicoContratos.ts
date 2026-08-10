import type { ContratoComRelacoes } from '@/features/contracts/types';

export type ContratoHistoricoItem = {
  contrato: ContratoComRelacoes;
  receita: number;
  despesa: number;
  lucro: number;
  totalMultas: number;
  valorMultas: number;
  /** Dias entre o fim deste contrato e o início do próximo contrato do mesmo veículo — null se
   * for o contrato mais recente (ainda não há "próximo") ou se o contrato não tem data de fim. */
  vacanciaAteProximoDias: number | null;
};

type LancamentoParaHistorico = { contrato_id: string | null; tipo: 'receita' | 'despesa'; status: string; valor: number };
type MultaParaHistorico = { contrato_id: string | null; valor: number | null };

function diasEntre(inicioIso: string, fimIso: string): number {
  const inicio = new Date(inicioIso).getTime();
  const fim = new Date(fimIso).getTime();
  return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
}

// Épico 4 — "FROTA". Aba Contratos do Cockpit (brief pede TODOS os contratos do veículo, não
// só o atual, com motorista/período/receita/lucro/vacância/multas). "Motivo de encerramento" e
// "Avaliação" pedidos no brief NÃO viraram campo aqui — não existe coluna nenhuma no schema pra
// nenhum dos dois (contratos.ts não tem motivo_encerramento nem avaliacao) — mostrar isso seria
// inventar dado. Fica registrado pro relatório final como possível migration futura.
export function calcularHistoricoContratos(
  contratos: ContratoComRelacoes[],
  lancamentos: LancamentoParaHistorico[],
  multas: MultaParaHistorico[]
): ContratoHistoricoItem[] {
  const ordenados = [...contratos].sort(
    (a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
  );

  return ordenados.map((contrato, index) => {
    const lancamentosDoContrato = lancamentos.filter((l) => l.contrato_id === contrato.id && l.status === 'confirmada');
    const receita = lancamentosDoContrato.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesa = lancamentosDoContrato.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);

    const multasDoContrato = multas.filter((m) => m.contrato_id === contrato.id);
    const valorMultas = multasDoContrato.reduce((s, m) => s + (m.valor ?? 0), 0);

    const fimContrato = contrato.data_fim_real ?? contrato.data_fim_prevista;
    const proximo = ordenados[index + 1];
    const vacanciaAteProximoDias =
      fimContrato && proximo ? diasEntre(fimContrato, proximo.data_inicio) : null;

    return {
      contrato,
      receita,
      despesa,
      lucro: receita - despesa,
      totalMultas: multasDoContrato.length,
      valorMultas,
      vacanciaAteProximoDias,
    };
  }).reverse(); // mais recente primeiro na tela, cálculo acima usa ordem cronológica
}
