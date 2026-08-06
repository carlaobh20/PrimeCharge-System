import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateManutencao } from '../hooks/useManutencoes';
import { MANUTENCAO_TIPO_LABEL, type ManutencaoTipo } from '../types';

const TIPOS: ManutencaoTipo[] = ['preventiva', 'corretiva', 'outro'];

// Fecha o buraco encontrado na auditoria da Missão 2 (2026-08-06): antes desta tela, o único
// jeito de registrar manutenção era um Lançamento financeiro genérico, sem data de execução,
// oficina, KM ou tipo — nenhum histórico estruturado.
//
// Missão 4 (Fase 3): "já realizada" vs. "agendar para depois" — antes só existia a primeira
// opção (data_execucao sempre obrigatória), tornando "manutenções pendentes" impossível de
// calcular mesmo em tese. Custo automaticamente gera um Lançamento de despesa quando a
// manutenção é realizada (trigger `fn_manutencao_gera_lancamento`, migration 0012, fecha
// DEC-079) — não precisa mais duplicar o lançamento manualmente no Financeiro.
export function NovaManutencaoDialog({
  open,
  onOpenChange,
  veiculoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
}) {
  const { data: usuario } = useCurrentUsuario();
  const createManutencao = useCreateManutencao();

  const [jaRealizada, setJaRealizada] = useState(true);
  const [tipo, setTipo] = useState<ManutencaoTipo>('preventiva');
  const [descricao, setDescricao] = useState('');
  const [oficina, setOficina] = useState('');
  const [km, setKm] = useState('');
  const [custo, setCusto] = useState('');
  const [dataExecucao, setDataExecucao] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataAgendada, setDataAgendada] = useState('');

  function handleClose() {
    setJaRealizada(true);
    setTipo('preventiva');
    setDescricao('');
    setOficina('');
    setKm('');
    setCusto('');
    setDataExecucao(new Date().toISOString().slice(0, 10));
    setDataAgendada('');
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!usuario?.empresa_id || !descricao.trim()) return;
    if (jaRealizada && !dataExecucao) return;
    if (!jaRealizada && !dataAgendada) return;
    createManutencao.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          veiculo_id: veiculoId,
          tipo,
          descricao: descricao.trim(),
          oficina: oficina.trim() || null,
          km: km ? Number(km) : null,
          custo: custo ? Number(custo) : null,
          data_execucao: jaRealizada ? dataExecucao : null,
          data_agendada: jaRealizada ? null : dataAgendada,
          status_execucao: jaRealizada ? 'realizada' : 'agendada',
        },
      },
      {
        onSuccess: () => {
          toast.success(jaRealizada ? 'Manutenção registrada' : 'Manutenção agendada');
          handleClose();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Nova manutenção" description="Registro estruturado — fica no histórico do veículo.">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-lg border border-neutral-200 p-1 dark:border-white/10">
          <button
            type="button"
            onClick={() => setJaRealizada(true)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${jaRealizada ? 'bg-emerald-600 text-white' : 'text-neutral-500'}`}
          >
            Já realizada
          </button>
          <button
            type="button"
            onClick={() => setJaRealizada(false)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${!jaRealizada ? 'bg-emerald-600 text-white' : 'text-neutral-500'}`}
          >
            Agendar para depois
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as ManutencaoTipo)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {MANUTENCAO_TIPO_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          {jaRealizada ? (
            <div>
              <Label>Data de execução *</Label>
              <Input type="date" value={dataExecucao} onChange={(e) => setDataExecucao(e.target.value)} />
            </div>
          ) : (
            <div>
              <Label>Data agendada *</Label>
              <Input type="date" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <Label>Descrição *</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Troca de pastilhas de freio" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Oficina</Label>
            <Input value={oficina} onChange={(e) => setOficina(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>KM</Label>
            <Input type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div>
          <Label>Custo (R$){jaRealizada ? ' — gera lançamento financeiro automaticamente' : ''}</Label>
          <Input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Opcional" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createManutencao.isPending || !descricao.trim()}>
            {createManutencao.isPending ? 'Salvando…' : jaRealizada ? 'Registrar manutenção' : 'Agendar manutenção'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
