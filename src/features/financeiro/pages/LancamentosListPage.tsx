import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import {
  useDeleteLancamento,
  useGerarCobrancasRecorrentes,
  useLancamentos,
  useUpdateLancamentoStatus,
} from '../hooks/useLancamentos';
import { LancamentoFormDialog } from '../components/LancamentoFormDialog';
import {
  LANCAMENTO_STATUS_LABEL,
  LANCAMENTO_STATUS_TRANSITIONS,
  LANCAMENTO_TIPO_LABEL,
  type LancamentoStatus,
  type LancamentoTipo,
} from '../types';

// Sem página de detalhe (DEC-052) — lista + Dialog de criação é a interação completa desta
// sprint. Mudança de status acontece direto na linha, via Select, mesma lógica de
// fn_validar_transicao_lancamento (banco rejeita transição inválida, aqui só restringimos a
// lista de opções pra não oferecer algo que o banco recusaria).
// `?status=` opcional (Épico 1, Centro de Operações) — mesmo raciocínio de VeiculosListPage.
export function LancamentosListPage() {
  const [searchParams] = useSearchParams();
  const statusInicial = (searchParams.get('status') as LancamentoStatus | null) ?? 'todos';
  const [tipo, setTipo] = useState<LancamentoTipo | 'todos'>('todos');
  const [status, setStatus] = useState<LancamentoStatus | 'todos'>(statusInicial);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const { data: lancamentos, isLoading, isError } = useLancamentos({ tipo, status });
  const { data: usuario } = useCurrentUsuario();
  const updateStatus = useUpdateLancamentoStatus();
  const deleteLancamento = useDeleteLancamento();
  const gerarCobrancas = useGerarCobrancasRecorrentes();

  function handleGerarCobrancas() {
    if (!usuario?.empresa_id) return;
    gerarCobrancas.mutate(usuario.empresa_id, {
      onSuccess: (resultado) => {
        const geradas = resultado.filter((r) => r.gerado).length;
        const jaExistiam = resultado.filter((r) => !r.gerado && r.motivo === 'ja_existe_para_esta_competencia').length;
        if (geradas === 0 && jaExistiam === 0) {
          toast.info('Nenhum contrato mensal ativo com cobrança recorrente configurada.');
          return;
        }
        const partes = [`${geradas} cobranças geradas`];
        if (jaExistiam > 0) partes.push(`${jaExistiam} já existiam`);
        toast.success(partes.join(' — '));
      },
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Lançamentos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Receitas e despesas — uma Provisão é um lançamento com status "Prevista" ainda sem pagamento.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleGerarCobrancas} disabled={gerarCobrancas.isPending}>
            <RefreshCw className="h-4 w-4" />
            {gerarCobrancas.isPending ? 'Gerando…' : 'Gerar cobranças do mês'}
          </Button>
          <Button onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as LancamentoTipo | 'todos')} className="max-w-xs">
          <option value="todos">Todos os tipos</option>
          {Object.entries(LANCAMENTO_TIPO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as LancamentoStatus | 'todos')} className="max-w-xs">
          <option value="todos">Todos os status</option>
          {Object.entries(LANCAMENTO_STATUS_LABEL).map(([value, label]) => (
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
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Data prevista</th>
              <th className="px-4 py-3">Centro de custo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
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
                  Erro ao carregar lançamentos.
                </td>
              </tr>
            )}
            {!isLoading && lancamentos?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  Nenhum lançamento cadastrado ainda.
                </td>
              </tr>
            )}
            {lancamentos?.map((l) => (
              <tr key={l.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{l.descricao}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      l.tipo === 'receita'
                        ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }
                  >
                    {LANCAMENTO_TIPO_LABEL[l.tipo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(l.valor)}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDataSimples(l.data_prevista)}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{l.centro_custo?.nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <Select
                    value={l.status}
                    onChange={(e) => {
                      const status = e.target.value as LancamentoStatus;
                      updateStatus.mutate(
                        { id: l.id, status },
                        { onSuccess: () => toast.success(`Status alterado para "${LANCAMENTO_STATUS_LABEL[status]}"`) }
                      );
                    }}
                    className="h-8 text-xs"
                  >
                    <option value={l.status}>{LANCAMENTO_STATUS_LABEL[l.status]}</option>
                    {LANCAMENTO_STATUS_TRANSITIONS[l.status].map((proximo) => (
                      <option key={proximo} value={proximo}>
                        {LANCAMENTO_STATUS_LABEL[proximo]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setExcluirId(l.id)}
                    aria-label={`Excluir lançamento "${l.descricao}"`}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LancamentoFormDialog open={dialogAberto} onOpenChange={setDialogAberto} />

      <ConfirmDialog
        open={!!excluirId}
        onOpenChange={(open) => !open && setExcluirId(null)}
        title="Excluir este lançamento?"
        description="Esta ação não pode ser desfeita. Se já existir um pagamento vinculado, o banco recusa a exclusão."
        confirmLabel="Excluir"
        destructive
        isPending={deleteLancamento.isPending}
        onConfirm={() => {
          if (!excluirId) return;
          deleteLancamento.mutate(excluirId, {
            onSuccess: () => { toast.success('Lançamento excluído'); setExcluirId(null); },
          });
        }}
      />
    </div>
  );
}
