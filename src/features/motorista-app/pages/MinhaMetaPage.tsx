import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal } from '../components/ui';
import { DespesasGrupo } from '../components/meta/DespesasGrupo';
import { CalendarioMeta } from '../components/meta/CalendarioMeta';
import { SimuladorESe } from '../components/meta/SimuladorESe';
import { OnboardingMeta } from '../components/meta/OnboardingMeta';
import { useMinhaMeta } from '../hooks/useMinhaMeta';
import {
  CATEGORIAS_CARRO,
  CATEGORIAS_FAMILIA,
  CATEGORIAS_TRABALHO,
  CATEGORIAS_VIDA,
  diasDeTrabalhoAte,
  formatBRL,
  formatHoras,
  objetivoPorDia,
  PERIODICIDADE_LABEL,
  sobraEstimada,
} from '../lib/metas';

// MINHA META / MEU CUSTO DE VIDA — a tela responde na primeira dobra: "quanto eu preciso
// produzir este mês/dia/hora?". Mobile-first, sem cara de ERP. Renda/hora é PREMISSA declarada;
// realizado é LANÇADO pelo motorista (o sistema não tem o faturamento dos apps — nada é
// inventado). Isto não é aconselhamento financeiro: são os números que o próprio motorista
// cadastrou, organizados.

export function MinhaMetaPage() {
  const m = useMinhaMeta();
  const [onboardingConcluido, setOnboardingConcluido] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState(false);
  const [objForm, setObjForm] = useState({ nome: '', categoria: 'reserva', valor_meta: '', valor_atual: '', prazo: '' });
  const snapshotGravado = useRef(false);

  const d = m.derivado;

  // histórico mensal (Módulo 27): grava o snapshot do mês corrente quando a tela abre com dados
  useEffect(() => {
    if (!d || !m.motoristaId || snapshotGravado.current || d.totais.total <= 0) return;
    snapshotGravado.current = true;
    m.mSnapshot.mutate({
      total: d.totais.total,
      porGrupo: { vida: d.totais.vida, familia: d.totais.familia, carro: d.totais.carro, trabalho: d.totais.trabalho },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m.motoristaId]);

  if (m.carregando) return <SkeletonPortal />;
  if (m.erro || !d) return <ErroPortal onRetry={() => m.recarregar()} />;

  const contratoInfo = d.contratoAtivo
    ? `Importado do seu contrato PrimeCharge (${formatBRL(d.contratoAtivo.valor_periodico)} ${PERIODICIDADE_LABEL[d.contratoAtivo.periodicidade === 'diaria' ? 'diaria' : d.contratoAtivo.periodicidade]})`
    : 'Sem contrato ativo no PrimeCharge';

  // ===== onboarding progressivo (Módulo 29) =====
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

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
            <Target className="h-5 w-5 text-emerald-600" aria-hidden /> Minha Meta
          </h1>
          <p className="text-sm text-neutral-500">Meu custo de vida</p>
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

      {/* ===== HERO (Módulos 2/13/14/12) ===== */}
      <section className="rounded-2xl bg-emerald-600 p-4 text-white">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-80">Meta do mês (cobertura)</p>
            <p className="text-2xl font-extrabold">{formatBRL(meta.metaMensal)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-80">Meta por dia</p>
            <p className="text-2xl font-extrabold">{formatBRL(meta.metaDiaria)}</p>
          </div>
        </div>
        <p className="mt-1 text-xs opacity-90">
          {meta.horasPorDia != null
            ? `≈ ${formatHoras(meta.horasPorDia)}/dia a ${formatBRL(meta.rendaHora)}/h · ${meta.diasTrabalho} dias de trabalho`
            : `${meta.diasTrabalho} dias de trabalho — informe sua renda/hora em Ajustes`}
        </p>
        <p className="mt-1 text-[10px] opacity-75">
          Valor estimado para COBRIR os custos cadastrados — estimativa baseada na renda média informada. Não é lucro nem faturamento.
        </p>
      </section>

      {/* ===== PROGRESSO DO MÊS + REBALANCEAMENTO (16/18) ===== */}
      <Secao titulo="Progresso do mês">
        {d.progresso.diasComLancamento === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhum lançamento ainda. Toque num dia do calendário abaixo e registre quanto você fez — o sistema não tem acesso ao
            faturamento dos aplicativos, então nada é inventado.
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-neutral-500">Realizado (lançado por você)</span>
              <span className="text-lg font-bold text-neutral-900 dark:text-white">{formatBRL(d.progresso.realizado)}</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10" role="img" aria-label={`Coberto ${d.progresso.pctCoberto}% da meta`}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pctCoberto}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-neutral-500">
              <span>Coberto: {d.progresso.pctCoberto}%</span>
              <span>Falta: {formatBRL(d.progresso.falta)}</span>
            </div>
            {d.novaMedia != null && d.progresso.falta > 0 && Math.abs(d.novaMedia - meta.metaDiaria) > 0.5 && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Para manter sua meta mensal, sua média necessária nos próximos {d.diasTrabalhoRestantes} dia(s) passou para{' '}
                <strong>{formatBRL(d.novaMedia)}/dia</strong>.
              </p>
            )}
            {sobra != null && (
              <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
                Receita lançada {formatBRL(d.progresso.realizado)} − custos {formatBRL(meta.metaMensal)} ={' '}
                <strong className={sobra >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatBRL(sobra)}</strong> de{' '}
                {sobra >= 0 ? 'sobra estimada' : 'cobertura ainda pendente'} — estimativa baseada nos valores informados.
              </div>
            )}
          </>
        )}
      </Secao>

      {/* ===== HOJE (Módulo 17) ===== */}
      <Secao titulo="Hoje">
        <Linha label="Meta de hoje" value={formatBRL(d.hojeMeta.meta)} />
        {d.hojeMeta.realizado != null ? (
          <>
            <Linha label="Realizado" value={formatBRL(d.hojeMeta.realizado)} />
            <Linha label="Falta" value={d.hojeMeta.falta != null ? formatBRL(d.hojeMeta.falta) : '—'} />
            {d.hojeMeta.horasRestantes != null && d.hojeMeta.falta != null && d.hojeMeta.falta > 0 && (
              <Linha label="Horas estimadas restantes" value={`≈ ${formatHoras(d.hojeMeta.horasRestantes)}`} />
            )}
            {d.hojeMeta.falta === 0 && <Pill tom="verde">Meta de hoje atingida</Pill>}
          </>
        ) : (
          <p className="text-[11px] text-neutral-400">Sem lançamento hoje — registre no calendário quando fechar o dia.</p>
        )}
      </Secao>

      {/* ===== DIVERGÊNCIA aluguel (Módulo 32) ===== */}
      {d.divergenciaAluguel && (
        <Secao>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Divergência no aluguel do carro</p>
          <Linha label="Dado do contrato PrimeCharge" value={`${formatBRL(d.divergenciaAluguel.contrato)}/mês`} />
          <Linha label="Seu dado cadastrado" value={`${formatBRL(d.divergenciaAluguel.manual)}/mês`} />
          <p className="text-[11px] text-neutral-500">O aluguel já entra automaticamente pelo contrato — o seu cadastro manual está duplicando.</p>
          <button type="button" className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white" onClick={() => m.mDespesaAtualizar.mutate({ id: d.divergenciaAluguel!.despesaId, patch: { ativa: false } })}>
            Usar o dado do contrato (pausar o meu)
          </button>
        </Secao>
      )}

      {/* ===== CUSTO TOTAL + COMPOSIÇÃO (Módulos 8/31) ===== */}
      <Secao titulo="Do seu custo mensal">
        <div className="space-y-1.5" role="img" aria-label={`Carro ${pct(d.totais.carro)}%, vida ${pct(d.totais.vida + d.totais.familia)}%, trabalho ${pct(d.totais.trabalho)}%`}>
          {(
            [
              ['Carro', d.totais.carro, 'bg-emerald-500'],
              ['Vida + família', d.totais.vida + d.totais.familia, 'bg-sky-500'],
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
        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-100 pt-2 dark:border-white/10">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">CUSTO TOTAL</span>
          <span className="text-xl font-extrabold text-neutral-900 dark:text-white">{formatBRL(d.totais.total)}<span className="text-xs font-normal text-neutral-400">/mês</span></span>
        </div>
        {meta.custoPorHora != null && (
          <p className="mt-1 text-[11px] text-neutral-500">
            Cada hora trabalhada precisa gerar aproximadamente {formatBRL(meta.custoPorHora)} para cobrir os custos cadastrados
            ({meta.horasMes != null ? `${Math.round(meta.horasMes)}h previstas no mês` : ''}).
          </p>
        )}
      </Secao>

      {/* ===== PONTO DE EQUILÍBRIO (Módulo 21) ===== */}
      {d.progresso.diasComLancamento > 0 && (
        <Secao titulo="Ponto de equilíbrio">
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10" role="img" aria-label={`Cobertura de custos: ${d.progresso.pctCoberto}%. Depois de 100%, começa a sobra.`}>
            <div className={`h-full ${d.progresso.pctCoberto >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pctCoberto}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-neutral-700 dark:text-white">
              {d.progresso.pctCoberto < 100 ? `ANTES do equilíbrio — cobrindo custos (${d.progresso.pctCoberto}%)` : 'DEPOIS do equilíbrio — gerando sobra estimada'}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
            <span>R$ 0</span>
            <span>Equilíbrio: {formatBRL(meta.metaMensal)}</span>
          </div>
        </Secao>
      )}

      {/* ===== BLOCOS DE DESPESAS (Módulos 4–7) ===== */}
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

      {/* ===== OBJETIVOS + RESERVA (23/24) ===== */}
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
                  Para atingir este objetivo, você precisa gerar aproximadamente {formatBRL(porDia)} ADICIONAIS por dia.
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

      {/* ===== ALERTAS (26) ===== */}
      {d.alertas.length > 0 && (
        <Secao titulo="Para você saber">
          <ul className="space-y-1.5">
            {d.alertas.map((a, i) => (
              <li key={i} className="text-[13px] text-neutral-600 dark:text-neutral-300">• {a}</li>
            ))}
          </ul>
        </Secao>
      )}

      {/* ===== CALENDÁRIO (19) ===== */}
      <CalendarioMeta
        dias={d.calendario}
        salvando={m.mGanho.isPending}
        onLancar={({ dia, valor, horas }) => {
          const anoMes = new Date().toISOString().slice(0, 7);
          m.mGanho.mutate({ data: `${anoMes}-${String(dia).padStart(2, '0')}`, valor, horas });
        }}
      />

      {/* ===== SIMULADOR (25) ===== */}
      <SimuladorESe base={{ custoTotal: d.totais.total, diasTrabalho: meta.diasTrabalho, rendaHora: meta.rendaHora }} />

      {/* ===== HISTÓRICO (27) ===== */}
      {snapshots.length > 1 && (
        <Secao titulo="Histórico do custo mensal">
          {snapshots.slice(0, 6).map((s) => (
            <Linha key={s.id} label={`${s.mes.slice(5, 7)}/${s.mes.slice(0, 4)}`} value={formatBRL(s.total)} />
          ))}
        </Secao>
      )}

      {/* ===== RESERVA (24) ===== */}
      {config?.reserva_meta != null && config.reserva_meta > 0 && (
        <Secao titulo="Reserva de emergência">
          <Linha label="Meta" value={formatBRL(config.reserva_meta)} />
          <Linha label="Atual" value={config.reserva_atual != null ? formatBRL(config.reserva_atual) : 'NÃO INFORMADO'} />
          <Linha label="Falta" value={formatBRL(Math.max(0, config.reserva_meta - (config.reserva_atual ?? 0)))} />
          {config.reserva_contribuicao_mensal != null && <Linha label="Contribuição mensal" value={formatBRL(config.reserva_contribuicao_mensal)} />}
        </Secao>
      )}

      <p className="pb-2 text-center text-[10px] text-neutral-400">
        Ferramenta de organização pessoal com os valores que VOCÊ informou. Não é aconselhamento financeiro.
      </p>
    </div>
  );
}
