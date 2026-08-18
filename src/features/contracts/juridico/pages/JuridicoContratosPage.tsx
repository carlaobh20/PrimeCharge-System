import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { buttonVariants } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { StatusBadge } from '../../components/StatusBadge';
import { CONTRATO_STATUS_LABEL, type ContratoStatus } from '../../types';
import { usePanoramaJuridico } from '../hooks';
import { CONTRATO_VERSAO_STATUS_LABEL, type ContratoVersaoStatus } from '../types';

// Lista jurídica (regra 4): a visão DOCUMENTAL dos contratos — status do contrato + versão
// atual + estado da assinatura + pendência, com filtros. Deriva do mesmo panorama do dashboard
// (queries em lote, zero N+1).

type FiltroAssinatura = 'todas' | 'pendente' | 'assinada' | 'recusada';
type FiltroVigencia = 'todas' | 'vencendo30' | 'vencidos';

export function JuridicoContratosPage() {
  const { panorama, isLoading, isError } = usePanoramaJuridico();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<ContratoStatus | 'todos'>('todos');
  const [statusVersao, setStatusVersao] = useState<ContratoVersaoStatus | 'todas'>('todas');
  const [assinatura, setAssinatura] = useState<FiltroAssinatura>('todas');
  const [vigencia, setVigencia] = useState<FiltroVigencia>('todas');

  const linhas = useMemo(() => {
    const hoje = Date.now();
    const DIA = 24 * 60 * 60 * 1000;
    return panorama.contratos
      .map((contrato) => {
        const versoes = panorama.versoesPorContrato.get(contrato.id) ?? [];
        const atual = versoes[0];
        const assinaturas = atual ? (panorama.assinaturasPorVersao.get(atual.id) ?? []) : [];
        const doMotorista = assinaturas.find((a) => a.parte === 'motorista');
        const diasFim = contrato.data_fim_prevista
          ? Math.ceil((new Date(contrato.data_fim_prevista).getTime() - hoje) / DIA)
          : null;
        let pendencia: string | null = null;
        if (!atual) pendencia = 'Sem documento';
        else if (atual.status === 'em_revisao') pendencia = 'Revisão pendente';
        else if (atual.status === 'aguardando_assinatura')
          pendencia = doMotorista?.status === 'recusado' ? 'Assinatura recusada' : 'Aguardando assinatura';
        else if (contrato.status === 'ativo' && diasFim !== null && diasFim < 0) pendencia = 'Vencido';
        else if (contrato.status === 'ativo' && diasFim !== null && diasFim <= 30) pendencia = 'Renovação próxima';
        return { contrato, atual, doMotorista, diasFim, pendencia, totalVersoes: versoes.length };
      })
      .filter((l) => {
        if (status !== 'todos' && l.contrato.status !== status) return false;
        if (statusVersao !== 'todas' && l.atual?.status !== statusVersao) return false;
        if (assinatura === 'pendente' && !(l.doMotorista && !['assinado', 'aceito'].includes(l.doMotorista.status))) return false;
        if (assinatura === 'assinada' && !(l.doMotorista && ['assinado', 'aceito'].includes(l.doMotorista.status))) return false;
        if (assinatura === 'recusada' && l.doMotorista?.status !== 'recusado') return false;
        if (vigencia === 'vencendo30' && !(l.diasFim !== null && l.diasFim >= 0 && l.diasFim <= 30)) return false;
        if (vigencia === 'vencidos' && !(l.diasFim !== null && l.diasFim < 0)) return false;
        const termo = busca.trim().toLowerCase();
        if (termo) {
          const alvo = `${l.contrato.motorista?.nome_completo ?? ''} ${l.contrato.motorista?.cpf ?? ''} ${l.contrato.veiculo?.placa ?? ''}`.toLowerCase();
          if (!alvo.includes(termo)) return false;
        }
        return true;
      });
  }, [panorama, busca, status, statusVersao, assinatura, vigencia]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Contratos — Jurídico</h1>
          <p className="mt-1 text-sm text-neutral-500">Documento, versão e assinatura de cada contrato.</p>
        </div>
        <Link to="/juridico/contratos/novo" className={buttonVariants({})}>
          <Plus className="h-4 w-4" /> Novo contrato
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por motorista, CPF ou placa…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ContratoStatus | 'todos')} className="max-w-[180px]">
          <option value="todos">Contrato: todos</option>
          {Object.entries(CONTRATO_STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={statusVersao} onChange={(e) => setStatusVersao(e.target.value as ContratoVersaoStatus | 'todas')} className="max-w-[200px]">
          <option value="todas">Versão: todas</option>
          {Object.entries(CONTRATO_VERSAO_STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={assinatura} onChange={(e) => setAssinatura(e.target.value as FiltroAssinatura)} className="max-w-[180px]">
          <option value="todas">Assinatura: todas</option>
          <option value="pendente">Pendente</option>
          <option value="assinada">Assinada</option>
          <option value="recusada">Recusada</option>
        </Select>
        <Select value={vigencia} onChange={(e) => setVigencia(e.target.value as FiltroVigencia)} className="max-w-[180px]">
          <option value="todas">Vigência: todas</option>
          <option value="vencendo30">Vencendo em 30d</option>
          <option value="vencidos">Vencidos</option>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Motorista</th>
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Versão</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Fim</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Pendência</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-red-600">
                  Erro ao carregar os contratos.
                </td>
              </tr>
            )}
            {!isLoading && !isError && linhas.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-neutral-500">
                  Nenhum contrato encontrado com esses filtros.
                </td>
              </tr>
            )}
            {linhas.map(({ contrato, atual, doMotorista, pendencia, totalVersoes }) => (
              <tr key={contrato.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">
                  {contrato.motorista?.nome_completo ?? '—'}
                </td>
                <td className="px-4 py-3">{contrato.veiculo?.placa ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={contrato.status} />
                </td>
                <td className="px-4 py-3">
                  {atual ? (
                    <span className="text-xs">
                      {atual.rotulo ?? `v${atual.numero}`}{' '}
                      <span className="text-neutral-400">({CONTRATO_VERSAO_STATUS_LABEL[atual.status]}{totalVersoes > 1 ? ` · ${totalVersoes} versões` : ''})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {doMotorista ? (
                    <Badge
                      variant={
                        ['assinado', 'aceito'].includes(doMotorista.status)
                          ? 'success'
                          : doMotorista.status === 'recusado'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {doMotorista.status === 'nao_enviado' ? 'não enviada' : doMotorista.status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{formatDataSimples(contrato.data_inicio)}</td>
                <td className="px-4 py-3">{contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : '—'}</td>
                <td className="px-4 py-3">{formatMoeda(contrato.valor_periodico)}</td>
                <td className="px-4 py-3">
                  {pendencia ? <Badge variant="warning">{pendencia}</Badge> : <span className="text-xs text-neutral-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  {atual ? formatDataSimples(atual.atualizado_em) : formatDataSimples(contrato.data_inicio)}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/juridico/contratos/${contrato.id}`} className="text-xs font-medium text-emerald-600 hover:underline">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
