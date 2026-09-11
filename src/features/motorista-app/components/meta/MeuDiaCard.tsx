import { Secao, Linha, Pill } from '../ui';
import { formatBRL, formatHoras, type JanelaOperacional, type ResumoDiaOperacional } from '../../lib/metas';

// MEU DIA (Fase 12.1 — "SEU DIA") — o dia REGISTRADO em números: ganho, horas, R$/h, km,
// R$/km, corridas, R$/corrida (só com corridas > 0), recargas e RESULTADO OPERACIONAL
// (ganho − custos operacionais REGISTRADOS do dia; aluguel/vida ficam na camada de Meta).
// kWh REGISTRADO ≠ kWh ESTIMADO (ficha do veículo) — nunca misturados.

export function MeuDiaCard({
  resumo,
  janelas,
  comparacaoOdometro,
}: {
  resumo: ResumoDiaOperacional;
  janelas: Record<7 | 14 | 30, JanelaOperacional>;
  comparacaoOdometro: { registrado: number; dataRegistro: string; vistoria: number; dataVistoria: string; diferenca: number } | null;
}) {
  const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return (
    <Secao titulo="Meu dia" acao={<Pill tom="verde">DADO REGISTRADO</Pill>}>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Ganho</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(resumo.ganho)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Horas</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{resumo.horas != null ? formatHoras(resumo.horas) : 'NÃO INF.'}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">R$/h</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{resumo.rph != null ? formatBRL(resumo.rph) : 'NÃO INF.'}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Km</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {resumo.kmRodados != null ? `${resumo.kmRodados} km` : resumo.kmIncompleto ? 'KM INCOMPLETO' : 'NÃO INF.'}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">R$/km</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{resumo.rpkm != null ? formatBRL(resumo.rpkm) : 'NÃO INF.'}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Corridas · R$/corrida</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {resumo.corridas != null ? `${resumo.corridas} · ${resumo.rpCorrida != null ? formatBRL(resumo.rpCorrida) : '—'}` : 'NÃO INFORMADO'}
          </p>
        </div>
      </div>

      {resumo.apps.length > 0 && (
        <p className="mt-1.5 text-[11px] text-neutral-500">Apps do dia: {resumo.apps.join(', ')}</p>
      )}

      {/* Resultado operacional REGISTRADO */}
      <div className="mt-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
        <Linha label="Custos de recarga registrados hoje" value={formatBRL(resumo.custoRecargasDia)} />
        <Linha
          label="Resultado operacional registrado"
          value={`${resumo.resultadoOperacional >= 0 ? '+' : '−'}${formatBRL(Math.abs(resumo.resultadoOperacional))}`}
        />
        <p className="mt-0.5 text-[9px] text-neutral-400">
          Ganho − custos operacionais REGISTRADOS do dia. Aluguel e custos de vida ficam na Meta mensal — são camadas separadas.
        </p>
      </div>

      {/* kWh registrado × estimado — nunca misturados */}
      {(resumo.kwhRegistradoDia != null || resumo.consumoEstimadoKwh != null) && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
            <p className="text-[9px] uppercase tracking-wide text-neutral-400">kWh REGISTRADO (recargas)</p>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{resumo.kwhRegistradoDia != null ? `${resumo.kwhRegistradoDia} kWh` : 'NÃO INFORMADO'}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
            <p className="text-[9px] uppercase tracking-wide text-neutral-400">kWh ESTIMADO (ficha × km)</p>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{resumo.consumoEstimadoKwh != null ? `≈ ${resumo.consumoEstimadoKwh} kWh` : 'NÃO INFORMADO'}</p>
          </div>
        </div>
      )}
      {resumo.custoPorKm != null && (
        <p className="mt-1 text-[11px] text-neutral-500">Custo por km registrado: {formatBRL(resumo.custoPorKm)}/km (recargas ÷ km do dia).</p>
      )}

      {/* Comparação hoje × médias (reusa janelas + confiança da Fase 10) */}
      {resumo.rph != null && (
        <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Hoje × suas médias</p>
          <div className="mt-1 grid grid-cols-4 gap-1 text-center">
            {([['Hoje', resumo.rph], ['7d', janelas[7].rsHora], ['14d', janelas[14].rsHora], ['30d', janelas[30].rsHora]] as const).map(([rot, v]) => (
              <div key={rot}>
                <p className="text-[9px] uppercase text-neutral-400">{rot}</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-100">{v != null ? formatBRL(v) : '—'}</p>
              </div>
            ))}
          </div>
          <p className="mt-0.5 text-[9px] text-neutral-400">R$/h — médias só aparecem quando há registros no período (sem dado = —).</p>
        </div>
      )}

      {/* Comparação com dado do RodaVolt — fontes diferentes, nunca "erro", nunca sincroniza */}
      {comparacaoOdometro && (
        <div className="mt-2 rounded-xl border border-neutral-100 px-3 py-2 text-[12px] dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Comparação com dado do RodaVolt</p>
          <Linha label={`Seu registro (${fmt(comparacaoOdometro.dataRegistro)})`} value={`${comparacaoOdometro.registrado} km`} />
          <Linha label={`Última vistoria (${fmt(comparacaoOdometro.dataVistoria)}) · IMPORTADO`} value={`${comparacaoOdometro.vistoria} km`} />
          <Linha label="Diferença" value={`${comparacaoOdometro.diferenca >= 0 ? '+' : '−'}${Math.abs(comparacaoOdometro.diferenca)} km`} />
          <p className="mt-0.5 text-[9px] text-neutral-400">Os valores foram registrados em fontes diferentes.</p>
        </div>
      )}
    </Secao>
  );
}
