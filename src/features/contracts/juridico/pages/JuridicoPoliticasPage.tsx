import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, ChevronLeft, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useTemplatesJuridico } from '../hooks';
import { usePoliticas, useSavePolitica } from '../hooksFase3';
import type { ContratoPolitica } from '../apiFase3';

// POLÍTICA CONTRATUAL (regra 5): "Contrato motorista app", "Contrato elétrico mensal"...
// A política PARAMETRIZA (template + campos obrigatórios + anexos + regras) — nenhuma regra
// jurídica vive em código. O checklist pré-contrato consome campos_obrigatorios/anexos.

// Chaves que a política pode marcar como obrigatórias (as mesmas do checklist.ts).
const CAMPOS_DISPONIVEIS = [
  'motorista.endereco',
  'motorista.contato',
  'motorista.documentacao',
  'veiculo.renavam',
  'veiculo.chassi',
  'veiculo.vistoria',
  'veiculo.seguro',
  'comercial.caucao',
  'comercial.vencimento',
  'comercial.prazo',
  'comercial.km',
  'juridico.template_aprovado',
];

export function JuridicoPoliticasPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: politicas, isLoading } = usePoliticas();
  const { data: templates } = useTemplatesJuridico();
  const salvar = useSavePolitica();

  const [editando, setEditando] = useState<ContratoPolitica | 'nova' | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    template_id: '',
    status: 'rascunho' as ContratoPolitica['status'],
    campos: [] as string[],
    anexos: '',
    prazoAssinatura: '',
  });

  const abrir = (p: ContratoPolitica | 'nova') => {
    setEditando(p);
    if (p === 'nova') {
      setForm({ nome: '', descricao: '', template_id: '', status: 'rascunho', campos: [], anexos: '', prazoAssinatura: '' });
    } else {
      setForm({
        nome: p.nome,
        descricao: p.descricao ?? '',
        template_id: p.template_id ?? '',
        status: p.status,
        campos: p.campos_obrigatorios ?? [],
        anexos: (p.anexos_obrigatorios ?? []).join(', '),
        prazoAssinatura: String((p.regras as { assinatura_prazo_dias?: number })?.assinatura_prazo_dias ?? ''),
      });
    }
  };

  const gravar = () => {
    if (!empresaId || editando === null) return;
    salvar.mutate(
      {
        empresaId,
        id: editando === 'nova' ? undefined : editando.id,
        payload: {
          nome: form.nome.trim(),
          descricao: form.descricao || null,
          template_id: form.template_id || null,
          status: form.status,
          campos_obrigatorios: form.campos,
          anexos_obrigatorios: form.anexos.split(',').map((a) => a.trim()).filter(Boolean),
          regras: form.prazoAssinatura ? { assinatura_prazo_dias: Number(form.prazoAssinatura) } : {},
        },
      },
      {
        onSuccess: () => {
          toast.success('Política salva');
          setEditando(null);
        },
        onError: (e) => toast.error('Não foi possível salvar', extrairMensagemDeErro(e)),
      },
    );
  };

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" /> Jurídico
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <BookMarked className="h-6 w-6 text-emerald-600" /> Políticas contratuais
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cada política define template, campos obrigatórios, anexos e regras — parametrizado, nada de regra jurídica em código.
          </p>
        </div>
        <Button onClick={() => abrir('nova')}>
          <Plus className="h-4 w-4" /> Nova política
        </Button>
      </div>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (politicas ?? []).length === 0 && (
        <div className="mt-6">
          <EmptyState icon={BookMarked} title="Nenhuma política" description='Ex.: "Contrato motorista de aplicativo — semanal" com seguro e vistoria obrigatórios.' />
        </div>
      )}

      <div className="mt-6 space-y-2">
        {(politicas ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {p.nome}
                <Badge variant={p.status === 'ativa' ? 'success' : p.status === 'arquivada' ? 'outline' : 'secondary'}>{p.status}</Badge>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {p.campos_obrigatorios.length} campo(s) obrigatório(s) · {p.anexos_obrigatorios.length} anexo(s) ·{' '}
                {templates?.find((t) => t.id === p.template_id)?.nome ?? 'sem template'} · atualizada {formatDataSimples(p.atualizado_em)}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => abrir(p)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)} title={editando === 'nova' ? 'Nova política' : 'Editar política'} className="max-w-2xl">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input className="mt-1" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder='Ex.: "Motorista app — semanal"' />
            </div>
            <div>
              <Label>Status</Label>
              <Select className="mt-1" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContratoPolitica['status'] }))}>
                <option value="rascunho">Rascunho</option>
                <option value="ativa">Ativa</option>
                <option value="arquivada">Arquivada</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Template</Label>
              <Select className="mt-1" value={form.template_id} onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}>
                <option value="">— selecionar —</option>
                {(templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} (v{t.versao_template}, {t.status})
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea className="mt-1" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div>
            <Label>Campos obrigatórios (além do mínimo base)</Label>
            <div className="mt-1 grid gap-1.5 md:grid-cols-2">
              {CAMPOS_DISPONIVEIS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs dark:border-neutral-800">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-emerald-600"
                    checked={form.campos.includes(c)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, campos: e.target.checked ? [...f.campos, c] : f.campos.filter((x) => x !== c) }))
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Anexos obrigatórios (separados por vírgula)</Label>
              <Input className="mt-1" value={form.anexos} onChange={(e) => setForm((f) => ({ ...f, anexos: e.target.value }))} placeholder="cnh, apolice_seguro" />
            </div>
            <div>
              <Label>Prazo de assinatura (dias, opcional)</Label>
              <Input type="number" min={1} className="mt-1" value={form.prazoAssinatura} onChange={(e) => setForm((f) => ({ ...f, prazoAssinatura: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button disabled={form.nome.trim().length < 3 || salvar.isPending} onClick={gravar}>
              {salvar.isPending ? 'Salvando…' : 'Salvar política'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
