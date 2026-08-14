import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, FileText, MessageSquareWarning, ExternalLink,
  ChevronDown, ChevronRight, Paperclip,
} from 'lucide-react';
import { Button, buttonVariants } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { diasDesde } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import {
  useVistoriasAguardando, useDocumentosAguardando, useChamadosAbertos,
  useAnexosDoChamado, useRevisarDocumento, useMudarStatusChamado,
} from '../hooks/useAtendimento';
import {
  assinarUrlArquivo, type ChamadoFila, type ChamadoStatus,
} from '../api/atendimento';

// Central de Atendimento ao Motorista (staff, desktop). Três filas operacionais que fecham o
// "outro lado" do app do motorista: o que ele envia (vistoria, documento, chamado) aparece aqui
// pro staff triar e agir inline. Só consome os hooks/contrato já existentes — nada de backend novo.

type Aba = 'vistorias' | 'documentos' | 'chamados';

// "há X dia(s)" a partir de um ISO. diasDesde pode voltar null (data futura/inválida).
function textoDias(iso: string | null | undefined): string {
  const d = diasDesde(iso);
  if (d === null) return 'há pouco';
  if (d === 0) return 'hoje';
  return `há ${d} dia${d === 1 ? '' : 's'}`;
}

// Abre um arquivo do storage em nova aba via URL assinada; toast.error se não conseguir assinar.
async function abrirArquivo(caminho: string) {
  const url = await assinarUrlArquivo(caminho);
  if (!url) {
    toast.error('Não foi possível abrir o arquivo.');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

const PRIORIDADE_VARIANT: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  urgente: 'destructive',
  alta: 'destructive',
  media: 'warning',
  média: 'warning',
  baixa: 'secondary',
};

const STATUS_LABEL: Record<ChamadoStatus, string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  aguardando_motorista: 'Aguardando motorista',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
};

const STATUS_VARIANT: Record<ChamadoStatus, 'info' | 'warning' | 'secondary'> = {
  aberto: 'info',
  em_analise: 'warning',
  aguardando_motorista: 'secondary',
  resolvido: 'secondary',
  cancelado: 'secondary',
};

// State machine de status do chamado (mesma do banco). A partir do status atual, quais transições
// o staff pode disparar. O banco valida de novo — se algo escapar, o erro sobe como toast.error.
const TRANSICOES: Record<string, ChamadoStatus[]> = {
  aberto: ['em_analise', 'aguardando_motorista', 'resolvido', 'cancelado'],
  em_analise: ['aguardando_motorista', 'resolvido', 'cancelado'],
  aguardando_motorista: ['em_analise', 'resolvido', 'cancelado'],
};

export function CentralAtendimentoPage() {
  const [aba, setAba] = useState<Aba>('vistorias');

  const vistorias = useVistoriasAguardando();
  const documentos = useDocumentosAguardando();
  const chamados = useChamadosAbertos();

  const abas: { id: Aba; label: string; count: number | undefined }[] = [
    { id: 'vistorias', label: 'Vistorias', count: vistorias.data?.length },
    { id: 'documentos', label: 'Documentos', count: documentos.data?.length },
    { id: 'chamados', label: 'Chamados', count: chamados.data?.length },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Central de Atendimento ao Motorista
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Filas do que o motorista envia pelo app — priorizadas do mais antigo pro mais novo.
      </p>

      {/* Abas simples */}
      <div className="mt-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={cn(
              'relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              aba === a.id
                ? 'border-emerald-600 text-neutral-900 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            )}
          >
            {a.label}
            {a.count !== undefined && (
              <Badge variant={aba === a.id ? 'default' : 'secondary'}>{a.count}</Badge>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {aba === 'vistorias' && <FilaVistorias query={vistorias} />}
        {aba === 'documentos' && <FilaDocumentos query={documentos} />}
        {aba === 'chamados' && <FilaChamados query={chamados} />}
      </div>
    </div>
  );
}

// Wrapper de estado (loading/erro/vazio) reutilizado por cada fila.
function EstadoFila({
  isLoading, isError, vazio, refetch, emptyIcon, emptyTitle, children,
}: {
  isLoading: boolean;
  isError: boolean;
  vazio: boolean;
  refetch: () => void;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <p className="py-10 text-center text-sm text-neutral-500">Carregando…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-neutral-500">Não foi possível carregar esta fila.</p>
        <Button variant="outline" size="sm" onClick={refetch}>Tentar de novo</Button>
      </div>
    );
  }
  if (vazio) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description="Assim que o motorista enviar algo novo, aparece aqui."
      />
    );
  }
  return <>{children}</>;
}

// ---- Fila 1: vistorias aguardando análise ----
function FilaVistorias({ query }: { query: ReturnType<typeof useVistoriasAguardando> }) {
  const { data, isLoading, isError, refetch } = query;
  return (
    <EstadoFila
      isLoading={isLoading}
      isError={isError}
      vazio={(data?.length ?? 0) === 0}
      refetch={refetch}
      emptyIcon={ClipboardCheck}
      emptyTitle="Nenhuma vistoria aguardando"
    >
      <div className="space-y-2">
        {data?.map((v) => (
          <Card key={v.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {v.motorista?.nome_completo ?? 'Motorista não identificado'}
                  {v.veiculo?.placa && (
                    <span className="ml-2 text-sm font-normal text-neutral-500">{v.veiculo.placa}</span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {v.tipo ? <span className="capitalize">{v.tipo}</span> : v.titulo}
                  {' · '}enviada {textoDias(v.enviada_motorista_em)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {v.contrato_id ? (
                  <Link
                    to={`/contratos/${v.contrato_id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Ver contrato <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs text-neutral-400">Sem contrato vinculado</span>
                )}
                <span className="text-[11px] text-neutral-400">Conclua a vistoria no cockpit do contrato</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </EstadoFila>
  );
}

// ---- Fila 2: documentos aguardando análise ----
function FilaDocumentos({ query }: { query: ReturnType<typeof useDocumentosAguardando> }) {
  const { data, isLoading, isError, refetch } = query;
  const revisar = useRevisarDocumento();
  // Qual documento está com o campo de motivo de rejeição aberto.
  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  async function aprovar(arquivoId: string) {
    try {
      await revisar.mutateAsync({ arquivoId, status: 'aprovado', motivo: null });
      toast.success('Documento aprovado.');
    } catch (e) {
      toast.error(extrairMensagemDeErro(e));
    }
  }

  async function confirmarRejeicao(arquivoId: string) {
    const texto = motivo.trim();
    if (!texto) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }
    try {
      await revisar.mutateAsync({ arquivoId, status: 'rejeitado', motivo: texto });
      toast.success('Documento rejeitado.');
      setRejeitando(null);
      setMotivo('');
    } catch (e) {
      toast.error(extrairMensagemDeErro(e));
    }
  }

  return (
    <EstadoFila
      isLoading={isLoading}
      isError={isError}
      vazio={(data?.length ?? 0) === 0}
      refetch={refetch}
      emptyIcon={FileText}
      emptyTitle="Nenhum documento aguardando"
    >
      <div className="space-y-2">
        {data?.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{d.nome_arquivo}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {d.categoria ?? 'Sem categoria'} · enviado {textoDias(d.criado_em)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => abrirArquivo(d.caminho_storage)}>
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={revisar.isPending}
                    onClick={() => aprovar(d.id)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revisar.isPending}
                    onClick={() => {
                      setRejeitando(rejeitando === d.id ? null : d.id);
                      setMotivo('');
                    }}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>

              {rejeitando === d.id && (
                <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                  <Label htmlFor={`motivo-${d.id}`}>Motivo da rejeição *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`motivo-${d.id}`}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ex.: documento ilegível, dados divergentes…"
                      autoFocus
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={revisar.isPending}
                      onClick={() => confirmarRejeicao(d.id)}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </EstadoFila>
  );
}

// ---- Fila 3: chamados abertos ----
function FilaChamados({ query }: { query: ReturnType<typeof useChamadosAbertos> }) {
  const { data, isLoading, isError, refetch } = query;
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <EstadoFila
      isLoading={isLoading}
      isError={isError}
      vazio={(data?.length ?? 0) === 0}
      refetch={refetch}
      emptyIcon={MessageSquareWarning}
      emptyTitle="Nenhum chamado aberto"
    >
      <div className="space-y-2">
        {data?.map((c) => (
          <LinhaChamado
            key={c.id}
            chamado={c}
            aberto={expandido === c.id}
            onToggle={() => setExpandido(expandido === c.id ? null : c.id)}
          />
        ))}
      </div>
    </EstadoFila>
  );
}

function LinhaChamado({
  chamado, aberto, onToggle,
}: {
  chamado: ChamadoFila;
  aberto: boolean;
  onToggle: () => void;
}) {
  const mudarStatus = useMudarStatusChamado();
  const transicoes = TRANSICOES[chamado.status] ?? [];
  const prioridadeVariant = PRIORIDADE_VARIANT[chamado.prioridade?.toLowerCase()] ?? 'secondary';

  async function mudar(status: ChamadoStatus) {
    try {
      await mudarStatus.mutateAsync({ chamadoId: chamado.id, status });
      toast.success(`Chamado movido para "${STATUS_LABEL[status]}".`);
    } catch (e) {
      toast.error(extrairMensagemDeErro(e));
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 text-left">
          <span className="mt-0.5 text-neutral-400">
            {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{chamado.assunto}</p>
              <Badge variant={prioridadeVariant} className="capitalize">{chamado.prioridade}</Badge>
              <Badge variant={STATUS_VARIANT[chamado.status]}>{STATUS_LABEL[chamado.status]}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-neutral-500">
              <span className="capitalize">{chamado.categoria}</span>
              {' · '}{chamado.motorista?.nome_completo ?? 'Motorista não identificado'}
              {chamado.veiculo?.placa && ` · ${chamado.veiculo.placa}`}
              {' · '}aberto {textoDias(chamado.criado_em)}
            </p>
          </div>
        </button>

        {aberto && (
          <div className="mt-3 space-y-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
              {chamado.descricao}
            </p>

            <AnexosChamado chamadoId={chamado.id} />

            {transicoes.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-500">Mudar status</p>
                <div className="flex flex-wrap gap-2">
                  {transicoes.map((t) => (
                    <Button
                      key={t}
                      variant={t === 'cancelado' ? 'ghost' : t === 'resolvido' ? 'default' : 'outline'}
                      size="sm"
                      disabled={mudarStatus.isPending}
                      onClick={() => mudar(t)}
                    >
                      {STATUS_LABEL[t]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Anexos de um chamado — só busca quando a linha está expandida (o hook só monta aqui).
function AnexosChamado({ chamadoId }: { chamadoId: string }) {
  const { data, isLoading } = useAnexosDoChamado(chamadoId);

  if (isLoading) return <p className="text-xs text-neutral-400">Carregando anexos…</p>;
  if (!data || data.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-neutral-500">
        <Paperclip className="h-3 w-3" /> Anexos
      </p>
      <div className="flex flex-wrap gap-2">
        {data.map((a) => (
          <Button key={a.id} variant="outline" size="sm" onClick={() => abrirArquivo(a.caminho_storage)}>
            <ExternalLink className="h-3.5 w-3.5" /> {a.nome_arquivo}
          </Button>
        ))}
      </div>
    </div>
  );
}
