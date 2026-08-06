import { useMemo } from 'react';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { CONTRATO_STATUS_LABEL } from '@/features/contracts/types';

export type SearchResultTipo = 'veiculo' | 'motorista' | 'contrato';

export type SearchResult = {
  tipo: SearchResultTipo;
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
};

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Busca Global (Missão 5, Fase 3 — Workspace Premium, escopo reduzido a este único item; ver
// DECISION_LOG.md pela decisão de adiar Favoritos/Recentes/Filtros salvos/Atalhos). Agregador
// entre Veículos/Motoristas/Contratos — mesma categoria de exceção pontual à DEC-008 já
// formalizada em DEC-039 (hooks de leitura de listagem, propósito "agregar dado de múltiplas
// origens", mesmo motivo já usado por `useCommandCenter`). Sem filtro no Supabase de propósito:
// as 3 listas já são buscadas inteiras em outro lugar da app assim que o usuário loga (Central
// de Comando busca Veículos/Motoristas/Contratos sem filtro) — o React Query dedupe garante que
// abrir a busca não dispara nenhuma consulta nova na maioria das vezes; filtrar em memória aqui
// é consistente com o que Contratos já faz por necessidade técnica (PostgREST não filtra `.or()`
// sobre coluna de relação embutida sem view/rpc dedicada). Mesmo risco aceito já registrado em
// DEC-108 (zero paginação): deixa de escalar no mesmo ponto em que o resto do app já deixa.
export function useGlobalSearch(termo: string, ativo: boolean) {
  const { data: veiculos, isLoading: loadingVeiculos } = useVeiculos();
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristas();
  const { data: contratos, isLoading: loadingContratos } = useContratos();

  const isLoading = ativo && (loadingVeiculos || loadingMotoristas || loadingContratos);

  const resultados = useMemo<SearchResult[]>(() => {
    const termoNormalizado = normalizar(termo.trim());
    if (!termoNormalizado || !ativo) return [];

    const deVeiculos: SearchResult[] = (veiculos ?? [])
      .filter((v) => normalizar(`${v.placa} ${v.marca.nome} ${v.modelo.nome} ${v.chassi ?? ''} ${v.renavam ?? ''}`).includes(termoNormalizado))
      .map((v) => ({
        tipo: 'veiculo' as const,
        id: v.id,
        titulo: v.placa,
        subtitulo: `${v.marca.nome} ${v.modelo.nome}`,
        href: `/veiculos/${v.id}`,
      }));

    const deMotoristas: SearchResult[] = (motoristas ?? [])
      .filter((m) => normalizar(`${m.nome_completo} ${m.cpf} ${m.cnh_numero ?? ''} ${m.email ?? ''}`).includes(termoNormalizado))
      .map((m) => ({
        tipo: 'motorista' as const,
        id: m.id,
        titulo: m.nome_completo,
        subtitulo: m.cpf,
        href: `/motoristas/${m.id}`,
      }));

    const deContratos: SearchResult[] = (contratos ?? [])
      .filter((c) => normalizar(`${c.veiculo.placa} ${c.motorista.nome_completo}`).includes(termoNormalizado))
      .map((c) => ({
        tipo: 'contrato' as const,
        id: c.id,
        titulo: `${c.veiculo.placa} — ${c.motorista.nome_completo}`,
        subtitulo: `Contrato · ${CONTRATO_STATUS_LABEL[c.status]}`,
        href: `/contratos/${c.id}`,
      }));

    return [...deVeiculos, ...deMotoristas, ...deContratos].slice(0, 20);
  }, [termo, ativo, veiculos, motoristas, contratos]);

  return { resultados, isLoading };
}
