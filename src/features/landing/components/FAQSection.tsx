import { useState } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'Preciso ter CNH categoria B?',
    a: 'Sim. É necessário possuir CNH categoria B válida e estar apto para atividade remunerada (EAR).',
  },
  {
    q: 'Como funciona a aprovação?',
    a: 'A aprovação é feita 100% online, com análise de documentos, perfil e capacidade de pagamento. Nossa equipe avalia seu histórico como motorista de aplicativo.',
  },
  {
    q: 'Qual a quilometragem mensal?',
    a: 'A quilometragem depende do plano contratado. Nossa equipe apresenta as opções disponíveis antes da assinatura, sempre adequadas ao seu uso real.',
  },
  {
    q: 'Posso alugar para trabalhar em outras plataformas?',
    a: 'Sim. Você pode utilizar o veículo para Uber, 99, InDrive e outras plataformas permitidas no contrato.',
  },
];

// Sem framer-motion aqui (ver nota em HeroSection.tsx): o "abrir/fechar" do acordeão
// usa só CSS/condicional — perde a animação de altura suave, mantém a função idêntica.
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-16 sm:py-24 bg-slate-50 dark:bg-[#050708]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-[#FFC640]" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white">Dúvidas frequentes</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-zinc-400">As respostas que mais nos perguntam.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`bg-gradient-to-br from-white to-slate-50/60 dark:from-[#0F1416] dark:to-[#0F1416] border rounded-2xl overflow-hidden transition-colors shadow-sm dark:shadow-none ${
                  isOpen
                    ? 'border-emerald-300 dark:border-[#FFC640]/30'
                    : 'border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">{faq.q}</h3>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isOpen
                        ? 'bg-emerald-600 dark:bg-[#FFC640] text-white dark:text-black rotate-180'
                        : 'bg-emerald-50 dark:bg-[#FFC640]/10 border border-emerald-200 dark:border-[#FFC640]/30 text-emerald-600 dark:text-[#FFC640]'
                    }`}
                  >
                    {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-200 dark:border-white/[0.05] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
