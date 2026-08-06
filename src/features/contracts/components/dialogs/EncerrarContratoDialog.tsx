import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import type { Contrato } from '../../types';

// Achado crítico #2 da auditoria da Missão 2 (2026-08-06): antes desta tela, "Encerrar
// contrato" só mudava o status — km_final/carga_final_pct nunca eram capturados pela UI,
// mesmo o alerta "devolvido com carga baixa" (contracts/intelligence/alerts.ts) já depender
// desse dado. Sem esses dois campos, o fechamento do ciclo de vida do ativo era impossível
// pela interface — só via SQL direto.
export function EncerrarContratoDialog({
  open,
  onOpenChange,
  contrato,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: Pick<Contrato, 'km_inicial'>;
  onConfirm: (kmFinal: number, cargaFinalPct: number) => void;
  isPending: boolean;
}) {
  const [kmFinal, setKmFinal] = useState('');
  const [cargaFinalPct, setCargaFinalPct] = useState('');

  useEffect(() => {
    if (open) {
      setKmFinal(contrato.km_inicial != null ? String(contrato.km_inicial) : '');
      setCargaFinalPct('');
    }
  }, [open, contrato.km_inicial]);

  const kmValido = kmFinal !== '' && Number(kmFinal) >= (contrato.km_inicial ?? 0);
  const cargaValida = cargaFinalPct !== '' && Number(cargaFinalPct) >= 0 && Number(cargaFinalPct) <= 100;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Encerrar contrato"
      description='Registra os dados de devolução e move o status para "Encerrado" — esta é a próxima transição válida a partir de agora.'
    >
      <div className="space-y-4">
        <div>
          <Label>Quilometragem final *</Label>
          <Input type="number" min={contrato.km_inicial ?? 0} value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} />
          {!kmValido && kmFinal !== '' && (
            <p className="mt-1 text-xs text-red-600">Não pode ser menor que a quilometragem inicial.</p>
          )}
        </div>

        <div>
          <Label>Carga na devolução (%) *</Label>
          <Input type="number" min={0} max={100} value={cargaFinalPct} onChange={(e) => setCargaFinalPct(e.target.value)} />
          {!cargaValida && cargaFinalPct !== '' && <p className="mt-1 text-xs text-red-600">Precisa ser entre 0 e 100.</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !kmValido || !cargaValida}
            onClick={() => onConfirm(Number(kmFinal), Number(cargaFinalPct))}
          >
            {isPending ? 'Encerrando…' : 'Encerrar contrato'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
