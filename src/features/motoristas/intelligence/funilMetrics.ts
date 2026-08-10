import { MOTORISTA_ETAPA_FUNIL_ORDEM, type Motorista, type MotoristaEtapaFunil } from '../types';

export type ColunaFunil = {
  etapa: MotoristaEtapaFunil;
  motoristas: Motorista[];
};

// Épico 6 — CRM, Fase 1. Motoristas com `etapa_funil` null (cadastrados antes da migration
// 0025) NÃO entram em nenhuma das 14 colunas — ver `naoClassificados` à parte. Forçá-los numa
// coluna qualquer seria inventar em qual etapa cada um "deveria" estar (DEC-022).
export function agruparPorEtapa(motoristas: Motorista[]): { colunas: ColunaFunil[]; naoClassificados: Motorista[] } {
  const porEtapa = new Map<MotoristaEtapaFunil, Motorista[]>();
  const naoClassificados: Motorista[] = [];

  for (const m of motoristas) {
    if (m.etapa_funil === null) {
      naoClassificados.push(m);
      continue;
    }
    const lista = porEtapa.get(m.etapa_funil);
    if (lista) lista.push(m);
    else porEtapa.set(m.etapa_funil, [m]);
  }

  const colunas = MOTORISTA_ETAPA_FUNIL_ORDEM.map((etapa) => ({ etapa, motoristas: porEtapa.get(etapa) ?? [] }));
  return { colunas, naoClassificados };
}

export type MetricasFunil = {
  totalLeads: number; // novo_lead + primeiro_contato + interessado
  emAnalise: number; // documentacao + analise_financeira + analise_juridica + entrevista
  aprovados: number; // aprovado
  fila: number; // aguardando_veiculo (aprovado mas sem veículo ainda)
  ativos: number; // motorista_ativo + fidelizacao
  encerrados: number; // encerrado
  totalNoFunil: number; // soma de todas as 14 colunas (exclui não classificados)
  conversaoLeadParaAtivoPct: number | null; // ativos / totalLeads-histórico — ver nota abaixo
};

const GRUPO_LEADS: MotoristaEtapaFunil[] = ['novo_lead', 'primeiro_contato', 'interessado'];
const GRUPO_ANALISE: MotoristaEtapaFunil[] = ['documentacao', 'analise_financeira', 'analise_juridica', 'entrevista'];
const GRUPO_ATIVOS: MotoristaEtapaFunil[] = ['motorista_ativo', 'fidelizacao'];

// "Conversão" aqui é uma FOTO do funil agora (quantos estão ativos hoje sobre quantos já
// passaram por alguma etapa), não uma taxa histórica de coorte (isso exigiria guardar
// snapshot ao longo do tempo, que não existe ainda — Indicadores de gargalo/tempo médio por
// etapa ficam pra Fase 2, quando `etapa_funil_desde` já tiver histórico real acumulado).
export function calcularMetricasFunil(motoristas: Motorista[]): MetricasFunil {
  const classificados = motoristas.filter((m) => m.etapa_funil !== null);
  const contar = (etapas: MotoristaEtapaFunil[]) => classificados.filter((m) => etapas.includes(m.etapa_funil!)).length;

  const totalLeads = contar(GRUPO_LEADS);
  const emAnalise = contar(GRUPO_ANALISE);
  const aprovados = contar(['aprovado']);
  const fila = contar(['aguardando_veiculo']);
  const ativos = contar(GRUPO_ATIVOS);
  const encerrados = contar(['encerrado']);
  const totalNoFunil = classificados.length;

  const conversaoLeadParaAtivoPct = totalNoFunil > 0 ? Math.round((ativos / totalNoFunil) * 1000) / 10 : null;

  return { totalLeads, emAnalise, aprovados, fila, ativos, encerrados, totalNoFunil, conversaoLeadParaAtivoPct };
}

// Dias na etapa atual — real, baseado em etapa_funil_desde (mantido por trigger, migration
// 0025). null quando não há como saber (motorista não classificado, ou etapa_funil_desde
// ainda não foi setado pela trigger porque nunca mudou de etapa desde a migration).
export function diasNaEtapa(motorista: Pick<Motorista, 'etapa_funil' | 'etapa_funil_desde' | 'criado_em'>, agora: number = Date.now()): number | null {
  if (motorista.etapa_funil === null) return null;
  const referencia = motorista.etapa_funil_desde ?? motorista.criado_em;
  const inicio = new Date(referencia).getTime();
  if (Number.isNaN(inicio) || inicio > agora) return null;
  return Math.floor((agora - inicio) / 86_400_000);
}
