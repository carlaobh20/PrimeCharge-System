import type { FunilEtapa, FunilEtapaGrupo, Motorista } from '../types';

export type ColunaFunil = {
  etapa: FunilEtapa;
  motoristas: Motorista[];
};

// Épico 6 — CRM, Fase 1.1 (migration 0026). `etapas` agora é DADO (tabela funil_etapas, por
// empresa), não mais um enum fixo de 14 valores — Carlos pode adicionar/renomear/remover etapa
// pela tela. Um motorista cai em "não classificados" tanto quando `etapa_funil_id` é null
// quanto quando aponta pra uma etapa que não está mais na lista ativa (arquivada) — nos dois
// casos, nunca inventamos em qual coluna ele "deveria" estar (DEC-022).
export function agruparPorEtapa(motoristas: Motorista[], etapas: FunilEtapa[]): { colunas: ColunaFunil[]; naoClassificados: Motorista[] } {
  const idsValidos = new Set(etapas.map((e) => e.id));
  const porEtapa = new Map<string, Motorista[]>();
  const naoClassificados: Motorista[] = [];

  for (const m of motoristas) {
    if (m.etapa_funil_id === null || !idsValidos.has(m.etapa_funil_id)) {
      naoClassificados.push(m);
      continue;
    }
    const lista = porEtapa.get(m.etapa_funil_id);
    if (lista) lista.push(m);
    else porEtapa.set(m.etapa_funil_id, [m]);
  }

  const colunas = etapas.map((etapa) => ({ etapa, motoristas: porEtapa.get(etapa.id) ?? [] }));
  return { colunas, naoClassificados };
}

export type MetricasFunil = {
  totalLeads: number; // grupo 'lead'
  emAnalise: number; // grupo 'em_analise'
  aprovados: number; // grupo 'aprovado'
  fila: number; // grupo 'fila'
  ativos: number; // grupo 'ativo'
  encerrados: number; // grupo 'encerrado'
  totalNoFunil: number; // soma de todas as etapas ativas (exclui não classificados)
  conversaoLeadParaAtivoPct: number | null; // ativos / total no funil agora — ver nota abaixo
};

// "Conversão" aqui é uma FOTO do funil agora (quantos estão no grupo 'ativo' hoje sobre quantos
// já passaram por alguma etapa classificada), não uma taxa histórica de coorte (isso exigiria
// snapshot ao longo do tempo, que não existe ainda). Etapa com grupo 'nenhum' (criada pelo
// Carlos sem escolher um grupo ainda) conta em totalNoFunil mas não em nenhum bucket específico
// — nem por isso quebra a divisão da conversão.
export function calcularMetricasFunil(motoristas: Motorista[], etapas: FunilEtapa[]): MetricasFunil {
  const grupoPorEtapaId = new Map(etapas.map((e) => [e.id, e.grupo]));
  const classificados = motoristas.filter((m) => m.etapa_funil_id !== null && grupoPorEtapaId.has(m.etapa_funil_id));
  const contar = (grupos: FunilEtapaGrupo[]) =>
    classificados.filter((m) => grupos.includes(grupoPorEtapaId.get(m.etapa_funil_id!)!)).length;

  const totalLeads = contar(['lead']);
  const emAnalise = contar(['em_analise']);
  const aprovados = contar(['aprovado']);
  const fila = contar(['fila']);
  const ativos = contar(['ativo']);
  const encerrados = contar(['encerrado']);
  const totalNoFunil = classificados.length;

  const conversaoLeadParaAtivoPct = totalNoFunil > 0 ? Math.round((ativos / totalNoFunil) * 1000) / 10 : null;

  return { totalLeads, emAnalise, aprovados, fila, ativos, encerrados, totalNoFunil, conversaoLeadParaAtivoPct };
}

// Dias na etapa atual — real, baseado em etapa_funil_desde (mantido por trigger, migration
// 0025/0026). null quando não há como saber (motorista não classificado, ou etapa_funil_desde
// ainda não foi setado pela trigger porque nunca mudou de etapa desde a migration).
export function diasNaEtapa(
  motorista: Pick<Motorista, 'etapa_funil_id' | 'etapa_funil_desde' | 'criado_em'>,
  agora: number = Date.now()
): number | null {
  if (motorista.etapa_funil_id === null) return null;
  const referencia = motorista.etapa_funil_desde ?? motorista.criado_em;
  const inicio = new Date(referencia).getTime();
  if (Number.isNaN(inicio) || inicio > agora) return null;
  return Math.floor((agora - inicio) / 86_400_000);
}
