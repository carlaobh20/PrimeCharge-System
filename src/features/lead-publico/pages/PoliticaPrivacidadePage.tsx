import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import rodavoltLogo from '../assets/rodavolt-logo-preto.svg';

// Página estática, pública, sem dependência de dado nenhum — só o texto. Vinculada ao
// checkbox de consentimento do funil público (CadastroLeadPage). Texto redigido por mim como
// rascunho razoável de transparência (o que é coletado, pra quê, por quanto tempo, direitos do
// titular) — NÃO é parecer jurídico. Recomendação passada ao Carlos fora do código: revisar
// com quem entende de LGPD antes do funil operar em escala, já que aqui se coleta CPF, RG e
// documento de identidade de gente de fora da empresa.
export function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img src={rodavoltLogo} alt="RodaVolt" className="h-6 w-auto sm:h-7" />
          <Link to="/quero-alugar" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao cadastro
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        <h1 className="text-2xl font-black text-neutral-900 sm:text-3xl">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-neutral-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700">
          <p>
            Esta página explica, de forma direta, o que a RodaVolt faz com os dados que você envia no formulário de
            cadastro de motorista ("Quero alugar meu carro elétrico").
          </p>

          <section>
            <h2 className="text-base font-semibold text-neutral-900">O que coletamos</h2>
            <p className="mt-2">
              Dados de identificação (nome, CPF, RG, data de nascimento), contato (e-mail, telefone), endereço, dados
              da CNH, informações sobre sua experiência como motorista de aplicativo, referências pessoais, contato
              de emergência, e os documentos que você anexa (CNH e comprovante de residência).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900">Para que usamos</h2>
            <p className="mt-2">
              Exclusivamente para analisar seu cadastro e decidir sobre a locação de um veículo, e para entrar em
              contato com você sobre essa análise. Não vendemos nem compartilhamos seus dados com terceiros para fins
              de publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900">Por quanto tempo guardamos</h2>
            <p className="mt-2">
              Enquanto seu cadastro estiver em análise ou você for motorista ativo. Se seu cadastro não for aprovado,
              você pode pedir a exclusão dos seus dados a qualquer momento pelos contatos abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900">Seus direitos</h2>
            <p className="mt-2">
              Você pode pedir a qualquer momento para saber quais dados temos sobre você, corrigi-los, ou pedir a
              exclusão deles (respeitado eventual contrato em vigor). Para isso, entre em contato pelos canais
              informados no site.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
