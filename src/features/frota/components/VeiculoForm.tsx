import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { veiculoSchema, type VeiculoFormInput, type VeiculoFormValues } from '../schemas/veiculo.schema';
import { MarcaModeloFields } from './MarcaModeloFields';
import {
  SISTEMA_AMORTIZACAO_LABEL,
  TIPO_AQUISICAO_LABEL,
  TIPOS_AQUISICAO_COM_FINANCIAMENTO,
  VEICULO_CATEGORIA_LABEL,
  VEICULO_STATUS_LABEL,
} from '../types';

export function VeiculoForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Salvar',
  isEdit = false,
}: {
  defaultValues?: Partial<VeiculoFormInput>;
  onSubmit: (values: VeiculoFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  isEdit?: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VeiculoFormInput, unknown, VeiculoFormValues>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      categoria: 'outro',
      tipo_aquisicao: 'compra_direta',
      status: 'novo',
      quilometragem: 0,
      ...defaultValues,
    },
  });

  const marcaId = watch('marca_id');
  const modeloId = watch('modelo_id');
  const tipoAquisicao = watch('tipo_aquisicao');
  const temFinanciamento = TIPOS_AQUISICAO_COM_FINANCIAMENTO.includes(tipoAquisicao ?? 'compra_direta');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Identificação</h2>

        <MarcaModeloFields
          marcaId={marcaId ?? ''}
          modeloId={modeloId ?? ''}
          onChangeMarca={(id) => setValue('marca_id', id, { shouldValidate: true })}
          onChangeModelo={(id) => setValue('modelo_id', id, { shouldValidate: true })}
          errorMarca={errors.marca_id?.message}
          errorModelo={errors.modelo_id?.message}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label>Ano fabricação *</Label>
            <Input type="number" {...register('ano_fabricacao')} />
            {errors.ano_fabricacao && <p className="mt-1 text-xs text-red-600">{errors.ano_fabricacao.message}</p>}
          </div>
          <div>
            <Label>Ano modelo *</Label>
            <Input type="number" {...register('ano_modelo')} />
            {errors.ano_modelo && <p className="mt-1 text-xs text-red-600">{errors.ano_modelo.message}</p>}
          </div>
          <div>
            <Label>Cor</Label>
            <Input {...register('cor')} />
          </div>
          <div>
            <Label>Categoria *</Label>
            <Select {...register('categoria')}>
              {Object.entries(VEICULO_CATEGORIA_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Chassi *</Label>
            <Input {...register('chassi')} />
            {errors.chassi && <p className="mt-1 text-xs text-red-600">{errors.chassi.message}</p>}
          </div>
          <div>
            <Label>RENAVAM *</Label>
            <Input {...register('renavam')} />
            {errors.renavam && <p className="mt-1 text-xs text-red-600">{errors.renavam.message}</p>}
          </div>
          <div>
            <Label>Placa *</Label>
            <Input {...register('placa')} />
            {errors.placa && <p className="mt-1 text-xs text-red-600">{errors.placa.message}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Aquisição e status</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Tipo de aquisição *</Label>
            <Select {...register('tipo_aquisicao')}>
              {Object.entries(TIPO_AQUISICAO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data de compra</Label>
            <Input type="date" {...register('data_compra')} />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input {...register('fornecedor')} />
          </div>
          <div>
            <Label>Status inicial *</Label>
            <Select {...register('status')} disabled={isEdit}>
              {Object.entries(VEICULO_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {isEdit && (
              <p className="mt-1 text-xs text-neutral-500">Use "Alterar status" na tela de detalhes.</p>
            )}
          </div>
        </div>
      </section>

      {/* Épico 4, Parte 1 (2026-08-10) — só aparece pra formas de aquisição que envolvem
          financiamento de verdade (financiamento/consórcio/leasing). "Parcela inicial"/"Parcela
          atual"/"Quitação prevista" da missão original NÃO viram campo aqui — são calculados a
          partir destes (ver AquisicaoTab.tsx), pra nunca ficarem desatualizados sozinhos. */}
      {temFinanciamento && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Financiamento</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label>Banco</Label>
              <Input {...register('banco')} />
            </div>
            <div>
              <Label>Entrada</Label>
              <Input type="number" step="0.01" {...register('valor_entrada')} />
            </div>
            <div>
              <Label>Valor financiado</Label>
              <Input type="number" step="0.01" {...register('valor_financiado')} />
            </div>
            <div>
              <Label>Taxa (% a.m.)</Label>
              <Input type="number" step="0.001" {...register('taxa_juros_am_pct')} />
            </div>
            <div>
              <Label>Prazo (meses)</Label>
              <Input type="number" {...register('prazo_financiamento_meses')} />
            </div>
            <div>
              <Label>Sistema</Label>
              <Select {...register('sistema_amortizacao')}>
                <option value="">Selecione</option>
                {Object.entries(SISTEMA_AMORTIZACAO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Primeiro vencimento</Label>
              <Input type="date" {...register('primeiro_vencimento_financiamento')} />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Uso e autonomia</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Label>Quilometragem</Label>
            <Input type="number" {...register('quilometragem')} />
          </div>
          <div>
            <Label>Autonomia (km)</Label>
            <Input type="number" {...register('autonomia_km')} />
          </div>
          <div>
            <Label>Capacidade da bateria (kWh)</Label>
            <Input type="number" step="0.1" {...register('capacidade_bateria_kwh')} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Valores</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label>Valor de compra</Label>
            <Input type="number" step="0.01" {...register('valor_compra')} />
          </div>
          <div>
            <Label>Valor FIPE</Label>
            <Input type="number" step="0.01" {...register('valor_fipe')} />
          </div>
          <div>
            <Label>Valor de mercado</Label>
            <Input type="number" step="0.01" {...register('valor_mercado')} />
          </div>
          <div>
            <Label>Valor residual estimado</Label>
            <Input type="number" step="0.01" {...register('valor_residual_estimado')} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <Label>Observações</Label>
        <Textarea rows={4} {...register('observacoes')} />
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
