import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

// Fecha o achado #17 da auditoria de jornada da Missão 4 (DEC-044): "Vender veículo" só
// mudava o status, sem capturar comprador/valor/data — mesma classe de correção que
// EncerrarContratoDialog (Missão 2) já aplicou pra devolução de contrato.
export function VenderVeiculoDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (comprador: string, valorVenda: number, dataVenda: string) => void;
  isPending: boolean;
}) {
  const [comprador, setComprador] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [dataVenda, setDataVenda] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setComprador('');
      setValorVenda('');
      setDataVenda(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const podeSalvar = comprador.trim() && valorVenda !== '' && Number(valorVenda) >= 0 && dataVenda;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Vender veículo"
      description='Registra os dados da venda e move o status para "Em venda" — a próxima transição válida a partir de agora.'
    >
      <div className="space-y-4">
        <div>
          <Label>Comprador *</Label>
          <Input value={comprador} onChange={(e) => setComprador(e.target.value)} placeholder="Nome ou empresa" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor da venda (R$) *</Label>
            <Input type="number" min={0} step="0.01" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} />
          </div>
          <div>
            <Label>Data da venda *</Label>
            <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || !podeSalvar}
            onClick={() => onConfirm(comprador.trim(), Number(valorVenda), dataVenda)}
          >
            {isPending ? 'Salvando…' : 'Confirmar venda'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
