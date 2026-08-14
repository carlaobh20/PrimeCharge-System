import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

// Épico 8, ETAPA 7 — assinatura digital simples no navegador. Canvas + pointer events, sem
// dependência nova (mesma filosofia do Dialog "Tailwind-only" já usado no projeto). Não é
// certificação ICP-Brasil — é evidência operacional de aceite, exatamente o que a ETAPA 7 pediu.
// Pensado pra ser assinado num tablet/celular ao lado do veículo (ETAPA 15): traço grosso,
// área grande, sem gestos complicados.
export function SignaturePad({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    desenhando.current = true;
    const { x, y } = posicao(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posicao(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (vazio) setVazio(false);
  }

  function finalizarTraco() {
    desenhando.current = false;
    emitir();
  }

  function emitir() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => onChange(vazio ? null : blob), 'image/png');
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative rounded-lg border border-dashed border-neutral-300 bg-neutral-50 dark:border-white/15 dark:bg-white/5">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-lg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finalizarTraco}
          onPointerLeave={() => desenhando.current && finalizarTraco()}
        />
        {vazio && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
            Assine aqui com o dedo ou o mouse
          </p>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={limpar} disabled={vazio}>
          <Eraser className="h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
