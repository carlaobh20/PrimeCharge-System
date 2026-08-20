// MINHA META — motor PURO de inteligência financeira pessoal do motorista.
// Regra arquitetural do projeto: o MOTOR calcula, o componente só apresenta. UMA função de
// normalização para o app inteiro (Módulo 9). Nenhuma chamada de rede aqui — testável em Node
// (scripts/audit-motorista-meta.ts). HONESTIDADE: renda/hora é PREMISSA informada pelo
// motorista; nada aqui é "lucro", "faturamento real" nem aconselhamento financeiro.
// Guards obrigatórios (Módulo 36): nunca NaN, nunca Infinity, nunca negativo indevido.

export type PeriodicidadeDespesa = 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'anual';

export type GrupoDespesa = 'vida' | 'familia' | 'carro' | 'trabalho';

export type DespesaMeta = {
  id: string;
  grupo: GrupoDespesa;
  categoria: string;
  nome: string;
  dependente: string | null;
  valor: number;
  periodicidade: PeriodicidadeDespesa;
  obrigatoria: boolean;
  ativa: boolean;
};

export const PERIODICIDADE_LABEL: Record<PeriodicidadeDespesa, string> = {
  diaria: 'por dia',
  semanal: 'por semana',
  quinzenal: 'por quinzena',
  mensal: 'por mês',
  anual: 'por ano',
};

/** Fatores de conversão para o mês (base 12 meses / 52 semanas / 365 dias — declarados). */
const FATOR_MENSAL: Record<PeriodicidadeDespesa, number> = {
  diaria: 365 / 12,
  semanal: 52 / 12,
  quinzenal: 26 / 12,
  mensal: 1,
  anual: 1 / 12,
};

const seguro = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/** A ÚNICA função de normalização mensal do app (Módulo 9). Valor inválido/negativo → 0. */
export function normalizarMensal(valor: number, periodicidade: PeriodicidadeDespesa): number {
  return Math.round(seguro(valor) * FATOR_MENSAL[periodicidade] * 100) / 100;
}

/** Texto da conversão mostrado ao motorista (transparência da Regra 9). */
export function explicarConversao(valor: number, periodicidade: PeriodicidadeDespesa): string | null {
  if (periodicidade === 'mensal') return null;
  return `${formatBRL(valor)} ${PERIODICIDADE_LABEL[periodicidade]} ≈ ${formatBRL(normalizarMensal(valor, periodicidade))}/mês`;
}

export function formatBRL(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** 9,45h → "9h27". Nunca negativo, nunca NaN. */
export function formatHoras(horas: number): string {
  const h = seguro(horas);
  const inteiras = Math.floor(h);
  const minutos = Math.round((h - inteiras) * 60);
  if (minutos === 60) return `${inteiras + 1}h00`;
  return `${inteiras}h${String(minutos).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Totais por grupo (Módulos 3–8) — só despesas ATIVAS entram na meta.
// ---------------------------------------------------------------------------

export type TotaisCustos = {
  vida: number;
  familia: number;
  carro: number; // inclui o aluguel do contrato PrimeCharge (derivado, nunca cadastrado)
  trabalho: number;
  total: number;
  /** despesas anuais informadas (valor anual bruto) — para o alerta de provisionamento */
  anuaisBruto: number;
  outrosMensal: number;
};

const arred = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function calcularTotais(despesas: DespesaMeta[], aluguelCarroMensal: number): TotaisCustos {
  const t: TotaisCustos = { vida: 0, familia: 0, carro: seguro(aluguelCarroMensal), trabalho: 0, total: 0, anuaisBruto: 0, outrosMensal: 0 };
  for (const d of despesas) {
    if (!d.ativa) continue;
    const mensal = normalizarMensal(d.valor, d.periodicidade);
    t[d.grupo] += mensal;
    if (d.periodicidade === 'anual') t.anuaisBruto += seguro(d.valor);
    if (d.categoria === 'outros') t.outrosMensal += mensal;
  }
  t.vida = arred(t.vida);
  t.familia = arred(t.familia);
  t.carro = arred(t.carro);
  t.trabalho = arred(t.trabalho);
  t.anuaisBruto = arred(t.anuaisBruto);
  t.outrosMensal = arred(t.outrosMensal);
  t.total = arred(t.vida + t.familia + t.carro + t.trabalho);
  return t;
}

// ---------------------------------------------------------------------------
// META (Módulos 2, 10–15, 20) — tudo derivado de custo total + dias + renda/hora (premissa).
// ---------------------------------------------------------------------------

export type MetaCalculada = {
  metaMensal: number;
  metaDiaria: number;
  horasPorDia: number | null; // null quando renda/hora inválida
  horasMes: number | null;
  custoPorHora: number | null;
  rendaHora: number;
  diasTrabalho: number;
};

export function calcularMeta(custoTotalMensal: number, diasTrabalho: number, rendaHora: number): MetaCalculada {
  const dias = Number.isFinite(diasTrabalho) && diasTrabalho >= 1 ? Math.min(Math.floor(diasTrabalho), 31) : 26;
  const total = seguro(custoTotalMensal);
  const metaDiaria = arred(total / dias);
  const renda = Number.isFinite(rendaHora) && rendaHora > 0 ? rendaHora : 0;
  const horasPorDia = renda > 0 ? metaDiaria / renda : null;
  const horasMes = horasPorDia != null ? horasPorDia * dias : null;
  const custoPorHora = horasMes != null && horasMes > 0 ? arred(total / horasMes) : null;
  return { metaMensal: total, metaDiaria, horasPorDia, horasMes, custoPorHora, rendaHora: renda, diasTrabalho: dias };
}

// ---------------------------------------------------------------------------
// PROGRESSO + REBALANCEAMENTO (Módulos 16–18)
// ---------------------------------------------------------------------------

export type ProgressoMes = {
  meta: number;
  realizado: number;
  pctCoberto: number; // 0..100+ (pode passar de 100)
  falta: number; // nunca negativo
  diasComLancamento: number;
};

export function progressoDoMes(metaMensal: number, ganhos: { valor: number }[]): ProgressoMes {
  const meta = seguro(metaMensal);
  const realizado = arred(ganhos.reduce((s, g) => s + seguro(g.valor), 0));
  return {
    meta,
    realizado,
    pctCoberto: meta > 0 ? Math.round((realizado / meta) * 100) : 0,
    falta: arred(Math.max(0, meta - realizado)),
    diasComLancamento: ganhos.length,
  };
}

/** Módulo 18: nova média necessária nos dias restantes. null = sem dias restantes. */
export function rebalancear(metaMensal: number, realizado: number, diasRestantes: number): number | null {
  if (!Number.isFinite(diasRestantes) || diasRestantes <= 0) return null;
  const falta = Math.max(0, seguro(metaMensal) - seguro(realizado));
  return arred(falta / Math.floor(diasRestantes));
}

export type MetaHoje = {
  meta: number;
  realizado: number | null; // null = sem lançamento hoje (mostrar só a meta — nada inventado)
  falta: number | null;
  horasRestantes: number | null;
};

export function metaDeHoje(metaDiaria: number, realizadoHoje: number | null, rendaHora: number): MetaHoje {
  const meta = seguro(metaDiaria);
  if (realizadoHoje == null) return { meta, realizado: null, falta: null, horasRestantes: null };
  const falta = arred(Math.max(0, meta - seguro(realizadoHoje)));
  return {
    meta,
    realizado: seguro(realizadoHoje),
    falta,
    horasRestantes: rendaHora > 0 ? falta / rendaHora : null,
  };
}

// ---------------------------------------------------------------------------
// CALENDÁRIO (Módulo 19) — status por texto, nunca só cor.
// ---------------------------------------------------------------------------

export type StatusDiaMeta = 'atingida' | 'abaixo' | 'acima' | 'sem_dado';

export const STATUS_DIA_LABEL: Record<StatusDiaMeta, string> = {
  atingida: 'Meta atingida',
  abaixo: 'Abaixo da meta',
  acima: 'Acima da meta',
  sem_dado: 'Sem dado',
};

export type DiaCalendario = {
  dia: number;
  meta: number;
  realizado: number | null;
  diferenca: number | null;
  horas: number | null;
  status: StatusDiaMeta;
  /** Fase 11 (Módulo 13): R$/h do dia quando valor E horas existem */
  rsHora: number | null;
  encerrado: boolean;
};

export function montarCalendario(
  ano: number,
  mes1a12: number,
  metaDiaria: number,
  ganhos: { data: string; valor: number; horas: number | null; observacao?: string | null }[],
): DiaCalendario[] {
  const diasNoMes = new Date(ano, mes1a12, 0).getDate();
  const porDia = new Map(ganhos.map((g) => [Number(g.data.slice(8, 10)), g]));
  const out: DiaCalendario[] = [];
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const g = porDia.get(dia);
    if (!g) {
      out.push({ dia, meta: seguro(metaDiaria), realizado: null, diferenca: null, horas: null, status: 'sem_dado', rsHora: null, encerrado: false });
      continue;
    }
    const realizado = seguro(g.valor);
    const dif = arred(realizado - seguro(metaDiaria));
    const horas = g.horas != null && Number.isFinite(g.horas) ? g.horas : null;
    out.push({
      dia,
      meta: seguro(metaDiaria),
      realizado,
      diferenca: dif,
      horas,
      status: dif > 0.005 ? 'acima' : dif < -0.005 ? 'abaixo' : 'atingida',
      rsHora: horas != null && horas > 0 && realizado > 0 ? arred(realizado / horas) : null,
      encerrado: g.observacao === 'dia_encerrado',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// SOBRA + OBJETIVOS (Módulos 21–24)
// ---------------------------------------------------------------------------

export function sobraEstimada(receita: number, custos: number): number {
  const r = Number.isFinite(receita) && receita >= 0 ? receita : 0;
  const c = Number.isFinite(custos) && custos >= 0 ? custos : 0;
  return arred(r - c); // pode ser negativa — mostrada como está, nunca chamada de lucro
}

/** Quanto por dia ADICIONAL para atingir o objetivo dentro dos dias disponíveis. */
export function objetivoPorDia(valorMeta: number, valorAtual: number, diasDisponiveis: number): number | null {
  if (!Number.isFinite(diasDisponiveis) || diasDisponiveis <= 0) return null;
  const falta = Math.max(0, seguro(valorMeta) - seguro(valorAtual));
  return arred(falta / Math.floor(diasDisponiveis));
}

/** Dias de trabalho estimados até um prazo (proporcional aos dias de trabalho do mês). */
export function diasDeTrabalhoAte(prazoIso: string | null, diasTrabalhoMes: number, hoje: Date): number | null {
  if (!prazoIso) return null;
  const prazo = new Date(`${prazoIso}T12:00:00`);
  const diasCorridos = Math.ceil((prazo.getTime() - hoje.getTime()) / 86_400_000);
  if (!Number.isFinite(diasCorridos) || diasCorridos <= 0) return null;
  return Math.max(1, Math.round((diasCorridos * Math.min(Math.max(diasTrabalhoMes, 1), 31)) / 30));
}

// ---------------------------------------------------------------------------
// SIMULADOR "E SE?" (Módulo 25) — recalcula sem tocar os dados reais.
// ---------------------------------------------------------------------------

export type Simulacao = {
  custoTotal?: number;
  diasTrabalho?: number;
  rendaHora?: number;
};

export function simular(base: { custoTotal: number; diasTrabalho: number; rendaHora: number }, ajustes: Simulacao) {
  const atual = calcularMeta(base.custoTotal, base.diasTrabalho, base.rendaHora);
  const simulado = calcularMeta(
    ajustes.custoTotal ?? base.custoTotal,
    ajustes.diasTrabalho ?? base.diasTrabalho,
    ajustes.rendaHora ?? base.rendaHora,
  );
  return { atual, simulado, diferencaDiaria: arred(simulado.metaDiaria - atual.metaDiaria) };
}

// ---------------------------------------------------------------------------
// ALERTAS (Módulo 26) — informação factual, sem julgamento e sem conselho.
// ---------------------------------------------------------------------------

export function alertasMeta(i: {
  totais: TotaisCustos;
  progresso: ProgressoMes | null;
  snapshotAnteriorTotal: number | null;
  diasRestantes: number;
}): string[] {
  const alertas: string[] = [];
  const t = i.totais;
  if (t.total > 0) {
    const pctCarro = Math.round(((t.carro + t.trabalho) / t.total) * 100);
    alertas.push(`Seu carro + custos de trabalho representam ${pctCarro}% dos seus custos.`);
    if (t.outrosMensal / t.total >= 0.1) {
      alertas.push(`Você possui ${formatBRL(t.outrosMensal)}/mês classificados como "Outros". Quer detalhar?`);
    }
  }
  if (t.anuaisBruto > 0) {
    alertas.push(`Você possui ${formatBRL(t.anuaisBruto)} em despesas anuais — já incluídas na meta como ${formatBRL(arred(t.anuaisBruto / 12))}/mês.`);
  }
  if (i.progresso && i.progresso.meta > 0 && i.diasRestantes <= 7 && i.progresso.falta > 0) {
    alertas.push(`Você está ${formatBRL(i.progresso.falta)} abaixo da meta mensal, com ${i.diasRestantes} dia(s) restantes.`);
  }
  if (i.snapshotAnteriorTotal != null && i.snapshotAnteriorTotal > 0) {
    const delta = arred(t.total - i.snapshotAnteriorTotal);
    if (Math.abs(delta) >= 50) {
      alertas.push(`Seu custo mensal ${delta > 0 ? 'aumentou' : 'diminuiu'} ${formatBRL(Math.abs(delta))} em relação ao mês anterior.`);
    }
  }
  return alertas;
}

// ===========================================================================
// FASE 9 — COCKPIT FINANCEIRO (evolução da Minha Meta; MESMO motor, nada duplicado)
// ===========================================================================

// ---------------------------------------------------------------------------
// META DE HOJE + STATUS DO DIA (Módulos 1/2/5/8/14/18)
// ---------------------------------------------------------------------------

export type StatusDia = 'nao_comecou' | 'abaixo_ritmo' | 'no_ritmo' | 'acima_ritmo' | 'encerrado';

export const STATUS_DIA_HOJE_LABEL: Record<StatusDia, string> = {
  nao_comecou: 'Ainda não começou',
  abaixo_ritmo: 'Abaixo do ritmo',
  no_ritmo: 'No ritmo',
  acima_ritmo: 'Acima do ritmo',
  encerrado: 'Dia encerrado',
};

export type MetaHojeCockpit = {
  metaHoje: number; // meta REBALANCEADA de hoje (falta do mês ÷ dias restantes, incluindo hoje)
  metaDiariaOriginal: number;
  realizadoHoje: number | null;
  faltanteHoje: number | null;
  horasRestantes: number | null; // na renda/hora premissa
  horasNecessariasHoje: number | null;
  horasTrabalhadasHoje: number | null;
  sobreAMeta: number | null; // realizado − meta de hoje (pode ser negativo)
  pctDia: number | null; // 0..100+ do dia coberto
  status: StatusDia;
};

/**
 * Módulo 5 — motor puro da META DE HOJE. A meta de hoje é a REBALANCEADA: o que falta no mês
 * dividido pelos dias de trabalho restantes (hoje incluso). Guards: 0, negativo, NaN, Infinity,
 * dias restantes 0 (→ o que falta no mês inteiro vira a meta do dia, nunca divisão por zero).
 * O "ritmo" intradia só é calculado quando o motorista LANÇOU horas (nada é inventado): esperado
 * até agora = metaHoje × min(1, horasTrabalhadas / horasNecessárias) — fórmula transparente na
 * premissa de renda/hora informada.
 */
export function calcularMetaHoje(i: {
  metaMensal: number;
  metaDiariaOriginal: number;
  realizadoAcumuladoAntesDeHoje: number;
  diasRestantesIncluindoHoje: number;
  rendaHora: number;
  realizadoHoje: number | null;
  horasTrabalhadasHoje: number | null;
  diaEncerrado: boolean;
}): MetaHojeCockpit {
  const faltaMes = Math.max(0, seguro(i.metaMensal) - seguro(i.realizadoAcumuladoAntesDeHoje));
  const diasRest = Number.isFinite(i.diasRestantesIncluindoHoje) && i.diasRestantesIncluindoHoje >= 1
    ? Math.floor(i.diasRestantesIncluindoHoje)
    : 1; // 0 dias restantes → hoje carrega o que falta (nunca ÷0)
  const metaHoje = arred(faltaMes / diasRest);
  const renda = seguro(i.rendaHora);
  const horasNecessariasHoje = renda > 0 ? metaHoje / renda : null;
  const realizadoHoje = i.realizadoHoje != null && Number.isFinite(i.realizadoHoje) ? Math.max(0, i.realizadoHoje) : null;
  const horasHoje = i.horasTrabalhadasHoje != null && Number.isFinite(i.horasTrabalhadasHoje) && i.horasTrabalhadasHoje > 0
    ? Math.min(i.horasTrabalhadasHoje, 24)
    : null;

  const faltanteHoje = realizadoHoje != null ? arred(Math.max(0, metaHoje - realizadoHoje)) : null;
  const horasRestantes = faltanteHoje != null && renda > 0 ? faltanteHoje / renda : null;
  const sobreAMeta = realizadoHoje != null ? arred(realizadoHoje - metaHoje) : null;
  const pctDia = realizadoHoje != null && metaHoje > 0 ? Math.round((realizadoHoje / metaHoje) * 100) : null;

  let status: StatusDia;
  if (i.diaEncerrado) status = 'encerrado';
  else if (realizadoHoje == null) status = 'nao_comecou';
  else if (metaHoje <= 0) status = 'acima_ritmo';
  else {
    // esperado até agora: proporcional às horas lançadas; sem horas lançadas, compara com o dia inteiro
    const esperado = horasHoje != null && horasNecessariasHoje != null && horasNecessariasHoje > 0
      ? metaHoje * Math.min(1, horasHoje / horasNecessariasHoje)
      : metaHoje;
    const razao = esperado > 0 ? realizadoHoje / esperado : 1;
    status = razao >= 1.05 ? 'acima_ritmo' : razao >= 0.95 ? 'no_ritmo' : 'abaixo_ritmo';
  }

  return {
    metaHoje,
    metaDiariaOriginal: arred(seguro(i.metaDiariaOriginal)),
    realizadoHoje,
    faltanteHoje,
    horasRestantes,
    horasNecessariasHoje,
    horasTrabalhadasHoje: horasHoje,
    sobreAMeta,
    pctDia,
    status,
  };
}

// ---------------------------------------------------------------------------
// RITMO DO MÊS + DIAS SEM PRODUÇÃO (Módulos 3/4)
// ---------------------------------------------------------------------------

export type RitmoMes = {
  metaMensal: number;
  metaDiariaOriginal: number; // conceito DIFERENTE da meta restante (Módulo 3)
  realizado: number;
  cobertura: number; // %
  diasPlanejados: number;
  diasTrabalhados: number; // dias com lançamento
  diasPlanejadosDecorridos: number; // estimativa proporcional ao calendário (fórmula declarada)
  diasRestantesPlanejados: number;
  diasSemProducao: number; // planejados decorridos − trabalhados (nunca negativo)
  metaRestanteDia: number | null; // falta ÷ dias restantes (null sem dias restantes)
  esperadoAteAgora: number; // meta diária original × dias planejados decorridos
  deltaRitmo: number; // realizado − esperado (negativo = abaixo do ritmo)
  ritmo: 'acima' | 'no_ritmo' | 'abaixo' | 'sem_dado';
};

/** Módulos 3/4 — ritmo do mês. Dias planejados decorridos = proporcional aos dias corridos
 *  (diaAtual × diasPlanejados ÷ diasNoMes) — o sistema NÃO conhece a escala real do motorista,
 *  e a fórmula fica declarada. Sem lançamento nenhum → ritmo 'sem_dado' (nada inventado). */
export function ritmoDoMes(i: {
  metaMensal: number;
  metaDiariaOriginal: number;
  realizado: number;
  diasPlanejados: number;
  diasTrabalhados: number;
  diaAtual: number; // dia do mês (1..31)
  diasNoMes: number;
}): RitmoMes {
  const planejados = Number.isFinite(i.diasPlanejados) && i.diasPlanejados >= 1 ? Math.min(Math.floor(i.diasPlanejados), 31) : 26;
  const noMes = Number.isFinite(i.diasNoMes) && i.diasNoMes >= 28 ? i.diasNoMes : 30;
  const diaAtual = Math.min(Math.max(seguro(i.diaAtual), 1), noMes);
  const trabalhados = Math.max(0, Math.floor(seguro(i.diasTrabalhados)));
  const decorridos = Math.min(planejados, Math.round((diaAtual * planejados) / noMes));
  const restantes = Math.max(0, planejados - decorridos);
  const meta = seguro(i.metaMensal);
  const realizado = seguro(i.realizado);
  const esperado = arred(seguro(i.metaDiariaOriginal) * decorridos);
  const delta = arred(realizado - esperado);
  return {
    metaMensal: meta,
    metaDiariaOriginal: arred(seguro(i.metaDiariaOriginal)),
    realizado: arred(realizado),
    cobertura: meta > 0 ? Math.round((realizado / meta) * 100) : 0,
    diasPlanejados: planejados,
    diasTrabalhados: trabalhados,
    diasPlanejadosDecorridos: decorridos,
    diasRestantesPlanejados: restantes,
    diasSemProducao: Math.max(0, decorridos - trabalhados),
    metaRestanteDia: rebalancear(meta, realizado, restantes),
    esperadoAteAgora: esperado,
    deltaRitmo: delta,
    ritmo: trabalhados === 0 ? 'sem_dado' : delta > esperado * 0.02 + 0.005 ? 'acima' : delta < -(esperado * 0.02) - 0.005 ? 'abaixo' : 'no_ritmo',
  };
}

// ---------------------------------------------------------------------------
// BANCO DE DIAS (saldo de meta) + BANCO DE HORAS (Módulos 15/16)
// ---------------------------------------------------------------------------

/** Módulo 15 — desempenho acumulado contra a meta diária NOS DIAS TRABALHADOS.
 *  NÃO é dinheiro guardado — é a soma dos (realizado − meta) de cada dia lançado. */
export function saldoMeta(metaDiariaOriginal: number, ganhos: { valor: number }[]): number {
  const meta = seguro(metaDiariaOriginal);
  return arred(ganhos.reduce((s, g) => s + (seguro(g.valor) - meta), 0));
}

/** Módulo 16 — horas realizadas × horas necessárias, SÓ nos dias em que o motorista lançou
 *  horas (nada estimado onde não há dado). null = nenhum dia com horas lançadas. */
export function saldoHoras(horasNecessariasPorDia: number | null, ganhos: { horas: number | null }[]): { saldo: number; diasComHoras: number } | null {
  if (horasNecessariasPorDia == null || !Number.isFinite(horasNecessariasPorDia) || horasNecessariasPorDia <= 0) return null;
  const comHoras = ganhos.filter((g) => g.horas != null && Number.isFinite(g.horas) && g.horas > 0);
  if (comHoras.length === 0) return null;
  const realizadas = comHoras.reduce((s, g) => s + (g.horas as number), 0);
  const necessarias = horasNecessariasPorDia * comHoras.length;
  return { saldo: Math.round((realizadas - necessarias) * 100) / 100, diasComHoras: comHoras.length };
}

// ---------------------------------------------------------------------------
// PROJEÇÃO DO MÊS (Módulo 22) — fórmula transparente, nunca inventa.
// ---------------------------------------------------------------------------

export type ProjecaoMes = {
  projecao: number;
  mediaPorDiaTrabalhado: number;
  diasUsados: number;
  diasRestantes: number;
  diferencaDaMeta: number;
  formula: string; // declarada na tela (Módulo 22: "a fórmula precisa ser transparente")
} | null;

/** Projeção = realizado + (média por dia trabalhado × dias de trabalho restantes).
 *  Exige no MÍNIMO 3 dias lançados — senão retorna null ("Sem dados suficientes para projetar"). */
export function projecaoMes(i: { realizado: number; diasTrabalhados: number; diasRestantesPlanejados: number; metaMensal: number }): ProjecaoMes {
  const dias = Math.floor(seguro(i.diasTrabalhados));
  if (dias < 3) return null;
  const restantes = Math.max(0, Math.floor(seguro(i.diasRestantesPlanejados)));
  const media = arred(seguro(i.realizado) / dias);
  const projecao = arred(seguro(i.realizado) + media * restantes);
  return {
    projecao,
    mediaPorDiaTrabalhado: media,
    diasUsados: dias,
    diasRestantes: restantes,
    diferencaDaMeta: arred(projecao - seguro(i.metaMensal)),
    formula: `${formatBRL(seguro(i.realizado))} já lançados + média de ${formatBRL(media)}/dia trabalhado × ${restantes} dia(s) restante(s)`,
  };
}

// ---------------------------------------------------------------------------
// RECUPERAÇÃO (Módulo 7) — só matemática; NUNCA recomenda qual opção escolher.
// ---------------------------------------------------------------------------

export type OpcaoRecuperacao = { rotulo: string; detalhe: string };

export function opcoesRecuperacao(i: {
  faltaMes: number;
  metaDiariaOriginal: number;
  diasRestantes: number;
  rendaHora: number;
}): OpcaoRecuperacao[] {
  const falta = seguro(i.faltaMes);
  const dias = Math.max(0, Math.floor(seguro(i.diasRestantes)));
  if (falta <= 0 || dias <= 0) return [];
  const out: OpcaoRecuperacao[] = [];
  const novaMedia = arred(falta / dias);
  const extraPorDia = arred(Math.max(0, novaMedia - seguro(i.metaDiariaOriginal)));
  if (extraPorDia > 0) {
    out.push({
      rotulo: `+${formatBRL(extraPorDia)} por dia`,
      detalhe: `Média de ${formatBRL(novaMedia)}/dia nos ${dias} dia(s) restante(s), em vez de ${formatBRL(seguro(i.metaDiariaOriginal))}.`,
    });
  }
  const mediaComDiaExtra = arred(falta / (dias + 1));
  out.push({
    rotulo: '+1 dia trabalhado',
    detalhe: `Com ${dias + 1} dia(s), a média necessária cai para ${formatBRL(mediaComDiaExtra)}/dia.`,
  });
  const renda = seguro(i.rendaHora);
  if (renda > 0 && extraPorDia > 0) {
    const horasExtras = extraPorDia / renda;
    out.push({
      rotulo: `+${formatHoras(horasExtras)} por dia`,
      detalhe: `${formatHoras(horasExtras)} a mais por dia na premissa de ${formatBRL(renda)}/h cobrem os ${formatBRL(extraPorDia)}/dia extras.`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CENÁRIOS PREDEFINIDOS (Módulo 23) — simulação matemática; não é recomendação.
// ---------------------------------------------------------------------------

export type Cenario = { rotulo: string; impacto: string };

export function cenariosPredefinidos(base: { custoTotal: number; diasTrabalho: number; rendaHora: number }): Cenario[] {
  const atual = calcularMeta(base.custoTotal, base.diasTrabalho, base.rendaHora);
  const out: Cenario[] = [];
  if (atual.horasPorDia != null && atual.rendaHora > 0) {
    const ganhoDia = arred(1 * atual.rendaHora);
    out.push({ rotulo: '+1h por dia', impacto: `≈ +${formatBRL(ganhoDia)}/dia (+${formatBRL(arred(ganhoDia * atual.diasTrabalho))}/mês) na premissa de ${formatBRL(atual.rendaHora)}/h.` });
    out.push({ rotulo: '+2h por dia', impacto: `≈ +${formatBRL(arred(2 * atual.rendaHora))}/dia (+${formatBRL(arred(2 * atual.rendaHora * atual.diasTrabalho))}/mês) na mesma premissa.` });
    const r5 = calcularMeta(base.custoTotal, base.diasTrabalho, base.rendaHora + 5);
    if (r5.horasPorDia != null) {
      out.push({ rotulo: `+R$ 5/h (${formatBRL(base.rendaHora + 5)}/h)`, impacto: `Horas necessárias caem de ${formatHoras(atual.horasPorDia)} para ${formatHoras(r5.horasPorDia)}/dia.` });
    }
  }
  const c90 = calcularMeta(base.custoTotal * 0.9, base.diasTrabalho, base.rendaHora);
  out.push({ rotulo: '−10% nos custos', impacto: `Meta diária cai de ${formatBRL(atual.metaDiaria)} para ${formatBRL(c90.metaDiaria)}.` });
  const d2 = calcularMeta(base.custoTotal, base.diasTrabalho + 2, base.rendaHora);
  out.push({ rotulo: '+2 dias trabalhados', impacto: `Meta diária cai de ${formatBRL(atual.metaDiaria)} para ${formatBRL(d2.metaDiaria)} (${d2.diasTrabalho} dias).` });
  return out;
}

// ---------------------------------------------------------------------------
// COMPARAÇÃO MENSAL (Módulo 20) — snapshots existentes; mês sem dado = NÃO INFORMADO.
// ---------------------------------------------------------------------------

export type ComparacaoMensal = {
  mesAtual: string;
  mesAnterior: string;
  totalAtual: number;
  totalAnterior: number;
  variacao: number;
  variacaoPct: number | null; // null quando o anterior é 0 (sem % inventado)
  porGrupo: { grupo: string; atual: number | null; anterior: number | null; variacao: number | null }[];
};

export function compararMeses(
  atual: { mes: string; total: number; por_grupo: Record<string, number> },
  anterior: { mes: string; total: number; por_grupo: Record<string, number> } | null,
): ComparacaoMensal | null {
  if (!anterior) return null;
  const variacao = arred(seguro(atual.total) - seguro(anterior.total));
  const grupos = ['vida', 'familia', 'carro', 'trabalho'];
  return {
    mesAtual: atual.mes,
    mesAnterior: anterior.mes,
    totalAtual: arred(seguro(atual.total)),
    totalAnterior: arred(seguro(anterior.total)),
    variacao,
    variacaoPct: seguro(anterior.total) > 0 ? Math.round((variacao / anterior.total) * 1000) / 10 : null,
    porGrupo: grupos.map((g) => {
      const a = atual.por_grupo?.[g];
      const b = anterior.por_grupo?.[g];
      const temA = a != null && Number.isFinite(a);
      const temB = b != null && Number.isFinite(b);
      return {
        grupo: g,
        atual: temA ? arred(a) : null,
        anterior: temB ? arred(b) : null,
        variacao: temA && temB ? arred(a - b) : null,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// ALERTAS DO COCKPIT (Módulo 21) — complementa alertasMeta; SEMPRE factual.
// ---------------------------------------------------------------------------

export function alertasCockpit(i: {
  ritmo: RitmoMes | null;
  objetivos: { nome: string; valor_meta: number; valor_atual: number }[];
}): string[] {
  const alertas: string[] = [];
  if (i.ritmo && i.ritmo.ritmo !== 'sem_dado' && Math.abs(i.ritmo.deltaRitmo) >= 1) {
    if (i.ritmo.ritmo === 'abaixo') alertas.push(`Você está ${formatBRL(Math.abs(i.ritmo.deltaRitmo))} abaixo do ritmo estimado.`);
    if (i.ritmo.ritmo === 'acima') alertas.push(`Você está ${formatBRL(i.ritmo.deltaRitmo)} acima do ritmo estimado.`);
  }
  for (const o of i.objetivos) {
    const falta = arred(Math.max(0, seguro(o.valor_meta) - seguro(o.valor_atual)));
    if (falta > 0) alertas.push(`Faltam ${formatBRL(falta)} para o objetivo "${o.nome}".`);
  }
  return alertas;
}

// ===========================================================================
// FASE 10 — INTELIGÊNCIA OPERACIONAL REAL (mesmo motor; TUDO derivado dos registros
// manuais do motorista — o sistema NÃO tem telemetria, km/dia, corridas nem Uber/99,
// e nada aqui finge ter. Rótulos: DADO REGISTRADO × IMPORTADO × PREMISSA × ESTIMATIVA.)
// ===========================================================================

export type GanhoDia = { data: string; valor: number; horas: number | null };

// ---------------------------------------------------------------------------
// MÉDIAS REAIS (Módulos 1/2/3) — só sobre o que foi REGISTRADO; sem dado → null.
// ---------------------------------------------------------------------------

/** R$/hora REAL: Σ valor ÷ Σ horas, SÓ nos dias com valor E horas lançados. */
export function mediaRealPorHora(ganhos: GanhoDia[]): { valor: number; dias: number; horas: number } | null {
  const completos = ganhos.filter((g) => seguro(g.valor) > 0 && g.horas != null && Number.isFinite(g.horas) && g.horas > 0);
  if (completos.length === 0) return null;
  const totalValor = completos.reduce((s, g) => s + seguro(g.valor), 0);
  const totalHoras = completos.reduce((s, g) => s + (g.horas as number), 0);
  if (totalHoras <= 0) return null;
  return { valor: arred(totalValor / totalHoras), dias: completos.length, horas: Math.round(totalHoras * 10) / 10 };
}

/** R$/dia REAL: Σ valor ÷ dias registrados (qualquer registro conta como dia trabalhado). */
export function mediaRealPorDia(ganhos: GanhoDia[]): { valor: number; dias: number } | null {
  if (ganhos.length === 0) return null;
  const total = ganhos.reduce((s, g) => s + seguro(g.valor), 0);
  return { valor: arred(total / ganhos.length), dias: ganhos.length };
}

/** Módulo 14 — eficiência = real ÷ premissa, em % (119,5). null sem premissa/real. */
export function eficienciaVsPremissa(realHora: number | null, premissa: number): number | null {
  if (realHora == null || !Number.isFinite(realHora) || realHora <= 0) return null;
  const p = seguro(premissa);
  if (p <= 0) return null;
  return Math.round((realHora / p) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// CUSTOS DERIVADOS (Módulos 4/5) — REUSA a normalização/meta existentes.
// ---------------------------------------------------------------------------

/** Custo por dia planejado: custo mensal ÷ dias planejados (mesma conta da meta diária). */
export function custoPorDiaPlanejado(custoMensal: number, diasPlanejados: number): number {
  return calcularMeta(custoMensal, diasPlanejados, 0).metaDiaria; // reuso — nenhuma fórmula nova
}

/** Módulo 5 — custo por hora REAL: custo do período ÷ horas registradas. null sem horas. */
export function custoPorHoraReal(custoPeriodo: number, horasRegistradas: number): number | null {
  const h = seguro(horasRegistradas);
  if (h <= 0) return null;
  return arred(seguro(custoPeriodo) / h);
}

// ---------------------------------------------------------------------------
// JANELAS 7/14/30 DIAS (Módulo 8) + TENDÊNCIA (Módulo 9)
// ---------------------------------------------------------------------------

/** GanhoDia + campos opcionais do diário (Fase 12.1) — km_rodado continua derivado. */
export type GanhoJanela = GanhoDia & {
  km_inicio?: number | null;
  km_fim?: number | null;
  corridas?: number | null;
};

export type JanelaOperacional = {
  dias: number; // tamanho da janela
  diasRegistrados: number;
  diasComHoras: number;
  ganhoTotal: number;
  horasTotal: number | null; // null quando nenhum dia tem horas
  rsDia: number | null;
  rsHora: number | null;
  custoEstimado: number; // ESTIMATIVA: custo/dia planejado × dias registrados (fórmula declarada)
  cobertura: number | null; // ganho − custo estimado (SOBRA REGISTRADA — nunca "lucro")
  // Fase 12.2 — diário agregado na janela (só REGISTROS; ausente → null)
  kmTotal: number | null;
  kmPorDia: number | null; // km ÷ dias com km
  rpkm: number | null;
  corridasTotal: number | null;
  rpCorrida: number | null;
  recargasQtd: number;
  custoOperacionalRegistrado: number; // Σ recargas da janela
  custoPorKmRegistrado: number | null; // recargas ÷ km
};

/** Filtra ganhos numa janela de N dias terminando em `ateIso` (inclusive). */
export function ganhosNaJanela<T extends GanhoDia>(ganhos: T[], diasJanela: number, ateIso: string): T[] {
  const fim = new Date(`${ateIso}T12:00:00`).getTime();
  const inicio = fim - (Math.max(1, Math.floor(diasJanela)) - 1) * 86_400_000;
  return ganhos.filter((g) => {
    const t = new Date(`${g.data}T12:00:00`).getTime();
    return Number.isFinite(t) && t >= inicio && t <= fim;
  });
}

export function janelaOperacional(
  ganhos: GanhoJanela[],
  diasJanela: number,
  ateIso: string,
  custoDiaPlanejado: number,
  recargas: RecargaDia[] = [],
): JanelaOperacional {
  const doPeriodo = ganhosNaJanela(ganhos, diasJanela, ateIso);
  const ganhoTotal = arred(doPeriodo.reduce((s, g) => s + seguro(g.valor), 0));
  const comHoras = doPeriodo.filter((g) => g.horas != null && Number.isFinite(g.horas) && g.horas > 0);
  const horasTotal = comHoras.length > 0 ? Math.round(comHoras.reduce((s, g) => s + (g.horas as number), 0) * 10) / 10 : null;
  const rsHoraInfo = mediaRealPorHora(doPeriodo);
  const custoEstimado = arred(seguro(custoDiaPlanejado) * doPeriodo.length);
  // Fase 12.2 — km/corridas/recargas da janela (nada preenchido quando ausente)
  const comKm = doPeriodo
    .map((g) => calcularKmRodados(g.km_inicio ?? null, g.km_fim ?? null))
    .filter((km): km is number => km != null);
  const kmTotal = comKm.length > 0 ? Math.round(comKm.reduce((s, km) => s + km, 0) * 10) / 10 : null;
  const corridasDias = doPeriodo.filter((g) => g.corridas != null && Number.isFinite(g.corridas) && (g.corridas as number) > 0);
  const corridasTotal = corridasDias.length > 0 ? corridasDias.reduce((s, g) => s + Math.floor(g.corridas as number), 0) : null;
  const recargasJanela = recargas.filter((r) => {
    const t = new Date(`${r.data}T12:00:00`).getTime();
    const fim = new Date(`${ateIso}T12:00:00`).getTime();
    return Number.isFinite(t) && t >= fim - (Math.max(1, Math.floor(diasJanela)) - 1) * 86_400_000 && t <= fim;
  });
  const custoOperacional = arred(recargasJanela.reduce((s, r) => s + seguro(r.custo), 0));
  return {
    dias: diasJanela,
    diasRegistrados: doPeriodo.length,
    diasComHoras: comHoras.length,
    ganhoTotal,
    horasTotal,
    rsDia: doPeriodo.length > 0 ? arred(ganhoTotal / doPeriodo.length) : null,
    rsHora: rsHoraInfo?.valor ?? null,
    custoEstimado,
    cobertura: doPeriodo.length > 0 ? arred(ganhoTotal - custoEstimado) : null,
    kmTotal,
    kmPorDia: kmTotal != null && comKm.length > 0 ? Math.round((kmTotal / comKm.length) * 10) / 10 : null,
    rpkm: calcularRpKm(ganhoTotal, kmTotal),
    corridasTotal,
    rpCorrida: corridasTotal != null
      ? calcularRpCorrida(arred(corridasDias.reduce((s, g) => s + seguro(g.valor), 0)), corridasTotal)
      : null,
    recargasQtd: recargasJanela.length,
    custoOperacionalRegistrado: custoOperacional,
    custoPorKmRegistrado: calcularCustoKm(custoOperacional, kmTotal),
  };
}

/** Módulo 9 — tendência: janela atual × janela imediatamente anterior (mesmo tamanho).
 *  Compara R$/h quando os dois lados têm horas; senão R$/dia; senão null. Só matemática. */
export function tendencia(ganhos: GanhoDia[], diasJanela: number, ateIso: string): {
  metrica: 'rs_hora' | 'rs_dia';
  atual: number;
  anterior: number;
  variacaoPct: number;
} | null {
  const atualJ = ganhosNaJanela(ganhos, diasJanela, ateIso);
  const fimAnterior = new Date(new Date(`${ateIso}T12:00:00`).getTime() - diasJanela * 86_400_000).toISOString().slice(0, 10);
  const anteriorJ = ganhosNaJanela(ganhos, diasJanela, fimAnterior);
  if (atualJ.length < 3 || anteriorJ.length < 3) return null; // dados insuficientes — nada inventado
  const hA = mediaRealPorHora(atualJ);
  const hB = mediaRealPorHora(anteriorJ);
  if (hA && hB && hB.valor > 0) {
    return { metrica: 'rs_hora', atual: hA.valor, anterior: hB.valor, variacaoPct: Math.round(((hA.valor - hB.valor) / hB.valor) * 1000) / 10 };
  }
  const dA = mediaRealPorDia(atualJ);
  const dB = mediaRealPorDia(anteriorJ);
  if (dA && dB && dB.valor > 0) {
    return { metrica: 'rs_dia', atual: dA.valor, anterior: dB.valor, variacaoPct: Math.round(((dA.valor - dB.valor) / dB.valor) * 1000) / 10 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// PONTO DE EQUILÍBRIO DUPLO (Módulo 7) — estimado (premissa) × observado (registros).
// ---------------------------------------------------------------------------

export function pontoEquilibrioDuplo(custoDia: number, premissaHora: number, realHora: number | null): {
  estimadoHoras: number | null;
  observadoHoras: number | null;
} {
  const c = seguro(custoDia);
  // precisão preservada — a formatação em h/min (formatHoras) acontece só na exibição
  return {
    estimadoHoras: seguro(premissaHora) > 0 ? c / premissaHora : null,
    observadoHoras: realHora != null && seguro(realHora) > 0 ? c / realHora : null,
  };
}

// ---------------------------------------------------------------------------
// CONFIANÇA (Módulo 16) — classificação OPERACIONAL da quantidade de registros
// (não é confiança estatística) — e QUALIDADE (Módulo 19).
// ---------------------------------------------------------------------------

export type ConfiancaDados = 'insuficiente' | 'base_inicial' | 'consistente' | 'relevante';

export const CONFIANCA_LABEL: Record<ConfiancaDados, string> = {
  insuficiente: 'Dados insuficientes',
  base_inicial: 'Base inicial',
  consistente: 'Base consistente',
  relevante: 'Histórico relevante',
};

export function confiancaDados(diasRegistrados: number): ConfiancaDados {
  const d = Math.max(0, Math.floor(seguro(diasRegistrados)));
  if (d < 3) return 'insuficiente';
  if (d <= 6) return 'base_inicial';
  if (d <= 13) return 'consistente';
  return 'relevante';
}

export type QualidadeDados = {
  registrados: number;
  completos: number; // valor > 0 E horas informadas
  incompletos: number;
  semHoras: number;
  horasSemGanho: number; // horas > 0 com valor 0
  valoresZero: number;
};

export function qualidadeDados(ganhos: GanhoDia[]): QualidadeDados {
  let completos = 0, semHoras = 0, horasSemGanho = 0, valoresZero = 0;
  for (const g of ganhos) {
    const temValor = seguro(g.valor) > 0;
    const temHoras = g.horas != null && Number.isFinite(g.horas) && g.horas > 0;
    if (temValor && temHoras) completos++;
    if (temValor && !temHoras) semHoras++;
    if (!temValor && temHoras) horasSemGanho++;
    if (!temValor) valoresZero++;
  }
  return { registrados: ganhos.length, completos, incompletos: ganhos.length - completos, semHoras, horasSemGanho, valoresZero };
}

// ---------------------------------------------------------------------------
// MELHORES/PIORES DIAS DA SEMANA (Módulo 10) — só com observações mínimas.
// ---------------------------------------------------------------------------

export const DIA_SEMANA_LABEL = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

export type MediaDiaSemana = { diaSemana: number; label: string; media: number; observacoes: number; metrica: 'rs_hora' | 'rs_dia' };

/** Agrupa por dia da semana. Exige ≥ minObs observações por dia (default 2) e só devolve os
 *  dias que atingem o mínimo. "Maior média registrada" — NUNCA "melhor dia para trabalhar". */
export function mediasPorDiaSemana(ganhos: GanhoDia[], minObs = 2): MediaDiaSemana[] {
  const grupos = new Map<number, GanhoDia[]>();
  for (const g of ganhos) {
    const dt = new Date(`${g.data}T12:00:00`);
    if (Number.isNaN(dt.getTime())) continue;
    const ds = dt.getDay();
    grupos.set(ds, [...(grupos.get(ds) ?? []), g]);
  }
  const out: MediaDiaSemana[] = [];
  for (const [ds, lista] of grupos) {
    if (lista.length < Math.max(1, minObs)) continue;
    const porHora = mediaRealPorHora(lista);
    if (porHora && porHora.dias >= Math.max(1, minObs)) {
      out.push({ diaSemana: ds, label: DIA_SEMANA_LABEL[ds], media: porHora.valor, observacoes: porHora.dias, metrica: 'rs_hora' });
      continue;
    }
    const porDia = mediaRealPorDia(lista);
    if (porDia) out.push({ diaSemana: ds, label: DIA_SEMANA_LABEL[ds], media: porDia.valor, observacoes: porDia.dias, metrica: 'rs_dia' });
  }
  return out.sort((a, b) => b.media - a.media);
}

// ---------------------------------------------------------------------------
// PROJEÇÕES DUPLAS (Módulo 15) — origem SEMPRE declarada.
// ---------------------------------------------------------------------------

export type ProjecoesDuplas = {
  pelaPremissa: { valor: number; formula: string };
  peloHistorico: { valor: number; formula: string } | null; // null com < 3 dias registrados
};

export function projecoesDuplas(i: {
  realizado: number;
  diasRestantes: number;
  metaDiariaOriginal: number; // premissa (custo ÷ dias, na renda/hora informada)
  mediaRealDia: number | null;
  diasRegistrados: number;
}): ProjecoesDuplas {
  const restantes = Math.max(0, Math.floor(seguro(i.diasRestantes)));
  const realizado = seguro(i.realizado);
  const pelaPremissa = arred(realizado + seguro(i.metaDiariaOriginal) * restantes);
  const temHistorico = i.mediaRealDia != null && Number.isFinite(i.mediaRealDia) && i.diasRegistrados >= 3;
  return {
    pelaPremissa: {
      valor: pelaPremissa,
      formula: `${formatBRL(realizado)} registrados + meta diária da PREMISSA (${formatBRL(seguro(i.metaDiariaOriginal))}) × ${restantes} dia(s)`,
    },
    peloHistorico: temHistorico
      ? {
          valor: arred(realizado + (i.mediaRealDia as number) * restantes),
          formula: `${formatBRL(realizado)} registrados + SUA média registrada (${formatBRL(i.mediaRealDia as number)}/dia, ${i.diasRegistrados} dias) × ${restantes} dia(s)`,
        }
      : null,
  };
}

// ===========================================================================
// FASE 11 — PLANO OPERACIONAL DIÁRIO (mesmo motor; TUDO reusa rebalancear/
// calcularMetaHoje/mediaRealPorHora. Cálculo, nunca conselho: "Se você ...,
// matematicamente ..." — a decisão é do motorista.)
// ===========================================================================

/** Horas para gerar um valor numa taxa (premissa OU histórico) — null-safe, nunca Infinity. */
export function horasParaValor(valor: number, taxaHora: number | null): number | null {
  if (taxaHora == null || !Number.isFinite(taxaHora) || taxaHora <= 0) return null;
  return seguro(valor) / taxaHora;
}

// ---------------------------------------------------------------------------
// SE EU PARAR AGORA (Módulo 5) — consequência matemática, sem incentivo.
// ---------------------------------------------------------------------------

export type PararAgora = {
  realizadoHoje: number;
  metaHoje: number;
  diferencaHoje: number; // realizado − meta (negativa quando abaixo)
  novaMetaDia: number | null; // média necessária nos dias DEPOIS de hoje (null no último dia c/ falta)
  faltaDepoisDeHoje: number;
};

export function seEuPararAgora(i: {
  metaMensal: number;
  realizadoAcumuladoIncluindoHoje: number;
  diasRestantesDepoisDeHoje: number;
  metaHoje: number;
  realizadoHoje: number | null;
}): PararAgora | null {
  if (i.realizadoHoje == null) return null; // sem lançamento → "não é possível calcular" (nada inventado)
  const realizadoHoje = seguro(i.realizadoHoje);
  const metaHoje = seguro(i.metaHoje);
  const faltaDepois = Math.max(0, seguro(i.metaMensal) - seguro(i.realizadoAcumuladoIncluindoHoje));
  return {
    realizadoHoje,
    metaHoje,
    diferencaHoje: arred(realizadoHoje - metaHoje),
    novaMetaDia: rebalancear(i.metaMensal, i.realizadoAcumuladoIncluindoHoje, i.diasRestantesDepoisDeHoje),
    faltaDepoisDeHoje: arred(faltaDepois),
  };
}

// ---------------------------------------------------------------------------
// SE EU TRABALHAR MAIS/MENOS (Módulos 6/7) — SIMULAÇÃO pura; nada é gravado.
// ---------------------------------------------------------------------------

export type SimulacaoHoras = {
  horas: number; // pode ser negativa (−1h, −2h)
  taxaUsada: number;
  origemTaxa: 'historico' | 'premissa';
  ganhoAdicional: number; // negativo quando horas < 0
  novaFaltaHoje: number;
  novaMetaRestanteDia: number | null; // impacto nos dias DEPOIS de hoje
};

export function simularHorasExtras(i: {
  horas: number;
  premissaHora: number;
  historicoHora: number | null; // usa histórico quando disponível (origem declarada)
  metaHoje: number;
  realizadoHoje: number;
  metaMensal: number;
  realizadoAcumuladoIncluindoHoje: number;
  diasRestantesDepoisDeHoje: number;
}): SimulacaoHoras | null {
  const temHistorico = i.historicoHora != null && Number.isFinite(i.historicoHora) && i.historicoHora > 0;
  const taxa = temHistorico ? (i.historicoHora as number) : seguro(i.premissaHora);
  if (taxa <= 0 || !Number.isFinite(i.horas) || i.horas === 0) return null;
  const ganhoAdicional = arred(i.horas * taxa);
  const novoRealizadoHoje = Math.max(0, seguro(i.realizadoHoje) + ganhoAdicional);
  const novoAcumulado = Math.max(0, seguro(i.realizadoAcumuladoIncluindoHoje) + ganhoAdicional);
  return {
    horas: i.horas,
    taxaUsada: taxa,
    origemTaxa: temHistorico ? 'historico' : 'premissa',
    ganhoAdicional,
    novaFaltaHoje: arred(Math.max(0, seguro(i.metaHoje) - novoRealizadoHoje)),
    novaMetaRestanteDia: rebalancear(i.metaMensal, novoAcumulado, i.diasRestantesDepoisDeHoje),
  };
}

// ---------------------------------------------------------------------------
// META DE AMANHÃ (Módulo 12) — original NUNCA muda; rebalanceada é derivada.
// ---------------------------------------------------------------------------

export function metaDeAmanha(i: {
  metaMensal: number;
  realizadoAcumuladoIncluindoHoje: number;
  diasRestantesDepoisDeHoje: number;
  metaDiariaOriginal: number;
}): { original: number; rebalanceada: number | null } {
  return {
    original: arred(seguro(i.metaDiariaOriginal)),
    rebalanceada: rebalancear(i.metaMensal, i.realizadoAcumuladoIncluindoHoje, i.diasRestantesDepoisDeHoje),
  };
}

// ---------------------------------------------------------------------------
// VISÃO SEMANAL + "COMO ESTOU INDO?" (Módulos 14/15) — semana Seg→Dom corrente.
// ---------------------------------------------------------------------------

export type DiaSemanaResumo = {
  label: string; // SEG..DOM
  data: string;
  valor: number | null;
  horas: number | null;
  status: StatusDiaMeta;
  encerrado: boolean;
  futuro: boolean;
};

export type ResumoSemana = {
  dias: DiaSemanaResumo[];
  totalValor: number;
  totalHoras: number | null;
  rsHora: number | null;
  diasRegistrados: number;
  metaSemanalEstimada: number; // ESTIMATIVA: meta diária original × dias planejados/semana
  diasPlanejadosSemana: number;
  diferenca: number; // registrado − meta semanal estimada
};

const ORDEM_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const;

export function resumoSemana(
  ganhos: (GanhoDia & { observacao?: string | null })[],
  hojeIso: string,
  metaDiariaOriginal: number,
  diasPlanejadosMes: number,
  diasNoMes: number,
): ResumoSemana {
  const hoje = new Date(`${hojeIso}T12:00:00`);
  const dow = hoje.getDay(); // 0=DOM
  const offsetSegunda = dow === 0 ? 6 : dow - 1;
  const porData = new Map(ganhos.map((g) => [g.data, g]));
  const dias: DiaSemanaResumo[] = [];
  let totalValor = 0;
  let totalHoras = 0;
  let temHoras = false;
  let registrados = 0;
  for (let idx = 0; idx < 7; idx++) {
    const dt = new Date(hoje.getTime() + (idx - offsetSegunda) * 86_400_000);
    const iso = dt.toISOString().slice(0, 10);
    const g = porData.get(iso);
    const futuro = iso > hojeIso;
    if (g) {
      registrados++;
      totalValor += seguro(g.valor);
      if (g.horas != null && Number.isFinite(g.horas) && g.horas > 0) {
        temHoras = true;
        totalHoras += g.horas;
      }
      const dif = seguro(g.valor) - seguro(metaDiariaOriginal);
      dias.push({
        label: ORDEM_SEMANA[idx],
        data: iso,
        valor: seguro(g.valor),
        horas: g.horas != null && Number.isFinite(g.horas) ? g.horas : null,
        status: dif > 0.005 ? 'acima' : dif < -0.005 ? 'abaixo' : 'atingida',
        encerrado: g.observacao === 'dia_encerrado',
        futuro,
      });
    } else {
      dias.push({ label: ORDEM_SEMANA[idx], data: iso, valor: null, horas: null, status: 'sem_dado', encerrado: false, futuro });
    }
  }
  const rsH = mediaRealPorHora(dias.filter((d) => d.valor != null).map((d) => ({ data: d.data, valor: d.valor as number, horas: d.horas })));
  const planejMes = Number.isFinite(diasPlanejadosMes) && diasPlanejadosMes >= 1 ? Math.min(Math.floor(diasPlanejadosMes), 31) : 26;
  const noMes = Number.isFinite(diasNoMes) && diasNoMes >= 28 ? diasNoMes : 30;
  const diasPlanejadosSemana = Math.min(7, Math.max(1, Math.round((planejMes * 7) / noMes)));
  const metaSemanal = arred(seguro(metaDiariaOriginal) * diasPlanejadosSemana);
  return {
    dias,
    totalValor: arred(totalValor),
    totalHoras: temHoras ? Math.round(totalHoras * 10) / 10 : null,
    rsHora: rsH?.valor ?? null,
    diasRegistrados: registrados,
    metaSemanalEstimada: metaSemanal,
    diasPlanejadosSemana,
    diferenca: arred(totalValor - metaSemanal),
  };
}

// ===========================================================================
// FASE 12.1 — DIÁRIO OPERACIONAL REAL (mesmo motor; funções PURAS; nada acessa
// Supabase). km_rodado é DERIVADO (nunca coluna). Estimativa NUNCA vira registro.
// ===========================================================================

export type DiaOperacional = {
  valor: number;
  horas: number | null;
  km_inicio: number | null;
  km_fim: number | null;
  corridas: number | null;
  apps: string[] | null;
};

export type RecargaDia = { data: string; custo: number; kwh: number | null };

/** KM rodados = fim − inicio, SÓ quando os dois existem e fim ≥ inicio.
 *  Um só informado → null (a UI mostra "KM INCOMPLETO", nunca calcula). */
export function calcularKmRodados(kmInicio: number | null, kmFim: number | null): number | null {
  if (kmInicio == null || kmFim == null) return null;
  if (!Number.isFinite(kmInicio) || !Number.isFinite(kmFim) || kmInicio < 0 || kmFim < kmInicio) return null;
  return Math.round((kmFim - kmInicio) * 10) / 10;
}

/** R$/hora do dia (ganho ÷ horas). */
export function calcularRph(ganho: number, horas: number | null): number | null {
  if (horas == null || !Number.isFinite(horas) || horas <= 0) return null;
  return arred(seguro(ganho) / horas);
}

/** R$/km (ganho ÷ km rodados). */
export function calcularRpKm(ganho: number, kmRodados: number | null): number | null {
  if (kmRodados == null || !Number.isFinite(kmRodados) || kmRodados <= 0) return null;
  return arred(seguro(ganho) / kmRodados);
}

/** R$/corrida — SÓ quando corridas > 0 (senão NÃO INFORMADO). */
export function calcularRpCorrida(ganho: number, corridas: number | null): number | null {
  if (corridas == null || !Number.isFinite(corridas) || corridas <= 0) return null;
  return arred(seguro(ganho) / Math.floor(corridas));
}

/** Resultado OPERACIONAL do dia = ganho − custos operacionais REGISTRADOS do dia (recargas).
 *  NUNCA inclui aluguel/vida/família — isso é a camada de Meta (separação explícita). */
export function calcularResultadoOperacional(ganho: number, custosOperacionaisDia: number): number {
  return arred(seguro(ganho) - seguro(custosOperacionaisDia));
}

/** Consumo energético ESTIMADO = km × consumo_kwh_100km ÷ 100 (ficha do veículo).
 *  É ESTIMATIVA — nunca energia efetivamente carregada. */
export function calcularConsumoEstimado(kmRodados: number | null, consumoKwh100km: number | null): number | null {
  if (kmRodados == null || consumoKwh100km == null) return null;
  if (!Number.isFinite(kmRodados) || !Number.isFinite(consumoKwh100km) || kmRodados <= 0 || consumoKwh100km <= 0) return null;
  return Math.round(((kmRodados * consumoKwh100km) / 100) * 100) / 100;
}

/** Custo por km = custos registrados ÷ km registrados. Sem dado → null (NÃO INFORMADO). */
export function calcularCustoKm(custosRegistrados: number, kmRodados: number | null): number | null {
  if (kmRodados == null || !Number.isFinite(kmRodados) || kmRodados <= 0) return null;
  return arred(seguro(custosRegistrados) / kmRodados);
}

export type ResumoDiaOperacional = {
  ganho: number;
  horas: number | null;
  rph: number | null;
  kmRodados: number | null;
  kmIncompleto: boolean; // só UM dos odômetros informado
  rpkm: number | null;
  corridas: number | null;
  rpCorrida: number | null;
  apps: string[];
  custoRecargasDia: number;
  kwhRegistradoDia: number | null;
  resultadoOperacional: number;
  consumoEstimadoKwh: number | null;
  custoPorKm: number | null;
};

/** Monta o "SEU DIA" a partir do registro + recargas do MESMO dia (tudo registrado). */
export function resumoDiaOperacional(
  dia: DiaOperacional,
  recargasDoDia: RecargaDia[],
  consumoKwh100km: number | null,
): ResumoDiaOperacional {
  const ganho = seguro(dia.valor);
  const km = calcularKmRodados(dia.km_inicio, dia.km_fim);
  const custoRecargas = arred(recargasDoDia.reduce((s, r) => s + seguro(r.custo), 0));
  const kwhReg = recargasDoDia.filter((r) => r.kwh != null && Number.isFinite(r.kwh) && (r.kwh as number) > 0);
  return {
    ganho,
    horas: dia.horas != null && Number.isFinite(dia.horas) && dia.horas > 0 ? dia.horas : null,
    rph: calcularRph(ganho, dia.horas),
    kmRodados: km,
    kmIncompleto: (dia.km_inicio == null) !== (dia.km_fim == null),
    rpkm: calcularRpKm(ganho, km),
    corridas: dia.corridas != null && Number.isFinite(dia.corridas) && dia.corridas > 0 ? Math.floor(dia.corridas) : null,
    rpCorrida: calcularRpCorrida(ganho, dia.corridas),
    apps: Array.isArray(dia.apps) ? dia.apps : [],
    custoRecargasDia: custoRecargas,
    kwhRegistradoDia: kwhReg.length > 0 ? Math.round(kwhReg.reduce((s, r) => s + (r.kwh as number), 0) * 100) / 100 : null,
    resultadoOperacional: calcularResultadoOperacional(ganho, custoRecargas),
    consumoEstimadoKwh: calcularConsumoEstimado(km, consumoKwh100km),
    custoPorKm: calcularCustoKm(custoRecargas, km),
  };
}

export const APPS_DIARIO = ['uber', '99', 'outro', 'nenhum'] as const;
export const APP_LABEL: Record<string, string> = { uber: 'Uber', '99': '99', outro: 'Outro', nenhum: 'Nenhum' };

// ===========================================================================
// FASE 12.2 — INTELIGÊNCIA OPERACIONAL (o sistema DESCREVE os registros; não
// julga, não aconselha, não afirma causalidade. Tudo deriva de 0047/0048.)
// ===========================================================================

// ---------------------------------------------------------------------------
// EVOLUÇÃO período × período anterior equivalente (Módulos 4/5)
// ---------------------------------------------------------------------------

export type CampoEvolucao = {
  rotulo: string;
  atual: number | null;
  anterior: number | null;
  variacaoAbs: number | null;
  variacaoPct: number | null; // null quando anterior é 0/ausente (nunca Infinity)
};

export type Evolucao = { dias: number; campos: CampoEvolucao[] } | null;

function campoEvolucao(rotulo: string, atual: number | null, anterior: number | null): CampoEvolucao {
  const temAmbos = atual != null && anterior != null && Number.isFinite(atual) && Number.isFinite(anterior);
  return {
    rotulo,
    atual,
    anterior,
    variacaoAbs: temAmbos ? arred(atual - anterior) : null,
    variacaoPct: temAmbos && anterior !== 0 ? Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10 : null,
  };
}

/** Compara a janela atual com a imediatamente anterior (mesmo tamanho). REUSA janelaOperacional
 *  dos dois lados. Anterior com < 3 dias registrados → null ("SEM COMPARAÇÃO" — nada inventado). */
export function evolucaoPeriodo(
  ganhos: GanhoJanela[],
  recargas: RecargaDia[],
  diasJanela: number,
  ateIso: string,
  custoDiaPlanejado: number,
): Evolucao {
  const atual = janelaOperacional(ganhos, diasJanela, ateIso, custoDiaPlanejado, recargas);
  const fimAnterior = new Date(new Date(`${ateIso}T12:00:00`).getTime() - diasJanela * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const anterior = janelaOperacional(ganhos, diasJanela, fimAnterior, custoDiaPlanejado, recargas);
  if (atual.diasRegistrados < 3 || anterior.diasRegistrados < 3) return null;
  return {
    dias: diasJanela,
    campos: [
      campoEvolucao('Ganho', atual.ganhoTotal, anterior.ganhoTotal),
      campoEvolucao('Horas', atual.horasTotal, anterior.horasTotal),
      campoEvolucao('R$/h', atual.rsHora, anterior.rsHora),
      campoEvolucao('R$/dia', atual.rsDia, anterior.rsDia),
      campoEvolucao('Km', atual.kmTotal, anterior.kmTotal),
      campoEvolucao('Km/dia', atual.kmPorDia, anterior.kmPorDia),
      campoEvolucao('R$/km', atual.rpkm, anterior.rpkm),
      campoEvolucao('Corridas', atual.corridasTotal, anterior.corridasTotal),
      campoEvolucao('Custos registrados', atual.custoOperacionalRegistrado, anterior.custoOperacionalRegistrado),
      campoEvolucao('Custo/km', atual.custoPorKmRegistrado, anterior.custoPorKmRegistrado),
    ],
  };
}

// ---------------------------------------------------------------------------
// RECARGAS agregadas (Módulo 7) + ENERGIA (Módulo 8)
// ---------------------------------------------------------------------------

export type ResumoRecargas = {
  quantidade: number;
  custoTotal: number;
  custoMedio: number | null;
  kwhTotal: number | null; // só recargas COM kWh informado
  kwhMedio: number | null;
  recargasComKwh: number;
  rsPorKwh: number | null; // custo das recargas COM kWh ÷ kWh delas — nunca sem kWh
};

export function resumoRecargas(recargas: { custo: number; kwh: number | null }[]): ResumoRecargas {
  const qtd = recargas.length;
  const custoTotal = arred(recargas.reduce((s, r) => s + seguro(r.custo), 0));
  const comKwh = recargas.filter((r) => r.kwh != null && Number.isFinite(r.kwh) && (r.kwh as number) > 0);
  const kwhTotal = comKwh.length > 0 ? Math.round(comKwh.reduce((s, r) => s + (r.kwh as number), 0) * 100) / 100 : null;
  const custoComKwh = arred(comKwh.reduce((s, r) => s + seguro(r.custo), 0));
  return {
    quantidade: qtd,
    custoTotal,
    custoMedio: qtd > 0 ? arred(custoTotal / qtd) : null,
    kwhTotal,
    kwhMedio: kwhTotal != null && comKwh.length > 0 ? Math.round((kwhTotal / comKwh.length) * 100) / 100 : null,
    recargasComKwh: comKwh.length,
    rsPorKwh: kwhTotal != null && kwhTotal > 0 ? Math.round((custoComKwh / kwhTotal) * 100) / 100 : null,
  };
}

/** kWh ESTIMADO (ficha × km) × kWh REGISTRADO (recargas) — só compara com os DOIS presentes.
 *  A diferença é "entre fontes de registro"; o motor NUNCA diz qual está correta. */
export function compararEnergia(kwhEstimado: number | null, kwhRegistrado: number | null): {
  estimado: number;
  registrado: number;
  diferenca: number;
} | null {
  if (kwhEstimado == null || kwhRegistrado == null) return null;
  if (!Number.isFinite(kwhEstimado) || !Number.isFinite(kwhRegistrado) || kwhEstimado <= 0 || kwhRegistrado <= 0) return null;
  return {
    estimado: Math.round(kwhEstimado * 100) / 100,
    registrado: Math.round(kwhRegistrado * 100) / 100,
    diferenca: Math.round((kwhRegistrado - kwhEstimado) * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// QUALIDADE DOS REGISTROS em camadas (Módulo 6) — sem nota, sem juízo.
// ---------------------------------------------------------------------------

export type QualidadeOperacional = QualidadeDados & {
  comKm: number;
  comCorridas: number;
  comRecarga: number;
  /** COMPLETO (definição explícita): ganho > 0 E horas informadas E km calculável (início+fim). */
  completosDiario: number;
};

export function qualidadeOperacional(ganhos: GanhoJanela[], datasComRecarga: Set<string>): QualidadeOperacional {
  const base = qualidadeDados(ganhos); // REUSO da Fase 10
  let comKm = 0, comCorridas = 0, comRecarga = 0, completosDiario = 0;
  for (const g of ganhos) {
    const km = calcularKmRodados(g.km_inicio ?? null, g.km_fim ?? null);
    const temHoras = g.horas != null && Number.isFinite(g.horas) && g.horas > 0;
    if (km != null) comKm++;
    if (g.corridas != null && Number.isFinite(g.corridas) && (g.corridas as number) > 0) comCorridas++;
    if (datasComRecarga.has(g.data)) comRecarga++;
    if (seguro(g.valor) > 0 && temHoras && km != null) completosDiario++;
  }
  return { ...base, comKm, comCorridas, comRecarga, completosDiario };
}

// ---------------------------------------------------------------------------
// INCONSISTÊNCIAS FACTUAIS (Módulo 10) — o que foi encontrado / origem / o que falta.
// ---------------------------------------------------------------------------

export type Inconsistencia = { achado: string; origem: string; falta: string };

export function inconsistenciasOperacionais(i: {
  ganhos: GanhoJanela[];
  recargas: { data: string; custo: number; kwh: number | null }[];
  temRecorrenciaRecarga: boolean;
  divergenciaOdometroKm: number | null;
}): Inconsistencia[] {
  const out: Inconsistencia[] = [];
  const semHoras = i.ganhos.filter((g) => seguro(g.valor) > 0 && (g.horas == null || g.horas <= 0)).length;
  if (semHoras > 0) out.push({ achado: `${semHoras} dia(s) com ganho e sem horas`, origem: 'seus lançamentos de dia', falta: 'as horas trabalhadas desses dias' });
  const horasSemGanho = i.ganhos.filter((g) => seguro(g.valor) === 0 && g.horas != null && g.horas > 0).length;
  if (horasSemGanho > 0) out.push({ achado: `${horasSemGanho} dia(s) com horas e ganho zero`, origem: 'seus lançamentos de dia', falta: 'o ganho do dia (ou confirmar que foi zero mesmo)' });
  const kmSemGanho = i.ganhos.filter((g) => seguro(g.valor) === 0 && calcularKmRodados(g.km_inicio ?? null, g.km_fim ?? null) != null && (calcularKmRodados(g.km_inicio ?? null, g.km_fim ?? null) as number) > 0).length;
  if (kmSemGanho > 0) out.push({ achado: `${kmSemGanho} dia(s) com km rodados e ganho zero`, origem: 'odômetro do diário', falta: 'o ganho correspondente' });
  const corridasSemGanho = i.ganhos.filter((g) => seguro(g.valor) === 0 && g.corridas != null && (g.corridas as number) > 0).length;
  if (corridasSemGanho > 0) out.push({ achado: `${corridasSemGanho} dia(s) com corridas e ganho zero`, origem: 'corridas do diário', falta: 'o ganho correspondente' });
  const kmIncompleto = i.ganhos.filter((g) => (g.km_inicio == null) !== (g.km_fim == null)).length;
  if (kmIncompleto > 0) out.push({ achado: `${kmIncompleto} dia(s) com KM INCOMPLETO (um odômetro só)`, origem: 'odômetro do diário', falta: 'o outro odômetro para calcular os km' });
  const recargaSemKwh = i.recargas.filter((r) => r.kwh == null).length;
  if (recargaSemKwh > 0) out.push({ achado: `${recargaSemKwh} recarga(s) sem kWh`, origem: 'suas recargas registradas', falta: 'o kWh para calcular R$/kWh e comparar com a estimativa' });
  if (i.temRecorrenciaRecarga && i.recargas.length > 0) out.push({ achado: 'despesa recorrente de recarga E recargas individuais ao mesmo tempo', origem: 'despesas recorrentes + recargas registradas', falta: 'sua escolha: manter ou pausar a recorrência (nada muda sozinho)' });
  if (i.divergenciaOdometroKm != null && Math.abs(i.divergenciaOdometroKm) > 0) out.push({ achado: `odômetro do diário difere da última vistoria em ${Math.abs(i.divergenciaOdometroKm)} km`, origem: 'seu registro × vistoria do PrimeCharge', falta: 'nada — os valores foram registrados em fontes diferentes' });
  return out;
}

// ---------------------------------------------------------------------------
// CENÁRIOS OPERACIONAIS (Módulo 11) — EMBUTE os cenários da Fase 9 e acrescenta
// +3h, +1 dia e a linha com a média REGISTRADA (quando existir). Simulação pura.
// ---------------------------------------------------------------------------

export function cenariosOperacionais(
  base: { custoTotal: number; diasTrabalho: number; rendaHora: number },
  historicoHora: number | null,
): Cenario[] {
  const out = [...cenariosPredefinidos(base)]; // REUSO — nunca duplicar os 5 da Fase 9
  const atual = calcularMeta(base.custoTotal, base.diasTrabalho, base.rendaHora);
  if (atual.rendaHora > 0) {
    out.push({ rotulo: '+3h por dia', impacto: `≈ +${formatBRL(arred(3 * atual.rendaHora))}/dia (+${formatBRL(arred(3 * atual.rendaHora * atual.diasTrabalho))}/mês) na premissa de ${formatBRL(atual.rendaHora)}/h.` });
  }
  const d1 = calcularMeta(base.custoTotal, base.diasTrabalho + 1, base.rendaHora);
  out.push({ rotulo: '+1 dia trabalhado', impacto: `Meta diária cai de ${formatBRL(atual.metaDiaria)} para ${formatBRL(d1.metaDiaria)} (${d1.diasTrabalho} dias).` });
  if (historicoHora != null && Number.isFinite(historicoHora) && historicoHora > 0) {
    out.push({
      rotulo: `+2h na SUA média registrada (${formatBRL(historicoHora)}/h)`,
      impacto: `Com sua média registrada, +2 horas representariam matematicamente ${formatBRL(arred(2 * historicoHora))} adicionais no dia — simulação, não é promessa.`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CATEGORIAS SUGERIDAS (UX — Módulos 4/5/6/7)
// ---------------------------------------------------------------------------

export const CATEGORIAS_VIDA = ['aluguel_casa', 'condominio', 'energia', 'agua', 'gas', 'internet', 'telefone', 'alimentacao', 'plano_saude', 'medicamentos', 'pensao', 'roupas', 'lazer', 'streaming', 'outros'] as const;
export const CATEGORIAS_FAMILIA = ['escola', 'creche', 'plano_saude', 'transporte', 'atividades', 'alimentacao', 'outros'] as const;
export const CATEGORIAS_CARRO = ['combustivel', 'recarga', 'lavagem', 'manutencao', 'pneus', 'seguro_pessoal', 'franquia_reserva', 'ipva', 'licenciamento', 'aluguel_veiculo', 'outros'] as const;
export const CATEGORIAS_TRABALHO = ['pedagio', 'estacionamento', 'alimentacao_rua', 'celular_dados', 'outros'] as const;

export const CATEGORIA_LABEL: Record<string, string> = {
  aluguel_casa: 'Aluguel', condominio: 'Condomínio', energia: 'Energia', agua: 'Água', gas: 'Gás',
  internet: 'Internet', telefone: 'Telefone', alimentacao: 'Alimentação', plano_saude: 'Plano de saúde',
  medicamentos: 'Medicamentos', pensao: 'Pensão', roupas: 'Roupas', lazer: 'Lazer', streaming: 'Streaming',
  escola: 'Escola', creche: 'Creche', transporte: 'Transporte', atividades: 'Atividades',
  combustivel: 'Combustível', recarga: 'Recarga', lavagem: 'Lavagem', manutencao: 'Manutenção',
  pneus: 'Pneus', seguro_pessoal: 'Seguro', franquia_reserva: 'Franquia/Reserva', ipva: 'IPVA',
  licenciamento: 'Licenciamento', pedagio: 'Pedágio', estacionamento: 'Estacionamento',
  alimentacao_rua: 'Alimentação na rua', celular_dados: 'Celular/Dados', aluguel_veiculo: 'Aluguel do carro',
  outros: 'Outros',
};

export const GRUPO_LABEL: Record<GrupoDespesa, string> = {
  vida: 'Minha vida',
  familia: 'Minha família',
  carro: 'Meu carro',
  trabalho: 'Custo para trabalhar',
};

// ===========================================================================
// FASE 13 — CENTRO DE CONTROLE OPERACIONAL (reuso + camadas factuais novas)
// ===========================================================================

export type StatusMes = 'sem_dados' | 'inicio' | 'em_andamento' | 'dados_consistentes' | 'projecao_disponivel';

export const STATUS_MES_LABEL: Record<StatusMes, string> = {
  sem_dados: 'Sem dados',
  inicio: 'Início',
  em_andamento: 'Em andamento',
  dados_consistentes: 'Dados consistentes',
  projecao_disponivel: 'Projeção disponível',
};

export function statusDoMes(diasComLancamento: number, diasPlanejados: number, temProjecao: boolean): StatusMes {
  const d = Math.max(0, Math.floor(seguro(diasComLancamento)));
  if (d === 0) return 'sem_dados';
  if (d <= 2) return 'inicio';
  if (temProjecao) return 'projecao_disponivel';
  const p = Number.isFinite(diasPlanejados) && diasPlanejados > 0 ? Math.floor(diasPlanejados) : 26;
  if (d >= Math.floor(p * 0.3)) return 'dados_consistentes';
  return 'em_andamento';
}

export type ChecklistHoje = {
  ganho: 'registrado' | 'nao_informado';
  horas: 'registrado' | 'nao_informado';
  km: 'registrado' | 'incompleto' | 'nao_informado';
  corridas: 'registrado' | 'nao_informado' | 'nao_aplicavel';
  apps: 'registrado' | 'nao_informado';
  recargas: 'registrado' | 'nao_informado' | 'nao_aplicavel';
  encerrado: 'registrado' | 'nao_informado';
};

export function checklistDoDia(
  resumo: ResumoDiaOperacional | null,
  temRecargaHoje: boolean,
  encerrado: boolean,
): ChecklistHoje {
  if (!resumo) {
    return {
      ganho: 'nao_informado',
      horas: 'nao_informado',
      km: 'nao_informado',
      corridas: 'nao_informado',
      apps: 'nao_informado',
      recargas: temRecargaHoje ? 'registrado' : 'nao_informado',
      encerrado: encerrado ? 'registrado' : 'nao_informado',
    };
  }
  return {
    ganho: resumo.ganho > 0 ? 'registrado' : 'nao_informado',
    horas: resumo.horas != null && resumo.horas > 0 ? 'registrado' : 'nao_informado',
    km: resumo.kmRodados != null && resumo.kmRodados > 0 ? 'registrado' : resumo.kmIncompleto ? 'incompleto' : 'nao_informado',
    corridas: resumo.corridas != null && resumo.corridas > 0 ? 'registrado' : 'nao_informado',
    apps: resumo.apps.length > 0 ? 'registrado' : 'nao_informado',
    recargas: temRecargaHoje ? 'registrado' : resumo.custoRecargasDia > 0 ? 'registrado' : 'nao_informado',
    encerrado: encerrado ? 'registrado' : 'nao_informado',
  };
}

export type SaudeHoje = {
  status: 'completo' | 'incompleto' | 'sem_dados';
  texto: string;
};

export function saudeRegistroHoje(checklist: ChecklistHoje): SaudeHoje {
  const partes: string[] = [];
  if (checklist.ganho === 'registrado') partes.push('ganho');
  if (checklist.horas === 'registrado') partes.push('horas');
  if (checklist.km === 'registrado') partes.push('KM');

  if (partes.length === 0) {
    return { status: 'sem_dados', texto: 'Seu dia ainda não possui registros de ganho, horas ou KM.' };
  }

  const faltam: string[] = [];
  if (checklist.ganho !== 'registrado') faltam.push('ganho');
  if (checklist.horas !== 'registrado') faltam.push('horas');
  if (checklist.km !== 'registrado' && checklist.km !== 'incompleto') faltam.push('KM');
  if (checklist.km === 'incompleto') faltam.push('KM (odômetro incompleto)');
  if (checklist.corridas === 'nao_informado') faltam.push('corridas');

  if (checklist.ganho === 'registrado' && checklist.horas === 'registrado' && checklist.km === 'registrado') {
    const extras: string[] = [];
    if (checklist.corridas === 'registrado') extras.push('corridas');
    if (checklist.apps === 'registrado') extras.push('apps');
    const extraTxt = extras.length > 0 ? ` Também possui ${extras.join(' e ')}.` : '';
    return { status: 'completo', texto: `Seu dia possui ganho, horas e KM registrados.${extraTxt}` };
  }

  return { status: 'incompleto', texto: `Seu dia possui ${partes.join(', ')} registrado(s). Faltam ${faltam.join(', ')}.` };
}
