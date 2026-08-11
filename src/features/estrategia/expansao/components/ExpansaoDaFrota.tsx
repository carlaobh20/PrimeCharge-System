import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Wallet, TrendingDown, Landmark, Car } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { useEstadoRealFrota } from '../hooks/useEstadoRealFrota';
import { useCenariosExpansao, useCriarCenarioExpansao, useAtualizarCenarioExpansao } from '../hooks/useCenarioExpansao';
import { compararEstrategias } from '../intelligence/motor';
import { ESTRATEGIA_LABEL, type CenarioExpansaoInput, type EstrategiaExpansao } from '../types';

// Épico 9 — Motor de Expansão da Frota, Fase 1. Responde "com o capital/patrimônio/caixa/dívida
// atuais, quantos veículos a empresa consegue adicionar e qual a melhor estrutura?" — sempre
// contra o ESTADO REAL da frota (useEstadoRealFrota, ao vivo, nunca persistido), nunca um número
// hipotético desconectado (essa é a Central de Decisão, aba anterior). Mesmo padrão de autosave
// debounced da SimulacaoEmpresarial (Épico 3) — sem botão "Salvar", cada alteração recalcula na
// hora e persiste sozinha alguns segundos depois de parar de digitar.
//
// [ATENÇÃO — GAP CONHECIDO]: esta sessão sofreu um corte de contexto no meio da implementação do
// Épico 9 e a lista exata de gráficos pedida no brief original ("×5 gráficos", conforme minha
// própria lista de tarefas) não estava mais disponível quando esta tela foi construída. Entreguei
// 1 gráfico (Saldo devedor × Equity incremental, estratégia Balanceada) que responde diretamente
// à pergunta central — não inventei os outros 4 sem saber quais o Carlos pediu. Reportado no
// relatório de entrega (tarefa #89).

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

  // Carrega o cenário mais recente uma única vez; se não existir nenhum, pré-preenche a partir
  // do caixa real (migration 0032: capital_disponivel "pré-preenchido com o caixa real na
  // criação, mas editável"). Não sobrescreve o que o dono está digitando se o React Query
  // revalidar em segundo plano depois disso.
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
  // cenario_expansao completo (com id) — necessário como CenarioExpansao pra calcularExpansao;
  // como o motor não usa id/empresa_id/criado_por/timestamps, um objeto parcial tipado é seguro.
  const cenarioCompleto = { ...input, id: cenarioIdRef.current ?? 'novo', empresa_id: usuario?.empresa_id ?? '', criado_por: null, criado_em: '', atualizado_em: '' };
  const comparacao = compararEstrategias(cenarioCompleto, veiculos);
  const foco = comparacao[estrategiaFoco];

  const chartData = foco.meses.map((m) => ({
    mes: m.mes,
    saldoDevedor: m.saldoDevedorIncremental,
    equity: m.equityIncremental,
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Wallet} label="Caixa real" value={formatMoeda(estadoReal.caixaAtual)} hint="calcularSaldoPorConta, ao vivo" />
        <KpiCard icon={TrendingDown} label="Dívida real" value={formatMoeda(estadoReal.dividaAtual)} hint="saldo devedor dos financiamentos ativos" />
        <KpiCard icon={Landmark} label="Equity real" value={formatMoeda(estadoReal.equityFrota)} hint="valor da frota − dívida" />
        <KpiCard
          icon={Car}
          label="Frota atual"
          value={`${estadoReal.veiculosAtuais}`}
          hint={estadoReal.veiculosComValorConhecido < estadoReal.veiculosAtuais ? `${estadoReal.veiculosAtuais - estadoReal.veiculosComValorConhecido} sem valor cadastrado` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Premissas do próximo veículo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <CampoMoeda label="Capital disponível" chave="capital_disponivel" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Reserva mínima" chave="reserva_minima" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Preço do veículo" chave="preco_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Entrada por veículo" chave="entrada_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoNumero label="Taxa de juros (% a.m.)" chave="taxa_juros_am_pct" input={input} onChange={atualizarCampo} step={0.01} />
          <CampoNumero label="Prazo (meses)" chave="prazo_financiamento_meses" input={input} onChange={atualizarCampo} step={1} />
          <CampoMoeda label="Aluguel semanal/veículo" chave="aluguel_semanal_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoNumero label="Ocupação (%)" chave="ocupacao_pct" input={input} onChange={atualizarCampo} step={1} />
          <CampoNumero label="KM mensal/veículo" chave="km_mensal_por_veiculo" input={input} onChange={atualizarCampo} step={100} />
          <CampoMoeda label="Seguro mensal/veículo" chave="seguro_mensal_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="IPVA anual/veículo" chave="ipva_anual_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoMoeda label="Rastreador mensal/veículo" chave="rastreador_mensal_por_veiculo" input={input} onChange={atualizarCampo} />
          <CampoNumero label="Manutenção por km (R$)" chave="manutencao_por_km" input={input} onChange={atualizarCampo} step={0.01} />
          <CampoMoeda label="Contador mensal (empresa)" chave="contador_mensal" input={input} onChange={atualizarCampo} />
          <CampoNumero label="Horizonte (meses)" chave="horizonte_meses" input={input} onChange={atualizarCampo} step={12} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparação de estratégias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-white/10">
                  <th className="py-2 pr-4">Estratégia</th>
                  <th className="py-2 pr-4">Veículos que cabem</th>
                  <th className="py-2 pr-4">Capital usado</th>
                  <th className="py-2 pr-4">Capital disponível p/ aquisição</th>
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
                      <td className="py-2 pr-4 font-medium" style={{ color: ESTRATEGIA_COR[chave] }}>
                        {ESTRATEGIA_LABEL[chave]}
                      </td>
                      <td className="py-2 pr-4">{r.veiculosAdicionadosTotal}</td>
                      <td className="py-2 pr-4">{formatMoeda(r.capitalUsadoTotal)}</td>
                      <td className="py-2 pr-4">{formatMoeda(r.capitalDisponivelParaAquisicao)}</td>
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
          <p className="mt-3 text-xs text-neutral-400">
            Clique numa linha para ver a projeção detalhada dessa estratégia no gráfico abaixo. Definição de cada estratégia (fração do capital comprometida / reserva exigida / uso de capital reciclável) está documentada em <code>expansao/intelligence/estrategias.ts</code> — é uma hipótese de engenharia financeira desta sessão, ainda não confirmada linha a linha contra o brief original.
          </p>
        </CardContent>
      </Card>

      {foco.avisoCapitalInsuficienteParaUmVeiculo ? (
        <EmptyState
          icon={TrendingDown}
          title="Nenhum veículo cabe nesta estratégia"
          description="O capital disponível para aquisição, nesta estratégia, não cobre nem a entrada + reserva mínima de 1 veículo. Ajuste as premissas acima ou escolha uma estratégia mais agressiva."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Saldo devedor × Equity — {ESTRATEGIA_LABEL[estrategiaFoco]} ({foco.veiculosAdicionadosTotal} veículo(s) novo(s))</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                <XAxis dataKey="mes" fontSize={11} tickFormatter={(v) => `m${v}`} />
                <YAxis fontSize={11} tickFormatter={(v) => formatMoeda(v)} width={90} />
                <Tooltip formatter={(v) => formatMoeda(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
                <Legend />
                <Line type="monotone" dataKey="saldoDevedor" name="Saldo devedor" stroke="#ef4444" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="equity" name="Equity" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
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
      <Label htmlFor={chave} className="text-xs text-neutral-500">
        {label}
      </Label>
      <Input
        id={chave}
        type="number"
        step="0.01"
        inputMode="decimal"
        className="h-8 text-sm"
        value={Number(input[chave]) || 0}
        onChange={(e) => onChange({ [chave]: Number(e.target.value) } as Partial<CenarioExpansaoInput>)}
      />
    </div>
  );
}

function CampoNumero({
  label,
  chave,
  input,
  onChange,
  step,
}: {
  label: string;
  chave: keyof CenarioExpansaoInput;
  input: CenarioExpansaoInput;
  onChange: (patch: Partial<CenarioExpansaoInput>) => void;
  step: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={chave} className="text-xs text-neutral-500">
        {label}
      </Label>
      <Input
        id={chave}
        type="number"
        step={step}
        inputMode="decimal"
        className="h-8 text-sm"
        value={Number(input[chave]) || 0}
        onChange={(e) => onChange({ [chave]: Number(e.target.value) } as Partial<CenarioExpansaoInput>)}
      />
    </div>
  );
}
