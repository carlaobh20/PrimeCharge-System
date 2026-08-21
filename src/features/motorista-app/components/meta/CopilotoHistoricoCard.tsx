import { useState } from 'react';
import { Secao, Pill, Linha } from '../ui';
import {
  CLASSIFICACAO_AMOSTRA_LABEL,
  formatBRL,
  type ClassificacaoAmostra,
  type ComparacaoPeriodoCorridas,
  type PeriodoCorridas,
  type QualidadeBaseCopiloto,
  type ResumoDiaSemanaCorridas,
  type ResumoFaixaHorario,
} from '../../lib/metas';

// COPILOTO — HISTÓRICO E QUALIDADE (Fase 17, Módulos A/B/C/G) — histórico de corridas por
// período, por faixa de horário e por dia da semana, e qualidade descritiva da base. Tudo
// derivado exclusivamente de motorista_corridas (0049), zero query nova, zero migration.
// Nunca usa "melhor horário/dia" — sempre "maior média REGISTRADA", com o dado base ao lado.
// (O card contextual "Seu Copiloto", Módulos D/E, fica em CopilotoInteligenteCard.tsx.)

const TOM_AMOSTRA: Record<ClassificacaoAmostra, 'verde' | 'ambar' | 'vermelho' | 'neutro' | 'azul'> = {
  dados_insuficientes: 'neutro',
  base_inicial: 'ambar',
  base_consistente: 'azul',
  base_relevante: 'verde',
};

// ---------------------------------------------------------------------------
// Módulo A — Histórico Inteligente de Corridas (7/14/30/90d + comparação)
// ---------------------------------------------------------------------------
export function HistoricoCorridasCard({ historicoPeriodos }: { historicoPeriodos: Record<PeriodoCorridas, ComparacaoPeriodoCorridas> }) {
  const [periodo, setPeriodo] = useState<PeriodoCorridas>(30);
  const comp = historicoPeriodos[periodo];
  const { atual } = comp;

  return (
    <Secao titulo="Histórico de corridas">
      <div className="flex gap-1.5" role="tablist" aria-label="Período do histórico de corridas">
        {([7, 14, 30, 90] as const).map((n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={periodo === n}
            onClick={() => setPeriodo(n)}
            className={`flex-1 rounded-full border py-1.5 text-[12px] font-medium ${periodo === n ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-500 dark:border-white/10'}`}
          >
            {n}d
          </button>
        ))}
      </div>

      {atual.qtdCorridas === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">SEM DADO neste período — registre corridas no Copiloto para começar o histórico.</p>
      ) : (
        <div className="mt-2 space-y-0.5">
          <Linha label="Corridas registradas" value={atual.qtdCorridas} />
          <Linha label="Valor total" value={formatBRL(atual.valorTotal)} />
          <Linha label="Valor médio/corrida" value={atual.valorMedioPorCorrida != null ? formatBRL(atual.valorMedioPorCorrida) : 'SEM DADO'} />
          <Linha label="R$/h (estimado)" value={atual.rpHora != null ? `${formatBRL(atual.rpHora)}/h` : 'SEM DADO'} />
          <Linha label="R$/km (estimado)" value={atual.rpKm != null ? `${formatBRL(atual.rpKm)}/km` : 'SEM DADO'} />
          <Linha label="Km total (estimado)" value={atual.kmEstimadoTotal != null ? `${atual.kmEstimadoTotal} km` : 'SEM DADO'} />
          <Linha label="Duração total (estimada)" value={atual.duracaoTotalMin != null ? `${atual.duracaoTotalMin} min` : 'SEM DADO'} />
          <Linha label="Duração média/corrida" value={atual.duracaoMediaMin != null ? `${atual.duracaoMediaMin} min` : 'SEM DADO'} />
          <Linha label="Dias com registro" value={atual.diasComRegistro} />
          <Linha
            label="Média de corridas/dia"
            value={atual.mediaCorridasPorDiaComRegistro != null ? atual.mediaCorridasPorDiaComRegistro : 'SEM DADO'}
          />

          {atual.distribuicaoPorApp.length > 0 && (
            <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Por app</p>
              {atual.distribuicaoPorApp.map((a) => (
                <p key={a.app} className="text-[12px] text-neutral-600 dark:text-neutral-300">
                  {a.app} · {a.qtd} corrida{a.qtd > 1 ? 's' : ''} · {formatBRL(a.valorTotal)}
                </p>
              ))}
            </div>
          )}

          <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Vs. período anterior de {periodo}d</p>
            {comp.anterior == null || comp.campos == null ? (
              <p className="mt-1 text-[12px] text-neutral-500">SEM COMPARAÇÃO — não há corridas suficientes no período anterior.</p>
            ) : (
              comp.campos.map((c) => (
                <p key={c.rotulo} className="text-[12px] text-neutral-600 dark:text-neutral-300">
                  {c.rotulo}: {c.variacaoPct != null ? `${c.variacaoPct >= 0 ? '+' : ''}${c.variacaoPct}%` : 'SEM COMPARAÇÃO'}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------------------
// Módulos B/C — Inteligência por Horário e por Dia da Semana
// ---------------------------------------------------------------------------
export function PadraoHorarioDiaCard({
  porHorarioCorridas,
  porDiaSemanaCorridas,
}: {
  porHorarioCorridas: ResumoFaixaHorario[];
  porDiaSemanaCorridas: ResumoDiaSemanaCorridas[];
}) {
  const [aba, setAba] = useState<'horario' | 'dia_semana'>('horario');
  const linhasHorario = porHorarioCorridas;
  const linhasDia = porDiaSemanaCorridas;
  const vazio = aba === 'horario' ? linhasHorario.length === 0 : linhasDia.length === 0;

  return (
    <Secao titulo="Padrões registrados">
      <div className="flex gap-1.5" role="tablist" aria-label="Padrão por horário ou por dia da semana">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'horario'}
          onClick={() => setAba('horario')}
          className={`flex-1 rounded-full border py-1.5 text-[12px] font-medium ${aba === 'horario' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-500 dark:border-white/10'}`}
        >
          Por horário
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'dia_semana'}
          onClick={() => setAba('dia_semana')}
          className={`flex-1 rounded-full border py-1.5 text-[12px] font-medium ${aba === 'dia_semana' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-500 dark:border-white/10'}`}
        >
          Por dia da semana
        </button>
      </div>

      <p className="mt-2 text-[11px] text-neutral-500">
        Maiores médias REGISTRADAS — leitura do que já aconteceu, não uma indicação de quando trabalhar.
      </p>

      {vazio ? (
        <p className="mt-2 text-sm text-neutral-500">
          {aba === 'horario' ? 'SEM DADO — registre o horário das corridas para ver este padrão.' : 'SEM DADO por dia da semana ainda.'}
        </p>
      ) : aba === 'horario' ? (
        <div className="mt-2 space-y-1.5">
          {linhasHorario.map((l) => (
            <div key={l.label} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
              <div>
                <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">{l.label}</p>
                <p className="text-[11px] text-neutral-500">
                  {l.qtdCorridas} corrida{l.qtdCorridas > 1 ? 's' : ''} · {l.diasObservados} dia{l.diasObservados > 1 ? 's' : ''}
                  {l.rpHora != null && ` · ${formatBRL(l.rpHora)}/h`}
                  {l.rpKm != null && ` · ${formatBRL(l.rpKm)}/km`}
                  {' · '}
                  {formatBRL(l.valorTotal)} no total
                </p>
              </div>
              <Pill tom={TOM_AMOSTRA[l.classificacaoAmostra]}>{CLASSIFICACAO_AMOSTRA_LABEL[l.classificacaoAmostra]}</Pill>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {linhasDia.map((l) => (
            <div key={l.label} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
              <div>
                <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">{l.label}</p>
                <p className="text-[11px] text-neutral-500">
                  {l.qtdCorridas} corrida{l.qtdCorridas > 1 ? 's' : ''} · {l.diasObservados} dia{l.diasObservados > 1 ? 's' : ''}
                  {l.rpHora != null && ` · ${formatBRL(l.rpHora)}/h`}
                  {l.rpKm != null && ` · ${formatBRL(l.rpKm)}/km`}
                  {l.duracaoMediaMin != null && ` · ${l.duracaoMediaMin}min/corrida`}
                  {' · '}
                  {formatBRL(l.valorTotal)} no total
                </p>
              </div>
              <Pill tom={TOM_AMOSTRA[l.classificacaoAmostra]}>{CLASSIFICACAO_AMOSTRA_LABEL[l.classificacaoAmostra]}</Pill>
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------------------
// Módulo G — Qualidade da Base (descritivo, nunca julga)
// ---------------------------------------------------------------------------
export function QualidadeBaseCopilotoCard({ qualidadeBaseCorridas }: { qualidadeBaseCorridas: QualidadeBaseCopiloto }) {
  const q = qualidadeBaseCorridas;
  if (q.totalCorridas === 0) {
    return (
      <Secao titulo="Qualidade da sua base">
        <p className="text-sm text-neutral-500">SEM DADO — nenhuma corrida registrada nos últimos 90 dias.</p>
      </Secao>
    );
  }
  return (
    <Secao titulo="Qualidade da sua base" acao={<Pill tom={TOM_AMOSTRA[q.classificacaoAmostra]}>{CLASSIFICACAO_AMOSTRA_LABEL[q.classificacaoAmostra]}</Pill>}>
      <p className="text-[11px] text-neutral-500">
        Descrição do que está preenchido nas suas corridas — não é uma nota, é só um retrato do que você tem registrado.
      </p>
      <div className="mt-2 space-y-0.5">
        <Linha label="Total de corridas (90d)" value={q.totalCorridas} />
        <Linha label="Com km estimado" value={`${q.comKm} de ${q.totalCorridas}`} />
        <Linha label="Com duração estimada" value={`${q.comDuracao} de ${q.totalCorridas}`} />
        <Linha label="Com horário" value={`${q.comHorario} de ${q.totalCorridas}`} />
        <Linha label="Com app informado" value={`${q.comApp} de ${q.totalCorridas}`} />
        <Linha label="Dias com registro" value={q.diasComRegistro} />
        <Linha label="Faixas de horário com dados" value={`${q.faixasHorarioComDados} de 7`} />
        <Linha label="Dias da semana com dados" value={`${q.diasSemanaComDados} de 7`} />
      </div>
      {(q.semKm > 0 || q.semDuracao > 0) && (
        <p className="mt-2 text-[11px] text-neutral-500">
          Preencher km e duração nas próximas corridas melhora a precisão do R$/km e R$/h nos seus históricos.
        </p>
      )}
      {q.faixasHorarioComDados < 7 && (
        <p className="mt-1 text-[11px] text-neutral-500">
          Para comparar todas as faixas de horário, são necessários mais registros com horário informado ({7 - q.faixasHorarioComDados} faixa(s) ainda sem nenhum dado).
        </p>
      )}
      {q.diasSemanaComDados < 7 && (
        <p className="mt-1 text-[11px] text-neutral-500">
          Para comparar todos os dias da semana, são necessários mais registros ({7 - q.diasSemanaComDados} dia(s) da semana ainda sem nenhum dado).
        </p>
      )}
    </Secao>
  );
}
