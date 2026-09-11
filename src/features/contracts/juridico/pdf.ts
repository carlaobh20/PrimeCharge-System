// PDF do contrato — pdfmake 0.3 (lazy: o chunk só carrega quando o staff clica "Gerar PDF";
// o App Motorista nunca importa este módulo).
//
// DECISÃO DE INTEGRIDADE (regra 20 da missão): o hash oficial é o SHA-256 do CORPO congelado
// (contrato_versoes.hash_sha256, decidido na 0042) — o PDF é uma RENDERIZAÇÃO desse corpo, e
// imprime o hash do corpo no rodapé de cada página pra conferência cruzada. Não existe "hash do
// PDF" como verdade paralela: uma verdade só, sem inconsistência.
//
// montarDocDefinition é PURO (sem import de pdfmake) — o mesmo builder roda no browser e no teste
// Node (scripts/audit-juridico-fase2.ts), garantindo que o que o teste valida é o que o app gera.
import { markdownParaPdfContent, type NoPdf } from './markdown';
import { AVISO_MINUTA } from './minutaLib';

export type DadosPdfContrato = {
  numeroContrato: string; // ex.: primeiros 8 chars do uuid ou código
  rotuloVersao: string; // 'v1.0'
  statusVersao: string;
  hashSha256: string | null;
  corpo: string; // markdown congelado
  nomeMotorista: string;
  placaVeiculo: string;
  geradoEm: string; // ISO
  templateAprovado: boolean; // false => carimbo "MINUTA SUJEITA À REVISÃO JURÍDICA"
  /** Fase 5: subtítulo do documento (termos da biblioteca). Default: contrato de locação. */
  tituloDocumento?: string;
};

function formatDataHoraBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Monta a definição declarativa do documento (pdfmake). Puro — nada de I/O aqui. */
export function montarDocDefinition(dados: DadosPdfContrato): Record<string, unknown> {
  const conteudo: NoPdf[] = [
    // Cabeçalho institucional
    { text: 'PRIMECHARGE', style: 'marca' },
    { text: dados.tituloDocumento ?? 'Contrato de Locação de Veículo Automotor', style: 'subtitulo' },
    {
      columns: [
        { text: `Contrato nº ${dados.numeroContrato}`, style: 'meta' },
        { text: `Versão ${dados.rotuloVersao}`, style: 'meta', alignment: 'center' },
        { text: `Gerado em ${formatDataHoraBR(dados.geradoEm)}`, style: 'meta', alignment: 'right' },
      ],
      margin: [0, 2, 0, 0],
    },
    {
      columns: [
        { text: `Motorista: ${dados.nomeMotorista}`, style: 'meta' },
        { text: `Veículo: ${dados.placaVeiculo}`, style: 'meta', alignment: 'right' },
      ],
      margin: [0, 2, 0, 6],
    },
  ];

  if (!dados.templateAprovado) {
    conteudo.push({
      text: AVISO_MINUTA,
      style: 'avisoMinuta',
      margin: [0, 0, 0, 8],
    });
  }

  conteudo.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 455, y2: 0, lineWidth: 1, lineColor: '#333333' }], margin: [0, 0, 0, 12] });
  conteudo.push(...markdownParaPdfContent(dados.corpo));

  return {
    compress: false, // texto verificável no arquivo (integridade auditável), tamanho irrelevante p/ contrato
    info: {
      title: `Contrato ${dados.numeroContrato} — ${dados.rotuloVersao}`,
      author: 'RodaVolt',
      subject: `Status: ${dados.statusVersao}${dados.hashSha256 ? ` — SHA-256 ${dados.hashSha256}` : ''}`,
    },
    pageSize: 'A4',
    pageMargins: [70, 60, 70, 70],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: dados.hashSha256 ? `SHA-256 do corpo: ${dados.hashSha256}` : 'Documento não congelado — sem hash',
          fontSize: 6,
          color: '#888888',
        },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#888888' },
      ],
      margin: [70, 20, 70, 0],
    }),
    content: conteudo,
    styles: {
      marca: { fontSize: 16, bold: true, letterSpacing: 2 },
      subtitulo: { fontSize: 11, color: '#555555', margin: [0, 2, 0, 8] },
      meta: { fontSize: 8, color: '#666666' },
      avisoMinuta: { fontSize: 9, bold: true, color: '#b45309', alignment: 'center' },
      titulo1: { fontSize: 13, bold: true, margin: [0, 10, 0, 6] },
      titulo2: { fontSize: 11.5, bold: true, margin: [0, 10, 0, 5] },
      titulo3: { fontSize: 10.5, bold: true, margin: [0, 8, 0, 4] },
      paragrafo: { fontSize: 9.5, lineHeight: 1.35, alignment: 'justify', margin: [0, 0, 0, 5] },
      lista: { fontSize: 9.5, lineHeight: 1.3, margin: [8, 0, 0, 5] },
    },
    defaultStyle: { fontSize: 9.5 },
  };
}

/** Gera o PDF no browser e devolve o Blob (pra download e pra upload no Storage). */
export async function gerarPdfContrato(dados: DadosPdfContrato): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  const doc = pdfMake.createPdf(montarDocDefinition(dados));
  return doc.getBlob();
}
