import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { listMeusContratos, type MeuContrato } from '../api/meuContrato';
import {
  atualizarDespesa,
  criarDespesa,
  getConfig,
  gravarSnapshotDoMes,
  lancarGanho,
  listDespesas,
  listGanhosDoMes,
  listGanhosPeriodo,
  listObjetivos,
  listSnapshots,
  removerDespesa,
  salvarConfig,
  salvarObjetivo,
  arquivarObjetivo,
  type MetaConfig,
} from '../api/financasPessoais';
import {
  alertasCockpit,
  alertasMeta,
  calcularMeta,
  calcularMetaHoje,
  calcularTotais,
  cenariosPredefinidos,
  compararMeses,
  confiancaDados,
  custoPorDiaPlanejado,
  custoPorHoraReal,
  eficienciaVsPremissa,
  horasParaValor,
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
  rebalancear,
  resumoSemana,
  ritmoDoMes,
  saldoHoras,
  saldoMeta,
  seEuPararAgora,
  simularHorasExtras,
  tendencia,
  type DespesaMeta,
  type GanhoDia,
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
      // Fase 10: além do mês corrente, os últimos 60 dias (janelas 7/14/30 + tendência)
      const hojeStr = hojeIso();
      const inicio60 = new Date(new Date(`${hojeStr}T12:00:00`).getTime() - 59 * 86_400_000).toISOString().slice(0, 10);
      const [contratos, despesas, config, objetivos, ganhos, ganhos60, snapshots] = await Promise.all([
        listMeusContratos(),
        listDespesas(),
        getConfig(),
        listObjetivos(),
        listGanhosDoMes(anoMes),
        listGanhosPeriodo(inicio60, hojeStr),
        listSnapshots(),
      ]);
      return { contratos, despesas, config, objetivos, ganhos, ganhos60, snapshots };
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
    const cenarios = cenariosPredefinidos({ custoTotal: totais.total, diasTrabalho, rendaHora: meta.rendaHora });

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
    const ganhos60: GanhoDia[] = base.data.ganhos60;
    const hojeStr = hojeIso();
    const custoDia = custoPorDiaPlanejado(totais.total, diasTrabalho);
    const operacao14 = ganhos60.filter((g) => {
      const t = new Date(`${g.data}T12:00:00`).getTime();
      return t >= new Date(`${hojeStr}T12:00:00`).getTime() - 13 * 86_400_000;
    });
    const realHora14 = mediaRealPorHora(operacao14);
    const realDia14 = mediaRealPorDia(operacao14);
    const janelas = {
      7: janelaOperacional(ganhos60, 7, hojeStr, custoDia),
      14: janelaOperacional(ganhos60, 14, hojeStr, custoDia),
      30: janelaOperacional(ganhos60, 30, hojeStr, custoDia),
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
      temDados: despesasAtivas.some((d) => d.ativa) || aluguelCarroMensal > 0,
      precisaOnboarding: !despesasAtivas.some((d) => d.ativa) && !config,
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
  const mGanho = useMutation({
    mutationFn: (g: Parameters<typeof lancarGanho>[1]) => lancarGanho(motoristaId!, g),
    onSuccess: invalidar,
  });
  const mSnapshot = useMutation({
    mutationFn: ({ total, porGrupo }: { total: number; porGrupo: Record<string, number> }) =>
      gravarSnapshotDoMes(motoristaId!, `${anoMes}-01`, total, porGrupo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['motorista', 'minha-meta'] }),
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
    mSnapshot,
  };
}
