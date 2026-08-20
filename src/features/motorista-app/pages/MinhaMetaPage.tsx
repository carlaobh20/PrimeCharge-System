import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { Secao, Linha, SkeletonPortal, ErroPortal } from '../components/ui';
import { DespesasGrupo } from '../components/meta/DespesasGrupo';
import { CalendarioMeta } from '../components/meta/CalendarioMeta';
import { SimuladorESe } from '../components/meta/SimuladorESe';
import { OnboardingMeta } from '../components/meta/OnboardingMeta';
import { HeroHoje } from '../components/meta/HeroHoje';
import { RitmoMesCard } from '../components/meta/RitmoMesCard';
import { CarroCard } from '../components/meta/CarroCard';
import { OperacaoRealCard } from '../components/meta/OperacaoRealCard';
import { useMinhaMeta } from '../hooks/useMinhaMeta';
import {
  CATEGORIAS_CARRO,
  CATEGORIAS_FAMILIA,
  CATEGORIAS_TRABALHO,
  CATEGORIAS_VIDA,
  diasDeTrabalhoAte,
  formatBRL,
  objetivoPorDia,
  PERIODICIDADE_LABEL,
  sobraEstimada,
} from '../lib/metas';

// COCKPIT FINANCEIRO DO MOTORISTA (Fase 9 — evolução da Minha Meta, nada reconstruído).
// A primeira dobra responde: "quanto eu preciso fazer HOJE?" (Módulo 26 — ordem fixa:
// hoje → ritmo do mês → custo total → carro → operação → calendário → objetivos → histórico
// → simulador). Renda/hora é PREMISSA; realizado é LANÇADO pelo motorista; nada é inventado;
// nada aqui é aconselhamento financeiro.

const hojeIso = () => new Date().toISOString().slice(0, 10);

export function MinhaMetaPage() {
  const m = useMinhaMeta();
  const [onboardingConcluido, setOnboardingConcluido] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarDetalhe, setMostrarDetalhe] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState(false);
  const [objForm, setObjForm] = useState({ nome: '', categoria: 'reserva', valor_meta: '', valor_atual: '', prazo: '' });
  const snapshotGravado = useRef(false);

  const d = m.derivado;

  // histórico mensal (Módulo 19): fotografa custos + meta + dias + renda + reserva do mês
  // corrente quando a tela abre com dados (upsert — nunca apaga histórico).
  useEffect(() => {
    if (!d || !m.motoristaId || snapshotGravado.current || d.totais.total <= 0) return;
    snapshotGravado.current = true;
    m.mSnapshot.mutate({
      total: d.totais.total,
      porGrupo: {
        vida: d.totais.vida,
        familia: d.totais.familia,
        carro: d.totais.carro,
        trabalho: d.totais.trabalho,
        meta_mensal: d.meta.metaMensal,
        dias_trabalho: d.meta.diasTrabalho,
        renda_hora: d.meta.rendaHora,
        reserva_meta: d.config?.reserva_meta ?? 0,
        reserva_atual: d.config?.reserva_atual ?? 0,
        // Fase 10 (Módulo 21) — fechamento mensal fotografado no MESMO snapshot
        ganhos_registrados: d.progresso.realizado,
        dias_trabalhados: d.progresso.diasComLancamento,
        rs_dia: d.realDia14?.valor ?? 0,
        rs_hora: d.realHora14?.valor ?? 0,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m.motoristaId]);

  if (m.carregando) return <SkeletonPortal />;
  if (m.erro || !d) return <ErroPortal onRetry={() => m.recarregar()} />;

  const contratoInfo = d.contratoAtivo
    ? `Importado do seu contrato PrimeCharge (${formatBRL(d.contratoAtivo.valor_periodico)} ${PERIODICIDADE_LABEL[d.contratoAtivo.periodicidade === 'diaria' ? 'diaria' : d.contratoAtivo.periodicidade]})`
    : 'Sem contrato ativo no PrimeCharge';

  // ===== onboarding progressivo (mantido da fase anterior) =====
  if (d.precisaOnboarding && !onboardingConcluido) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
            <Target className="h-5 w-5 text-emerald-600" aria-hidden /> Minha Meta
          </h1>
          <p className="text-sm text-neutral-500">Meu custo de vida — vamos descobrir quanto sua vida custa. Leva 2 minutos.</p>
        </header>
        <OnboardingMeta
          aluguelCarroMensal={d.aluguelCarroMensal}
          totalAtual={d.totais.total}
          onCriarDespesa={(desp) => m.mDespesaCriar.mutate(desp)}
          onSalvarConfig={(c) => m.mConfig.mutate(c)}
          onConcluir={() => setOnboardingConcluido(true)}
          salvando={m.mDespesaCriar.isPending || m.mConfig.isPending}
        />
      </div>
    );
  }

  const meta = d.meta;
  const objetivos = m.dados?.objetivos ?? [];
  const snapshots = m.dados?.snapshots ?? [];
  const config = d.config;
  const sobra = d.progresso.realizado > 0 ? sobraEstimada(d.progresso.realizado, meta.metaMensal) : null;
  const pct = (n: number) => (d.totais.total > 0 ? Math.round((n / d.totais.total) * 100) : 0);
  const pctCoberto = Math.min(100, d.progresso.pctCoberto);
  const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
            <Target className="h-5 w-5 text-emerald-600" aria-hidden /> Minha Meta
          </h1>
          <p className="text-sm capitalize text-neutral-500">{mesLabel}</p>
        </div>
        <button type="button" className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300" onClick={() => setMostrarConfig(!mostrarConfig)}>
          Ajustes
        </button>
      </header>

      {mostrarConfig && (
        <Secao titulo="Premissas (você controla)">
          <label className="block text-sm">
            <span className="text-neutral-500">Dias de trabalho no mês: <strong className="text-neutral-800 dark:text-neutral-100">{meta.diasTrabalho}</strong></span>
            <input type="range" min={10} max={31} defaultValue={meta.diasTrabalho} onChange={(e) => m.mConfig.mutate({ dias_trabalho: Number(e.target.value) })} className="mt-1 w-full accent-emerald-600" />
          </label>
          <div className="mt-2">
            <p className="text-sm text-neutral-500">Renda média por hora (premissa — não é faturamento real):</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[30, 35, 40, 45, 50].map((r) => (
                <button key={r} type="button" onClick={() => m.mConfig.mutate({ renda_hora: r })} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${meta.rendaHora === r ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-300 text-neutral-500 dark:border-white/20'}`}>
                  R$ {r}
                </button>
              ))}
              <input className="h-9 w-24 rounded-full border border-neutral-300 bg-transparent px-3 text-sm dark:border-white/20" placeholder="Outro" inputMode="decimal" onBlur={(e) => { const v = Number(e.target.value.replace(',', '.')); if (Number.isFinite(v) && v > 0) m.mConfig.mutate({ renda_hora: v }); }} />
            </div>
          </div>
        </Secao>
      )}

      {/* ===== 1–4 · HERO: META DE HOJE + status do dia + encerrar dia (Módulos 1/2/5/8/14/18) ===== */}
      <HeroHoje
        hoje={d.hojeCockpit}
        mesLabel={mesLabel}
        rendaHora={meta.rendaHora}
        salvando={m.mGanho.isPending}
        onEncerrarDia={({ valor, horas }) => m.mGanho.mutate({ data: hojeIso(), valor, horas, observacao: 'dia_encerrado' })}
      />

      {/* ===== 5 · RITMO DO MÊS (F9: 3/4/6/7/15/16/22 · F10: projeções duplas) ===== */}
      <RitmoMesCard ritmo={d.ritmo} bancoMeta={d.bancoMeta} bancoHoras={d.bancoHoras} projecao={d.projecao} projecoes={d.projecoes} recuperacao={d.recuperacao} />

      {/* ===== OPERAÇÃO REAL (Fase 10 — registros × premissa, nunca misturados) ===== */}
      <OperacaoRealCard
        realHora={d.realHora14}
        realDia={d.realDia14}
        metaDiaria={meta.metaDiaria}
        premissaHora={meta.rendaHora}
        eficiencia={d.eficiencia}
        custoDia={d.custoDia}
        custoHoraRealMes={d.custoHoraRealMes}
        janelas={d.janelas}
        tendencia7={d.tendencia7}
        confianca={d.confianca}
        qualidade={d.qualidade}
        equilibrio={d.equilibrio}
        melhoresDias={d.melhoresDias}
        ganhosJanela={d.ganhos14}
        salvandoPremissa={m.mConfig.isPending}
        onUsarComoPremissa={(valor) => m.mConfig.mutate({ renda_hora: valor })}
      />

      {/* ===== alertas factuais (Módulo 21) ===== */}
      {d.alertas.length > 0 && (
        <Secao titulo="Para você saber">
          <ul className="space-y-1.5">
            {d.alertas.map((a, i) => (
              <li key={i} className="text-[13px] text-neutral-600 dark:text-neutral-300">• {a}</li>
            ))}
          </ul>
        </Secao>
      )}

      {/* ===== divergência aluguel contrato × manual (Módulo 10) ===== */}
      {d.divergenciaAluguel && (
        <Secao>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Divergência no aluguel do carro</p>
          <Linha label="CONTRATO" value={`${formatBRL(d.divergenciaAluguel.contrato)}/mês`} />
          <Linha label="CADASTRO MANUAL" value={`${formatBRL(d.divergenciaAluguel.manual)}/mês`} />
          <p className="text-[11px] text-neutral-500">O aluguel já entra automaticamente pelo contrato — o seu cadastro manual está duplicando.</p>
          <button type="button" className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white" onClick={() => m.mDespesaAtualizar.mutate({ id: d.divergenciaAluguel!.despesaId, patch: { ativa: false } })}>
            Usar o dado do contrato (pausar o meu)
          </button>
        </Secao>
      )}

      {/* ===== 6 · CUSTO TOTAL resumido + VER DETALHAMENTO (Módulos 9/13) ===== */}
      <Secao titulo="Custo total do mês">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">{formatBRL(d.totais.total)}<span className="text-xs font-normal text-neutral-400">/mês</span></span>
          {meta.custoPorHora != null && <span className="text-[11px] text-neutral-500">≈ {formatBRL(meta.custoPorHora)}/hora trabalhada</span>}
        </div>
        <div className="mt-2 space-y-1.5" role="img" aria-label={`Carro ${pct(d.totais.carro)}%, vida ${pct(d.totais.vida + d.totais.familia)}%, trabalho ${pct(d.totais.trabalho)}%`}>
          {(
            [
              ['Vida + família', d.totais.vida + d.totais.familia, 'bg-sky-500'],
              ['Carro', d.totais.carro, 'bg-emerald-500'],
              ['Trabalho', d.totais.trabalho, 'bg-amber-500'],
            ] as const
          ).map(([rotulo, valor, cor]) => (
            <div key={rotulo}>
              <div className="flex justify-between text-[12px]">
                <span className="text-neutral-600 dark:text-neutral-300">{rotulo}</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{formatBRL(valor)} · {pct(valor)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct(valor)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="mt-2 w-full rounded-xl border border-dashed border-neutral-300 py-2 text-sm font-medium text-emerald-600 dark:border-white/20" onClick={() => setMostrarDetalhe(!mostrarDetalhe)} aria-expanded={mostrarDetalhe}>
          {mostrarDetalhe ? 'Ocultar detalhamento' : 'Ver detalhamento'}
        </button>
      </Secao>

      {/* ===== detalhamento: blocos de despesas (mantidos — Módulo 9, sem duplicar cadastro) ===== */}
      {mostrarDetalhe && (
        <>
          <DespesasGrupo titulo="1 · Minha vida" grupo="vida" subtotal={d.totais.vida} despesas={m.dados?.despesas ?? []} categorias={CATEGORIAS_VIDA} onCriar={(x) => m.mDespesaCriar.mutate(x)} onAtualizar={(id, patch) => m.mDespesaAtualizar.mutate({ id, patch })} onRemover={(id) => m.mDespesaRemover.mutate(id)} salvando={m.mDespesaCriar.isPending} />
          <DespesasGrupo titulo="2 · Minha família" grupo="familia" subtotal={d.totais.familia} despesas={m.dados?.despesas ?? []} categorias={CATEGORIAS_FAMILIA} comDependente onCriar={(x) => m.mDespesaCriar.mutate(x)} onAtualizar={(id, patch) => m.mDespesaAtualizar.mutate({ id, patch })} onRemover={(id) => m.mDespesaRemover.mutate(id)} salvando={m.mDespesaCriar.isPending} />
          <DespesasGrupo
            titulo="3 · Meu carro"
            grupo="carro"
            subtotal={d.totais.carro}
            despesas={m.dados?.despesas ?? []}
            categorias={CATEGORIAS_CARRO}
            itemFixo={d.contratoAtivo ? { nome: 'Aluguel do carro', valorMensal: d.aluguelCarroMensal, origem: contratoInfo } : null}
            onCriar={(x) => m.mDespesaCriar.mutate(x)}
            onAtualizar={(id, patch) => m.mDespesaAtualizar.mutate({ id, patch })}
            onRemover={(id) => m.mDespesaRemover.mutate(id)}
            salvando={m.mDespesaCriar.isPending}
          />
          <DespesasGrupo titulo="4 · Custo para trabalhar" grupo="trabalho" subtotal={d.totais.trabalho} despesas={m.dados?.despesas ?? []} categorias={CATEGORIAS_TRABALHO} onCriar={(x) => m.mDespesaCriar.mutate(x)} onAtualizar={(id, patch) => m.mDespesaAtualizar.mutate({ id, patch })} onRemover={(id) => m.mDespesaRemover.mutate(id)} salvando={m.mDespesaCriar.isPending} />
        </>
      )}

      {/* ===== 7–8 · CARRO + OPERAÇÃO (Módulos 10/11/12) ===== */}
      <CarroCard
        totalCarro={d.totais.carro}
        totalGeral={d.totais.total}
        aluguelContrato={d.contratoAtivo ? { valorMensal: d.aluguelCarroMensal, origem: contratoInfo } : null}
        porCategoria={d.carroPorCategoria}
        custoVida={d.custoVida}
        custoOperacao={d.custoOperacao}
        custoDiaCarro={d.custoDiaCarro}
        custoHoraCarro={d.custoHoraCarro}
      />

      {/* ===== ponto de equilíbrio (Módulo 13) ===== */}
      {d.progresso.diasComLancamento > 0 && (
        <Secao titulo="Ponto de equilíbrio">
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10" role="img" aria-label={`Cobertura de custos: ${d.progresso.pctCoberto}%. Depois de 100%, começa a sobra estimada.`}>
            <div className={`h-full ${d.progresso.pctCoberto >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pctCoberto}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-neutral-700 dark:text-white">
              {d.progresso.pctCoberto < 100 ? `ANTES do equilíbrio — cobrindo custos (${d.progresso.pctCoberto}%)` : 'DEPOIS do equilíbrio — gerando sobra estimada'}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
            <span>R$ 0</span>
            <span>Equilíbrio: {formatBRL(meta.metaMensal)}</span>
          </div>
          {sobra != null && (
            <p className="mt-1.5 text-[12px] text-neutral-600 dark:text-neutral-300">
              Receita lançada {formatBRL(d.progresso.realizado)} − custos {formatBRL(meta.metaMensal)} ={' '}
              <strong className={sobra >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatBRL(sobra)}</strong> de{' '}
              {sobra >= 0 ? 'sobra estimada' : 'cobertura ainda pendente'} — estimativa com os valores informados.
            </p>
          )}
        </Secao>
      )}

      {/* ===== 9 · CALENDÁRIO (Módulo 17) ===== */}
      <CalendarioMeta
        dias={d.calendario}
        salvando={m.mGanho.isPending}
        onLancar={({ dia, valor, horas }) => {
          const anoMes = new Date().toISOString().slice(0, 7);
          m.mGanho.mutate({ data: `${anoMes}-${String(dia).padStart(2, '0')}`, valor, horas });
        }}
      />

      {/* ===== 10 · OBJETIVOS (Módulo 24 — com impacto diário) ===== */}
      <Secao titulo="Meu próximo objetivo" acao={<button type="button" className="text-xs font-medium text-emerald-600" onClick={() => setNovoObjetivo(!novoObjetivo)}>{novoObjetivo ? 'Fechar' : '+ Novo'}</button>}>
        {objetivos.length === 0 && !novoObjetivo && <p className="text-sm text-neutral-400">Nenhum objetivo ainda — reserva, quitar dívida, carro próprio, viagem…</p>}
        {objetivos.map((o) => {
          const diasDisp = diasDeTrabalhoAte(o.prazo, meta.diasTrabalho, new Date()) ?? meta.diasTrabalho;
          const porDia = objetivoPorDia(o.valor_meta, o.valor_atual, diasDisp);
          const pctObj = o.valor_meta > 0 ? Math.min(100, Math.round((o.valor_atual / o.valor_meta) * 100)) : 0;
          return (
            <div key={o.id} className="mb-2 rounded-xl border border-neutral-100 p-3 dark:border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{o.nome}</p>
                <button type="button" className="text-[11px] text-neutral-400" onClick={() => m.mObjetivoArquivar.mutate(o.id)}>arquivar</button>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10" role="img" aria-label={`${pctObj}% do objetivo`}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pctObj}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {formatBRL(o.valor_atual)} de {formatBRL(o.valor_meta)} ({pctObj}%) · falta {formatBRL(Math.max(0, o.valor_meta - o.valor_atual))}
                {o.prazo && ` · prazo ${o.prazo.slice(8, 10)}/${o.prazo.slice(5, 7)}/${o.prazo.slice(0, 4)}`}
              </p>
              {porDia != null && porDia > 0 && (
                <p className="mt-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                  Impacto diário estimado: {formatBRL(porDia)} ADICIONAIS por dia para atingir este objetivo.
                </p>
              )}
            </div>
          );
        })}
        {novoObjetivo && (
          <div className="space-y-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-white/20">
            <input className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Objetivo (ex.: Reserva de emergência)" value={objForm.nome} onChange={(e) => setObjForm((f) => ({ ...f, nome: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Valor total (R$)" inputMode="decimal" value={objForm.valor_meta} onChange={(e) => setObjForm((f) => ({ ...f, valor_meta: e.target.value }))} />
              <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Já tenho (R$)" inputMode="decimal" value={objForm.valor_atual} onChange={(e) => setObjForm((f) => ({ ...f, valor_atual: e.target.value }))} />
            </div>
            <input type="date" className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" value={objForm.prazo} onChange={(e) => setObjForm((f) => ({ ...f, prazo: e.target.value }))} />
            <button
              type="button"
              disabled={m.mObjetivo.isPending}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                const vm = Number(objForm.valor_meta.replace(',', '.'));
                const va = Number(objForm.valor_atual.replace(',', '.')) || 0;
                if (!objForm.nome.trim() || !Number.isFinite(vm) || vm <= 0) return;
                m.mObjetivo.mutate({ nome: objForm.nome.trim(), categoria: objForm.categoria, valor_meta: vm, valor_atual: Math.max(0, va), prazo: objForm.prazo || null });
                setObjForm({ nome: '', categoria: 'reserva', valor_meta: '', valor_atual: '', prazo: '' });
                setNovoObjetivo(false);
              }}
            >
              Salvar objetivo
            </button>
          </div>
        )}
      </Secao>

      {/* ===== RESERVA (Módulo 25 — separada do custo mensal) ===== */}
      {config?.reserva_meta != null && config.reserva_meta > 0 && (
        <Secao titulo="Reserva de emergência">
          <Linha label="META" value={formatBRL(config.reserva_meta)} />
          <Linha label="ATUAL" value={config.reserva_atual != null ? formatBRL(config.reserva_atual) : 'NÃO INFORMADO'} />
          <Linha label="FALTA" value={formatBRL(Math.max(0, config.reserva_meta - (config.reserva_atual ?? 0)))} />
          {config.reserva_contribuicao_mensal != null && <Linha label="Contribuição mensal" value={formatBRL(config.reserva_contribuicao_mensal)} />}
          <p className="mt-1 text-[10px] text-neutral-400">A reserva é um objetivo à parte — não entra no custo mensal.</p>
        </Secao>
      )}

      {/* ===== 11 · HISTÓRICO + COMPARAÇÃO MENSAL (Módulos 19/20) ===== */}
      {(snapshots.length > 1 || d.comparacao) && (
        <Secao titulo="Histórico do custo mensal">
          {d.comparacao && (
            <div className="mb-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/5">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">{d.comparacao.mesAnterior.slice(5, 7)}/{d.comparacao.mesAnterior.slice(0, 4)}</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatBRL(d.comparacao.totalAnterior)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">{d.comparacao.mesAtual.slice(5, 7)}/{d.comparacao.mesAtual.slice(0, 4)}</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatBRL(d.comparacao.totalAtual)}</p>
                </div>
              </div>
              <p className="mt-1 text-center text-[12px] text-neutral-600 dark:text-neutral-300">
                Variação: {d.comparacao.variacao >= 0 ? '+' : '−'}{formatBRL(Math.abs(d.comparacao.variacao))}
                {d.comparacao.variacaoPct != null && ` (${d.comparacao.variacao >= 0 ? '+' : '−'}${String(Math.abs(d.comparacao.variacaoPct)).replace('.', ',')}%)`}
              </p>
              <div className="mt-1 space-y-0.5">
                {d.comparacao.porGrupo.filter((g) => g.variacao != null && Math.abs(g.variacao) >= 1).map((g) => (
                  <p key={g.grupo} className="text-[11px] text-neutral-500">
                    {g.grupo === 'vida' ? 'Vida' : g.grupo === 'familia' ? 'Família' : g.grupo === 'carro' ? 'Carro' : 'Operação (trabalho)'}:{' '}
                    {g.variacao! >= 0 ? '+' : '−'}{formatBRL(Math.abs(g.variacao!))}
                  </p>
                ))}
              </div>
            </div>
          )}
          {snapshots.slice(0, 6).map((s) => (
            <Linha key={s.id} label={`${s.mes.slice(5, 7)}/${s.mes.slice(0, 4)}`} value={formatBRL(s.total)} />
          ))}
        </Secao>
      )}

      {/* ===== 12 · SIMULADOR + CENÁRIOS (Módulos 23/25) ===== */}
      <SimuladorESe base={{ custoTotal: d.totais.total, diasTrabalho: meta.diasTrabalho, rendaHora: meta.rendaHora }} cenarios={d.cenarios} mediaRegistrada={d.realHora14?.valor ?? null} />

      <p className="pb-2 text-center text-[10px] text-neutral-400">
        Ferramenta de organização pessoal com os valores que VOCÊ informou. Não é aconselhamento financeiro.
      </p>
    </div>
  );
}
