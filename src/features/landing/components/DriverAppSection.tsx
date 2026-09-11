import driverAppPhoto from '../assets/rodavolt-app-na-mao.png';
import { ArrowRight, BrainCircuit, Target, Wallet } from 'lucide-react';
const DriverAppSection = () => (
  <section id="app-motorista" className="pc-app-section">
    <div className="pc-shell pc-app-grid">
      <div>
        <p className="pc-eyebrow">TECNOLOGIA QUE RODA COM VOCÊ</p>
        <h2>
          Seu carro é elétrico.
          <br />
          Sua rotina, <span>mais inteligente.</span>
        </h2>
        <p className="pc-lead">
          App Motorista e Copiloto RodaVolt: uma visão organizada da sua operação, do planejamento do dia ao
          acompanhamento dos seus resultados.
        </p>
        <div className="pc-app-features">
          <div>
            <Target />
            <span>
              <strong>Planeje sua meta</strong>Organize o que precisa fazer no dia.
            </span>
          </div>
          <div>
            <Wallet />
            <span>
              <strong>Acompanhe sua rotina</strong>Ganhos, gastos e recargas no mesmo contexto.
            </span>
          </div>
          <div>
            <BrainCircuit />
            <span>
              <strong>Conte com o Copiloto</strong>Insights a partir dos seus registros.
            </span>
          </div>
        </div>
        <a href="/login" className="pc-primary-link">
          Acessar portal do motorista <ArrowRight size={18} />
        </a>
      </div>
      <div className="pc-app-visual">
        <img
          className="pc-app-photo"
          src={driverAppPhoto}
          alt="Mão segurando um celular com a interface ilustrativa do App Motorista RodaVolt, com Minha meta, Ganhos e gastos, Recargas e Seu Copiloto."
          width={1122}
          height={1402}
          loading="lazy"
          decoding="async"
        />
        <p className="pc-illustration-caption">Visão ilustrativa dos recursos · sem dados de operação</p>
      </div>
    </div>
  </section>
);
export default DriverAppSection;
