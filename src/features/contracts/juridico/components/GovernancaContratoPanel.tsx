import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, FileSearch, ScrollText } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { listArquivos } from '@/shared/capabilities/api/arquivos';
import { listAcoes } from '@/features/operacoes/api/acoes';
import { getMotorista } from '@/features/motoristas/api/motoristas';
import { getVeiculo } from '@/features/frota/api/veiculos';
import { getEmpresaParaContrato } from '../api';
import { montarSnapshot } from '../validacao';
import { hashCorpo } from '../lib';
import { useAssinaturas, useAditivos } from '../hooks';
import { useFichaJuridica, useRevisoesTemplate, useSaveParametro, usePoliticas, useParametrosJuridicos } from '../hooksFase3';
import { templateAprovadoJuridicamente } from '../apiFase3';
import {
  avaliarChecklistRenovacao,
  avaliarConformidade,
  compararSnapshotComCadastro,
  montarRelatorioReconciliacao,
  reconciliarContrato,
  type ConformidadeOperacional,
  type DivergenciaContratual,
  type ItemReconciliacao,
} from '../governanca';
import { CONTRATO_ADITIVO_TIPO_LABEL, type ContratoVersao } from '../types';
import type { ContratoComRelacoes } from '../../types';
import { NovoAditivoDialog } from './NovoAditivoDialog';

// GOVERNANÇA DO CONTRATO (Fase 8, Módulos 1/2/3/7/8/9/10/15/16/18) — aba única no cockpit.
// Tudo DERIVADO de dados existentes; nada é alterado automaticamente; dado ausente aparece como
// NÃO INFORMADO (Módulo 29). Vocabulário: conformidade operacional / integridade documental /
// prioridade operacional — nunca "segurança jurídica".

const DIA_MS = 86_400_000;
const dias = (iso: string | null | undefined): number | null =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DIA_MS) : null;
const ni = (v: string | null | undefined) => (v && String(v).trim() !== '' ? String(v) : 'NÃO INFORMADO');

const COR_INDICADOR = { ok: 'success', normal: 'success', atencao: 'warning', critico: 'destructive', bloqueado: 'destructive' } as const;

export function GovernancaContratoPanel({ contrato, versao }: { contrato: ContratoComRelacoes; versao: ContratoVersao | undefined }) {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const salvarParametro = useSaveParametro();
  const { data: parametros } = useParametrosJuridicos();

  const ficha = useFichaJuridica(contrato.id);
  const { data: aditivos } = useAditivos(contrato.id);
  const { data: assinaturas } = useAssinaturas(versao?.congelada ? versao.id : undefined);
  const revisoesQuery = useRevisoesTemplate(versao?.template_id ?? undefined);
  const { data: politicas } = usePoliticas();

  const cadastro = useQuery({
    queryKey: ['juridico', 'governanca-cadastro', contrato.id],
    queryFn: async () => {
      const [motorista, veiculo, empresa, arquivos, tarefas] = await Promise.all([
        getMotorista(contrato.motorista_id),
        getVeiculo(contrato.veiculo_id),
        getEmpresaParaContrato(empresaId!),
        listArquivos('contrato', contrato.id),
        listAcoes({ entidadeTipo: 'contrato', entidadeId: contrato.id }),
      ]);
      return { motorista, veiculo, empresa, arquivos, tarefas };
    },
    enabled: !!empresaId,
  });

  const [aditivoAberto, setAditivoAberto] = useState(false);
  const [renovacaoAberta, setRenovacaoAberta] = useState(false);
  const [reconciliacao, setReconciliacao] = useState<ItemReconciliacao[] | null>(null);
  const [reconciliando, setReconciliando] = useState(false);

  const meta = (versao?.snapshot as { _meta?: { template_versao?: number; template_nome?: string } } | undefined)?._meta;

  // ---------- Módulo 2/3: divergências snapshot × cadastro (mesmo montarSnapshot) ----------
  const divergencias: DivergenciaContratual[] = useMemo(() => {
    if (!versao?.snapshot || !cadastro.data) return [];
    const snapshotAtual = montarSnapshot({
      empresa: cadastro.data.empresa,
      motorista: cadastro.data.motorista,
      veiculo: cadastro.data.veiculo,
      condicoes: {
        valor_periodico: contrato.valor_periodico,
        periodicidade: contrato.periodicidade,
        dia_vencimento: contrato.dia_vencimento,
        valor_caucao: contrato.valor_caucao,
        data_inicio: contrato.data_inicio,
        data_fim_prevista: contrato.data_fim_prevista,
        km_incluso: null,
        regras_especificas: contrato.observacoes,
      },
      template: { id: versao.template_id ?? '', nome: meta?.template_nome ?? '', versao_template: meta?.template_versao ?? 0 },
      numeroContrato: contrato.id.slice(0, 8).toUpperCase(),
      seguro: ficha.data?.seguros?.[0] ?? null,
    });
    return compararSnapshotComCadastro(versao.snapshot as Record<string, unknown>, snapshotAtual);
  }, [versao, cadastro.data, contrato, ficha.data, meta]);

  const decisaoDivergencia = (caminho: string) =>
    parametros?.find((p) => p.chave === `divergencia_${contrato.id.slice(0, 8)}_${caminho.replace(/\./g, '_')}`)?.valor as
      | { decisao?: string; justificativa?: string }
      | undefined;

  // ---------- Módulo 16: conformidade operacional ----------
  const conformidade: ConformidadeOperacional | null = useMemo(() => {
    if (!cadastro.data) return null;
    const seguro = ficha.data?.seguros?.[0] ?? null;
    const linhas = assinaturas ?? [];
    const faltantes = linhas.filter((a) => !['assinado', 'aceito'].includes(a.status)).map((a) => (a.parte === 'motorista' ? 'motorista' : 'PrimeCharge'));
    const expirada = linhas.some((a) => !['assinado', 'aceito', 'recusado'].includes(a.status) && a.expira_em != null && new Date(a.expira_em).getTime() < Date.now());
    // checklist documental (Módulo 12): política ativa do template define anexos obrigatórios
    const politica = (politicas ?? []).find((p) => p.status === 'ativa' && p.template_id === versao?.template_id);
    const obrigatorios: string[] = Array.isArray(politica?.anexos_obrigatorios) ? (politica!.anexos_obrigatorios as string[]) : [];
    const arquivos = cadastro.data.arquivos as { categoria: string | null; status_revisao?: string | null }[];
    const faltandoDocs = obrigatorios.filter((cat) => !arquivos.some((a) => a.categoria === cat && a.status_revisao !== 'rejeitado'));
    const rejeitados = obrigatorios.filter((cat) => arquivos.some((a) => a.categoria === cat) && arquivos.filter((a) => a.categoria === cat).every((a) => a.status_revisao === 'rejeitado'));
    const cnhDias = dias(cadastro.data.motorista?.cnh_validade ?? null);
    const tarefas = cadastro.data.tarefas as { tipo?: string | null; status: string; prazo: string | null }[];
    const obrigacoesVencidas = tarefas.filter(
      (t) => (t.tipo ?? '').startsWith('juridico') && !['concluida', 'cancelada'].includes(t.status) && t.prazo != null && new Date(t.prazo).getTime() < Date.now(),
    ).length;
    return avaliarConformidade({
      contratoStatus: contrato.status,
      diasParaFim: dias(contrato.data_fim_prevista),
      temVersaoVigenteOuAssinada: versao != null && ['assinada', 'vigente'].includes(versao.status),
      versaoCongelada: versao?.congelada ?? false,
      hashConfere: null, // reconferido sob demanda na Reconciliação (nunca em silêncio)
      assinaturasFaltantes: faltantes,
      assinaturaRecusada: linhas.some((a) => a.status === 'recusado'),
      assinaturaExpirada: expirada,
      seguro: {
        cadastrado: seguro != null,
        venceEmDias: dias(seguro?.vigencia_fim ?? null),
        coberturaInformada: seguro != null && Object.keys(seguro.coberturas ?? {}).length > 0,
        franquiaInformada: seguro?.franquia_valor != null,
      },
      documentosObrigatoriosFaltantes: faltandoDocs,
      documentosRejeitados: rejeitados,
      cnhVencida: cnhDias != null && cnhDias < 0,
      cnhVenceEmDias: cnhDias,
      divergencias: divergencias.filter((d) => !decisaoDivergencia(d.caminho)).length,
      rescisaoEmAndamento: (ficha.data?.rescisoes ?? []).some((r) => !['encerrada', 'cancelada'].includes(r.status)),
      obrigacoesVencidas,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastro.data, ficha.data, assinaturas, versao, contrato, divergencias, politicas, parametros]);

  // ---------- Módulo 18: reconciliação sob demanda ----------
  const reconciliar = async () => {
    if (!versao) return;
    setReconciliando(true);
    try {
      let hashOk: boolean | null = null;
      if (versao.corpo && versao.hash_sha256) hashOk = (await hashCorpo(versao.corpo)) === versao.hash_sha256;
      const linhas = assinaturas ?? [];
      const itens = reconciliarContrato({
        hashRecalculadoConfere: hashOk,
        versaoCongelada: versao.congelada,
        divergenciasSnapshot: divergencias.length,
        versaoTemOrigemTemplate: versao.template_id != null,
        assinaturasDaVersaoCongelada: linhas.length,
        assinaturasConcluidas: linhas.filter((a) => ['assinado', 'aceito'].includes(a.status)).length,
        arquivosDoContrato: (cadastro.data?.arquivos ?? []).length,
        eventosTimeline: 1, // timeline garantida por triggers 0043/0045 (painel próprio lista os eventos)
        aditivosSemDocumento: (aditivos ?? []).filter((a) => a.status === 'rascunho').length,
      });
      setReconciliacao(itens);
    } catch (e) {
      toast.error('Reconciliação falhou', extrairMensagemDeErro(e));
    } finally {
      setReconciliando(false);
    }
  };

  const exportarReconciliacao = () => {
    if (!reconciliacao) return;
    const md = montarRelatorioReconciliacao(`Contrato ${contrato.id.slice(0, 8).toUpperCase()}`, reconciliacao, new Date().toLocaleString('pt-BR'));
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliacao-${contrato.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Módulos 7/8: renovação (decisão humana) ----------
  const checklistRenovacao = useMemo(() => {
    if (!conformidade || !cadastro.data) return [];
    const seguro = ficha.data?.seguros?.[0] ?? null;
    const cnhDias = dias(cadastro.data.motorista?.cnh_validade ?? null);
    return avaliarChecklistRenovacao({
      conformidade,
      motoristaAtivo: cadastro.data.motorista?.status === 'ativo',
      cnhValida: cnhDias == null ? null : cnhDias >= 0,
      veiculoDisponivelOuAlugado: ['disponivel', 'alugado'].includes(cadastro.data.veiculo?.status ?? ''),
      seguroVigente: seguro != null && (dias(seguro.vigencia_fim ?? null) ?? 1) >= 0,
      vistoriaRegistrada: (ficha.data?.vistorias ?? []).length > 0,
      financeiroSemSaldoDevedor: ficha.data?.financeiro ? (ficha.data.financeiro.receitasVencidas ?? 0) <= 0 : null,
      documentosOk: conformidade.bloqueios.every((b) => b.origem !== 'documentos') && conformidade.alertas.every((a) => a.origem !== 'documentos'),
      aditivosRascunho: (aditivos ?? []).filter((a) => a.status === 'rascunho').length,
      rescisaoEmAndamento: (ficha.data?.rescisoes ?? []).some((r) => !['encerrada', 'cancelada'].includes(r.status)),
      templateComRevisaoAprovada: templateAprovadoJuridicamente(revisoesQuery.data ?? [], meta?.template_versao ?? 0),
    });
  }, [conformidade, cadastro.data, ficha.data, aditivos, revisoesQuery.data, meta]);

  const registrarDecisaoRenovacao = (decisao: 'aditivo' | 'nova_versao') => {
    if (!empresaId) return;
    salvarParametro.mutate({
      empresaId,
      chave: `renovacao_${contrato.id.slice(0, 8)}`,
      valor: { decisao, responsavel: usuario?.nome_completo, data: new Date().toISOString(), checklist: checklistRenovacao.map((c) => `${c.item}:${c.resultado}`) },
      usuarioId: usuario?.id,
    });
    if (decisao === 'aditivo') setAditivoAberto(true);
    else toast.info('Decisão registrada: NOVA VERSÃO', 'Use "Nova versão (snapshot atual)" no painel lateral — o documento atual permanece congelado (fotografia garantida).');
    setRenovacaoAberta(false);
  };

  const seguroAtual = ficha.data?.seguros?.[0] ?? null;
  const rescisaoAtiva = (ficha.data?.rescisoes ?? []).find((r) => !['encerrada', 'cancelada'].includes(r.status));

  return (
    <div className="space-y-4">
      {/* ============ MÓDULO 1 — ESTADO CONTRATUAL ============ */}
      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <ScrollText className="h-4 w-4 text-emerald-600" aria-hidden /> Estado Contratual
          </h3>
          <div className="flex gap-2">
            {conformidade && (
              <>
                <Badge variant={COR_INDICADOR[conformidade.integridadeDocumental]}>Integridade documental: {conformidade.integridadeDocumental.toUpperCase()}</Badge>
                <Badge variant={COR_INDICADOR[conformidade.indicadorOperacional]}>Risco operacional: {conformidade.indicadorOperacional.toUpperCase()}</Badge>
              </>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs md:grid-cols-4">
          {(
            [
              ['Contrato', contrato.id.slice(0, 8).toUpperCase()],
              ['Versão do documento', versao ? `${versao.rotulo ?? `v${versao.numero}`} (${versao.status})` : 'NÃO GERADA'],
              ['Master de origem', ni(meta?.template_nome)],
              ['Versão do Master', meta?.template_versao != null ? `v${meta.template_versao}` : 'NÃO INFORMADO'],
              ['Hash (SHA-256)', versao?.hash_sha256 ? `${versao.hash_sha256.slice(0, 20)}…` : 'NÃO INFORMADO'],
              ['Status do contrato', contrato.status],
              ['Início', contrato.data_inicio ? formatDataSimples(contrato.data_inicio) : 'NÃO INFORMADO'],
              ['Fim previsto', contrato.data_fim_prevista ? `${formatDataSimples(contrato.data_fim_prevista)} (${dias(contrato.data_fim_prevista)} d)` : 'NÃO INFORMADO'],
              ['Motorista', ni(contrato.motorista?.nome_completo)],
              ['Veículo', ni(contrato.veiculo?.placa)],
              ['Valor', contrato.valor_periodico != null ? `${formatMoeda(contrato.valor_periodico)} / ${contrato.periodicidade}` : 'NÃO INFORMADO'],
              ['Seguro', seguroAtual ? `${ni(seguroAtual.seguradora)} — apólice ${ni(seguroAtual.apolice)}` : 'NÃO CADASTRADO'],
              ['Aditivos', String((aditivos ?? []).length)],
              ['Rescisão', rescisaoAtiva ? rescisaoAtiva.status : 'nenhuma em andamento'],
              ['Assinaturas', (assinaturas ?? []).length > 0 ? `${(assinaturas ?? []).filter((a) => ['assinado', 'aceito'].includes(a.status)).length}/${(assinaturas ?? []).length} concluídas` : versao?.congelada ? 'NÃO ENVIADAS' : 'documento não congelado'],
              ['Renovação', contrato.data_fim_prevista && (dias(contrato.data_fim_prevista) ?? 99) <= 30 ? 'JANELA ABERTA (≤30 dias)' : 'fora da janela'],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{k}</dt>
              <dd className="font-medium text-neutral-800 dark:text-neutral-200">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Módulo 10 — cadeia documental (original → aditivos → atual) */}
        {(aditivos ?? []).length > 0 && (
          <div className="mt-3 border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-neutral-400">Cadeia documental (o original NUNCA é modificado)</p>
            <div className="flex flex-wrap items-center gap-1 text-neutral-600 dark:text-neutral-300">
              <span className="rounded border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">Contrato original</span>
              {(aditivos ?? []).slice().reverse().map((a, i) => (
                <span key={a.id} className="flex items-center gap-1">
                  <span aria-hidden>→</span>
                  <span className="rounded border border-neutral-300 px-2 py-0.5 dark:border-neutral-700" title={a.descricao ?? ''}>
                    Aditivo {i + 1}: {CONTRATO_ADITIVO_TIPO_LABEL[a.tipo] ?? a.tipo} ({formatDataSimples(a.criado_em)})
                  </span>
                </span>
              ))}
              <span aria-hidden>→</span>
              <span className="rounded border border-emerald-500 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">Versão atual</span>
            </div>
          </div>
        )}
      </section>

      {/* ============ MÓDULO 16 — CONFORMIDADE OPERACIONAL ============ */}
      {conformidade && (
        <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Conformidade operacional</h3>
            <Badge variant={COR_INDICADOR[conformidade.status]}>{conformidade.status === 'ok' ? 'OK' : conformidade.status === 'atencao' ? 'ATENÇÃO' : 'BLOQUEADO'}</Badge>
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            Fatos objetivos, cada um com o motivo — não é avaliação jurídica. Revisão jurídica é sempre um registro humano.
          </p>
          <div className="mt-2 space-y-1 text-xs">
            {conformidade.bloqueios.map((m, i) => (
              <p key={`b${i}`} className="text-red-600 dark:text-red-400">⛔ {m.motivo}</p>
            ))}
            {conformidade.alertas.map((m, i) => (
              <p key={`a${i}`} className="text-amber-600 dark:text-amber-400">⚠️ {m.motivo}</p>
            ))}
            {conformidade.pendencias.map((m, i) => (
              <p key={`p${i}`} className="text-neutral-500">• {m.motivo}</p>
            ))}
            {conformidade.bloqueios.length + conformidade.alertas.length + conformidade.pendencias.length === 0 && (
              <p className="text-emerald-600">Nenhuma pendência objetiva conhecida.</p>
            )}
          </div>
        </section>
      )}

      {/* ============ MÓDULOS 2/3 — DIVERGÊNCIAS ============ */}
      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Divergências contrato × cadastro ({divergencias.length})
        </h3>
        <p className="mt-1 text-[11px] text-neutral-400">
          Snapshot congelado comparado ao cadastro ATUAL (regenerado pela mesma fonte). O sistema nunca altera o contrato —
          a decisão é humana: nova versão, aditivo ou ignorar com justificativa.
        </p>
        <div className="mt-2 space-y-1.5">
          {divergencias.length === 0 && <p className="text-xs text-emerald-600">Sem alteração — cadastro atual compatível com o snapshot contratual.</p>}
          {divergencias.map((d) => {
            const decisao = decisaoDivergencia(d.caminho);
            return (
              <div key={d.caminho} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {d.rotulo} <Badge variant={d.prioridade === 'critico' ? 'destructive' : d.prioridade === 'alto' ? 'warning' : 'outline'}>{d.prioridade}</Badge>
                  </p>
                  {decisao ? (
                    <span className="text-[11px] text-neutral-500">✓ {decisao.decisao}{decisao.justificativa ? ` — ${decisao.justificativa}` : ''}</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setAditivoAberto(true)}>Criar aditivo</Button>
                      <Input
                        className="h-7 w-48 text-[11px]"
                        placeholder="Justificativa p/ ignorar (Enter)"
                        onKeyDown={(e) => {
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (e.key === 'Enter' && v.length >= 5 && empresaId) {
                            salvarParametro.mutate({
                              empresaId,
                              chave: `divergencia_${contrato.id.slice(0, 8)}_${d.caminho.replace(/\./g, '_')}`,
                              valor: { decisao: 'ignorada', justificativa: v, campo: d.rotulo, valorContrato: d.valorContrato, valorAtual: d.valorAtual, responsavel: usuario?.nome_completo, data: new Date().toISOString() },
                              usuarioId: usuario?.id,
                            });
                          }
                        }}
                      />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-neutral-500">
                  Contrato: <span className="font-medium">{d.valorContrato}</span> · Cadastro atual: <span className="font-medium">{d.valorAtual}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ AÇÕES: RENOVAÇÃO + RECONCILIAÇÃO ============ */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setRenovacaoAberta(true)}>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Iniciar renovação (checklist)
        </Button>
        <Button size="sm" variant="outline" disabled={reconciliando || !versao} onClick={reconciliar}>
          <FileSearch className="h-3.5 w-3.5" aria-hidden /> {reconciliando ? 'Reconciliando…' : 'Reconciliação contratual'}
        </Button>
      </div>

      {/* Reconciliação (Módulo 18) */}
      {reconciliacao && (
        <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Reconciliação contratual</h3>
            <Button size="sm" variant="ghost" onClick={exportarReconciliacao}>Exportar relatório (.md)</Button>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {reconciliacao.map((r) => (
              <p key={r.item} className={r.resultado === 'ok' ? 'text-emerald-600' : r.resultado === 'divergencia' ? 'text-red-600' : 'text-amber-600'}>
                {r.resultado === 'ok' ? '✔' : r.resultado === 'divergencia' ? '✖' : '…'} <span className="font-medium">{r.item}</span> — {r.detalhe}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Renovação (Módulos 7/8) */}
      <Dialog open={renovacaoAberta} onOpenChange={setRenovacaoAberta} title="Renovação do contrato" description="O contrato vigente NUNCA é editado — o documento congelado com hash é a fotografia. O caminho (nova versão × aditivo) é decisão humana.">
        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <p className="text-[10px] uppercase tracking-wide text-neutral-400">Condições atuais (fotografadas no documento congelado)</p>
            <p className="mt-1 text-neutral-700 dark:text-neutral-300">
              {contrato.valor_periodico != null ? formatMoeda(contrato.valor_periodico) : 'NÃO INFORMADO'} / {contrato.periodicidade} · fim previsto{' '}
              {contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : 'NÃO INFORMADO'} · caução{' '}
              {contrato.valor_caucao != null ? formatMoeda(contrato.valor_caucao) : 'sem caução'}
            </p>
            <p className="mt-1 text-neutral-500">Novas condições (valor, periodicidade, prazo, master/template novo) são definidas no caminho escolhido — nada é presumido.</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-neutral-400">Checklist de renovação (derivado — a regra jurídica segue parametrizável)</p>
            <div className="space-y-0.5">
              {checklistRenovacao.map((c) => (
                <p key={c.item} className={c.resultado === 'passou' ? 'text-emerald-600' : c.resultado === 'pendente' ? 'text-amber-600' : 'text-red-600'}>
                  {c.resultado === 'passou' ? 'PASSOU' : c.resultado === 'pendente' ? 'PENDENTE' : 'BLOQUEADO'} · <span className="font-medium">{c.item}</span> — {c.detalhe}
                </p>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={checklistRenovacao.some((c) => c.resultado === 'bloqueado')} onClick={() => registrarDecisaoRenovacao('aditivo')}>
              Renovar por ADITIVO
            </Button>
            <Button size="sm" disabled={checklistRenovacao.some((c) => c.resultado === 'bloqueado')} onClick={() => registrarDecisaoRenovacao('nova_versao')}>
              Renovar por NOVA VERSÃO
            </Button>
          </div>
          {checklistRenovacao.some((c) => c.resultado === 'bloqueado') && (
            <p className="text-right text-[11px] text-red-600">Itens BLOQUEADOS impedem gerar a documentação de renovação — resolva-os primeiro.</p>
          )}
        </div>
      </Dialog>

      <NovoAditivoDialog open={aditivoAberto} onOpenChange={setAditivoAberto} empresaId={empresaId} contratoId={contrato.id} />
    </div>
  );
}
