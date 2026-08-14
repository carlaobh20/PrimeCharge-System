import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useCentrosCusto } from '../hooks/useCentrosCusto';
import { usePlanoContas } from '../hooks/usePlanoContas';
import { useCentrosResultado } from '../hooks/useCentrosResultado';
import { useCreateLancamento } from '../hooks/useLancamentos';
import { lancamentoSchema, type LancamentoFormInput, type LancamentoFormValues } from '../schemas/lancamento.schema';
import { LANCAMENTO_TIPO_LABEL } from '../types';

// Sem página de detalhe própria (DEC-052) — criação/edição de Lançamento acontece direto na
// lista, via este Dialog, mesmo primitivo já usado pelos Command Actions dos Cockpits.
export function LancamentoFormDialog({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<LancamentoFormInput>;
}) {
  const { data: usuario } = useCurrentUsuario();
  const { data: centrosCusto } = useCentrosCusto();
  const { data: planoContas } = usePlanoContas();
  const { data: centrosResultado } = useCentrosResultado();
  // Sem filtro de status aqui de propósito — cobre qualquer contrato (rascunho a encerrado);
  // vincular um lançamento a um contrato que não está mais ativo ainda é um vínculo válido.
  const { data: contratos } = useContratos();
  const createLancamento = useCreateLancamento();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LancamentoFormInput, unknown, LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: { tipo: 'despesa', ...defaultValues },
  });

  // Contrato já traz veiculo_id/motorista_id (join de useContratos) — ao selecionar um
  // contrato, propaga essas duas FKs automaticamente (campos ocultos, sem Select próprio).
  // Limpar o contrato limpa as duas junto.
  function handleContratoChange(contratoId: string) {
    setValue('contrato_id', contratoId || undefined);
    const contrato = contratos?.find((c) => c.id === contratoId);
    setValue('veiculo_id', contrato?.veiculo_id ?? undefined);
    setValue('motorista_id', contrato?.motorista_id ?? undefined);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function onSubmit(values: LancamentoFormValues) {
    if (!usuario?.empresa_id) return;
    createLancamento.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          tipo: values.tipo,
          descricao: values.descricao,
          valor: values.valor,
          categoria: values.categoria ?? null,
          centro_custo_id: values.centro_custo_id ?? null,
          contrato_id: values.contrato_id ?? null,
          veiculo_id: values.veiculo_id ?? null,
          motorista_id: values.motorista_id ?? null,
          conta_contabil_id: values.conta_contabil_id ?? null,
          centro_resultado_id: values.centro_resultado_id ?? null,
          data_prevista: values.data_prevista,
          observacoes: values.observacoes ?? null,
        },
      },
      { onSuccess: () => { toast.success('Lançamento criado'); handleClose(); } }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Novo lançamento" description="Receita ou despesa — Provisão é um lançamento com status Prevista.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo *</Label>
            <Select {...register('tipo')}>
              {Object.entries(LANCAMENTO_TIPO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Valor *</Label>
            <Input type="number" step="0.01" {...register('valor')} />
            {errors.valor && <p className="mt-1 text-xs text-red-600">{errors.valor.message}</p>}
          </div>
        </div>

        <div>
          <Label>Descrição *</Label>
          <Input {...register('descricao')} placeholder="Ex.: Manutenção preventiva, Aluguel recebido…" />
          {errors.descricao && <p className="mt-1 text-xs text-red-600">{errors.descricao.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data prevista *</Label>
            <Input type="date" {...register('data_prevista')} />
            {errors.data_prevista && <p className="mt-1 text-xs text-red-600">{errors.data_prevista.message}</p>}
          </div>
          <div>
            <Label>Centro de custo</Label>
            <Select {...register('centro_custo_id')}>
              <option value="">Sem centro de custo</option>
              {centrosCusto?.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Contrato</Label>
          <Select
            {...register('contrato_id', { onChange: (e) => handleContratoChange(e.target.value) })}
          >
            <option value="">Nenhum contrato</option>
            {contratos?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.veiculo?.placa ?? '—'} · {c.motorista?.nome_completo ?? '—'}
              </option>
            ))}
          </Select>
          {/* veiculo_id/motorista_id não têm Select próprio — vêm do contrato selecionado
              acima (handleContratoChange), campos ocultos só para entrar no payload. */}
          <input type="hidden" {...register('veiculo_id')} />
          <input type="hidden" {...register('motorista_id')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Conta contábil</Label>
            <Select {...register('conta_contabil_id')}>
              <option value="">Automático</option>
              {planoContas?.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  {pc.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Centro de resultado</Label>
            <Select {...register('centro_resultado_id')}>
              <option value="">Automático</option>
              {centrosResultado?.map((cr) => (
                <option key={cr.id} value={cr.id}>
                  {cr.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Categoria</Label>
          <Input {...register('categoria')} placeholder="Ex.: manutencao, combustivel, salario…" />
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea {...register('observacoes')} rows={2} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createLancamento.isPending}>
            {createLancamento.isPending ? 'Salvando…' : 'Criar lançamento'}
          </Button>
        </div>
        {createLancamento.isError && (
          <p className="text-sm text-red-600">Erro ao criar lançamento: {(createLancamento.error as Error).message}</p>
        )}
      </form>
    </Dialog>
  );
}
