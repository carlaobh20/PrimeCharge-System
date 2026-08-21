// ===========================================================================
// FASE 19 — MÓDULOS 9/11/13/17: INTELIGÊNCIA HISTÓRICA DA FROTA (motor puro)
//
// IMPORTANTE (ver auditoria, `claude/auditoria-fase19-inteligencia-frota.md`, seção 0): hoje
// NÃO existe nenhum caminho de dado real para alimentar `inteligenciaFrotaHistorica()` com
// corridas de MÚLTIPLOS motoristas — `motorista_corridas`/`motorista_ganhos` têm RLS
// "privacidade invertida" (1 policy do dono, ZERO policy de staff), então nenhuma conta de
// staff consegue hoje fazer SELECT nelas. Este motor é construído e testado com fixtures
// sintéticas porque a MATEMÁTICA é válida e reutilizável independente da fonte — mas ligá-lo a
// dado real de frota inteira exige uma decisão de produto sobre RLS que esta fase não toma
// sozinha (a mesma regra do Módulo 3: "se migration/RLS for necessária, PARAR e apresentar").
//
// REUSO — nada disto reimplementa o motor do Copiloto (Fase 17, `lib/metas.ts`): as faixas de
// horário (`FAIXAS_HORARIO`) e a classificação de amostra (`classificarAmostra`) são importadas
// de lá, não copiadas. Só a AGREGAÇÃO entre múltiplos motoristas (Módulo 9 pede
// "quantidade de motoristas" e "concentração operacional" — conceitos que não existem no motor
// por-motorista da Fase 17) é código novo.
// ===========================================================================

import {
  classificarAmostra,
  DIA_SEMANA_LABEL,
  FAIXAS_HORARIO,
  type ClassificacaoAmostra,
} from '@/features/motorista-app/lib/metas';
import { distanciaEntrePontos, type PontoGeografico } from './geo';

// ---------------------------------------------------------------------------
// Módulo 17 — Classificação de dados: taxonomia de origem, mais ampla que a das fases
// anteriores porque esta fase precisa distinguir "histórico" de "oportunidade histórica" (uma
// leitura sobre o histórico, nunca uma previsão) e "não disponível" (fonte que simplesmente não
// existe hoje, ex.: telemetria/Uber/99) de "sem dado" (fonte existe, mas está vazia agora).
// ---------------------------------------------------------------------------
export type OrigemDadoFrota =
  | 'DADO REGISTRADO'
  | 'DADO IMPORTADO'
  | 'DADO HISTORICO'
  | 'PREMISSA'
  | 'ESTIMATIVA'
  | 'SIMULACAO'
  | 'OPORTUNIDADE HISTORICA'
  | 'NAO DISPONIVEL'
  | 'SEM DADO';

// ---------------------------------------------------------------------------
// Módulo 9 — inteligenciaFrotaHistorica()
// ---------------------------------------------------------------------------

/** Formato de entrada, agnóstico de fonte — mesmo shape de uma corrida individual (Fase 17)
 *  mais `motoristaId`, porque esta é uma agregação ENTRE motoristas. Não importa de
 *  `motorista_corridas`/`CorridaHistorico` para não acoplar este motor a um tipo que hoje só
 *  existe no contexto por-motorista (privacidade invertida) — ver o aviso no topo do arquivo. */
export type RegistroOperacionalFrota = {
  motoristaId: string;
  data: string; // 'YYYY-MM-DD'
  hora: string | null; // 'HH:MM' — null = SEM DADO, nunca vira "00h" (mesma disciplina da Fase 17)
  valor: number;
  duracaoEstimadaMin: number | null;
};

export type ResumoFrotaFaixaHorario = {
  inicio: number;
  fim: number;
  label: string;
  qtdRegistros: number;
  valorTotal: number;
  valorMedioPorRegistro: number | null;
  rpHora: number | null;
  motoristasUnicos: number;
  /** Fração (0–1) dos registros da faixa vindos do motorista mais presente nela. Alta
   *  concentração significa que a média da faixa reflete majoritariamente 1 motorista, não a
   *  frota — dado que a UI que consumir isto precisa mostrar junto, nunca esconder. */
  concentracaoOperacional: number | null;
  classificacaoAmostra: ClassificacaoAmostra;
  origem: OrigemDadoFrota;
};

export type ResumoFrotaDiaSemana = {
  diaSemana: number; // 0-6, mesmo índice de DIA_SEMANA_LABEL
  label: string;
  qtdRegistros: number;
  valorMedioPorRegistro: number | null;
  motoristasUnicos: number;
  classificacaoAmostra: ClassificacaoAmostra;
  origem: OrigemDadoFrota;
};

export type InteligenciaFrotaHistorica = {
  porHorario: ResumoFrotaFaixaHorario[];
  porDiaSemana: ResumoFrotaDiaSemana[];
  /** Quantidade de motoristas distintos que aparecem em QUALQUER registro de entrada — dado de
   *  contexto pra qualquer leitura acima não ser interpretada fora de escala. */
  motoristasUnicosTotal: number;
  qtdRegistrosTotal: number;
};

function motoristasUnicos(registros: RegistroOperacionalFrota[]): number {
  return new Set(registros.map((r) => r.motoristaId)).size;
}

function concentracao(registros: RegistroOperacionalFrota[]): number | null {
  if (registros.length === 0) return null;
  const porMotorista = new Map<string, number>();
  for (const r of registros) porMotorista.set(r.motoristaId, (porMotorista.get(r.motoristaId) ?? 0) + 1);
  const maiorContagem = Math.max(...porMotorista.values());
  return Math.round((maiorContagem / registros.length) * 1000) / 1000;
}

/**
 * Motor puro — agrega registros operacionais de MÚLTIPLOS motoristas por faixa de horário e
 * por dia da semana. Nunca produz "demanda atual": tudo aqui é leitura do que já aconteceu,
 * sempre com `qtdRegistros`/`motoristasUnicos` ao lado (nunca uma média sozinha, sem contexto
 * de quantas observações a sustentam — mesma disciplina do Módulo F da Fase 17).
 */
export function inteligenciaFrotaHistorica(registros: RegistroOperacionalFrota[]): InteligenciaFrotaHistorica {
  const comHora = registros.filter((r) => r.hora != null && r.hora.trim() !== '');

  const porHorario: ResumoFrotaFaixaHorario[] = [];
  for (const faixa of FAIXAS_HORARIO) {
    const doGrupo = comHora.filter((r) => {
      const h = Number.parseInt((r.hora as string).slice(0, 2), 10);
      if (!Number.isFinite(h) || h < 0 || h > 23) return false;
      return faixa.fim === 24 ? h >= faixa.inicio : h >= faixa.inicio && h < faixa.fim;
    });
    if (doGrupo.length === 0) continue;
    const valorTotal = Math.round(doGrupo.reduce((s, r) => s + r.valor, 0) * 100) / 100;
    const comDuracao = doGrupo.filter((r) => r.duracaoEstimadaMin != null && (r.duracaoEstimadaMin as number) > 0);
    const horasTotal = comDuracao.length > 0 ? comDuracao.reduce((s, r) => s + (r.duracaoEstimadaMin as number), 0) / 60 : null;
    porHorario.push({
      inicio: faixa.inicio,
      fim: faixa.fim,
      label: faixa.label,
      qtdRegistros: doGrupo.length,
      valorTotal,
      valorMedioPorRegistro: Math.round((valorTotal / doGrupo.length) * 100) / 100,
      rpHora: horasTotal != null && horasTotal > 0 ? Math.round((valorTotal / horasTotal) * 100) / 100 : null,
      motoristasUnicos: motoristasUnicos(doGrupo),
      concentracaoOperacional: concentracao(doGrupo),
      classificacaoAmostra: classificarAmostra(doGrupo.length),
      origem: 'DADO HISTORICO',
    });
  }

  const gruposDia = new Map<number, RegistroOperacionalFrota[]>();
  for (const r of registros) {
    const dt = new Date(`${r.data}T12:00:00`);
    if (Number.isNaN(dt.getTime())) continue;
    const ds = dt.getDay();
    gruposDia.set(ds, [...(gruposDia.get(ds) ?? []), r]);
  }
  const porDiaSemana: ResumoFrotaDiaSemana[] = [...gruposDia.entries()]
    .map(([ds, lista]) => {
      const valorTotal = lista.reduce((s, r) => s + r.valor, 0);
      return {
        diaSemana: ds,
        label: DIA_SEMANA_LABEL[ds],
        qtdRegistros: lista.length,
        valorMedioPorRegistro: lista.length > 0 ? Math.round((valorTotal / lista.length) * 100) / 100 : null,
        motoristasUnicos: motoristasUnicos(lista),
        classificacaoAmostra: classificarAmostra(lista.length),
        origem: 'DADO HISTORICO' as const,
      };
    })
    .sort((a, b) => a.diaSemana - b.diaSemana);

  return {
    porHorario,
    porDiaSemana,
    motoristasUnicosTotal: motoristasUnicos(registros),
    qtdRegistrosTotal: registros.length,
  };
}

// ---------------------------------------------------------------------------
// Módulo 11 — oportunidadeOperacional()
// Nome deliberadamente DIFERENTE do `Opportunity` já existente em
// `@/shared/intelligence/types.ts` (usado por `features/frota/intelligence/opportunities.ts`)
// — aquele é sobre OPORTUNIDADE FINANCEIRA DE ATIVO (ex.: "bom momento pra vender o veículo"),
// domínio e formato completamente diferentes (categoria: HealthCategoriaId, valorEstimado em
// R$ de venda). Reaproveitar o mesmo tipo forçaria os dois conceitos a caber no mesmo formato
// só por coincidência de nome — decisão registrada aqui para não parecer uma duplicação não
// percebida.
// ---------------------------------------------------------------------------

export type OportunidadeOperacionalHistorica = {
  id: string;
  /** Rótulo livre da região/faixa — nesta fase, só a faixa de horário (não há região real
   *  ainda, ver auditoria Módulo 10: "não inventar região"). */
  contexto: string;
  mensagem: string;
  origem: OrigemDadoFrota; // sempre 'OPORTUNIDADE HISTORICA' nesta função
  dadosBase: number;
  qualidadeDaBase: ClassificacaoAmostra;
};

/**
 * Empacota um `ResumoFrotaFaixaHorario` já calculado (nunca recalcula nada) na taxonomia de
 * "oportunidade histórica" — nunca "demanda atual". Retorna `null` quando a amostra é
 * insuficiente (nunca gera uma oportunidade sobre dado insuficiente, mesma regra do Módulo K
 * da Fase 18 para DADO_INSUFICIENTE).
 */
export function oportunidadeOperacional(resumo: ResumoFrotaFaixaHorario): OportunidadeOperacionalHistorica | null {
  if (resumo.classificacaoAmostra === 'dados_insuficientes') return null;
  const mediaTexto = resumo.rpHora != null ? `, média registrada de R$ ${resumo.rpHora.toFixed(2)}/h` : '';
  return {
    id: `oportunidade-historica-${resumo.label}`,
    contexto: resumo.label,
    mensagem: `Base histórica: ${resumo.qtdRegistros} registro(s)${mediaTexto}, ${resumo.motoristasUnicos} motorista(s) distinto(s) — leitura do que já aconteceu, não uma indicação de demanda atual.`,
    origem: 'OPORTUNIDADE HISTORICA',
    dadosBase: resumo.qtdRegistros,
    qualidadeDaBase: resumo.classificacaoAmostra,
  };
}

// ---------------------------------------------------------------------------
// Módulo 13 — Recomendação futura: SOMENTE contrato de dados, sem gerador. Nesta fase: NÃO
// enviar, NÃO executar, NÃO notificar, NÃO direcionar — nenhuma função produz este tipo, ele
// só existe para o código futuro (Fase 20+) ter um formato acordado desde já.
// ---------------------------------------------------------------------------

export type TipoRecomendacaoOperacional = 'MOVER' | 'AGUARDAR' | 'OPORTUNIDADE' | 'OCIOSIDADE' | 'DISPONIBILIDADE' | 'MANUTENCAO';

export type RecomendacaoOperacional = {
  id: string;
  tipo: TipoRecomendacaoOperacional;
  origem: OrigemDadoFrota;
  dadosBase: number;
  /** km, quando aplicável (ex.: MOVER) — via `distanciaEntrePontos()`, nunca calculada aqui de novo. */
  distancia: number | null;
  qualidadeDaBase: ClassificacaoAmostra;
  mensagem: string;
  acaoDisponivel: string | null;
};

// Reexport só para deixar claro, no import deste módulo, que `distanciaEntrePontos`/
// `PontoGeografico` são a mesma função do Módulo 12 — nenhuma segunda implementação de
// distância nasce aqui quando `RecomendacaoOperacional.distancia` for populado no futuro.
export type { PontoGeografico };
export { distanciaEntrePontos };
