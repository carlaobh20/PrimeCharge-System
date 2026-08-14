import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCreateInteracao } from '@/shared/capabilities/hooks/useInteracoes';
import { INTERACAO_CANAL_LABEL, type InteracaoCanal } from '@/shared/capabilities/types';

// datetime-local não tem timezone — assume horário local do navegador, convertido pra ISO no
// submit. Default = agora, mas o campo é editável: registrar uma conversa retroativa (ex.:
// ligação de ontem que só foi digitada hoje) é o caso de uso explícito da Fase 1.2.
function agoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function RegistrarConversaDialog({
  open,
  onOpenChange,
  empresaId,
  entidadeId,
  usuarioId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string | undefined;
  entidadeId: string;
  usuarioId: string | undefined;
}) {
  const [canal, setCanal] = useState<InteracaoCanal>('whatsapp');
  const [ocorridaEm, setOcorridaEm] = useState(agoraLocal());
  const [conteudo, setConteudo] = useState('');
  const createInteracao = useCreateInteracao('motorista', entidadeId);

  function handleClose(next: boolean) {
    if (!next) {
      setCanal('whatsapp');
      setOcorridaEm(agoraLocal());
      setConteudo('');
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!empresaId || !usuarioId || !conteudo.trim()) return;
    createInteracao.mutate(
      {
        empresaId,
        entidadeTipo: 'motorista',
        entidadeId,
        ocorridaEm: new Date(ocorridaEm).toISOString(),
        canal,
        conteudo: conteudo.trim(),
        usuarioId,
      },
      {
        onSuccess: () => {
          toast.success('Conversa registrada');
          handleClose(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Registrar conversa" description="Fica salva na timeline do motorista.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Canal</Label>
            <Select value={canal} onChange={(e) => setCanal(e.target.value as InteracaoCanal)}>
              {Object.entries(INTERACAO_CANAL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quando aconteceu</Label>
            <Input type="datetime-local" value={ocorridaEm} onChange={(e) => setOcorridaEm(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Conteúdo</Label>
          <Textarea
            rows={5}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Conteúdo completo da conversa…"
          />
        </div>
        {createInteracao.isError && <p className="text-xs text-red-600">Erro ao registrar: {(createInteracao.error as Error).message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createInteracao.isPending || !conteudo.trim()}>
            {createInteracao.isPending ? 'Salvando…' : 'Registrar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
