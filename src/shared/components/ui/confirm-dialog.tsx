import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

// Confirmação genérica em Dialog — substitui window.confirm() nas ações destrutivas/sensíveis
// do Cockpit (excluir, vender, bloquear). Nível "ERP antigo" era o alert nativo do navegador.
// Hoisted de features/frota/ para shared/ na Sprint 6 (DEC-025): 100% genérico, sem nenhum
// dado de domínio, e Motoristas é o segundo consumidor real (regra dos 3 / hoisting pattern).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  destructive,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={destructive ? 'destructive' : 'default'}
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Aguarde…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
