import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useCreateMulta } from '../hooks/useMultas';

// Fecha o achado #12 da auditoria de jornada da Missão 4: multa era o único ponto da jornada
// operacional sem NENHUMA infraestrutura (nem tabela, nem tela) — diferente de itens
// conscientemente recusados (Battery Intelligence, Marketplace), nunca tinha sido avaliado.
// A infração pertence à placa primeiro (é como ela chega — radar/órgão de trânsito autua o
// dono do veículo), o motorista é opcional e pode ser preenchido depois (`motoristaId` vem
// pré-selecionado quando aberto do Cockpit do Motorista; `veiculoId` quando aberto do
// Cockpit do Veículo — quando falta um dos dois, a tela pede pra escolher).
export function NovaMultaDialog({
  open,
  onOpenChange,
  veiculoId,
  motoristaId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId?: string;
  motoristaId?: string;
}) {
  const { data: usuario } = useCurrentUsuario();
  const { data: veiculos } = useVeiculos();
  const createMulta = useCreateMulta();

  const [veiculoSelecionado, setVeiculoSelecionado] = useState(veiculoId ?? '');
  const [orgaoAutuador, setOrgaoAutuador] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInfracao, setDataInfracao] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataVencimento, setDataVencimento] = useState('');
  const [valor, setValor] = useState('');
  const [pontos, setPontos] = useState('');

  useEffect(() => {
    if (open) setVeiculoSelecionado(veiculoId ?? '');
  }, [open, veiculoId]);

  function handleClose() {
    setOrgaoAutuador('');
    setDescricao('');
    setDataInfracao(new Date().toISOString().slice(0, 10));
    setDataVencimento('');
    setValor('');
    setPontos('');
    onOpenChange(false);
  }

  function handleSubmit() {
    const veiculoFinal = veiculoId ?? veiculoSelecionado;
    if (!usuario?.empresa_id || !veiculoFinal || !orgaoAutuador.trim() || !descricao.trim()) return;
    createMulta.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          veiculo_id: veiculoFinal,
          motorista_id: motoristaId ?? null,
          contrato_id: null,
          orgao_autuador: orgaoAutuador.trim(),
          descricao: descricao.trim(),
          data_infracao: dataInfracao,
          data_vencimento: dataVencimento || null,
          valor: valor ? Number(valor) : null,
          pontos: pontos ? Number(pontos) : null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Multa registrada');
          handleClose();
        },
      }
    );
  }

  const podeSalvar = (veiculoId || veiculoSelecionado) && orgaoAutuador.trim() && descricao.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Registrar multa" description="Infração de trânsito vinculada ao veículo.">
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
            <Label>Órgão autuador *</Label>
            <Input value={orgaoAutuador} onChange={(e) => setOrgaoAutuador(e.target.value)} placeholder="Ex.: DETRAN-SP" />
          </div>
          <div>
            <Label>Data da infração *</Label>
            <Input type="date" value={dataInfracao} onChange={(e) => setDataInfracao(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Descrição *</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Excesso de velocidade" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>Pontos</Label>
            <Input type="number" min={0} value={pontos} onChange={(e) => setPontos(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createMulta.isPending || !podeSalvar}>
            {createMulta.isPending ? 'Salvando…' : 'Registrar multa'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
