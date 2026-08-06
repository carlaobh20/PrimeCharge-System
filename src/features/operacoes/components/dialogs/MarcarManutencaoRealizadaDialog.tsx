import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import type { Manutencao } from '../../types';

// Missão 4 (Fase 3) — mesmo padrão de EncerrarContratoDialog: captura o dado real no momento
// em que o evento de fato acontece, em vez de assumir que o valor previsto na criação
// (agendamento) ainda é verdade — data de execução pode divergir da data agendada, custo
// final costuma ser diferente do estimado.
export function MarcarManutencaoRealizadaDialog({
  open,
  onOpenChange,
  manutencao,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manutencao: Pick<Manutencao, 'data_agendada' | 'custo'> | null;
  onConfirm: (dataExecucao: string, custo: number | null) => void;
  isPending: boolean;
}) {
  const [dataExecucao, setDataExecucao] = useState('');
  const [custo, setCusto] = useState('');

  useEffect(() => {
    if (open && manutencao) {
      setDataExecucao(manutencao.data_agendada ?? new Date().toISOString().slice(0, 10));
      setCusto(manutencao.custo !== null ? String(manutencao.custo) : '');
    }
  }, [open, manutencao]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Marcar manutenção como realizada"
      description="Confirma a data real de execução e o custo final — gera o lançamento financeiro automaticamente."
    >
      <div className="space-y-4">
        <div>
          <Label>Data de execução *</Label>
          <Input type="date" value={dataExecucao} onChange={(e) => setDataExecucao(e.target.value)} />
        </div>
        <div>
          <Label>Custo final (R$)</Label>
          <Input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || !dataExecucao}
            onClick={() => onConfirm(dataExecucao, custo ? Number(custo) : null)}
          >
            {isPending ? 'Salvando…' : 'Confirmar realização'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
