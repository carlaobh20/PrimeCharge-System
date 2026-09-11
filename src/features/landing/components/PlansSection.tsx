import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

const plans = [
  {
    nome: 'Zero KM',
    preco: '1.700',
    off: 'Carro 0km',
    hot: false,
    badge: '',
    items: ['Fidelidade 18 meses', 'Garantia de fábrica', 'Seguro incluso', 'Manutenção preventiva'],
  },
  {
    nome: '3 Meses',
    preco: '1.500',
    off: '12% OFF',
    hot: false,
    badge: '',
    items: ['Sem entrada', 'Assistência 24h', 'Seguro incluso', 'Manutenção inclusa'],
  },
  {
    nome: '6 Meses',
    preco: '1.400',
    off: '18% OFF',
    hot: true,
    badge: '6 meses',
    items: ['Melhor custo-benefício', 'Assistência 24h', 'Seguro incluso', '1 recarga grátis/mês'],
  },
  {
    nome: '12 Meses',
    preco: '1.300',
    off: '24% OFF',
    hot: false,
    badge: '',
    items: ['Máxima economia', 'Assistência 24h', 'Seguro incluso', '2 recargas grátis/mês'],
  },
];

// Botão vira <Link> direto (usando as classes do Button via buttonVariants) em vez do
// padrão `<Button asChild>` do site original: o Button deste app não tem suporte a
// asChild/Slot (ver shared/components/ui/button.tsx), então recriamos o visual sem
// precisar de uma dependência nova (@radix-ui/react-slot).
const PlansSection = () => (
  <section id="planos" className="py-20 sm:py-24 bg-[#05070B]">
    <div className="max-w-[1300px] mx-auto px-6">
      <div className="mb-8">
        <div className="text-[11.5px] tracking-[2.4px] uppercase text-[#388BFF] font-bold">Planos</div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-2.5">Escolha quanto tempo quer rodar</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p, i) => (
          <div
            key={i}
            className={`relative rounded-[26px] p-6 border transition-all duration-300 hover:-translate-y-1.5 ${
              p.hot
                ? 'border-[#388BFF]/45 bg-gradient-to-b from-[#388BFF]/[0.12] to-white/[0.015]'
                : 'border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.012] hover:border-white/20'
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3 left-5 text-[10px] tracking-wide uppercase bg-[#388BFF] text-[#05070B] font-extrabold px-3 py-1.5 rounded-full">
                {p.badge}
              </div>
            )}
            <div className="text-[17px] font-extrabold text-white">{p.nome}</div>
            <div className="text-3xl font-black text-white mt-3">
              R$ {p.preco}
              <span className="text-[13px] text-zinc-500 font-medium">/sem</span>
            </div>
            <div className="inline-block mt-2 text-xs text-[#00C076] bg-[#00C076]/10 border border-[#00C076]/25 rounded-lg px-2.5 py-1 font-bold">
              {p.off}
            </div>
            <ul className="mt-5 space-y-2.5">
              {p.items.map((it, j) => (
                <li key={j} className="flex gap-2.5 text-[13px] text-zinc-300">
                  <Check className="w-4 h-4 text-[#388BFF] flex-shrink-0 mt-0.5" strokeWidth={3} />
                  {it}
                </li>
              ))}
            </ul>
            <Link
              to="/quero-alugar"
              className={cn(
                buttonVariants(),
                'w-full mt-6 rounded-xl font-bold',
                p.hot
                  ? 'bg-[#388BFF] hover:bg-[#82BCFF] text-[#05070B]'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1]'
              )}
            >
              Escolher
              <span className="sr-only"> plano {p.nome}</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);
export default PlansSection;
