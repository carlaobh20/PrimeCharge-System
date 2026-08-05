import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { formatDataSimples } from '@/shared/lib/format';
import { useAcoes, useSincronizarAcoes, useUpdateAcaoStatus } from '../hooks/useAcoes';
import { AcaoFormDialog } from '../components/AcaoFormDialog';
import { ACAO_PRIORIDADE_LABEL, ACAO_STATUS_LABEL, ACAO_STATUS_TRANSITIONS, type AcaoStatus } from '../types';

// Fila de trabalho, não Cockpit (mesmo raciocínio de DEC-052 para Financeiro) — lista +
// Dialog de criação manual + botão de sincronização é a interação completa desta sprint.
export function AcoesListPage() {
  const { data: usuario } = useCurrentUsuario();
  const [status, setStatus] = useState<AcaoStatus | 'todos'>('pendente');
  const [dialogAberto, setDialogAberto] = useState(false);

  const { data: acoes, isLoading, isError } = useAcoes({ status });
  const updateStatus = useUpdateAcaoStatus();
  const sincronizar = useSincronizarAcoes();

  const { data: motoristas } = useMotoristas();
  const { data: contratos } = useContratos();
  const { data: pagamentosPendentes } = usePagamentosPendentesPorEmpresa();

  function handleSincronizar() {
    if (!usuario?.empresa_id) return;
    sincronizar.mutate({
      empresaId: usuario.empresa_id,
      motoristas: motoristas ?? [],
      contratos: contratos ?? [],
      pagamentosPendentes: pagamentosPendentes ?? [],
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Ações Operacionais</h1>
          <p className="mt-1 text-sm text-neutral-500">
            O que precisa acontecer, quem precisa agir, o que está atrasado — em um só lugar.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleSincronizar} disabled={sincronizar.isPending}>
            <RefreshCw className="h-4 w-4" />
            {sincronizar.isPending ? 'Atualizando…' : 'Atualizar ações'}
          </Button>
          <Button onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Nova ação
          </Button>
        </div>
      </div>

      {sincronizar.isSuccess && (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
          {sincronizar.data.criadas} ação(ões) nova(s), {sincronizar.data.fechadas} fechada(s) automaticamente.
        </p>
      )}

      <div className="mt-6">
        <Select value={status} onChange={(e) => setStatus(e.target.value as AcaoStatus | 'todos')} className="max-w-xs">
          <option value="todos">Todos os status</option>
          {Object.entries(ACAO_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Prazo</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar ações.
                </td>
              </tr>
            )}
            {!isLoading && acoes?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  Nenhuma ação por aqui. Clique em "Atualizar ações" para gerar a partir de CNH/contrato/pagamento vencendo.
                </td>
              </tr>
            )}
            {acoes?.map((a) => (
              <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{a.titulo}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{a.tipo}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      a.prioridade === 'critica' || a.prioridade === 'alta'
                        ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }
                  >
                    {ACAO_PRIORIDADE_LABEL[a.prioridade]}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDataSimples(a.prazo)}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{a.responsavel?.nome_completo ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{a.origem}</td>
                <td className="px-4 py-3">
                  <Select
                    value={a.status}
                    onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value as AcaoStatus })}
                    className="h-8 text-xs"
                  >
                    <option value={a.status}>{ACAO_STATUS_LABEL[a.status]}</option>
                    {ACAO_STATUS_TRANSITIONS[a.status].map((proximo) => (
                      <option key={proximo} value={proximo}>
                        {ACAO_STATUS_LABEL[proximo]}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AcaoFormDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
