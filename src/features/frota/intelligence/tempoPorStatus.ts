import type { TimelineEvento } from '@/shared/capabilities/types';
import type { Veiculo, VeiculoStatus } from '../types';

export type CategoriaTempoStatus = 'parado' | 'alugado' | 'oficina' | 'outros';

export type TempoPorStatus = {
  paradoDias: number;
  alugadoDias: number;
  oficinaDias: number;
  outrosDias: number;
  totalDias: number;
  // Épico 5 — DEC-022 (honestidade de dado): true quando não foi possível reconstruir a
  // história de status a partir da Timeline (ver nota abaixo) e o resultado é só uma
  // aproximação (todo o tempo de vida jogado na categoria do status atual).
  aproximado: boolean;
};

// Épico 5 — Fase E.4, "Dias parado/alugado/oficina a partir da Timeline". `disponivel` conta
// como "parado" (frota ociosa, sem gerar receita nem estar em manutenção); os estágios de
// trânsito (novo/comprado/preparacao/reservado/devolvido) e os terminais (venda/encerrado)
// caem em "outros" — misturá-los em "parado" inflaria a métrica com tempo que não é
// realmente ociosidade operacional.
const CATEGORIA_POR_STATUS: Record<VeiculoStatus, CategoriaTempoStatus> = {
  novo: 'outros',
  comprado: 'outros',
  preparacao: 'outros',
  disponivel: 'parado',
  reservado: 'outros',
  alugado: 'alugado',
  devolvido: 'outros',
  manutencao: 'oficina',
  venda: 'outros',
  encerrado: 'outros',
};

const STATUS_VALIDO = new Set<VeiculoStatus>(Object.keys(CATEGORIA_POR_STATUS) as VeiculoStatus[]);

// `timeline_eventos.metadata` fica sempre null nos triggers de status (fn_timeline_veiculo,
// migration 0003) — o único registro de "pra qual status foi" é a `descricao` em texto livre
// pensada pra exibição humana ("Status alterado de "X" para "Y""), não pra leitura por
// código. Mesma limitação já documentada em useDriverIntelligence.ts (Missão 3, Prime Driver)
// — ali bastava saber "há quanto tempo no status atual"; aqui precisamos saber qual era cada
// status intermediário, então a extração por regex é indispensável, não cosmética.
function extrairStatusDoEvento(evento: Pick<TimelineEvento, 'tipo' | 'descricao'>): VeiculoStatus | null {
  const match =
    evento.tipo === 'criacao'
      ? evento.descricao.match(/cadastrado com status "([a-z_]+)"/)
      : evento.tipo === 'status_alterado'
        ? evento.descricao.match(/para "([a-z_]+)"/)
        : null;
  const status = match?.[1];
  return status && STATUS_VALIDO.has(status as VeiculoStatus) ? (status as VeiculoStatus) : null;
}

export function calcularTempoPorStatus(
  veiculo: Pick<Veiculo, 'status' | 'criado_em'>,
  eventos: Array<Pick<TimelineEvento, 'tipo' | 'descricao' | 'criado_em'>>,
  agora: number = Date.now()
): TempoPorStatus {
  const segmentos = eventos
    .map((e) => ({ status: extrairStatusDoEvento(e), criado_em: e.criado_em }))
    .filter((e): e is { status: VeiculoStatus; criado_em: string } => e.status !== null)
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  const totais: Record<CategoriaTempoStatus, number> = { parado: 0, alugado: 0, oficina: 0, outros: 0 };

  if (segmentos.length === 0) {
    // Fallback: nenhum evento parseável (ex.: Timeline não carregou, ou formato mudou) — não
    // trava a tela em zero. Joga a vida inteira do veículo na categoria do status atual, e
    // marca `aproximado: true` pra UI avisar que não é um histórico dia-a-dia real.
    const inicio = new Date(veiculo.criado_em).getTime();
    const dias = Number.isNaN(inicio) ? 0 : Math.max(0, Math.round((agora - inicio) / 86_400_000));
    totais[CATEGORIA_POR_STATUS[veiculo.status]] += dias;
    return { paradoDias: totais.parado, alugadoDias: totais.alugado, oficinaDias: totais.oficina, outrosDias: totais.outros, totalDias: dias, aproximado: true };
  }

  for (let i = 0; i < segmentos.length; i++) {
    const inicio = new Date(segmentos[i].criado_em).getTime();
    const fim = i + 1 < segmentos.length ? new Date(segmentos[i + 1].criado_em).getTime() : agora;
    const dias = Math.max(0, (fim - inicio) / 86_400_000);
    totais[CATEGORIA_POR_STATUS[segmentos[i].status]] += dias;
  }

  const paradoDias = Math.round(totais.parado);
  const alugadoDias = Math.round(totais.alugado);
  const oficinaDias = Math.round(totais.oficina);
  const outrosDias = Math.round(totais.outros);

  return {
    paradoDias,
    alugadoDias,
    oficinaDias,
    outrosDias,
    totalDias: paradoDias + alugadoDias + oficinaDias + outrosDias,
    aproximado: false,
  };
}
