import { MessageCircle } from 'lucide-react';

// TODO(Carlos): número de WhatsApp é placeholder do site original — troque pelo
// número real de contato do negócio antes de publicar esta página.
const WHATSAPP_NUMBER_PLACEHOLDER = '5511999999999';

const WhatsAppButton = () => {
  const message = encodeURIComponent('Olá! Gostaria de saber mais sobre o aluguel de carros elétricos da RodaVolt.');
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER_PLACEHOLDER}?text=${message}`;

  return (
    <a
      aria-label="Falar com a RodaVolt pelo WhatsApp"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="pc-whatsapp fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow hover:scale-110 active:scale-95 transition-transform"
    >
      <MessageCircle className="w-7 h-7 text-white" />
      <span className="pc-whatsapp-label">Falar pelo WhatsApp</span>
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
    </a>
  );
};

export default WhatsAppButton;
