import { Car, Calendar, Wallet, Gauge } from 'lucide-react';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import { CONTRATO_PERIODICIDADE_LABEL } from '@/features/contracts/types';
import { StatusBadge } from '@/features/contracts/components/StatusBadge';
import { VEICULO_CATEGORIA_LABEL } from '@/features/frota/types';
import { useMeuContrato } from '../hooks/useMeuContrato';

function Linha({ icon: Icon, label, value }: { icon: typeof Car; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-neutral-500">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
    </div>
  );
}

// Épico 11 — App do Motorista, Fase 1. Primeira tela real do portal: "onde estou, o que
// dirijo". Só leitura — nenhuma edição, nenhum número recalculado aqui (mesma regra de sempre:
// vem direto do que a RLS da migration 0034 já devolve).
export function MeuContratoPage() {
  const { data: usuario } = useCurrentUsuario();
  const resultado = useMeuContrato();

  if (resultado.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />
      </div>
    );
  }

  if (resultado.isError) {
    return <p className="text-sm text-red-600">Não foi possível carregar seus dados agora. Tente novamente em instantes.</p>;
  }

  const primeiroNome = usuario?.nome_completo?.split(' ')[0];

  if (!resultado.contratoAtivo) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
        </h1>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-neutral-500">Nenhum contrato encontrado ainda. Fale com a locadora se isso não for esperado.</p>
        </div>
      </div>
    );
  }

  const { contratoAtivo: contrato } = resultado;
  const veiculo = contrato.veiculo;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
      </h1>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Meu contrato</h2>
          <StatusBadge status={contrato.status} />
        </div>
        <div className="mt-1 divide-y divide-neutral-100 dark:divide-white/5">
          <Linha
            icon={Wallet}
            label={`Valor ${CONTRATO_PERIODICIDADE_LABEL[contrato.periodicidade].toLowerCase()}`}
            value={formatMoeda(contrato.valor_periodico)}
          />
          <Linha icon={Calendar} label="Início" value={formatDataSimples(contrato.data_inicio)} />
          <Linha
            icon={Calendar}
            label="Previsão de término"
            value={contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : 'Sem data definida'}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Meu veículo</h2>
        <div className="mt-1 divide-y divide-neutral-100 dark:divide-white/5">
          <Linha icon={Car} label="Placa" value={veiculo.placa} />
          <Linha icon={Car} label="Modelo" value={`${veiculo.marca?.nome ?? ''} ${veiculo.modelo?.nome ?? ''}`.trim() || '—'} />
          <Linha icon={Car} label="Categoria" value={VEICULO_CATEGORIA_LABEL[veiculo.categoria]} />
          <Linha icon={Gauge} label="Quilometragem" value={`${veiculo.quilometragem.toLocaleString('pt-BR')} km`} />
        </div>
      </section>
    </div>
  );
}
