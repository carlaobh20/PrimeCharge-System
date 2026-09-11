import { Button } from '@/shared/components/ui/button';
import { ArrowRight } from 'lucide-react';
import rodavoltLogo from '../assets/rodavolt-logo.svg';
const cols = [
  { h: 'Aluguel', items: ['Como funciona', 'Planos', 'Regras de locação', 'Formas de pagamento'] },
  { h: 'Suporte', items: ['Central de ajuda', 'Fale conosco', 'WhatsApp', 'Perguntas frequentes'] },
  { h: 'Institucional', items: ['Sobre nós', 'Termos de uso', 'Privacidade', 'LGPD'] },
];
const Footer = () => (
  <footer className="border-t border-white/[0.07] bg-[#0B1220]">
    <div className="max-w-[1300px] mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.3fr] gap-8 py-14">
        <div>
          <img className="pc-footer-logo" src={rodavoltLogo} alt="RodaVolt" width="210" height="61" loading="lazy" />
          <div className="text-zinc-500 text-[13.5px] mt-3 max-w-[210px]">Mobilidade elétrica para motoristas de app em Maringá.</div>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="text-[12.5px] tracking-wide uppercase text-white mb-4">{c.h}</h4>
            <ul className="space-y-2.5">
              {c.items.map((it) => (
                <li key={it}>
                  <a href="#" className="text-zinc-500 hover:text-zinc-300 text-[13.5px] transition">
                    {it}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="text-[12.5px] tracking-wide uppercase text-white mb-4">Receba novidades</h4>
          <div className="flex border border-white/[0.07] rounded-xl overflow-hidden bg-white/[0.03]">
            <input
              placeholder="Seu melhor e-mail"
              aria-label="Seu melhor e-mail"
              type="email"
              className="min-w-0 flex-1 bg-transparent border-0 outline-none text-white px-4 text-[13.5px]"
            />
            <Button disabled aria-label="Cadastro de novidades em preparação" className="shrink-0 w-12 rounded-none bg-[#388BFF] hover:bg-[#82BCFF] text-[#05070B]">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Cadastro de novidades em preparação.</p>
        </div>
      </div>
      <div className="border-t border-white/[0.07] text-center text-zinc-600 text-[12.5px] py-5">
        © {new Date().getFullYear()} RodaVolt. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);
export default Footer;
