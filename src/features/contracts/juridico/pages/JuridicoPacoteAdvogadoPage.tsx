import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Archive, ChevronLeft, Gavel } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useTemplatesJuridico } from '../hooks';
import { useParametrosJuridicos } from '../hooksFase3';
import { listHistoricoTemplate, ORIGEM_HISTORICO_LABEL, registrarEnvioAdvogado } from '../apiBiblioteca';
import { CATEGORIA_BIBLIOTECA_LABEL, type CategoriaBiblioteca } from '../biblioteca';
import { extrairPendenciasJuridicas } from '../pendenciasMinuta';
import matrizRaw from '../../../../../docs/juridico/MATRIZ-VARIAVEIS.md?raw';
import type { ContratoTemplate } from '../types';

// PACOTE PARA ADVOGADO (Fase 17): seleciona categorias → exporta ZIP organizado (00_Capa …
// 10_Historico_de_Versoes) via fflate + registra o ENVIO como revisão jurídica 'pendente' de
// cada template incluído (reuso de contrato_revisoes_juridicas — o status "Enviado ao advogado"
// da biblioteca deriva daí, sem enum novo).

const PASTA_POR_CATEGORIA: Record<string, string> = {
  contrato: '01_Contratos',
  aditivo: '02_Aditivos',
  termo_operacional: '03_Termos',
  termo_responsabilidade: '03_Termos',
  seguro: '04_Seguros',
  sinistro: '05_Sinistros',
  rescisao: '06_Rescisoes',
  lgpd: '07_LGPD',
};

export function JuridicoPacoteAdvogadoPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: templates, isLoading } = useTemplatesJuridico();
  const { data: parametros } = useParametrosJuridicos();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(Object.keys(PASTA_POR_CATEGORIA)));
  const [destinatario, setDestinatario] = useState('');

  const categoriasDisponiveis = [...new Set((templates ?? []).map((t) => t.tipo))].filter((c) => PASTA_POR_CATEGORIA[c]);
  const templatesSelecionados = (templates ?? []).filter((t) => selecionadas.has(t.tipo));

  const exportar = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sem empresa.');
      const incluidos: ContratoTemplate[] = templatesSelecionados;
      if (incluidos.length === 0) throw new Error('Nenhum template selecionado.');

      const { zipSync, strToU8 } = await import('fflate');
      const entradas: Record<string, Uint8Array> = {};
      const nomeArq = (t: ContratoTemplate) => `${t.nome.replace(/[^\w-]+/g, '_')}-v${t.versao_template}.md`;

      // 00_Capa + README
      const dataExp = new Date().toLocaleString('pt-BR');
      entradas['00_Capa/README.md'] = strToU8(
        [
          '# PACOTE JURÍDICO — PRIMECHARGE',
          '',
          '> Este pacote contém minutas produzidas para revisão jurídica da PrimeCharge.',
          '> NENHUM documento aqui é juridicamente validado; toda decisão pendente está marcada',
          '> [VALIDAR COM ADVOGADO] e listada em 09_Pendencias_Juridicas.',
          '',
          `Exportado em: ${dataExp}`,
          `Documentos incluídos: ${incluidos.length}`,
          '',
          '## Conteúdo',
          ...incluidos.map((t) => `- ${PASTA_POR_CATEGORIA[t.tipo] ?? '03_Termos'}/${nomeArq(t)} (v${t.versao_template})`),
          '',
          '## Como devolver',
          'Devolva cada documento revisado como arquivo .md mantendo as variáveis {{...}} do',
          'catálogo (08_Matriz_de_Variaveis). A importação no sistema preserva automaticamente a',
          'redação anterior no histórico.',
        ].join('\n'),
      );

      // 01..07 documentos
      for (const t of incluidos) {
        const pasta = PASTA_POR_CATEGORIA[t.tipo] ?? '03_Termos';
        entradas[`${pasta}/${nomeArq(t)}`] = strToU8(t.corpo);
      }

      // 08 matriz de variáveis (gerada por script, fonte única)
      entradas['08_Matriz_de_Variaveis/MATRIZ-VARIAVEIS.md'] = strToU8(matrizRaw);

      // 09 pendências jurídicas (todas as marcações por documento + decisões já registradas)
      const linhasPend: string[] = ['# PENDÊNCIAS JURÍDICAS ([VALIDAR COM ADVOGADO])', ''];
      for (const t of incluidos) {
        const pend = extrairPendenciasJuridicas(t.corpo);
        if (pend.length === 0) continue;
        linhasPend.push(`## ${t.nome} (v${t.versao_template})`, '');
        for (const p of pend) linhasPend.push(`${p.ordem}. **${p.secao}** — ${p.trecho}`);
        linhasPend.push('');
      }
      linhasPend.push('## Decisões já registradas na Sala do Advogado', '');
      const decisoes = (parametros ?? []).filter((p) => p.chave.startsWith('minuta_pendencia_'));
      if (decisoes.length === 0) linhasPend.push('Nenhuma decisão registrada ainda.');
      for (const d of decisoes) {
        const v = d.valor as { status?: string; decisao?: string; responsavel?: string };
        linhasPend.push(`- ${d.chave}: [${v.status ?? 'pendente'}] ${v.decisao ?? ''} ${v.responsavel ? `(${v.responsavel})` : ''}`);
      }
      entradas['09_Pendencias_Juridicas/PENDENCIAS.md'] = strToU8(linhasPend.join('\n'));

      // 10 histórico de versões (0046)
      const linhasHist: string[] = ['# HISTÓRICO DE VERSÕES DOS TEMPLATES', ''];
      for (const t of incluidos) {
        const hist = await listHistoricoTemplate(t.id);
        linhasHist.push(`## ${t.nome} — atual v${t.versao_template}`, '');
        if (hist.length === 0) linhasHist.push('Sem redações anteriores.', '');
        for (const h of hist) {
          linhasHist.push(`- ${formatDataSimples(h.criado_em)} · ${ORIGEM_HISTORICO_LABEL[h.origem]} (era v${h.versao_template})${h.responsavel_nome ? ` · ${h.responsavel_nome}` : ''}${h.observacao ? ` — ${h.observacao}` : ''} · SHA-256 ${h.hash_sha256 ?? '—'}`);
        }
        linhasHist.push('');
      }
      entradas['10_Historico_de_Versoes/HISTORICO.md'] = strToU8(linhasHist.join('\n'));

      const zip = zipSync(entradas);
      const blob = new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' });
      const nomeZip = `pacote-juridico-primecharge-${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeZip;
      a.click();
      URL.revokeObjectURL(url);

      // registra o ENVIO (revisão 'pendente' por template) — vira status "Enviado ao advogado"
      if (destinatario.trim().length >= 3) {
        await registrarEnvioAdvogado(empresaId, incluidos, destinatario.trim());
      }
      return { nomeZip, total: incluidos.length, registrado: destinatario.trim().length >= 3 };
    },
    onSuccess: (r) =>
      toast.success(
        `Pacote exportado (${r.total} documentos)`,
        r.registrado ? 'Envio registrado — os templates aparecem como "Enviado ao advogado".' : 'Envio NÃO registrado (informe o destinatário para registrar).',
      ),
    onError: (e) => toast.error('Exportação falhou', extrairMensagemDeErro(e)),
  });

  return (
    <div className="p-8">
      <Link to="/juridico/templates" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Biblioteca
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        <Gavel className="h-6 w-6 text-emerald-600" aria-hidden /> Pacote para Advogado
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-neutral-500">
        Exporta as minutas selecionadas num ZIP organizado (capa, documentos por categoria, matriz de variáveis, pendências
        jurídicas e histórico de versões) e registra o envio. Quando o advogado devolver, importe cada retorno na própria
        biblioteca — a redação anterior é preservada automaticamente.
      </p>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (templates ?? []).length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          Nenhum template instalado ainda — instale a biblioteca em Jurídico → Templates.
        </p>
      )}

      {(templates ?? []).length > 0 && (
        <div className="mt-6 max-w-2xl space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Categorias incluídas</p>
            <div className="grid gap-1.5 md:grid-cols-2">
              {categoriasDisponiveis.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={selecionadas.has(c)}
                    onChange={(e) =>
                      setSelecionadas((s) => {
                        const nova = new Set(s);
                        if (e.target.checked) nova.add(c);
                        else nova.delete(c);
                        return nova;
                      })
                    }
                  />
                  {CATEGORIA_BIBLIOTECA_LABEL[c as CategoriaBiblioteca] ?? c}
                  <span className="ml-auto text-xs text-neutral-400">{(templates ?? []).filter((t) => t.tipo === c).length}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Destinatário (advogado/escritório) — registra o envio</Label>
            <Input className="mt-1 max-w-sm" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Ex.: Dra. Fulana — Escritório X" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">{templatesSelecionados.length} documento(s) no pacote.</p>
            <Button disabled={exportar.isPending || templatesSelecionados.length === 0} onClick={() => exportar.mutate()}>
              <Archive className="h-4 w-4" aria-hidden /> {exportar.isPending ? 'Montando…' : 'Exportar Pacote Jurídico (.zip)'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
