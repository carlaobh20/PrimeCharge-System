import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useLancamentos } from '../hooks/useLancamentos';
import { useContasBancarias } from '../hooks/useContasBancarias';
import { useCreatePagamento } from '../hooks/usePagamentos';
import { FORMA_PAGAMENTO_LABEL, type FormaPagamento } from '../types';

const FORMAS: FormaPagamento[] = ['pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro'];

// Fecha o achado mais crítico da auditoria da Missão 2 (2026-08-06): a API/hooks de Pagamento
// existiam completos desde a Sprint 8, mas não havia rota, página ou dialog em lugar nenhum
// que os chamasse — registrar que um motorista pagou o aluguel só era possível via SQL direto.
export function NovoPagamentoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: usuario } = useCurrentUsuario();
  const { data: lancamentos } = useLancamentos({ status: 'todos' });
  const { data: contasBancarias } = useContasBancarias();
  const createPagamento = useCreatePagamento();

  const candidatos = (lancamentos ?? []).filter((l) => l.status !== 'cancelada');

  const [lancamentoId, setLancamentoId] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [valor, setValor] = useState('');
  const [dataPrevista, setDataPrevista] = useState(() => new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');

  useEffect(() => {
    if (open && candidatos.length > 0 && !lancamentoId) {
      setLancamentoId(candidatos[0].id);
      setValor(String(candidatos[0].valor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidatos.length]);

  useEffect(() => {
    if (contasBancarias && contasBancarias.length > 0 && !contaBancariaId) {
      setContaBancariaId(contasBancarias[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contasBancarias]);

  function handleClose() {
    setLancamentoId('');
    setContaBancariaId('');
    setValor('');
    setDataPrevista(new Date().toISOString().slice(0, 10));
    setFormaPagamento('pix');
    onOpenChange(false);
  }

  function handleLancamentoChange(id: string) {
    setLancamentoId(id);
    const lancamento = candidatos.find((l) => l.id === id);
    if (lancamento) setValor(String(lancamento.valor));
  }

  function handleSubmit() {
    if (!usuario?.empresa_id || !lancamentoId || !contaBancariaId || !valor) return;
    createPagamento.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          lancamento_id: lancamentoId,
          conta_bancaria_id: contaBancariaId,
          valor: Number(valor),
          forma_pagamento: formaPagamento,
          data_prevista: dataPrevista,
          observacoes: null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Pagamento registrado como pendente');
          handleClose();
        },
      }
    );
  }

  const semLancamentos = candidatos.length === 0;
  const semContas = (contasBancarias?.length ?? 0) === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Novo pagamento"
      description="Vincula um pagamento a um lançamento existente — nasce como pendente, marque como pago quando o dinheiro entrar de verdade."
    >
      <div className="space-y-4">
        {semLancamentos && (
          <p className="text-sm text-amber-600">
            Nenhum lançamento disponível. Crie um lançamento (receita/despesa) em Lançamentos antes de registrar um pagamento.
          </p>
        )}
        {semContas && (
          <p className="text-sm text-amber-600">
            Nenhuma conta bancária cadastrada. Crie uma em Contas Bancárias antes de registrar um pagamento.
          </p>
        )}

        <div>
          <Label>Lançamento *</Label>
          <Select value={lancamentoId} onChange={(e) => handleLancamentoChange(e.target.value)} disabled={semLancamentos}>
            {candidatos.map((l) => (
              <option key={l.id} value={l.id}>
                {l.descricao} — {l.tipo === 'receita' ? '+' : '-'}
                {l.valor}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Conta bancária *</Label>
          <Select value={contaBancariaId} onChange={(e) => setContaBancariaId(e.target.value)} disabled={semContas}>
            {(contasBancarias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label>Data prevista *</Label>
            <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Forma de pagamento</Label>
          <Select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}>
            {FORMAS.map((f) => (
              <option key={f} value={f}>
                {FORMA_PAGAMENTO_LABEL[f]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createPagamento.isPending || semLancamentos || semContas || !lancamentoId || !contaBancariaId || !valor}
          >
            {createPagamento.isPending ? 'Salvando…' : 'Registrar pagamento'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
