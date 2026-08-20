import { Secao, Linha } from '../ui';
import { formatBRL, formatHoras, type Evolucao, type Fechamento } from '../../lib/metas';

// FECHAMENTO DE SEMANA / MÊS (Fase 14, Módulos 17/18) — agregação dos REGISTROS do período
// corrente, dentro do próprio Centro de Controle (sem página nova). Comparação com o período
// anterior só quando há dados suficientes dos dois lados; sem causalidade, sem julgamento.

export function FechamentoCard({
  fechamento,
  evolucao,
  metaMensal,
  realizadoMes,
  periodo,
}: {
  fechamento: Fechamento;
  evolucao?: Evolucao;
  /** só no fechamento do mês */
  metaMensal?: number;
  realizadoMes?: number;
  periodo: 'semana' | 'mes';
}) {
  const f = fechamento;
  const semDados = f.diasRegistrados === 0;

  return (
    <Secao titulo={f.rotulo}>
      {semDados ? (
        <p className="text-sm text-neutral-500">SEM DADO neste período — nenhum dia registrado ainda.</p>
      ) : (
        <>
          {periodo === 'mes' && metaMensal != null && realizadoMes != null && (
            <div className="mb-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
                <p className="text-[9px] uppercase tracking-wide text-neutral-400">Meta</p>
                <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(metaMensal)}</p>
              </div>
              <div className="rounded-xl bg-emerald-600 p-2 text-white">
                <p className="text-[9px] uppercase tracking-wide opacity-80">Realizado</p>
                <p className="text-[13px] font-bold">{formatBRL(realizadoMes)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
                <p className="text-[9px] uppercase tracking-wide text-neutral-400">Falta</p>
                <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(Math.max(0, metaMensal - realizadoMes))}</p>
              </div>
            </div>
          )}

          <Linha label="Dias registrados" value={String(f.diasRegistrados)} />
          <Linha label="Dias encerrados" value={String(f.diasEncerrados)} />
          <Linha label="Ganho registrado" value={formatBRL(f.ganhoTotal)} />
          <Linha label="Horas" value={f.horasTotal != null ? formatHoras(f.horasTotal) : 'SEM DADO'} />
          <Linha label="R$/h" value={f.rsHora != null ? formatBRL(f.rsHora) : 'SEM DADO'} />
          <Linha label="Km" value={f.kmTotal != null ? `${f.kmTotal} km` : 'SEM DADO'} />
          <Linha label="R$/km" value={f.rpkm != null ? formatBRL(f.rpkm) : 'SEM DADO'} />
          <Linha label="Corridas" value={f.corridasTotal != null ? String(f.corridasTotal) : 'SEM DADO'} />
          <Linha label="Recargas" value={f.recargasQtd > 0 ? `${f.recargasQtd} · ${formatBRL(f.custoOperacionalRegistrado)}` : 'NENHUMA'} />
          <Linha label="Custo operacional registrado" value={formatBRL(f.custoOperacionalRegistrado)} />

          {evolucao !== undefined && (
            <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Comparado ao período anterior
              </p>
              {evolucao ? (
                <div className="mt-1 space-y-0.5">
                  {evolucao.campos
                    .filter((c) => c.variacaoAbs != null && Math.abs(c.variacaoAbs) > 0.005)
                    .slice(0, 5)
                    .map((c) => (
                      <p key={c.rotulo} className="text-[12px] text-neutral-600 dark:text-neutral-300">
                        {c.rotulo}:{' '}
                        <span className={(c.variacaoAbs ?? 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                          {(c.variacaoAbs ?? 0) >= 0 ? '+' : '−'}
                          {c.rotulo === 'Horas'
                            ? formatHoras(Math.abs(c.variacaoAbs ?? 0))
                            : c.rotulo.includes('Km') || c.rotulo === 'Corridas'
                              ? Math.abs(c.variacaoAbs ?? 0)
                              : formatBRL(Math.abs(c.variacaoAbs ?? 0))}
                          {c.variacaoPct != null && ` · ${c.variacaoPct >= 0 ? '+' : '−'}${String(Math.abs(c.variacaoPct)).replace('.', ',')}%`}
                        </span>
                      </p>
                    ))}
                  <p className="text-[9px] text-neutral-400">Variação registrada — comparação matemática, sem causalidade.</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">SEM COMPARAÇÃO — o período anterior não tem registros suficientes.</p>
              )}
            </div>
          )}
        </>
      )}
    </Secao>
  );
}
