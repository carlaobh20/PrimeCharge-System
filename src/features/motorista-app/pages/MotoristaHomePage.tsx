import { Link } from 'react-router-dom';
import { Wallet, ShoppingBag, FileText, LifeBuoy, ChevronRight, type LucideIcon } from 'lucide-react';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import { VEICULO_STATUS_LABEL } from '@/features/frota/types';
import { Secao, Pill, SkeletonPortal, ErroPortal } from '../components/ui';
import { useMeuContrato } from '../hooks/useMeuContrato';
import { useMinhasCobrancas } from '../hooks/useMotoristaApp';
import { situacaoFinanceira } from '../lib/statusCobranca';

// Épico 11 — App do Motorista, Fase 1. Home: primeira coisa que o motorista vê. Responde
// "meu carro tá ok? devo algo? pra onde vou?" em uma olhada. Só leitura, motores derivam.

// Atalho grande de navegação — alvo de toque generoso (min-h-20), estilo consistente.
function Atalho({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-20 flex-col items-start justify-between rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</span>
    </Link>
  );
}

// Os 4 atalhos são sempre exibidos; ordem = frequência de uso esperada.
function GradeAtalhos() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Atalho to="/motorista/pagamentos" icon={Wallet} label="Pagamentos" />
      <Atalho to="/motorista/lojinha" icon={ShoppingBag} label="Lojinha" />
      <Atalho to="/motorista/contrato" icon={FileText} label="Contrato" />
      <Atalho to="/motorista/suporte" icon={LifeBuoy} label="Suporte" />
    </div>
  );
}

export function MotoristaHomePage() {
  const { data: usuario } = useCurrentUsuario();
  const contratoResult = useMeuContrato();
  const cobrancas = useMinhasCobrancas();

  const primeiroNome = usuario?.nome_completo?.split(' ')[0];
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}` : 'Olá';

  if (contratoResult.isLoading) return <SkeletonPortal />;

  // Erro do contrato: refetch das cobranças não resolve, então recarrega a página.
  if (contratoResult.isError) return <ErroPortal onRetry={() => window.location.reload()} />;

  const contrato = contratoResult.contratoAtivo;

  // Sem contrato ativo: ainda mostramos saudação, aviso e os atalhos de Lojinha/Suporte
  // (os únicos que fazem sentido sem contrato).
  if (!contrato) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{saudacao}</h1>
        <Secao>
          <p className="text-sm text-neutral-500">Nenhum contrato ativo. Fale com a locadora.</p>
        </Secao>
        <div className="grid grid-cols-2 gap-3">
          <Atalho to="/motorista/lojinha" icon={ShoppingBag} label="Lojinha" />
          <Atalho to="/motorista/suporte" icon={LifeBuoy} label="Suporte" />
        </div>
      </div>
    );
  }

  const veiculo = contrato.veiculo;
  const nomeVeiculo = `${veiculo.marca?.nome ?? ''} ${veiculo.modelo?.nome ?? ''}`.trim() || 'Veículo';
  // Verde só quando o carro está efetivamente em uso/pronto; demais estados são neutros.
  const tomVeiculo = veiculo.status === 'alugado' || veiculo.status === 'disponivel' ? 'verde' : 'neutro';

  // Situação financeira derivada pelo motor — a tela nunca recalcula vencimento.
  const lancamentos = cobrancas.data ?? [];
  const situacao = situacaoFinanceira(lancamentos);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{saudacao}</h1>

      {/* Card "Meu carro" */}
      <Secao titulo="Meu carro" acao={<Pill tom={tomVeiculo}>{VEICULO_STATUS_LABEL[veiculo.status]}</Pill>}>
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{nomeVeiculo}</p>
        <p className="text-sm text-neutral-500">{veiculo.placa}</p>
        <p className="mt-2 text-sm text-neutral-500">{veiculo.quilometragem.toLocaleString('pt-BR')} km</p>
        <Link
          to="/motorista/carro"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 dark:text-sky-400"
        >
          Ver meu carro <ChevronRight className="h-4 w-4" />
        </Link>
      </Secao>

      {/* Card "Minha situação" — depende das cobranças; trata loading/erro localmente
          sem derrubar o resto da Home. */}
      <Secao
        titulo="Minha situação"
        acao={
          cobrancas.isLoading || cobrancas.isError ? undefined : situacao.emDia ? (
            <Pill tom="verde">Em dia</Pill>
          ) : (
            <Pill tom="vermelho">{situacao.vencidas} em atraso</Pill>
          )
        }
      >
        {cobrancas.isLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
        ) : cobrancas.isError ? (
          <ErroPortal onRetry={() => cobrancas.refetch()} />
        ) : situacao.proxima ? (
          <>
            <p className="text-sm text-neutral-500">Próxima cobrança</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {formatMoeda(situacao.proxima.valor)}
              </span>
              <span className="text-sm text-neutral-500">
                Vence em {formatDataSimples(situacao.proxima.data_prevista)}
              </span>
            </div>
            <Link
              to="/motorista/pagamentos"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 dark:text-sky-400"
            >
              Ver pagamentos <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <p className="text-sm text-neutral-500">Nenhuma cobrança em aberto.</p>
        )}
      </Secao>

      {/* Atalhos grandes */}
      <GradeAtalhos />
    </div>
  );
}
