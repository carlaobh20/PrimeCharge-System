import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateAcao } from '../hooks/useAcoes';
import { acaoSchema, type AcaoFormInput, type AcaoFormValues } from '../schemas/acao.schema';
import { ACAO_PRIORIDADE_LABEL } from '../types';

// Sem página de detalhe própria (mesmo raciocínio de DEC-052 para Financeiro) — criação
// manual de Ação acontece direto na lista, via este Dialog. Ação manual não vincula a
// nenhuma entidade de negócio (sem seletor de veículo/motorista/contrato) — quem precisa
// disso é sempre um gerador (DEC-055), não o formulário do usuário.
export function AcaoFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: usuario } = useCurrentUsuario();
  const createAcao = useCreateAcao();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcaoFormInput, unknown, AcaoFormValues>({
    resolver: zodResolver(acaoSchema),
    defaultValues: { tipo: 'manual', prioridade: 'media' },
  });

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function onSubmit(values: AcaoFormValues) {
    if (!usuario?.empresa_id) return;
    createAcao.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          titulo: values.titulo,
          descricao: values.descricao ?? null,
          tipo: values.tipo,
          prioridade: values.prioridade,
          prazo: values.prazo ?? null,
          responsavel_id: usuario.id,
        },
      },
      { onSuccess: handleClose }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Nova ação" description="Tarefa avulsa — vinculada a você por padrão.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Título *</Label>
          <Input {...register('titulo')} placeholder="Ex.: Contatar motorista sobre devolução" />
          {errors.titulo && <p className="mt-1 text-xs text-red-600">{errors.titulo.message}</p>}
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea {...register('descricao')} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prioridade</Label>
            <Select {...register('prioridade')}>
              {Object.entries(ACAO_PRIORIDADE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" {...register('prazo')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createAcao.isPending}>
            {createAcao.isPending ? 'Salvando…' : 'Criar ação'}
          </Button>
        </div>
        {createAcao.isError && <p className="text-sm text-red-600">Erro ao criar ação: {(createAcao.error as Error).message}</p>}
      </form>
    </Dialog>
  );
}
