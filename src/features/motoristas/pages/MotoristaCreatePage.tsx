import { useNavigate } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { MotoristaForm } from '../components/MotoristaForm';
import { useCreateMotorista } from '../hooks/useMotoristas';
import { useFunilEtapas } from '../hooks/useFunilEtapas';
import type { MotoristaFormValues } from '../schemas/motorista.schema';

export function MotoristaCreatePage() {
  const navigate = useNavigate();
  const { data: usuario } = useCurrentUsuario();
  const { data: etapas } = useFunilEtapas(usuario?.empresa_id ?? undefined);
  const createMotorista = useCreateMotorista();

  function handleSubmit(values: MotoristaFormValues) {
    if (!usuario?.empresa_id) return;
    // Épico 6, Fase 1.1 — motorista criado pelo formulário entra no Kanban já classificado na
    // primeira etapa do funil (grupo 'lead', menor ordem; se não houver nenhuma com esse grupo
    // — ex.: Carlos apagou/renomeou todas — cai na etapa de menor ordem que sobrar; sem etapa
    // nenhuma cadastrada, entra null e aparece em "Não classificados", igual a quem existia
    // antes do Kanban — nunca inventamos uma etapa que não existe).
    const listaEtapas = etapas ?? [];
    const primeiraLead = listaEtapas.filter((e) => e.grupo === 'lead').sort((a, b) => a.ordem - b.ordem)[0];
    const primeiraQualquer = [...listaEtapas].sort((a, b) => a.ordem - b.ordem)[0];
    const etapaInicial = primeiraLead ?? primeiraQualquer ?? null;

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
          etapa_funil_id: etapaInicial?.id ?? null,
          responsavel_id: null,
          prioridade: 'media',
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
