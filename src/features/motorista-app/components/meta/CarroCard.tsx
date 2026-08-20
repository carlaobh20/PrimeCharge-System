import { Secao, Linha, Pill } from '../ui';
import { CATEGORIA_LABEL, formatBRL, formatHoras } from '../../lib/metas';

// SEU CARRO CUSTA (Módulos 10/11/12) — composição por categoria; aluguel vem do CONTRATO
// PrimeCharge com badge (não editável aqui — edição de despesas manuais fica no detalhamento).
// Impacto = % factual sobre o custo total. Vida × Operação separados (Módulo 12).

// Componentes principais que a Fase 10 (Módulo 12) exige nomeados — ausente = "NÃO INFORMADO",
// nunca zero silencioso. combustivel/recarga contam juntos como energia do carro.
const COMPONENTES_ESPERADOS: { rotulo: string; categorias: string[] }[] = [
  { rotulo: 'Combustível/Recarga', categorias: ['combustivel', 'recarga'] },
  { rotulo: 'Manutenção', categorias: ['manutencao'] },
  { rotulo: 'Seguro', categorias: ['seguro_pessoal'] },
  { rotulo: 'Lavagem', categorias: ['lavagem'] },
];

export function CarroCard({
  totalCarro,
  totalGeral,
  aluguelContrato,
  porCategoria,
  custoVida,
  custoOperacao,
  custoDiaCarro,
  custoHoraCarro,
  horasCarroHoje,
  custoOperacionalRegistrado30,
  custoEnergeticoEstimado30,
  custoPorKmRegistrado,
}: {
  totalCarro: number;
  totalGeral: number;
  aluguelContrato: { valorMensal: number; origem: string } | null;
  porCategoria: Record<string, number>;
  custoVida: number;
  custoOperacao: number;
  /** Fase 10 (Módulo 12): carro ÷ dias planejados */
  custoDiaCarro?: number | null;
  /** Fase 10 (Módulo 12): carro mensal ÷ horas previstas no mês (premissa) */
  custoHoraCarro?: number | null;
  /** Fase 11 (Módulo 17): horas para cobrir o custo do carro de hoje (ESTIMATIVA na premissa) */
  horasCarroHoje?: number | null;
  /** Fase 12.1: recargas REGISTRADAS nos últimos 30 dias — ≠ do custo ESTIMADO */
  custoOperacionalRegistrado30?: number | null;
  /** Fase 12.2: custo energético ESTIMADO (km 30d × ficha × R$/kWh registrado) */
  custoEnergeticoEstimado30?: number | null;
  /** Fase 12.2: recargas ÷ km registrados (30d) */
  custoPorKmRegistrado?: number | null;
}) {
  const pctCarro = totalGeral > 0 ? Math.round((totalCarro / totalGeral) * 1000) / 10 : 0;
  const categorias = Object.entries(porCategoria).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const naoInformados = COMPONENTES_ESPERADOS.filter((c) => !c.categorias.some((cat) => (porCategoria[cat] ?? 0) > 0));

  return (
    <Secao titulo="Seu carro custa">
      <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">
        {formatBRL(totalCarro)}<span className="text-sm font-normal text-neutral-400">/mês</span>
      </p>

      <div className="mt-2 space-y-1">
        {aluguelContrato && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Aluguel <Pill tom="verde">IMPORTADO DO CONTRATO</Pill>
              </p>
              <p className="truncate text-[10px] text-neutral-500">{aluguelContrato.origem}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatBRL(aluguelContrato.valorMensal)}</span>
          </div>
        )}
        {categorias.map(([cat, valor]) => (
          <Linha key={cat} label={CATEGORIA_LABEL[cat] ?? cat} value={`${formatBRL(valor)}/mês`} />
        ))}
        {categorias.length === 0 && !aluguelContrato && (
          <p className="text-sm text-neutral-400">Nenhum custo do carro cadastrado ainda.</p>
        )}
        {naoInformados.length > 0 && (totalCarro > 0 || aluguelContrato) && (
          <p className="text-[10px] text-neutral-400">
            {naoInformados.map((c) => c.rotulo).join(' · ')}: NÃO INFORMADO
          </p>
        )}
      </div>

      {/* Fase 10 (Módulo 12) — custo do carro por dia e por hora (premissa declarada) */}
      {(custoDiaCarro != null || custoHoraCarro != null) && totalCarro > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-neutral-50 p-2 text-center dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-wide text-neutral-400">Por dia planejado</p>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{custoDiaCarro != null ? formatBRL(custoDiaCarro) : 'SEM DADO'}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-2 text-center dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-wide text-neutral-400">Por hora (estimado)</p>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{custoHoraCarro != null ? formatBRL(custoHoraCarro) : 'SEM DADO'}</p>
          </div>
        </div>
      )}

      {/* Fase 12.1/12.2 — TRÊS camadas, nunca misturadas: FIXO (contrato) × OPERACIONAL
          REGISTRADO (recargas) × ENERGÉTICO ESTIMADO (ficha × km × R$/kWh) */}
      {custoOperacionalRegistrado30 != null && custoOperacionalRegistrado30 > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
            <p className="text-[9px] uppercase tracking-wide text-neutral-400">FIXO · IMPORTADO</p>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{aluguelContrato ? `${formatBRL(aluguelContrato.valorMensal)}/mês` : 'NÃO INFORMADO'}</p>
            <p className="text-[8px] text-neutral-400">aluguel do contrato</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
            <p className="text-[9px] uppercase tracking-wide text-neutral-400">OPERACIONAL · REGISTRADO</p>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(custoOperacionalRegistrado30)}</p>
            <p className="text-[8px] text-neutral-400">recargas 30d</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
            <p className="text-[9px] uppercase tracking-wide text-neutral-400">ENERGÉTICO · ESTIMADO</p>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{custoEnergeticoEstimado30 != null ? `≈ ${formatBRL(custoEnergeticoEstimado30)}` : 'NÃO INFORMADO'}</p>
            <p className="text-[8px] text-neutral-400">ficha × km × R$/kWh</p>
          </div>
        </div>
      )}
      {custoPorKmRegistrado != null && (
        <p className="mt-1 text-[11px] text-neutral-500">Custo/km registrado (30d): {formatBRL(custoPorKmRegistrado)}/km.</p>
      )}

      {/* Fase 11 (Módulo 17) — cobrir o carro hoje */}
      {custoDiaCarro != null && custoDiaCarro > 0 && horasCarroHoje != null && (
        <p className="mt-1.5 text-[12px] text-neutral-600 dark:text-neutral-300">
          Para cobrir o custo estimado do carro hoje: <strong>{formatBRL(custoDiaCarro)}</strong> ≈{' '}
          <strong>{formatHoras(horasCarroHoje)}</strong> na premissa — ESTIMATIVA.
        </p>
      )}

      {/* Módulo 11 — impacto factual */}
      {totalGeral > 0 && totalCarro > 0 && (
        <>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10" role="img" aria-label={`O carro representa ${pctCarro}% dos custos cadastrados`}>
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pctCarro)}%` }} />
          </div>
          <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-300">
            O carro representa <strong>{String(pctCarro).replace('.', ',')}%</strong> dos custos cadastrados.
          </p>
        </>
      )}

      {/* Módulo 12 — vida × operação */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-2 dark:border-white/10">
        <div className="rounded-xl bg-neutral-50 p-2 text-center dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Custo de vida</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatBRL(custoVida)}</p>
          <p className="text-[10px] text-neutral-400">vida + família</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 text-center dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Custo operacional</p>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatBRL(custoOperacao)}</p>
          <p className="text-[10px] text-neutral-400">carro + trabalho</p>
        </div>
      </div>
    </Secao>
  );
}
