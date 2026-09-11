import { ArrowRight, Zap } from 'lucide-react';
const LandingClosingCTA = () => (
  <section className="pc-closing">
    <div className="pc-shell">
      <div className="pc-closing-panel">
        <Zap size={34} />
        <p className="pc-eyebrow">SEU PRÓXIMO PASSO</p>
        <h2>
          Pronto para uma
          <br />
          nova forma de rodar?
        </h2>
        <p>Compare os custos, escolha seu plano e conheça as condições de locação.</p>
        <div className="pc-closing-actions">
          <a className="pc-primary-link" href="/login">
            Quero meu carro agora <ArrowRight size={18} />
          </a>
          <a href="#calculadora">
            Rever minha simulação <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  </section>
);
export default LandingClosingCTA;
