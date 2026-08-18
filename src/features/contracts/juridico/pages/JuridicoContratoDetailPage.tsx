import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Copy,
  Download,
  FileDiff,
  FilePlus2,
  Pencil,
  Plus,
  RefreshCcw,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Tabs } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { HistoricoPanel } from '@/shared/capabilities/components/HistoricoPanel';
import { uploadArquivo } from '@/shared/capabilities/api/arquivos';
import { getMotorista } from '@/features/motoristas/api/motoristas';
import { getVeiculo } from '@/features/frota/api/veiculos';
import { useContrato } from '../../hooks/useContratos';
import { StatusBadge } from '../../components/StatusBadge';
import { getEmpresaParaContrato, gravarCorpoVersao } from '../api';
import {
  useAditivos,
  useGerarVersao,
  useMudarStatusVersao,
  useUpdateAditivoStatus,
  useVersoes,
} from '../hooks';
import { hashCorpo } from '../lib';
import { montarSnapshot } from '../validacao';
import { gerarPdfContrato } from '../pdf';
import {
  CONTRATO_ADITIVO_STATUS_LABEL,
  CONTRATO_ADITIVO_TIPO_LABEL,
  CONTRATO_VERSAO_STATUS_LABEL,
  CONTRATO_VERSAO_TRANSITIONS,
  type ContratoVersao,
  type ContratoVersaoStatus,
} from '../types';
import { DocumentoView } from '../components/DocumentoView';
import { FichaJuridicaPanel } from '../components/FichaJuridicaPanel';
import { SeguroPanel } from '../components/SeguroPanel';
import { RescisaoPanel } from '../components/RescisaoPanel';
import { DossiePanel } from '../components/DossiePanel';
import { useRevisoesTemplate } from '../hooksFase3';
import { templateAprovadoJuridicamente } from '../apiFase3';
import { useTemplatesJuridico } from '../hooks';
import { VersaoStatusBadge } from '../components/VersaoStatusBadge';
import { AssinaturasPanel } from '../components/AssinaturasPanel';
import { CompararVersoesDialog } from '../components/CompararVersoesDialog';
import { NovoAditivoDialog } from '../components/NovoAditivoDialog';

// Tela individual do contrato no Jurídico (regra 27): documento central + painel lateral com
// versão/status/hash/ações. As transições oferecidas são EXATAMENTE as do mapa espelhado da
// state machine (CONTRATO_VERSAO_TRANSITIONS) — e o trigger do banco é quem valida de verdade.

const ACAO_LABEL: Partial<Record<ContratoVersaoStatus, string>> = {
  em_revisao: 'Enviar para revisão',
  aprovada: 'Aprovar',
  aguardando_assinatura: 'Enviar para assinatura (congela)',
  assinada: 'Marcar como assinada',
  vigente: 'Tornar vigente',
  substituida: 'Marcar como substituída',
  rascunho: 'Devolver para rascunho',
  cancelada: 'Cancelar versão',
};

export function JuridicoContratoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const qc = useQueryClient();

  const { data: contrato, isLoading: carregandoContrato } = useContrato(id);
  const { data: versoes } = useVersoes(id);
  const { data: aditivos } = useAditivos(id);
  const mudarStatus = useMudarStatusVersao();
  const gerarNovaVersao = useGerarVersao();
  const atualizarAditivo = useUpdateAditivoStatus();

  const [versaoSelecionadaId, setVersaoSelecionadaId] = useState<string | null>(null);
  const templatesQuery = useTemplatesJuridico();
  const [compararAberto, setCompararAberto] = useState(false);
  const [aditivoAberto, setAditivoAberto] = useState(false);
  const [editorAberto, setEditorAberto] = useState(false);
  const [corpoEditado, setCorpoEditado] = useState('');

  const versao: ContratoVersao | undefined = useMemo(() => {
    if (!versoes || versoes.length === 0) return undefined;
    return versoes.find((v) => v.id === versaoSelecionadaId) ?? versoes[0];
  }, [versoes, versaoSelecionadaId]);

  useEffect(() => {
    if (versao) setCorpoEditado(versao.corpo ?? '');
  }, [versao]);

  // Fase 3 (regras 25/27): aprovação jurídica REAL (revisões da versão do template usada no
  // snapshot) + alerta de template desatualizado (nunca atualiza contrato antigo sozinho).
  const revisoesQuery = useRevisoesTemplate(versao?.template_id ?? undefined);
  const templateVersaoUsada = (versao?.snapshot as { _meta?: { template_versao?: number } } | undefined)?._meta?.template_versao;
  const templateAprovado =
    !!revisoesQuery.data && templateVersaoUsada != null
      ? templateAprovadoJuridicamente(revisoesQuery.data, templateVersaoUsada)
      : false;
  const templateAtual = templatesQuery.data?.find((t) => t.id === versao?.template_id);
  const templateDesatualizado =
    templateAtual != null && templateVersaoUsada != null && templateAtual.versao_template > templateVersaoUsada;

  // Editor de rascunho (regra 14): corpo editável SÓ enquanto não congelada; salvar recalcula o
  // hash. Depois do congelamento o banco recusa (trigger) — a UI nem oferece.
  const salvarRascunho = useMutation({
    mutationFn: async () => {
      const hash = await hashCorpo(corpoEditado);
      return gravarCorpoVersao(versao!.id, corpoEditado, hash);
    },
    onSuccess: () => {
      toast.success('Rascunho salvo', 'Hash recalculado.');
      setEditorAberto(false);
      qc.invalidateQueries({ queryKey: ['juridico'] });
    },
    onError: (e) => toast.error('Não foi possível salvar', extrairMensagemDeErro(e)),
  });

  // Nova versão (regra 15): re-fotografa o cadastro ATUAL (motorista/veículo/empresa/condições
  // do contrato) com o MESMO template da versão base e cria v(n+1) em rascunho. A versão antiga
  // permanece intacta — é exatamente o fluxo exigido quando algo mudou depois do congelamento.
  const novaVersao = useMutation({
    mutationFn: async () => {
      if (!contrato || !versao?.template_id || !empresaId) throw new Error('Sem template de origem para regenerar.');
      const { data: template, error } = await import('@/shared/lib/supabase').then(({ supabase }) =>
        supabase.from('contrato_templates').select('*').eq('id', versao.template_id!).single(),
      );
      if (error) throw error;
      const [motorista, veiculo, empresa] = await Promise.all([
        getMotorista(contrato.motorista_id),
        getVeiculo(contrato.veiculo_id),
        getEmpresaParaContrato(empresaId),
      ]);
      const snapshot = montarSnapshot({
        empresa,
        motorista,
        veiculo,
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
        template: { id: template.id, nome: template.nome, versao_template: template.versao_template },
      });
      return gerarNovaVersao.mutateAsync({
        empresaId,
        contratoId: contrato.id,
        templateId: template.id,
        templateCorpo: template.corpo,
        snapshot,
      });
    },
    onSuccess: (v) => {
      toast.success(`Versão ${v.rotulo ?? `v${v.numero}`} criada`, 'Rascunho novo com snapshot atual do cadastro.');
      setVersaoSelecionadaId(v.id);
    },
    onError: (e) => toast.error('Não foi possível criar a nova versão', extrairMensagemDeErro(e)),
  });

  // PDF (regras 19–21): gera o PDF real (pdfmake, chunk lazy), baixa E arquiva no Storage
  // existente (bucket contratos-arquivos) com registro em `arquivos` — aba Anexos lista.
  const gerarPdf = useMutation({
    mutationFn: async () => {
      if (!versao || !contrato) throw new Error('Sem versão selecionada.');
      const blob = await gerarPdfContrato({
        numeroContrato: contrato.id.slice(0, 8).toUpperCase(),
        rotuloVersao: versao.rotulo ?? `v${versao.numero}`,
        statusVersao: CONTRATO_VERSAO_STATUS_LABEL[versao.status],
        hashSha256: versao.hash_sha256,
        corpo: versao.corpo ?? '',
        nomeMotorista: contrato.motorista?.nome_completo ?? '—',
        placaVeiculo: contrato.veiculo?.placa ?? '—',
        geradoEm: new Date().toISOString(),
        templateAprovado, // real: revisão jurídica aprovada da versão do template usada (regra 25)
      });
      const nome = `contrato-${contrato.id.slice(0, 8)}-${versao.rotulo ?? `v${versao.numero}`}.pdf`;
      // download local
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      // arquivo no Storage + registro em `arquivos` (aba Anexos)
      if (empresaId) {
        await uploadArquivo({
          bucket: 'contratos-arquivos',
          empresaId,
          entidadeTipo: 'contrato',
          entidadeId: contrato.id,
          categoria: 'contrato-pdf',
          usuarioId: usuario?.id,
          file: new File([blob], nome, { type: 'application/pdf' }),
        });
      }
      return nome;
    },
    onSuccess: (nome) => {
      toast.success('PDF gerado', `${nome} baixado e arquivado nos Anexos.`);
      qc.invalidateQueries({ queryKey: ['arquivos'] });
    },
    onError: (e) => toast.error('Não foi possível gerar o PDF', extrairMensagemDeErro(e)),
  });

  if (carregandoContrato) return <div className="p-8 text-sm text-neutral-500">Carregando contrato…</div>;
  if (!contrato) return <div className="p-8 text-sm text-red-600">Contrato não encontrado.</div>;

  const transicoes = versao ? CONTRATO_VERSAO_TRANSITIONS[versao.status] : [];

  return (
    <div className="p-8">
      <Link to="/juridico/contratos" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" /> Contratos — Jurídico
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Contrato #{contrato.id.slice(0, 8).toUpperCase()}
            <StatusBadge status={contrato.status} />
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {contrato.motorista?.nome_completo} · {contrato.veiculo?.placa} · {formatMoeda(contrato.valor_periodico)}/{contrato.periodicidade}
            {' · '}
            {formatDataSimples(contrato.data_inicio)} → {contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : 'indeterminado'}
          </p>
        </div>
        <Link to={`/contratos/${contrato.id}`} className="text-xs font-medium text-emerald-600 hover:underline">
          Abrir no módulo Contratos (financeiro/operacional) →
        </Link>
      </div>

      {!versao && (
        <div className="mt-6 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
          Este contrato ainda não tem nenhuma versão de documento.{' '}
          <Link to="/juridico/contratos/novo" className="font-medium underline">
            Gere pelo wizard
          </Link>{' '}
          (contratos novos) — contratos antigos ganham documento pela primeira “Nova versão” assim que houver template publicado.
        </div>
      )}

      {versao && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Documento central */}
          <div className="lg:col-span-2">
            {templateDesatualizado && (
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300">
                Existe uma versão mais recente do modelo (template v{templateAtual?.versao_template}; este documento usou a v
                {templateVersaoUsada}). Contratos existentes NÃO mudam — gere uma nova versão se quiser adotar o modelo novo.
              </div>
            )}
            <DocumentoView corpo={versao.corpo ?? '_Sem corpo gerado._'} congelada={versao.congelada} templateAprovado={templateAprovado} />
          </div>

          {/* Painel lateral */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{versao.rotulo ?? `v${versao.numero}`}</p>
                <VersaoStatusBadge status={versao.status} />
              </div>
              <dl className="mt-3 space-y-1.5 text-xs text-neutral-500">
                <div className="flex justify-between">
                  <dt>Criada</dt>
                  <dd>{formatDataSimples(versao.criado_em)}</dd>
                </div>
                {versao.aprovada_em && (
                  <div className="flex justify-between">
                    <dt>Aprovada</dt>
                    <dd>{formatDataSimples(versao.aprovada_em)}</dd>
                  </div>
                )}
                {versao.congelada_em && (
                  <div className="flex justify-between">
                    <dt>Congelada</dt>
                    <dd>{formatDataSimples(versao.congelada_em)}</dd>
                  </div>
                )}
                <div className="pt-1">
                  <dt className="mb-0.5">SHA-256 do corpo</dt>
                  <dd className="flex items-center gap-1">
                    <code className="block truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-800">
                      {versao.hash_sha256 ?? '— (sem hash)'}
                    </code>
                    {versao.hash_sha256 && (
                      <button
                        type="button"
                        className="shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        onClick={() => {
                          navigator.clipboard.writeText(versao.hash_sha256!);
                          toast.info('Hash copiado');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </dd>
                </div>
              </dl>

              {/* Ações de workflow — só as transições válidas do estado atual */}
              <div className="mt-4 space-y-2">
                {transicoes.map((alvo) => (
                  <Button
                    key={alvo}
                    size="sm"
                    variant={alvo === 'cancelada' ? 'ghost' : alvo === 'aguardando_assinatura' ? 'default' : 'outline'}
                    className={cn('w-full justify-center', alvo === 'cancelada' && 'text-red-600')}
                    disabled={mudarStatus.isPending}
                    onClick={() =>
                      mudarStatus.mutate(
                        { id: versao.id, status: alvo },
                        {
                          onSuccess: () => toast.success('Status atualizado', CONTRATO_VERSAO_STATUS_LABEL[alvo]),
                          onError: (e) => toast.error('Transição recusada pelo banco', extrairMensagemDeErro(e)),
                        },
                      )
                    }
                  >
                    {ACAO_LABEL[alvo] ?? CONTRATO_VERSAO_STATUS_LABEL[alvo]}
                  </Button>
                ))}
                {!versao.congelada && (
                  <Button size="sm" variant="outline" className="w-full justify-center" onClick={() => setEditorAberto(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar rascunho
                  </Button>
                )}
                <Button size="sm" variant="outline" className="w-full justify-center" disabled={gerarPdf.isPending} onClick={() => gerarPdf.mutate()}>
                  <Download className="h-3.5 w-3.5" /> {gerarPdf.isPending ? 'Gerando PDF…' : 'Gerar PDF (baixa + arquiva)'}
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-center" disabled={novaVersao.isPending} onClick={() => novaVersao.mutate()}>
                  <RefreshCcw className="h-3.5 w-3.5" /> {novaVersao.isPending ? 'Gerando…' : 'Nova versão (snapshot atual)'}
                </Button>
              </div>
              {!versao.congelada && (
                <p className="mt-2 text-[11px] leading-snug text-neutral-400">Documento ainda não congelado — congela ao enviar para assinatura.</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Abas */}
      <div className="mt-8">
        <Tabs
          items={[
            {
              value: 'ficha',
              label: 'Ficha Jurídica',
              content: (
                <FichaJuridicaPanel
                  contrato={contrato}
                  versaoAtual={versao}
                  assinaturas={undefined}
                  aditivosPendentes={(aditivos ?? []).filter((a) => a.status === 'rascunho').length}
                />
              ),
            },
            {
              value: 'versoes',
              label: `Versões (${versoes?.length ?? 0})`,
              content: (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={(versoes?.length ?? 0) < 2} onClick={() => setCompararAberto(true)}>
                      <FileDiff className="h-3.5 w-3.5" /> Comparar versões
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                        <tr>
                          <th className="px-4 py-2.5">Versão</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Criada</th>
                          <th className="px-4 py-2.5">Congelada</th>
                          <th className="px-4 py-2.5">Hash</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {(versoes ?? []).map((v) => (
                          <tr key={v.id} className={cn('border-t border-neutral-100 dark:border-neutral-800', v.id === versao?.id && 'bg-emerald-50/50 dark:bg-emerald-900/10')}>
                            <td className="px-4 py-2.5 font-medium">{v.rotulo ?? `v${v.numero}`}</td>
                            <td className="px-4 py-2.5">
                              <VersaoStatusBadge status={v.status} />
                            </td>
                            <td className="px-4 py-2.5 text-xs text-neutral-500">{formatDataSimples(v.criado_em)}</td>
                            <td className="px-4 py-2.5 text-xs">{v.congelada ? '🔒 sim' : 'não'}</td>
                            <td className="px-4 py-2.5">
                              <code className="text-[10px] text-neutral-500">{v.hash_sha256 ? `${v.hash_sha256.slice(0, 16)}…` : '—'}</code>
                            </td>
                            <td className="px-4 py-2.5">
                              <button type="button" className="text-xs font-medium text-emerald-600 hover:underline" onClick={() => setVersaoSelecionadaId(v.id)}>
                                {v.id === versao?.id ? 'Selecionada' : 'Ver'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            },
            {
              value: 'assinaturas',
              label: 'Assinaturas',
              content: versao ? (
                <AssinaturasPanel versaoId={versao.id} empresaId={empresaId} versaoAguardandoAssinatura={versao.status === 'aguardando_assinatura'} />
              ) : (
                <p className="text-sm text-neutral-500">Sem versão.</p>
              ),
            },
            {
              value: 'aditivos',
              label: `Aditivos (${aditivos?.length ?? 0})`,
              content: (
                <div>
                  <Button size="sm" className="mb-3" onClick={() => setAditivoAberto(true)}>
                    <Plus className="h-3.5 w-3.5" /> Novo aditivo
                  </Button>
                  {(aditivos ?? []).length === 0 ? (
                    <p className="text-sm text-neutral-500">Nenhum aditivo. O contrato original permanece como assinado.</p>
                  ) : (
                    <div className="space-y-2">
                      {(aditivos ?? []).map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {CONTRATO_ADITIVO_TIPO_LABEL[a.tipo]} · {formatDataSimples(a.criado_em)}
                            </p>
                            <p className="truncate text-xs text-neutral-500">{a.descricao ?? '—'}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant={a.status === 'vigente' ? 'success' : a.status === 'cancelado' ? 'outline' : 'warning'}>
                              {CONTRATO_ADITIVO_STATUS_LABEL[a.status]}
                            </Badge>
                            {a.status === 'rascunho' && (
                              <>
                                <Button size="sm" variant="outline" disabled={atualizarAditivo.isPending} onClick={() => atualizarAditivo.mutate({ id: a.id, status: 'vigente' })}>
                                  Tornar vigente
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600" disabled={atualizarAditivo.isPending} onClick={() => atualizarAditivo.mutate({ id: a.id, status: 'cancelado' })}>
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-[11px] text-neutral-400">
                        <FilePlus2 className="mr-1 inline h-3 w-3" />
                        Documento do aditivo = “Nova versão (snapshot atual)” na barra lateral — a versão nova nasce rotulada e o original fica intacto.
                      </p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              value: 'anexos',
              label: 'Anexos',
              content: (
                <ArquivosPanel
                  entidadeTipo="contrato"
                  entidadeId={contrato.id}
                  categoria="juridico"
                  bucket="contratos-arquivos"
                  empresaId={empresaId}
                  usuarioId={usuario?.id}
                  label="Anexos do contrato (PDFs gerados, apólice, comprovantes)"
                />
              ),
            },
            { value: 'seguro', label: 'Seguro', content: <SeguroPanel contratoId={contrato.id} empresaId={empresaId} /> },
            { value: 'rescisao', label: 'Rescisão', content: <RescisaoPanel contratoId={contrato.id} empresaId={empresaId} /> },
            {
              value: 'dossie',
              label: 'Dossiê',
              content: <DossiePanel contrato={contrato} versoes={versoes ?? []} aditivos={aditivos ?? []} empresaId={empresaId} />,
            },
            { value: 'timeline', label: 'Timeline', content: <TimelinePanel entidadeTipo="contrato" entidadeId={contrato.id} /> },
            {
              value: 'auditoria',
              label: 'Auditoria',
              content: (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Versão selecionada</h3>
                    <HistoricoPanel tabela="contrato_versoes" registroId={versao?.id} />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Contrato</h3>
                    <HistoricoPanel tabela="contratos" registroId={contrato.id} />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Diálogos */}
      {versoes && <CompararVersoesDialog open={compararAberto} onOpenChange={setCompararAberto} versoes={versoes} />}
      <NovoAditivoDialog open={aditivoAberto} onOpenChange={setAditivoAberto} empresaId={empresaId} contratoId={contrato.id} />
      <Dialog open={editorAberto} onOpenChange={setEditorAberto} title="Editar rascunho" description="Documento ainda não congelado. Salvar recalcula o hash. Ao enviar para assinatura, congela e não muda mais." className="max-w-3xl">
        <Textarea value={corpoEditado} onChange={(e) => setCorpoEditado(e.target.value)} className="min-h-[50vh] font-mono text-xs" />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditorAberto(false)}>
            Cancelar
          </Button>
          <Button disabled={salvarRascunho.isPending} onClick={() => salvarRascunho.mutate()}>
            {salvarRascunho.isPending ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
