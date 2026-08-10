import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { PatrimonioEmpresaResult } from '../hooks/usePatrimonioEmpresa';

// Épico 4 — "Ativo Financeiro", Parte 10. Card de composição — 4 parcelas + o total, sem
// texto explicativo. "Evolução mensal" não está aqui (ver comentário em usePatrimonioEmpresa.ts
// sobre por que não existe série histórica real pra desenhar).
export function PatrimonioEmpresaCard({ patrimonio }: { patrimonio: PatrimonioEmpresaResult }) {
  if (patrimonio.isLoading) {
    return <div className="h-40 cockpit-shimmer rounded-2xl" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patrimônio da Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-400">Caixa</p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(patrimonio.caixa)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Veículos</p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(patrimonio.valorVeiculos)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Outros ativos</p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(patrimonio.outrosAtivos)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Saldo devedor</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">−{formatMoeda(patrimonio.saldoDevedorTotal)}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-white/5">
          <p className="text-xs text-neutral-400">Patrimônio líquido</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{formatMoeda(patrimonio.patrimonioLiquido)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
