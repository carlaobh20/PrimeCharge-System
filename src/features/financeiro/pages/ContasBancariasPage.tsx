import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useContasBancarias, useCreateContaBancaria } from '../hooks/useContasBancarias';
import { contaBancariaSchema, type ContaBancariaFormInput, type ContaBancariaFormValues } from '../schemas/contaBancaria.schema';

export function ContasBancariasPage() {
  const { data: usuario } = useCurrentUsuario();
  const { data: contas, isLoading } = useContasBancarias();
  const createConta = useCreateContaBancaria();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContaBancariaFormInput, unknown, ContaBancariaFormValues>({
    resolver: zodResolver(contaBancariaSchema),
    defaultValues: { tipo: 'corrente', saldo_inicial: 0, ativa: true },
  });

  function onSubmit(values: ContaBancariaFormValues) {
    if (!usuario?.empresa_id) return;
    createConta.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          nome: values.nome,
          banco: values.banco ?? null,
          agencia: values.agencia ?? null,
          conta: values.conta ?? null,
          tipo: values.tipo,
          saldo_inicial: values.saldo_inicial,
          ativa: values.ativa,
        },
      },
      { onSuccess: () => reset() }
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Contas Bancárias</h1>
      <p className="mt-1 text-sm text-neutral-500">Origem/destino real dos Pagamentos.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid max-w-2xl grid-cols-2 gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <Label>Nome *</Label>
          <Input {...register('nome')} placeholder="Ex.: Conta principal PJ" />
          {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
        </div>
        <div>
          <Label>Tipo</Label>
          <Select {...register('tipo')}>
            <option value="corrente">Corrente</option>
            <option value="poupanca">Poupança</option>
            <option value="investimento">Investimento</option>
          </Select>
        </div>
        <div>
          <Label>Banco</Label>
          <Input {...register('banco')} />
        </div>
        <div>
          <Label>Saldo inicial</Label>
          <Input type="number" step="0.01" {...register('saldo_inicial')} />
        </div>
        <div className="col-span-2 flex justify-end">
          <Button type="submit" disabled={createConta.isPending}>
            {createConta.isPending ? 'Salvando…' : 'Adicionar conta'}
          </Button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Banco</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Saldo inicial</th>
              <th className="px-4 py-3">Ativa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && contas?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Nenhuma conta cadastrada ainda.
                </td>
              </tr>
            )}
            {contas?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{c.nome}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{c.banco ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 capitalize">{c.tipo}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                  {c.saldo_inicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{c.ativa ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
