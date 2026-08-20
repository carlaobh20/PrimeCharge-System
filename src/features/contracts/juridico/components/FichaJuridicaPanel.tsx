import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { getMotorista } from '@/features/motoristas/api/motoristas';
import type { ContratoComRelacoes } from '../../types';
import type { ContratoVersao } from '../types';
import type { ContratoAssinatura } from '../types';
import { useFichaJuridica, useRevisoesTemplate } from '../hooksFase3';
import { templateAprovadoJuridicamente } from '../apiFase3';
import { calcularRiscoContratual, NIVEL_RISCO_LABEL, type InsumosRisco, type NivelRisco } from '../risco';

// FICHA JURÍDICA (regra 2) + SCORE DE RISCO (regra 3). O risco é a engine transparente de
// risco.ts alimentada com fatos derivados AQUI das queries — cada motivo aparece na tela
// ("Por que este contrato está neste nível?"). NUNCA dizemos "juridicamente seguro".

const COR_NIVEL: Record<NivelRisco, string> = {
  baixo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderado: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  alto: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critico: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="shrink-0 text-neutral-500">{rotulo}</dt>
      <dd className="truncate text-right font-medium text-neutral-800 dark:text-neutral-200">{children}</dd>
    </div>
  );
}

export function FichaJuridicaPanel({
  contrato,
  versaoAtual,
  assinaturas,
  aditivosPendentes,
}: {
  contrato: ContratoComRelacoes;
  versaoAtual: ContratoVersao | undefined;
  assinaturas: ContratoAssinatura[] | undefined;
  aditivosPendentes: number;
}) {
  const ficha = useFichaJuridica(contrato.id);
  const motoristaQuery = useQuery({
    queryKey: ['motoristas', contrato.motorista_id],
    queryFn: () => getMotorista(contrato.motorista_id),
  });
  const revisoesQuery = useRevisoesTemplate(versaoAtual?.template_id ?? undefined);

  const hoje = new Date().toISOString().slice(0, 10);
  const seguro = ficha.data?.seguros?.[0];
  const rescisaoAtiva = ficha.data?.rescisoes?.find((r) => !['encerrada', 'cancelada'].includes(r.status));
  const mot = motoristaQuery.data;
  const assinaturaMotorista = assinaturas?.find((a) => a.parte === 'motorista');

  const templateVersaoUsada = (versaoAtual?.snapshot as { _meta?: { template_versao?: number } } | undefined)?._meta
    ?.template_versao;
  const templateAprovado =
    revisoesQuery.data && templateVersaoUsada != null
      ? templateAprovadoJuridicamente(revisoesQuery.data, templateVersaoUsada)
      : false;

  const risco = useMemo(() => {
    const diasFim = contrato.data_fim_prevista
      ? Math.ceil((new Date(contrato.data_fim_prevista).getTime() - Date.now()) / 86400000)
      : null;
    const insumos: InsumosRisco = {
      semVersaoDocumento: !versaoAtual,
      cnhVencida: !!mot?.cnh_validade && mot.cnh_validade.slice(0, 10) < hoje,
      cnhSemValidade: !!mot && !mot.cnh_validade,
      documentoMotoristaFaltante: !!mot && !mot.cnh_numero,
      seguroAusente: ficha.data ? ficha.data.seguros.length === 0 : false,
      seguroVencido: !!seguro?.vigencia_fim && seguro.vigencia_fim < hoje,
      seguroVencendo30d:
        !!seguro?.vigencia_fim &&
        seguro.vigencia_fim >= hoje &&
        new Date(seguro.vigencia_fim).getTime() - Date.now() < 30 * 86400000,
      apoliceNaoAnexada: !!seguro && !seguro.apolice,
      assinaturaPendente:
        versaoAtual?.status === 'aguardando_assinatura' &&
        !!assinaturaMotorista &&
        !['assinado', 'aceito'].includes(assinaturaMotorista.status),
      assinaturaRecusada: assinaturaMotorista?.status === 'recusado',
      assinaturaExpirando:
        !!assinaturaMotorista?.expira_em &&
        !['assinado', 'aceito'].includes(assinaturaMotorista.status) &&
        new Date(assinaturaMotorista.expira_em).getTime() - Date.now() < 7 * 86400000,
      camposObrigatoriosFaltantes: [!mot?.endereco, !mot?.cpf, !contrato.valor_periodico].filter(Boolean).length,
      aditivoPendente: aditivosPendentes > 0,
      contratoVencendo30d: contrato.status === 'ativo' && diasFim !== null && diasFim >= 0 && diasFim <= 30,
      contratoVencido: contrato.status === 'ativo' && diasFim !== null && diasFim < 0,
      templateSemRevisaoJuridica: !templateAprovado,
      rescisaoEmAndamento: !!rescisaoAtiva,
      inconsistenciaCadastral: contrato.status === 'ativo' && contrato.veiculo?.status !== 'alugado',
    };
    return calcularRiscoContratual(insumos);
  }, [contrato, versaoAtual, mot, seguro, ficha.data, assinaturaMotorista, aditivosPendentes, templateAprovado, rescisaoAtiva, hoje]);

  if (ficha.isLoading || motoristaQuery.isLoading) return <p className="text-sm text-neutral-500">Carregando ficha jurídica…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Ficha */}
      <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
        <dl className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Identificação</p>
          <Linha rotulo="Número">#{contrato.id.slice(0, 8).toUpperCase()}</Linha>
          <Linha rotulo="Versão atual">{versaoAtual ? `${versaoAtual.rotulo ?? `v${versaoAtual.numero}`} (${versaoAtual.status})` : 'sem documento'}</Linha>
          <Linha rotulo="Template (versão usada)">{templateVersaoUsada != null ? `v${templateVersaoUsada}` : '—'}</Linha>
          <Linha rotulo="Status contrato">{contrato.status}</Linha>
          <Linha rotulo="Motorista">{contrato.motorista?.nome_completo}</Linha>
          <Linha rotulo="CPF">{mot?.cpf ?? '—'}</Linha>
          <Linha rotulo="CNH">{mot?.cnh_numero ? `${mot.cnh_numero}${mot.cnh_validade ? ` (val. ${formatDataSimples(mot.cnh_validade)})` : ''}` : '—'}</Linha>
          <Linha rotulo="Veículo">{contrato.veiculo?.placa}</Linha>
        </dl>
        <dl className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Comercial e vigência</p>
          <Linha rotulo="Início">{formatDataSimples(contrato.data_inicio)}</Linha>
          <Linha rotulo="Término">{contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : 'indeterminado'}</Linha>
          <Linha rotulo="Valor">{formatMoeda(contrato.valor_periodico)}/{contrato.periodicidade}</Linha>
          <Linha rotulo="Caução">{contrato.valor_caucao != null ? formatMoeda(contrato.valor_caucao) : '—'}</Linha>
          <Linha rotulo="Seguro">{seguro ? `${seguro.seguradora ?? '—'} (${seguro.apolice ?? 'sem apólice'})` : 'não cadastrado'}</Linha>
          <Linha rotulo="Franquia">{seguro?.franquia_valor != null ? formatMoeda(seguro.franquia_valor) : '—'}</Linha>
          <Linha rotulo="Assinatura motorista">{assinaturaMotorista?.status ?? '—'}</Linha>
          <Linha rotulo="Última alteração">{versaoAtual ? formatDataSimples(versaoAtual.atualizado_em) : '—'}</Linha>
        </dl>
        <dl className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 md:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Operacional vinculado</p>
          <div className="grid gap-x-8 md:grid-cols-2">
            <Linha rotulo="Vistorias">{ficha.data?.vistorias.length ?? 0}</Linha>
            <Linha rotulo="Sinistros">{ficha.data?.sinistros.length ?? 0}</Linha>
            <Linha rotulo="Multas">{ficha.data?.multas.length ?? 0}</Linha>
            <Linha rotulo="Receitas vencidas">{ficha.data ? formatMoeda(ficha.data.financeiro.receitasVencidas) : '—'}</Linha>
            <Linha rotulo="Rescisão">{rescisaoAtiva ? rescisaoAtiva.status : 'nenhuma em andamento'}</Linha>
            <Linha rotulo="Revisão jurídica do modelo">{templateAprovado ? 'aprovada (versão em uso)' : 'pendente'}</Linha>
          </div>
        </dl>
      </div>

      {/* Risco */}
      <aside className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            <ShieldAlert className="h-3.5 w-3.5" /> Risco contratual
          </p>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', COR_NIVEL[risco.nivel])}>
            {NIVEL_RISCO_LABEL[risco.nivel]} · {risco.pontos} pt
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-neutral-400">
          Indicador OPERACIONAL por pendências objetivas (régua: ≥{risco.regua.moderado} moderado, ≥{risco.regua.alto} alto, ≥
          {risco.regua.critico} crítico). Não é avaliação jurídica — risco baixo significa apenas “sem pendência operacional
          conhecida”.
        </p>
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">Por que este contrato está neste nível?</p>
          {risco.motivos.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma pendência objetiva encontrada.</p>
          ) : (
            <ul className="space-y-1">
              {risco.motivos.map((m) => (
                <li key={m.chave} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {m.rotulo}
                    {m.detalhe && <span className="text-neutral-400"> — {m.detalhe}</span>}
                  </span>
                  <Badge variant="secondary">+{m.peso}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
