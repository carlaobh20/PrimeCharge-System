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
  // ---- Fase 8 (Módulo 13) — DOSSIÊ EXECUTIVO: campos opcionais; ausente = "não incluído
  // nesta exportação" (nunca dado inventado). Tudo respeita a RLS de quem exporta.
  master?: { nome: string; versaoUsada: number | null; versaoAtualTemplate: number | null } | null;
  motoristaDetalhe?: { cnh: string | null; cnhValidade: string | null; contato: string | null } | null;
  veiculoDetalhe?: { marcaModelo: string | null; chassi: string | null; renavam: string | null } | null;
  financeiro?: { receitasConfirmadas: number; receitasPendentes: number; receitasVencidas: number } | null;
  tarefas?: { titulo: string; status: string; prazo: string | null }[];
  rescisoes?: { status: string; solicitante: string; motivo: string; criadoEm: string }[];
  renovacaoDecisao?: string | null;
  decisoesJuridicas?: { chave: string; resumo: string }[];
  historicoTemplate?: { data: string; origem: string; responsavel: string | null; hash: string | null }[];
  divergencias?: { rotulo: string; valorContrato: string; valorAtual: string }[];
};

// Fase 8 (Módulo 13): estrutura EXECUTIVA de 22 pastas — expansão do dossiê original.
export const PASTAS_DOSSIE = [
  '00_Capa',
  '01_Contrato',
  '02_Versoes',
  '03_Master',
  '04_Aditivos',
  '05_Assinaturas',
  '06_Motorista',
  '07_Veiculo',
  '08_Seguro',
  '09_Vistorias',
  '10_Sinistros',
  '11_Multas',
  '12_Financeiro',
  '13_Documentos',
  '14_Tarefas',
  '15_Rescisao',
  '16_Renovacao',
  '17_Timeline',
  '18_Auditoria',
  '19_Decisoes_Juridicas',
  '20_Historico',
  '21_Arquivos_Originais',
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

/** Monta a lista completa de arquivos do pacote executivo (pastas 00–21). */
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
    pasta: '04_Aditivos',
    nome: 'aditivos.md',
    conteudo: md([
      '# Aditivos',
      ...(d.aditivos.length === 0
        ? ['Nenhum aditivo.']
        : d.aditivos.map((a) => `- [${a.status}] ${a.tipo} (${a.criadoEm}): ${a.descricao ?? '—'}`)),
    ]),
  });

  arquivos.push({
    pasta: '05_Assinaturas',
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
    pasta: '09_Vistorias',
    nome: 'vistorias.md',
    conteudo: md([
      '# Vistorias',
      ...(d.vistorias.length === 0 ? ['Nenhuma vistoria registrada.'] : d.vistorias.map((v) => `- [${v.status}] ${v.titulo}${v.tipo ? ` (${v.tipo})` : ''} — ${v.criadoEm}`)),
    ]),
  });

  arquivos.push({
    pasta: '08_Seguro',
    nome: 'seguros.md',
    conteudo: md([
      '# Seguros',
      ...(d.seguros.length === 0 ? ['Nenhum seguro cadastrado.'] : d.seguros.map((s) => `- ${s.seguradora ?? '—'} · apólice ${s.apolice ?? '—'} · fim vigência ${s.vigenciaFim ?? '—'}`)),
    ]),
  });

  arquivos.push({
    pasta: '10_Sinistros',
    nome: 'sinistros.md',
    conteudo: md([
      '# Sinistros',
      ...(d.sinistros.length === 0 ? ['Nenhum sinistro registrado.'] : d.sinistros.map((s) => `- ${s.data} · ${s.tipo}: ${s.descricao ?? '—'}`)),
    ]),
  });

  arquivos.push({
    pasta: '11_Multas',
    nome: 'multas.md',
    conteudo: md([
      '# Multas',
      ...(d.multas.length === 0 ? ['Nenhuma multa registrada.'] : d.multas.map((m) => `- ${m.data} · ${m.orgao} · ${m.descricao} · ${m.valor != null ? `R$ ${m.valor}` : 'valor —'} · ${m.status}`)),
    ]),
  });

  arquivos.push({
    pasta: '13_Documentos',
    nome: 'documentos.md',
    conteudo: md([
      '# Documentos do motorista',
      ...(d.documentosMotorista.length === 0 ? ['Nenhum documento registrado.'] : d.documentosMotorista.map((doc) => `- ${doc.nome}${doc.categoria ? ` (${doc.categoria})` : ''} — ${doc.criadoEm}`)),
    ]),
  });

  arquivos.push({
    pasta: '17_Timeline',
    nome: 'timeline.md',
    conteudo: md(['# Timeline', ...(d.timeline.length === 0 ? ['Sem eventos.'] : d.timeline.map((t) => `- ${t.data} · [${t.tipo}] ${t.descricao}`))]),
  });

  arquivos.push({
    pasta: '18_Auditoria',
    nome: 'auditoria.md',
    conteudo: md([
      '# Auditoria (audit_log)',
      d.auditoria.length === 0
        ? 'Sem registros visíveis para o usuário que exportou (a leitura de auditoria é restrita a administradores).'
        : null,
      ...d.auditoria.map((a) => `- ${a.data} · ${a.usuario} · ${a.acao} em ${a.tabela}`),
    ]),
  });

  // ---- Fase 8: seções executivas (03/06/07/12/14/15/16/19/20/21) ----
  const nao = (txt: string) => `_${txt} não incluído(a) nesta exportação._`;
  arquivos.push({
    pasta: '03_Master',
    nome: 'master.md',
    conteudo: md([
      '# Modelo (Master) de origem',
      d.master
        ? `- Modelo: ${d.master.nome}\n- Versão usada por este contrato: ${d.master.versaoUsada != null ? `v${d.master.versaoUsada}` : 'NÃO INFORMADA no snapshot'}\n- Versão atual do modelo: ${d.master.versaoAtualTemplate != null ? `v${d.master.versaoAtualTemplate}` : 'NÃO INFORMADA'}\n\n> Republicar o modelo NUNCA altera este contrato — o corpo está congelado por versão.`
        : nao('Informação do modelo'),
    ]),
  });
  arquivos.push({
    pasta: '06_Motorista',
    nome: 'motorista.md',
    conteudo: md([
      '# Motorista',
      `- Nome: ${d.motoristaNome}${d.motoristaCpf ? ` (CPF ${d.motoristaCpf})` : ''}`,
      d.motoristaDetalhe
        ? `- CNH: ${d.motoristaDetalhe.cnh ?? 'NÃO INFORMADA'} · validade ${d.motoristaDetalhe.cnhValidade ?? 'NÃO INFORMADA'}\n- Contato: ${d.motoristaDetalhe.contato ?? 'NÃO INFORMADO'}`
        : nao('Detalhe do motorista'),
    ]),
  });
  arquivos.push({
    pasta: '07_Veiculo',
    nome: 'veiculo.md',
    conteudo: md([
      '# Veículo',
      `- Placa: ${d.veiculoPlaca}`,
      d.veiculoDetalhe
        ? `- Marca/Modelo: ${d.veiculoDetalhe.marcaModelo ?? 'NÃO INFORMADO'}\n- Chassi: ${d.veiculoDetalhe.chassi ?? 'NÃO INFORMADO'} · RENAVAM: ${d.veiculoDetalhe.renavam ?? 'NÃO INFORMADO'}`
        : nao('Detalhe do veículo'),
    ]),
  });
  arquivos.push({
    pasta: '12_Financeiro',
    nome: 'financeiro.md',
    conteudo: md([
      '# Financeiro do contrato (valores REGISTRADOS — nunca calculados como penalidade)',
      d.financeiro
        ? `- Receitas confirmadas: R$ ${d.financeiro.receitasConfirmadas.toFixed(2)}\n- Receitas pendentes: R$ ${d.financeiro.receitasPendentes.toFixed(2)}\n- Receitas vencidas: R$ ${d.financeiro.receitasVencidas.toFixed(2)}`
        : nao('Resumo financeiro'),
    ]),
  });
  arquivos.push({
    pasta: '14_Tarefas',
    nome: 'tarefas.md',
    conteudo: md([
      '# Tarefas e obrigações jurídicas do contrato',
      ...((d.tarefas ?? []).length === 0 ? [nao('Lista de tarefas') ] : (d.tarefas ?? []).map((t) => `- [${t.status}] ${t.titulo}${t.prazo ? ` (prazo ${t.prazo})` : ''}`)),
    ]),
  });
  arquivos.push({
    pasta: '15_Rescisao',
    nome: 'rescisao.md',
    conteudo: md([
      '# Rescisões',
      ...((d.rescisoes ?? []).length === 0 ? ['Nenhuma rescisão registrada.'] : (d.rescisoes ?? []).map((r) => `- [${r.status}] ${r.solicitante} (${r.criadoEm}): ${r.motivo}`)),
    ]),
  });
  arquivos.push({
    pasta: '16_Renovacao',
    nome: 'renovacao.md',
    conteudo: md([
      '# Renovação',
      d.renovacaoDecisao ? `Decisão humana registrada: ${d.renovacaoDecisao}` : 'Nenhuma decisão de renovação registrada — renovação nunca é automática.',
    ]),
  });
  arquivos.push({
    pasta: '19_Decisoes_Juridicas',
    nome: 'decisoes.md',
    conteudo: md([
      '# Decisões jurídicas registradas (Sala do Advogado / parâmetros)',
      ...((d.decisoesJuridicas ?? []).length === 0 ? [nao('Lista de decisões')] : (d.decisoesJuridicas ?? []).map((x) => `- ${x.chave}: ${x.resumo}`)),
    ]),
  });
  arquivos.push({
    pasta: '20_Historico',
    nome: 'historico-do-modelo.md',
    conteudo: md([
      '# Histórico de redações do modelo (imutável — 0046)',
      ...((d.historicoTemplate ?? []).length === 0 ? [nao('Histórico do modelo')] : (d.historicoTemplate ?? []).map((h) => `- ${h.data} · ${h.origem}${h.responsavel ? ` · ${h.responsavel}` : ''} · SHA-256 ${h.hash ?? '—'}`)),
    ]),
  });
  arquivos.push({
    pasta: '21_Arquivos_Originais',
    nome: 'LEIA-ME.md',
    conteudo: md([
      '# Arquivos originais',
      'Os anexos binários deste dossiê (PDFs gerados, apólices, documentos) estão distribuídos nas',
      'pastas correspondentes, exatamente como arquivados — nunca modificados.',
      (d.divergencias ?? []).length > 0
        ? `\n## Divergências abertas no momento da exportação\n${(d.divergencias ?? []).map((x) => `- ${x.rotulo}: contrato "${x.valorContrato}" × cadastro "${x.valorAtual}"`).join('\n')}`
        : null,
    ]),
  });

  for (const a of d.anexos) arquivos.push({ pasta: a.pasta, nome: a.nome, conteudo: a.bytes });
  return arquivos;
}
