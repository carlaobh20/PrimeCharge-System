import { useState, useMemo } from 'react';
import { ArrowRight, Calculator, Zap } from 'lucide-react';

const ELETRICO_RATIO = 0.1966;

const FuelCalculator = () => {
  const [gastoGasolina, setGastoGasolina] = useState(1200);

  const { gastoEletrico, economia, percentual } = useMemo(() => {
    const eletrico = Math.round(gastoGasolina * ELETRICO_RATIO);
    const econ = gastoGasolina - eletrico;
    const pct = Math.round((econ / gastoGasolina) * 100);
    return { gastoEletrico: eletrico, economia: econ, percentual: pct };
  }, [gastoGasolina]);

  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-gradient-to-br from-white to-emerald-50/40 dark:from-[#0F1416] dark:to-[#0F1416] border border-emerald-200 dark:border-[#FFC640]/20 rounded-2xl p-5 sm:p-6 shadow-md dark:shadow-[0_0_40px_-15px_rgba(255,198,64,0.25)]">
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-5 h-5 text-emerald-600 dark:text-[#FFC640]" />
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Calculadora Rápida de Combustível</h3>
      </div>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-6">Quanto você gasta com gasolina por mês?</p>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-slate-600 dark:text-zinc-400">Gasto mensal com gasolina</label>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-[#FFC640]">{formatBRL(gastoGasolina)}</span>
        </div>
        <input
          type="range"
          min="300"
          max="3000"
          step="50"
          value={gastoGasolina}
          onChange={(e) => setGastoGasolina(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-600"
          aria-label="Gasto mensal com gasolina"
        />
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-500 mt-1">
          <span>R$ 300</span>
          <span>R$ 3.000</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-center mb-4">
        <div className="bg-rose-50 dark:bg-[#FF4D4D]/[0.08] border border-rose-200 dark:border-[#FF4D4D]/20 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-slate-600 dark:text-zinc-400 mb-1">Você gasta</p>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-[#FF4D4D] leading-none">{formatBRL(gastoGasolina)}</p>
        </div>

        <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-[#FFC640]/15 border border-emerald-300 dark:border-[#FFC640]/30 flex items-center justify-center flex-shrink-0">
          <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-[#FFC640]" strokeWidth={2.5} />
        </div>

        <div className="bg-emerald-50 dark:bg-[#00E676]/[0.08] border border-emerald-300 dark:border-[#00E676]/25 rounded-xl p-3 sm:p-4 text-center shadow-sm dark:shadow-[0_0_24px_-12px_rgba(0,230,118,0.4)]">
          <p className="text-[10px] sm:text-xs text-slate-600 dark:text-zinc-400 mb-1">No Carro Elétrico</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-[#00E676] leading-none">{formatBRL(gastoEletrico)}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-[#FFC640]/15 dark:to-[#00E676]/10 border border-emerald-300 dark:border-[#FFC640]/25 rounded-xl p-4 text-center relative overflow-hidden">
        <Zap className="absolute -right-2 -top-2 w-16 h-16 text-emerald-200/50 dark:text-[#00E676]/[0.07] pointer-events-none" fill="currentColor" />
        <div className="relative z-10">
          <p className="text-xs text-slate-700 dark:text-zinc-300 mb-1">Sua economia mensal</p>
          <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-[#00E676] leading-none mb-1">{formatBRL(economia)}</p>
          <p className="text-xs text-emerald-700 dark:text-[#00E676]/80 font-semibold">({percentual}% de economia)</p>
        </div>
      </div>
    </div>
  );
};

export default FuelCalculator;
