import { Card, CardContent } from '@/shared/components/ui/card';
import { formatKm, formatMoeda } from '../../lib/format';
import { TIPO_AQUISICAO_LABEL, VEICULO_CATEGORIA_LABEL } from '../../types';
import type { VeiculoComRelacoes } from '../../types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-800 dark:text-neutral-200">{value}</dd>
    </div>
  );
}

export function DadosGeraisTab({ veiculo }: { veiculo: VeiculoComRelacoes }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Identificação</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Chassi" value={veiculo.chassi} />
            <Field label="RENAVAM" value={veiculo.renavam} />
            <Field label="Cor" value={veiculo.cor ?? '—'} />
            <Field label="Categoria" value={VEICULO_CATEGORIA_LABEL[veiculo.categoria]} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Uso e autonomia</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Quilometragem" value={formatKm(veiculo.quilometragem)} />
            <Field label="Autonomia" value={veiculo.autonomia_km ? `${veiculo.autonomia_km} km` : '—'} />
            <Field label="Bateria" value={veiculo.capacidade_bateria_kwh ? `${veiculo.capacidade_bateria_kwh} kWh` : '—'} />
            <Field label="Aquisição" value={TIPO_AQUISICAO_LABEL[veiculo.tipo_aquisicao]} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Valores</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Compra" value={formatMoeda(veiculo.valor_compra)} />
            <Field label="FIPE" value={formatMoeda(veiculo.valor_fipe)} />
            <Field label="Mercado" value={formatMoeda(veiculo.valor_mercado)} />
            <Field label="Residual estimado" value={formatMoeda(veiculo.valor_residual_estimado)} />
          </dl>
        </CardContent>
      </Card>

      {veiculo.observacoes && (
        <Card className="lg:col-span-3">
          <CardContent className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Observações</h3>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{veiculo.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
