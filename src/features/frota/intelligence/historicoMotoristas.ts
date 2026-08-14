import type { ContratoComRelacoes } from '@/features/contracts/types';

export type MotoristaHistoricoItem = {
  motoristaId: string;
  nome: string;
  totalContratos: number;
  diasDirigindo: number;
  receita: number;
  lucro: number;
  totalMultas: number;
  valorMultas: number;
};

type LancamentoParaHistorico = { contrato_id: string | null; tipo: 'receita' | 'despesa'; status: string; valor: number };
type MultaParaHistorico = { contrato_id: string | null; valor: number | null };

function diasContrato(contrato: Pick<ContratoComRelacoes, 'data_inicio' | 'data_fim_real' | 'data_fim_prevista' | 'criado_em'>, hoje: Date): number {
  const inicio = new Date(contrato.data_inicio).getTime();
  const fim = contrato.data_fim_real ? new Date(contrato.data_fim_real).getTime() : hoje.getTime();
  return Math.max(0, Math.round((fim - inicio) / (1000 * 60 * 60 * 24)));
}

// Épico 4 — "FROTA". Aba "Motoristas" do Cockpit: todos que já dirigiram este veículo (brief,
// seção 5), derivado de contratos (não existe vínculo motorista↔veículo fora de contrato).
// "Sinistros", "Avaliação" e "Consumo" pedidos no brief NÃO viraram campo aqui — não existe
// nenhuma tabela/coluna real por trás de nenhum dos três (sinistro só existe como motivo de
// baixa do VEÍCULO inteiro, não como evento atribuível a um motorista; avaliação e consumo não
// têm nenhuma fonte no schema). Registrado pro relatório final.
export function calcularHistoricoMotoristas(
  contratos: ContratoComRelacoes[],
  lancamentos: LancamentoParaHistorico[],
  multas: MultaParaHistorico[],
  hoje: Date
): MotoristaHistoricoItem[] {
  const porMotorista = new Map<string, ContratoComRelacoes[]>();
  for (const contrato of contratos) {
    const lista = porMotorista.get(contrato.motorista_id);
    if (lista) lista.push(contrato);
    else porMotorista.set(contrato.motorista_id, [contrato]);
  }

  const itens: MotoristaHistoricoItem[] = [];
  for (const [motoristaId, contratosDoMotorista] of porMotorista) {
    const contratoIds = new Set(contratosDoMotorista.map((c) => c.id));
    const lancamentosDoMotorista = lancamentos.filter((l) => l.contrato_id !== null && contratoIds.has(l.contrato_id) && l.status === 'confirmada');
    const receita = lancamentosDoMotorista.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesa = lancamentosDoMotorista.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const multasDoMotorista = multas.filter((m) => m.contrato_id !== null && contratoIds.has(m.contrato_id));

    itens.push({
      motoristaId,
      nome: contratosDoMotorista[0].motorista.nome_completo,
      totalContratos: contratosDoMotorista.length,
      diasDirigindo: contratosDoMotorista.reduce((s, c) => s + diasContrato(c, hoje), 0),
      receita,
      lucro: receita - despesa,
      totalMultas: multasDoMotorista.length,
      valorMultas: multasDoMotorista.reduce((s, m) => s + (m.valor ?? 0), 0),
    });
  }

  return itens.sort((a, b) => b.diasDirigindo - a.diasDirigindo);
}
