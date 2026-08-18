import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { labelTipoSinistro } from '@/features/operacoes/types';
import { useFichaJuridica } from '../hooksFase3';

// Abas operacionais do cockpit jurídico (Fase B): Vistorias / Sinistros / Multas / Financeiro —
// LEITURA dos dados que já existem nos módulos operacionais (mesmas queries em lote da Ficha).
// Nada é duplicado: registro/edição continuam nos módulos de origem (Cockpit do Veículo etc.).

export function VistoriasContrato({ contratoId }: { contratoId: string }) {
  const { data, isLoading } = useFichaJuridica(contratoId);
  if (isLoading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  const vistorias = data?.vistorias ?? [];
  if (vistorias.length === 0) return <p className="text-sm text-neutral-500">Nenhuma vistoria vinculada a este contrato.</p>;
  return (
    <div className="max-w-2xl space-y-2">
      {vistorias.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800">
          <span className="text-neutral-700 dark:text-neutral-300">
            {v.titulo}
            {v.tipo && <span className="text-neutral-400"> ({v.tipo})</span>} · {formatDataSimples(v.criado_em)}
          </span>
          <Badge variant={v.status === 'concluido' ? 'success' : v.status === 'cancelado' ? 'outline' : 'warning'}>{v.status}</Badge>
        </div>
      ))}
      <p className="text-[11px] text-neutral-400">Registro e edição de vistorias acontecem no módulo de Operações/Veículo.</p>
    </div>
  );
}

export function SinistrosContrato({ contratoId }: { contratoId: string }) {
  const { data, isLoading } = useFichaJuridica(contratoId);
  if (isLoading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  const sinistros = data?.sinistros ?? [];
  if (sinistros.length === 0) return <p className="text-sm text-neutral-500">Nenhum sinistro vinculado a este contrato.</p>;
  return (
    <div className="max-w-2xl space-y-2">
      {sinistros.map((s) => (
        <div key={s.id} className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            {labelTipoSinistro(s.tipo)} · {formatDataSimples(s.data_ocorrencia)}
          </p>
          {s.descricao && <p className="text-xs text-neutral-500">{s.descricao}</p>}
        </div>
      ))}
    </div>
  );
}

export function MultasContrato({ contratoId }: { contratoId: string }) {
  const { data, isLoading } = useFichaJuridica(contratoId);
  if (isLoading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  const multas = data?.multas ?? [];
  if (multas.length === 0) return <p className="text-sm text-neutral-500">Nenhuma multa vinculada a este contrato.</p>;
  return (
    <div className="max-w-2xl space-y-2">
      {multas.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800">
          <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-300">
            {formatDataSimples(m.data_infracao)} · {m.orgao_autuador} · {m.descricao}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {m.valor != null && <span className="text-xs font-medium">{formatMoeda(m.valor)}</span>}
            <Badge variant={m.status === 'paga' ? 'success' : m.status === 'pendente' ? 'warning' : 'secondary'}>{m.status}</Badge>
          </span>
        </div>
      ))}
    </div>
  );
}

export function FinanceiroContrato({ contratoId }: { contratoId: string }) {
  const { data, isLoading } = useFichaJuridica(contratoId);
  if (isLoading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  const f = data?.financeiro;
  if (!f || f.totalLancamentos === 0)
    return <p className="text-sm text-neutral-500">Nenhum lançamento financeiro vinculado a este contrato.</p>;
  return (
    <div className="grid max-w-2xl gap-3 md:grid-cols-2">
      {[
        { rotulo: 'Receitas confirmadas', valor: formatMoeda(f.receitasConfirmadas), cor: 'text-emerald-600' },
        { rotulo: 'Receitas pendentes', valor: formatMoeda(f.receitasPendentes), cor: '' },
        { rotulo: 'Receitas vencidas', valor: formatMoeda(f.receitasVencidas), cor: 'text-red-600' },
        { rotulo: 'Despesas vinculadas', valor: formatMoeda(f.despesas), cor: '' },
      ].map((i) => (
        <div key={i.rotulo} className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="text-xs text-neutral-400">{i.rotulo}</p>
          <p className={`text-lg font-semibold ${i.cor}`}>{i.valor}</p>
        </div>
      ))}
      <p className="text-[11px] text-neutral-400 md:col-span-2">
        Consolidação dos lançamentos existentes ({f.totalLancamentos}). Detalhe e edição no módulo Financeiro.
      </p>
    </div>
  );
}
