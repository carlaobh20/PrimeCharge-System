import { Card, CardContent } from '@/shared/components/ui/card';
import { formatDataSimples, formatKm, formatMoeda } from '@/shared/lib/format';
import { CONTRATO_PERIODICIDADE_LABEL, type ContratoComRelacoes } from '../../types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-800 dark:text-neutral-200">{value}</dd>
    </div>
  );
}

export function DadosGeraisTab({ contrato }: { contrato: ContratoComRelacoes }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Vigência</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Início" value={formatDataSimples(contrato.data_inicio)} />
            <Field label="Fim previsto" value={formatDataSimples(contrato.data_fim_prevista)} />
            <Field label="Fim real" value={formatDataSimples(contrato.data_fim_real)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Valores</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Periodicidade" value={CONTRATO_PERIODICIDADE_LABEL[contrato.periodicidade]} />
            <Field label="Valor por período" value={formatMoeda(contrato.valor_periodico)} />
            <Field label="Caução" value={formatMoeda(contrato.valor_caucao)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Vistoria</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Km inicial" value={formatKm(contrato.km_inicial)} />
            <Field label="Km final" value={formatKm(contrato.km_final)} />
            <Field label="Carga na entrega" value={contrato.carga_inicial_pct !== null ? `${contrato.carga_inicial_pct}%` : '—'} />
            <Field label="Carga na devolução" value={contrato.carga_final_pct !== null ? `${contrato.carga_final_pct}%` : '—'} />
          </dl>
        </CardContent>
      </Card>

      {contrato.observacoes && (
        <Card className="lg:col-span-3">
          <CardContent className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Observações</h3>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{contrato.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
