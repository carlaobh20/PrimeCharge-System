import './landing.css';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import DriverAppSection from './components/DriverAppSection';
import WhyUs from './components/WhyUs';
import TrustStrip from './components/TrustStrip';
import PlansSection from './components/PlansSection';
import DriverPhases from './components/DriverPhases';
import GoldBlock from './components/GoldBlock';
import FAQSection from './components/FAQSection';
import LandingClosingCTA from './components/LandingClosingCTA';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import FuelCalculator from './components/FuelCalculator';

// Página pública (visitante não autenticado em "/"). Portada do site
// prime-charte-carros-alugados.vercel.app (repo separado, Lovable) a pedido do
// Carlos, pra virar a porta de entrada única do sistema em vez de um site à parte
// com login/banco próprios (ver decisão em claude/rebrand-rodavolt... e a
// investigação da landing separada).
//
// Ficou de fora desta primeira leva (propositalmente — ver PENDÊNCIAS abaixo):
// - VehicleShowcase (galeria de fotos do veículo, usa modal/Dialog)
// - ComparadorSection (comparador carro próprio × alugado × elétrico, usa
//   dropdown + slider Radix que este app não tem — e tem lógica financeira que
//   merece port cuidadoso, não às pressas)
//
// PENDÊNCIAS:
// - Número de WhatsApp em WhatsAppButton.tsx é placeholder — falta o real.
// - Nav do Header não linka "Veículo" e "Comparador" enquanto essas seções não
//   existirem aqui.
export function LandingPage() {
  return (
    <div className="primecharge-landing">
      <a href="#main-content" className="pc-skip-link">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="main-content">
        <HeroSection />
        <DriverAppSection />
        <WhyUs />
        <TrustStrip />
        <PlansSection />
        <div id="calculadora" className="pc-comparison-wrap">
          <div className="pc-shell pc-quick-calculator">
            <div>
              <p className="pc-eyebrow">UMA VISÃO RÁPIDA</p>
              <h2>
                Da gasolina
                <br />à energia elétrica.
              </h2>
              <p>Explore a estimativa de gasto com energia usando a calculadora abaixo.</p>
              <p className="pc-estimate-note">
                Esta calculadora usa uma proporção fixa de 19,66% do gasto com gasolina. Não inclui aluguel ou
                demais custos.
              </p>
            </div>
            <FuelCalculator />
          </div>
          <div className="pc-shell pc-estimate-note">
            Simulação ilustrativa com as premissas cadastradas no site. Os resultados podem ser positivos ou
            negativos e não representam garantia de economia ou rendimento. Consulte as condições do plano.
          </div>
        </div>
        <DriverPhases />
        <GoldBlock />
        <FAQSection />
        <LandingClosingCTA />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default LandingPage;
