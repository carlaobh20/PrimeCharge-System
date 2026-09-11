import { Zap, CreditCard, Wrench, Star } from 'lucide-react';
const items = [
  { icon: Zap, t: 'Frota 100% elétrica', d: 'Sem gasolina, sem barulho, energia barata' },
  { icon: CreditCard, t: 'Zero capital travado', d: 'Sem financiamento, sem R$140 mil parados' },
  { icon: Wrench, t: 'Manutenção inclusa', d: 'Revisão, pneus e desgaste por nossa conta' },
  { icon: Star, t: 'Experiência premium', d: 'Do primeiro contato à devolução' },
];
const WhyUs = () => (
  <section id="porque" className="py-20 sm:py-24 bg-[#05070B]">
    <div className="max-w-[1300px] mx-auto px-6">
      <div className="text-[11.5px] tracking-[2.4px] uppercase text-[#388BFF] font-bold">Por que RodaVolt</div>
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-2.5">Você roda. O resto é com a gente.</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} className="rounded-2xl">
              <div className="w-[50px] h-[50px] rounded-[15px] bg-white/[0.03] border border-white/[0.07] text-[#388BFF] flex items-center justify-center mb-3.5">
                <Icon className="w-5.5 h-5.5" />
              </div>
              <div className="font-extrabold text-base text-white">{it.t}</div>
              <div className="text-zinc-500 text-[13.5px] mt-1.5">{it.d}</div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
export default WhyUs;
