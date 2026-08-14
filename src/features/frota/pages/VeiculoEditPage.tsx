import { useNavigate, useParams } from 'react-router-dom';
import { VeiculoForm } from '../components/VeiculoForm';
import { useUpdateVeiculo, useVeiculo } from '../hooks/useVeiculos';
import type { VeiculoFormValues } from '../schemas/veiculo.schema';

export function VeiculoEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: veiculo, isLoading } = useVeiculo(id);
  const updateVeiculo = useUpdateVeiculo();

  function handleSubmit(values: VeiculoFormValues) {
    if (!id) return;
    updateVeiculo.mutate(
      {
        id,
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
          fornecedor: values.fornecedor ?? null,
          banco: values.banco ?? null,
          valor_entrada: values.valor_entrada ?? null,
          valor_financiado: values.valor_financiado ?? null,
          taxa_juros_am_pct: values.taxa_juros_am_pct ?? null,
          prazo_financiamento_meses: values.prazo_financiamento_meses ?? null,
          sistema_amortizacao: values.sistema_amortizacao ?? null,
          primeiro_vencimento_financiamento: values.primeiro_vencimento_financiamento ?? null,
        },
      },
      { onSuccess: () => navigate(`/veiculos/${id}`) }
    );
  }

  if (isLoading || !veiculo) {
    return <div className="p-8 text-sm text-neutral-500">Carregando…</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Editar veículo</h1>
      <p className="mt-1 text-sm text-neutral-500">{veiculo.placa}</p>

      <div className="mt-6 max-w-3xl">
        <VeiculoForm
          isEdit
          defaultValues={{
            marca_id: veiculo.marca_id,
            modelo_id: veiculo.modelo_id,
            ano_fabricacao: veiculo.ano_fabricacao,
            ano_modelo: veiculo.ano_modelo,
            chassi: veiculo.chassi,
            renavam: veiculo.renavam,
            placa: veiculo.placa,
            cor: veiculo.cor ?? '',
            categoria: veiculo.categoria,
            tipo_aquisicao: veiculo.tipo_aquisicao,
            status: veiculo.status,
            quilometragem: veiculo.quilometragem,
            autonomia_km: veiculo.autonomia_km ?? undefined,
            capacidade_bateria_kwh: veiculo.capacidade_bateria_kwh ?? undefined,
            data_compra: veiculo.data_compra ?? '',
            valor_compra: veiculo.valor_compra ?? undefined,
            valor_fipe: veiculo.valor_fipe ?? undefined,
            valor_mercado: veiculo.valor_mercado ?? undefined,
            valor_residual_estimado: veiculo.valor_residual_estimado ?? undefined,
            observacoes: veiculo.observacoes ?? '',
            fornecedor: veiculo.fornecedor ?? '',
            banco: veiculo.banco ?? '',
            valor_entrada: veiculo.valor_entrada ?? undefined,
            valor_financiado: veiculo.valor_financiado ?? undefined,
            taxa_juros_am_pct: veiculo.taxa_juros_am_pct ?? undefined,
            prazo_financiamento_meses: veiculo.prazo_financiamento_meses ?? undefined,
            sistema_amortizacao: veiculo.sistema_amortizacao ?? undefined,
            primeiro_vencimento_financiamento: veiculo.primeiro_vencimento_financiamento ?? '',
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateVeiculo.isPending}
          submitLabel="Salvar alterações"
        />
        {updateVeiculo.isError && (
          <p className="mt-3 text-sm text-red-600">
            Erro ao salvar: {(updateVeiculo.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
