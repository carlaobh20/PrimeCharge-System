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
import { BIBLIOTECA, CATEGORIA_BIBLIOTECA_LABEL, type CategoriaBiblioteca } from '../biblioteca';
import { extrairPendenciasJuridicas } from '../pendenciasMinuta';
import { DECISOES_OPERACIONAIS, DECISOES_PRODUTO } from '../qaBiblioteca';
import { analisarImpacto } from '../comparador';
import { baixarArquivoRetorno, CATEGORIA_RETORNO, listRetornosAdvogado } from '../apiRetornos';
import matrizRaw from '../../../../../docs/juridico/MATRIZ-VARIAVEIS.md?raw';
import coberturaRaw from '../../../../../docs/juridico/MATRIZ-COBERTURA.md?raw';
import conflitosRaw from '../../../../../docs/juridico/CONFLITOS.md?raw';
import glossarioRaw from '../../../../../docs/juridico/GLOSSARIO.md?raw';
import checklistRaw from '../../../../../docs/juridico/CHECKLIST-ADVOGADO.md?raw';
import ciclosRaw from '../../../../../docs/juridico/CICLOS-OPERACIONAIS.md?raw';
import fluxoRaw from '../../../../../docs/juridico/FLUXO-REVISAO-ADVOGADO.md?raw';
import type { ContratoTemplate } from '../types';

// PACOTE PARA ADVOGADO 2.0 (Fase 6): ZIP com 19 pastas (00_CAPA … 18_CHECKLIST_ADVOGADO) —
// documentos por assunto + matriz de variáveis + matriz de cobertura + conflitos + pendências +
// decisões de produto/operacionais + histórico de versões + glossário + checklist de revisão.
// Exportar com destinatário registra o ENVIO como revisão jurídica 'pendente' de cada template
// (reuso de contrato_revisoes_juridicas — sem enum novo). Critério de sucesso da missão: UM ZIP
// que o escritório entende e devolve; a importação preserva o histórico (0046).

const CATEGORIAS_EXPORTAVEIS: Record<string, true> = {
  contrato: true,
  aditivo: true,
  termo_operacional: true,
  termo_responsabilidade: true,
  seguro: true,
  sinistro: true,
  rescisao: true,
  lgpd: true,
};

/** Pasta do documento no Pacote 2.0 — por slug da biblioteca (renovação separa do aditivo). */
function pastaDoTemplate(t: ContratoTemplate): string {
  const slug = BIBLIOTECA.find((e) => e.nome === t.nome)?.slug;
  if (t.tipo === 'contrato') return '02_CONTRATO_MASTER';
  if (slug === 'termo-renovacao') return '05_RENOVACAO';
  if (t.tipo === 'aditivo') return '04_ADITIVOS';
  if (t.tipo === 'seguro') return '06_SEGURO';
  if (t.tipo === 'sinistro') return '07_SINISTRO';
  if (t.tipo === 'rescisao') return '08_RESCISAO';
  if (t.tipo === 'lgpd') return '09_LGPD';
  return '03_TERMOS';
}

export function JuridicoPacoteAdvogadoPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: templates, isLoading } = useTemplatesJuridico();
  const { data: parametros } = useParametrosJuridicos();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(Object.keys(CATEGORIAS_EXPORTAVEIS)));
  const [destinatario, setDestinatario] = useState('');

  const categoriasDisponiveis = [...new Set((templates ?? []).map((t) => t.tipo))].filter((c) => CATEGORIAS_EXPORTAVEIS[c]);
  const templatesSelecionados = (templates ?? []).filter((t) => selecionadas.has(t.tipo));

  const exportar = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sem empresa.');
      const incluidos: ContratoTemplate[] = templatesSelecionados;
      if (incluidos.length === 0) throw new Error('Nenhum template selecionado.');

      const { zipSync, strToU8 } = await import('fflate');
      const entradas: Record<string, Uint8Array> = {};
      const nomeArq = (t: ContratoTemplate) => `${t.nome.replace(/[^\w-]+/g, '_')}-v${t.versao_template}.md`;
      const dataExp = new Date().toLocaleString('pt-BR');

      // 00_CAPA
      entradas['00_CAPA/CAPA.md'] = strToU8(
        [
          '# PACOTE JURÍDICO — PRIMECHARGE (Biblioteca Contratual)',
          '',
          '> TODAS as peças são MINUTAS SUJEITAS À VALIDAÇÃO JURÍDICA. Nenhum documento aqui é',
          '> juridicamente validado; toda decisão pendente está marcada [VALIDAR COM ADVOGADO] e',
          '> consolidada nas pastas 12 (conflitos) e 13 (pendências).',
          '',
          `Exportado em: ${dataExp}`,
          `Documentos incluídos: ${incluidos.length}`,
          destinatario.trim() ? `Destinatário: ${destinatario.trim()}` : 'Destinatário: (não informado — envio não registrado)',
          '',
          '## Estrutura do pacote',
          '01_INSTRUCOES — como revisar e como devolver',
          '02_CONTRATO_MASTER — o contrato principal (parametrizável)',
          '03_TERMOS — termos operacionais, de responsabilidade e de ciência',
          '04_ADITIVOS · 05_RENOVACAO · 06_SEGURO · 07_SINISTRO · 08_RESCISAO · 09_LGPD',
          '10_VARIAVEIS — todas as variáveis {{...}} com origem no sistema',
          '11_COBERTURA — tema a tema, onde cada assunto está documentado',
          '12_CONFLITOS — divergências detectadas, com a pergunta para o advogado',
          '13_PENDENCIAS — todas as marcações [VALIDAR COM ADVOGADO] por documento',
          '14_DECISOES_PRODUTO · 15_DECISOES_OPERACIONAIS — o que NÃO é decisão jurídica',
          '16_HISTORICO — trilha de redações de cada documento (imutável no sistema)',
          '17_GLOSSARIO — vocabulário e equivalências de termos',
          '18_CHECKLIST — roteiro de revisão com campos de decisão',
          '19_COMPARACAO — o que mudou entre a última fotografia e a redação atual de cada documento',
          '20_ARQUIVOS_ORIGINAIS — os arquivos efetivamente recebidos do advogado (sem modificação)',
          '',
          '## Conteúdo documental',
          ...incluidos.map((t) => `- ${pastaDoTemplate(t)}/${nomeArq(t)} (v${t.versao_template})`),
        ].join('\n'),
      );

      // 01_INSTRUCOES (fluxo completo + resumo de devolução)
      entradas['01_INSTRUCOES/INSTRUCOES.md'] = strToU8(
        [
          '# INSTRUÇÕES DE REVISÃO E DEVOLUÇÃO',
          '',
          '1. Comece pelo 18_CHECKLIST (roteiro A–O) e pela 11_COBERTURA.',
          '2. As divergências já detectadas estão em 12_CONFLITOS — cada uma com a pergunta objetiva.',
          '3. Toda marcação [VALIDAR COM ADVOGADO] no texto é decisão pendente (lista completa em 13).',
          '4. As variáveis {{...}} são preenchidas pelo sistema (origem de cada uma em 10_VARIAVEIS) — mantenha-as.',
          '5. Devolva cada documento revisado como arquivo .md (texto). Alterar redação, remover ou',
          '   acrescentar cláusulas é livre; variável nova fora do catálogo é bloqueada na importação.',
          '6. A importação no sistema preserva AUTOMATICAMENTE a redação anterior (histórico imutável',
          '   com hash SHA-256) — nenhuma versão se perde (trilha em 16_HISTORICO; comparação em 19).',
          '',
          '---',
          '',
          ciclosRaw,
          '',
          '---',
          '',
          fluxoRaw,
        ].join('\n'),
      );

      // 02..09 — documentos por pasta
      for (const t of incluidos) entradas[`${pastaDoTemplate(t)}/${nomeArq(t)}`] = strToU8(t.corpo);

      // 10..12, 17, 18 — materiais gerados (fonte única: catálogo + qaBiblioteca)
      entradas['10_VARIAVEIS/MATRIZ-VARIAVEIS.md'] = strToU8(matrizRaw);
      entradas['11_COBERTURA/MATRIZ-COBERTURA.md'] = strToU8(coberturaRaw);
      entradas['12_CONFLITOS/CONFLITOS.md'] = strToU8(conflitosRaw);
      entradas['17_GLOSSARIO/GLOSSARIO.md'] = strToU8(glossarioRaw);
      entradas['18_CHECKLIST/CHECKLIST-ADVOGADO.md'] = strToU8(checklistRaw);

      // 13 — pendências jurídicas (marcações por documento + decisões já registradas na Sala)
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
      entradas['13_PENDENCIAS/PENDENCIAS.md'] = strToU8(linhasPend.join('\n'));

      // 14/15 — decisões de produto e operacionais (fonte única: qaBiblioteca)
      entradas['14_DECISOES_PRODUTO/DECISOES-PRODUTO.md'] = strToU8(
        ['# DECISÕES DE PRODUTO (não são decisões jurídicas)', '', ...DECISOES_PRODUTO.map((d) => `- ${d}`), ''].join('\n'),
      );
      entradas['15_DECISOES_OPERACIONAIS/DECISOES-OPERACIONAIS.md'] = strToU8(
        ['# DECISÕES OPERACIONAIS (não são decisões jurídicas)', '', ...DECISOES_OPERACIONAIS.map((d) => `- ${d}`), ''].join('\n'),
      );

      // 16 — histórico de versões (0046) + 19 — comparação (última fotografia × redação atual)
      const linhasHist: string[] = ['# HISTÓRICO DE VERSÕES DOS TEMPLATES', ''];
      const linhasComp: string[] = [
        '# COMPARAÇÃO DE VERSÕES — última fotografia × redação atual',
        '',
        '> Resumo OPERACIONAL do que mudou em cada documento desde a redação anterior. Sem',
        '> interpretação jurídica — a análise cláusula a cláusula está disponível no sistema.',
        '',
      ];
      for (const t of incluidos) {
        const hist = await listHistoricoTemplate(t.id);
        linhasHist.push(`## ${t.nome} — atual v${t.versao_template}`, '');
        if (hist.length === 0) linhasHist.push('Sem redações anteriores.', '');
        for (const h of hist) {
          linhasHist.push(
            `- ${formatDataSimples(h.criado_em)} · ${ORIGEM_HISTORICO_LABEL[h.origem]} (era v${h.versao_template})${h.responsavel_nome ? ` · ${h.responsavel_nome}` : ''}${h.observacao ? ` — ${h.observacao}` : ''} · SHA-256 ${h.hash_sha256 ?? '—'}`,
          );
        }
        linhasHist.push('');
        if (hist.length > 0) {
          const imp = analisarImpacto(hist[0].corpo, t.corpo);
          linhasComp.push(
            `## ${t.nome} (fotografia de ${formatDataSimples(hist[0].criado_em)} → v${t.versao_template})`,
            '',
            `- Cláusulas/seções: ${imp.contagem.alteradas} alteradas · ${imp.contagem.adicionadas} adicionadas · ${imp.contagem.removidas} removidas · ${imp.contagem.movidas} movidas`,
            `- Variáveis: +${imp.variaveis.adicionadas.length} / −${imp.variaveis.removidas.length}`,
            `- Pendências: ${imp.pendencias.novas.length} novas · ${imp.pendencias.possivelmenteResolvidas.length} possivelmente resolvidas · ${imp.pendencias.mantidas} mantidas`,
            ...imp.secoes
              .filter((x) => x.status !== 'igual')
              .slice(0, 30)
              .map((x) => `  - ${x.status.toUpperCase()}: ${x.id} ${x.titulo}`),
            '',
          );
        }
      }
      entradas['16_HISTORICO/HISTORICO.md'] = strToU8(linhasHist.join('\n'));
      if (linhasComp.length <= 5) linhasComp.push('Nenhum documento tem redação anterior ainda.', '');
      entradas['19_COMPARACAO/COMPARACAO.md'] = strToU8(linhasComp.join('\n'));

      // 20 — arquivos efetivamente recebidos do advogado (originais, sem modificação)
      try {
        const retornos = (await listRetornosAdvogado()).filter((r) => r.categoria === CATEGORIA_RETORNO);
        if (retornos.length === 0) {
          entradas['20_ARQUIVOS_ORIGINAIS/LEIA-ME.md'] = strToU8('Nenhum arquivo de retorno arquivado ainda.\n');
        }
        for (const r of retornos) {
          try {
            const blob = await baixarArquivoRetorno(r.caminho_storage);
            entradas[`20_ARQUIVOS_ORIGINAIS/${r.criado_em.slice(0, 10)}-${r.nome_arquivo}`] = new Uint8Array(await blob.arrayBuffer());
          } catch {
            entradas[`20_ARQUIVOS_ORIGINAIS/FALHA-${r.nome_arquivo}.md`] = strToU8(`Download falhou para ${r.nome_arquivo} (${r.caminho_storage}).\n`);
          }
        }
      } catch {
        entradas['20_ARQUIVOS_ORIGINAIS/LEIA-ME.md'] = strToU8('Não foi possível listar os arquivos de retorno nesta exportação.\n');
      }

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
        `Pacote 3.0 exportado (${r.total} documentos, 21 pastas)`,
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
        Exporta um ZIP único com 21 pastas: capa, instruções, documentos por assunto, matriz de variáveis, matriz de
        cobertura, conflitos, pendências, decisões de produto/operacionais, histórico de versões, glossário, checklist de
        revisão, comparação de versões e os arquivos originais recebidos do advogado. Quando o advogado devolver, importe cada retorno na biblioteca — a redação anterior é preservada
        automaticamente.
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
