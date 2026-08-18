import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Scale, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { corpoMinutaMaster } from '../minutaMaster';
import { extrairPendenciasJuridicas } from '../pendenciasMinuta';
import { useParametrosJuridicos, useSaveParametro } from '../hooksFase3';
import { PARAMETROS_CONHECIDOS } from '../apiFase3';

// PARÂMETROS JURÍDICOS (regras 8/9/10/12/15) + PENDÊNCIAS DA MINUTA (regra 24).
// Este é o lugar onde o ADVOGADO define as decisões — manutenção, bateria/recarga, LGPD,
// prazo de assinatura, janelas de renovação. O sistema NÃO define nada disso sozinho; exibe e
// aplica operacionalmente o que estiver configurado. As marcações [VALIDAR COM ADVOGADO] da
// minuta são listadas aqui para nunca sumirem silenciosamente.

const CAMPOS_TEXTO = ['manutencao_responsabilidades', 'bateria_recarga', 'lgpd_telemetria'];
const CAMPOS_NUMERO = ['assinatura_prazo_dias'];
const CAMPOS_LISTA = ['renovacao_janelas_dias'];

export function JuridicoParametrosPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: parametros, isLoading } = useParametrosJuridicos();
  const salvar = useSaveParametro();

  const [valores, setValores] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!parametros) return;
    const iniciais: Record<string, string> = {};
    for (const chave of [...CAMPOS_TEXTO, ...CAMPOS_NUMERO, ...CAMPOS_LISTA]) {
      const p = parametros.find((x) => x.chave === chave);
      if (!p) continue;
      if (CAMPOS_TEXTO.includes(chave)) iniciais[chave] = String((p.valor as { texto?: string }).texto ?? '');
      else if (CAMPOS_NUMERO.includes(chave)) iniciais[chave] = String((p.valor as { dias?: number }).dias ?? '');
      else iniciais[chave] = ((p.valor as { dias?: number[] }).dias ?? []).join(', ');
    }
    setValores((v) => ({ ...iniciais, ...v }));
  }, [parametros]);

  const gravar = (chave: string) => {
    if (!empresaId) return;
    const bruto = valores[chave] ?? '';
    let valor: Record<string, unknown>;
    if (CAMPOS_TEXTO.includes(chave)) valor = { texto: bruto };
    else if (CAMPOS_NUMERO.includes(chave)) valor = { dias: Number(bruto) || null };
    else valor = { dias: bruto.split(',').map((d) => Number(d.trim())).filter((n) => Number.isFinite(n) && n > 0) };
    salvar.mutate(
      { empresaId, chave, valor, usuarioId: usuario?.id },
      {
        onSuccess: () => toast.success('Parâmetro salvo', chave),
        onError: (e) => toast.error('Não foi possível salvar', extrairMensagemDeErro(e)),
      },
    );
  };

  const pendencias = extrairPendenciasJuridicas(corpoMinutaMaster());

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" /> Jurídico
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        <Scale className="h-6 w-6 text-emerald-600" /> Parâmetros jurídicos
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-neutral-500">
        As decisões abaixo são do ADVOGADO/gestão — o sistema não define nenhuma delas sozinho. O que estiver vazio permanece
        como pendência de decisão jurídica.
      </p>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}

      <div className="mt-6 grid max-w-5xl gap-4 lg:grid-cols-2">
        {PARAMETROS_CONHECIDOS.map((p) => (
          <div key={p.chave} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <Label>{p.rotulo}</Label>
            <p className="mb-2 mt-0.5 text-[11px] leading-snug text-neutral-400">{p.descricao}</p>
            {CAMPOS_TEXTO.includes(p.chave) ? (
              <Textarea
                className="min-h-[110px] text-xs"
                placeholder="Defina aqui a política (texto livre, para validação do advogado)…"
                value={valores[p.chave] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [p.chave]: e.target.value }))}
              />
            ) : (
              <Input
                className="max-w-[220px]"
                placeholder={CAMPOS_LISTA.includes(p.chave) ? '90, 60, 30, 15, 7' : 'ex.: 7'}
                value={valores[p.chave] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [p.chave]: e.target.value }))}
              />
            )}
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" disabled={salvar.isPending || !empresaId} onClick={() => gravar(p.chave)}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pendências jurídicas da minuta (regra 24) */}
      <div className="mt-10 max-w-5xl">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Pendências jurídicas da minuta ({pendencias.length})
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Cada marcação <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">[VALIDAR COM ADVOGADO]</code> do
          Contrato Master — nenhuma pode sumir silenciosamente. Resolver = advogado decide, minuta é atualizada e o template
          republicado (gera nova versão; contratos antigos não mudam).
        </p>
        <div className="mt-4 space-y-2">
          {pendencias.map((p) => (
            <div key={p.ordem} className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/10">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {p.ordem}. {p.secao}
              </p>
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{p.trecho}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
