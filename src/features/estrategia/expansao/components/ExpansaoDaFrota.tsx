import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Wallet, TrendingDown, Landmark, Car, Recycle, Target, Info } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { useEstadoRealFrota } from '../hooks/useEstadoRealFrota';
import { useCenariosExpansao, useCriarCenarioExpansao, useAtualizarCenarioExpansao } from '../hooks/useCenarioExpansao';
import { compararEstrategias } from '../intelligence/motor';
import { ESTRATEGIAS } from '../intelligence/estrategias';
import { ESTRATEGIA_LABEL, type CenarioExpansaoInput, type EstrategiaExpansao } from '../types';

// Épico 9 — Motor de Expansão da Frota. Fase 1 (2026-08-11) + correções da Fase 1.1
// (2026-08-11, mesmo dia, pedido de fechamento do Carlos): separação explícita caixa × equity ×
// capital reciclável (nunca somados silenciosamente — seção 7/8), estratégias com parâmetros
// visíveis na tela (seção 4), inputs monetários com máscara (seção 5), rotulagem DADO REAL /
// PREMISSA / PROJEÇÃO / ESTIMATIVA (seção 17), Ciclo de Expansão com Próximo Marco (seções 9/11)
// e os 5 gráficos pedidos (seção 12), todos lendo o mesmo MesExpansao do motor — nenhum cálculo
// independente no componente.

function extrairInput(c: Record<string, unknown>): CenarioExpansaoInput {
  const { id: _id, empresa_id: _empresaId, criado_por: _criadoPor, criado_em: _criadoEm, atualizado_em: _atualizadoEm, ...resto } = c;
  return resto as CenarioExpansaoInput;
}

function cenarioPadrao(caixaReal: number): CenarioExpansaoInput {
  return {
    nome: 'Cenário principal',
    capital_disponivel: Math.max(0, Math.round(caixaReal)),
    reserva_minima: 0,
    preco_veiculo: 116_000,
    entrada_por_veiculo: 36_000,
    taxa_juros_am_pct: 1.19,
    prazo_financiamento_meses: 36,
    sistema_amortizacao: 'price',
    aluguel_semanal_por_veiculo: 1400,
    ocupacao_pct: 95,
    km_mensal_por_veiculo: 5000,
    seguro_mensal_por_veiculo: 500,
    ipva_anual_por_veiculo: 2500,
    rastreador_mensal_por_veiculo: 79,
    manutencao_por_km: 0.15,
    contador_mensal: 0,
    aliquota_tributos_pct: 0,
    horizonte_meses: 36,
    venda_programada_mes: null,
    venda_valor_estimado: null,
    venda_custos_pct: 0,
    dscr_minimo_saudavel: 1.5,
    dscr_minimo_atencao: 1.1,
  };
}

const ESTRATEGIA_COR: Record<EstrategiaExpansao, string> = {
  conservadora: '#6366f1',
  balanceada: '#10b981',
  agressiva: '#ef4444',
};

function formatPct(valor: number, casas = 2): string {
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

// Selo pequeno que classifica a natureza do número (seção 17, obrigatório: usuário precisa saber
// se está vendo "R$ 100.000 reais no banco" ou "R$ 100.000 estimados").
function Selo({ tipo }: { tipo: 'real' | 'premissa' | 'projecao' | 'estimativa' }) {
  const estilos: Record<typeof tipo, string> = {
    real: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    premissa: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    projecao: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    estimativa: 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-400',
  };
  const texto: Record<typeof tipo, string> = {
    real: 'DADO REAL',
    premissa: 'PREMISSA',
    projecao: 'PROJEÇÃO',
    estimativa: 'ESTIMATIVA',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${estilos[tipo]}`}>{texto[tipo]}</span>;
}

export function ExpansaoDaFrota() {
  const { data: usuario } = useCurrentUsuario();
  const estadoRealResult = useEstadoRealFrota();
  const { data: cenarios, isLoading: carregandoCenarios } = useCenariosExpansao();
  const criar = useCriarCenarioExpansao(usuario?.empresa_id ?? undefined, usuario?.id);
  const atualizar = useAtualizarCenarioExpansao();

  const [input, setInput] = useState<CenarioExpansaoInput | null>(null);
  const [inicializado, setInicializado] = useState(false);
  const [status, setStatus] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const [estrategiaFoco, setEstrategiaFoco] = useState<EstrategiaExpansao>('balanceada');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cenarioIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (inicializado || carregandoCenarios || estadoRealResult.isLoading) return;
    if (cenarios && cenarios.length > 0) {
      cenarioIdRef.current = cenarios[0].id;
      setInput(extrairInput(cenarios[0]));
    } else if (!estadoRealResult.isError) {
      setInput(cenarioPadrao(estadoRealResult.estadoReal.caixaAtual));
    } else {
      setInput(cenarioPadrao(0));
    }
    setInicializado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicializado, carregandoCenarios, estadoRealResult.isLoading, cenarios]);

  useEffect(() => {
    if (!inicializado || !input) return;
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

  function atualizarCampo(patch: Partial<CenarioExpansaoInput>) {
    setInput((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  if (estadoRealResult.isLoading || !inicializado || !input) {
    return (
      <div className="space-y-4">
        <div className="h-24 cockpit-shimmer rounded-2xl" />
        <div className="h-64 cockpit-shimmer rounded-2xl" />
      </div>
    );
  }

  if (estadoRealResult.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        Não consegui calcular o estado real da frota (caixa/dívida/equity).
        <br />
        Detalhe técnico: {extrairMensagemTecnicaDeErro(estadoRealResult.error)}
      </div>
    );
  }

  const { estadoReal, veiculos } = estadoRealResult;
  const cenarioCompleto = { ...input, id: cenarioIdRef.current ?? 'novo', empresa_id: usuario?.empresa_id ?? '', criado_por: null, criado_em: '', atualizado_em: '' };
  const comparacao = compararEstrategias(cenarioCompleto, veiculos);
  const foco = comparacao[estrategiaFoco];

  const sobraAposCompraInicial = foco.meses[0]?.caixaDisponivelParaAquisicao ?? 0;
  const gapProximoVeiculo = Math.max(0, foco.reservaMinimaAplicada + input.entrada_por_veiculo - sobraAposCompraInicial);

  const chartData = foco.meses.map((m) => ({
    mes: m.mes,
    frota: m.veiculosNovos,
    caixaOperacional: m.caixaOperacionalAcumulado,
    saldoDevedor: m.saldoDevedorIncremental,
    equity: m.equityIncremental,
    patrimonioTotal: m.patrimonioTotalIncremental,
  }));

  return (
    <div className="space-y-6">
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

      {/* Estado real — seção 7/8: Caixa, Equity e Capital reciclável são 3 números SEPARADOS,
          nunca somados automaticamente entre si. */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Estado real da frota</h3>
          <Selo tipo="real" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Wallet} label="Caixa atual" value={formatMoeda(estadoReal.caixaAtual)} hint="calcularSaldoPorConta, ao vivo — dinheiro na conta hoje" />
          <KpiCard icon={TrendingDown} label="Dívida atual" value={formatMoeda(estadoReal.dividaAtual)} hint="saldo devedor dos financiamentos ativos" />
          <KpiCard icon={Landmark} label="Equity realizável" value={formatMoeda(estadoReal.equityFrota)} hint="valor da frota − dívida. NÃO é caixa: só vira dinheiro se vender/refinanciar." />
          <KpiCard
            icon={Recycle}
            label="Capital reciclável potencial"
            value={formatMoeda(comparacao.balanceada.capitalReciclavelPotencial)}
            hint="veículos já marcados para venda, líquido de dívida e custo. NÃO incluído automaticamente em nenhuma estratégia abaixo."
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
          <Car className="h-3.5 w-3.5" /> Frota atual: {estadoReal.veiculosAtuais} veículo(s)
          {estadoReal.veiculosComValorConhecido < estadoReal.veiculosAtuais && ` (${estadoReal.veiculosAtuais - estadoReal.veiculosComValorConhecido} sem valor cadastrado)`}
        </div>
      </div>

      {/* Ciclo de Expansão — seções 9/11: Hoje / Próxima expansão / Próximo marco. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" /> Ciclo de Expansão — estratégia {ESTRATEGIA_LABEL[estrategiaFoco]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hoje</span>
                <Selo tipo="real" />
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Frota</dt><dd className="font-medium">{estadoReal.veiculosAtuais}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Caixa</dt><dd className="font-medium">{formatMoeda(estadoReal.caixaAtual)}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Dívida</dt><dd className="font-medium">{formatMoeda(estadoReal.dividaAtual)}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Equity</dt><dd className="font-medium">{formatMoeda(estadoReal.equityFrota)}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Capital reciclável</dt><dd className="font-medium">{formatMoeda(foco.capitalReciclavelPotencial)}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Próxima expansão</span>
                <Selo tipo="projecao" />
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Próximo carro</dt><dd className="font-medium">#{foco.veiculosAdicionadosTotal + 1}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Entrada necessária</dt><dd className="font-medium">{formatMoeda(input.entrada_por_veiculo + foco.reservaMinimaAplicada)}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Capital disponível</dt><dd className="font-medium">{formatMoeda(sobraAposCompraInicial)}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Gap</dt>
                  <dd className={`font-medium ${gapProximoVeiculo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{gapProximoVeiculo > 0 ? formatMoeda(gapProximoVeiculo) : 'Nenhum — já cabe'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Próximo marco</span>
                <Selo tipo="projecao" />
              </div>
              {foco.proximoMarco.possivel ? (
                <p className="text-sm">
                  Você consegue adicionar o próximo veículo em aproximadamente{' '}
                  <span className="font-semibold text-emerald-600">{foco.proximoMarco.mesesAteProximoVeiculo} mês(es)</span>, se o caixa operacional projetado desta expansão se confirmar.
                </p>
              ) : (
                <p className="text-sm text-neutral-500">{foco.proximoMarco.motivo}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Premissas do próximo veículo <Selo tipo="premissa" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <CampoMoeda label="Capital disponível" chave="capital_disponivel" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Reserva mínima" chave="reserva_minima" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Preço do veículo" chave="preco_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Entrada por veículo" chave="entrada_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoPercentual label="Taxa de juros" chave="taxa_juros_am_pct" input={input} onChange={atualizarCampo} sufixo="% a.m." />
          <CampoInteiro label="Prazo" chave="prazo_financiamento_meses" input={input} onChange={atualizarCampo} sufixo="meses" />
          <CampoMoeda label="Aluguel semanal/veículo" chave="aluguel_semanal_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoPercentual label="Ocupação" chave="ocupacao_pct" input={input} onChange={atualizarCampo} sufixo="%" />
          <CampoInteiro label="KM mensal/veículo" chave="km_mensal_por_veiculo" input={input} onChange={atualizarCampo} sufixo="km" />
          <CampoMoeda label="Seguro mensal/veículo" chave="seguro_mensal_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="IPVA anual/veículo" chave="ipva_anual_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Rastreador mensal/veículo" chave="rastreador_mensal_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Manutenção por km (R$)" chave="manutencao_por_km" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Contador mensal (empresa)" chave="contador_mensal" input={input} onChange={atualizarCampo} />
          <CampoInteiro label="Horizonte" chave="horizonte_meses" input={input} onChange={atualizarCampo} sufixo="meses" />
          <CampoPercentual label="DSCR mínimo saudável" chave="dscr_minimo_saudavel" input={input} onChange={atualizarCampo} sufixo="×" casas={2} />
          <CampoPercentual label="DSCR mínimo de atenção" chave="dscr_minimo_atencao" input={input} onChange={atualizarCampo} sufixo="×" casas={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" /> Parâmetros da estratégia — o que cada uma realmente faz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-neutral-400">
            Não são regra financeira universal — são 3 configurações fixas desta implementação (Regra dos 3). Editáveis no código (<code>expansao/intelligence/estrategias.ts</code>) se você quiser outros valores.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-white/10">
                  <th className="py-2 pr-4">Estratégia</th>
                  <th className="py-2 pr-4">% do capital disponível usado</th>
                  <th className="py-2 pr-4">Reserva exigida (neste cenário)</th>
                  <th className="py-2 pr-4">Capital para aquisição (neste cenário)</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(ESTRATEGIAS) as EstrategiaExpansao[]).map((chave) => {
                  const p = ESTRATEGIAS[chave];
                  const r = comparacao[chave];
                  return (
                    <tr key={chave} className="border-b border-neutral-100 dark:border-white/5">
                      <td className="py-2 pr-4 font-medium" style={{ color: ESTRATEGIA_COR[chave] }}>{ESTRATEGIA_LABEL[chave]}</td>
                      <td className="py-2 pr-4">{formatPct(p.fracaoCapitalUsavel * 100, 0)}</td>
                      <td className="py-2 pr-4">{formatMoeda(r.reservaMinimaAplicada)} <span className="text-neutral-400">({p.multiplicadorReserva}× a reserva do cenário)</span></td>
                      <td className="py-2 pr-4 font-medium">{formatMoeda(r.capitalDisponivelParaAquisicao)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Comparação de estratégias <Selo tipo="projecao" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-white/10">
                  <th className="py-2 pr-4">Estratégia</th>
                  <th className="py-2 pr-4">Veículos que cabem</th>
                  <th className="py-2 pr-4">Capital usado</th>
                  <th className="py-2 pr-4">Parcela/veículo</th>
                  <th className="py-2 pr-4">DSCR (mês 1)</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(comparacao) as EstrategiaExpansao[]).map((chave) => {
                  const r = comparacao[chave];
                  const mes1 = r.meses.find((m) => m.mes === 1);
                  return (
                    <tr
                      key={chave}
                      onClick={() => setEstrategiaFoco(chave)}
                      className={`cursor-pointer border-b border-neutral-100 dark:border-white/5 ${chave === estrategiaFoco ? 'bg-neutral-50 dark:bg-white/[0.04]' : ''}`}
                    >
                      <td className="py-2 pr-4 font-medium" style={{ color: ESTRATEGIA_COR[chave] }}>{ESTRATEGIA_LABEL[chave]}</td>
                      <td className="py-2 pr-4">{r.veiculosAdicionadosTotal}</td>
                      <td className="py-2 pr-4">{formatMoeda(r.capitalUsadoTotal)}</td>
                      <td className="py-2 pr-4">{formatMoeda(r.parcelaMensalPorVeiculo)}</td>
                      <td className="py-2 pr-4">{mes1?.dscr !== null && mes1?.dscr !== undefined ? mes1.dscr.toFixed(2) : '—'}</td>
                      <td className="py-2 pr-4">
                        {r.avisoCapitalInsuficienteParaUmVeiculo ? (
                          <span className="font-medium text-red-600">Capital insuficiente</span>
                        ) : mes1?.statusDscr === 'insuficiente' ? (
                          <span className="font-medium text-red-600">DSCR insuficiente</span>
                        ) : mes1?.statusDscr === 'atencao' ? (
                          <span className="font-medium text-amber-600">Atenção</span>
                        ) : (
                          <span className="font-medium text-emerald-600">Saudável</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neutral-400">Clique numa linha para focar o Ciclo de Expansão e os gráficos abaixo nessa estratégia.</p>
        </CardContent>
      </Card>

      {foco.avisoCapitalInsuficienteParaUmVeiculo ? (
        <EmptyState
          icon={TrendingDown}
          title="Nenhum veículo cabe nesta estratégia"
          description="O capital disponível para aquisição, nesta estratégia, não cobre nem a entrada + reserva mínima de 1 veículo. Ajuste as premissas acima ou escolha uma estratégia mais agressiva."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <GraficoLinha titulo="Frota — veículos desta expansão" data={chartData} linhas={[{ key: 'frota', nome: 'Veículos', cor: '#6366f1' }]} formatador={(v) => `${v}`} />
          <GraficoLinha titulo="Caixa operacional acumulado (desta expansão)" data={chartData} linhas={[{ key: 'caixaOperacional', nome: 'Caixa operacional', cor: '#10b981' }]} />
          <GraficoLinha titulo="Dívida incremental" data={chartData} linhas={[{ key: 'saldoDevedor', nome: 'Saldo devedor', cor: '#ef4444' }]} />
          <GraficoLinha titulo="Equity incremental" data={chartData} linhas={[{ key: 'equity', nome: 'Equity', cor: '#f59e0b' }]} />
          <div className="xl:col-span-2">
            <GraficoLinha titulo="Patrimônio total incremental (caixa operacional + equity)" data={chartData} linhas={[{ key: 'patrimonioTotal', nome: 'Patrimônio total', cor: '#0ea5e9' }]} />
          </div>
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Todos os gráficos acima são "incrementais": mostram só os {foco.veiculosAdicionadosTotal} veículo(s) novo(s) desta expansão (estratégia {ESTRATEGIA_LABEL[estrategiaFoco]}), não a frota da empresa inteira nem a dívida/equity dos veículos já existentes — a amortização da frota atual não é projetada para o futuro nesta fase.
      </p>
    </div>
  );
}

function GraficoLinha({
  titulo,
  data,
  linhas,
  formatador,
}: {
  titulo: string;
  data: { mes: number }[];
  linhas: { key: string; nome: string; cor: string }[];
  formatador?: (v: number) => string;
}) {
  const fmt = formatador ?? ((v: number) => formatMoeda(v));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="mes" fontSize={11} tickFormatter={(v) => `m${v}`} />
            <YAxis fontSize={11} tickFormatter={fmt} width={90} />
            <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
            <Legend />
            {linhas.map((l) => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.nome} stroke={l.cor} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CampoMoeda({
  label,
  chave,
  input,
  onChange,
}: {
  label: string;
  chave: keyof CenarioExpansaoInput;
  input: CenarioExpansaoInput;
  onChange: (patch: Partial<CenarioExpansaoInput>) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={chave} className="text-xs text-neutral-500">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">R$</span>
        <Input
          id={chave}
          type="text"
          inputMode="numeric"
          className="h-8 pl-7 text-right text-sm"
          value={formatarMoedaInput(Number(input[chave]) || 0)}
          onChange={(e) => onChange({ [chave]: digitosParaReais(e.target.value) } as Partial<CenarioExpansaoInput>)}
        />
      </div>
    </div>
  );
}

function CampoPercentual({
  label,
  chave,
  input,
  onChange,
  sufixo = '%',
  casas = 2,
}: {
  label: string;
  chave: keyof CenarioExpansaoInput;
  input: CenarioExpansaoInput;
  onChange: (patch: Partial<CenarioExpansaoInput>) => void;
  sufixo?: string;
  casas?: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={chave} className="text-xs text-neutral-500">{label}</Label>
      <div className="relative">
        <Input
          id={chave}
          type="number"
          step={casas === 0 ? 1 : Math.pow(10, -casas)}
          inputMode="decimal"
          className="h-8 pr-9 text-right text-sm"
          value={Number(input[chave]) || 0}
          onChange={(e) => onChange({ [chave]: Number(e.target.value) } as Partial<CenarioExpansaoInput>)}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{sufixo}</span>
      </div>
    </div>
  );
}

function CampoInteiro({
  label,
  chave,
  input,
  onChange,
  sufixo,
}: {
  label: string;
  chave: keyof CenarioExpansaoInput;
  input: CenarioExpansaoInput;
  onChange: (patch: Partial<CenarioExpansaoInput>) => void;
  sufixo?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={chave} className="text-xs text-neutral-500">{label}</Label>
      <div className="relative">
        <Input
          id={chave}
          type="number"
          step={1}
          inputMode="numeric"
          className="h-8 pr-14 text-right text-sm"
          value={Number(input[chave]) || 0}
          onChange={(e) => onChange({ [chave]: e.target.value === '' ? 0 : Math.round(Number(e.target.value)) } as Partial<CenarioExpansaoInput>)}
        />
        {sufixo && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{sufixo}</span>}
      </div>
    </div>
  );
}
