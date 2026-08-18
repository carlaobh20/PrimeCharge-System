// DOSSIÊ JURÍDICO EXPORTÁVEL (regras 19–20) — montagem PURA da estrutura do pacote.
// Quem chama (hook/página) coleta os dados e os bytes dos anexos; aqui só se decide a
// organização das pastas (00_Capa … 10_Timeline), os nomes e a capa em markdown.
// Nada é apagado em lugar nenhum — o dossiê é uma CÓPIA organizada.

export type ArquivoDossie = {
  pasta: string;
  nome: string;
  /** conteúdo textual (capa/timeline/metadados) OU bytes de anexo baixado do Storage */
  conteudo: string | Uint8Array;
};

export type DadosDossie = {
  contratoId: string;
  numeroContrato: string;
  motoristaNome: string;
  motoristaCpf?: string | null;
  veiculoPlaca: string;
  empresaNome: string;
  statusContrato: string;
  dataInicio: string;
  dataFim?: string | null;
  valorPeriodico: string;
  geradoEm: string; // ISO
  versoes: { rotulo: string; status: string; hash: string | null; criadoEm: string; corpo: string | null }[];
  aditivos: { tipo: string; status: string; descricao: string | null; criadoEm: string }[];
  assinaturas: { versaoRotulo: string; parte: string; status: string; assinadoEm: string | null; motivoRecusa: string | null }[];
  vistorias: { titulo: string; tipo: string | null; status: string; criadoEm: string }[];
  seguros: { seguradora: string | null; apolice: string | null; vigenciaFim: string | null }[];
  sinistros: { tipo: string; data: string; descricao: string | null }[];
  multas: { orgao: string; descricao: string; data: string; valor: number | null; status: string }[];
  documentosMotorista: { nome: string; categoria: string | null; criadoEm: string }[];
  timeline: { data: string; tipo: string; descricao: string }[];
  /** Auditoria (audit_log) — só chega aqui o que a RLS do usuário permite ler (admin). */
  auditoria: { data: string; usuario: string; acao: string; tabela: string }[];
  versaoAtualRotulo?: string | null;
  hashVersaoAtual?: string | null;
  /** anexos binários já baixados (PDFs gerados, apólices, docs) com a pasta de destino */
  anexos: { pasta: string; nome: string; bytes: Uint8Array }[];
};

export const PASTAS_DOSSIE = [
  '00_Capa',
  '01_Contrato',
  '02_Versoes',
  '03_Aditivos',
  '04_Assinaturas',
  '05_Vistorias',
  '06_Seguros',
  '07_Sinistros',
  '08_Multas',
  '09_Documentos',
  '10_Timeline',
  '11_Auditoria',
] as const;

function md(linhas: (string | null | undefined)[]): string {
  return linhas.filter((l) => l !== null && l !== undefined).join('\n') + '\n';
}

/** Capa do dossiê — resumo verificável, sem juízo jurídico. */
export function montarCapaDossie(d: DadosDossie): string {
  return md([
    `# DOSSIÊ JURÍDICO — Contrato ${d.numeroContrato}`,
    '',
    `Gerado em: ${d.geradoEm}`,
    `Empresa: ${d.empresaNome}`,
    '',
    '## Identificação',
    `- Motorista: ${d.motoristaNome}${d.motoristaCpf ? ` (CPF ${d.motoristaCpf})` : ''}`,
    `- Veículo: ${d.veiculoPlaca}`,
    `- Status do contrato: ${d.statusContrato}`,
    `- Vigência: ${d.dataInicio} → ${d.dataFim ?? 'indeterminado'}`,
    `- Valor: ${d.valorPeriodico}`,
    `- Versão atual do documento: ${d.versaoAtualRotulo ?? '—'}`,
    `- SHA-256 do corpo congelado: ${d.hashVersaoAtual ?? '—'}`,
    '',
    '## Conteúdo do pacote',
    `- Versões do documento: ${d.versoes.length}`,
    `- Aditivos: ${d.aditivos.length}`,
    `- Assinaturas: ${d.assinaturas.length}`,
    `- Vistorias: ${d.vistorias.length}`,
    `- Seguros: ${d.seguros.length}`,
    `- Sinistros: ${d.sinistros.length}`,
    `- Multas: ${d.multas.length}`,
    `- Documentos do motorista: ${d.documentosMotorista.length}`,
    `- Eventos de timeline: ${d.timeline.length}`,
    `- Anexos binários: ${d.anexos.length}`,
    '',
    '> Este dossiê é uma cópia organizada dos registros do sistema na data de geração.',
    '> Ele não constitui parecer jurídico nem certifica validade legal do contrato.',
  ]);
}

/** Monta a lista completa de arquivos do pacote (pastas 00–10). */
export function montarArquivosDossie(d: DadosDossie): ArquivoDossie[] {
  const arquivos: ArquivoDossie[] = [];
  arquivos.push({ pasta: '00_Capa', nome: 'capa.md', conteudo: montarCapaDossie(d) });

  arquivos.push({
    pasta: '01_Contrato',
    nome: 'contrato.md',
    conteudo: md([
      `# Contrato ${d.numeroContrato}`,
      `- Status: ${d.statusContrato}`,
      `- Motorista: ${d.motoristaNome}`,
      `- Veículo: ${d.veiculoPlaca}`,
      `- Vigência: ${d.dataInicio} → ${d.dataFim ?? 'indeterminado'}`,
      `- Valor: ${d.valorPeriodico}`,
    ]),
  });

  for (const v of d.versoes) {
    arquivos.push({
      pasta: '02_Versoes',
      nome: `${v.rotulo.replace(/[^\w.-]/g, '_')}.md`,
      conteudo: md([
        `# Versão ${v.rotulo} — ${v.status}`,
        `- Criada em: ${v.criadoEm}`,
        `- SHA-256 do corpo: ${v.hash ?? '(sem hash)'}`,
        '',
        '---',
        '',
        v.corpo ?? '_Sem corpo gerado._',
      ]),
    });
  }

  arquivos.push({
    pasta: '03_Aditivos',
    nome: 'aditivos.md',
    conteudo: md([
      '# Aditivos',
      ...(d.aditivos.length === 0
        ? ['Nenhum aditivo.']
        : d.aditivos.map((a) => `- [${a.status}] ${a.tipo} (${a.criadoEm}): ${a.descricao ?? '—'}`)),
    ]),
  });

  arquivos.push({
    pasta: '04_Assinaturas',
    nome: 'assinaturas.md',
    conteudo: md([
      '# Assinaturas',
      ...(d.assinaturas.length === 0
        ? ['Nenhuma assinatura registrada.']
        : d.assinaturas.map(
            (a) =>
              `- ${a.versaoRotulo} · ${a.parte}: ${a.status}${a.assinadoEm ? ` em ${a.assinadoEm}` : ''}${a.motivoRecusa ? ` (motivo recusa: ${a.motivoRecusa})` : ''}`,
          )),
    ]),
  });

  arquivos.push({
    pasta: '05_Vistorias',
    nome: 'vistorias.md',
    conteudo: md([
      '# Vistorias',
      ...(d.vistorias.length === 0 ? ['Nenhuma vistoria registrada.'] : d.vistorias.map((v) => `- [${v.status}] ${v.titulo}${v.tipo ? ` (${v.tipo})` : ''} — ${v.criadoEm}`)),
    ]),
  });

  arquivos.push({
    pasta: '06_Seguros',
    nome: 'seguros.md',
    conteudo: md([
      '# Seguros',
      ...(d.seguros.length === 0 ? ['Nenhum seguro cadastrado.'] : d.seguros.map((s) => `- ${s.seguradora ?? '—'} · apólice ${s.apolice ?? '—'} · fim vigência ${s.vigenciaFim ?? '—'}`)),
    ]),
  });

  arquivos.push({
    pasta: '07_Sinistros',
    nome: 'sinistros.md',
    conteudo: md([
      '# Sinistros',
      ...(d.sinistros.length === 0 ? ['Nenhum sinistro registrado.'] : d.sinistros.map((s) => `- ${s.data} · ${s.tipo}: ${s.descricao ?? '—'}`)),
    ]),
  });

  arquivos.push({
    pasta: '08_Multas',
    nome: 'multas.md',
    conteudo: md([
      '# Multas',
      ...(d.multas.length === 0 ? ['Nenhuma multa registrada.'] : d.multas.map((m) => `- ${m.data} · ${m.orgao} · ${m.descricao} · ${m.valor != null ? `R$ ${m.valor}` : 'valor —'} · ${m.status}`)),
    ]),
  });

  arquivos.push({
    pasta: '09_Documentos',
    nome: 'documentos.md',
    conteudo: md([
      '# Documentos do motorista',
      ...(d.documentosMotorista.length === 0 ? ['Nenhum documento registrado.'] : d.documentosMotorista.map((doc) => `- ${doc.nome}${doc.categoria ? ` (${doc.categoria})` : ''} — ${doc.criadoEm}`)),
    ]),
  });

  arquivos.push({
    pasta: '10_Timeline',
    nome: 'timeline.md',
    conteudo: md(['# Timeline', ...(d.timeline.length === 0 ? ['Sem eventos.'] : d.timeline.map((t) => `- ${t.data} · [${t.tipo}] ${t.descricao}`))]),
  });

  arquivos.push({
    pasta: '11_Auditoria',
    nome: 'auditoria.md',
    conteudo: md([
      '# Auditoria (audit_log)',
      d.auditoria.length === 0
        ? 'Sem registros visíveis para o usuário que exportou (a leitura de auditoria é restrita a administradores).'
        : null,
      ...d.auditoria.map((a) => `- ${a.data} · ${a.usuario} · ${a.acao} em ${a.tabela}`),
    ]),
  });

  for (const a of d.anexos) arquivos.push({ pasta: a.pasta, nome: a.nome, conteudo: a.bytes });
  return arquivos;
}
