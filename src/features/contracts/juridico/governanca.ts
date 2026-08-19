// GOVERNANÇA CONTRATUAL (Fase 8) — motor PURO único da fase. Nada aqui consulta banco nem
// interpreta direito: recebe FATOS objetivos já carregados pelas queries existentes e devolve
// derivações com motivo explícito. Vocabulário obrigatório (Módulo 34): "conformidade
// operacional", "integridade documental", "prioridade operacional", "pendência objetiva" —
// NUNCA "segurança jurídica", "juridicamente seguro", "protegido".
//
// Reuso declarado (auditoria prévia da fase):
// - snapshot × cadastro usa o MESMO montarSnapshot (validacao.ts) para gerar o "snapshot atual"
//   e compara caminhos whitelisted — nenhuma fórmula nova, fonte única de formatação;
// - próxima ação continua em resumoExecutivo.ts; prioridade de fila continua em risco.ts;
// - obrigações contratuais = acoes_operacionais tipo 'juridico_obrigacao' (sem state machine nova);
// - relatórios saem em markdown pela infraestrutura existente (download/zip via fflate nas telas).

// ---------------------------------------------------------------------------
// MÓDULOS 2/3 — DIVERGÊNCIA SNAPSHOT × CADASTRO
// ---------------------------------------------------------------------------

export type PrioridadeOperacionalGov = 'critico' | 'alto' | 'medio' | 'baixo';

export type DivergenciaContratual = {
  caminho: string;
  rotulo: string;
  valorContrato: string;
  valorAtual: string;
  prioridade: PrioridadeOperacionalGov;
};

/** Caminhos comparados entre o snapshot CONGELADO do contrato e o snapshot REGERADO do cadastro
 * atual. Whitelist deliberada: só o que o cadastro atual consegue responder (km_incluso, por
 * exemplo, vive só no wizard — não é comparável e portanto não entra). */
export const CAMPOS_DIVERGENCIA: { caminho: string; rotulo: string; prioridade: PrioridadeOperacionalGov }[] = [
  { caminho: 'veiculo.placa', rotulo: 'Placa do veículo', prioridade: 'critico' },
  { caminho: 'veiculo.chassi', rotulo: 'Chassi do veículo', prioridade: 'critico' },
  { caminho: 'motorista.cpf', rotulo: 'CPF do motorista', prioridade: 'critico' },
  { caminho: 'contrato.valor_periodico', rotulo: 'Valor por período', prioridade: 'alto' },
  { caminho: 'contrato.periodicidade', rotulo: 'Periodicidade de cobrança', prioridade: 'alto' },
  { caminho: 'contrato.valor_caucao', rotulo: 'Caução', prioridade: 'alto' },
  { caminho: 'motorista.nome', rotulo: 'Nome do motorista', prioridade: 'alto' },
  { caminho: 'motorista.cnh', rotulo: 'CNH do motorista', prioridade: 'medio' },
  { caminho: 'contrato.dia_vencimento', rotulo: 'Dia de vencimento', prioridade: 'medio' },
  { caminho: 'veiculo.renavam', rotulo: 'RENAVAM', prioridade: 'medio' },
  { caminho: 'empresa.razao_social', rotulo: 'Razão social da locadora', prioridade: 'baixo' },
  { caminho: 'empresa.cnpj', rotulo: 'CNPJ da locadora', prioridade: 'baixo' },
];

function valorEm(obj: Record<string, unknown> | null | undefined, caminho: string): string | null {
  if (!obj) return null;
  const v = caminho.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), obj);
  if (v === undefined || v === null || v === '') return null;
  return String(v);
}

/**
 * Compara o snapshot congelado do contrato com o snapshot regenerado a partir do cadastro ATUAL
 * (mesmo montarSnapshot). O sistema NUNCA altera o contrato — só informa a divergência.
 * Campo ausente em um dos lados não é divergência (é "não informado" — Módulo 29).
 */
export function compararSnapshotComCadastro(
  snapshotContrato: Record<string, unknown> | null | undefined,
  snapshotAtual: Record<string, unknown> | null | undefined,
): DivergenciaContratual[] {
  const divergencias: DivergenciaContratual[] = [];
  for (const campo of CAMPOS_DIVERGENCIA) {
    const antes = valorEm(snapshotContrato, campo.caminho);
    const agora = valorEm(snapshotAtual, campo.caminho);
    if (antes === null || agora === null) continue;
    if (antes.trim() !== agora.trim()) {
      divergencias.push({ caminho: campo.caminho, rotulo: campo.rotulo, valorContrato: antes, valorAtual: agora, prioridade: campo.prioridade });
    }
  }
  const ordem: PrioridadeOperacionalGov[] = ['critico', 'alto', 'medio', 'baixo'];
  return divergencias.sort((a, b) => ordem.indexOf(a.prioridade) - ordem.indexOf(b.prioridade));
}

// ---------------------------------------------------------------------------
// MÓDULO 16 — CONFORMIDADE OPERACIONAL (+ Módulos 1 e 15: indicadores derivados)
// ---------------------------------------------------------------------------

export type MotivoConformidade = { motivo: string; origem: string };

export type InsumosConformidade = {
  contratoStatus: string;
  diasParaFim: number | null; // negativo = vencido
  temVersaoVigenteOuAssinada: boolean;
  versaoCongelada: boolean;
  hashConfere: boolean | null; // null = não recalculado ainda
  assinaturasFaltantes: string[]; // partes que faltam
  assinaturaRecusada: boolean;
  assinaturaExpirada: boolean;
  seguro: { cadastrado: boolean; venceEmDias: number | null; coberturaInformada: boolean; franquiaInformada: boolean };
  documentosObrigatoriosFaltantes: string[];
  documentosRejeitados: string[];
  cnhVencida: boolean;
  cnhVenceEmDias: number | null;
  divergencias: number;
  rescisaoEmAndamento: boolean;
  obrigacoesVencidas: number; // acoes juridico com prazo < hoje e não concluídas
};

export type ConformidadeOperacional = {
  /** Módulo 16: o contrato está operacionalmente completo? */
  status: 'ok' | 'atencao' | 'bloqueado';
  bloqueios: MotivoConformidade[];
  alertas: MotivoConformidade[];
  pendencias: MotivoConformidade[];
  /** Módulo 15 — indicador de risco OPERACIONAL (fatos objetivos, nunca avaliação jurídica) */
  indicadorOperacional: 'normal' | 'atencao' | 'critico';
  /** Módulo 1 — integridade DOCUMENTAL (documento existe, congelado, hash confere, assinado) */
  integridadeDocumental: 'ok' | 'atencao' | 'critico';
};

export function avaliarConformidade(i: InsumosConformidade): ConformidadeOperacional {
  const bloqueios: MotivoConformidade[] = [];
  const alertas: MotivoConformidade[] = [];
  const pendencias: MotivoConformidade[] = [];

  const ativo = i.contratoStatus === 'ativo';

  // ---- bloqueios (fatos objetivos incompatíveis com operação regular) ----
  if (ativo && i.seguro.cadastrado && i.seguro.venceEmDias != null && i.seguro.venceEmDias < 0) {
    bloqueios.push({ motivo: `Seguro VENCIDO há ${Math.abs(i.seguro.venceEmDias)} dia(s) com contrato vigente`, origem: 'seguro' });
  }
  if (i.documentosRejeitados.length > 0) {
    bloqueios.push({ motivo: `Documento obrigatório REJEITADO: ${i.documentosRejeitados.join(', ')}`, origem: 'documentos' });
  }
  if (i.assinaturaRecusada) bloqueios.push({ motivo: 'Assinatura RECUSADA pelo motorista', origem: 'assinatura' });
  if (i.hashConfere === false) bloqueios.push({ motivo: 'Hash do documento congelado NÃO confere com o corpo (integridade)', origem: 'integridade' });
  if (ativo && i.diasParaFim != null && i.diasParaFim < 0) {
    bloqueios.push({ motivo: `Contrato vencido há ${Math.abs(i.diasParaFim)} dia(s) sem renovação/aditivo/rescisão`, origem: 'prazo' });
  }
  if (ativo && i.cnhVencida) bloqueios.push({ motivo: 'CNH do motorista VENCIDA', origem: 'motorista' });
  if (ativo && !i.temVersaoVigenteOuAssinada) bloqueios.push({ motivo: 'Contrato ativo sem documento assinado/vigente', origem: 'documento' });

  // ---- alertas ----
  if (i.seguro.cadastrado && i.seguro.venceEmDias != null && i.seguro.venceEmDias >= 0) {
    if (i.seguro.venceEmDias <= 7) alertas.push({ motivo: `Seguro vence em ${i.seguro.venceEmDias} dia(s)`, origem: 'seguro' });
    else if (i.seguro.venceEmDias <= 30) alertas.push({ motivo: `Seguro vence em ${i.seguro.venceEmDias} dia(s)`, origem: 'seguro' });
    else if (i.seguro.venceEmDias <= 90) pendencias.push({ motivo: `Seguro vence em ${i.seguro.venceEmDias} dia(s) — programar renovação`, origem: 'seguro' });
  }
  if (ativo && !i.seguro.cadastrado) alertas.push({ motivo: 'Seguro NÃO CADASTRADO (dado ausente — nunca presumido)', origem: 'seguro' });
  if (i.seguro.cadastrado && !i.seguro.coberturaInformada) pendencias.push({ motivo: 'Coberturas do seguro NÃO INFORMADAS no cadastro', origem: 'seguro' });
  if (i.seguro.cadastrado && !i.seguro.franquiaInformada) pendencias.push({ motivo: 'Franquia do seguro NÃO INFORMADA no cadastro', origem: 'seguro' });
  if (i.assinaturaExpirada) alertas.push({ motivo: 'ASSINATURA EXPIRADA — ação necessária (reenviar ou cancelar; o contrato não é invalidado automaticamente)', origem: 'assinatura' });
  if (i.assinaturasFaltantes.length > 0 && !i.assinaturaRecusada) {
    alertas.push({ motivo: `Assinatura pendente: ${i.assinaturasFaltantes.join(' e ')}`, origem: 'assinatura' });
  }
  if (i.divergencias > 0) alertas.push({ motivo: `${i.divergencias} divergência(s) entre o snapshot do contrato e o cadastro atual`, origem: 'divergencia' });
  if (i.documentosObrigatoriosFaltantes.length > 0) {
    alertas.push({ motivo: `Documento obrigatório faltante: ${i.documentosObrigatoriosFaltantes.join(', ')}`, origem: 'documentos' });
  }
  if (i.obrigacoesVencidas > 0) alertas.push({ motivo: `${i.obrigacoesVencidas} obrigação(ões) contratual(is) vencida(s)`, origem: 'obrigacoes' });
  if (ativo && i.cnhVenceEmDias != null && i.cnhVenceEmDias >= 0 && i.cnhVenceEmDias <= 30 && !i.cnhVencida) {
    alertas.push({ motivo: `CNH do motorista vence em ${i.cnhVenceEmDias} dia(s)`, origem: 'motorista' });
  }
  if (i.rescisaoEmAndamento) alertas.push({ motivo: 'Rescisão em andamento', origem: 'rescisao' });
  if (ativo && i.diasParaFim != null && i.diasParaFim >= 0 && i.diasParaFim <= 30) {
    pendencias.push({ motivo: `Contrato vence em ${i.diasParaFim} dia(s) — decidir renovação`, origem: 'prazo' });
  }
  if (i.versaoCongelada && i.hashConfere === null) {
    pendencias.push({ motivo: 'Hash ainda não reconferido nesta sessão (use Reconciliação)', origem: 'integridade' });
  }

  const status: ConformidadeOperacional['status'] = bloqueios.length > 0 ? 'bloqueado' : alertas.length > 0 ? 'atencao' : 'ok';
  const indicadorOperacional: ConformidadeOperacional['indicadorOperacional'] =
    bloqueios.length > 0 ? 'critico' : alertas.length > 0 ? 'atencao' : 'normal';

  let integridadeDocumental: ConformidadeOperacional['integridadeDocumental'] = 'ok';
  if (i.hashConfere === false || (ativo && !i.temVersaoVigenteOuAssinada)) integridadeDocumental = 'critico';
  else if (i.assinaturasFaltantes.length > 0 || i.assinaturaExpirada || !i.versaoCongelada || i.hashConfere === null) integridadeDocumental = 'atencao';

  return { status, bloqueios, alertas, pendencias, indicadorOperacional, integridadeDocumental };
}

// ---------------------------------------------------------------------------
// MÓDULO 6 — AGENDA CONTRATUAL (janelas 1/7/15/30/60/90 — tudo derivado, sem cron)
// ---------------------------------------------------------------------------

export type EventoAgenda = {
  tipo: 'fim_contrato' | 'renovacao' | 'assinatura_expira' | 'seguro_vence' | 'cnh_vence' | 'documento_vence' | 'obrigacao' | 'rescisao_agendada' | 'vistoria';
  descricao: string;
  contratoId: string | null;
  diasRestantes: number; // negativo = já passou (aparece no bucket "1 dia" como atrasado)
};

export const HORIZONTES_AGENDA = [1, 7, 15, 30, 60, 90] as const;

export type BucketAgenda = { horizonteDias: number; rotulo: string; eventos: EventoAgenda[] };

export function montarAgendaContratual(eventos: EventoAgenda[]): BucketAgenda[] {
  const buckets: BucketAgenda[] = HORIZONTES_AGENDA.map((h) => ({
    horizonteDias: h,
    rotulo: h === 1 ? 'Hoje / atrasados' : `Até ${h} dias`,
    eventos: [],
  }));
  for (const e of eventos.filter((x) => x.diasRestantes <= 90)) {
    const alvo = buckets.find((b) => e.diasRestantes <= b.horizonteDias);
    if (alvo) alvo.eventos.push(e);
  }
  for (const b of buckets) b.eventos.sort((a, x) => a.diasRestantes - x.diasRestantes);
  return buckets.filter((b) => b.eventos.length > 0);
}

// ---------------------------------------------------------------------------
// MÓDULOS 7/8 — CHECKLIST DE RENOVAÇÃO (decisão do CAMINHO é humana: nova versão × aditivo)
// ---------------------------------------------------------------------------

export type ItemChecklistRenovacao = { item: string; resultado: 'passou' | 'pendente' | 'bloqueado'; detalhe: string };

export function avaliarChecklistRenovacao(i: {
  conformidade: ConformidadeOperacional;
  motoristaAtivo: boolean;
  cnhValida: boolean | null; // null = sem validade cadastrada
  veiculoDisponivelOuAlugado: boolean;
  seguroVigente: boolean;
  vistoriaRegistrada: boolean;
  financeiroSemSaldoDevedor: boolean | null; // null = não informado
  documentosOk: boolean;
  aditivosRascunho: number;
  rescisaoEmAndamento: boolean;
  templateComRevisaoAprovada: boolean;
}): ItemChecklistRenovacao[] {
  const itens: ItemChecklistRenovacao[] = [];
  const add = (item: string, resultado: ItemChecklistRenovacao['resultado'], detalhe: string) => itens.push({ item, resultado, detalhe });

  add('Motorista', i.motoristaAtivo ? 'passou' : 'bloqueado', i.motoristaAtivo ? 'Cadastro ativo.' : 'Motorista inativo no cadastro.');
  add('CNH', i.cnhValida === true ? 'passou' : i.cnhValida === null ? 'pendente' : 'bloqueado', i.cnhValida === true ? 'CNH válida.' : i.cnhValida === null ? 'Validade da CNH NÃO INFORMADA.' : 'CNH vencida.');
  add('Veículo', i.veiculoDisponivelOuAlugado ? 'passou' : 'pendente', i.veiculoDisponivelOuAlugado ? 'Status compatível com locação.' : 'Status do veículo incompatível — verificar.');
  add('Seguro', i.seguroVigente ? 'passou' : 'bloqueado', i.seguroVigente ? 'Apólice vigente cadastrada.' : 'Sem apólice vigente cadastrada.');
  add('Vistoria', i.vistoriaRegistrada ? 'passou' : 'pendente', i.vistoriaRegistrada ? 'Vistoria registrada no sistema.' : 'Sem vistoria registrada — recomendada na virada de período.');
  add('Pagamentos', i.financeiroSemSaldoDevedor === true ? 'passou' : i.financeiroSemSaldoDevedor === null ? 'pendente' : 'bloqueado', i.financeiroSemSaldoDevedor === true ? 'Sem saldo devedor registrado.' : i.financeiroSemSaldoDevedor === null ? 'Resumo financeiro NÃO INFORMADO.' : 'Há saldo devedor registrado.');
  add('Documentos', i.documentosOk ? 'passou' : 'pendente', i.documentosOk ? 'Sem documento obrigatório faltante/rejeitado.' : 'Documentos obrigatórios pendentes.');
  add('Aditivos', i.aditivosRascunho === 0 ? 'passou' : 'pendente', i.aditivosRascunho === 0 ? 'Nenhum aditivo em rascunho.' : `${i.aditivosRascunho} aditivo(s) em rascunho — concluir antes.`);
  add('Rescisão', !i.rescisaoEmAndamento ? 'passou' : 'bloqueado', !i.rescisaoEmAndamento ? 'Nenhuma rescisão em andamento.' : 'Há rescisão em andamento — renovar não é compatível.');
  add('Revisão jurídica do modelo', i.templateComRevisaoAprovada ? 'passou' : 'pendente', i.templateComRevisaoAprovada ? 'Modelo com revisão jurídica registrada como aprovada.' : 'Modelo SEM revisão jurídica aprovada — o documento sairá como MINUTA.');
  add('Conformidade geral', i.conformidade.status === 'ok' ? 'passou' : i.conformidade.status === 'atencao' ? 'pendente' : 'bloqueado', i.conformidade.status === 'ok' ? 'Sem bloqueio ou alerta.' : `${i.conformidade.bloqueios.length} bloqueio(s), ${i.conformidade.alertas.length} alerta(s) — ver Conformidade.`);
  return itens;
}

// ---------------------------------------------------------------------------
// MÓDULOS 17/18 — RECONCILIAÇÃO CONTRATUAL (sob demanda) + relatório
// ---------------------------------------------------------------------------

export type ItemReconciliacao = { item: string; resultado: 'ok' | 'divergencia' | 'incompleto'; detalhe: string };

export function reconciliarContrato(f: {
  hashRecalculadoConfere: boolean | null; // null = versão sem hash/corpo
  versaoCongelada: boolean;
  divergenciasSnapshot: number;
  versaoTemOrigemTemplate: boolean; // template_id preenchido
  assinaturasDaVersaoCongelada: number;
  assinaturasConcluidas: number;
  arquivosDoContrato: number;
  eventosTimeline: number;
  aditivosSemDocumento: number;
}): ItemReconciliacao[] {
  const itens: ItemReconciliacao[] = [];
  itens.push(
    f.hashRecalculadoConfere === null
      ? { item: 'Hash do documento', resultado: 'incompleto', detalhe: 'Versão sem corpo/hash para conferir.' }
      : f.hashRecalculadoConfere
        ? { item: 'Hash do documento', resultado: 'ok', detalhe: 'SHA-256 recalculado confere com o registrado.' }
        : { item: 'Hash do documento', resultado: 'divergencia', detalhe: 'SHA-256 recalculado NÃO confere — nunca corrigido em silêncio; investigar.' },
  );
  itens.push(
    f.divergenciasSnapshot === 0
      ? { item: 'Snapshot × cadastro', resultado: 'ok', detalhe: 'Nenhuma divergência nos campos comparáveis.' }
      : { item: 'Snapshot × cadastro', resultado: 'divergencia', detalhe: `${f.divergenciasSnapshot} campo(s) divergem do cadastro atual.` },
  );
  itens.push(
    f.versaoTemOrigemTemplate
      ? { item: 'Origem do documento (template)', resultado: 'ok', detalhe: 'Versão vinculada ao template de origem.' }
      : { item: 'Origem do documento (template)', resultado: 'incompleto', detalhe: 'Versão SEM template de origem (registro órfão detectado — template removido).' },
  );
  itens.push(
    !f.versaoCongelada
      ? { item: 'Assinaturas', resultado: 'incompleto', detalhe: 'Documento ainda não congelado — assinaturas não se aplicam.' }
      : f.assinaturasDaVersaoCongelada === 0
        ? { item: 'Assinaturas', resultado: 'incompleto', detalhe: 'Documento congelado sem NENHUMA linha de assinatura.' }
        : { item: 'Assinaturas', resultado: f.assinaturasConcluidas === f.assinaturasDaVersaoCongelada ? 'ok' : 'incompleto', detalhe: `${f.assinaturasConcluidas}/${f.assinaturasDaVersaoCongelada} assinatura(s) concluída(s).` },
  );
  itens.push(
    f.arquivosDoContrato > 0
      ? { item: 'Arquivos', resultado: 'ok', detalhe: `${f.arquivosDoContrato} arquivo(s) vinculados ao contrato.` }
      : { item: 'Arquivos', resultado: 'incompleto', detalhe: 'Nenhum arquivo vinculado (PDF gerado é arquivado automaticamente).' },
  );
  itens.push(
    f.eventosTimeline > 0
      ? { item: 'Timeline', resultado: 'ok', detalhe: `${f.eventosTimeline} evento(s) registrados.` }
      : { item: 'Timeline', resultado: 'incompleto', detalhe: 'Timeline vazia — histórico incompleto.' },
  );
  itens.push(
    f.aditivosSemDocumento === 0
      ? { item: 'Aditivos', resultado: 'ok', detalhe: 'Todos os aditivos com registro íntegro.' }
      : { item: 'Aditivos', resultado: 'incompleto', detalhe: `${f.aditivosSemDocumento} aditivo(s) sem documento gerado.` },
  );
  return itens;
}

export function montarRelatorioReconciliacao(contratoRef: string, itens: ItemReconciliacao[], geradoEm: string): string {
  const contagem = {
    ok: itens.filter((i) => i.resultado === 'ok').length,
    divergencia: itens.filter((i) => i.resultado === 'divergencia').length,
    incompleto: itens.filter((i) => i.resultado === 'incompleto').length,
  };
  return [
    `# RECONCILIAÇÃO CONTRATUAL — ${contratoRef}`,
    '',
    `Gerado em: ${geradoEm}. Verificação OPERACIONAL sob demanda (banco × snapshot × documento ×`,
    'hash × timeline × arquivos × assinaturas). Nada é corrigido automaticamente.',
    '',
    `Resultado: ${contagem.ok} OK · ${contagem.divergencia} DIVERGÊNCIA · ${contagem.incompleto} INCOMPLETO`,
    '',
    '| Item | Resultado | Detalhe |',
    '|---|---|---|',
    ...itens.map((i) => `| ${i.item} | ${i.resultado.toUpperCase()} | ${i.detalhe} |`),
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// MÓDULO 21 — GOVERNANÇA DO MASTER (distribuição de versões em uso)
// ---------------------------------------------------------------------------

export type DistribuicaoVersoes = { versao: number | null; contratos: number }[];

export function distribuirVersoesUsadas(versoesMeta: (number | null)[]): DistribuicaoVersoes {
  const mapa = new Map<number | null, number>();
  for (const v of versoesMeta) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([versao, contratos]) => ({ versao, contratos }))
    .sort((a, b) => (b.versao ?? -1) - (a.versao ?? -1));
}

// ---------------------------------------------------------------------------
// MÓDULO 24 — RELATÓRIO DE GOVERNANÇA CONTRATUAL (markdown)
// ---------------------------------------------------------------------------

export function montarRelatorioGovernanca(d: {
  geradoEm: string;
  totais: { contratos: number; vigentes: number; vencendo30: number; vencidos: number };
  assinaturasPendentes: number;
  segurosVencendo: number;
  segurosVencidos: number;
  divergencias: DivergenciaContratual[] | { contrato: string; divergencias: DivergenciaContratual[] }[];
  pendenciasFila: { rotulo: string; detalhe: string }[];
  rescisoesEmAndamento: number;
  renovacoesProximas: number;
  aditivosTotal: number;
  masters: { nome: string; versaoAtual: number; status: string; distribuicao: DistribuicaoVersoes; revisaoAprovada: boolean }[];
  orfaos: { tipo: string; quantidade: number }[];
}): string {
  const linhas: string[] = [
    '# RELATÓRIO DE GOVERNANÇA CONTRATUAL — PRIMECHARGE',
    '',
    `Gerado em: ${d.geradoEm}. Retrato OPERACIONAL derivado dos dados vivos do sistema — não é`,
    'parecer jurídico; revisões jurídicas citadas são REGISTROS humanos.',
    '',
    '## Resumo',
    '',
    `- Contratos: ${d.totais.contratos} (${d.totais.vigentes} com documento assinado/vigente)`,
    `- Vencendo em 30 dias: ${d.totais.vencendo30} · Vencidos: ${d.totais.vencidos}`,
    `- Assinaturas pendentes: ${d.assinaturasPendentes}`,
    `- Seguros: ${d.segurosVencidos} vencido(s), ${d.segurosVencendo} vencendo em 30 dias`,
    `- Rescisões em andamento: ${d.rescisoesEmAndamento} · Renovações próximas (30d): ${d.renovacoesProximas}`,
    `- Aditivos registrados: ${d.aditivosTotal}`,
    '',
    '## Fila de pendências objetivas',
    '',
    ...(d.pendenciasFila.length === 0 ? ['Nenhuma pendência na fila.'] : d.pendenciasFila.map((p) => `- **${p.rotulo}** — ${p.detalhe}`)),
    '',
    '## Divergências contratuais (snapshot × cadastro)',
    '',
  ];
  const div = d.divergencias as { contrato: string; divergencias: DivergenciaContratual[] }[];
  if (div.length === 0) linhas.push('Nenhuma divergência detectada nos campos comparáveis.');
  for (const c of div) {
    for (const x of c.divergencias) {
      linhas.push(`- ${c.contrato} · **${x.rotulo}** [${x.prioridade}]: contrato "${x.valorContrato}" × cadastro "${x.valorAtual}"`);
    }
  }
  linhas.push('', '## Governança do Master / templates', '');
  for (const m of d.masters) {
    linhas.push(
      `### ${m.nome} — v${m.versaoAtual} (${m.status}${m.revisaoAprovada ? ' · revisão jurídica registrada como aprovada' : ' · revisão jurídica PENDENTE'})`,
      '',
      ...(m.distribuicao.length === 0
        ? ['Nenhum contrato gerado a partir deste modelo.']
        : m.distribuicao.map((x) => `- ${x.contratos} contrato(s) usando ${x.versao == null ? 'versão NÃO INFORMADA no snapshot' : `v${x.versao}`}`)),
      '',
    );
  }
  linhas.push('## Registros órfãos detectados', '');
  const orfaosReais = d.orfaos.filter((o) => o.quantidade > 0);
  if (orfaosReais.length === 0) linhas.push('Nenhum registro órfão detectado.');
  for (const o of orfaosReais) linhas.push(`- ${o.tipo}: ${o.quantidade} (não removidos automaticamente — investigar)`);
  linhas.push('');
  return linhas.join('\n');
}

// ---------------------------------------------------------------------------
// DIVERGÊNCIA EM LOTE (Dashboard, Módulo 3) — comparação LEVE snapshot × linha do contrato.
// O cockpit usa a comparação completa (mesmo montarSnapshot); aqui, para N contratos numa
// tela só, comparamos os campos que já vêm nas queries do panorama — com normalização por
// campo (nunca fórmula nova de negócio, só normalização de formato).
// ---------------------------------------------------------------------------

export type CadastroLeve = {
  motoristaNome: string | null;
  motoristaCpf: string | null;
  veiculoPlaca: string | null;
  valorPeriodico: number | null;
  periodicidade: string | null;
  diaVencimento: number | null;
  valorCaucao: number | null;
};

const soDigitos = (s: string) => s.replace(/\D/g, '');
const parseBRL = (s: string): number | null => {
  const limpo = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
};

export function divergenciasLote(snapshot: Record<string, unknown> | null | undefined, atual: CadastroLeve): DivergenciaContratual[] {
  if (!snapshot) return [];
  const out: DivergenciaContratual[] = [];
  const cmp = (
    caminho: string,
    rotulo: string,
    prioridade: PrioridadeOperacionalGov,
    atualVal: string | number | null,
    normaliza: (s: string) => string | number | null = (s) => s.trim(),
  ) => {
    const bruto = valorEm(snapshot, caminho);
    if (bruto === null || atualVal === null || atualVal === undefined) return; // ausente ≠ divergência (Módulo 29)
    const a = normaliza(bruto);
    const b = typeof atualVal === 'string' ? normaliza(atualVal) : atualVal;
    if (a === null || b === null) return;
    if (String(a) !== String(b)) {
      out.push({ caminho, rotulo, valorContrato: bruto, valorAtual: String(atualVal), prioridade });
    }
  };
  cmp('veiculo.placa', 'Placa do veículo', 'critico', atual.veiculoPlaca, (s) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase());
  cmp('motorista.cpf', 'CPF do motorista', 'critico', atual.motoristaCpf ? soDigitos(atual.motoristaCpf) : null, soDigitos);
  cmp('motorista.nome', 'Nome do motorista', 'alto', atual.motoristaNome, (s) => s.trim().toLowerCase());
  cmp('contrato.periodicidade', 'Periodicidade de cobrança', 'alto', atual.periodicidade, (s) => s.trim().toLowerCase());
  cmp('contrato.valor_periodico', 'Valor por período', 'alto', atual.valorPeriodico, parseBRL);
  cmp('contrato.valor_caucao', 'Caução', 'alto', atual.valorCaucao, parseBRL);
  cmp('contrato.dia_vencimento', 'Dia de vencimento', 'medio', atual.diaVencimento, (s) => {
    const n = Number(soDigitos(s));
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const ordem: PrioridadeOperacionalGov[] = ['critico', 'alto', 'medio', 'baixo'];
  return out.sort((a, b) => ordem.indexOf(a.prioridade) - ordem.indexOf(b.prioridade));
}
