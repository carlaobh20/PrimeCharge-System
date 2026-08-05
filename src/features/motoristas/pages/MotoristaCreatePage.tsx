import { useNavigate } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { MotoristaForm } from '../components/MotoristaForm';
import { useCreateMotorista } from '../hooks/useMotoristas';
import type { MotoristaFormValues } from '../schemas/motorista.schema';

export function MotoristaCreatePage() {
  const navigate = useNavigate();
  const { data: usuario } = useCurrentUsuario();
  const createMotorista = useCreateMotorista();

  function handleSubmit(values: MotoristaFormValues) {
    if (!usuario?.empresa_id) return;
    createMotorista.mutate(
      {
        empresaId: usuario.empresa_id,
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
      {
        onSuccess: (motorista) => navigate(`/motoristas/${motorista.id}`),
      }
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Novo motorista</h1>
      <p className="mt-1 text-sm text-neutral-500">Cadastro completo do motorista/cliente.</p>

      <div className="mt-6 max-w-3xl">
        <MotoristaForm onSubmit={handleSubmit} isSubmitting={createMotorista.isPending} submitLabel="Cadastrar motorista" />
        {createMotorista.isError && (
          <p className="mt-3 text-sm text-red-600">
            Erro ao cadastrar motorista: {(createMotorista.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
