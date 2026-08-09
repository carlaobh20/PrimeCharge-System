import { useMemo } from 'react';
import { Check, Copy, FileDown, Sparkles, User2, Wrench, FileText, MessageSquare, History, Building2, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useEmpresaAtual } from '@/shared/hooks/useEmpresaAtual';
import { ordenarPorVencimento } from '@/shared/intelligence/vencimentos';
import { useManutencoesPorVeiculo } from '@/features/operacoes/hooks/useManutencoes';
import { MANUTENCAO_TIPO_LABEL } from '@/features/operacoes/types';
import { formatDataRelativa, formatDataSimples } from '../lib/format';
import { useCopyPageLink } from '../lib/useCopyPageLink';
import type { VeiculoComRelacoes } from '../types';
import type { ActionKey } from '../lib/actions';

function SidebarRow({ icon: Icon, label, value }: { icon: typeof User2; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</p>
        <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">{value}</p>
      </div>
    </div>
  );
}

// Sidebar direita fixa do Cockpit (Sprint 2). Campos reais quando o dado já existe
// (empresa, última atualização, último comentário, último evento).
//
// Achado da auditoria do Épico 1 (Operação Perfeita, "cockpits burros"): "Próxima
// manutenção" e "Próximo documento a vencer" ficavam hardcoded em "—" com o comentário
// "até o módulo existir" — mas os módulos (Manutenções, Arquivos com data_validade) já
// existem e já alimentam o gerador de Ações Operacionais (ver
// operacoes/intelligence/geradores/documentoGeradores.ts, mesma ordenarPorVencimento usada
// abaixo). Corrigido para ler o dado real. "Responsável" continua "—": não existe
// responsavel_id em veiculos (só em Ações/Checklists), então não há dado real pra mostrar.
export function VeiculoSidebar({
  veiculo,
  onAction,
  onScrollToActions,
}: {
  veiculo: VeiculoComRelacoes;
  onAction: (key: ActionKey) => void;
  onScrollToActions: () => void;
}) {
  const { data: empresa } = useEmpresaAtual();
  const { data: comentarios } = useComentarios('veiculo', veiculo.id);
  const { data: eventos } = useTimeline('veiculo', veiculo.id);
  const { data: manutencoes } = useManutencoesPorVeiculo(veiculo.id);
  const { data: arquivos } = useArquivos('veiculo', veiculo.id);
  const { copiado, copiar } = useCopyPageLink();

  const ultimoComentario = comentarios?.[0];
  const ultimoEvento = eventos?.[0];

  const proximaManutencao = useMemo(() => {
    const agendadas = (manutencoes ?? [])
      .filter((m) => m.status_execucao === 'agendada' && m.data_agendada)
      .sort((a, b) => (a.data_agendada as string).localeCompare(b.data_agendada as string));
    return agendadas[0] ?? null;
  }, [manutencoes]);

  const proximoDocumento = useMemo(() => {
    const fontes = (arquivos ?? [])
      .filter((a) => a.categoria === 'documento' && a.data_validade)
      .map((a) => ({ label: a.nome_arquivo, data: a.data_validade as string, entidadeTipo: 'veiculo', entidadeId: veiculo.id }));
    return ordenarPorVencimento(fontes)[0] ?? null;
  }, [arquivos, veiculo.id]);

  return (
    <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-6 lg:w-72">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Resumo do ativo</h3>
        <div className="mt-1 divide-y divide-neutral-100 dark:divide-white/5">
          <SidebarRow icon={Building2} label="Empresa" value={empresa?.nome ?? '—'} />
          <SidebarRow icon={Clock} label="Última atualização" value={formatDataRelativa(veiculo.atualizado_em)} />
          <SidebarRow
            icon={Wrench}
            label="Próxima manutenção"
            value={
              proximaManutencao
                ? `${MANUTENCAO_TIPO_LABEL[proximaManutencao.tipo]} em ${formatDataSimples(proximaManutencao.data_agendada)}`
                : 'Nenhuma agendada'
            }
          />
          <SidebarRow
            icon={FileText}
            label="Próximo documento a vencer"
            value={
              proximoDocumento
                ? `${proximoDocumento.label} — ${proximoDocumento.dias < 0 ? `venceu há ${Math.abs(proximoDocumento.dias)}d` : `em ${proximoDocumento.dias}d`}`
                : 'Nenhum com validade cadastrada'
            }
          />
          <SidebarRow
            icon={MessageSquare}
            label="Último comentário"
            value={ultimoComentario ? ultimoComentario.texto : 'Nenhum ainda'}
          />
          <SidebarRow
            icon={History}
            label="Último evento"
            value={ultimoEvento ? ultimoEvento.descricao : 'Nenhum ainda'}
          />
          <SidebarRow icon={User2} label="Responsável" value="—" />
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <Button type="button" variant="default" size="sm" className="w-full justify-start" onClick={onScrollToActions}>
          <Sparkles className="h-4 w-4" />
          Nova ação
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => onAction('relatorio')}
        >
          <FileDown className="h-4 w-4" />
          Gerar relatório
        </Button>
        <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={copiar}>
          {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copiado ? 'Link copiado!' : 'Compartilhar'}
        </Button>
      </div>
    </aside>
  );
}
