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
};

export function montarCalendario(
  ano: number,
  mes1a12: number,
  metaDiaria: number,
  ganhos: { data: string; valor: number; horas: number | null }[],
): DiaCalendario[] {
  const diasNoMes = new Date(ano, mes1a12, 0).getDate();
  const porDia = new Map(ganhos.map((g) => [Number(g.data.slice(8, 10)), g]));
  const out: DiaCalendario[] = [];
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const g = porDia.get(dia);
    if (!g) {
      out.push({ dia, meta: seguro(metaDiaria), realizado: null, diferenca: null, horas: null, status: 'sem_dado' });
      continue;
    }
    const realizado = seguro(g.valor);
    const dif = arred(realizado - seguro(metaDiaria));
    out.push({
      dia,
      meta: seguro(metaDiaria),
      realizado,
      diferenca: dif,
      horas: g.horas != null && Number.isFinite(g.horas) ? g.horas : null,
      status: dif > 0.005 ? 'acima' : dif < -0.005 ? 'abaixo' : 'atingida',
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

export type JanelaOperacional = {
  dias: number; // tamanho da janela
  diasRegistrados: number;
  ganhoTotal: number;
  horasTotal: number | null; // null quando nenhum dia tem horas
  rsDia: number | null;
  rsHora: number | null;
  custoEstimado: number; // ESTIMATIVA: custo/dia planejado × dias registrados (fórmula declarada)
  cobertura: number | null; // ganho − custo estimado (SOBRA REGISTRADA — nunca "lucro")
};

/** Filtra ganhos numa janela de N dias terminando em `ateIso` (inclusive). */
export function ganhosNaJanela(ganhos: GanhoDia[], diasJanela: number, ateIso: string): GanhoDia[] {
  const fim = new Date(`${ateIso}T12:00:00`).getTime();
  const inicio = fim - (Math.max(1, Math.floor(diasJanela)) - 1) * 86_400_000;
  return ganhos.filter((g) => {
    const t = new Date(`${g.data}T12:00:00`).getTime();
    return Number.isFinite(t) && t >= inicio && t <= fim;
  });
}

export function janelaOperacional(ganhos: GanhoDia[], diasJanela: number, ateIso: string, custoDiaPlanejado: number): JanelaOperacional {
  const doPeriodo = ganhosNaJanela(ganhos, diasJanela, ateIso);
  const ganhoTotal = arred(doPeriodo.reduce((s, g) => s + seguro(g.valor), 0));
  const comHoras = doPeriodo.filter((g) => g.horas != null && Number.isFinite(g.horas) && g.horas > 0);
  const horasTotal = comHoras.length > 0 ? Math.round(comHoras.reduce((s, g) => s + (g.horas as number), 0) * 10) / 10 : null;
  const rsHoraInfo = mediaRealPorHora(doPeriodo);
  const custoEstimado = arred(seguro(custoDiaPlanejado) * doPeriodo.length);
  return {
    dias: diasJanela,
    diasRegistrados: doPeriodo.length,
    ganhoTotal,
    horasTotal,
    rsDia: doPeriodo.length > 0 ? arred(ganhoTotal / doPeriodo.length) : null,
    rsHora: rsHoraInfo?.valor ?? null,
    custoEstimado,
    cobertura: doPeriodo.length > 0 ? arred(ganhoTotal - custoEstimado) : null,
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
