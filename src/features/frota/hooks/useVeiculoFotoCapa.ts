import { useQuery } from '@tanstack/react-query';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { getArquivoUrl } from '@/shared/capabilities/api/arquivos';

// Primeira foto enviada (aba Arquivos, categoria "foto") vira a foto de capa do header
// do Cockpit — sem campo novo em `veiculos`, reaproveitando a capability já existente.
export function useVeiculoFotoCapa(veiculoId: string | undefined) {
  const { data: arquivos } = useArquivos('veiculo', veiculoId ?? '', 'foto');
  const capa = arquivos?.[0];

  const { data: url } = useQuery({
    queryKey: ['veiculo-foto-capa', capa?.id],
    queryFn: () => getArquivoUrl(capa!.caminho_storage),
    enabled: !!capa,
    staleTime: 55 * 60_000,
  });

  return url ?? null;
}
