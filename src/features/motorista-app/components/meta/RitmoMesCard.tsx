import { Secao, Linha } from '../ui';
import {
  formatBRL,
  formatHoras,
  type OpcaoRecuperacao,
  type ProjecaoMes,
  type RitmoMes,
} from '../../lib/metas';

// RITMO DO MÊS (Módulos 3/4/6/7/15/16/22) — o coração do cockpit: onde o mês está, quantos dias
// ficaram sem produção (SEM julgamento), a NOVA meta necessária (a original não muda), bancos de
// meta/horas (desempenho contra meta — NÃO é dinheiro guardado), projeção com fórmula declarada
// e opções de recuperação (só matemática; nenhuma recomendação).

export function RitmoMesCard({
  ritmo,
  bancoMeta,
  bancoHoras,
  projecao,
  recuperacao,
}: {
  ritmo: RitmoMes;
  bancoMeta: number | null;
  bancoHoras: { saldo: number; diasComHoras: number } | null;
  projecao: ProjecaoMes;
  recuperacao: OpcaoRecuperacao[];
}) {
  const semDado = ritmo.ritmo === 'sem_dado';
  return (
    <Secao titulo="Ritmo do mês">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Meta mensal</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatBRL(ritmo.metaMensal)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Realizado</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">{semDado ? '—' : formatBRL(ritmo.realizado)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Cobertura</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">{semDado ? '—' : `${ritmo.cobertura}%`}</p>
        </div>
      </div>

      <div className="mt-2">
        <Linha label="Dias planejados" value={String(ritmo.diasPlanejados)} />
        <Linha label="Dias trabalhados (lançados)" value={semDado ? 'SEM DADO' : String(ritmo.diasTrabalhados)} />
        <Linha label="Dias restantes (estimados)" value={String(ritmo.diasRestantesPlanejados)} />
      </div>

      {/* Módulo 4 — dias sem produção: fato, sem julgamento */}
      {!semDado && ritmo.diasSemProducao > 0 && (
        <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
          {ritmo.diasSemProducao} dia(s) do período planejado ficaram sem lançamento de produção. Isso aumentou sua meta
          necessária nos dias restantes. (Estimativa proporcional ao calendário — {ritmo.diasPlanejadosDecorridos} dia(s)
          planejados já decorridos.)
        </p>
      )}

      {/* Módulos 3/6 — NOVA meta necessária ≠ meta diária original */}
      {!semDado && ritmo.metaRestanteDia != null && Math.abs(ritmo.metaRestanteDia - ritmo.metaDiariaOriginal) > 0.5 && (
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Nova meta necessária</p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{formatBRL(ritmo.metaRestanteDia)}/dia</strong> nos próximos {ritmo.diasRestantesPlanejados} dia(s) — a meta
            diária original ({formatBRL(ritmo.metaDiariaOriginal)}) não muda; isto é o que falta ÷ dias restantes.
          </p>
        </div>
      )}

      {/* Módulos 15/16 — bancos de meta e horas */}
      {(bancoMeta != null || bancoHoras != null) && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {bancoMeta != null && (
            <div className="rounded-xl border border-neutral-100 p-2 text-center dark:border-white/10">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">Saldo de meta</p>
              <p className={`text-sm font-bold ${bancoMeta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {bancoMeta >= 0 ? '+' : '−'}{formatBRL(Math.abs(bancoMeta))}
              </p>
              <p className="text-[10px] text-neutral-400">desempenho contra a meta — não é dinheiro guardado</p>
            </div>
          )}
          {bancoHoras != null && (
            <div className="rounded-xl border border-neutral-100 p-2 text-center dark:border-white/10">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">Saldo de horas</p>
              <p className={`text-sm font-bold ${bancoHoras.saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {bancoHoras.saldo >= 0 ? '+' : '−'}{formatHoras(Math.abs(bancoHoras.saldo))}
              </p>
              <p className="text-[10px] text-neutral-400">{bancoHoras.diasComHoras} dia(s) com horas lançadas</p>
            </div>
          )}
        </div>
      )}

      {/* Módulo 22 — projeção com fórmula transparente */}
      <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Projeção do mês</p>
        {projecao ? (
          <>
            <p className="text-sm text-neutral-800 dark:text-neutral-100">
              Se o ritmo atual se mantiver: <strong>{formatBRL(projecao.projecao)}</strong>{' '}
              <span className={projecao.diferencaDaMeta >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                ({projecao.diferencaDaMeta >= 0 ? '+' : '−'}{formatBRL(Math.abs(projecao.diferencaDaMeta))} vs meta)
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-400">Fórmula: {projecao.formula}.</p>
          </>
        ) : (
          <p className="text-sm text-neutral-500">Sem dados suficientes para projetar (mínimo 3 dias lançados).</p>
        )}
      </div>

      {/* Módulo 7 — como recuperar (só matemática, sem recomendação) */}
      {recuperacao.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Como recuperar? (simulações)</p>
          <ul className="mt-1 space-y-1.5">
            {recuperacao.map((o) => (
              <li key={o.rotulo} className="rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{o.rotulo}</p>
                <p className="text-[11px] text-neutral-500">{o.detalhe}</p>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-neutral-400">Opções matemáticas equivalentes — a escolha é sua.</p>
        </div>
      )}
    </Secao>
  );
}
