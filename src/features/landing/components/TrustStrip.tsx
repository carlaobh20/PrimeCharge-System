import { Shield, Clock, Wallet, RefreshCw } from 'lucide-react';
const items = [
  { icon: Shield, t: 'Seguro completo', d: 'Proteção total durante a locação' },
  { icon: Clock, t: 'Assistência 24h', d: 'Suporte a qualquer momento' },
  { icon: Wallet, t: 'Sem taxas ocultas', d: 'Transparência em cada etapa' },
  { icon: RefreshCw, t: 'Cancelamento fácil', d: 'Flexibilidade para mudar de plano' },
];
const TrustStrip = () => (
  <section className="border-y border-white/[0.07] bg-white/[0.012]">
    <div className="max-w-[1300px] mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6 py-9">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i}>
            <div className="w-[42px] h-[42px] rounded-[13px] bg-[#388BFF]/10 border border-[#388BFF]/[0.22] text-[#388BFF] flex items-center justify-center mb-3">
              <Icon className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-[15px] text-white">{it.t}</div>
            <div className="text-zinc-500 text-[12.5px] mt-0.5">{it.d}</div>
          </div>
        );
      })}
    </div>
  </section>
);
export default TrustStrip;
