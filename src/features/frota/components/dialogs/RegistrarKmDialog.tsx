import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/shared/components/ui/toast';
import { useUpdateVeiculo } from '../../hooks/useVeiculos';

export function RegistrarKmDialog({
  open,
  onOpenChange,
  veiculoId,
  quilometragemAtual,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  quilometragemAtual: number;
}) {
  const [valor, setValor] = useState(String(quilometragemAtual));
  const updateVeiculo = useUpdateVeiculo();

  function handleSubmit() {
    const km = Number(valor);
    if (!Number.isFinite(km) || km < quilometragemAtual) return;
    updateVeiculo.mutate(
      { id: veiculoId, payload: { quilometragem: km } },
      { onSuccess: () => { toast.success('Quilometragem atualizada'); onOpenChange(false); } }
    );
  }

  const invalido = Number(valor) < quilometragemAtual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Registrar quilometragem" description="A leitura atual do odômetro do veículo.">
      <div className="space-y-3">
        <div>
          <Label>Nova quilometragem (km)</Label>
          <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} min={quilometragemAtual} />
          {invalido && (
            <p className="mt-1 text-xs text-red-600">Não pode ser menor que a atual ({quilometragemAtual.toLocaleString('pt-BR')} km).</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={updateVeiculo.isPending || invalido || !valor}>
            {updateVeiculo.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
