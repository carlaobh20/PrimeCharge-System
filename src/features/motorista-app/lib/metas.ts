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
