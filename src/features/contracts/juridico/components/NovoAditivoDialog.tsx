import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { useCreateAditivo } from '../hooks';
import { CONTRATO_ADITIVO_TIPO_LABEL, type ContratoAditivoTipo } from '../types';

// Novo aditivo (regra 30): NUNCA altera o contrato original — cria registro em contrato_aditivos.
// O documento do aditivo, quando necessário, é uma NOVA VERSÃO do contrato (rotulada como
// aditivo) — gerada da tela de versões, ligada a este registro.
export function NovoAditivoDialog({
  open,
  onOpenChange,
  empresaId,
  contratoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string | undefined;
  contratoId: string;
}) {
  const [tipo, setTipo] = useState<ContratoAditivoTipo>('valor');
  const [descricao, setDescricao] = useState('');
  const criar = useCreateAditivo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Novo aditivo" description="O contrato original permanece intacto — o aditivo é um registro novo, com documento próprio.">
      <div className="space-y-3">
        <div>
          <Label>Tipo de aditivo</Label>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as ContratoAditivoTipo)} className="mt-1">
            {Object.entries(CONTRATO_ADITIVO_TIPO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Descrição da mudança e motivo</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Reajuste do valor semanal de R$ 1.400 para R$ 1.500 a partir de 01/10, conforme negociação…"
            className="mt-1 min-h-[90px]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!empresaId || descricao.trim().length < 5 || criar.isPending}
            onClick={() =>
              criar.mutate(
                { empresaId: empresaId!, payload: { contrato_id: contratoId, tipo, descricao: descricao.trim() } },
                {
                  onSuccess: () => {
                    toast.success('Aditivo criado em rascunho', 'Gere a versão-documento do aditivo na aba Versões.');
                    setDescricao('');
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error('Não foi possível criar o aditivo', extrairMensagemDeErro(e)),
                },
              )
            }
          >
            Criar aditivo
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
