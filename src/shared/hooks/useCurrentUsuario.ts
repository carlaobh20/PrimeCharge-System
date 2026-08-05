import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Usuario } from '@/shared/types/database';

// Não importa o AuthProvider (camada app/) para não inverter a direção de dependência
// (shared/ nunca importa de app/ ou features/) — resolve a sessão direto pelo client.
export function useCurrentUsuario() {
  return useQuery({
    queryKey: ['usuarios', 'me'],
    queryFn: async (): Promise<Usuario | null> => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) return null;

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      if (error) throw error;
      return data as Usuario;
    },
    staleTime: 5 * 60_000,
  });
}
