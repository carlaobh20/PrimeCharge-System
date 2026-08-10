import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { PainelDePremissas } from './PainelDePremissas';
import { VisaoExecutivaCard } from './VisaoExecutivaCard';
import { FluxoDeCaixaChart } from './FluxoDeCaixaChart';
import { SaldoDevedorPatrimonioChart } from './SaldoDevedorPatrimonioChart';
import { AmortizacaoCard } from './AmortizacaoCard';
import { LinhaDoTempo } from './LinhaDoTempo';
import { EvolucaoDoCaixaChart } from './EvolucaoDoCaixaChart';
import { EvolucaoPatrimonioCard } from './EvolucaoPatrimonioCard';
import { MomentoIdealDeCompraCard } from './MomentoIdealDeCompraCard';
import { FluxoDetalhadoTable } from './FluxoDetalhadoTable';
import { useCenarios, useCriarCenario, useAtualizarCenario } from '../hooks/useSimulacao';
import { usePoliticasEstrategicas } from '../hooks/usePoliticas';
import { useSimulacaoResultado } from '../hooks/useSimulacaoResultado';
import { useMomentoDeCompra } from '../hooks/useMomentoDeCompra';
import type { CenarioSimulacaoInput } from '../types';

const CENARIO_PADRAO: CenarioSimulacaoInput = {
  nome: 'Cenário principal',
  capital_disponivel: 50000,
  veiculos_iniciais: 1,
  valor_entrada_por_veiculo: 36000,
  valor_financiado_por_veiculo: 80000,
  taxa_juros_am_pct: 1.19,
  prazo_financiamento_meses: 36,
  aluguel_esperado_semanal_por_veiculo: 1400,
  ocupacao_esperada_pct: 95,
  inadimplencia_esperada_pct: 2,
  seguro_mensal_por_veiculo: 500,
  ipva_anual_por_veiculo: 2500,
  rastreador_mensal_por_veiculo: 79,
  lavagem_mensal_por_veiculo: 80,
  manutencao_mensal_por_veiculo: 120,
  depreciacao_am_pct: 1.2,
  licenciamento_anual_por_veiculo: 0,
  reinvestir_lucro: true,
  objetivo_veiculos: 10,
  prazo_desejado_meses: 60,
  amortizacao_estrategia: 'nunca',
  amortizacao_valor_manual: null,
  reserva_de_seguranca: 0,
  taxa_juros_investimento_aa_pct: 0,
  custo_abertura_empresa: 0,
  contador_mensal: 0,
  taxa_ir_pct: 0,
};

function extrairInput(c: Record<string, unknown>): CenarioSimulacaoInput {
  const { id: _id, empresa_id: _empresaId, criado_em: _criadoEm, atualizado_em: _atualizadoEm, ...resto } = c;
  return resto as CenarioSimulacaoInput;
}

// Épico 3 — Central de Decisão Empresarial (reconstrução completa, 2026-08-09). Fase 1: motor v2
// (saldo devedor/depreciação/patrimônio por veículo) + premissas em cards + Card 1 (Visão
// Executiva) + Card 2 (Fluxo de Caixa). Fase 2: Card 3 (Saldo Devedor×Patrimônio), Card 5 (Linha
// do Tempo), Card 6 (Evolução do Caixa), Card 7 (Evolução do Patrimônio). Fase 3 (mesmo dia):
// Card 4 (Amortização — motor passou a agir sobre amortizacao_estrategia) e Card 10 (Momento
// Ideal de Compra — motor isolado em intelligence/momentoDeCompra.ts, não reaproveita o motor
// principal porque a pergunta é outra: "comprar o próximo agora ou esperar", não "crescer até o
// objetivo"). Sem botão "Simular" — cada alteração recalcula na hora (tudo useMemo local) e salva
// sozinha no banco alguns segundos depois de parar de digitar (autosave debounced, não a cada
// tecla).
export function SimulacaoEmpresarial() {
  const { data: usuario } = useCurrentUsuario();
  const { data: cenarios, isLoading: carregandoCenarios } = useCenarios();
  const { data: politicas } = usePoliticasEstrategicas();
  const criar = useCriarCenario(usuario?.empresa_id ?? undefined, usuario?.id);
  const atualizar = useAtualizarCenario();

  const [input, setInput] = useState<CenarioSimulacaoInput>(CENARIO_PADRAO);
  const [inicializado, setInicializado] = useState(false);
  const [status, setStatus] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cenarioIdRef = useRef<string | null>(null);

  // Carrega o cenário mais recente uma única vez — não sobrescreve o que o dono está digitando
  // se o React Query revalidar a lista em segundo plano depois disso.
  useEffect(() => {
    if (inicializado || carregandoCenarios) return;
    if (cenarios && cenarios.length > 0) {
      cenarioIdRef.current = cenarios[0].id;
      setInput(extrairInput(cenarios[0]));
    }
    setInicializado(true);
  }, [inicializado, carregandoCenarios, cenarios]);

  useEffect(() => {
    if (!inicializado) return;
    setStatus('salvando');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (cenarioIdRef.current) {
        atualizar.mutate({ id: cenarioIdRef.current, payload: input }, { onSuccess: () => setStatus('salvo') });
      } else {
        criar.mutate(input, {
          onSuccess: (novo) => {
            cenarioIdRef.current = novo.id;
            setStatus('salvo');
          },
        });
      }
    }, 1200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, inicializado]);

  const resultado = useSimulacaoResultado(inicializado ? input : null);
  const momentoDeCompra = useMomentoDeCompra(inicializado ? input : null);
  const mesAtual = resultado?.meses[0];

  function atualizarCampo(patch: Partial<CenarioSimulacaoInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  if (!inicializado || carregandoCenarios) {
    return (
      <div className="space-y-4">
        <div className="h-64 cockpit-shimmer rounded-2xl" />
        <div className="h-96 cockpit-shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1.5 text-xs text-neutral-400">
        {status === 'salvando' ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
          </>
        ) : status === 'salvo' ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Salvo
          </>
        ) : null}
      </div>

      {/* Layout mudou de "30% premissas à esquerda / 70% resultado à direita" pra "premissas em
          faixa larga no topo, resultado embaixo" (pedido do Carlos, 2026-08-09) — preenche as
          premissas primeiro, os gráficos vêm depois, sem coluna estreita competindo por espaço. */}
      <PainelDePremissas valor={input} onChange={atualizarCampo} />

      <div className="min-w-0 space-y-4">
        {mesAtual && <VisaoExecutivaCard mesAtual={mesAtual} alavancagemMaximaPct={politicas?.alavancagem_maxima_pct ?? null} />}
        {/* Fluxo Detalhado (tabela ano a ano) vem antes do gráfico de Fluxo de Caixa — pedido
            explícito do Carlos: quem quer o número exato lê a tabela, quem quer a tendência olha
            o gráfico logo abaixo. */}
        {resultado && <FluxoDetalhadoTable meses={resultado.meses} />}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {resultado && <FluxoDeCaixaChart meses={resultado.meses} />}
          {resultado && <SaldoDevedorPatrimonioChart meses={resultado.meses} />}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AmortizacaoCard valor={input} onChange={atualizarCampo} mesAtual={mesAtual} />
          {resultado && <EvolucaoDoCaixaChart meses={resultado.meses} />}
        </div>
        {resultado && <EvolucaoPatrimonioCard meses={resultado.meses} />}
        {momentoDeCompra && <MomentoIdealDeCompraCard comparacao={momentoDeCompra} />}
        {resultado && <LinhaDoTempo meses={resultado.meses} />}
      </div>
    </div>
  );
}
