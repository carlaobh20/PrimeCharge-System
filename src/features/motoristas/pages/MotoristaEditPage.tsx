import { useNavigate, useParams } from 'react-router-dom';
import { MotoristaForm } from '../components/MotoristaForm';
import { useMotorista, useUpdateMotorista } from '../hooks/useMotoristas';
import type { MotoristaFormValues } from '../schemas/motorista.schema';

export function MotoristaEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: motorista, isLoading } = useMotorista(id);
  const updateMotorista = useUpdateMotorista();

  function handleSubmit(values: MotoristaFormValues) {
    if (!id) return;
    updateMotorista.mutate(
      {
        id,
        payload: {
          ...values,
          email: values.email ?? null,
          telefone: values.telefone ?? null,
          data_nascimento: values.data_nascimento ?? null,
          cnh_numero: values.cnh_numero ?? null,
          cnh_categoria: values.cnh_categoria ?? null,
          cnh_validade: values.cnh_validade ?? null,
          endereco: values.endereco ?? null,
          cidade: values.cidade ?? null,
          estado: values.estado ?? null,
          observacoes: values.observacoes ?? null,
        },
      },
      { onSuccess: () => navigate(`/motoristas/${id}`) }
    );
  }

  if (isLoading || !motorista) {
    return <div className="p-8 text-sm text-neutral-500">Carregando…</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Editar motorista</h1>
      <p className="mt-1 text-sm text-neutral-500">{motorista.nome_completo}</p>

      <div className="mt-6 max-w-3xl">
        <MotoristaForm
          isEdit
          defaultValues={{
            nome_completo: motorista.nome_completo,
            cpf: motorista.cpf,
            email: motorista.email ?? '',
            telefone: motorista.telefone ?? '',
            data_nascimento: motorista.data_nascimento ?? '',
            cnh_numero: motorista.cnh_numero ?? '',
            cnh_categoria: motorista.cnh_categoria ?? '',
            cnh_validade: motorista.cnh_validade ?? '',
            status: motorista.status,
            endereco: motorista.endereco ?? '',
            cidade: motorista.cidade ?? '',
            estado: motorista.estado ?? '',
            observacoes: motorista.observacoes ?? '',
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateMotorista.isPending}
          submitLabel="Salvar alterações"
        />
        {updateMotorista.isError && (
          <p className="mt-3 text-sm text-red-600">Erro ao salvar: {(updateMotorista.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
