import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Zap,
  Fuel,
  Wrench,
  Shield,
  FileText,
  CircleDollarSign,
  CheckCircle2,
  Droplets,
  Calendar,
  CalendarDays,
  TrendingUp,
  CircleDot,
  Settings,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Battery,
  Heart,
  Brain,
  Smile,
  ChevronDown,
} from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import {
  carrosCombustao,
  planos,
  calcularEconomia,
  formatarMoeda,
  aluguelCombustaoSemanal,
  type TipoCombustivel,
  type PeriodoVisualizacao,
} from '../lib/carData';

// Port do comparador original (que usava framer-motion + Radix Select/Slider)
// para os primitivos deste app: <select>/<input type="range"> nativos e
// Link+buttonVariants no lugar de <Button asChild>. As cores trocam os tokens
// semânticos do site original (bg-primary, text-accent, text-destructive,
// bg-muted, text-muted-foreground...) — que não existem no tema deste projeto,
// sem tailwind.config nem tokens semânticos (ver src/styles/index.css) — por
// classes literais reaproveitando a paleta já usada no resto da landing: azul
// #388BFF (primary), verde #00E676 (accent / elétrico), vermelho #FF4D4D
// (destructive), zinc-400/500 (muted). `card-premium`, `pulse-green`,
// `glow-electric`, `.pc-comparison-table` e `.text-gradient-gold` continuam
// funcionando: são classes CSS literais definidas em landing.css (a de
// text-gradient-gold foi adicionada lá especificamente para este port).
const ComparadorSection = () => {
  const [carroSelecionado, setCarroSelecionado] = useState(carrosCombustao[0]);
  const [planoSelecionado, setPlanoSelecionado] = useState(planos[2]); // 6 meses default
  const [kmMensal, setKmMensal] = useState(3000);
  const [tipoCombustivel, setTipoCombustivel] = useState<TipoCombustivel>('gasolina');
  const [precoGasolina, setPrecoGasolina] = useState(5.8);
  const [precoEtanol, setPrecoEtanol] = useState(3.9);
  const [periodoVisualizacao, setPeriodoVisualizacao] = useState<PeriodoVisualizacao>('mensal');
  const [resultado, setResultado] = useState<ReturnType<typeof calcularEconomia> | null>(null);

  const precoCombustivel = tipoCombustivel === 'gasolina' ? precoGasolina : precoEtanol;
  const consumoAtual = tipoCombustivel === 'gasolina' ? carroSelecionado.consumoGasolina : carroSelecionado.consumoEtanol;

  useEffect(() => {
    const calc = calcularEconomia(carroSelecionado, kmMensal, precoCombustivel, planoSelecionado, tipoCombustivel);
    setResultado(calc);
  }, [carroSelecionado, kmMensal, precoCombustivel, planoSelecionado, tipoCombustivel]);

  const ajustarPeriodo = (valorMensal: number) => {
    if (periodoVisualizacao === 'semanal') return valorMensal / 4.33;
    if (periodoVisualizacao === 'anual') return valorMensal * 12;
    return valorMensal;
  };

  const getLabelPeriodo = () => {
    if (periodoVisualizacao === 'semanal') return 'semanal';
    if (periodoVisualizacao === 'anual') return 'anual';
    return 'mensal';
  };

  const linhasComparacao = resultado
    ? [
        {
          label: 'Combustível/Energia',
          proprio: ajustarPeriodo(resultado.combustao.combustivel),
          alugadoCombustao: ajustarPeriodo(resultado.combustaoAlugado.combustivel),
          eletrico: ajustarPeriodo(resultado.eletrico.energia),
          icon: tipoCombustivel === 'gasolina' ? Fuel : Droplets,
        },
        { label: 'Depreciação', proprio: ajustarPeriodo(resultado.combustao.depreciacao), alugadoCombustao: 0, eletrico: 0, icon: CircleDollarSign },
        { label: 'Revisões (10k km)', proprio: ajustarPeriodo(resultado.combustao.revisao), alugadoCombustao: 0, eletrico: 0, icon: Settings },
        { label: 'Pneus', proprio: ajustarPeriodo(resultado.combustao.pneus), alugadoCombustao: 0, eletrico: 0, icon: CircleDot },
        { label: 'Manutenção Geral', proprio: ajustarPeriodo(resultado.combustao.manutencaoGeral), alugadoCombustao: 0, eletrico: 0, icon: Wrench },
        { label: 'Seguro', proprio: ajustarPeriodo(resultado.combustao.seguro), alugadoCombustao: 0, eletrico: 0, icon: Shield },
        { label: 'IPVA', proprio: ajustarPeriodo(resultado.combustao.ipva), alugadoCombustao: 0, eletrico: 0, icon: FileText },
        { label: 'Aluguel Combustão', proprio: 0, alugadoCombustao: ajustarPeriodo(resultado.combustaoAlugado.aluguel), eletrico: 0, icon: Car },
        { label: 'Aluguel Elétrico', proprio: 0, alugadoCombustao: 0, eletrico: ajustarPeriodo(resultado.eletrico.aluguel), icon: Zap },
        {
          label: 'Rendimento Capital',
          proprio: 0,
          alugadoCombustao: -ajustarPeriodo(resultado.combustaoAlugado.rendimentoCapital),
          eletrico: -ajustarPeriodo(resultado.eletrico.rendimentoCapital),
          icon: TrendingUp,
          isPositive: true,
        },
        { label: 'Valor do Veículo', proprio: carroSelecionado.valor, alugadoCombustao: carroSelecionado.valor, eletrico: 139900, icon: Car, isValue: true },
      ]
    : [];

  return (
    <section id="comparador" className="py-4 sm:py-6 bg-transparent relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-[#388BFF]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-0 sm:px-0 relative z-10">
        {/* Toggle Período */}
        <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto pb-2">
          <div className="inline-flex bg-white/[0.05] backdrop-blur-sm rounded-full p-1 sm:p-1.5 border border-white/[0.07]">
            <button
              onClick={() => setPeriodoVisualizacao('semanal')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-full font-medium text-xs sm:text-base transition-all duration-300 whitespace-nowrap ${
                periodoVisualizacao === 'semanal' ? 'bg-[#388BFF] text-[#05070B] shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              Semanal
            </button>
            <button
              onClick={() => setPeriodoVisualizacao('mensal')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-full font-medium text-xs sm:text-base transition-all duration-300 whitespace-nowrap ${
                periodoVisualizacao === 'mensal' ? 'bg-[#388BFF] text-[#05070B] shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
              Mensal
            </button>
            <button
              onClick={() => setPeriodoVisualizacao('anual')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-full font-medium text-xs sm:text-base transition-all duration-300 whitespace-nowrap ${
                periodoVisualizacao === 'anual' ? 'bg-[#388BFF] text-[#05070B] shadow-lg' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              Anual
            </button>
          </div>
        </div>

        {/* Configurações */}
        <div className="card-premium mb-6 sm:mb-8 p-4 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Tipo de Combustível */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">Tipo de combustível</label>
              <div className="flex bg-white/[0.05] rounded-full p-1">
                <button
                  onClick={() => setTipoCombustivel('gasolina')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-medium transition-all duration-300 ${
                    tipoCombustivel === 'gasolina' ? 'bg-orange-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Fuel className="w-4 h-4" />
                  Gasolina
                </button>
                <button
                  onClick={() => setTipoCombustivel('etanol')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-medium transition-all duration-300 ${
                    tipoCombustivel === 'etanol' ? 'bg-green-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                  Etanol
                </button>
              </div>
            </div>

            {/* Seletor de Carro */}
            <div>
              <label htmlFor="comparador-modelo" className="text-sm font-medium text-zinc-400 mb-2 block">
                Modelo comparação
              </label>
              <div className="relative">
                <select
                  id="comparador-modelo"
                  aria-label="Modelo para comparação"
                  value={carroSelecionado.id}
                  onChange={(e) => {
                    const carro = carrosCombustao.find((c) => c.id === Number(e.target.value));
                    if (carro) setCarroSelecionado(carro);
                  }}
                  className="w-full appearance-none rounded-md border border-white/[0.07] bg-white/[0.05] px-3 py-2.5 pr-9 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#388BFF]"
                >
                  {carrosCombustao.map((carro) => (
                    <option key={carro.id} value={carro.id} className="bg-[#0b1321] text-white">
                      {carro.categoria === 'Comfort' ? 'Comfort' : 'X'} · {carro.marca} {carro.modelo}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              </div>
            </div>

            {/* Quilometragem */}
            <div>
              <label htmlFor="comparador-km" className="text-sm font-medium text-zinc-400 mb-2 block">
                Km mensal: <span className="text-[#388BFF] font-bold">{kmMensal.toLocaleString()} km</span>
              </label>
              <input
                id="comparador-km"
                type="range"
                aria-label="Quilometragem mensal"
                value={kmMensal}
                onChange={(e) => setKmMensal(Number(e.target.value))}
                min={1000}
                max={8000}
                step={100}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#388BFF] my-4"
              />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>1.000 km</span>
                <span>8.000 km</span>
              </div>
            </div>

            {/* Preço do Combustível */}
            <div>
              {tipoCombustivel === 'gasolina' ? (
                <>
                  <label htmlFor="comparador-gasolina" className="text-sm font-medium text-zinc-400 mb-2 block">
                    Gasolina: <span className="text-orange-400 font-bold">R$ {precoGasolina.toFixed(2)}</span>
                  </label>
                  <input
                    id="comparador-gasolina"
                    type="range"
                    aria-label="Preço da gasolina"
                    value={precoGasolina}
                    onChange={(e) => setPrecoGasolina(Number(e.target.value))}
                    min={5.0}
                    max={8.0}
                    step={0.1}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-orange-500 my-4"
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>R$ 5,00</span>
                    <span>R$ 8,00</span>
                  </div>
                </>
              ) : (
                <>
                  <label htmlFor="comparador-etanol" className="text-sm font-medium text-zinc-400 mb-2 block">
                    Etanol: <span className="text-green-400 font-bold">R$ {precoEtanol.toFixed(2)}</span>
                  </label>
                  <input
                    id="comparador-etanol"
                    type="range"
                    aria-label="Preço do etanol"
                    value={precoEtanol}
                    onChange={(e) => setPrecoEtanol(Number(e.target.value))}
                    min={3.0}
                    max={5.5}
                    step={0.1}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-500 my-4"
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>R$ 3,00</span>
                    <span>R$ 5,50</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/[0.07]">
            <div className="p-3 bg-white/[0.03] rounded-lg text-center">
              <p className="text-xs text-zinc-400">Consumo</p>
              <p className="font-bold text-white">{consumoAtual} km/l</p>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-lg text-center">
              <p className="text-xs text-zinc-400">Valor veículo</p>
              <p className="font-bold text-white">{formatarMoeda(carroSelecionado.valor)}</p>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-lg text-center">
              <p className="text-xs text-zinc-400">Aluguel combustão</p>
              <p className="font-bold text-white">{formatarMoeda(aluguelCombustaoSemanal[carroSelecionado.categoria])}/sem</p>
            </div>
            <div className="p-3 bg-[#00E676]/10 rounded-lg text-center border border-[#00E676]/20">
              <p className="text-xs text-zinc-400">Plano elétrico</p>
              <p className="font-bold text-[#00E676]">{formatarMoeda(planoSelecionado.preco)}/sem</p>
            </div>
          </div>

          {/* Seletor de Plano Elétrico */}
          <div className="mt-6 pt-6 border-t border-white/[0.07]">
            <label htmlFor="comparador-plano" className="text-sm font-medium text-zinc-400 mb-2 block">
              Plano RodaVolt (Elétrico)
            </label>
            <div className="relative max-w-md">
              <select
                id="comparador-plano"
                aria-label="Plano RodaVolt"
                value={planoSelecionado.id}
                onChange={(e) => {
                  const plano = planos.find((p) => p.id === Number(e.target.value));
                  if (plano) setPlanoSelecionado(plano);
                }}
                className="w-full appearance-none rounded-md border border-white/[0.07] bg-white/[0.05] px-3 py-2.5 pr-9 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#388BFF]"
              >
                {planos.map((plano) => (
                  <option key={plano.id} value={plano.id} className="bg-[#0b1321] text-white">
                    {plano.nome} - {formatarMoeda(plano.preco)}/semana
                    {plano.desconto > 0 && ` (-${plano.desconto}%)`}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Tabela de Comparação - 3 Colunas */}
        <p className="pc-table-hint">Deslize a tabela para os lados para comparar as três opções →</p>
        {resultado && (
          <div
            className="pc-comparison-table card-premium overflow-hidden p-0"
            role="region"
            aria-label="Tabela comparativa de custos. No celular, deslize para ver as três opções."
            tabIndex={0}
          >
            {/* Header - 4 colunas (categoria + 3 opções) */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2 p-2 sm:p-4 bg-white/[0.05] font-semibold text-xs sm:text-sm">
              <div className="text-zinc-400">Categoria</div>
              <div className="text-center">
                <div className="text-[#FF4D4D] text-xs sm:text-sm">🚗 Próprio</div>
                <div className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">Combustão</div>
              </div>
              <div className="text-center">
                <div className="text-orange-400 text-xs sm:text-sm">🔑 Alugado</div>
                <div className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">Combustão</div>
              </div>
              <div className="text-center">
                <div className="text-[#00E676] text-xs sm:text-sm">⚡ Elétrico</div>
                <div className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">Alugado</div>
              </div>
            </div>

            {linhasComparacao.map((linha) => (
              <div key={linha.label} className="grid grid-cols-4 gap-1 sm:gap-2 p-2 sm:p-3 md:p-4 border-t border-white/[0.07] items-center">
                <div className="flex items-center gap-1 sm:gap-2">
                  <linha.icon className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-400 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs md:text-sm text-white leading-tight">{linha.label}</span>
                </div>

                {/* Próprio/Combustão */}
                <div className="text-center">
                  {linha.isValue ? (
                    <span className="font-semibold text-[#388BFF] text-[10px] sm:text-xs md:text-sm">{formatarMoeda(linha.proprio)}</span>
                  ) : linha.isPositive && linha.proprio !== 0 ? (
                    <span className="font-semibold text-green-400 text-[10px] sm:text-xs md:text-sm">+{formatarMoeda(Math.abs(linha.proprio))}</span>
                  ) : (
                    <span className={`font-semibold text-[10px] sm:text-xs md:text-sm ${linha.proprio > 0 ? 'text-[#FF4D4D]' : 'text-zinc-400'}`}>
                      {linha.proprio > 0 ? formatarMoeda(linha.proprio) : '-'}
                    </span>
                  )}
                </div>

                {/* Alugado/Combustão */}
                <div className="text-center">
                  {linha.isValue ? (
                    <span className="font-semibold text-[#388BFF] text-[10px] sm:text-xs md:text-sm">{formatarMoeda(linha.alugadoCombustao)}</span>
                  ) : linha.isPositive && linha.alugadoCombustao !== 0 ? (
                    <span className="font-semibold text-green-400 text-[10px] sm:text-xs md:text-sm">+{formatarMoeda(Math.abs(linha.alugadoCombustao))}</span>
                  ) : (
                    <span className={`font-semibold text-[10px] sm:text-xs md:text-sm ${linha.alugadoCombustao > 0 ? 'text-orange-400' : 'text-zinc-400'}`}>
                      {linha.alugadoCombustao > 0 ? formatarMoeda(linha.alugadoCombustao) : linha.proprio > 0 ? 'Incl.' : '-'}
                    </span>
                  )}
                </div>

                {/* Alugado/Elétrico */}
                <div className="text-center">
                  {linha.isValue ? (
                    <span className="font-semibold text-[#00E676] text-[10px] sm:text-xs md:text-sm">{formatarMoeda(linha.eletrico)}</span>
                  ) : linha.isPositive && linha.eletrico !== 0 ? (
                    <span className="font-semibold text-green-400 text-[10px] sm:text-xs md:text-sm">+{formatarMoeda(Math.abs(linha.eletrico))}</span>
                  ) : (
                    <span className={`font-semibold text-[10px] sm:text-xs md:text-sm ${linha.eletrico > 0 ? 'text-[#00E676]' : 'text-zinc-400'}`}>
                      {linha.eletrico > 0 ? formatarMoeda(linha.eletrico) : linha.proprio > 0 ? 'Incl.' : '-'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Total - 4 colunas */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2 p-3 sm:p-4 md:p-6 bg-white/[0.03] border-t-2 border-[#388BFF]/30">
              <div className="font-bold text-xs sm:text-sm md:text-lg text-white">
                TOTAL/{periodoVisualizacao === 'semanal' ? 'SEM' : periodoVisualizacao === 'anual' ? 'ANO' : 'MÊS'}
              </div>
              <div className="text-center">
                <span className="text-sm sm:text-lg md:text-2xl font-bold text-[#FF4D4D]">{formatarMoeda(ajustarPeriodo(resultado.combustao.total))}</span>
              </div>
              <div className="text-center">
                <span className="text-sm sm:text-lg md:text-2xl font-bold text-orange-400">{formatarMoeda(ajustarPeriodo(resultado.combustaoAlugado.total))}</span>
              </div>
              <div className="text-center">
                <span className="text-sm sm:text-lg md:text-2xl font-bold text-[#00E676] pulse-green">{formatarMoeda(ajustarPeriodo(resultado.eletrico.total))}</span>
              </div>
            </div>

            {/* Economia - Comparação com as 3 opções */}
            <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-r from-[#388BFF]/10 via-[#388BFF]/5 to-[#00E676]/10">
              <div className="text-center mb-4 sm:mb-6">
                <p className="text-zinc-400 text-sm sm:text-base mb-2">Economia {getLabelPeriodo()} com Elétrico</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
                {/* vs Próprio Combustão */}
                <div className="text-center p-3 sm:p-4 bg-[#05070B]/40 rounded-xl border border-white/[0.07]">
                  <p className="text-xs sm:text-sm text-zinc-400 mb-1">vs Carro Próprio</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-black text-gradient-gold mb-1">
                    {formatarMoeda(
                      periodoVisualizacao === 'semanal' ? resultado.economiaSemanal : periodoVisualizacao === 'anual' ? resultado.economiaAnual : resultado.economiaMensal
                    )}
                  </p>
                  <div className="inline-flex items-center gap-1 text-[#00E676] text-xs sm:text-sm">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="font-bold">{resultado.percentualEconomia}% economia</span>
                  </div>
                </div>

                {/* vs Alugado Combustão */}
                <div className="text-center p-3 sm:p-4 bg-[#05070B]/40 rounded-xl border border-white/[0.07]">
                  <p className="text-xs sm:text-sm text-zinc-400 mb-1">vs Alugado Combustão</p>
                  <p
                    className={`text-2xl sm:text-3xl md:text-4xl font-black mb-1 ${
                      (periodoVisualizacao === 'semanal'
                        ? resultado.economiaSemanalVsAlugado
                        : periodoVisualizacao === 'anual'
                          ? resultado.economiaAnualVsAlugado
                          : resultado.economiaMensalVsAlugado) > 0
                        ? 'text-gradient-gold'
                        : 'text-[#FF4D4D]'
                    }`}
                  >
                    {formatarMoeda(
                      periodoVisualizacao === 'semanal'
                        ? resultado.economiaSemanalVsAlugado
                        : periodoVisualizacao === 'anual'
                          ? resultado.economiaAnualVsAlugado
                          : resultado.economiaMensalVsAlugado
                    )}
                  </p>
                  <div className="inline-flex items-center gap-1 text-xs sm:text-sm">
                    {Number(resultado.percentualEconomiaVsAlugado) > 0 ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#00E676]" />
                        <span className="font-bold text-[#00E676]">{resultado.percentualEconomiaVsAlugado}% economia</span>
                      </>
                    ) : (
                      <span className="font-bold text-zinc-400">Valor similar</span>
                    )}
                  </div>
                </div>
              </div>

              {periodoVisualizacao !== 'anual' && (
                <p className="text-center text-sm sm:text-lg text-zinc-400 mt-4 sm:mt-6">
                  vs Próprio = <span className="text-[#00E676] font-bold">{formatarMoeda(resultado.economiaAnual)}</span> por ano
                </p>
              )}
            </div>
          </div>
        )}

        {/* Seção Tecnologia & Conforto */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-2 bg-[#00E676]/10 rounded-full text-[#00E676] font-medium text-sm mb-4">💆 QUALIDADE DE VIDA</span>
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              Chegue em casa <span className="text-gradient-gold">menos cansado</span>
            </h3>
            <p className="text-zinc-400 max-w-xl mx-auto">Além da economia, o AION UT proporciona uma experiência de direção superior que preserva sua saúde</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Card Combustão */}
            <div className="card-premium border-[#FF4D4D]/30 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FF4D4D]/10 flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-[#FF4D4D]" />
                </div>
                <h4 className="text-lg font-bold text-white">Carro a Combustão</h4>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-[#FF4D4D]/5 rounded-lg border border-[#FF4D4D]/10">
                  <Volume2 className="w-5 h-5 text-[#FF4D4D] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Ruído do motor</p>
                    <p className="text-sm text-zinc-400">Motor barulhento gera fadiga auditiva após horas de trabalho</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FF4D4D]/5 rounded-lg border border-[#FF4D4D]/10">
                  <Gauge className="w-5 h-5 text-[#FF4D4D] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Vibrações constantes</p>
                    <p className="text-sm text-zinc-400">Motor a combustão vibra e causa desconforto muscular</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FF4D4D]/5 rounded-lg border border-[#FF4D4D]/10">
                  <Wrench className="w-5 h-5 text-[#FF4D4D] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Câmbio manual/automático</p>
                    <p className="text-sm text-zinc-400">Trocas de marcha constantes no trânsito urbano</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FF4D4D]/5 rounded-lg border border-[#FF4D4D]/10">
                  <Brain className="w-5 h-5 text-[#FF4D4D] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Maior carga mental</p>
                    <p className="text-sm text-zinc-400">Preocupação com manutenção, óleo, filtros, embreagem...</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#FF4D4D]/10 rounded-xl text-center">
                <p className="text-sm text-zinc-400">Resultado após 10h de trabalho:</p>
                <p className="text-lg font-bold text-[#FF4D4D]">😩 Motorista esgotado</p>
              </div>
            </div>

            {/* Card Elétrico */}
            <div className="card-premium border-[#00E676]/30 glow-electric p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00E676]/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#00E676]" />
                </div>
                <h4 className="text-lg font-bold text-white">Carro Elétrico</h4>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-lg border border-[#00E676]/10">
                  <VolumeX className="w-5 h-5 text-[#00E676] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Silêncio total</p>
                    <p className="text-sm text-zinc-400">Motor elétrico praticamente silencioso, preserva sua audição</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-lg border border-[#00E676]/10">
                  <Sparkles className="w-5 h-5 text-[#00E676] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Zero vibração</p>
                    <p className="text-sm text-zinc-400">Condução suave como deslizar, sem trepidações</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-lg border border-[#00E676]/10">
                  <Battery className="w-5 h-5 text-[#00E676] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Aceleração instantânea</p>
                    <p className="text-sm text-zinc-400">Sem marchas! Torque imediato, resposta perfeita</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-lg border border-[#00E676]/10">
                  <Heart className="w-5 h-5 text-[#00E676] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Menos preocupação</p>
                    <p className="text-sm text-zinc-400">Sem óleo, velas, correia, embreagem... Manutenção mínima!</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#00E676]/10 rounded-xl text-center">
                <p className="text-sm text-zinc-400">Resultado após 10h de trabalho:</p>
                <p className="text-lg font-bold text-[#00E676]">😊 Motorista disposto</p>
              </div>
            </div>
          </div>

          {/* Benefícios de Saúde */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Smile, label: 'Menos estresse', desc: 'Direção tranquila' },
              { icon: Heart, label: 'Mais saúde', desc: 'Menos fadiga muscular' },
              { icon: Brain, label: 'Mente leve', desc: 'Zero preocupação mecânica' },
              { icon: Battery, label: 'Mais energia', desc: 'Para sua família' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 bg-white/[0.03] rounded-xl border border-white/[0.07]">
                <div className="w-10 h-10 rounded-full bg-[#388BFF]/10 flex items-center justify-center mx-auto mb-2">
                  <item.icon className="w-5 h-5 text-[#388BFF]" />
                </div>
                <p className="font-semibold text-white text-sm">{item.label}</p>
                <p className="text-xs text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/quero-alugar" className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl text-lg bg-[#388BFF] hover:bg-[#82BCFF] text-[#05070B] font-bold px-8')}>
            Quero meu Carro Elétrico
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ComparadorSection;
