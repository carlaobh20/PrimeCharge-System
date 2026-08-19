import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Download, Inbox } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useTemplatesJuridico } from '../hooks';
import { supabase } from '@/shared/lib/supabase';
import {
  baixarArquivoRetorno,
  CATEGORIA_PROTOCOLO,
  CATEGORIA_RETORNO,
  listRetornosAdvogado,
  statusRetornoDerivado,
  STATUS_RETORNO_LABEL,
} from '../apiRetornos';
import type { TemplateVersaoHistorico } from '../apiBiblioteca';

// RETORNOS DO ADVOGADO (Fase 7/2) — caixa de entrada DERIVADA de estruturas existentes:
// arquivos (entidade contrato_template) × fotografias 0046. Nenhum dashboard novo, nenhum enum:
// status RECEBIDO/INCORPORADO derivado; a próxima ação leva ao fluxo único de importação
// (Biblioteca → template → Importar retorno). PDF permanece RECEBIDO até alguém extrair o texto.

export function JuridicoRetornosPage() {
  const { data: templates } = useTemplatesJuridico();
  const retornos = useQuery({ queryKey: ['juridico', 'retornos'], queryFn: listRetornosAdvogado });
  const historicos = useQuery({
    queryKey: ['juridico', 'retornos-historicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contrato_template_versoes')
        .select('template_id, origem, criado_em')
        .eq('origem', 'retorno_advogado');
      if (error) throw error;
      return data as Pick<TemplateVersaoHistorico, 'template_id' | 'origem' | 'criado_em'>[];
    },
  });

  const nomeTemplate = useMemo(() => new Map((templates ?? []).map((t) => [t.id, t])), [templates]);
  const recebidos = (retornos.data ?? []).filter((a) => a.categoria === CATEGORIA_RETORNO);
  const protocolos = (retornos.data ?? []).filter((a) => a.categoria === CATEGORIA_PROTOCOLO);

  const baixar = async (caminho: string, nome: string) => {
    try {
      const blob = await baixarArquivoRetorno(caminho);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Download falhou', extrairMensagemDeErro(e));
    }
  };

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Jurídico
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        <Inbox className="h-6 w-6 text-emerald-600" aria-hidden /> Retornos do Advogado
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-neutral-500">
        Arquivos efetivamente recebidos do advogado, arquivados SEM modificação, com protocolo de recebimento. O status é
        derivado: um retorno vira INCORPORADO quando a nova redação entra no template (a anterior é fotografada — nada se
        sobrescreve). A importação acontece na <Link className="text-emerald-600 hover:underline" to="/juridico/templates">Biblioteca</Link>,
        no próprio documento (aba Importar retorno).
      </p>

      {retornos.isLoading && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}
      {!retornos.isLoading && recebidos.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhum retorno arquivado ainda — importe um retorno na Biblioteca para registrá-lo aqui.</p>
      )}

      <div className="mt-6 max-w-4xl space-y-2">
        {recebidos.map((a) => {
          const t = nomeTemplate.get(a.entidade_id);
          const status = statusRetornoDerivado(
            a,
            (historicos.data ?? []).map((h) => ({ ...h, origem: 'retorno_advogado' as const })),
          );
          const ehPdf = a.nome_arquivo.toLowerCase().endsWith('.pdf');
          const protocolo = protocolos.find((p) => p.entidade_id === a.entidade_id && p.nome_arquivo.includes(a.nome_arquivo));
          return (
            <div key={a.id} className="rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t?.nome ?? 'Template não encontrado'}
                    <Badge variant={status === 'incorporado' ? 'success' : 'warning'}>{status === 'incorporado' ? 'INCORPORADO' : 'RECEBIDO'}</Badge>
                    {ehPdf && status === 'recebido' && <Badge variant="outline">PDF — extração de texto necessária</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {a.nome_arquivo} · {a.tamanho_bytes != null ? `${(a.tamanho_bytes / 1024).toFixed(1)} KB` : '—'} ·{' '}
                    {formatDataSimples(a.criado_em)} · versão atual do template: v{t?.versao_template ?? '?'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">{STATUS_RETORNO_LABEL[status]}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => baixar(a.caminho_storage, a.nome_arquivo)}>
                    <Download className="h-3.5 w-3.5" aria-hidden /> Original
                  </Button>
                  {protocolo && (
                    <Button size="sm" variant="ghost" onClick={() => baixar(protocolo.caminho_storage, protocolo.nome_arquivo)}>
                      Protocolo
                    </Button>
                  )}
                  <Link
                    to="/juridico/templates"
                    className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {status === 'recebido' ? 'Comparar / incorporar →' : 'Abrir na Biblioteca →'}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
