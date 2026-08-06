import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { VeiculoForm } from '../components/VeiculoForm';
import { useCreateVeiculo } from '../hooks/useVeiculos';
import type { VeiculoFormInput, VeiculoFormValues } from '../schemas/veiculo.schema';

// "Duplicar veículo" (Command Action do Cockpit, Sprint 2) navega pra cá com os campos
// não-únicos pré-preenchidos via router state — chassi/RENAVAM/placa/status ficam em branco
// de propósito, são únicos por empresa e o usuário precisa informar os do veículo novo.
type DuplicarState = { defaultValues?: Partial<VeiculoFormInput>; origemPlaca?: string };

export function VeiculoCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { defaultValues, origemPlaca } = (location.state as DuplicarState | null) ?? {};
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
          // Só preenchidos pelo fluxo de venda (VenderVeiculoDialog, Missão 4) — nunca no
          // cadastro inicial.
          comprador: null,
          valor_venda: null,
          data_venda: null,
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
      <p className="mt-1 text-sm text-neutral-500">
        {origemPlaca ? `Duplicando dados de ${origemPlaca} — confira e preencha chassi, RENAVAM e placa novos.` : 'Cadastro completo do veículo na frota.'}
      </p>

      <div className="mt-6 max-w-3xl">
        <VeiculoForm
          onSubmit={handleSubmit}
          isSubmitting={createVeiculo.isPending}
          submitLabel="Cadastrar veículo"
          defaultValues={defaultValues}
        />
        {createVeiculo.isError && (
          <p className="mt-3 text-sm text-red-600">
            Erro ao cadastrar veículo: {(createVeiculo.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
