import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronLeft, Copy, Download, Eye, FileStack, Gavel, Import, Pencil, Upload } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateTemplate, useTemplatesJuridico, useUpdateTemplate } from '../hooks';
import { useCreateRevisao, useTodasRevisoes } from '../hooksFase3';
import { REVISAO_JURIDICA_STATUS_LABEL, type RevisaoJuridicaStatus } from '../apiFase3';
import {
  contarContratosPorTemplate,
  ehVersaoOficial,
  importarCorpoTemplate,
  instalarBiblioteca,
  listHistoricoTemplate,
  ORIGEM_HISTORICO_LABEL,
  statusBiblioteca,
  STATUS_BIBLIOTECA_LABEL,
  type StatusBiblioteca,
} from '../apiBiblioteca';
import { BIBLIOTECA, CATEGORIA_BIBLIOTECA_LABEL, type CategoriaBiblioteca } from '../biblioteca';
import { extrairVariaveis } from '../lib';
import { extrairPendenciasJuridicas } from '../pendenciasMinuta';
import { diffLinhas, resumoDiff } from '../diff';
import { DocumentoView } from '../components/DocumentoView';
import type { ContratoTemplate } from '../types';

// BIBLIOTECA CONTRATUAL (Fase 5). A lista agrupa por categoria; cada template abre com visão,
// histórico (0046 — nada se perde), importação do retorno do advogado, revisão jurídica e
// contratos que o utilizam. Editar/importar NUNCA altera contratos gerados (corpo congelado por
// versão) nem apaga corpos anteriores (trigger fotografa). OFICIAL = publicado + aprovado
// juridicamente na versão atual; antes disso, tudo é MINUTA.

const COR_STATUS: Record<StatusBiblioteca, 'secondary' | 'info' | 'warning' | 'success' | 'outline' | 'destructive'> = {
  rascunho: 'secondary',
  em_revisao: 'info',
  enviado_advogado: 'warning',
  retorno_recebido: 'info',
  em_ajuste: 'warning',
  aprovado_juridicamente: 'success',
  publicado: 'success',
  arquivado: 'outline',
};

const ORDEM_CATEGORIAS: CategoriaBiblioteca[] = [
  'contrato',
  'aditivo',
  'termo_operacional',
  'termo_responsabilidade',
  'seguro',
  'sinistro',
  'rescisao',
  'lgpd',
];

export function JuridicoTemplatesPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const qc = useQueryClient();
  const { data: templates, isLoading } = useTemplatesJuridico();
  const { data: revisoes } = useTodasRevisoes();
  const atualizar = useUpdateTemplate();
  const criarTemplate = useCreateTemplate();
  const criarRevisao = useCreateRevisao();

  const [aberto, setAberto] = useState<ContratoTemplate | null>(null);
  const [abaAberta, setAbaAberta] = useState<'documento' | 'historico' | 'importar' | 'revisao'>('documento');
  const [editando, setEditando] = useState(false);
  const [corpoEdit, setCorpoEdit] = useState('');
  const [importForm, setImportForm] = useState({ corpo: '', responsavel: '', observacao: '', origem: 'retorno_advogado' as 'retorno_advogado' | 'ajuste_interno' });
  const [revForm, setRevForm] = useState({ status: 'em_analise' as RevisaoJuridicaStatus, responsavel: '', observacoes: '' });
  const [diffDe, setDiffDe] = useState<string | null>(null);

  const idsTemplates = useMemo(() => (templates ?? []).map((t) => t.id), [templates]);
  const contratosUsando = useQuery({
    queryKey: ['juridico', 'templates-uso', idsTemplates],
    enabled: idsTemplates.length > 0,
    queryFn: () => contarContratosPorTemplate(idsTemplates),
  });
  const historico = useQuery({
    queryKey: ['juridico', 'template-historico', aberto?.id],
    enabled: !!aberto,
    queryFn: () => listHistoricoTemplate(aberto!.id),
  });

  const revisoesDe = (t: ContratoTemplate) => (revisoes ?? []).filter((r) => r.template_id === t.id);
  const statusDe = (t: ContratoTemplate): StatusBiblioteca => {
    const hist = aberto?.id === t.id ? historico.data : undefined;
    return statusBiblioteca(t, revisoesDe(t), hist?.[0]?.origem ?? null);
  };

  const instalar = useMutation({
    mutationFn: () => instalarBiblioteca(empresaId!, templates ?? []),
    onSuccess: (r) => {
      toast.success(
        r.criados.length > 0 ? `${r.criados.length} minuta(s) instalada(s)` : 'Biblioteca já instalada',
        r.jaExistiam > 0 ? `${r.jaExistiam} já existiam e foram preservadas (nunca sobrescrevemos).` : undefined,
      );
      qc.invalidateQueries({ queryKey: ['juridico'] });
    },
    onError: (e) => toast.error('Instalação falhou', extrairMensagemDeErro(e)),
  });

  const importar = useMutation({
    mutationFn: () =>
      importarCorpoTemplate({
        templateId: aberto!.id,
        corpoNovo: importForm.corpo,
        origem: importForm.origem,
        responsavel: importForm.responsavel.trim(),
        observacao: importForm.observacao || undefined,
      }),
    onSuccess: () => {
      toast.success('Nova redação importada', 'A redação anterior foi fotografada no histórico — nada se perdeu.');
      setImportForm({ corpo: '', responsavel: '', observacao: '', origem: 'retorno_advogado' });
      qc.invalidateQueries({ queryKey: ['juridico'] });
      setAberto(null);
    },
    onError: (e) => toast.error('Importação bloqueada', extrairMensagemDeErro(e)),
  });

  const exportarMd = (t: ContratoTemplate) => {
    const blob = new Blob([t.corpo], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.nome.replace(/[^\w-]+/g, '_')}-v${t.versao_template}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const duplicar = (t: ContratoTemplate) => {
    criarTemplate.mutate(
      {
        empresaId: empresaId!,
        payload: { nome: `${t.nome} (cópia)`, descricao: t.descricao, tipo: t.tipo, corpo: t.corpo, variaveis: t.variaveis, status: 'rascunho' },
      },
      {
        onSuccess: () => toast.success('Template duplicado', 'A cópia nasce em rascunho.'),
        onError: (e) => toast.error('Não foi possível duplicar', extrairMensagemDeErro(e)),
      },
    );
  };

  const mudarStatus = (t: ContratoTemplate, status: ContratoTemplate['status']) => {
    atualizar.mutate(
      { id: t.id, payload: { status } },
      {
        onSuccess: () => toast.success(`Template ${status === 'publicado' ? 'publicado (nova versão se republicação)' : status}`),
        onError: (e) => toast.error('Não foi possível mudar o status', extrairMensagemDeErro(e)),
      },
    );
  };

  const grupos = useMemo(() => {
    const mapa = new Map<string, ContratoTemplate[]>();
    for (const t of templates ?? []) {
      const lista = mapa.get(t.tipo) ?? [];
      lista.push(t);
      mapa.set(t.tipo, lista);
    }
    return mapa;
  }, [templates]);

  const categoriasOrdenadas = [
    ...ORDEM_CATEGORIAS.filter((c) => grupos.has(c)),
    ...[...grupos.keys()].filter((c) => !ORDEM_CATEGORIAS.includes(c as CategoriaBiblioteca)),
  ];

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Jurídico
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <FileStack className="h-6 w-6 text-emerald-600" aria-hidden /> Biblioteca Contratual
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            {BIBLIOTECA.length} minutas oficiais da PrimeCharge, todas SUJEITAS À VALIDAÇÃO JURÍDICA. Editar ou importar nunca
            altera contratos já gerados nem apaga redações anteriores.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/juridico/pacote-advogado" className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            <Gavel className="h-4 w-4" aria-hidden /> Pacote para Advogado
          </Link>
          <Button onClick={() => instalar.mutate()} disabled={instalar.isPending || !empresaId || isLoading}>
            <BookOpen className="h-4 w-4" aria-hidden /> {instalar.isPending ? 'Instalando…' : 'Instalar biblioteca'}
          </Button>
        </div>
      </div>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (templates ?? []).length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            Nenhum template ainda. Clique em <span className="font-medium">Instalar biblioteca</span> para materializar as{' '}
            {BIBLIOTECA.length} minutas oficiais.
          </p>
        </div>
      )}

      {categoriasOrdenadas.map((categoria) => (
        <section key={categoria} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {CATEGORIA_BIBLIOTECA_LABEL[categoria as CategoriaBiblioteca] ?? categoria}
          </h2>
          <div className="space-y-2">
            {(grupos.get(categoria) ?? []).map((t) => {
              const st = statusDe(t);
              const oficial = ehVersaoOficial(t, revisoesDe(t));
              const usando = contratosUsando.data?.get(t.id) ?? 0;
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {t.nome}
                      <Badge variant={COR_STATUS[st]}>{STATUS_BIBLIOTECA_LABEL[st]}</Badge>
                      <Badge variant={oficial ? 'success' : 'warning'}>{oficial ? 'VERSÃO OFICIAL' : 'MINUTA'}</Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      v{t.versao_template} · {t.variaveis.length} variáveis · {usando} contrato(s) usando · atualizado{' '}
                      {formatDataSimples(t.atualizado_em)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="ghost" aria-label={`Abrir ${t.nome}`} onClick={() => { setAberto(t); setAbaAberta('documento'); setEditando(false); setCorpoEdit(t.corpo); setDiffDe(null); }}>
                      <Eye className="h-3.5 w-3.5" aria-hidden /> Abrir
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Exportar ${t.nome}`} onClick={() => exportarMd(t)}>
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Duplicar ${t.nome}`} onClick={() => duplicar(t)}>
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    {t.status === 'rascunho' && (
                      <Button size="sm" variant="outline" onClick={() => mudarStatus(t, 'publicado')}>
                        <Upload className="h-3.5 w-3.5" aria-hidden /> Publicar
                      </Button>
                    )}
                    {t.status === 'publicado' && (
                      <Button size="sm" variant="ghost" onClick={() => mudarStatus(t, 'arquivado')}>
                        Arquivar
                      </Button>
                    )}
                    {t.status === 'arquivado' && (
                      <Button size="sm" variant="ghost" onClick={() => mudarStatus(t, 'rascunho')}>
                        Reativar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ===== Visão do template ===== */}
      <Dialog
        open={aberto !== null}
        onOpenChange={(v) => !v && setAberto(null)}
        title={aberto?.nome ?? ''}
        description={aberto ? `v${aberto.versao_template} · ${STATUS_BIBLIOTECA_LABEL[statusDe(aberto)]} · ${extrairPendenciasJuridicas(aberto.corpo).length} pendências jurídicas no texto` : undefined}
        className="max-w-4xl"
      >
        {aberto && (
          <div>
            <div className="mb-3 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
              {(
                [
                  ['documento', 'Documento'],
                  ['historico', `Histórico (${historico.data?.length ?? 0})`],
                  ['importar', 'Importar retorno'],
                  ['revisao', 'Revisão jurídica'],
                ] as const
              ).map(([aba, rotulo]) => (
                <button
                  key={aba}
                  type="button"
                  onClick={() => setAbaAberta(aba)}
                  className={cn(
                    'border-b-2 px-3 py-2 text-sm font-medium',
                    abaAberta === aba ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-neutral-500',
                  )}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {abaAberta === 'documento' && !editando && (
              <div>
                <DocumentoView corpo={aberto.corpo} congelada={false} templateAprovado={ehVersaoOficial(aberto, revisoesDe(aberto))} />
                <div className="mt-3 flex justify-end gap-2">
                  {aberto.status !== 'arquivado' && (
                    <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar rascunho
                    </Button>
                  )}
                </div>
              </div>
            )}

            {abaAberta === 'documento' && editando && (
              <div>
                <Textarea value={corpoEdit} onChange={(e) => setCorpoEdit(e.target.value)} className="min-h-[50vh] font-mono text-xs" />
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={atualizar.isPending}
                    onClick={() =>
                      atualizar.mutate(
                        { id: aberto.id, payload: { corpo: corpoEdit, variaveis: extrairVariaveis(corpoEdit) } },
                        {
                          onSuccess: () => {
                            toast.success('Template salvo', 'A redação anterior foi fotografada no histórico.');
                            setEditando(false);
                            setAberto(null);
                            qc.invalidateQueries({ queryKey: ['juridico'] });
                          },
                          onError: (e) => toast.error('Não foi possível salvar', extrairMensagemDeErro(e)),
                        },
                      )
                    }
                  >
                    {atualizar.isPending ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </div>
            )}

            {abaAberta === 'historico' && (
              <div className="space-y-2">
                {(historico.data ?? []).length === 0 && (
                  <p className="text-sm text-neutral-500">Nenhuma redação anterior — o histórico nasce na primeira alteração de corpo.</p>
                )}
                {(historico.data ?? []).map((h) => (
                  <div key={h.id} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="font-medium">{ORIGEM_HISTORICO_LABEL[h.origem]}</span> · fotografada em{' '}
                        {formatDataSimples(h.criado_em)} (era v{h.versao_template})
                        {h.responsavel_nome && ` · ${h.responsavel_nome}`}
                        {h.observacao && ` — ${h.observacao}`}
                      </p>
                      <button type="button" className="text-xs font-medium text-emerald-600 hover:underline" onClick={() => setDiffDe(diffDe === h.id ? null : h.id)}>
                        {diffDe === h.id ? 'Fechar comparação' : 'Comparar com o atual'}
                      </button>
                    </div>
                    {h.hash_sha256 && <p className="mt-0.5 break-all font-mono text-[9px] text-neutral-400">SHA-256 {h.hash_sha256}</p>}
                    {diffDe === h.id && (
                      <DiffTemplate anterior={h.corpo} atual={aberto.corpo} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {abaAberta === 'importar' && (
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">
                  Cole a redação devolvida pelo advogado (ou o ajuste interno). A redação ATUAL será fotografada automaticamente no
                  histórico — nada é sobrescrito de forma irreversível. Variável fora do catálogo bloqueia a importação.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label>Origem</Label>
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
                      value={importForm.origem}
                      onChange={(e) => setImportForm((f) => ({ ...f, origem: e.target.value as typeof f.origem }))}
                    >
                      <option value="retorno_advogado">Retorno do advogado</option>
                      <option value="ajuste_interno">Ajuste interno</option>
                    </select>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input className="mt-1" value={importForm.responsavel} onChange={(e) => setImportForm((f) => ({ ...f, responsavel: e.target.value }))} placeholder="Quem produziu esta redação" />
                  </div>
                  <div>
                    <Label>Observação</Label>
                    <Input className="mt-1" value={importForm.observacao} onChange={(e) => setImportForm((f) => ({ ...f, observacao: e.target.value }))} placeholder="Ex.: 2ª rodada de revisão" />
                  </div>
                </div>
                <div>
                  <Label>Nova redação (markdown com {'{{variáveis}}'})</Label>
                  <Textarea className="mt-1 min-h-[38vh] font-mono text-xs" value={importForm.corpo} onChange={(e) => setImportForm((f) => ({ ...f, corpo: e.target.value }))} />
                </div>
                <div className="flex justify-end">
                  <Button disabled={importar.isPending || importForm.corpo.trim().length < 50 || importForm.responsavel.trim().length < 3} onClick={() => importar.mutate()}>
                    <Import className="h-4 w-4" aria-hidden /> {importar.isPending ? 'Importando…' : 'Importar nova redação'}
                  </Button>
                </div>
              </div>
            )}

            {abaAberta === 'revisao' && (
              <div className="space-y-4">
                <p className="rounded-lg bg-neutral-50 px-3 py-2 text-[11px] leading-snug text-neutral-500 dark:bg-neutral-900">
                  Esta aprovação representa o registro operacional da revisão realizada pelo usuário identificado. Não representa
                  certificação jurídica automática pelo sistema.
                </p>
                {revisoesDe(aberto).length === 0 ? (
                  <p className="text-sm text-neutral-500">Nenhuma revisão registrada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {revisoesDe(aberto).map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
                        <span className="truncate text-neutral-600 dark:text-neutral-300">
                          v{r.versao_template} · {r.responsavel_nome ?? 'usuário do sistema'} · {formatDataSimples(r.criado_em)}
                          {r.observacoes && ` — ${r.observacoes}`}
                        </span>
                        <Badge variant={r.status === 'aprovado' || r.status === 'aprovado_com_ressalvas' ? 'success' : r.status === 'reprovado' ? 'destructive' : 'info'}>
                          {REVISAO_JURIDICA_STATUS_LABEL[r.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Resultado</Label>
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
                      value={revForm.status}
                      onChange={(e) => setRevForm((f) => ({ ...f, status: e.target.value as RevisaoJuridicaStatus }))}
                    >
                      {Object.entries(REVISAO_JURIDICA_STATUS_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Responsável (advogado)</Label>
                    <Input className="mt-1" value={revForm.responsavel} onChange={(e) => setRevForm((f) => ({ ...f, responsavel: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Observações / ressalvas</Label>
                    <Textarea className="mt-1" value={revForm.observacoes} onChange={(e) => setRevForm((f) => ({ ...f, observacoes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    disabled={criarRevisao.isPending || !empresaId || revForm.responsavel.trim().length < 3}
                    onClick={() =>
                      criarRevisao.mutate(
                        {
                          empresaId: empresaId!,
                          payload: {
                            template_id: aberto.id,
                            versao_template: aberto.versao_template,
                            responsavel_id: usuario?.id ?? null,
                            responsavel_nome: revForm.responsavel.trim(),
                            status: revForm.status,
                            observacoes: revForm.observacoes || null,
                          },
                        },
                        {
                          onSuccess: () => {
                            toast.success('Revisão registrada');
                            setRevForm({ status: 'em_analise', responsavel: '', observacoes: '' });
                          },
                          onError: (e) => toast.error('Não foi possível registrar', extrairMensagemDeErro(e)),
                        },
                      )
                    }
                  >
                    Registrar revisão
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

/** Diff visual redação anterior × atual (só mostra linhas alteradas). */
function DiffTemplate({ anterior, atual }: { anterior: string; atual: string }) {
  const linhas = useMemo(() => diffLinhas(anterior, atual), [anterior, atual]);
  const resumo = resumoDiff(linhas);
  return (
    <div className="mt-2">
      <p className="mb-1 text-[11px] text-neutral-500">
        {resumo.removidas} linha(s) removida(s) · {resumo.adicionadas} adicionada(s) — sem interpretação jurídica, só diferenças.
      </p>
      <div className="max-h-[35vh] overflow-y-auto rounded border border-neutral-200 font-mono text-[10px] leading-relaxed dark:border-neutral-800">
        {linhas.map((l, i) =>
          l.tipo === 'igual' ? null : (
            <div
              key={i}
              className={cn(
                'whitespace-pre-wrap px-2 py-0.5',
                l.tipo === 'removida' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
              )}
            >
              {l.tipo === 'removida' ? '− ' : '+ '}
              {l.texto || ' '}
            </div>
          ),
        )}
        {resumo.removidas === 0 && resumo.adicionadas === 0 && <p className="px-2 py-1 text-neutral-500">Redações idênticas.</p>}
      </div>
    </div>
  );
}
