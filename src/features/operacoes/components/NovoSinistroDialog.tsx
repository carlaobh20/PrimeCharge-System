import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useCreateSinistro } from '../hooks/useSinistros';
import { SINISTRO_TIPO_LABEL, type SinistroTipo } from '../types';

// Registro manual de sinistro pelo staff. A vistoria de devolução já cria sinistros
// automaticamente (houve_sinistro=true); esta tela cobre o registro manual e a visibilidade.
// Reflete só as colunas que a tabela tem (tipo/data/descrição + vínculos) — sem inventar
// valor/seguradora/status, que não existem no schema.
const TIPOS = Object.keys(SINISTRO_TIPO_LABEL) as SinistroTipo[];

export function NovoSinistroDialog({
  open,
  onOpenChange,
  veiculoId,
  motoristaId,
  contratoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId?: string;
  motoristaId?: string | null;
  contratoId?: string | null;
}) {
  const { data: usuario } = useCurrentUsuario();
  const { data: veiculos } = useVeiculos();
  const createSinistro = useCreateSinistro();

  const [veiculoSelecionado, setVeiculoSelecionado] = useState(veiculoId ?? '');
  const [tipo, setTipo] = useState<SinistroTipo>('colisao');
  const [dataOcorrencia, setDataOcorrencia] = useState(() => new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (open) setVeiculoSelecionado(veiculoId ?? '');
  }, [open, veiculoId]);

  function handleClose() {
    setTipo('colisao');
    setDataOcorrencia(new Date().toISOString().slice(0, 10));
    setDescricao('');
    onOpenChange(false);
  }

  function handleSubmit() {
    const veiculoFinal = veiculoId ?? veiculoSelecionado;
    if (!usuario?.empresa_id || !veiculoFinal) return;
    createSinistro.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          veiculo_id: veiculoFinal,
          motorista_id: motoristaId ?? null,
          contrato_id: contratoId ?? null,
          tipo,
          data_ocorrencia: dataOcorrencia,
          descricao: descricao.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Sinistro registrado');
          handleClose();
        },
      }
    );
  }

  const podeSalvar = !!(veiculoId || veiculoSelecionado);

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Registrar sinistro" description="Ocorrência (colisão, roubo, avaria…) vinculada ao veículo.">
      <div className="space-y-4">
        {!veiculoId && (
          <div>
            <Label>Veículo *</Label>
            <Select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)}>
              <option value="">Selecione…</option>
              {(veiculos ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo *</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as SinistroTipo)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {SINISTRO_TIPO_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data da ocorrência *</Label>
            <Input type="date" value={dataOcorrencia} onChange={(e) => setDataOcorrencia(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Descrição</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Colisão traseira no estacionamento" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createSinistro.isPending || !podeSalvar}>
            {createSinistro.isPending ? 'Salvando…' : 'Registrar sinistro'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
