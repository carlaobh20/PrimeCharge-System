import { Secao, Linha } from '../ui';
import { formatBRL, type ResumoMensalCompacto } from '../../lib/metas';

// FASE 23 — RESUMO DO MÊS, COMPACTO. Mesmos números do "Custo total do mês" / "Ponto de
// equilíbrio" já existentes (resumoMensalCompacto() só reempacota — sem cálculo novo), agora
// nomeados como FATURADO − GASTOS FIXOS = LÍQUIDO DO MÊS para bater com o novo modelo mental.

export function MesCompactoCard({ resumo }: { resumo: ResumoMensalCompacto }) {
  return (
    <Secao titulo="Este mês">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{formatBRL(resumo.liquidoMes)}</span>
        <span className="text-[11px] text-neutral-500">líquido no mês</span>
      </div>
      <Linha label="Faturado" value={formatBRL(resumo.faturadoMes)} />
      <Linha label="Gastos fixos" value={formatBRL(resumo.gastosFixosMes)} />
      <Linha label="Dias trabalhados / restantes" value={`${resumo.diasTrabalhados} / ${resumo.diasRestantes}`} />
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
        <div className={`h-full rounded-full ${resumo.pctCoberto >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, resumo.pctCoberto)}%` }} />
      </div>
    </Secao>
  );
}
