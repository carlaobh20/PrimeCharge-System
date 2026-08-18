import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { useSaveSeguro, useSeguros } from '../hooksFase3';
import type { ContratoSeguro } from '../apiFase3';

// SEGURO (regra 7). Coberturas em TRÊS estados: coberto / não coberto / não informado —
// NUNCA assumimos cobertura que não existe. A apólice (arquivo) vai pra aba Anexos
// (bucket contratos-arquivos, categoria 'apolice_seguro'); aqui ficam os dados.

const COBERTURAS: { chave: string; rotulo: string }[] = [
  { chave: 'terceiros', rotulo: 'Danos a terceiros' },
  { chave: 'roubo_furto', rotulo: 'Roubo/Furto' },
  { chave: 'colisao', rotulo: 'Colisão' },
  { chave: 'incendio', rotulo: 'Incêndio' },
];

export function SeguroPanel({ contratoId, empresaId }: { contratoId: string; empresaId: string | undefined }) {
  const { data: seguros, isLoading } = useSeguros(contratoId);
  const salvar = useSaveSeguro();
  const seguro: ContratoSeguro | undefined = seguros?.[0];

  const [form, setForm] = useState({
    seguradora: '',
    apolice: '',
    vigencia_inicio: '',
    vigencia_fim: '',
    franquia: 0,
    assistencia: '',
    observacoes: '',
    coberturas: {} as Record<string, boolean | null>,
  });

  useEffect(() => {
    if (seguro) {
      setForm({
        seguradora: seguro.seguradora ?? '',
        apolice: seguro.apolice ?? '',
        vigencia_inicio: seguro.vigencia_inicio ?? '',
        vigencia_fim: seguro.vigencia_fim ?? '',
        franquia: seguro.franquia_valor ?? 0,
        assistencia: seguro.assistencia ?? '',
        observacoes: seguro.observacoes ?? '',
        coberturas: seguro.coberturas ?? {},
      });
    }
  }, [seguro]);

  const hoje = new Date().toISOString().slice(0, 10);
  const alertas: string[] = [];
  if (!isLoading && !seguro) alertas.push('Seguro não cadastrado para este contrato.');
  if (seguro && !seguro.apolice) alertas.push('Número da apólice não informado.');
  if (seguro?.vigencia_fim && seguro.vigencia_fim < hoje) alertas.push(`Seguro VENCIDO em ${formatDataSimples(seguro.vigencia_fim)}.`);
  else if (seguro?.vigencia_fim && new Date(seguro.vigencia_fim).getTime() - Date.now() < 30 * 86400000)
    alertas.push(`Seguro vence em ${formatDataSimples(seguro.vigencia_fim)} (menos de 30 dias).`);

  if (isLoading) return <p className="text-sm text-neutral-500">Carregando seguro…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      {alertas.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
          {alertas.map((a) => (
            <p key={a} className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {a}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Seguradora</Label>
          <Input className="mt-1" value={form.seguradora} onChange={(e) => setForm((f) => ({ ...f, seguradora: e.target.value }))} />
        </div>
        <div>
          <Label>Apólice</Label>
          <Input className="mt-1" value={form.apolice} onChange={(e) => setForm((f) => ({ ...f, apolice: e.target.value }))} />
        </div>
        <div>
          <Label>Início da vigência</Label>
          <Input type="date" className="mt-1" value={form.vigencia_inicio} onChange={(e) => setForm((f) => ({ ...f, vigencia_inicio: e.target.value }))} />
        </div>
        <div>
          <Label>Fim da vigência</Label>
          <Input type="date" className="mt-1" value={form.vigencia_fim} onChange={(e) => setForm((f) => ({ ...f, vigencia_fim: e.target.value }))} />
        </div>
        <div>
          <Label>Franquia (R$)</Label>
          <Input
            inputMode="numeric"
            className="mt-1 text-right"
            value={formatarMoedaInput(form.franquia)}
            onChange={(e) => setForm((f) => ({ ...f, franquia: digitosParaReais(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Assistência</Label>
          <Input className="mt-1" placeholder="Ex.: guincho 24h, carro reserva…" value={form.assistencia} onChange={(e) => setForm((f) => ({ ...f, assistencia: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label>Coberturas</Label>
        <p className="mb-2 mt-0.5 text-[11px] text-neutral-400">
          Três estados: coberto / não coberto / não informado. O sistema nunca assume cobertura não declarada.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {COBERTURAS.map((c) => (
            <div key={c.chave} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{c.rotulo}</span>
              <Select
                value={form.coberturas[c.chave] === true ? 'sim' : form.coberturas[c.chave] === false ? 'nao' : 'nd'}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    coberturas: { ...f.coberturas, [c.chave]: e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null },
                  }))
                }
                className="h-8 w-36 text-xs"
              >
                <option value="nd">Não informado</option>
                <option value="sim">Coberto</option>
                <option value="nao">Não coberto</option>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea className="mt-1" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-neutral-400">Anexe a apólice (PDF) na aba Anexos, categoria “juridico”.</p>
        <Button
          disabled={!empresaId || salvar.isPending}
          onClick={() =>
            salvar.mutate(
              {
                empresaId: empresaId!,
                contratoId,
                id: seguro?.id,
                payload: {
                  seguradora: form.seguradora || null,
                  apolice: form.apolice || null,
                  vigencia_inicio: form.vigencia_inicio || null,
                  vigencia_fim: form.vigencia_fim || null,
                  franquia_valor: form.franquia || null,
                  assistencia: form.assistencia || null,
                  observacoes: form.observacoes || null,
                  coberturas: form.coberturas,
                },
              },
              {
                onSuccess: () => toast.success('Seguro salvo'),
                onError: (e) => toast.error('Não foi possível salvar o seguro', extrairMensagemDeErro(e)),
              },
            )
          }
        >
          <ShieldCheck className="h-4 w-4" /> {salvar.isPending ? 'Salvando…' : seguro ? 'Atualizar seguro' : 'Cadastrar seguro'}
        </Button>
      </div>
    </div>
  );
}
