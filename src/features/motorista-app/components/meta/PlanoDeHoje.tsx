import { useState } from 'react';
import { Secao, Linha, Pill } from '../ui';
import {
  formatBRL,
  formatHoras,
  type MetaHojeCockpit,
  type PararAgora,
  type RitmoMes,
  type SimulacaoHoras,
} from '../../lib/metas';

// PLANO DE HOJE (Fase 11, Módulos 1–3/5–8/10–12/18) — responde em segundos: quanto preciso
// fazer hoje, em quantas horas (premissa × MEU histórico), o que acontece se eu parar agora e
// se eu trabalhar ±1/2/3h. TUDO é cálculo sobre registros e premissas — "Se você ...,
// matematicamente ..." — a decisão é do motorista. Simulações NUNCA gravam nada.

export function PlanoDeHoje({
  hoje,
  ritmo,
  horasPremissa,
  horasHistorico,
  historicoHora,
  premissaHora,
  rsHoraHoje,
  custoHoraRealMes,
  pararAgora,
  simulacoes,
  amanha,
  horasRestantesMesDia,
}: {
  hoje: MetaHojeCockpit;
  ritmo: RitmoMes;
  horasPremissa: number | null;
  horasHistorico: number | null;
  historicoHora: number | null;
  premissaHora: number;
  rsHoraHoje: number | null;
  custoHoraRealMes: number | null;
  pararAgora: PararAgora | null;
  simulacoes: SimulacaoHoras[];
  amanha: { original: number; rebalanceada: number | null };
  horasRestantesMesDia: number | null;
}) {
  const [simAberta, setSimAberta] = useState<SimulacaoHoras | null>(null);
  const mais = simulacoes.filter((s) => s.horas > 0);
  const menos = simulacoes.filter((s) => s.horas < 0);
  const rebalanceadaDifere = Math.abs(hoje.metaHoje - hoje.metaDiariaOriginal) > 0.5;

  return (
    <Secao titulo="Plano de hoje">
      {/* ===== Módulo 1 — meta original × rebalanceada (a original NUNCA some) ===== */}
      {rebalanceadaDifere && (
        <div className="rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
          <Linha label="Meta original" value={`${formatBRL(hoje.metaDiariaOriginal)}/dia`} />
          <Linha label="Meta rebalanceada (hoje)" value={`${formatBRL(hoje.metaHoje)}/dia`} />
          <Linha
            label="Diferença"
            value={`${hoje.metaHoje >= hoje.metaDiariaOriginal ? '+' : '−'}${formatBRL(Math.abs(hoje.metaHoje - hoje.metaDiariaOriginal))}`}
          />
          <p className="mt-0.5 text-[10px] text-neutral-400">A rebalanceada é consequência matemática do ritmo do mês — a original não muda.</p>
        </div>
      )}

      {/* ===== Módulo 2 — horas necessárias: PREMISSA × HISTÓRICO ===== */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-neutral-100 p-2 dark:border-white/10">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Pela PREMISSA ({formatBRL(premissaHora)}/h)</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{horasPremissa != null ? formatHoras(horasPremissa) : '—'}</p>
        </div>
        <div className="rounded-xl border border-neutral-100 p-2 dark:border-white/10">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">
            Pelo MEU HISTÓRICO{historicoHora != null ? ` (${formatBRL(historicoHora)}/h)` : ''}
          </p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{horasHistorico != null ? formatHoras(horasHistorico) : 'SEM DADO'}</p>
        </div>
      </div>
      <p className="mt-1 text-[9px] text-neutral-400">Horas estimadas para a meta de hoje. Histórico = média dos seus registros — não é garantia.</p>

      {/* ===== Módulo 3 — realizado hoje com R$/h ===== */}
      {hoje.realizadoHoje != null && (
        <div className="mt-2">
          <Linha label="Realizado hoje · DADO REGISTRADO" value={formatBRL(hoje.realizadoHoje)} />
          {hoje.horasTrabalhadasHoje != null && <Linha label="Horas lançadas" value={formatHoras(hoje.horasTrabalhadasHoje)} />}
          {rsHoraHoje != null && <Linha label="R$/h de hoje" value={`${formatBRL(rsHoraHoje)}/h`} />}
          {hoje.faltanteHoje != null && <Linha label="Falta hoje" value={formatBRL(hoje.faltanteHoje)} />}
          {hoje.horasRestantes != null && hoje.faltanteHoje != null && hoje.faltanteHoje > 0 && (
            <Linha label="Horas estimadas restantes" value={`≈ ${formatHoras(hoje.horasRestantes)}`} />
          )}
        </div>
      )}

      {/* ===== Módulo 18 — SEU DIA EM NÚMEROS ===== */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center" role="img" aria-label="Seu dia em números">
        <div className="rounded-2xl bg-emerald-600 p-3 text-white">
          <p className="text-2xl font-extrabold">{formatBRL(hoje.metaHoje)}</p>
          <p className="text-[10px] uppercase tracking-wide opacity-80">Meta de hoje</p>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-3 text-white dark:bg-white/10">
          <p className="text-2xl font-extrabold">{horasPremissa != null ? formatHoras(horasPremissa) : '—'}</p>
          <p className="text-[10px] uppercase tracking-wide opacity-80">Horas estimadas</p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-white/5">
          <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{historicoHora != null ? `${formatBRL(historicoHora)}` : 'SEM DADO'}</p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Seu histórico (R$/h)</p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-white/5">
          <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {hoje.faltanteHoje != null ? formatBRL(hoje.faltanteHoje) : custoHoraRealMes != null ? formatBRL(custoHoraRealMes) : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">
            {hoje.faltanteHoje != null ? 'Falta hoje' : 'Custo/h estimado'}
          </p>
        </div>
      </div>

      {/* ===== Módulo 5 — SE EU PARAR AGORA ===== */}
      <div className="mt-3 rounded-xl border border-neutral-100 p-3 dark:border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Se eu parar agora</p>
        {pararAgora ? (
          <>
            <Linha label="Realizado hoje" value={formatBRL(pararAgora.realizadoHoje)} />
            <Linha label="Meta de hoje" value={formatBRL(pararAgora.metaHoje)} />
            <Linha
              label="Diferença"
              value={`${pararAgora.diferencaHoje >= 0 ? '+' : '−'}${formatBRL(Math.abs(pararAgora.diferencaHoje))}`}
            />
            {pararAgora.novaMetaDia != null ? (
              <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-300">
                Se você encerrar agora, matematicamente sua média necessária nos {ritmo.diasRestantesPlanejados} dia(s) restantes passa a ser{' '}
                <strong>{formatBRL(pararAgora.novaMetaDia)}/dia</strong>.
              </p>
            ) : pararAgora.faltaDepoisDeHoje > 0 ? (
              <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-300">
                Sem dias restantes no plano — faltariam {formatBRL(pararAgora.faltaDepoisDeHoje)} para a meta do mês.
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-emerald-600">A meta do mês já estaria coberta.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">Não é possível calcular o impacto com os dados registrados (sem lançamento hoje).</p>
        )}
      </div>

      {/* ===== Módulos 6/7 — SE EU TRABALHAR MAIS/MENOS · SIMULAÇÃO ===== */}
      {simulacoes.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            E se eu trabalhar… <Pill tom="neutro">SIMULAÇÃO</Pill>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[...mais, ...menos].map((s) => (
              <button
                key={s.horas}
                type="button"
                aria-pressed={simAberta?.horas === s.horas}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${simAberta?.horas === s.horas ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300'}`}
                onClick={() => setSimAberta(simAberta?.horas === s.horas ? null : s)}
              >
                {s.horas > 0 ? `+${s.horas}h` : `${s.horas}h`}
              </button>
            ))}
          </div>
          {simAberta && (
            <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
              <p className="text-neutral-600 dark:text-neutral-300">
                Se você trabalhar {simAberta.horas > 0 ? `+${simAberta.horas}h` : `${simAberta.horas}h`} na taxa de{' '}
                {formatBRL(simAberta.taxaUsada)}/h ({simAberta.origemTaxa === 'historico' ? 'SEU HISTÓRICO' : 'PREMISSA'}), matematicamente:
              </p>
              <Linha
                label={simAberta.ganhoAdicional >= 0 ? 'Ganho adicional estimado' : 'Redução estimada'}
                value={formatBRL(Math.abs(simAberta.ganhoAdicional))}
              />
              <Linha label="Nova falta de hoje" value={formatBRL(simAberta.novaFaltaHoje)} />
              {simAberta.novaMetaRestanteDia != null && (
                <Linha label="Nova média nos dias restantes" value={`${formatBRL(simAberta.novaMetaRestanteDia)}/dia`} />
              )}
              <p className="mt-0.5 text-[10px] text-neutral-400">Simulação — nada é gravado. A escolha é sua.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== Módulo 10 — falta / dias / meta e horas por dia (factual) ===== */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Falta p/ meta</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(Math.max(0, ritmo.metaMensal - ritmo.realizado))}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Dias rest.</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{ritmo.diasRestantesPlanejados}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Meta/dia</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{ritmo.metaRestanteDia != null ? formatBRL(ritmo.metaRestanteDia) : '—'}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Horas/dia</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{horasRestantesMesDia != null ? formatHoras(horasRestantesMesDia) : '—'}</p>
        </div>
      </div>

      {/* ===== Módulo 12 — meta de amanhã ===== */}
      {ritmo.diasRestantesPlanejados > 0 && (hoje.status === 'encerrado' || hoje.realizadoHoje != null) && amanha.rebalanceada != null && (
        <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Meta de amanhã</p>
          <Linha label="Original" value={`${formatBRL(amanha.original)}/dia`} />
          <Linha label="Rebalanceada" value={`${formatBRL(amanha.rebalanceada)}/dia`} />
          <p className="mt-0.5 text-[10px] text-neutral-400">A configuração original não muda — a rebalanceada reflete o mês até aqui.</p>
        </div>
      )}
    </Secao>
  );
}
