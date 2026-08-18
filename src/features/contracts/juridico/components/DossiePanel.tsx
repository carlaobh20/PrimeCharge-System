import { useMutation } from '@tanstack/react-query';
import { Archive, Download } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/components/ui/button';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { listArquivos } from '@/shared/capabilities/api/arquivos';
import { listTimeline } from '@/shared/capabilities/api/timeline';
import type { ContratoComRelacoes } from '../../types';
import type { ContratoAditivo, ContratoVersao } from '../types';
import { listAssinaturasPorVersoes } from '../api';
import { useFichaJuridica } from '../hooksFase3';
import { montarArquivosDossie, PASTAS_DOSSIE, type DadosDossie } from '../dossie';

// DOSSIÊ JURÍDICO (regras 19–20): visão agregada de TUDO que pertence ao contrato + exportação
// em zip organizado (00_Capa … 10_Timeline) via fflate (zip client-side, ~8KB). Nada é apagado:
// o dossiê é uma cópia organizada dos registros na data da exportação.
export function DossiePanel({
  contrato,
  versoes,
  aditivos,
  empresaId,
}: {
  contrato: ContratoComRelacoes;
  versoes: ContratoVersao[];
  aditivos: ContratoAditivo[];
  empresaId: string | undefined;
}) {
  const ficha = useFichaJuridica(contrato.id);

  const exportar = useMutation({
    mutationFn: async () => {
      const [assinaturas, arquivosContrato, arquivosMotorista, timeline] = await Promise.all([
        listAssinaturasPorVersoes(versoes.map((v) => v.id)),
        listArquivos('contrato', contrato.id),
        listArquivos('motorista', contrato.motorista_id),
        listTimeline('contrato', contrato.id),
      ]);

      // baixa os anexos binários do Storage (contrato + documentos do motorista)
      const anexos: DadosDossie['anexos'] = [];
      const baixar = async (caminho: string, pasta: string, nome: string) => {
        const [bucket, ...resto] = caminho.split('/');
        const { data, error } = await supabase.storage.from(bucket).download(resto.join('/'));
        if (error || !data) return; // anexo inacessível não aborta o dossiê — fica registrado só no índice
        anexos.push({ pasta, nome, bytes: new Uint8Array(await data.arrayBuffer()) });
      };
      await Promise.all([
        ...arquivosContrato.map((a) => baixar(a.caminho_storage, a.categoria === 'contrato-pdf' ? '01_Contrato' : '09_Documentos', a.nome_arquivo)),
        ...arquivosMotorista.map((a) => baixar(a.caminho_storage, '09_Documentos', a.nome_arquivo)),
      ]);

      const rotuloPorVersao = new Map(versoes.map((v) => [v.id, v.rotulo ?? `v${v.numero}`]));
      const dados: DadosDossie = {
        contratoId: contrato.id,
        numeroContrato: contrato.id.slice(0, 8).toUpperCase(),
        motoristaNome: contrato.motorista?.nome_completo ?? '—',
        motoristaCpf: contrato.motorista?.cpf ?? null,
        veiculoPlaca: contrato.veiculo?.placa ?? '—',
        empresaNome: 'PrimeCharge',
        statusContrato: contrato.status,
        dataInicio: formatDataSimples(contrato.data_inicio),
        dataFim: contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : null,
        valorPeriodico: `${formatMoeda(contrato.valor_periodico)}/${contrato.periodicidade}`,
        geradoEm: new Date().toISOString(),
        versoes: versoes.map((v) => ({ rotulo: v.rotulo ?? `v${v.numero}`, status: v.status, hash: v.hash_sha256, criadoEm: formatDataSimples(v.criado_em), corpo: v.corpo })),
        aditivos: aditivos.map((a) => ({ tipo: a.tipo, status: a.status, descricao: a.descricao, criadoEm: formatDataSimples(a.criado_em) })),
        assinaturas: assinaturas.map((a) => ({
          versaoRotulo: rotuloPorVersao.get(a.contrato_versao_id) ?? '—',
          parte: a.parte,
          status: a.status,
          assinadoEm: a.assinado_em ? formatDataSimples(a.assinado_em) : null,
          motivoRecusa: null, // resumo em lote não carrega motivo; o detalhe fica na aba Assinaturas
        })),
        vistorias: (ficha.data?.vistorias ?? []).map((v) => ({ titulo: v.titulo, tipo: v.tipo, status: v.status, criadoEm: formatDataSimples(v.criado_em) })),
        seguros: (ficha.data?.seguros ?? []).map((s) => ({ seguradora: s.seguradora, apolice: s.apolice, vigenciaFim: s.vigencia_fim ? formatDataSimples(s.vigencia_fim) : null })),
        sinistros: (ficha.data?.sinistros ?? []).map((s) => ({ tipo: s.tipo, data: formatDataSimples(s.data_ocorrencia), descricao: s.descricao })),
        multas: (ficha.data?.multas ?? []).map((m) => ({ orgao: m.orgao_autuador, descricao: m.descricao, data: formatDataSimples(m.data_infracao), valor: m.valor, status: m.status })),
        documentosMotorista: arquivosMotorista.map((a) => ({ nome: a.nome_arquivo, categoria: a.categoria, criadoEm: formatDataSimples(a.criado_em) })),
        timeline: timeline.map((t) => ({ data: formatDataSimples(t.criado_em), tipo: t.tipo, descricao: t.descricao ?? '' })),
        anexos,
      };

      const arquivos = montarArquivosDossie(dados);
      const { zipSync, strToU8 } = await import('fflate');
      const entradas: Record<string, Uint8Array> = {};
      for (const a of arquivos) {
        entradas[`${a.pasta}/${a.nome}`] = typeof a.conteudo === 'string' ? strToU8(a.conteudo) : a.conteudo;
      }
      const zip = zipSync(entradas);
      const blob = new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' });
      const nome = `dossie-${dados.numeroContrato}-${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = nome;
      el.click();
      URL.revokeObjectURL(url);
      return { nome, total: arquivos.length };
    },
    onSuccess: (r) => toast.success('Dossiê exportado', `${r.nome} (${r.total} arquivos)`),
    onError: (e) => toast.error('Não foi possível exportar', extrairMensagemDeErro(e)),
  });

  const f = ficha.data;
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-500">
          O dossiê reúne tudo que pertence a este contrato — documento, versões, aditivos, assinaturas, vistorias, seguro,
          sinistros, multas, documentos e timeline — num pacote organizado ({PASTAS_DOSSIE.length} pastas). É uma cópia; nada é
          movido ou apagado. Não constitui parecer jurídico.
        </p>
        <Button disabled={exportar.isPending || ficha.isLoading || !empresaId} onClick={() => exportar.mutate()}>
          <Archive className="h-4 w-4" /> {exportar.isPending ? 'Montando…' : 'Exportar dossiê (.zip)'}
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {[
          { rotulo: 'Versões do documento', valor: versoes.length },
          { rotulo: 'Aditivos', valor: aditivos.length },
          { rotulo: 'Vistorias', valor: f?.vistorias.length ?? '…' },
          { rotulo: 'Seguros', valor: f?.seguros.length ?? '…' },
          { rotulo: 'Sinistros', valor: f?.sinistros.length ?? '…' },
          { rotulo: 'Multas', valor: f?.multas.length ?? '…' },
        ].map((i) => (
          <div key={i.rotulo} className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800">
            <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
              <Download className="h-3.5 w-3.5 text-neutral-400" /> {i.rotulo}
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{i.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
