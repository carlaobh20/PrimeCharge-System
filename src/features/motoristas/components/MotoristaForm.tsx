import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { motoristaSchema, type MotoristaFormInput, type MotoristaFormValues } from '../schemas/motorista.schema';
import { MOTORISTA_STATUS_LABEL, ORIGEM_LEAD_LABEL } from '../types';

export function MotoristaForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Salvar',
  isEdit = false,
}: {
  defaultValues?: Partial<MotoristaFormInput>;
  onSubmit: (values: MotoristaFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  isEdit?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MotoristaFormInput, unknown, MotoristaFormValues>({
    resolver: zodResolver(motoristaSchema),
    defaultValues: {
      status: 'lead',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Identificação</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Nome completo *</Label>
            <Input {...register('nome_completo')} />
            {errors.nome_completo && <p className="mt-1 text-xs text-red-600">{errors.nome_completo.message}</p>}
          </div>
          <div>
            <Label>CPF *</Label>
            <Input {...register('cpf')} placeholder="000.000.000-00" />
            {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>E-mail</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Telefone</Label>
            <Input {...register('telefone')} />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input type="date" {...register('data_nascimento')} />
          </div>
        </div>
        <div>
          <Label>Status inicial *</Label>
          <Select {...register('status')} disabled={isEdit}>
            {Object.entries(MOTORISTA_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {isEdit && <p className="mt-1 text-xs text-neutral-500">Use "Alterar status" na tela de detalhes.</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Origem do lead</Label>
            <Select {...register('origem_lead')} defaultValue="">
              <option value="">Não informado</option>
              {Object.entries(ORIGEM_LEAD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Detalhe (opcional)</Label>
            <Input {...register('origem_lead_detalhe')} placeholder="Ex.: indicação do João, Instagram…" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">CNH</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Número</Label>
            <Input {...register('cnh_numero')} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input {...register('cnh_categoria')} placeholder="AB" />
          </div>
          <div>
            <Label>Validade</Label>
            <Input type="date" {...register('cnh_validade')} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Endereço</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input {...register('endereco')} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input {...register('cidade')} />
          </div>
          <div>
            <Label>Estado</Label>
            <Input {...register('estado')} placeholder="UF" maxLength={2} />
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
