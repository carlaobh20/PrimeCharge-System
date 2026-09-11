import { useState, useEffect } from 'react';
import { Gauge, Zap, Rocket, BatteryCharging, Users, ArrowRight, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog } from '@/shared/components/ui/dialog';
import exterior from '../assets/aion-ut-hero.jpg';
import painel from '../assets/aion-ut/painel.jpg';
import espaco from '../assets/aion-ut/espaco.jpg';
import teto from '../assets/aion-ut/teto.jpg';

// Port do VehicleShowcase original: trocou o Dialog compound do Radix
// (Dialog/DialogTrigger/DialogContent/DialogTitle/DialogDescription) pelo
// Dialog controlado e flat deste app (@/shared/components/ui/dialog —
// {open, onOpenChange, title, description, children}), já usado pelos Command
// Actions do Cockpit do Ativo. A navegação por seta do teclado, que no
// original ficava num onKeyDown do DialogContent, virou um listener próprio
// enquanto o diálogo está aberto.
const photos = [
  { src: exterior, label: 'Exterior', alt: 'AION UT branco visto de frente e de lado' },
  { src: painel, label: 'Painel', alt: 'Painel e central multimídia do AION UT' },
  { src: espaco, label: 'Espaço interno', alt: 'Bancos traseiros e espaço para passageiros do AION UT' },
  { src: teto, label: 'Teto panorâmico', alt: 'Vista interna do teto panorâmico do AION UT' },
];

const specs = [
  { icon: Gauge, value: '310 km', text: 'Autonomia (Inmetro)' },
  { icon: Zap, value: '60 kWh', text: 'Bateria LFP' },
  { icon: Rocket, value: '204 cv', text: '0–100 em 7,3 s' },
  { icon: BatteryCharging, value: '24 min', text: '30→80% · carga rápida DC' },
  { icon: Users, value: '340 L', text: 'Porta-malas · 5 lugares' },
];

const VehicleShowcase = () => {
  const [selected, setSelected] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const photo = photos[selected];
  const changePhoto = (direction: number) => setSelected((current) => (current + direction + photos.length) % photos.length);

  useEffect(() => {
    if (!galleryOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        changePhoto(e.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [galleryOpen]);

  return (
    <section id="veiculo" className="pc-vehicle-section">
      <div className="pc-shell">
        <div className="pc-vehicle-heading">
          <p className="pc-eyebrow">CONHEÇA SEU PRÓXIMO CARRO</p>
          <h2>AION UT, por dentro e por fora.</h2>
          <p>Explore os detalhes que fazem parte da sua rotina.</p>
        </div>
        <div className="pc-vehicle-layout">
          <div className="pc-vehicle-gallery">
            <button type="button" className="pc-vehicle-main" aria-label={`Ampliar foto: ${photo.label}`} onClick={() => setGalleryOpen(true)}>
              <img src={photo.src} alt={photo.alt} loading="lazy" width="1280" height="720" />
              <span className="pc-gallery-expand">
                <Maximize2 size={16} /> Ver galeria
              </span>
            </button>
            <Dialog open={galleryOpen} onOpenChange={setGalleryOpen} title={`AION UT — ${photo.label}`} description="Use as setas para explorar as fotos. Escape fecha a galeria." className="pc-vehicle-dialog">
              <img src={photo.src} alt={photo.alt} className="pc-gallery-full" />
              <div className="pc-gallery-controls">
                <button type="button" onClick={() => changePhoto(-1)} aria-label="Foto anterior">
                  <ChevronLeft /> Anterior
                </button>
                <span aria-live="polite">
                  {selected + 1} / {photos.length}
                </span>
                <button type="button" onClick={() => changePhoto(1)} aria-label="Próxima foto">
                  Próxima <ChevronRight />
                </button>
              </div>
            </Dialog>
            <div className="pc-vehicle-thumbnails" aria-label="Fotos do AION UT">
              {photos.map((item, index) => (
                <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
                  <img src={item.src} alt="" loading="lazy" width="240" height="135" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pc-vehicle-overview">
            <p className="pc-eyebrow">O ELÉTRICO DA FROTA</p>
            <h3>AION UT</h3>
            <div className="pc-vehicle-tags">
              {['100% Elétrico', 'Automático', 'Hatch compacto'].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p className="pc-vehicle-description">Conheça o espaço, a tecnologia e os detalhes do carro que vai acompanhar sua rotina.</p>
            <div className="pc-vehicle-price">
              <span>A partir de</span>
              <strong>
                R$ 1.400<small>/semana</small>
              </strong>
            </div>
            <a href="#planos" className="pc-primary-link">
              Conhecer os planos <ArrowRight size={18} />
            </a>
            <a href="#comparador" className="pc-vehicle-secondary">
              Simular meus custos <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <ul className="pc-vehicle-specs">
          {specs.map(({ icon: Icon, value, text }) => (
            <li key={value}>
              <Icon aria-hidden="true" />
              <div>
                <strong>{value}</strong>
                <span>{text}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="pc-vehicle-credit">Imagens ilustrativas. Interior: divulgação GAC. Acabamentos e equipamentos podem variar conforme a versão.</p>
      </div>
    </section>
  );
};

export default VehicleShowcase;
