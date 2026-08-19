import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, FileDown, GitBranch, SearchX } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { listAcoesPorEmpresa } from '@/features/operacoes/api/acoes';
import { listArquivosComValidadePorEntidadeTipo } from '@/shared/capabilities/api/arquivos';
import { usePanoramaJuridico, useTemplatesJuridico } from '../hooks';
import { useTodasRevisoes } from '../hooksFase3';
import { templateAprovadoJuridicamente } from '../apiFase3';
import { contarOrfaos, listMetaVersoesPorTemplate, listMotoristasCnh, listVersoesVigentesComSnapshot } from '../apiGovernanca';
import {
  distribuirVersoesUsadas,
  divergenciasLote,
  montarAgendaContratual,
  montarRelatorioGovernanca,
  type DivergenciaContratual,
  type EventoAgenda,
} from '../governanca';

// SEÇÕES DE GOVERNANÇA no Dashboard Jurídico (Fase 8, Módulos 3/6/19/20/21/24) — widgets no
// dashboard EXISTENTE (nunca um dashboard novo). Tudo derivado; sem cron; sem automação
// silenciosa; dado ausente = NÃO INFORMADO.

const DIA_MS = 86_400_000;
const diasAte = (iso: string | null | undefined) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DIA_MS) : null);

export function GovernancaDashboardSections() {
  const { panorama, isLoading } = usePanoramaJuridico();
  const { data: templates } = useTemplatesJuridico();
  const { data: revisoes } = useTodasRevisoes();

  const extras = useQuery({
    queryKey: ['juridico', 'governanca-dashboard'],
    queryFn: async () => {
      const [versoesVigentes, motoristas, tarefas, docsValidade, metaVersoes] = await Promise.all([
        listVersoesVigentesComSnapshot(),
        listMotoristasCnh(),
        listAcoesPorEmpresa(),
        listArquivosComValidadePorEntidadeTipo('motorista'),
        listMetaVersoesPorTemplate(),
      ]);
      return { versoesVigentes, motoristas, tarefas, docsValidade, metaVersoes };
    },
  });
  const orfaos = useQuery({
    queryKey: ['juridico', 'governanca-orfaos', panorama?.contratos.length],
    enabled: !!panorama,
    queryFn: () => contarOrfaos((panorama?.contratos ?? []).map((c) => c.id)),
  });

  const contratoPorId = useMemo(() => new Map((panorama?.contratos ?? []).map((c) => [c.id, c])), [panorama]);

  // ---------- Módulo 3: divergências em lote ----------
  const divergencias = useMemo(() => {
    const out: { contrato: string; contratoId: string; divergencias: DivergenciaContratual[] }[] = [];
    for (const v of extras.data?.versoesVigentes ?? []) {
      const c = contratoPorId.get(v.contrato_id);
      if (!c) continue;
      const div = divergenciasLote(v.snapshot, {
        motoristaNome: c.motorista?.nome_completo ?? null,
        motoristaCpf: (c.motorista as { cpf?: string } | null)?.cpf ?? null,
        veiculoPlaca: c.veiculo?.placa ?? null,
        valorPeriodico: c.valor_periodico,
        periodicidade: c.periodicidade,
        diaVencimento: c.dia_vencimento,
        valorCaucao: c.valor_caucao,
      });
      if (div.length > 0) out.push({ contrato: `${c.id.slice(0, 8).toUpperCase()} · ${c.motorista?.nome_completo ?? 'NÃO INFORMADO'}`, contratoId: c.id, divergencias: div });
    }
    return out;
  }, [extras.data, contratoPorId]);

  // ---------- Módulo 6: agenda contratual (1/7/15/30/60/90) ----------
  const agenda = useMemo(() => {
    if (!panorama) return [];
    const eventos: EventoAgenda[] = [];
    for (const { contrato, diasRestantes } of panorama.vencimentos) {
      eventos.push({ tipo: 'fim_contrato', descricao: `Fim do contrato — ${contrato.motorista?.nome_completo ?? 'NÃO INFORMADO'} (${contrato.veiculo?.placa ?? '—'})`, contratoId: contrato.id, diasRestantes });
    }
    for (const s of panorama.seguros) {
      const d = diasAte(s.vigencia_fim);
      if (d != null && d <= 90) eventos.push({ tipo: 'seguro_vence', descricao: `Seguro vence — apólice ${s.apolice ?? 'NÃO INFORMADA'}`, contratoId: s.contrato_id, diasRestantes: d });
    }
    for (const [versaoId, linhas] of panorama.assinaturasPorVersao) {
      void versaoId;
      for (const a of linhas) {
        const d = diasAte((a as { expira_em?: string | null }).expira_em ?? null);
        if (d != null && d <= 90 && !['assinado', 'aceito', 'recusado', 'cancelado'].includes(a.status)) {
          eventos.push({ tipo: 'assinatura_expira', descricao: `Assinatura (${a.parte}) expira`, contratoId: null, diasRestantes: d });
        }
      }
    }
    for (const m of extras.data?.motoristas ?? []) {
      const d = diasAte(m.cnh_validade);
      if (d != null && d <= 90) eventos.push({ tipo: 'cnh_vence', descricao: `CNH de ${m.nome_completo}`, contratoId: null, diasRestantes: d });
    }
    for (const doc of extras.data?.docsValidade ?? []) {
      const d = diasAte((doc as { data_validade?: string | null }).data_validade ?? null);
      if (d != null && d <= 90) eventos.push({ tipo: 'documento_vence', descricao: `Documento vence — ${(doc as { nome_arquivo?: string }).nome_arquivo ?? 'documento'}`, contratoId: null, diasRestantes: d });
    }
    for (const t of extras.data?.tarefas ?? []) {
      const tt = t as { tipo?: string | null; status: string; prazo: string | null; titulo: string; entidade_id: string | null; entidade_tipo: string | null };
      if (!(tt.tipo ?? '').startsWith('juridico') || ['concluida', 'cancelada'].includes(tt.status) || !tt.prazo) continue;
      const d = diasAte(tt.prazo);
      if (d != null && d <= 90) eventos.push({ tipo: 'obrigacao', descricao: `Obrigação/tarefa: ${tt.titulo}`, contratoId: tt.entidade_tipo === 'contrato' ? tt.entidade_id : null, diasRestantes: d });
    }
    return montarAgendaContratual(eventos);
  }, [panorama, extras.data]);

  // ---------- Módulos 20/21: governança do master ----------
  const masters = useMemo(() => {
    const meta = extras.data?.metaVersoes ?? [];
    return (templates ?? [])
      .filter((t) => t.tipo === 'contrato' || meta.some((m) => m.template_id === t.id))
      .map((t) => ({
        template: t,
        distribuicao: distribuirVersoesUsadas(meta.filter((m) => m.template_id === t.id).map((m) => (typeof m.versao_meta === 'number' ? m.versao_meta : null))),
        revisaoAprovada: templateAprovadoJuridicamente((revisoes ?? []).filter((r) => r.template_id === t.id), t.versao_template),
      }))
      .filter((m) => m.template.tipo === 'contrato' || m.distribuicao.length > 0);
  }, [templates, extras.data, revisoes]);

  // ---------- Módulo 24: relatório ----------
  const exportarRelatorio = () => {
    if (!panorama) return;
    try {
      const md = montarRelatorioGovernanca({
        geradoEm: new Date().toLocaleString('pt-BR'),
        totais: {
          contratos: panorama.contratos.length,
          vigentes: panorama.cards.assinados,
          vencendo30: panorama.cards.vencendo,
          vencidos: panorama.cards.vencidos,
        },
        assinaturasPendentes: panorama.cards.aguardandoAssinatura,
        segurosVencendo: panorama.cards.segurosVencendo,
        segurosVencidos: panorama.seguros.filter((s) => (diasAte(s.vigencia_fim) ?? 1) < 0).length,
        divergencias,
        pendenciasFila: panorama.fila.map((f) => ({ rotulo: f.rotulo, detalhe: f.detalhe })),
        rescisoesEmAndamento: panorama.cards.rescisoes,
        renovacoesProximas: panorama.cards.vencendo,
        aditivosTotal: panorama.aditivosTotal,
        masters: masters.map((m) => ({
          nome: m.template.nome,
          versaoAtual: m.template.versao_template,
          status: m.template.status,
          distribuicao: m.distribuicao,
          revisaoAprovada: m.revisaoAprovada,
        })),
        orfaos: orfaos.data ?? [],
      });
      const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-governanca-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Exportação falhou', extrairMensagemDeErro(e));
    }
  };

  if (isLoading) return null;

  return (
    <div className="mt-8 space-y-8">
      {/* Agenda Contratual (Módulo 6) */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          <CalendarClock className="h-4 w-4" aria-hidden /> Agenda contratual (1 · 7 · 15 · 30 · 60 · 90 dias)
        </h2>
        {agenda.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum evento nos próximos 90 dias.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agenda.map((b) => (
              <div key={b.horizonteDias} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {b.rotulo} <span className="text-neutral-400">({b.eventos.length})</span>
                </p>
                <div className="space-y-1">
                  {b.eventos.slice(0, 6).map((e, i) => (
                    <p key={i} className="truncate text-xs text-neutral-500" title={e.descricao}>
                      <span className={e.diasRestantes < 0 ? 'font-semibold text-red-600' : e.diasRestantes <= 7 ? 'font-semibold text-amber-600' : ''}>
                        {e.diasRestantes < 0 ? `${Math.abs(e.diasRestantes)}d atraso` : `${e.diasRestantes}d`}
                      </span>{' '}
                      {e.contratoId ? (
                        <Link className="hover:underline" to={`/juridico/contratos/${e.contratoId}`}>{e.descricao}</Link>
                      ) : (
                        e.descricao
                      )}
                    </p>
                  ))}
                  {b.eventos.length > 6 && <p className="text-[11px] text-neutral-400">+{b.eventos.length - 6} evento(s)</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Divergências Contratuais (Módulo 3) */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          <SearchX className="h-4 w-4" aria-hidden /> Divergências contratuais ({divergencias.length} contrato(s))
        </h2>
        <p className="mb-2 text-[11px] text-neutral-400">
          Snapshot congelado × cadastro atual. Nada é alterado automaticamente — a decisão (nova versão, aditivo ou ignorar
          com justificativa) é tomada na aba Governança do contrato.
        </p>
        {divergencias.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma divergência nos campos comparáveis.</p>
        ) : (
          <div className="space-y-2">
            {divergencias.map((c) => (
              <Link key={c.contratoId} to={`/juridico/contratos/${c.contratoId}`} className="block rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {c.contrato}{' '}
                  <Badge variant={c.divergencias.some((d) => d.prioridade === 'critico') ? 'destructive' : 'warning'}>
                    {c.divergencias.length} divergência(s)
                  </Badge>
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {c.divergencias.map((d) => `${d.rotulo}: contrato "${d.valorContrato}" × atual "${d.valorAtual}"`).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Governança do Master (Módulos 20/21) + órfãos (19) + relatório (24) */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            <GitBranch className="h-4 w-4" aria-hidden /> Governança do Master
          </h2>
          <Button size="sm" variant="outline" onClick={exportarRelatorio}>
            <FileDown className="h-3.5 w-3.5" aria-hidden /> Relatório de Governança Contratual (.md)
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {masters.map((m) => (
            <div key={m.template.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {m.template.nome} — v{m.template.versao_template}{' '}
                <Badge variant={m.template.status === 'publicado' ? 'success' : 'secondary'}>{m.template.status}</Badge>{' '}
                <Badge variant={m.revisaoAprovada ? 'success' : 'warning'}>{m.revisaoAprovada ? 'revisão jurídica registrada' : 'revisão jurídica pendente'}</Badge>
              </p>
              <div className="mt-1.5 text-xs text-neutral-500">
                {m.distribuicao.length === 0 && 'Nenhum contrato gerado a partir deste modelo.'}
                {m.distribuicao.map((d) => (
                  <p key={String(d.versao)}>
                    {d.contratos} contrato(s) usando {d.versao == null ? 'versão NÃO INFORMADA no snapshot' : `v${d.versao}`}
                    {d.versao != null && d.versao < m.template.versao_template && (
                      <span className="ml-1 text-amber-600">(versão antiga — decisão humana: manter/aditar/renovar/substituir na aba Contratos impactados)</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        {(orfaos.data ?? []).some((o) => o.quantidade > 0) && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <p className="font-semibold">Registro órfão detectado (nunca removido automaticamente):</p>
            {(orfaos.data ?? []).filter((o) => o.quantidade > 0).map((o) => (
              <p key={o.tipo}>• {o.tipo}: {o.quantidade}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
