import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Gavel, Save } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { corpoMinutaMaster } from '../minutaMaster';
import { extrairPendenciasJuridicas, type PendenciaJuridicaMinuta } from '../pendenciasMinuta';
import { useParametrosJuridicos, useSaveParametro } from '../hooksFase3';
import { BIBLIOTECA } from '../biblioteca';
import { calcularIndiceCompletude } from '../qa';
import {
  CONFLITOS_POTENCIAIS,
  MATRIZ_COBERTURA,
  PRIORIDADE_LABEL,
  prioridadePendencia,
  type PrioridadeOperacional,
} from '../qaBiblioteca';

// SALA DO ADVOGADO (Fase I): cada marcação [VALIDAR COM ADVOGADO] da minuta vira um item de
// decisão com registro persistido (juridico_parametros, chave minuta_pendencia_<n> — schema
// existente, sem migration). NENHUMA marcação some sem registro: a lista vem SEMPRE do parser
// da minuta (fonte única); a decisão registrada acompanha, nunca substitui, o texto da minuta.
// Resolver aqui é REGISTRO OPERACIONAL — a minuta em si só muda quando o advogado reescrever o
// texto e o template for republicado (nova versão; contratos antigos intactos).

type DecisaoPendencia = {
  status: 'pendente' | 'em_analise' | 'resolvida';
  decisao?: string;
  texto_aprovado?: string;
  observacao?: string;
  responsavel?: string;
  data?: string;
};

const STATUS_LABEL: Record<DecisaoPendencia['status'], string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
};

export function JuridicoSalaAdvogadoPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: parametros } = useParametrosJuridicos();
  const salvar = useSaveParametro();

  const pendencias = extrairPendenciasJuridicas(corpoMinutaMaster());
  // Prioridade OPERACIONAL de revisão (Fase 6) — ordena o trabalho humano; NÃO é risco jurídico.
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeOperacional | 'todas'>('todas');
  const [termoAberto, setTermoAberto] = useState<string | null>(null);
  const prioridadeDe = (p: PendenciaJuridicaMinuta) => prioridadePendencia(`${p.secao} ${p.trecho}`);
  const pendenciasFiltradas = pendencias.filter((p) => filtroPrioridade === 'todas' || prioridadeDe(p) === filtroPrioridade);

  // Pendências dos TERMOS da biblioteca (leitura — as decisões continuam no fluxo de revisão de
  // cada template) + índice de completude documental (métrica operacional, nunca score jurídico).
  const termosBiblioteca = BIBLIOTECA.filter((e) => e.categoria !== 'contrato');
  const pendenciasPorTermo = termosBiblioteca.map((e) => ({ entrada: e, pendencias: extrairPendenciasJuridicas(e.corpo) }));
  const totalPendencias = pendencias.length + pendenciasPorTermo.reduce((acc, t) => acc + t.pendencias.length, 0);
  const conflitosAbertos = CONFLITOS_POTENCIAIS.filter((c) => c.status === 'aberto');
  const indice = calcularIndiceCompletude({
    temas: MATRIZ_COBERTURA,
    conflitosAbertos: conflitosAbertos.length,
    pendenciasJuridicas: totalPendencias,
    documentos: BIBLIOTECA.map((e) => ({ nome: e.nome, corpo: e.corpo })),
  });

  const [aberta, setAberta] = useState<number | null>(null);
  const [form, setForm] = useState<{ status: DecisaoPendencia['status']; decisao: string; texto: string; obs: string; resp: string }>({
    status: 'em_analise',
    decisao: '',
    texto: '',
    obs: '',
    resp: '',
  });

  const decisaoDe = (ordem: number): DecisaoPendencia => {
    const p = parametros?.find((x) => x.chave === `minuta_pendencia_${ordem}`);
    return (p?.valor as DecisaoPendencia) ?? { status: 'pendente' };
  };

  const abrir = (p: PendenciaJuridicaMinuta) => {
    const d = decisaoDe(p.ordem);
    setForm({
      status: d.status === 'pendente' ? 'em_analise' : d.status,
      decisao: d.decisao ?? '',
      texto: d.texto_aprovado ?? '',
      obs: d.observacao ?? '',
      resp: d.responsavel ?? '',
    });
    setAberta(p.ordem);
  };

  const gravar = (ordem: number) => {
    if (!empresaId) return;
    salvar.mutate(
      {
        empresaId,
        chave: `minuta_pendencia_${ordem}`,
        valor: {
          status: form.status,
          decisao: form.decisao || undefined,
          texto_aprovado: form.texto || undefined,
          observacao: form.obs || undefined,
          responsavel: form.resp || undefined,
          data: new Date().toISOString(),
        },
        usuarioId: usuario?.id,
      },
      {
        onSuccess: () => {
          toast.success('Decisão registrada', `Pendência ${ordem}: ${STATUS_LABEL[form.status]}`);
          setAberta(null);
        },
        onError: (e) => toast.error('Não foi possível registrar', extrairMensagemDeErro(e)),
      },
    );
  };

  const resolvidas = pendencias.filter((p) => decisaoDe(p.ordem).status === 'resolvida').length;

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Jurídico
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <Gavel className="h-6 w-6 text-emerald-600" aria-hidden /> Sala do Advogado
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            Cada marcação da minuta master vira um item de decisão. Registrar aqui documenta a decisão — o texto da minuta só
            muda quando o advogado reescrever e o template for republicado (contratos antigos permanecem congelados).
          </p>
        </div>
        <Badge variant={resolvidas === pendencias.length ? 'success' : 'warning'}>
          {resolvidas}/{pendencias.length} resolvidas
        </Badge>
      </div>

      {/* ===== Índice de completude documental (Fase 6) — métrica OPERACIONAL, não score jurídico ===== */}
      <div className="mt-6 max-w-4xl rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Índice de completude documental</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Mede organização do material para revisão (cobertura de temas, variáveis, estrutura). NÃO mede segurança jurídica —
          essa avaliação é exclusiva do advogado.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          {(
            [
              ['Cobertura', `${indice.coberturaPct}%`],
              ['Variáveis', `${indice.variaveisPct}%`],
              ['Referências', `${indice.referenciasPct}%`],
              ['Consistência', `${indice.consistenciaPct}%`],
              ['Pendências jurídicas', String(indice.pendenciasJuridicas)],
              ['Conflitos potenciais', String(indice.conflitosAbertos)],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo}>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{valor}</p>
              <p className="text-[11px] text-neutral-500">{rotulo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Filtro por prioridade operacional ===== */}
      <div className="mt-6 flex max-w-4xl flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-neutral-500">Prioridade operacional de revisão:</span>
        {(['todas', 'critico', 'alto', 'medio', 'baixo'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltroPrioridade(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filtroPrioridade === f
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-neutral-300 text-neutral-500 dark:border-neutral-700'
            }`}
          >
            {f === 'todas' ? `Todas (${pendencias.length})` : `${PRIORIDADE_LABEL[f]} (${pendencias.filter((p) => prioridadeDe(p) === f).length})`}
          </button>
        ))}
      </div>

      <div className="mt-3 max-w-4xl space-y-3">
        {pendenciasFiltradas.length === 0 && <p className="text-sm text-neutral-500">Nenhuma pendência nesta prioridade.</p>}
        {pendenciasFiltradas.map((p) => {
          const d = decisaoDe(p.ordem);
          const abertaEsta = aberta === p.ordem;
          return (
            <div key={p.ordem} className="rounded-xl border border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                onClick={() => (abertaEsta ? setAberta(null) : abrir(p))}
                aria-expanded={abertaEsta}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {p.ordem}. {p.secao}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{p.trecho}</p>
                  {d.decisao && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden /> Decisão: {d.decisao}
                      {d.responsavel && ` (${d.responsavel}${d.data ? `, ${formatDataSimples(d.data)}` : ''})`}
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={prioridadeDe(p) === 'critico' ? 'destructive' : prioridadeDe(p) === 'alto' ? 'warning' : 'outline'}>
                    {PRIORIDADE_LABEL[prioridadeDe(p)]}
                  </Badge>
                  <Badge variant={d.status === 'resolvida' ? 'success' : d.status === 'em_analise' ? 'info' : 'warning'}>
                    {STATUS_LABEL[d.status]}
                  </Badge>
                </span>
              </button>

              {abertaEsta && (
                <div className="space-y-3 border-t border-neutral-100 px-4 py-4 dark:border-neutral-800">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Status</Label>
                      <Select className="mt-1" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DecisaoPendencia['status'] }))}>
                        <option value="em_analise">Em análise</option>
                        <option value="resolvida">Resolvida</option>
                        <option value="pendente">Pendente</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Responsável (advogado)</Label>
                      <Input className="mt-1" value={form.resp} onChange={(e) => setForm((f) => ({ ...f, resp: e.target.value }))} placeholder="Nome de quem decidiu" />
                    </div>
                  </div>
                  <div>
                    <Label>Decisão</Label>
                    <Textarea className="mt-1" value={form.decisao} onChange={(e) => setForm((f) => ({ ...f, decisao: e.target.value }))} placeholder="Ex.: multa de mora 2% + juros 1% a.m., conforme art. …" />
                  </div>
                  <div>
                    <Label>Texto aprovado para a cláusula (opcional)</Label>
                    <Textarea className="mt-1 font-mono text-xs" value={form.texto} onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))} placeholder="Redação final aprovada, para substituir a marcação na minuta…" />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea className="mt-1" value={form.obs} onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))} />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={salvar.isPending || !empresaId} onClick={() => gravar(p.ordem)}>
                      <Save className="h-3.5 w-3.5" aria-hidden /> {salvar.isPending ? 'Registrando…' : 'Registrar decisão'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Conflitos potenciais entre documentos (Fase 6) — registrados, nunca decididos ===== */}
      <section className="mt-10 max-w-4xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Conflitos potenciais entre documentos ({conflitosAbertos.length} abertos)
        </h2>
        <p className="mt-1 text-[11px] text-neutral-500">
          Divergências detectadas na auditoria documental. O sistema NÃO decide qual lado está correto — cada item traz a
          pergunta para o advogado. Lista completa (com tratados): docs/juridico/CONFLITOS.md e pasta 12 do Pacote.
        </p>
        <div className="mt-3 space-y-2">
          {CONFLITOS_POTENCIAIS.map((c) => (
            <div key={c.id} className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {c.id} — {c.tema}
                <Badge variant={c.prioridade === 'critico' ? 'destructive' : c.prioridade === 'alto' ? 'warning' : 'outline'}>
                  {PRIORIDADE_LABEL[c.prioridade]}
                </Badge>
                <Badge variant={c.status === 'aberto' ? 'warning' : 'success'}>{c.status === 'aberto' ? 'Aberto' : 'Tratado (Fase 6)'}</Badge>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                <span className="font-medium">A:</span> {c.documentoA} · <span className="font-medium">B:</span> {c.documentoB}
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{c.diferenca}</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Pergunta ao advogado: {c.perguntaAdvogado}</p>
              {c.tratamento && <p className="mt-1 text-[11px] text-neutral-500">Tratamento: {c.tratamento}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Pendências dos termos da biblioteca (leitura) ===== */}
      <section className="mt-10 max-w-4xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Pendências dos termos da biblioteca ({pendenciasPorTermo.reduce((a, t) => a + t.pendencias.length, 0)})
        </h2>
        <p className="mt-1 text-[11px] text-neutral-500">
          As marcações de cada termo acompanham o Pacote para Advogado (pasta 13). A decisão sobre a redação de cada termo é
          registrada na revisão jurídica do próprio template (Biblioteca → template → Revisão jurídica).
        </p>
        <div className="mt-3 space-y-1.5">
          {pendenciasPorTermo.map(({ entrada, pendencias: pend }) => (
            <div key={entrada.slug} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm"
                onClick={() => setTermoAberto(termoAberto === entrada.slug ? null : entrada.slug)}
                aria-expanded={termoAberto === entrada.slug}
              >
                <span className="text-neutral-700 dark:text-neutral-300">{entrada.nome}</span>
                <Badge variant={pend.length > 0 ? 'warning' : 'success'}>{pend.length} pendência(s)</Badge>
              </button>
              {termoAberto === entrada.slug && pend.length > 0 && (
                <ul className="space-y-1 border-t border-neutral-100 px-4 py-2 dark:border-neutral-800">
                  {pend.map((p) => (
                    <li key={p.ordem} className="text-xs text-neutral-500">
                      {p.ordem}. <span className="font-medium">{p.secao}</span> — {p.trecho}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
