// Hooks do Centro Jurídico — TanStack Query sobre a api do módulo. A agregação do dashboard é
// feita AQUI (client-side, sobre queries em lote): volume da fase piloto é de dezenas de
// contratos, não milhares — uma view/rpc dedicada seria abstração cedo demais (regra dos 3).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContratos } from '../hooks/useContratos';
import type { ContratoComRelacoes } from '../types';
import {
  createAditivo,
  createAssinatura,
  createTemplate,
  createVersao,
  getVersao,
  listAditivos,
  listAditivosPorContratos,
  listAssinaturas,
  listAssinaturasPorVersoes,
  listTemplates,
  listVersoes,
  listVersoesPorContratos,
  mudarStatusAssinatura,
  mudarStatusVersao,
  proximoNumeroVersao,
  updateAditivoStatus,
  updateTemplate,
  type AssinaturaResumo,
  type VersaoResumo,
} from './api';
import type {
  ContratoAditivoInput,
  ContratoAssinaturaEvidencia,
  ContratoAssinaturaStatus,
  ContratoTemplateInput,
  ContratoVersaoStatus,
} from './types';
import { hashCorpo, renderarCorpo } from './lib';
import { listRevisoes, listSegurosDaEmpresa, templateAprovadoJuridicamente } from './apiFase3';

// ============================ TEMPLATES ============================
export function useTemplatesJuridico() {
  return useQuery({ queryKey: ['juridico', 'templates'], queryFn: listTemplates });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ContratoTemplateInput }) =>
      createTemplate(empresaId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico', 'templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ContratoTemplateInput> }) =>
      updateTemplate(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico', 'templates'] }),
  });
}

// ============================ VERSÕES ============================
export function useVersoes(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'versoes', contratoId],
    queryFn: () => listVersoes(contratoId!),
    enabled: !!contratoId,
  });
}

export function useVersao(versaoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'versao', versaoId],
    queryFn: () => getVersao(versaoId!),
    enabled: !!versaoId,
  });
}

function invalidarJuridico(qc: ReturnType<typeof useQueryClient>, contratoId?: string) {
  qc.invalidateQueries({ queryKey: ['juridico'] });
  if (contratoId) qc.invalidateQueries({ queryKey: ['timeline', 'contrato', contratoId] });
}

/**
 * Gera uma nova versão do documento: renderiza o corpo (template + snapshot, motor único
 * renderarCorpo), calcula o hash SHA-256 e cria a versão em rascunho. O número vem de
 * proximoNumeroVersao — corrida real é barrada pelo unique(contrato_id, numero) do banco.
 */
export function useGerarVersao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      empresaId: string;
      contratoId: string;
      templateId: string;
      templateCorpo: string;
      snapshot: Record<string, unknown>;
    }) => {
      const corpo = renderarCorpo(params.templateCorpo, params.snapshot);
      const hash = await hashCorpo(corpo);
      const numero = await proximoNumeroVersao(params.contratoId);
      return createVersao(params.empresaId, {
        contrato_id: params.contratoId,
        template_id: params.templateId,
        numero,
        rotulo: `v${numero}.0`,
        snapshot: params.snapshot,
        corpo,
        hash_sha256: hash,
      });
    },
    onSuccess: (versao) => invalidarJuridico(qc, versao.contrato_id),
  });
}

/** Transição de status — o trigger do banco valida; erro = transição inválida (mostrar toast). */
export function useMudarStatusVersao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContratoVersaoStatus }) => mudarStatusVersao(id, status),
    onSuccess: (versao) => invalidarJuridico(qc, versao.contrato_id),
  });
}

// ============================ ASSINATURAS ============================
export function useAssinaturas(versaoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'assinaturas', versaoId],
    queryFn: () => listAssinaturas(versaoId!),
    enabled: !!versaoId,
  });
}

/** Cria as duas linhas de assinatura (motorista + primecharge) da versão, status inicial. */
export function usePrepararAssinaturas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ empresaId, versaoId }: { empresaId: string; versaoId: string }) => {
      const motorista = await createAssinatura(empresaId, { contrato_versao_id: versaoId, parte: 'motorista', ordem: 1 });
      const primecharge = await createAssinatura(empresaId, { contrato_versao_id: versaoId, parte: 'primecharge', ordem: 2 });
      return [motorista, primecharge];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico'] }),
  });
}

export function useMudarStatusAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      status: ContratoAssinaturaStatus;
      evidencia?: ContratoAssinaturaEvidencia;
      motivo_recusa?: string | null;
      expira_em?: string | null;
    }) => mudarStatusAssinatura(params.id, params.status, { evidencia: params.evidencia, motivo_recusa: params.motivo_recusa, expira_em: params.expira_em }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico'] }),
  });
}

// ============================ ADITIVOS ============================
export function useAditivos(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'aditivos', contratoId],
    queryFn: () => listAditivos(contratoId!),
    enabled: !!contratoId,
  });
}

export function useCreateAditivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ContratoAditivoInput }) =>
      createAditivo(empresaId, payload),
    onSuccess: (aditivo) => invalidarJuridico(qc, aditivo.contrato_id),
  });
}

export function useUpdateAditivoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'rascunho' | 'vigente' | 'cancelado' }) =>
      updateAditivoStatus(id, status),
    onSuccess: (aditivo) => invalidarJuridico(qc, aditivo.contrato_id),
  });
}

// ============================ PANORAMA (dashboard + lista + filas) ============================
export type PendenciaJuridica = {
  prioridade: 1 | 2 | 3 | 4; // 1 = mais urgente
  cor: 'vermelho' | 'laranja' | 'amarelo' | 'azul';
  rotulo: string;
  detalhe: string;
  contratoId: string;
};

export type PanoramaJuridico = {
  contratos: ContratoComRelacoes[];
  versoesPorContrato: Map<string, VersaoResumo[]>;
  assinaturasPorVersao: Map<string, AssinaturaResumo[]>;
  /** Fase 8 — expostos p/ Agenda Contratual e Relatório de Governança (mesmas queries, zero busca nova) */
  seguros: { contrato_id: string; apolice: string | null; vigencia_fim: string | null }[];
  aditivosTotal: number;
  aditivosPendentes: number;
  cards: {
    ativos: number;
    rascunhos: number;
    emRevisao: number;
    aguardandoAssinatura: number;
    assinados: number;
    vencendo: number;
    vencidos: number;
    aditivosPendentes: number;
    rescisoes: number;
    pendencias: number;
    segurosVencendo: number;
    assinaturasExpirando: number;
    revisoesJuridicasPendentes: number;
  };
  fila: PendenciaJuridica[];
  vencimentos: { contrato: ContratoComRelacoes; diasRestantes: number }[];
};

const DIA_MS = 24 * 60 * 60 * 1000;

/** Panorama completo do módulo — 4 queries em lote, agregação local. */
export function usePanoramaJuridico() {
  const contratosQuery = useContratos();
  const contratos = contratosQuery.data ?? [];
  const contratoIds = contratos.map((c) => c.id);

  const agregadoQuery = useQuery({
    queryKey: ['juridico', 'panorama', contratoIds],
    enabled: contratoIds.length > 0,
    queryFn: async () => {
      const versoes = await listVersoesPorContratos(contratoIds);
      const [assinaturas, aditivos, seguros, revisoes, templates] = await Promise.all([
        listAssinaturasPorVersoes(versoes.map((v) => v.id)),
        listAditivosPorContratos(contratoIds),
        listSegurosDaEmpresa(),
        listRevisoes(),
        listTemplates(),
      ]);
      return { versoes, assinaturas, aditivos, seguros, revisoes, templates };
    },
  });

  const isLoading = contratosQuery.isLoading || (contratoIds.length > 0 && agregadoQuery.isLoading);
  const isError = contratosQuery.isError || agregadoQuery.isError;

  const versoes = agregadoQuery.data?.versoes ?? [];
  const assinaturas = agregadoQuery.data?.assinaturas ?? [];
  const aditivos = agregadoQuery.data?.aditivos ?? [];
  const seguros = agregadoQuery.data?.seguros ?? [];
  const revisoes = agregadoQuery.data?.revisoes ?? [];
  const templates = agregadoQuery.data?.templates ?? [];

  const versoesPorContrato = new Map<string, VersaoResumo[]>();
  for (const v of versoes) {
    const lista = versoesPorContrato.get(v.contrato_id) ?? [];
    lista.push(v);
    versoesPorContrato.set(v.contrato_id, lista);
  }
  const assinaturasPorVersao = new Map<string, AssinaturaResumo[]>();
  for (const a of assinaturas) {
    const lista = assinaturasPorVersao.get(a.contrato_versao_id) ?? [];
    lista.push(a);
    assinaturasPorVersao.set(a.contrato_versao_id, lista);
  }

  const hoje = Date.now();
  const fila: PendenciaJuridica[] = [];
  const vencimentos: { contrato: ContratoComRelacoes; diasRestantes: number }[] = [];

  let rascunhos = 0;
  let emRevisao = 0;
  let aguardandoAssinatura = 0;
  let assinados = 0;
  let vencendo = 0;
  let vencidos = 0;

  for (const contrato of contratos) {
    const nome = contrato.motorista?.nome_completo ?? '—';
    const versoesDoContrato = versoesPorContrato.get(contrato.id) ?? [];
    const atual = versoesDoContrato[0]; // maior numero (ordenado desc na query)

    if (atual?.status === 'rascunho') rascunhos++;
    if (atual?.status === 'em_revisao') {
      emRevisao++;
      fila.push({
        prioridade: 2,
        cor: 'laranja',
        rotulo: 'Revisão pendente',
        detalhe: `${nome} — versão ${atual.rotulo ?? `v${atual.numero}`} aguarda revisão.`,
        contratoId: contrato.id,
      });
    }
    if (atual?.status === 'aguardando_assinatura') {
      aguardandoAssinatura++;
      const linhas = assinaturasPorVersao.get(atual.id) ?? [];
      const pendente = linhas.find((l) => !['assinado', 'aceito'].includes(l.status));
      const enviadaHaDias = pendente?.enviado_em ? Math.floor((hoje - new Date(pendente.enviado_em).getTime()) / DIA_MS) : null;
      // Expiração do convite (Fase 3, regra 12): alerta derivado em <=7 dias (sem cron — decisão do projeto).
      const expiraEmDias = pendente?.expira_em ? Math.ceil((new Date(pendente.expira_em).getTime() - hoje) / DIA_MS) : null;
      if (expiraEmDias != null && expiraEmDias <= 7) {
        fila.push({
          prioridade: expiraEmDias <= 1 ? 1 : 2,
          cor: expiraEmDias <= 1 ? 'vermelho' : 'laranja',
          rotulo: expiraEmDias < 0 ? 'Convite de assinatura expirado' : 'Convite de assinatura expirando',
          detalhe: `${nome} — ${expiraEmDias < 0 ? `expirou há ${Math.abs(expiraEmDias)} dia(s)` : `expira em ${expiraEmDias} dia(s)`}.`,
          contratoId: contrato.id,
        });
      }
      fila.push({
        prioridade: enviadaHaDias != null && enviadaHaDias >= 7 ? 1 : 2,
        cor: enviadaHaDias != null && enviadaHaDias >= 7 ? 'vermelho' : 'laranja',
        rotulo: enviadaHaDias != null && enviadaHaDias >= 7 ? 'Assinatura parada' : 'Aguardando assinatura',
        detalhe: `${nome} — ${enviadaHaDias != null ? `enviada há ${enviadaHaDias} dia(s)` : 'ainda não enviada ao motorista'}.`,
        contratoId: contrato.id,
      });
      const recusada = linhas.find((l) => l.status === 'recusado');
      if (recusada)
        fila.push({
          prioridade: 1,
          cor: 'vermelho',
          rotulo: 'Assinatura recusada',
          detalhe: `${nome} recusou a versão ${atual.rotulo ?? `v${atual.numero}`}.`,
          contratoId: contrato.id,
        });
    }
    if (atual && ['assinada', 'vigente'].includes(atual.status)) assinados++;

    if (contrato.status === 'ativo' && !atual) {
      fila.push({
        prioridade: 3,
        cor: 'amarelo',
        rotulo: 'Contrato sem documento',
        detalhe: `${nome} — contrato ativo sem nenhuma versão de documento gerada.`,
        contratoId: contrato.id,
      });
    }

    if (contrato.status === 'ativo' && contrato.data_fim_prevista) {
      const dias = Math.ceil((new Date(contrato.data_fim_prevista).getTime() - hoje) / DIA_MS);
      if (dias < 0) {
        vencidos++;
        fila.push({
          prioridade: 1,
          cor: 'vermelho',
          rotulo: 'Contrato vencido',
          detalhe: `${nome} — venceu há ${Math.abs(dias)} dia(s). Renovar, aditar ou encerrar.`,
          contratoId: contrato.id,
        });
        vencimentos.push({ contrato, diasRestantes: dias });
      } else if (dias <= 30) {
        vencendo++;
        fila.push({
          prioridade: 4,
          cor: 'azul',
          rotulo: 'Renovação próxima',
          detalhe: `${nome} — vence em ${dias} dia(s).`,
          contratoId: contrato.id,
        });
        vencimentos.push({ contrato, diasRestantes: dias });
      } else if (dias <= 90) {
        // Fase 3 (regra 15): janelas 90/60 aparecem na lista de vencimentos (não poluem a fila).
        vencimentos.push({ contrato, diasRestantes: dias });
      }
    }
  }

  const aditivosPendentes = aditivos.filter((a) => a.status === 'rascunho').length;
  for (const a of aditivos.filter((x) => x.status === 'rascunho')) {
    fila.push({
      prioridade: 3,
      cor: 'amarelo',
      rotulo: 'Aditivo em rascunho',
      detalhe: `Aditivo (${a.tipo}) aguardando conclusão.`,
      contratoId: a.contrato_id,
    });
  }

  // Seguros vencendo/vencidos (Fase P/E) — derivado, sem cron
  let segurosVencendo = 0;
  const nomePorContrato = new Map(contratos.map((c) => [c.id, c.motorista?.nome_completo ?? '—']));
  for (const s of seguros) {
    if (!s.vigencia_fim) continue;
    const dias = Math.ceil((new Date(s.vigencia_fim).getTime() - hoje) / DIA_MS);
    if (dias < 0) {
      segurosVencendo++;
      fila.push({
        prioridade: 1,
        cor: 'vermelho',
        rotulo: 'Seguro vencido',
        detalhe: `${nomePorContrato.get(s.contrato_id) ?? '—'} — apólice ${s.apolice ?? 'sem número'} venceu há ${Math.abs(dias)} dia(s).`,
        contratoId: s.contrato_id,
      });
    } else if (dias <= 30) {
      segurosVencendo++;
      fila.push({
        prioridade: dias <= 7 ? 2 : 3,
        cor: dias <= 7 ? 'laranja' : 'amarelo',
        rotulo: 'Seguro vencendo',
        detalhe: `${nomePorContrato.get(s.contrato_id) ?? '—'} — vence em ${dias} dia(s).`,
        contratoId: s.contrato_id,
      });
    }
  }

  // Assinaturas expirando (contagem p/ card — os itens da fila já entram no loop de contratos)
  const assinaturasExpirando = assinaturas.filter(
    (a) =>
      a.expira_em &&
      !['assinado', 'aceito', 'cancelado', 'recusado'].includes(a.status) &&
      new Date(a.expira_em).getTime() - hoje <= 7 * DIA_MS,
  ).length;

  // Revisões jurídicas pendentes: template PUBLICADO sem revisão aprovada da versão atual
  const revisoesJuridicasPendentes = templates.filter(
    (t) => t.status === 'publicado' && !templateAprovadoJuridicamente(revisoes.filter((r) => r.template_id === t.id), t.versao_template),
  ).length;

  fila.sort((x, y) => x.prioridade - y.prioridade);
  vencimentos.sort((x, y) => x.diasRestantes - y.diasRestantes);

  const panorama: PanoramaJuridico = {
    contratos,
    versoesPorContrato,
    assinaturasPorVersao,
    seguros: seguros.map((s) => ({ contrato_id: s.contrato_id, apolice: s.apolice, vigencia_fim: s.vigencia_fim })),
    aditivosTotal: aditivos.length,
    aditivosPendentes,
    cards: {
      ativos: contratos.filter((c) => c.status === 'ativo').length,
      rascunhos,
      emRevisao,
      aguardandoAssinatura,
      assinados,
      vencendo,
      vencidos,
      aditivosPendentes,
      rescisoes: aditivos.filter((a) => a.tipo === 'rescisao').length,
      pendencias: fila.length,
      segurosVencendo,
      assinaturasExpirando,
      revisoesJuridicasPendentes,
    },
    fila,
    vencimentos,
  };

  return { panorama, isLoading, isError };
}
