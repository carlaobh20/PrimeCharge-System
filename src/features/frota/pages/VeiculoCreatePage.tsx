import { useNavigate } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { VeiculoForm } from '../components/VeiculoForm';
import { useCreateVeiculo } from '../hooks/useVeiculos';
import type { VeiculoFormValues } from '../schemas/veiculo.schema';

export function VeiculoCreatePage() {
  const navigate = useNavigate();
  const { data: usuario } = useCurrentUsuario();
  const createVeiculo = useCreateVeiculo();

  function handleSubmit(values: VeiculoFormValues) {
    if (!usuario?.empresa_id) return;
    createVeiculo.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          ...values,
          cor: values.cor ?? null,
          autonomia_km: values.autonomia_km ?? null,
          capacidade_bateria_kwh: values.capacidade_bateria_kwh ?? null,
          data_compra: values.data_compra ?? null,
          valor_compra: values.valor_compra ?? null,
          valor_fipe: values.valor_fipe ?? null,
          valor_mercado: values.valor_mercado ?? null,
          valor_residual_estimado: values.valor_residual_estimado ?? null,
          observacoes: values.observacoes ?? null,
        },
      },
      {
        onSuccess: (veiculo) => navigate(`/veiculos/${veiculo.id}`),
      }
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Novo veículo</h1>
      <p className="mt-1 text-sm text-neutral-500">Cadastro completo do veículo na frota.</p>

      <div className="mt-6 max-w-3xl">
        <VeiculoForm onSubmit={handleSubmit} isSubmitting={createVeiculo.isPending} submitLabel="Cadastrar veículo" />
        {createVeiculo.isError && (
          <p className="mt-3 text-sm text-red-600">
            Erro ao cadastrar veículo: {(createVeiculo.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
