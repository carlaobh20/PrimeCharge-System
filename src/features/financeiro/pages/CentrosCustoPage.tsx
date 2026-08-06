import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCentrosCusto, useCreateCentroCusto } from '../hooks/useCentrosCusto';
import { centroCustoSchema, type CentroCustoFormInput, type CentroCustoFormValues } from '../schemas/contaBancaria.schema';

export function CentrosCustoPage() {
  const { data: usuario } = useCurrentUsuario();
  const { data: centros, isLoading, isError } = useCentrosCusto();
  const createCentro = useCreateCentroCusto();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CentroCustoFormInput, unknown, CentroCustoFormValues>({
    resolver: zodResolver(centroCustoSchema),
    defaultValues: { ativo: true },
  });

  function onSubmit(values: CentroCustoFormValues) {
    if (!usuario?.empresa_id) return;
    createCentro.mutate(
      { empresaId: usuario.empresa_id, payload: { nome: values.nome, descricao: values.descricao ?? null, ativo: values.ativo } },
      { onSuccess: () => { reset(); toast.success('Centro de custo adicionado'); } }
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Centros de Custo</h1>
      <p className="mt-1 text-sm text-neutral-500">Dimensão de agrupamento organizacional dos Lançamentos.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex max-w-2xl items-end gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex-1">
          <Label>Nome *</Label>
          <Input {...register('nome')} placeholder="Ex.: Manutenção da frota, Comercial…" />
          {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
        </div>
        <div className="flex-1">
          <Label>Descrição</Label>
          <Input {...register('descricao')} />
        </div>
        <Button type="submit" disabled={createCentro.isPending}>
          {createCentro.isPending ? 'Salvando…' : 'Adicionar'}
        </Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Ativo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar centros de custo.
                </td>
              </tr>
            )}
            {!isLoading && !isError && centros?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  Nenhum centro de custo cadastrado ainda.
                </td>
              </tr>
            )}
            {centros?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{c.nome}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{c.descricao ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{c.ativo ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
