import { Gauge, Volume2, Leaf, ArrowRight, BarChart3 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import aionHero from '../assets/aion-ut-hero.jpg';

// Animação de entrada (framer-motion) do site original foi removida aqui: este
// app evita dependências novas quando não são necessárias (ver comentário em
// shared/components/ui/dialog.tsx). Visual final é idêntico, só sem o fade-in.
const HeroSection = () => {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const specs = [
    { icon: Gauge, label: 'Autonomia de 310 km' },
    { icon: Volume2, label: 'Condução silenciosa' },
    { icon: Leaf, label: 'Zero emissão' },
  ];

  return (
    <section id="home" className="pc-hero relative min-h-screen flex items-center overflow-hidden bg-[#05070B]">
      <div className="pc-hero-image absolute inset-y-0 right-0 w-full lg:w-[62%] z-0">
        <img
          src={aionHero}
          alt="AION UT - Carro elétrico premium RodaVolt"
          className="w-full h-full object-cover [mask-image:linear-gradient(90deg,transparent,#000_30%)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_30%)]"
          loading="eager"
        />
      </div>
      <div
        className="absolute right-[6%] top-[8%] w-[480px] h-[380px] z-0 blur-md pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,139,255,0.18), transparent 60%)' }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg,#05070B 22%,rgba(5,7,11,0.78) 45%,rgba(5,7,11,0.25) 72%,rgba(5,7,11,0.05) 100%)',
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="pc-hero-copy max-w-xl py-32">
          <div className="text-[12px] font-semibold tracking-[2px] uppercase text-[#388BFF] mb-4">
            100% Elétrico · Pronto pra rodar
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.98] tracking-tight text-white">
            Dirija o{' '}
            <span className="bg-gradient-to-r from-[#82BCFF] to-[#388BFF] bg-clip-text text-transparent">
              futuro
            </span>
            ,<br />
            sem comprar carro.
          </h1>

          <p className="text-base sm:text-lg text-zinc-300/90 mt-5 max-w-md">
            O AION UT chega zero, segurado e revisado. Você roda no Uber, 99 e InDrive e devolve o resto — sem
            financiamento, sem manutenção, sem capital travado.
          </p>

          <div className="flex flex-wrap gap-7 mt-9">
            {specs.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex flex-col items-start gap-2.5 max-w-[110px]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center text-[#388BFF]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[12.5px] text-zinc-300 leading-snug">{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <Button
              size="lg"
              className="bg-[#388BFF] hover:bg-[#82BCFF] text-[#05070B] font-bold rounded-2xl px-7 h-14 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(56,139,255,0.30)] group"
              onClick={() => scrollTo('#planos')}
            >
              Ver planos de aluguel
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/[0.04] border-white/[0.10] text-white hover:bg-white/[0.08] hover:border-white/20 rounded-2xl px-7 h-14 backdrop-blur"
              onClick={() => scrollTo('#comparador')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Simular minha economia
            </Button>
          </div>

          <div className="inline-flex flex-col mt-10 rounded-2xl px-6 py-4 bg-[#0C1422]/80 border border-white/[0.07] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <span className="text-[11px] text-zinc-500">A partir de</span>
            <span className="text-3xl font-black text-[#388BFF] leading-tight">
              R$ 1.400<span className="text-sm text-zinc-300 font-medium">/sem</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
