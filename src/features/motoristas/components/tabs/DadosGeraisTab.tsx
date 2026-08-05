import { Card, CardContent } from '@/shared/components/ui/card';
import { formatDataSimples } from '@/shared/lib/format';
import type { Motorista } from '../../types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-800 dark:text-neutral-200">{value}</dd>
    </div>
  );
}

export function DadosGeraisTab({ motorista }: { motorista: Motorista }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Identificação</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="CPF" value={motorista.cpf} />
            <Field label="Data de nascimento" value={formatDataSimples(motorista.data_nascimento)} />
            <Field label="E-mail" value={motorista.email ?? '—'} />
            <Field label="Telefone" value={motorista.telefone ?? '—'} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">CNH</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Número" value={motorista.cnh_numero ?? '—'} />
            <Field label="Categoria" value={motorista.cnh_categoria ?? '—'} />
            <Field label="Validade" value={formatDataSimples(motorista.cnh_validade)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Endereço</h3>
          <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
            <Field label="Endereço" value={motorista.endereco ?? '—'} />
            <Field label="Cidade" value={motorista.cidade ?? '—'} />
            <Field label="Estado" value={motorista.estado ?? '—'} />
          </dl>
        </CardContent>
      </Card>

      {motorista.observacoes && (
        <Card className="lg:col-span-3">
          <CardContent className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Observações</h3>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{motorista.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
