import { Secao, Pill } from '../ui';
import { formatBRL, formatHoras, STATUS_DIA_HOJE_LABEL, type MetaHojeCockpit } from '../../lib/metas';

// COPILOTO CONECTADO À META (Fase 17, Módulo D) — grid de leitura contextual: conecta o Copiloto
// à meta do dia reusando SOMENTE o que useMinhaMeta já deriva de calcularMetaHoje/rebalancear —
// nenhum motor de meta novo aqui. Os insights automáticos (Módulo E da Fase 17, depois evoluídos
// pelo Assistente Contextual da Fase 18 — Módulo K) migraram para `AssistenteContextualCard.tsx`,
// que CONSOME insightsCopiloto() (Módulo F) + este mesmo hojeCockpit — sem duplicar leitura de
// meta nem recalcular nada. Este componente ficou só com a grade de números; a leitura em texto
// corrido é responsabilidade do Assistente.

export function CopilotoInteligenteCard({
  hojeCockpit,
  qtdCorridasHoje,
  somaValorCorridasHoje,
}: {
  hojeCockpit: MetaHojeCockpit;
  qtdCorridasHoje: number;
  somaValorCorridasHoje: number;
}) {
  return (
    <Secao id="secao-meta" titulo="Seu Copiloto">
      {/* Módulo D — Copiloto conectado à Meta (zero motor novo, só leitura do que já existe) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Meta de hoje</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(hojeCockpit.metaHoje)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Realizado</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {hojeCockpit.realizadoHoje != null ? formatBRL(hojeCockpit.realizadoHoje) : 'NÃO INFORMADO'}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Corridas registradas</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{qtdCorridasHoje}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Valor das corridas</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(somaValorCorridasHoje)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Restante</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {hojeCockpit.faltanteHoje != null ? formatBRL(hojeCockpit.faltanteHoje) : 'R$ 0,00'}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Horas necessárias</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {hojeCockpit.horasNecessariasHoje != null ? formatHoras(hojeCockpit.horasNecessariasHoje) : 'SEM DADO'}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[11px] text-neutral-500">Ritmo:</span>
        <Pill tom={hojeCockpit.status === 'acima_ritmo' ? 'verde' : hojeCockpit.status === 'abaixo_ritmo' ? 'ambar' : 'neutro'}>
          {STATUS_DIA_HOJE_LABEL[hojeCockpit.status]}
        </Pill>
      </div>
    </Secao>
  );
}
