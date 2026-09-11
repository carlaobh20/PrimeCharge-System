import { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import rodavoltLogo from '../assets/rodavolt-logo.svg';

// Nav de "Veículo" e "Comparador" fica fora por enquanto: as seções correspondentes
// (galeria do veículo e comparador de custos) ainda não foram portadas do site
// original — ver nota na Fase de Evolução da landing. Reativar quando existirem.
const links = [
  ['Planos', '#planos'],
  ['Como funciona', '#como'],
  ['App Motorista', '#app-motorista'],
];

const Header = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="pc-header">
      <div className="pc-shell pc-header-row">
        <a className="pc-brand" href="#home" aria-label="RodaVolt — início">
          <img className="pc-brand-logo" src={rodavoltLogo} alt="RodaVolt" width="210" height="61" />
        </a>
        <nav className="pc-desktop-nav" aria-label="Navegação principal">
          {links.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <a href="#planos" className="pc-header-cta">
          Quero alugar <ArrowUpRight size={16} />
        </a>
        <button
          className="pc-menu-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav id="mobile-navigation" className="pc-mobile-nav" aria-label="Navegação móvel">
          {links.map(([label, href]) => (
            <a href={href} key={href} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight size={16} />
            </a>
          ))}
        </nav>
      )}
    </header>
  );
};
export default Header;
