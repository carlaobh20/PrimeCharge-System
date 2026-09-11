import { Button } from '@/shared/components/ui/button';
const offs: [string, string][] = [
  ['3 meses ou mais', '12% OFF'],
  ['6 meses ou mais', '18% OFF'],
  ['12 meses ou mais', '24% OFF'],
];
const GoldBlock = () => {
  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <section className="py-20 bg-[#05070B]">
      <div className="max-w-[1300px] mx-auto px-6">
        <div
          className="rounded-[30px] p-8 sm:p-12 border border-[#388BFF]/[0.26] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center"
          style={{
            background:
              'radial-gradient(600px 300px at 72% 30%, rgba(56,139,255,0.24), transparent 60%), linear-gradient(135deg, rgba(56,139,255,0.10), rgba(11,18,32,0.6))',
          }}
        >
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white max-w-sm leading-tight">
              Quanto mais tempo, menos você paga.
            </h3>
            <p className="text-zinc-300 mt-3 max-w-sm">
              Descontos progressivos pra quem fica mais. Do semanal ao anual, a diária cai e os bônus de recarga
              aumentam.
            </p>
            <Button onClick={() => go('#planos')} className="mt-6 h-12 px-7 bg-[#388BFF] hover:bg-[#82BCFF] text-[#05070B] font-bold rounded-xl">
              Ver planos
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {offs.map(([l, v]) => (
              <div key={l} className="bg-[#05070B]/55 border border-white/[0.07] rounded-2xl px-6 py-4 min-w-[200px]">
                <div className="text-[12px] text-zinc-300">{l}</div>
                <div className="text-[21px] font-black text-[#82BCFF]">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
export default GoldBlock;
