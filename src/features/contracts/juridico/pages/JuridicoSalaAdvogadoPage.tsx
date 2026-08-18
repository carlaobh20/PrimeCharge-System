import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Gavel, Save } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { corpoMinutaMaster } from '../minutaMaster';
import { extrairPendenciasJuridicas, type PendenciaJuridicaMinuta } from '../pendenciasMinuta';
import { useParametrosJuridicos, useSaveParametro } from '../hooksFase3';

// SALA DO ADVOGADO (Fase I): cada marcação [VALIDAR COM ADVOGADO] da minuta vira um item de
// decisão com registro persistido (juridico_parametros, chave minuta_pendencia_<n> — schema
// existente, sem migration). NENHUMA marcação some sem registro: a lista vem SEMPRE do parser
// da minuta (fonte única); a decisão registrada acompanha, nunca substitui, o texto da minuta.
// Resolver aqui é REGISTRO OPERACIONAL — a minuta em si só muda quando o advogado reescrever o
// texto e o template for republicado (nova versão; contratos antigos intactos).

type DecisaoPendencia = {
  status: 'pendente' | 'em_analise' | 'resolvida';
  decisao?: string;
  texto_aprovado?: string;
  observacao?: string;
  responsavel?: string;
  data?: string;
};

const STATUS_LABEL: Record<DecisaoPendencia['status'], string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
};

export function JuridicoSalaAdvogadoPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: parametros } = useParametrosJuridicos();
  const salvar = useSaveParametro();

  const pendencias = extrairPendenciasJuridicas(corpoMinutaMaster());
  const [aberta, setAberta] = useState<number | null>(null);
  const [form, setForm] = useState<{ status: DecisaoPendencia['status']; decisao: string; texto: string; obs: string; resp: string }>({
    status: 'em_analise',
    decisao: '',
    texto: '',
    obs: '',
    resp: '',
  });

  const decisaoDe = (ordem: number): DecisaoPendencia => {
    const p = parametros?.find((x) => x.chave === `minuta_pendencia_${ordem}`);
    return (p?.valor as DecisaoPendencia) ?? { status: 'pendente' };
  };

  const abrir = (p: PendenciaJuridicaMinuta) => {
    const d = decisaoDe(p.ordem);
    setForm({
      status: d.status === 'pendente' ? 'em_analise' : d.status,
      decisao: d.decisao ?? '',
      texto: d.texto_aprovado ?? '',
      obs: d.observacao ?? '',
      resp: d.responsavel ?? '',
    });
    setAberta(p.ordem);
  };

  const gravar = (ordem: number) => {
    if (!empresaId) return;
    salvar.mutate(
      {
        empresaId,
        chave: `minuta_pendencia_${ordem}`,
        valor: {
          status: form.status,
          decisao: form.decisao || undefined,
          texto_aprovado: form.texto || undefined,
          observacao: form.obs || undefined,
          responsavel: form.resp || undefined,
          data: new Date().toISOString(),
        },
        usuarioId: usuario?.id,
      },
      {
        onSuccess: () => {
          toast.success('Decisão registrada', `Pendência ${ordem}: ${STATUS_LABEL[form.status]}`);
          setAberta(null);
        },
        onError: (e) => toast.error('Não foi possível registrar', extrairMensagemDeErro(e)),
      },
    );
  };

  const resolvidas = pendencias.filter((p) => decisaoDe(p.ordem).status === 'resolvida').length;

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Jurídico
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <Gavel className="h-6 w-6 text-emerald-600" aria-hidden /> Sala do Advogado
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            Cada marcação da minuta master vira um item de decisão. Registrar aqui documenta a decisão — o texto da minuta só
            muda quando o advogado reescrever e o template for republicado (contratos antigos permanecem congelados).
          </p>
        </div>
        <Badge variant={resolvidas === pendencias.length ? 'success' : 'warning'}>
          {resolvidas}/{pendencias.length} resolvidas
        </Badge>
      </div>

      <div className="mt-6 max-w-4xl space-y-3">
        {pendencias.map((p) => {
          const d = decisaoDe(p.ordem);
          const abertaEsta = aberta === p.ordem;
          return (
            <div key={p.ordem} className="rounded-xl border border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                onClick={() => (abertaEsta ? setAberta(null) : abrir(p))}
                aria-expanded={abertaEsta}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {p.ordem}. {p.secao}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{p.trecho}</p>
                  {d.decisao && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden /> Decisão: {d.decisao}
                      {d.responsavel && ` (${d.responsavel}${d.data ? `, ${formatDataSimples(d.data)}` : ''})`}
                    </p>
                  )}
                </div>
                <Badge variant={d.status === 'resolvida' ? 'success' : d.status === 'em_analise' ? 'info' : 'warning'}>
                  {STATUS_LABEL[d.status]}
                </Badge>
              </button>

              {abertaEsta && (
                <div className="space-y-3 border-t border-neutral-100 px-4 py-4 dark:border-neutral-800">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Status</Label>
                      <Select className="mt-1" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DecisaoPendencia['status'] }))}>
                        <option value="em_analise">Em análise</option>
                        <option value="resolvida">Resolvida</option>
                        <option value="pendente">Pendente</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Responsável (advogado)</Label>
                      <Input className="mt-1" value={form.resp} onChange={(e) => setForm((f) => ({ ...f, resp: e.target.value }))} placeholder="Nome de quem decidiu" />
                    </div>
                  </div>
                  <div>
                    <Label>Decisão</Label>
                    <Textarea className="mt-1" value={form.decisao} onChange={(e) => setForm((f) => ({ ...f, decisao: e.target.value }))} placeholder="Ex.: multa de mora 2% + juros 1% a.m., conforme art. …" />
                  </div>
                  <div>
                    <Label>Texto aprovado para a cláusula (opcional)</Label>
                    <Textarea className="mt-1 font-mono text-xs" value={form.texto} onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))} placeholder="Redação final aprovada, para substituir a marcação na minuta…" />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea className="mt-1" value={form.obs} onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))} />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={salvar.isPending || !empresaId} onClick={() => gravar(p.ordem)}>
                      <Save className="h-3.5 w-3.5" aria-hidden /> {salvar.isPending ? 'Registrando…' : 'Registrar decisão'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
