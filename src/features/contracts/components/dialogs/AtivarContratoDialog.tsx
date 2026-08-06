import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

// Fecha um achado real da auditoria de jornada da Missão 4: km_inicial/carga_inicial_pct
// eram capturados no formulário de CRIAÇÃO do contrato (status 'rascunho'), não no momento
// real da entrega física do veículo — um contrato pode ficar dias em 'em_analise'/'aprovado'/
// 'assinado' antes de o carro de fato ser entregue, e o número digitado na criação não é
// necessariamente o odômetro real no momento da entrega. Mesmo padrão de EncerrarContratoDialog
// (Missão 2): captura o dado no momento em que o evento físico acontece, não antes. Só abre
// quando os dois campos ainda estão nulos — se já foram preenchidos na criação (fluxo antigo,
// ou empresa que cria o contrato exatamente na hora da entrega), a transição segue direto.
export function AtivarContratoDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (kmInicial: number, cargaInicialPct: number) => void;
  isPending: boolean;
}) {
  const [kmInicial, setKmInicial] = useState('');
  const [cargaInicialPct, setCargaInicialPct] = useState('');

  useEffect(() => {
    if (open) {
      setKmInicial('');
      setCargaInicialPct('');
    }
  }, [open]);

  const kmValido = kmInicial !== '' && Number(kmInicial) >= 0;
  const cargaValida = cargaInicialPct !== '' && Number(cargaInicialPct) >= 0 && Number(cargaInicialPct) <= 100;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar entrega do veículo"
      description='Captura o odômetro e a carga no momento real da entrega, e move o status para "Ativo".'
    >
      <div className="space-y-4">
        <div>
          <Label>Quilometragem na entrega *</Label>
          <Input type="number" min={0} value={kmInicial} onChange={(e) => setKmInicial(e.target.value)} />
        </div>
        <div>
          <Label>Carga na entrega (%) *</Label>
          <Input type="number" min={0} max={100} value={cargaInicialPct} onChange={(e) => setCargaInicialPct(e.target.value)} />
          {!cargaValida && cargaInicialPct !== '' && <p className="mt-1 text-xs text-red-600">Precisa ser entre 0 e 100.</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || !kmValido || !cargaValida}
            onClick={() => onConfirm(Number(kmInicial), Number(cargaInicialPct))}
          >
            {isPending ? 'Ativando…' : 'Registrar entrega e ativar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
