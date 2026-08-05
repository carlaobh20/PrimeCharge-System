import { Gauge } from 'lucide-react';
import type { FleetHealthSummary } from '../engine/fleetHealthEngine';

// Cobre "Resumo da Frota" e "Health Médio da Empresa" no mesmo bloco visual — são a mesma
// informação (quantos veículos, quantos avaliados, qual a média), então virou um bloco só
// em vez de dois quase-idênticos lado a lado (decisão registrada em DEC-024).
export function ResumoFrotaWidget({ resumo }: { resumo: FleetHealthSummary }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Gauge className="h-3.5 w-3.5" />
        Resumo da Frota
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{resumo.totalVeiculos}</p>
          <p className="text-[11px] text-neutral-400">veículos na frota</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {resumo.healthMedio ?? '—'}
          </p>
          <p className="text-[11px] text-neutral-400">
            health médio ({resumo.veiculosAvaliados} de {resumo.totalVeiculos} avaliados)
          </p>
        </div>
      </div>
    </div>
  );
}
