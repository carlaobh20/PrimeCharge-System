import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { ContratoForm } from '../components/ContratoForm';
import { useCreateContrato } from '../hooks/useContratos';
import type { ContratoFormInput, ContratoFormValues } from '../schemas/contrato.schema';

// Landing page dos links "Novo contrato" a partir do Cockpit de Veículo/Motorista — por isso
// lê veiculoId/motoristaId da query string pra pré-preencher o ContratoForm em vez de forçar o
// usuário a procurar de novo o veículo/motorista que ele já estava olhando.
export function ContratoCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: usuario } = useCurrentUsuario();
  const createContrato = useCreateContrato();

  const defaultValues: Partial<ContratoFormInput> = {
    veiculo_id: searchParams.get('veiculoId') ?? undefined,
    motorista_id: searchParams.get('motoristaId') ?? undefined,
  };

  function handleSubmit(values: ContratoFormValues) {
    if (!usuario?.empresa_id) return;
    createContrato.mutate(
      {
        empresaId: usuario.empresa_id,
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
      {
        onSuccess: (contrato) => navigate(`/contratos/${contrato.id}`),
      }
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Novo contrato</h1>
      <p className="mt-1 text-sm text-neutral-500">Locação entre a PrimeCharge, o veículo e o motorista.</p>

      <div className="mt-6 max-w-3xl">
        <ContratoForm defaultValues={defaultValues} onSubmit={handleSubmit} isSubmitting={createContrato.isPending} submitLabel="Cadastrar contrato" />
        {createContrato.isError && (
          <p className="mt-3 text-sm text-red-600">Erro ao cadastrar contrato: {(createContrato.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
