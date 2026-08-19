import { useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileUp, Import, RotateCcw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { cn } from '@/shared/lib/utils';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { createAcao } from '@/features/operacoes/api/acoes';
import { hashCorpo } from '../lib';
import { CATALOGO_VARIAVEIS } from '../variaveisCatalogo';
import { diffLinhas } from '../diff';
import { extrairTextoDocx } from '../docx';
import {
  analisarImpacto,
  hashBytesSha256,
  identificarVersaoPorHash,
  montarProtocoloRecebimento,
  opcoesVersaoOrigem,
  type ComparacaoSecao,
  type ImpactoRetorno,
} from '../comparador';
import { compararConflitosDoc } from '../qaBiblioteca';
import { BIBLIOTECA } from '../biblioteca';
import { importarCorpoTemplate, type TemplateVersaoHistorico } from '../apiBiblioteca';
import { arquivarRetorno } from '../apiRetornos';
import { useSaveParametro } from '../hooksFase3';
import type { ContratoTemplate } from '../types';

// OFICINA JURÍDICA — IMPORTAÇÃO DO RETORNO (Fase 7). Fluxo ÚNICO em três passos dentro do
// próprio diálogo do template (regra 25 da missão — nada de 15 telas):
//   1. FONTE (colar / .md / .txt / .docx; PDF só arquiva) + VERSÃO DE ORIGEM (nunca assumida)
//   2. ANÁLISE (comparação por cláusula, variáveis, pendências, conflitos, QA estrutural)
//   3. CONFIRMAÇÃO (hashes, contagens) → arquiva original + protocolo, incorpora via RPC 0046
//      (anterior fotografado automaticamente) e devolve o template a RASCUNHO — importar retorno
//      NUNCA significa "aprovado juridicamente".
// O sistema não decide se a alteração do advogado está juridicamente correta — só controla
// o quê/quem/quando/de onde/para onde, e devolve as perguntas ao humano.

type Etapa = 'fonte' | 'analise' | 'confirmar';
type AcaoRemovida = { acao: 'registrar' | 'ignorar'; justificativa?: string };
type ConfirmacaoPendencia = 'resolvida' | 'ainda_pendente' | 'nao_aplicavel';

const ROTULO_STATUS_SECAO: Record<ComparacaoSecao['status'], { rotulo: string; cor: 'success' | 'destructive' | 'warning' | 'info' | 'outline' }> = {
  adicionada: { rotulo: '🟢 NOVA CLÁUSULA', cor: 'success' },
  removida: { rotulo: '🔴 CLÁUSULA REMOVIDA', cor: 'destructive' },
  alterada: { rotulo: '🟡 ALTERADA', cor: 'warning' },
  movida: { rotulo: '🔵 MOVIDA', cor: 'info' },
  igual: { rotulo: 'igual', cor: 'outline' },
};

export function ImportarRetorno({
  template,
  historico,
  onDone,
}: {
  template: ContratoTemplate;
  historico: TemplateVersaoHistorico[];
  onDone: () => void;
}) {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const salvarParametro = useSaveParametro();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<Etapa>('fonte');
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pdfRecebido, setPdfRecebido] = useState(false);
  const [avisoConversao, setAvisoConversao] = useState<string | null>(null);
  const [versaoOrigem, setVersaoOrigem] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [analise, setAnalise] = useState<ImpactoRetorno | null>(null);
  const [hashes, setHashes] = useState<{ atual: string; novo: string } | null>(null);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
  const [acoesRemovidas, setAcoesRemovidas] = useState<Record<string, AcaoRemovida>>({});
  const [confirmPendencias, setConfirmPendencias] = useState<Record<number, ConfirmacaoPendencia>>({});
  const [substituicoes, setSubstituicoes] = useState<Record<string, string>>({});

  const slug = BIBLIOTECA.find((e) => e.nome === template.nome)?.slug ?? '';
  const opcoes = useMemo(
    () => opcoesVersaoOrigem(template, historico, null),
    [template, historico],
  );

  const aoEscolherArquivo = async (f: File) => {
    setArquivo(f);
    setPdfRecebido(false);
    setAvisoConversao(null);
    const ext = f.name.toLowerCase().split('.').pop();
    try {
      if (ext === 'pdf') {
        setPdfRecebido(true);
        setTexto('');
        return;
      }
      if (ext === 'docx') {
        const bytes = new Uint8Array(await f.arrayBuffer());
        setTexto(extrairTextoDocx(bytes));
        setAvisoConversao(
          'Texto extraído do .docx com conversão automática de títulos (heurística) — revise o texto abaixo antes de analisar. Formatação visual do Word não é preservada.',
        );
        return;
      }
      if (ext === 'md' || ext === 'txt') {
        setTexto(await f.text());
        return;
      }
      toast.error('Formato não suportado', 'Aceitos: .md, .txt, .docx (e .pdf apenas para arquivamento).');
      setArquivo(null);
    } catch (e) {
      toast.error('Não foi possível ler o arquivo', extrairMensagemDeErro(e));
      setArquivo(null);
    }
  };

  const analisar = useMutation({
    mutationFn: async () => {
      const [hashAtual, hashNovo] = await Promise.all([hashCorpo(template.corpo), hashCorpo(texto)]);
      return { impacto: analisarImpacto(template.corpo, texto), hashAtual, hashNovo };
    },
    onSuccess: ({ impacto, hashAtual, hashNovo }) => {
      setAnalise(impacto);
      setHashes({ atual: hashAtual, novo: hashNovo });
      // associação automática SÓ por hash idêntico; caso contrário exige seleção manual
      if (!versaoOrigem) {
        const auto = identificarVersaoPorHash(hashNovo, [
          { valor: 'atual', rotulo: `v${template.versao_template} (redação atual)`, hash: hashAtual },
          ...opcoes.slice(1),
        ]);
        if (auto) setVersaoOrigem(auto.valor);
      }
      setEtapa('analise');
    },
    onError: (e) => toast.error('Análise falhou', extrairMensagemDeErro(e)),
  });

  // ---- ações sobre o texto (reanalisam depois) ----
  const reanalisar = (novoTexto: string) => {
    setTexto(novoTexto);
    setAnalise(analisarImpacto(template.corpo, novoTexto));
  };
  const restaurarSecao = (s: ComparacaoSecao) => {
    if (!s.antes) return;
    reanalisar(`${texto.trimEnd()}\n\n${s.antes.heading}\n\n${s.antes.corpo}\n`);
    toast.info(`Cláusula ${s.id} restaurada no final do texto`, 'Reposicione-a manualmente se necessário e reanalise.');
  };
  const substituirVariavel = (de: string, para: string) => {
    reanalisar(texto.split(`{{${de}}}`).join(`{{${para}}}`));
  };
  const removerVariavel = (v: string) => {
    reanalisar(texto.split(`{{${v}}}`).join(''));
  };
  const criarTarefaCatalogo = useMutation({
    mutationFn: (v: string) =>
      createAcao(empresaId!, {
        titulo: `Catalogar variável nova do retorno do advogado: {{${v}}}`,
        descricao: `O retorno do advogado para "${template.nome}" usa a variável {{${v}}}, que não existe no catálogo. Decidir origem no sistema e adicioná-la a variaveisCatalogo.ts (ou substituí-la por variável existente).`,
        tipo: 'juridico_tarefa',
        prioridade: 'alta',
        entidade_tipo: 'contrato_template',
        entidade_id: template.id,
      }),
    onSuccess: () => toast.success('Tarefa criada', 'A variável segue bloqueando a importação até ser catalogada ou substituída.'),
    onError: (e) => toast.error('Não foi possível criar a tarefa', extrairMensagemDeErro(e)),
  });

  const registrarDecisaoRemocao = (s: ComparacaoSecao, acao: AcaoRemovida) => {
    setAcoesRemovidas((m) => ({ ...m, [s.id]: acao }));
    if (!empresaId) return;
    salvarParametro.mutate({
      empresaId,
      chave: `remocao_retorno_${template.id.slice(0, 8)}_${s.id.replace(/\./g, '_')}`,
      valor: {
        template: template.nome,
        secao: `${s.id} — ${s.titulo}`,
        decisao: acao.acao === 'registrar' ? 'remoção registrada como decisão jurídica do advogado' : 'remoção ignorada com justificativa',
        justificativa: acao.justificativa,
        responsavel: responsavel || usuario?.nome_completo,
        data: new Date().toISOString(),
      },
      usuarioId: usuario?.id,
    });
  };

  // ---- travas da confirmação ----
  const removidasPendentes = (analise?.secoes ?? []).filter((s) => s.status === 'removida' && !acoesRemovidas[s.id]);
  const desconhecidas = analise?.variaveis.desconhecidas ?? [];
  const estruturais = analise?.estruturais.depois ?? [];
  const bloqueiosConfirmacao = [
    ...(versaoOrigem === '' ? ['Selecione a versão de origem (nunca assumida em silêncio).'] : []),
    ...(responsavel.trim().length < 3 ? ['Informe o responsável pelo retorno.'] : []),
    ...desconhecidas.map((v) => `Variável desconhecida {{${v}}} — substitua, remova ou catalogue antes.`),
    ...estruturais.map((p) => `QA estrutural: ${p.detalhe}`),
    ...removidasPendentes.map((s) => `Cláusula removida ${s.id} sem decisão registrada.`),
  ];

  const conflitos = useMemo(
    () => (analise && slug ? compararConflitosDoc(slug, template.corpo, texto) : []),
    [analise, slug, template.corpo, texto],
  );

  const confirmar = useMutation({
    mutationFn: async () => {
      if (bloqueiosConfirmacao.length > 0) throw new Error(bloqueiosConfirmacao[0]);
      const rotuloBase = opcoes.find((o) => o.valor === versaoOrigem)?.rotulo ?? versaoOrigem;
      // 1) arquivar o original + protocolo (quando veio arquivo)
      if (arquivo && empresaId) {
        const bytes = new Uint8Array(await arquivo.arrayBuffer());
        const hashArq = await hashBytesSha256(bytes);
        const protocolo = montarProtocoloRecebimento({
          documento: template.nome,
          versaoEnviada: rotuloBase,
          arquivoNome: arquivo.name,
          hashArquivo: hashArq,
          tamanhoBytes: arquivo.size,
          recebidoEm: new Date().toLocaleString('pt-BR'),
          responsavel: responsavel.trim(),
          origem: 'Retorno do advogado',
          status: 'Recebido — incorporado como nova redação (anterior fotografada no histórico)',
        });
        await arquivarRetorno({ empresaId, templateId: template.id, usuarioId: usuario?.id, arquivo, protocoloMd: protocolo });
      }
      // 2) registrar confirmações de pendências (o que o humano marcou)
      if (empresaId && analise) {
        for (const [i, trecho] of analise.pendencias.possivelmenteResolvidas.entries()) {
          salvarParametro.mutate({
            empresaId,
            chave: `pendencia_retorno_${template.id.slice(0, 8)}_${i}`,
            valor: {
              template: template.nome,
              trecho,
              confirmacao: confirmPendencias[i] ?? 'ainda_pendente',
              responsavel: responsavel.trim(),
              data: new Date().toISOString(),
            },
            usuarioId: usuario?.id,
          });
        }
      }
      // 3) incorporar — trigger 0046 fotografa o anterior; template volta a RASCUNHO
      await importarCorpoTemplate({
        templateId: template.id,
        corpoNovo: texto,
        origem: 'retorno_advogado',
        responsavel: responsavel.trim(),
        observacao: observacao || (arquivo ? `arquivo: ${arquivo.name}` : undefined),
        baseVersao: rotuloBase,
      });
    },
    onSuccess: () => {
      toast.success(
        'Nova redação incorporada',
        'Original arquivado, anterior fotografada, template de volta a RASCUNHO — revisão jurídica pendente antes de publicar.',
      );
      onDone();
    },
    onError: (e) => toast.error('Incorporação bloqueada', extrairMensagemDeErro(e)),
  });

  const arquivarSomentePdf = useMutation({
    mutationFn: async () => {
      if (!arquivo || !empresaId) throw new Error('Sem arquivo/empresa.');
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      const hashArq = await hashBytesSha256(bytes);
      const protocolo = montarProtocoloRecebimento({
        documento: template.nome,
        versaoEnviada: opcoes.find((o) => o.valor === versaoOrigem)?.rotulo ?? '(não informada)',
        arquivoNome: arquivo.name,
        hashArquivo: hashArq,
        tamanhoBytes: arquivo.size,
        recebidoEm: new Date().toLocaleString('pt-BR'),
        responsavel: responsavel.trim() || '(não informado)',
        origem: 'Retorno do advogado (PDF)',
        status: 'Recebido — aguardando extração de texto antes de gerar nova versão',
      });
      await arquivarRetorno({ empresaId, templateId: template.id, usuarioId: usuario?.id, arquivo, protocoloMd: protocolo });
    },
    onSuccess: () => {
      toast.success('PDF arquivado com protocolo', 'Nenhuma redação foi alterada. Extraia o texto e importe como .md/.txt/.docx.');
      onDone();
    },
    onError: (e) => toast.error('Arquivamento falhou', extrairMensagemDeErro(e)),
  });

  // ============================ RENDER ============================
  return (
    <div className="space-y-3">
      {/* passos */}
      <div className="flex gap-1 text-[11px] text-neutral-500">
        {(['fonte', 'analise', 'confirmar'] as const).map((p, i) => (
          <span key={p} className={cn('rounded-full border px-2 py-0.5', etapa === p ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-neutral-300 dark:border-neutral-700')}>
            {i + 1}. {p === 'fonte' ? 'Fonte e versão de origem' : p === 'analise' ? 'Comparação e análise' : 'Confirmação'}
          </span>
        ))}
      </div>

      {etapa === 'fonte' && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Cole a redação devolvida OU carregue o arquivo recebido (.md, .txt, .docx). PDF é arquivado com protocolo, mas não
            vira redação automaticamente. O original é sempre preservado; a incorporação fotografa a redação anterior.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputArquivo}
              type="file"
              accept=".md,.txt,.docx,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && aoEscolherArquivo(e.target.files[0])}
            />
            <Button size="sm" variant="outline" onClick={() => inputArquivo.current?.click()}>
              <FileUp className="h-3.5 w-3.5" aria-hidden /> Carregar arquivo recebido
            </Button>
            {arquivo && (
              <span className="text-xs text-neutral-500">
                {arquivo.name} · {(arquivo.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {pdfRecebido && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <p className="font-semibold">PDF recebido — extração de texto necessária antes de gerar nova versão.</p>
              <p className="mt-1">
                O PDF será arquivado sem modificação, com protocolo de recebimento. Para incorporar a redação, converta para
                .md/.txt/.docx e importe novamente.
              </p>
              <div className="mt-2">
                <Button size="sm" disabled={arquivarSomentePdf.isPending || !empresaId} onClick={() => arquivarSomentePdf.mutate()}>
                  {arquivarSomentePdf.isPending ? 'Arquivando…' : 'Arquivar PDF com protocolo'}
                </Button>
              </div>
            </div>
          )}

          {avisoConversao && (
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500 dark:bg-neutral-900">{avisoConversao}</p>
          )}

          {!pdfRecebido && (
            <>
              <div>
                <Label>Nova redação (markdown com {'{{variáveis}}'})</Label>
                <Textarea className="mt-1 min-h-[32vh] font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Este documento foi baseado em qual versão?</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
                    value={versaoOrigem}
                    onChange={(e) => setVersaoOrigem(e.target.value)}
                  >
                    <option value="">— selecionar (obrigatório) —</option>
                    {opcoes.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Responsável (advogado)</Label>
                  <Input className="mt-1" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Quem produziu esta redação" />
                </div>
                <div>
                  <Label>Observação</Label>
                  <Input className="mt-1" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: 2ª rodada de revisão" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={texto.trim().length < 50 || analisar.isPending} onClick={() => analisar.mutate()}>
                  {analisar.isPending ? 'Analisando…' : 'Analisar retorno (comparação de versões)'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {etapa === 'analise' && analise && (
        <div className="space-y-4">
          {/* resumo do impacto */}
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {(
              [
                ['Alteradas', analise.contagem.alteradas],
                ['Adicionadas', analise.contagem.adicionadas],
                ['Removidas', analise.contagem.removidas],
                ['Movidas', analise.contagem.movidas],
                ['Pendências novas', analise.pendencias.novas.length],
                ['Possíveis resolvidas', analise.pendencias.possivelmenteResolvidas.length],
              ] as const
            ).map(([r, v]) => (
              <div key={r} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-center dark:border-neutral-800">
                <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{v}</p>
                <p className="text-[10px] text-neutral-500">{r}</p>
              </div>
            ))}
          </div>

          {/* comparação por cláusula */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">Comparação de versões (por cláusula)</p>
            <div className="max-h-[38vh] space-y-1 overflow-y-auto pr-1">
              {analise.secoes
                .filter((s) => s.status !== 'igual')
                .map((s) => (
                  <div key={`${s.status}-${s.id}`} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs"
                      onClick={() => setSecaoAberta(secaoAberta === `${s.status}-${s.id}` ? null : `${s.status}-${s.id}`)}
                    >
                      <span className="truncate text-neutral-700 dark:text-neutral-300">
                        {s.id} — {s.titulo || '(sem título)'}
                        {s.status === 'movida' && s.idAnterior ? ` (era ${s.idAnterior})` : ''}
                        {(s.subitensAdicionados?.length || s.subitensRemovidos?.length) ? (
                          <span className="ml-1 text-neutral-400">
                            [subitens: +{s.subitensAdicionados?.length ?? 0} / −{s.subitensRemovidos?.length ?? 0}]
                          </span>
                        ) : null}
                      </span>
                      <Badge variant={ROTULO_STATUS_SECAO[s.status].cor}>{ROTULO_STATUS_SECAO[s.status].rotulo}</Badge>
                    </button>
                    {secaoAberta === `${s.status}-${s.id}` && (
                      <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
                        {s.status === 'alterada' && s.antes && s.depois && (
                          <div className="max-h-[26vh] overflow-y-auto rounded border border-neutral-200 font-mono text-[10px] leading-relaxed dark:border-neutral-800">
                            {diffLinhas(s.antes.corpo, s.depois.corpo).map((l, i) =>
                              l.tipo === 'igual' ? null : (
                                <div key={i} className={cn('whitespace-pre-wrap px-2 py-0.5', l.tipo === 'removida' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400')}>
                                  {l.tipo === 'removida' ? '− ' : '+ '}
                                  {l.texto || ' '}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                        {s.status !== 'alterada' && (
                          <pre className="max-h-[22vh] overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-neutral-600 dark:text-neutral-300">
                            {(s.depois ?? s.antes)?.corpo}
                          </pre>
                        )}
                        {s.status === 'removida' && (
                          <div className="mt-2 space-y-1.5 rounded-lg bg-red-50 p-2 text-[11px] dark:bg-red-900/10">
                            <p className="font-semibold text-red-700 dark:text-red-400">
                              Esta remoção deve ser registrada como decisão jurídica?
                            </p>
                            {acoesRemovidas[s.id] ? (
                              <p className="text-neutral-600 dark:text-neutral-300">
                                ✓ {acoesRemovidas[s.id].acao === 'registrar' ? 'Registrada como decisão jurídica.' : `Ignorada com justificativa: ${acoesRemovidas[s.id].justificativa}`}
                              </p>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button size="sm" variant="outline" onClick={() => registrarDecisaoRemocao(s, { acao: 'registrar' })}>
                                  Registrar decisão
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => restaurarSecao(s)}>
                                  <RotateCcw className="h-3 w-3" aria-hidden /> Restaurar
                                </Button>
                                <Input
                                  className="h-7 w-56 text-[11px]"
                                  placeholder="Justificativa para ignorar…"
                                  onKeyDown={(e) => {
                                    const v = (e.target as HTMLInputElement).value.trim();
                                    if (e.key === 'Enter' && v.length >= 5) registrarDecisaoRemocao(s, { acao: 'ignorar', justificativa: v });
                                  }}
                                />
                                <span className="text-neutral-400">(Enter registra "ignorar")</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              {analise.secoes.every((s) => s.status === 'igual') && (
                <p className="text-xs text-neutral-500">Nenhuma diferença estrutural — redações idênticas (ou só espaçamento).</p>
              )}
            </div>
          </div>

          {/* variáveis */}
          {(analise.variaveis.adicionadas.length > 0 || analise.variaveis.removidas.length > 0 || desconhecidas.length > 0) && (
            <div className="space-y-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
              <p className="font-semibold uppercase tracking-wide text-neutral-400">Variáveis</p>
              {analise.variaveis.adicionadas.length > 0 && (
                <p className="text-neutral-600 dark:text-neutral-300">Adicionadas: {analise.variaveis.adicionadas.map((v) => `{{${v}}}`).join(', ')}</p>
              )}
              {analise.variaveis.removidas.length > 0 && (
                <p className="text-neutral-600 dark:text-neutral-300">Removidas: {analise.variaveis.removidas.map((v) => `{{${v}}}`).join(', ')}</p>
              )}
              {desconhecidas.map((v) => (
                <div key={v} className="flex flex-wrap items-center gap-1.5 rounded bg-red-50 px-2 py-1.5 dark:bg-red-900/10">
                  <span className="font-semibold text-red-700 dark:text-red-400">Nova variável identificada: {`{{${v}}}`}</span>
                  <select
                    className="h-7 rounded border border-neutral-300 bg-transparent px-1 text-[11px] dark:border-neutral-700"
                    defaultValue=""
                    onChange={(e) => e.target.value && setSubstituicoes((m) => ({ ...m, [v]: e.target.value }))}
                  >
                    <option value="">substituir por…</option>
                    {Object.keys(CATALOGO_VARIAVEIS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" disabled={!substituicoes[v]} onClick={() => substituirVariavel(v, substituicoes[v])}>
                    Substituir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removerVariavel(v)}>
                    Remover
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!empresaId || criarTarefaCatalogo.isPending} onClick={() => criarTarefaCatalogo.mutate(v)}>
                    Criar tarefa p/ catalogar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* pendências */}
          {(analise.pendencias.possivelmenteResolvidas.length > 0 || analise.pendencias.novas.length > 0) && (
            <div className="space-y-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
              <p className="font-semibold uppercase tracking-wide text-neutral-400">Pendências jurídicas</p>
              {analise.pendencias.possivelmenteResolvidas.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="info">POSSÍVEL PENDÊNCIA RESOLVIDA</Badge>
                  <span className="max-w-[46ch] truncate text-neutral-600 dark:text-neutral-300" title={p}>
                    {p}
                  </span>
                  <select
                    className="h-7 rounded border border-neutral-300 bg-transparent px-1 text-[11px] dark:border-neutral-700"
                    value={confirmPendencias[i] ?? 'ainda_pendente'}
                    onChange={(e) => setConfirmPendencias((m) => ({ ...m, [i]: e.target.value as ConfirmacaoPendencia }))}
                  >
                    <option value="resolvida">Resolvida</option>
                    <option value="ainda_pendente">Ainda pendente</option>
                    <option value="nao_aplicavel">Não aplicável</option>
                  </select>
                </div>
              ))}
              {analise.pendencias.novas.length > 0 && (
                <p className="text-amber-700 dark:text-amber-400">
                  {analise.pendencias.novas.length} NOVA(S) pendência(s) no texto — entram automaticamente na Sala do Advogado
                  (o parser lê o texto vivo; pendências antigas nunca são apagadas).
                </p>
              )}
              <p className="text-[10px] text-neutral-400">
                A confirmação registra o que o humano decidiu — o sistema nunca marca pendência como aprovada sozinho.
              </p>
            </div>
          )}

          {/* conflitos detectáveis */}
          {conflitos.length > 0 && (
            <div className="space-y-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
              <p className="font-semibold uppercase tracking-wide text-neutral-400">Conflitos potenciais (detecção textual)</p>
              {conflitos.map((c) => (
                <p key={c.conflito.id} className="text-neutral-600 dark:text-neutral-300">
                  {c.conflito.id} — {c.conflito.tema}:{' '}
                  <Badge variant={c.situacao === 'possivelmente_resolvido' ? 'success' : c.situacao === 'surgiu' ? 'destructive' : 'warning'}>
                    {c.situacao === 'possivelmente_resolvido' ? 'POSSIVELMENTE RESOLVIDO — confirmar' : c.situacao === 'surgiu' ? 'NOVO' : 'CONTINUA'}
                  </Badge>
                </p>
              ))}
            </div>
          )}

          {/* QA estrutural do texto novo */}
          {estruturais.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
              <p className="flex items-center gap-1 font-semibold">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> QA estrutural bloqueia a incorporação:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {estruturais.map((p, i) => (
                  <li key={i}>{p.detalhe}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEtapa('fonte')}>
              Voltar (editar texto)
            </Button>
            <Button disabled={bloqueiosConfirmacao.length > 0} onClick={() => setEtapa('confirmar')}>
              Prosseguir para confirmação
            </Button>
          </div>
          {bloqueiosConfirmacao.length > 0 && (
            <p className="text-right text-[11px] text-red-600">{bloqueiosConfirmacao[0]}</p>
          )}
        </div>
      )}

      {etapa === 'confirmar' && analise && hashes && (
        <div className="space-y-3">
          <div className="rounded-lg border border-neutral-200 px-4 py-3 text-xs dark:border-neutral-800">
            <p className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Criar nova versão — confirmação</p>
            <div className="grid gap-1 md:grid-cols-2">
              <p>Versão de origem declarada: <span className="font-medium">{opcoes.find((o) => o.valor === versaoOrigem)?.rotulo}</span></p>
              <p>Responsável: <span className="font-medium">{responsavel}</span></p>
              <p className="break-all">Hash da redação atual: <span className="font-mono text-[10px]">{hashes.atual}</span></p>
              <p className="break-all">Hash da redação nova: <span className="font-mono text-[10px]">{hashes.novo}</span></p>
              <p>
                Alterações: {analise.contagem.alteradas} alteradas · {analise.contagem.adicionadas} adicionadas ·{' '}
                {analise.contagem.removidas} removidas · {analise.contagem.movidas} movidas
              </p>
              <p>
                Pendências: {analise.pendencias.novas.length} novas · {analise.pendencias.possivelmenteResolvidas.length} possíveis resolvidas ·{' '}
                {analise.pendencias.mantidas} mantidas
              </p>
              {arquivo && <p>Arquivo original: {arquivo.name} (será arquivado com protocolo, sem modificação)</p>}
            </div>
            <p className="mt-2 rounded bg-neutral-50 px-2 py-1.5 text-[11px] text-neutral-500 dark:bg-neutral-900">
              A redação anterior será FOTOGRAFADA automaticamente (histórico imutável). O template volta a RASCUNHO com status
              MINUTA — RETORNO DO ADVOGADO e <span className="font-semibold">revisão jurídica pendente</span>: importar não
              significa aprovado juridicamente. Contratos já gerados permanecem intactos.
            </p>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEtapa('analise')}>
              Voltar
            </Button>
            <Button disabled={confirmar.isPending} onClick={() => confirmar.mutate()}>
              <Import className="h-4 w-4" aria-hidden /> {confirmar.isPending ? 'Incorporando…' : 'CRIAR NOVA VERSÃO'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
