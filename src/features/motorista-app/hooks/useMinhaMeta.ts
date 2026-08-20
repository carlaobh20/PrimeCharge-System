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
  listObjetivos,
  listSnapshots,
  removerDespesa,
  salvarConfig,
  salvarObjetivo,
  arquivarObjetivo,
  type MetaConfig,
} from '../api/financasPessoais';
import {
  alertasMeta,
  calcularMeta,
  calcularTotais,
  metaDeHoje,
  montarCalendario,
  normalizarMensal,
  progressoDoMes,
  rebalancear,
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
      const [contratos, despesas, config, objetivos, ganhos, snapshots] = await Promise.all([
        listMeusContratos(),
        listDespesas(),
        getConfig(),
        listObjetivos(),
        listGanhosDoMes(anoMes),
        listSnapshots(),
      ]);
      return { contratos, despesas, config, objetivos, ganhos, snapshots };
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

    const mesAnterior = snapshots.find((s) => s.mes.slice(0, 7) !== anoMes);
    const alertas = alertasMeta({
      totais,
      progresso: progresso.realizado > 0 ? progresso : null,
      snapshotAnteriorTotal: mesAnterior?.total ?? null,
      diasRestantes: diasTrabalhoRestantes,
    });

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
