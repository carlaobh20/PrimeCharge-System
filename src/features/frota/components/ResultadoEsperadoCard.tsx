import { formatMoeda } from '@/shared/lib/format';
import type { ResultadoEsperadoAtivo } from '../intelligence/resultadoEsperado';

function Stat({ label, value, destaque, cor }: { label: string; value: string; destaque?: boolean; cor?: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={destaque ? `text-2xl font-bold ${cor ?? 'text-neutral-900 dark:text-neutral-100'}` : `text-lg font-semibold ${cor ?? 'text-neutral-900 dark:text-neutral-100'}`}>
        {value}
      </p>
    </div>
  );
}

// Épico 4 — "Ativo Financeiro", Parte 7. "Card único, sem texto, somente números grandes" —
// literal: 7 números, nenhuma frase explicativa, nenhum texto de recomendação.
export function ResultadoEsperadoCard({ resultado }: { resultado: ResultadoEsperadoAtivo }) {
  const v = (n: number | null) => (n !== null ? formatMoeda(n) : '—');

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Resultado Esperado</h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Valor atual" value={v(resultado.valorAtual)} />
        <Stat label="Saldo devedor" value={formatMoeda(resultado.saldoDevedor)} cor="text-red-600 dark:text-red-400" />
        <Stat label="Patrimônio líquido" value={v(resultado.patrimonioLiquido)} />
        <Stat label="Lucro realizado" value={formatMoeda(resultado.lucroRealizado)} cor="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Lucro projetado até venda" value={v(resultado.lucroProjetadoAteVenda)} cor="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Valor esperado da venda" value={v(resultado.valorEsperadoVenda)} />
      </div>
      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-white/5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Composição do Patrimônio</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Valor de compra" value={v(resultado.valorCompra)} />
          <Stat label="Depreciação" value={v(resultado.depreciacao)} cor={resultado.depreciacao !== null && resultado.depreciacao > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
          <Stat label="Valor FIPE" value={v(resultado.valorFipe)} />
          <Stat label="Valor de mercado" value={v(resultado.valorMercado)} />
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-white/5">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Lucro potencial de venda" value={v(resultado.ganhoDeCapitalEsperado)} cor={resultado.ganhoDeCapitalEsperado !== null && resultado.ganhoDeCapitalEsperado < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
          <Stat label="Resultado total esperado" value={v(resultado.resultadoTotalEsperado)} destaque />
        </div>
      </div>
    </div>
  );
}
