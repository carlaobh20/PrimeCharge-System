import { Construction } from 'lucide-react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

// Um único componente honesto para toda ação de Cockpit que ainda não tem módulo de negócio
// por trás — em vez de simular um formulário falso por ação, deixa claro que a ação existe na
// interface mas a funcionalidade ainda não foi construída. DEC-021: nada de tela em branco, mas
// também nada de dado fake. Hoisted de features/frota/ para shared/ na Sprint 6 (DEC-025): 100%
// genérico, e Motoristas é o segundo consumidor real (regra dos 3 / hoisting pattern).
export function PlaceholderActionDialog({
  open,
  onOpenChange,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Construction className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Entendi
        </Button>
      </div>
    </Dialog>
  );
}
