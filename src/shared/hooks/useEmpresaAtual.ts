import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { useCurrentUsuario } from './useCurrentUsuario';

// Nome da empresa do usuário logado — usado no header do Cockpit do Ativo (Sprint 2).
// Mesma lógica de useCurrentUsuario: não importa app/, resolve direto pelo client.
export function useEmpresaAtual() {
  const { data: usuario } = useCurrentUsuario();

  return useQuery({
    queryKey: ['empresas', usuario?.empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('id', usuario!.empresa_id!)
        .single();
      if (error) throw error;
      return data as { id: string; nome: string };
    },
    enabled: !!usuario?.empresa_id,
    staleTime: 5 * 60_000,
  });
}
