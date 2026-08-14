import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { contratoSchema, type ContratoFormInput, type ContratoFormValues } from '../schemas/contrato.schema';
import { CONTRATO_PERIODICIDADE_LABEL, CONTRATO_FORMA_PAGAMENTO_LABEL, CONTRATO_TIPO_GARANTIA_LABEL } from '../types';

export function ContratoForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Salvar',
  isEdit = false,
}: {
  defaultValues?: Partial<ContratoFormInput>;
  onSubmit: (values: ContratoFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  isEdit?: boolean;
}) {
  // Só veículos disponíveis/reservados entram como opção de um novo contrato — alugar um
  // veículo já alugado violaria a regra de negócio que a migration já impõe (um contrato
  // "ativo" por veículo). Na edição, mantém a lista completa: o veículo já vinculado pode
  // estar "alugado" por causa deste próprio contrato.
  const { data: veiculos } = useVeiculos(isEdit ? undefined : { status: 'disponivel' });
  const { data: veiculosReservados } = useVeiculos(isEdit ? undefined : { status: 'reservado' });
  const { data: motoristas } = useMotoristas();

  const opcoesVeiculo = isEdit ? veiculos ?? [] : [...(veiculos ?? []), ...(veiculosReservados ?? [])];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContratoFormInput, unknown, ContratoFormValues>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      periodicidade: 'mensal',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Partes do contrato</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Veículo *</Label>
            <Select {...register('veiculo_id')} disabled={isEdit}>
              <option value="">Selecione um veículo…</option>
              {opcoesVeiculo.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa}
                </option>
              ))}
            </Select>
            {errors.veiculo_id && <p className="mt-1 text-xs text-red-600">{errors.veiculo_id.message}</p>}
            {isEdit && <p className="mt-1 text-xs text-neutral-500">Veículo não pode ser trocado após a criação.</p>}
          </div>
          <div>
            <Label>Motorista *</Label>
            <Select {...register('motorista_id')} disabled={isEdit}>
              <option value="">Selecione um motorista…</option>
              {motoristas?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome_completo}
                </option>
              ))}
            </Select>
            {errors.motorista_id && <p className="mt-1 text-xs text-red-600">{errors.motorista_id.message}</p>}
            {isEdit && <p className="mt-1 text-xs text-neutral-500">Motorista não pode ser trocado após a criação.</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Vigência e valores</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Data de início *</Label>
            <Input type="date" {...register('data_inicio')} />
            {errors.data_inicio && <p className="mt-1 text-xs text-red-600">{errors.data_inicio.message}</p>}
          </div>
          <div>
            <Label>Data de fim prevista</Label>
            <Input type="date" {...register('data_fim_prevista')} />
          </div>
          <div>
            <Label>Periodicidade *</Label>
            <Select {...register('periodicidade')}>
              {Object.entries(CONTRATO_PERIODICIDADE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Valor por período (R$) *</Label>
            <Input type="number" step="0.01" min="0" {...register('valor_periodico')} />
            {errors.valor_periodico && <p className="mt-1 text-xs text-red-600">{errors.valor_periodico.message}</p>}
          </div>
          <div>
            <Label>Caução (R$)</Label>
            <Input type="number" step="0.01" min="0" {...register('valor_caucao')} />
          </div>
          <div>
            <Label>Dia de vencimento</Label>
            <Input type="number" min="1" max="31" {...register('dia_vencimento')} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Financeiro</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Forma de pagamento</Label>
            <Select {...register('forma_pagamento')}>
              <option value="">Selecione…</option>
              {Object.entries(CONTRATO_FORMA_PAGAMENTO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Garantia</Label>
            <Select {...register('tipo_garantia')}>
              <option value="">Selecione…</option>
              {Object.entries(CONTRATO_TIPO_GARANTIA_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data de reajuste</Label>
            <Input type="date" {...register('data_reajuste')} />
          </div>
          <div>
            <Label>Índice de reajuste</Label>
            <Input type="text" placeholder="Ex.: IGPM" {...register('indice_reajuste')} />
          </div>
          <div>
            <Label>Multa por atraso (%)</Label>
            <Input type="number" step="0.01" min="0" {...register('percentual_multa_atraso')} />
          </div>
          <div>
            <Label>Juros por atraso (% a.m.)</Label>
            <Input type="number" step="0.01" min="0" {...register('percentual_juros_atraso')} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Vistoria de entrega</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Quilometragem inicial</Label>
            <Input type="number" min="0" {...register('km_inicial')} />
          </div>
          <div>
            <Label>Carga da bateria na entrega (%)</Label>
            <Input type="number" min="0" max="100" {...register('carga_inicial_pct')} />
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
