import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { listMeusContratos, type MeuContrato } from '../api/meuContrato';
import { listMinhasVistorias } from '../api/vistorias';
import { moduloIndisponivel } from '../api/schemaGuard';
import {
  atualizarDespesa,
  criarDespesa,
  getConfig,
  gravarSnapshotDoMes,
  lancarGanho,
  listDespesas,
  criarRecarga,
  listGanhosDoMes,
  listGanhosPeriodo,
  listRecargasPeriodo,
  removerRecarga,
  listObjetivos,
  listSnapshots,
  removerDespesa,
  salvarConfig,
  salvarObjetivo,
  arquivarObjetivo,
  type MetaConfig,
} from '../api/financasPessoais';
import {
  getConfigCopiloto,
  listCorridasPeriodo,
  registrarCorrida,
  removerCorrida,
  salvarConfigCopiloto,
  type CorridaRow,
} from '../api/corridasPessoais';
import {
  alertasCockpit,
  alertasMeta,
  calcularMeta,
  calcularMetaHoje,
  calcularTotais,
  cenariosOperacionais,
  compararEnergia,
  compararMeses,
  confiancaDados,
  custoPorDiaPlanejado,
  custoPorHoraReal,
  eficienciaVsPremissa,
  estadoDoDia,
  fechamentoDoPeriodo,
  evolucaoPeriodo,
  horasParaValor,
  inconsistenciasOperacionais,
  janelaOperacional,
  mediaRealPorDia,
  mediaRealPorHora,
  mediasPorDiaSemana,
  metaDeAmanha,
  metaDeHoje,
  montarCalendario,
  normalizarMensal,
  opcoesRecuperacao,
  pontoEquilibrioDuplo,
  progressoDoMes,
  projecaoMes,
  projecoesDuplas,
  qualidadeDados,
  qualidadeOperacional,
  rebalancear,
  resumoDiaOperacional,
  revisaoDoDia,
  resumoRecargas,
  resumoSemana,
  ritmoDoMes,
  saldoHoras,
  saldoMeta,
  seEuPararAgora,
  simularHorasExtras,
  tendencia,
  CONFIG_COPILOTO_PADRAO,
  type ConfigCopiloto,
  type DespesaMeta,
} from '../lib/metas';

// MINHA META — agregador único da tela (uma passada de queries; motor puro faz as contas).
// O aluguel do carro vem do CONTRATO PrimeCharge (derivado — nunca cadastrado de novo).

const hojeIso = () => new Date().toISOString().slice(0, 10);
const anoMesAtual = () => hojeIso().slice(0, 7);

export function useMinhaMeta() {
  const { data: usuario } = useCurrentUsuario();
  const motoristaId = usuario?.motorista_id ?? undefined;
  const qc = useQueryClient();
  const anoMes = anoMesAtual();

  const base = useQuery({
    queryKey: ['motorista', 'minha-meta', anoMes],
    enabled: !!motoristaId,
    queryFn: async () => {
      // Fase 10/12.2: além do mês corrente, os últimos 90 dias (janelas 7/14/30/90 + evolução
      // até 30×30; a MESMA listGanhosPeriodo suporta — só o intervalo mudou)
      const hojeStr = hojeIso();
      const inicio60 = new Date(new Date(`${hojeStr}T12:00:00`).getTime() - 89 * 86_400_000).toISOString().slice(0, 10);
      const [contratos, despesas, config, objetivos, ganhos, ganhos60, snapshots, recargas60, vistorias, corridas60, configCopilotoRow] = await Promise.all([
        listMeusContratos(),
        listDespesas(),
        getConfig(),
        listObjetivos(),
        listGanhosDoMes(anoMes),
        listGanhosPeriodo(inicio60, hojeStr),
        listSnapshots(),
        listRecargasPeriodo(inicio60, hojeStr),
        listMinhasVistorias(),
        listCorridasPeriodo(inicio60, hojeStr), // Fase 16 — Copiloto (0049)
        getConfigCopiloto(), // Fase 16 — Copiloto (0050)
      ]);
      return { contratos, despesas, config, objetivos, ganhos, ganhos60, snapshots, recargas60, vistorias, corridas60, configCopilotoRow };
    },
  });

  const derivado = useMemo(() => {
    if (!base.data) return null;
    const { contratos, despesas, config, ganhos, snapshots } = base.data;
    const contratoAtivo: MeuContrato | undefined = contratos.find((c) => c.status === 'ativo') ?? contratos[0];
    // Módulos 6/32: aluguel derivado do contrato (semanal/diária → equivalente mensal)
    const aluguelCarroMensal = contratoAtivo
      ? normalizarMensal(contratoAtivo.valor_periodico, contratoAtivo.periodicidade)
      : 0;
    const despesasAtivas = despesas as DespesaMeta[];
    const totais = calcularTotais(despesasAtivas, aluguelCarroMensal);
    const diasTrabalho = config?.dias_trabalho ?? 26;
    const rendaHora = config?.renda_hora ?? 40;
    const meta = calcularMeta(totais.total, diasTrabalho, rendaHora);
    const progresso = progressoDoMes(meta.metaMensal, base.data.ganhos);

    const hoje = new Date();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasCorridosRestantes = diasNoMes - hoje.getDate();
    // dias de TRABALHO restantes ≈ proporcional (nunca inventamos escala real do motorista)
    const diasTrabalhoRestantes = Math.max(0, Math.round((diasCorridosRestantes * diasTrabalho) / diasNoMes));
    const novaMedia = rebalancear(meta.metaMensal, progresso.realizado, diasTrabalhoRestantes);

    const ganhoHoje = ganhos.find((g) => g.data === hojeIso());
    const hojeMeta = metaDeHoje(meta.metaDiaria, ganhoHoje ? ganhoHoje.valor : null, meta.rendaHora);

    const calendario = montarCalendario(hoje.getFullYear(), hoje.getMonth() + 1, meta.metaDiaria, ganhos);

    // ===== FASE 9 — COCKPIT (mesmos dados, mais inteligência; nada duplicado) =====
    // Ritmo do mês (Módulos 3/4): dias planejados decorridos são proporcionais ao calendário.
    const ritmo = ritmoDoMes({
      metaMensal: meta.metaMensal,
      metaDiariaOriginal: meta.metaDiaria,
      realizado: progresso.realizado,
      diasPlanejados: diasTrabalho,
      diasTrabalhados: progresso.diasComLancamento,
      diaAtual: hoje.getDate(),
      diasNoMes,
    });

    // Meta de HOJE rebalanceada (Módulo 5): falta do mês (sem contar hoje) ÷ dias restantes
    // incluindo hoje. "Dia encerrado" fica gravado em observacao do ganho (reuso da 0047).
    const realizadoAntesDeHoje = progresso.realizado - (ganhoHoje?.valor ?? 0);
    const diaEncerrado = ganhoHoje?.observacao === 'dia_encerrado';
    const hojeCockpit = calcularMetaHoje({
      metaMensal: meta.metaMensal,
      metaDiariaOriginal: meta.metaDiaria,
      realizadoAcumuladoAntesDeHoje: realizadoAntesDeHoje,
      diasRestantesIncluindoHoje: ritmo.diasRestantesPlanejados + 1, // decorridos já incluem hoje

      rendaHora: meta.rendaHora,
      realizadoHoje: ganhoHoje ? ganhoHoje.valor : null,
      horasTrabalhadasHoje: ganhoHoje?.horas ?? null,
      diaEncerrado,
    });

    const bancoMeta = progresso.diasComLancamento > 0 ? saldoMeta(meta.metaDiaria, ganhos) : null;
    const bancoHoras = saldoHoras(meta.horasPorDia, ganhos);
    const projecao = projecaoMes({
      realizado: progresso.realizado,
      diasTrabalhados: progresso.diasComLancamento,
      diasRestantesPlanejados: ritmo.diasRestantesPlanejados,
      metaMensal: meta.metaMensal,
    });
    const recuperacao = progresso.falta > 0 && ritmo.ritmo === 'abaixo'
      ? opcoesRecuperacao({ faltaMes: progresso.falta, metaDiariaOriginal: meta.metaDiaria, diasRestantes: ritmo.diasRestantesPlanejados, rendaHora: meta.rendaHora })
      : [];
    // (cenários movidos para depois de realHora14 — Fase 12.2 usa a média registrada)

    // Comparação mensal (Módulo 20) — snapshot do mês anterior mais recente
    const snapAnterior = snapshots.find((s) => s.mes.slice(0, 7) !== anoMes) ?? null;
    const comparacao = compararMeses(
      { mes: `${anoMes}-01`, total: totais.total, por_grupo: { vida: totais.vida, familia: totais.familia, carro: totais.carro, trabalho: totais.trabalho } },
      snapAnterior,
    );

    // Composição do carro por categoria (Módulo 10) + vida × operação (Módulo 12)
    const carroPorCategoria = despesasAtivas
      .filter((d) => d.ativa && d.grupo === 'carro')
      .reduce<Record<string, number>>((acc, d) => {
        const mensal = normalizarMensal(d.valor, d.periodicidade);
        acc[d.categoria] = (acc[d.categoria] ?? 0) + mensal;
        return acc;
      }, {});
    const custoVida = Math.round((totais.vida + totais.familia) * 100) / 100;
    const custoOperacao = Math.round((totais.carro + totais.trabalho) * 100) / 100;

    // ===== FASE 10 — inteligência operacional (tudo derivado dos REGISTROS; nada inventado) =====
    const ganhos60 = base.data.ganhos60; // GanhoRow[] — inclui o diário (km/corridas/apps)
    const hojeStr = hojeIso();
    const custoDia = custoPorDiaPlanejado(totais.total, diasTrabalho);
    const operacao14 = ganhos60.filter((g) => {
      const t = new Date(`${g.data}T12:00:00`).getTime();
      return t >= new Date(`${hojeStr}T12:00:00`).getTime() - 13 * 86_400_000;
    });
    const realHora14 = mediaRealPorHora(operacao14);
    const realDia14 = mediaRealPorDia(operacao14);
    const recargasDia = base.data.recargas60; // 90 dias (mesma janela do fetch)
    const janelas = {
      7: janelaOperacional(ganhos60, 7, hojeStr, custoDia, recargasDia),
      14: janelaOperacional(ganhos60, 14, hojeStr, custoDia, recargasDia),
      30: janelaOperacional(ganhos60, 30, hojeStr, custoDia, recargasDia),
      90: janelaOperacional(ganhos60, 90, hojeStr, custoDia, recargasDia),
    } as const;
    // Evolução período × anterior equivalente (Fase 12.2). 90×90 exigiria 180 dias de
    // busca — fica SEM COMPARAÇÃO de propósito (nada inventado).
    const evolucao = {
      7: evolucaoPeriodo(ganhos60, recargasDia, 7, hojeStr, custoDia),
      14: evolucaoPeriodo(ganhos60, recargasDia, 14, hojeStr, custoDia),
      30: evolucaoPeriodo(ganhos60, recargasDia, 30, hojeStr, custoDia),
      90: null,
    } as const;
    const tendencia7 = tendencia(ganhos60, 7, hojeStr);
    const confianca = confiancaDados(janelas[30].diasRegistrados);
    const qualidade = qualidadeDados(ganhos60.filter((g) => {
      const t = new Date(`${g.data}T12:00:00`).getTime();
      return t >= new Date(`${hojeStr}T12:00:00`).getTime() - 29 * 86_400_000;
    }));
    const eficiencia = eficienciaVsPremissa(realHora14?.valor ?? null, meta.rendaHora);
    const equilibrio = pontoEquilibrioDuplo(custoDia, meta.rendaHora, realHora14?.valor ?? null);
    const melhoresDias = janelas[30].diasRegistrados >= 6 ? mediasPorDiaSemana(ganhos60, 2) : [];
    const projecoes = projecoesDuplas({
      realizado: progresso.realizado,
      diasRestantes: ritmo.diasRestantesPlanejados,
      metaDiariaOriginal: meta.metaDiaria,
      mediaRealDia: realDia14?.valor ?? null,
      diasRegistrados: realDia14?.dias ?? 0,
    });
    const horasMesRegistradas = ganhos.reduce((s, g) => s + (g.horas != null && Number.isFinite(g.horas) ? g.horas : 0), 0);
    const custoHoraRealMes = custoPorHoraReal((totais.total / (diasNoMes || 30)) * hoje.getDate(), horasMesRegistradas);
    const custoDiaCarro = custoPorDiaPlanejado(totais.carro, diasTrabalho);
    const custoHoraCarro = meta.horasMes != null && meta.horasMes > 0 ? Math.round((totais.carro / meta.horasMes) * 100) / 100 : null;

    // ===== FASE 11 — plano operacional do dia (reusa hojeCockpit/ritmo/realHora14) =====
    const diasDepoisDeHoje = ritmo.diasRestantesPlanejados;
    const planoHoje = {
      horasPremissa: horasParaValor(hojeCockpit.metaHoje, meta.rendaHora),
      horasHistorico: horasParaValor(hojeCockpit.metaHoje, realHora14?.valor ?? null),
      rsHoraHoje:
        ganhoHoje && ganhoHoje.horas != null && ganhoHoje.horas > 0 && ganhoHoje.valor > 0
          ? Math.round((ganhoHoje.valor / ganhoHoje.horas) * 100) / 100
          : null,
      pararAgora: seEuPararAgora({
        metaMensal: meta.metaMensal,
        realizadoAcumuladoIncluindoHoje: progresso.realizado,
        diasRestantesDepoisDeHoje: diasDepoisDeHoje,
        metaHoje: hojeCockpit.metaHoje,
        realizadoHoje: hojeCockpit.realizadoHoje,
      }),
      simulacoes: [1, 2, 3, -1, -2]
        .map((h) =>
          simularHorasExtras({
            horas: h,
            premissaHora: meta.rendaHora,
            historicoHora: realHora14?.valor ?? null,
            metaHoje: hojeCockpit.metaHoje,
            realizadoHoje: hojeCockpit.realizadoHoje ?? 0,
            metaMensal: meta.metaMensal,
            realizadoAcumuladoIncluindoHoje: progresso.realizado,
            diasRestantesDepoisDeHoje: diasDepoisDeHoje,
          }),
        )
        .filter((s): s is NonNullable<typeof s> => s != null),
      amanha: metaDeAmanha({
        metaMensal: meta.metaMensal,
        realizadoAcumuladoIncluindoHoje: progresso.realizado,
        diasRestantesDepoisDeHoje: diasDepoisDeHoje,
        metaDiariaOriginal: meta.metaDiaria,
      }),
      horasRestantesMesDia: ritmo.metaRestanteDia != null ? horasParaValor(ritmo.metaRestanteDia, meta.rendaHora) : null,
    };
    const semana = resumoSemana(ganhos60, hojeStr, meta.metaDiaria, diasTrabalho, diasNoMes);
    const horasCarroHoje = horasParaValor(custoDiaCarro, meta.rendaHora);

    // ===== FASE 12.1 — diário operacional (tudo REGISTRADO; estimativas rotuladas) =====
    const recargas60 = base.data.recargas60;
    const consumoFicha = contratoAtivo?.veiculo?.consumo_kwh_100km ?? null;
    const recargasPorData = new Map<string, typeof recargas60>();
    for (const r of recargas60) recargasPorData.set(r.data, [...(recargasPorData.get(r.data) ?? []), r]);

    const resumoHoje = ganhoHoje
      ? resumoDiaOperacional(ganhoHoje, recargasPorData.get(hojeStr) ?? [], consumoFicha)
      : null;

    // MEUS DIAS — linhas do histórico (mais recente primeiro), derivadas por dia registrado
    const diarioDias = [...ganhos60]
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .map((g) => ({ data: g.data, resumo: resumoDiaOperacional(g, recargasPorData.get(g.data) ?? [], consumoFicha) }));

    // custo operacional REGISTRADO (30 dias) — separado do custo ESTIMADO do carro
    const custoOperacionalRegistrado30 = Math.round(
      recargas60
        .filter((r) => new Date(`${r.data}T12:00:00`).getTime() >= new Date(`${hojeStr}T12:00:00`).getTime() - 29 * 86_400_000)
        .reduce((s, r) => s + r.custo, 0) * 100,
    ) / 100;

    // Recorrência de recarga/combustível ATIVA + eventos registrados → divergência (nunca automática)
    const recorrenciaRecarga = despesasAtivas.find(
      (dsp) => dsp.ativa && (dsp.categoria === 'recarga' || dsp.categoria === 'combustivel'),
    );
    const divergenciaRecarga = recorrenciaRecarga && recargas60.length > 0
      ? { despesaId: recorrenciaRecarga.id, recorrenciaMensal: normalizarMensal(recorrenciaRecarga.valor, recorrenciaRecarga.periodicidade), eventos30: custoOperacionalRegistrado30 }
      : null;

    // Comparação de odômetro (LEITURA apenas — nunca sincroniza): último km_fim registrado × última vistoria com odômetro
    const ultimoDiaComKmFim = [...ganhos60].sort((a, b) => (a.data < b.data ? 1 : -1)).find((g) => g.km_fim != null);
    const ultimaVistoriaComKm = base.data.vistorias.find((v) => v.odometro_km != null);
    const comparacaoOdometro = ultimoDiaComKmFim && ultimaVistoriaComKm && ultimaVistoriaComKm.odometro_km != null
      ? {
          registrado: ultimoDiaComKmFim.km_fim as number,
          dataRegistro: ultimoDiaComKmFim.data,
          vistoria: ultimaVistoriaComKm.odometro_km,
          dataVistoria: (ultimaVistoriaComKm.concluido_em ?? ultimaVistoriaComKm.criado_em).slice(0, 10),
          diferenca: Math.round(((ultimoDiaComKmFim.km_fim as number) - ultimaVistoriaComKm.odometro_km) * 10) / 10,
        }
      : null;

    // ===== FASE 12.2 — inteligência descritiva (só registros; nada de julgamento) =====
    const limite30 = new Date(`${hojeStr}T12:00:00`).getTime() - 29 * 86_400_000;
    const recargas30 = recargas60.filter((r) => new Date(`${r.data}T12:00:00`).getTime() >= limite30);
    const ganhos30 = ganhos60.filter((g) => new Date(`${g.data}T12:00:00`).getTime() >= limite30);
    const recargasResumo30 = resumoRecargas(recargas30);
    const qualidadeOp = qualidadeOperacional(ganhos30, new Set(recargas30.map((r) => r.data)));
    const energia30 = compararEnergia(
      janelas[30].kmTotal != null && consumoFicha != null && consumoFicha > 0
        ? (janelas[30].kmTotal * consumoFicha) / 100
        : null,
      recargasResumo30.kwhTotal,
    );
    const custoEnergeticoEstimado30 =
      janelas[30].kmTotal != null && consumoFicha != null && consumoFicha > 0 && recargasResumo30.rsPorKwh != null
        ? Math.round(((janelas[30].kmTotal * consumoFicha) / 100) * recargasResumo30.rsPorKwh * 100) / 100
        : null;
    const inconsistencias = inconsistenciasOperacionais({
      ganhos: ganhos30,
      recargas: recargas30,
      temRecorrenciaRecarga: divergenciaRecarga != null,
      divergenciaOdometroKm: comparacaoOdometro?.diferenca ?? null,
    });
    const cenarios = cenariosOperacionais({ custoTotal: totais.total, diasTrabalho, rendaHora: meta.rendaHora }, realHora14?.valor ?? null);

    // ===== FASE 14 — rotina do dia (estado DERIVADO; nada gravado artificialmente) =====
    const recargasDeHoje = recargasPorData.get(hojeStr) ?? [];
    const estadoHoje = estadoDoDia({
      registroDeHoje: ganhoHoje ?? null,
      totalRegistrosHistorico: ganhos60.length,
    });
    const revisaoHoje = revisaoDoDia(ganhoHoje ?? null, recargasDeHoje);
    const fechamentoSemana = fechamentoDoPeriodo(ganhos60, recargasDia, hojeStr, 'semana', custoDia);
    const fechamentoMes = fechamentoDoPeriodo(ganhos60, recargasDia, hojeStr, 'mes', custoDia);

    const mesAnterior = snapAnterior;
    const alertas = [
      ...alertasMeta({
        totais,
        progresso: progresso.realizado > 0 ? progresso : null,
        snapshotAnteriorTotal: mesAnterior?.total ?? null,
        diasRestantes: diasTrabalhoRestantes,
      }),
      ...alertasCockpit({ ritmo: progresso.realizado > 0 ? ritmo : null, objetivos: base.data.objetivos }),
    ];

    // Módulo 32 — divergência: motorista cadastrou "aluguel do carro" manual ≠ contrato
    const aluguelManual = despesasAtivas.find((d) => d.ativa && d.grupo === 'carro' && d.categoria === 'aluguel_veiculo');
    const divergenciaAluguel =
      contratoAtivo && aluguelManual && Math.abs(normalizarMensal(aluguelManual.valor, aluguelManual.periodicidade) - aluguelCarroMensal) > 0.01
        ? { contrato: aluguelCarroMensal, manual: normalizarMensal(aluguelManual.valor, aluguelManual.periodicidade), despesaId: aluguelManual.id }
        : null;

    // ===== FASE 16 — COPILOTO DO MOTORISTA (corrida individual, 0049/0050) =====
    // Corridas registradas NUNCA sobrescrevem motorista_ganhos — só somam pra COMPARAÇÃO.
    // Divergência entre a soma das corridas e o dado manual (ganho/contagem do dia) vira
    // "DADOS DIFERENTES" pra decisão humana, nunca reconciliação automática e silenciosa.
    const corridas60: CorridaRow[] = base.data.corridas60 ?? [];
    const corridasHoje = corridas60.filter((c) => c.data === hojeStr);
    const somaValorCorridasHoje = Math.round(corridasHoje.reduce((s, c) => s + c.valor, 0) * 100) / 100;
    const qtdCorridasHoje = corridasHoje.length;

    const divergenciaCorridasValor =
      ganhoHoje && ganhoHoje.valor > 0 && qtdCorridasHoje > 0 && Math.abs(somaValorCorridasHoje - ganhoHoje.valor) > 0.01
        ? { registradoNoDia: ganhoHoje.valor, somaDasCorridas: somaValorCorridasHoje, diferenca: Math.round((ganhoHoje.valor - somaValorCorridasHoje) * 100) / 100 }
        : null;
    const divergenciaCorridasQtd =
      ganhoHoje?.corridas != null && ganhoHoje.corridas > 0 && qtdCorridasHoje > 0 && ganhoHoje.corridas !== qtdCorridasHoje
        ? { registradoNoDia: ganhoHoje.corridas, qtdCorridasIndividuais: qtdCorridasHoje }
        : null;

    const configCopilotoRow = base.data.configCopilotoRow;
    const configCopiloto: ConfigCopiloto = configCopilotoRow
      ? {
          limiarRpkmBom: configCopilotoRow.limiar_rpkm_bom,
          limiarRpkmRuim: configCopilotoRow.limiar_rpkm_ruim,
          limiarRphBom: configCopilotoRow.limiar_rph_bom,
          limiarRphRuim: configCopilotoRow.limiar_rph_ruim,
          pesoRpkm: configCopilotoRow.peso_rpkm,
          pesoRph: configCopilotoRow.peso_rph,
        }
      : CONFIG_COPILOTO_PADRAO;
    const copilotoConfigurado = configCopilotoRow != null && (configCopilotoRow.limiar_rpkm_bom != null || configCopilotoRow.limiar_rph_bom != null);
    const copilotoAtivo = configCopilotoRow?.ativo ?? true;

    return {
      contratoAtivo,
      aluguelCarroMensal,
      totais,
      meta,
      progresso,
      novaMedia,
      diasTrabalhoRestantes,
      hojeMeta,
      calendario,
      alertas,
      divergenciaAluguel,
      config,
      // Fase 9 — cockpit
      ritmo,
      hojeCockpit,
      diaEncerrado,
      bancoMeta,
      bancoHoras,
      projecao,
      recuperacao,
      cenarios,
      comparacao,
      carroPorCategoria,
      custoVida,
      custoOperacao,
      // Fase 10 — operação real
      ganhos60,
      ganhos14: operacao14,
      custoDia,
      custoDiaCarro,
      custoHoraCarro,
      realHora14,
      realDia14,
      janelas,
      tendencia7,
      confianca,
      qualidade,
      eficiencia,
      equilibrio,
      melhoresDias,
      projecoes,
      custoHoraRealMes,
      // Fase 11 — plano operacional diário
      planoHoje,
      semana,
      horasCarroHoje,
      // Fase 12.1 — diário operacional real
      resumoHoje,
      diarioDias,
      recargas60,
      custoOperacionalRegistrado30,
      divergenciaRecarga,
      comparacaoOdometro,
      consumoFicha,
      // Fase 14 — rotina operacional
      estadoHoje,
      revisaoHoje,
      recargasDeHoje,
      fechamentoSemana,
      fechamentoMes,
      // Fase 12.2 — inteligência operacional
      evolucao,
      recargasResumo30,
      qualidadeOp,
      energia30,
      custoEnergeticoEstimado30,
      inconsistencias,
      temDados: despesasAtivas.some((d) => d.ativa) || aluguelCarroMensal > 0,
      // Schema da Minha Meta (0047/0048) ainda não aplicado neste ambiente: a tela avisa em
      // vez de oferecer um cadastro que falharia no INSERT.
      indisponivel: moduloIndisponivel('minha-meta'),
      precisaOnboarding: !moduloIndisponivel('minha-meta') && !despesasAtivas.some((d) => d.ativa) && !config,
      // Fase 16 — Copiloto do Motorista (corrida individual, 0049/0050)
      corridasHoje,
      qtdCorridasHoje,
      somaValorCorridasHoje,
      divergenciaCorridasValor,
      divergenciaCorridasQtd,
      configCopiloto,
      copilotoConfigurado,
      copilotoAtivo,
      copilotoIndisponivel: moduloIndisponivel('copiloto'),
    };
  }, [base.data, anoMes]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['motorista', 'minha-meta'] });

  const mDespesaCriar = useMutation({
    mutationFn: (d: Parameters<typeof criarDespesa>[1]) => criarDespesa(motoristaId!, d),
    onSuccess: invalidar,
  });
  const mDespesaAtualizar = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof atualizarDespesa>[1] }) => atualizarDespesa(id, patch),
    onSuccess: invalidar,
  });
  const mDespesaRemover = useMutation({ mutationFn: removerDespesa, onSuccess: invalidar });
  const mConfig = useMutation({
    mutationFn: (patch: Partial<Omit<MetaConfig, 'motorista_id'>>) => salvarConfig(motoristaId!, patch),
    onSuccess: invalidar,
  });
  const mObjetivo = useMutation({
    mutationFn: (o: Parameters<typeof salvarObjetivo>[1]) => salvarObjetivo(motoristaId!, o),
    onSuccess: invalidar,
  });
  const mObjetivoArquivar = useMutation({ mutationFn: arquivarObjetivo, onSuccess: invalidar });
  // (mutations do diário logo abaixo do mGanho)
  const mGanho = useMutation({
    // Bloqueio da aplicação (além da constraint): km_fim < km_inicio nunca sai do cliente
    mutationFn: (g: Parameters<typeof lancarGanho>[1]) => {
      if (g.km_inicio != null && g.km_fim != null && g.km_fim < g.km_inicio) {
        return Promise.reject(new Error('Odômetro final não pode ser menor que o inicial.'));
      }
      return lancarGanho(motoristaId!, g);
    },
    onSuccess: invalidar,
  });
  const mRecargaCriar = useMutation({
    mutationFn: (r: Parameters<typeof criarRecarga>[1]) => criarRecarga(motoristaId!, r),
    onSuccess: invalidar,
  });
  const mRecargaRemover = useMutation({ mutationFn: removerRecarga, onSuccess: invalidar });
  const mSnapshot = useMutation({
    mutationFn: ({ total, porGrupo }: { total: number; porGrupo: Record<string, number> }) =>
      gravarSnapshotDoMes(motoristaId!, `${anoMes}-01`, total, porGrupo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['motorista', 'minha-meta'] }),
  });
  // Fase 16 — Copiloto do Motorista
  const mCorridaRegistrar = useMutation({
    mutationFn: (c: Parameters<typeof registrarCorrida>[1]) => registrarCorrida(motoristaId!, c),
    onSuccess: invalidar,
  });
  const mCorridaRemover = useMutation({ mutationFn: removerCorrida, onSuccess: invalidar });
  const mConfigCopiloto = useMutation({
    mutationFn: (patch: Parameters<typeof salvarConfigCopiloto>[1]) => salvarConfigCopiloto(motoristaId!, patch),
    onSuccess: invalidar,
  });

  return {
    motoristaId,
    carregando: base.isLoading,
    erro: base.isError,
    recarregar: base.refetch,
    dados: base.data ?? null,
    derivado,
    mDespesaCriar,
    mDespesaAtualizar,
    mDespesaRemover,
    mConfig,
    mObjetivo,
    mObjetivoArquivar,
    mGanho,
    mRecargaCriar,
    mRecargaRemover,
    mSnapshot,
    mCorridaRegistrar,
    mCorridaRemover,
    mConfigCopiloto,
  };
}
