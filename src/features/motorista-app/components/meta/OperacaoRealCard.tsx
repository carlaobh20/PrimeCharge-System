import { useState } from 'react';
import { Secao, Linha, Pill } from '../ui';
import {
  CONFIANCA_LABEL,
  formatBRL,
  formatHoras,
  type ConfiancaDados,
  type Evolucao,
  type GanhoDia,
  type JanelaOperacional,
  type MediaDiaSemana,
  type QualidadeOperacional,
  type ResumoRecargas,
} from '../../lib/metas';

// OPERAÇÃO REAL (Fase 10, Módulos 1–9/11/14/16/17/19) — o que os REGISTROS do motorista dizem,
// sempre separado da PREMISSA e das ESTIMATIVAS (rótulos explícitos). Sem dado → "Dados
// insuficientes"; NUNCA preenchido com estimativa silenciosa. A premissa NUNCA muda sozinha:
// "Usar como nova premissa" é escolha explícita do motorista (Módulo 17).

export function OperacaoRealCard({
  realHora,
  realDia,
  metaDiaria,
  premissaHora,
  eficiencia,
  custoDia,
  custoHoraRealMes,
  janelas,
  tendencia7,
  confianca,
  qualidade,
  evolucao,
  recargasResumo,
  energia,
  equilibrio,
  melhoresDias,
  ganhosJanela,
  onUsarComoPremissa,
  salvandoPremissa,
}: {
  realHora: { valor: number; dias: number; horas: number } | null;
  realDia: { valor: number; dias: number } | null;
  metaDiaria: number;
  premissaHora: number;
  eficiencia: number | null;
  custoDia: number;
  custoHoraRealMes: number | null;
  janelas: Record<7 | 14 | 30 | 90, JanelaOperacional>;
  tendencia7: { metrica: 'rs_hora' | 'rs_dia'; atual: number; anterior: number; variacaoPct: number } | null;
  confianca: ConfiancaDados;
  qualidade: QualidadeOperacional;
  /** Fase 12.2: evolução período × anterior (null = SEM COMPARAÇÃO) */
  evolucao: Record<7 | 14 | 30 | 90, Evolucao>;
  recargasResumo: ResumoRecargas;
  energia: { estimado: number; registrado: number; diferenca: number } | null;
  equilibrio: { estimadoHoras: number | null; observadoHoras: number | null };
  melhoresDias: MediaDiaSemana[];
  ganhosJanela: GanhoDia[];
  onUsarComoPremissa: (valor: number) => void;
  salvandoPremissa: boolean;
}) {
  const [janela, setJanela] = useState<7 | 14 | 30 | 90>(14);
  const j = janelas[janela];
  const ev = evolucao[janela];
  const semDados = qualidade.registrados < 3;

  // Módulo 11 — horas × resultado: dias completos da janela de 14, barras CSS (sem Recharts)
  const diasComHoras = ganhosJanela
    .filter((g) => g.horas != null && g.horas > 0 && g.valor > 0)
    .sort((a, b) => (a.horas as number) - (b.horas as number))
    .slice(0, 8);
  const maxGanho = Math.max(1, ...diasComHoras.map((g) => g.valor));

  return (
    <Secao
      titulo="Sua operação real"
      acao={<Pill tom={confianca === 'relevante' ? 'verde' : confianca === 'insuficiente' ? 'neutro' : 'azul'}>{CONFIANCA_LABEL[confianca]}</Pill>}
    >
      <p className="text-[10px] text-neutral-400">
        Baseado exclusivamente nos seus registros. Classificação pela QUANTIDADE de registros (não é confiança estatística).
      </p>

      {semDados ? (
        <p className="mt-2 text-sm text-neutral-500">
          Dados insuficientes (menos de 3 dias registrados nos últimos 30). Encerre seus dias com ganho e horas — os números
          reais aparecem aqui, sem estimativa silenciosa.
        </p>
      ) : (
        <>
          {/* ===== Módulos 1/3/14/17 — SEU R$/HORA REAL × premissa ===== */}
          {realHora ? (
            <div className="mt-2 rounded-2xl bg-neutral-900 p-4 text-white dark:bg-white/10">
              <p className="text-[10px] uppercase tracking-wide opacity-70">Seu R$/hora real · DADO REGISTRADO</p>
              <p className="text-3xl font-extrabold">{formatBRL(realHora.valor)}<span className="text-sm font-normal opacity-70">/h</span></p>
              <p className="text-[11px] opacity-70">Média dos registros informados — {realHora.dias} dia(s) com ganho e horas ({formatHoras(realHora.horas)}) nos últimos 14 dias.</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-white/10 p-1.5">
                  <p className="opacity-70">PREMISSA</p>
                  <p className="font-bold">{formatBRL(premissaHora)}/h</p>
                </div>
                <div className="rounded-lg bg-white/10 p-1.5">
                  <p className="opacity-70">REGISTRADO</p>
                  <p className="font-bold">{formatBRL(realHora.valor)}/h</p>
                </div>
                <div className="rounded-lg bg-white/10 p-1.5">
                  <p className="opacity-70">DISTÂNCIA</p>
                  <p className="font-bold">{realHora.valor >= premissaHora ? '+' : '−'}{formatBRL(Math.abs(realHora.valor - premissaHora))}/h</p>
                </div>
              </div>
              {eficiencia != null && (
                <p className="mt-1.5 text-center text-[11px] opacity-80">
                  {String(eficiencia).replace('.', ',')}% da premissa — comparação matemática, não é nota.
                </p>
              )}
              {Math.abs(realHora.valor - premissaHora) >= 1 && (
                <button
                  type="button"
                  disabled={salvandoPremissa}
                  className="mt-2 w-full rounded-xl bg-white/15 py-2 text-[12px] font-semibold disabled:opacity-50"
                  onClick={() => onUsarComoPremissa(realHora.valor)}
                >
                  Usar {formatBRL(realHora.valor)}/h como nova premissa
                </button>
              )}
              <p className="mt-1 text-center text-[9px] opacity-60">A premissa nunca muda sozinha — só se você tocar acima.</p>
            </div>
          ) : (
            <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] text-neutral-500 dark:bg-white/5">
              Sem R$/hora real ainda: nenhum dia dos últimos 14 tem ganho E horas lançados juntos.
            </p>
          )}

          {/* ===== Módulo 2 — R$/dia real × meta ===== */}
          {realDia && (
            <div className="mt-2">
              <Linha label="Sua média por dia (registrada)" value={`${formatBRL(realDia.valor)}/dia`} />
              <Linha label="Meta por dia (premissa)" value={`${formatBRL(metaDiaria)}/dia`} />
              <Linha label="Diferença" value={`${realDia.valor >= metaDiaria ? '+' : '−'}${formatBRL(Math.abs(realDia.valor - metaDiaria))}/dia`} />
            </div>
          )}

          {/* ===== Módulos 4/5 — custo por dia e por hora ===== */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-neutral-50 p-2 text-center dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">Custo médio/dia · ESTIMATIVA</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatBRL(custoDia)}</p>
              <p className="text-[9px] text-neutral-400">custo mensal ÷ dias planejados</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2 text-center dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">Custo médio/hora</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{custoHoraRealMes != null ? formatBRL(custoHoraRealMes) : 'SEM HORAS'}</p>
              <p className="text-[9px] text-neutral-400">{custoHoraRealMes != null ? 'custo do período ÷ horas registradas' : 'lance horas para calcular'}</p>
            </div>
          </div>

          {/* ===== Módulo 7 — ponto de equilíbrio duplo ===== */}
          {equilibrio.estimadoHoras != null && (
            <div className="mt-2 rounded-xl border border-neutral-100 p-2.5 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Ponto de equilíbrio do dia</p>
              <div className="mt-1 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-neutral-400">ESTIMADO (premissa)</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatHoras(equilibrio.estimadoHoras)}/dia</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">OBSERVADO (registros)</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {equilibrio.observadoHoras != null ? `${formatHoras(equilibrio.observadoHoras)}/dia` : 'SEM DADO'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== Módulo 8 — janelas 7/14/30 ===== */}
          <div className="mt-3">
            <div className="flex gap-1.5" role="tablist" aria-label="Período">
              {([7, 14, 30, 90] as const).map((n) => (
                <button key={n} type="button" role="tab" aria-selected={janela === n} onClick={() => setJanela(n)} className={`flex-1 rounded-full border py-1.5 text-[12px] font-medium ${janela === n ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-500 dark:border-white/10'}`}>
                  {n} dias
                </button>
              ))}
            </div>
            {j.diasRegistrados === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">Dados insuficientes neste período.</p>
            ) : (
              <div className="mt-2">
                <Linha label="Dias registrados" value={String(j.diasRegistrados)} />
                <Linha label="Dias com horas" value={String(j.diasComHoras)} />
                <Linha label="Ganhos registrados" value={formatBRL(j.ganhoTotal)} />
                <Linha label="Horas registradas" value={j.horasTotal != null ? formatHoras(j.horasTotal) : 'SEM DADO'} />
                <Linha label="R$/dia" value={j.rsDia != null ? formatBRL(j.rsDia) : '—'} />
                <Linha label="R$/hora" value={j.rsHora != null ? formatBRL(j.rsHora) : 'SEM DADO'} />
                <Linha label="Km registrados" value={j.kmTotal != null ? `${j.kmTotal} km${j.kmPorDia != null ? ` (${j.kmPorDia} km/dia)` : ''}` : 'SEM DADO'} />
                <Linha label="R$/km" value={j.rpkm != null ? formatBRL(j.rpkm) : 'SEM DADO'} />
                <Linha label="Corridas · R$/corrida" value={j.corridasTotal != null ? `${j.corridasTotal} · ${j.rpCorrida != null ? formatBRL(j.rpCorrida) : '—'}` : 'SEM DADO'} />
                <Linha label="Recargas registradas" value={j.recargasQtd > 0 ? `${j.recargasQtd} · ${formatBRL(j.custoOperacionalRegistrado)}` : 'NENHUMA'} />
                {j.custoPorKmRegistrado != null && <Linha label="Custo/km registrado" value={`${formatBRL(j.custoPorKmRegistrado)}/km`} />}
                <Linha label="Custo estimado do período" value={formatBRL(j.custoEstimado)} />
                {j.cobertura != null && (
                  <Linha label="Sobra registrada (cobertura)" value={`${j.cobertura >= 0 ? '+' : '−'}${formatBRL(Math.abs(j.cobertura))}`} />
                )}
                <p className="mt-1 text-[9px] text-neutral-400">
                  Custo estimado = custo médio/dia ({formatBRL(custoDia)}) × {j.diasRegistrados} dia(s) registrado(s). Sobra registrada não é lucro contábil.
                </p>
              </div>
            )}

            {/* Fase 12.2 — EVOLUÇÃO: período atual × anterior equivalente */}
            <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Evolução ({janela}d × {janela}d anteriores)</p>
              {ev ? (
                <div className="mt-1 space-y-0.5">
                  {ev.campos.filter((c) => c.variacaoAbs != null && Math.abs(c.variacaoAbs) > 0.005).map((c) => (
                    <p key={c.rotulo} className="text-[12px] text-neutral-600 dark:text-neutral-300">
                      {c.rotulo}: {c.rotulo === 'Horas' ? formatHoras(c.atual ?? 0) : c.rotulo.includes('Km') || c.rotulo === 'Corridas' ? String(c.atual) : formatBRL(c.atual ?? 0)}{' '}
                      <span className={((c.variacaoAbs ?? 0) >= 0) ? 'text-emerald-600' : 'text-amber-600'}>
                        ({(c.variacaoAbs ?? 0) >= 0 ? '+' : '−'}
                        {c.rotulo === 'Horas' ? formatHoras(Math.abs(c.variacaoAbs ?? 0)) : c.rotulo.includes('Km') || c.rotulo === 'Corridas' ? Math.abs(c.variacaoAbs ?? 0) : formatBRL(Math.abs(c.variacaoAbs ?? 0))}
                        {c.variacaoPct != null && ` · ${c.variacaoPct >= 0 ? '+' : '−'}${String(Math.abs(c.variacaoPct)).replace('.', ',')}%`})
                      </span>
                    </p>
                  ))}
                  <p className="text-[9px] text-neutral-400">Variação registrada — comparação matemática, sem causalidade.</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">SEM COMPARAÇÃO — o período anterior não tem registros suficientes (mín. 3 dias de cada lado).</p>
              )}
            </div>

            {/* Fase 12.2 — RECARGAS agregadas + R$/kWh */}
            {recargasResumo.quantidade > 0 && (
              <div className="mt-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Recargas (30 dias) · DADO REGISTRADO</p>
                <Linha label="Recargas" value={String(recargasResumo.quantidade)} />
                <Linha label="Custo total" value={formatBRL(recargasResumo.custoTotal)} />
                {recargasResumo.custoMedio != null && <Linha label="Custo médio" value={formatBRL(recargasResumo.custoMedio)} />}
                <Linha label="kWh total" value={recargasResumo.kwhTotal != null ? `${recargasResumo.kwhTotal} kWh (${recargasResumo.recargasComKwh} recarga(s) com kWh)` : 'NÃO INFORMADO'} />
                {recargasResumo.kwhMedio != null && <Linha label="kWh médio" value={`${recargasResumo.kwhMedio} kWh`} />}
                <Linha label="R$/kWh" value={recargasResumo.rsPorKwh != null ? `${formatBRL(recargasResumo.rsPorKwh)}/kWh` : 'NÃO INFORMADO (exige custo e kWh)'} />
              </div>
            )}

            {/* Fase 12.2 — ENERGIA: estimado × registrado (fontes diferentes) */}
            {energia && (
              <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Energia (30 dias)</p>
                <Linha label="kWh ESTIMADOS (ficha × km)" value={`≈ ${energia.estimado} kWh`} />
                <Linha label="kWh REGISTRADOS (recargas)" value={`${energia.registrado} kWh`} />
                <Linha label="Diferença" value={`${energia.diferenca >= 0 ? '+' : '−'}${Math.abs(energia.diferenca)} kWh`} />
                <p className="mt-0.5 text-[9px] text-neutral-400">Diferença entre fontes de registro — nenhuma delas é "a correta".</p>
              </div>
            )}
          </div>

          {/* ===== Módulo 9 — tendência ===== */}
          {tendencia7 && (
            <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
              Últimos 7 dias: <strong>{formatBRL(tendencia7.atual)}{tendencia7.metrica === 'rs_hora' ? '/h' : '/dia'}</strong> · 7 anteriores:{' '}
              {formatBRL(tendencia7.anterior)}{tendencia7.metrica === 'rs_hora' ? '/h' : '/dia'} · variação{' '}
              <strong>{tendencia7.variacaoPct >= 0 ? '+' : '−'}{String(Math.abs(tendencia7.variacaoPct)).replace('.', ',')}%</strong> — comparação matemática.
            </p>
          )}

          {/* ===== Módulo 10 — médias por dia da semana ===== */}
          {melhoresDias.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Média por dia da semana</p>
              <div className="mt-1 space-y-1">
                {melhoresDias.map((d, i) => (
                  <div key={d.diaSemana} className="flex items-center justify-between text-[12px]">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {d.label} {i === 0 && <span className="text-[10px] text-emerald-600">· maior média registrada</span>}
                    </span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">
                      {formatBRL(d.media)}{d.metrica === 'rs_hora' ? '/h' : '/dia'} <span className="text-[10px] text-neutral-400">({d.observacoes} obs.)</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-0.5 text-[9px] text-neutral-400">Médias dos SEUS registros — não é recomendação de quando trabalhar.</p>
            </div>
          )}

          {/* ===== Módulo 11 — horas × resultado (barras CSS, sem biblioteca) ===== */}
          {diasComHoras.length >= 3 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Horas × resultado (dias completos)</p>
              <div className="mt-1 space-y-1" role="img" aria-label="Comparação de horas trabalhadas e ganho por dia">
                {diasComHoras.map((g) => (
                  <div key={g.data} className="flex items-center gap-2 text-[11px]">
                    <span className="w-10 shrink-0 text-neutral-500">{formatHoras(g.horas as number)}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((g.valor / maxGanho) * 100)}%` }} />
                    </div>
                    <span className="w-16 shrink-0 text-right font-medium text-neutral-700 dark:text-neutral-200">{formatBRL(g.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Qualidade dos registros (F10 + camadas F12.2) — REGISTRADO/INCOMPLETO, sem nota ===== */}
          <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] dark:bg-white/5">
            <p className="font-semibold uppercase tracking-wide text-[11px] text-neutral-400">Qualidade dos seus registros (30 dias)</p>
            <div className="mt-1 grid grid-cols-3 gap-1 text-center">
              {([
                ['com ganho', qualidade.registrados - qualidade.valoresZero],
                ['com horas', qualidade.registrados - qualidade.semHoras - qualidade.valoresZero + qualidade.horasSemGanho],
                ['com km', qualidade.comKm],
                ['com corridas', qualidade.comCorridas],
                ['com recarga', qualidade.comRecarga],
                ['completos', qualidade.completosDiario],
              ] as const).map(([rot, v]) => (
                <div key={rot} className="rounded-lg bg-white/60 p-1 dark:bg-white/5">
                  <p className="text-[13px] font-bold text-neutral-800 dark:text-neutral-100">{v}</p>
                  <p className="text-[9px] text-neutral-400">{rot}</p>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[9px] text-neutral-400">
              {qualidade.registrados} dia(s) registrado(s). "Completo" = ganho + horas + km (início e fim). Sem nota, sem ranking — só REGISTRADO × INCOMPLETO.
            </p>
          </div>
        </>
      )}
    </Secao>
  );
}
