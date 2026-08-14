import { useNavigate, useParams } from 'react-router-dom';
import { ContratoForm } from '../components/ContratoForm';
import { useContrato, useUpdateContrato } from '../hooks/useContratos';
import type { ContratoFormValues } from '../schemas/contrato.schema';

export function ContratoEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contrato, isLoading } = useContrato(id);
  const updateContrato = useUpdateContrato();

  function handleSubmit(values: ContratoFormValues) {
    if (!id) return;
    updateContrato.mutate(
      {
        id,
        payload: {
          veiculo_id: values.veiculo_id,
          motorista_id: values.motorista_id,
          data_inicio: values.data_inicio,
          data_fim_prevista: values.data_fim_prevista ?? null,
          periodicidade: values.periodicidade,
          valor_periodico: values.valor_periodico,
          valor_caucao: values.valor_caucao ?? null,
          km_inicial: values.km_inicial ?? null,
          carga_inicial_pct: values.carga_inicial_pct ?? null,
          observacoes: values.observacoes ?? null,
          dia_vencimento: values.dia_vencimento ?? null,
          data_reajuste: values.data_reajuste ?? null,
          indice_reajuste: values.indice_reajuste ?? null,
          forma_pagamento: values.forma_pagamento ?? null,
          tipo_garantia: values.tipo_garantia ?? null,
          percentual_multa_atraso: values.percentual_multa_atraso ?? null,
          percentual_juros_atraso: values.percentual_juros_atraso ?? null,
        },
      },
      { onSuccess: () => navigate(`/contratos/${id}`) }
    );
  }

  if (isLoading || !contrato) {
    return <div className="p-8 text-sm text-neutral-500">Carregando…</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Editar contrato</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Contrato {contrato.veiculo?.placa ?? '—'} · {contrato.motorista?.nome_completo ?? '—'}
      </p>

      <div className="mt-6 max-w-3xl">
        <ContratoForm
          isEdit
          defaultValues={{
            veiculo_id: contrato.veiculo_id,
            motorista_id: contrato.motorista_id,
            data_inicio: contrato.data_inicio,
            data_fim_prevista: contrato.data_fim_prevista ?? '',
            periodicidade: contrato.periodicidade,
            valor_periodico: contrato.valor_periodico,
            valor_caucao: contrato.valor_caucao ?? undefined,
            km_inicial: contrato.km_inicial ?? undefined,
            carga_inicial_pct: contrato.carga_inicial_pct ?? undefined,
            observacoes: contrato.observacoes ?? '',
            dia_vencimento: contrato.dia_vencimento ?? undefined,
            data_reajuste: contrato.data_reajuste ?? '',
            indice_reajuste: contrato.indice_reajuste ?? '',
            forma_pagamento: contrato.forma_pagamento ?? undefined,
            tipo_garantia: contrato.tipo_garantia ?? undefined,
            percentual_multa_atraso: contrato.percentual_multa_atraso ?? undefined,
            percentual_juros_atraso: contrato.percentual_juros_atraso ?? undefined,
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateContrato.isPending}
          submitLabel="Salvar alterações"
        />
        {updateContrato.isError && (
          <p className="mt-3 text-sm text-red-600">Erro ao salvar: {(updateContrato.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
