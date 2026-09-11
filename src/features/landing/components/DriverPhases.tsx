const phases = [
  {
    n: '1',
    t: 'Inscrição online',
    d: 'Você preenche seus dados, escolhe o plano e envia os documentos básicos. Poucos minutos, sem deslocamento.',
    chips: ['Dados pessoais', 'Escolha do plano'],
  },
  {
    n: '2',
    t: 'Análise do perfil',
    d: 'Conferimos CNH, conta ativa em app de transporte e verificação de antecedentes. A etapa que garante uma frota segura.',
    chips: ['CNH com EAR', 'Conta Uber/99/InDrive', 'Antecedentes'],
  },
  {
    n: '3',
    t: 'Aprovação e contrato',
    d: 'Aprovado, você assina o contrato de locação digitalmente e acerta a caução de garantia. Transparente, sem letra miúda.',
    chips: ['Assinatura digital', 'Caução / garantia'],
  },
  {
    n: '4',
    t: 'Retirada do AION UT',
    d: 'Vistoria do carro junto com você, treino rápido de recarga, e o carro é seu — zero, segurado e revisado.',
    chips: ['Vistoria', 'Treino de recarga'],
  },
  {
    n: '5',
    t: 'Rodando com suporte',
    d: 'A partir daí você fatura no app. Manutenção, revisão e seguro por nossa conta, com assistência 24h.',
    chips: ['Assistência 24h', 'Manutenção inclusa'],
  },
];

const DriverPhases = () => (
  <section id="como" className="py-20 sm:py-24 bg-[#05070B]">
    <div className="max-w-[1300px] mx-auto px-6">
      <div className="text-[11.5px] tracking-[2.4px] uppercase text-[#388BFF] font-bold">Como funciona</div>
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-2.5">Da inscrição ao volante, em 5 fases</h2>
      <p className="text-zinc-300 text-[16.5px] mt-3 max-w-xl">
        O processo de seleção do motorista é simples, mas tem critérios — pra proteger você e a frota.
      </p>
      <div className="mt-8">
        {phases.map((p, i) => (
          <div key={i} className="grid grid-cols-[54px_1fr] gap-5 py-6 border-b border-white/[0.07] last:border-0">
            <div className="w-[54px] h-[54px] rounded-[18px] bg-gradient-to-br from-[#388BFF]/[0.18] to-[#388BFF]/[0.04] border border-[#388BFF]/30 flex items-center justify-center text-xl font-black text-[#388BFF]">
              {p.n}
            </div>
            <div>
              <div className="text-[18px] font-extrabold text-white">{p.t}</div>
              <div className="text-zinc-300 text-sm mt-1.5 max-w-2xl">{p.d}</div>
              <div className="flex gap-2 flex-wrap mt-2.5">
                {p.chips.map((c) => (
                  <span key={c} className="text-[11.5px] text-zinc-400 bg-white/[0.03] border border-white/[0.07] rounded-lg px-2.5 py-1">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
export default DriverPhases;
