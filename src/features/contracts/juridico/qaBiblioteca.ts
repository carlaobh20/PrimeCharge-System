// LEGAL QA — DADOS CURADOS DA AUDITORIA (Fase 6). Fonte ÚNICA da matriz de cobertura, dos
// conflitos potenciais, do glossário e das listas de decisões não-jurídicas. Consumida por:
// scripts/gerar-qa-biblioteca.ts (gera MATRIZ-COBERTURA.md, CONFLITOS.md, GLOSSARIO.md),
// Sala do Advogado (índice de completude + conflitos + prioridade) e Pacote para Advogado 2.0.
//
// REGRA: nada aqui é parecer jurídico. "Classificação" mede presença DOCUMENTAL do tema;
// "conflito potencial" registra divergência SEM decidir qual lado está certo; "prioridade" é
// ordenação OPERACIONAL de revisão, nunca "risco jurídico". Produzida pela leitura integral dos
// 17 documentos em 2026-08-18 (auditoria da Fase 6).

// ---------------------------------------------------------------------------
// MATRIZ DE COBERTURA (Fase 2 da missão)
// ---------------------------------------------------------------------------

export type ClassificacaoTema =
  | 'COBERTO'            // tema presente e estruturado nos documentos
  | 'PARCIAL'            // presente, mas com lacuna documental apontada
  | 'AUSENTE'            // deveria estar documentado e não está
  | 'DECISAO_JURIDICA'   // estrutura pronta; conteúdo depende do advogado
  | 'DECISAO_PRODUTO'    // depende de decisão de produto do Carlos
  | 'DECISAO_OPERACIONAL'; // depende de definição operacional

export type TemaCobertura = {
  tema: string;
  classificacao: ClassificacaoTema;
  /** onde vive: cláusula do master, termos, política/parâmetro, dado do sistema */
  master?: string;
  termos?: string[];
  politicaParametro?: string;
  dadoSistema?: string;
  responsavelDecisao: 'advogado' | 'produto' | 'operação' | '—';
  observacao?: string;
};

export const MATRIZ_COBERTURA: TemaCobertura[] = [
  { tema: 'PARTES', classificacao: 'COBERTO', master: 'Preâmbulo', dadoSistema: 'empresas / motoristas', responsavelDecisao: '—' },
  { tema: 'VEÍCULO', classificacao: 'COBERTO', master: 'Cl. 1', termos: ['Entrega', 'Devolução', 'Responsabilidade por Bens'], dadoSistema: 'veiculos (placa, chassi, RENAVAM, bateria)', responsavelDecisao: '—' },
  { tema: 'POSSE', classificacao: 'COBERTO', master: 'Cl. 7', termos: ['Entrega', 'Devolução'], responsavelDecisao: '—' },
  { tema: 'USO', classificacao: 'COBERTO', master: 'Cl. 2', termos: ['Ciência Operacional §1'], responsavelDecisao: '—' },
  { tema: 'MOTORISTA', classificacao: 'COBERTO', master: 'Preâmbulo + Cl. 14.2', dadoSistema: 'motoristas (CPF, CNH, contato)', responsavelDecisao: '—' },
  { tema: 'APLICATIVOS', classificacao: 'COBERTO', master: 'Cl. 2.1 (Uber/99 nominados como exemplo)', responsavelDecisao: '—' },
  { tema: 'PRAZO', classificacao: 'COBERTO', master: 'Cl. 4', termos: ['Renovação'], dadoSistema: 'contratos.data_inicio/data_fim_prevista', responsavelDecisao: '—' },
  { tema: 'VALOR', classificacao: 'COBERTO', master: 'Cl. 5.1', dadoSistema: 'contratos.valor_periodico', responsavelDecisao: '—' },
  { tema: 'PAGAMENTO', classificacao: 'PARCIAL', master: 'Cl. 5.1 ("meios indicados pela LOCADORA")', responsavelDecisao: 'produto', observacao: 'Meios de pagamento não especificados no contrato — decidir se ficam no texto ou em anexo comercial.' },
  { tema: 'INADIMPLÊNCIA', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 5.2–5.3', responsavelDecisao: 'advogado', observacao: 'Percentuais de multa/juros e prazo de tolerância pendentes.' },
  { tema: 'CAUÇÃO', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 6 (condicional)', termos: ['Encerramento §2.3'], dadoSistema: 'contratos.valor_caucao', responsavelDecisao: 'advogado', observacao: 'Prazo de devolução e regras de retenção pendentes.' },
  { tema: 'REAJUSTE', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 5.4', termos: ['Renovação §2.1'], responsavelDecisao: 'advogado', observacao: 'Índice e periodicidade pendentes.' },
  { tema: 'QUILOMETRAGEM', classificacao: 'COBERTO', master: 'Cl. 3 (controlada/livre, condicional)', termos: ['Ciência Operacional §4'], dadoSistema: 'wizard km_incluso + telemetria', responsavelDecisao: '—' },
  { tema: 'MANUTENÇÃO', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 8', termos: ['Ciência Operacional §2'], politicaParametro: 'juridico_parametros: manutencao_responsabilidades', responsavelDecisao: 'advogado', observacao: 'Matriz LOCADORA × LOCATÁRIO pendente.' },
  { tema: 'PNEUS', classificacao: 'PARCIAL', master: 'Cl. 8.2 (citados dentro da matriz pendente)', responsavelDecisao: 'advogado', observacao: 'Cobertos só como item da matriz de manutenção pendente.' },
  { tema: 'RODAS', classificacao: 'PARCIAL', master: 'Cl. 8.2 (idem pneus)', responsavelDecisao: 'advogado' },
  { tema: 'RECARGA', classificacao: 'COBERTO', master: 'Cl. 9', termos: ['Ciência Operacional §3', 'Responsabilidade por Bens §3'], responsavelDecisao: '—' },
  { tema: 'BATERIA', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 9.2', dadoSistema: 'telemetria (saúde da bateria)', responsavelDecisao: 'advogado', observacao: 'Critério degradação natural × dano pendente.' },
  { tema: 'CARREGADOR', classificacao: 'COBERTO', termos: ['Responsabilidade por Bens §3', 'Entrega (inventário)'], responsavelDecisao: '—' },
  { tema: 'ACESSÓRIOS', classificacao: 'COBERTO', termos: ['Entrega/Devolução (inventário)', 'Responsabilidade por Bens §2'], responsavelDecisao: '—' },
  { tema: 'ACIDENTE', classificacao: 'COBERTO', master: 'Cl. 10.2', termos: ['Comunicação', 'Declaração', 'Procedimentos de Sinistro'], responsavelDecisao: '—' },
  { tema: 'SINISTRO', classificacao: 'COBERTO', master: 'Cl. 10', termos: ['Comunicação', 'Declaração', 'Procedimentos'], dadoSistema: 'sinistros + arquivos + timeline', responsavelDecisao: '—' },
  { tema: 'ROUBO', classificacao: 'COBERTO', master: 'Cl. 10.2/10.4', termos: ['Comunicação §2.1'], responsavelDecisao: '—' },
  { tema: 'FURTO', classificacao: 'COBERTO', master: 'Cl. 10.2/10.4', termos: ['Comunicação §2.1'], responsavelDecisao: '—' },
  { tema: 'PERDA TOTAL', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 10.4', responsavelDecisao: 'advogado', observacao: 'Efeitos financeiros entre as partes pendentes.' },
  { tema: 'SEGURO', classificacao: 'PARCIAL', master: 'Cl. 10.1 (condicional com/sem apólice)', termos: ['Ciência do Seguro'], dadoSistema: 'contrato_seguros', responsavelDecisao: 'advogado', observacao: 'Estrutura pronta; apólice real precisa ser anexada e transcrita ([VALIDAR]).' },
  { tema: 'FRANQUIA', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 10.3', termos: ['Ciência do Seguro §4.1', 'Procedimentos §2.2'], dadoSistema: 'contrato_seguros.franquia_valor', responsavelDecisao: 'advogado', observacao: 'Momento/forma de cobrança da franquia pendente.' },
  { tema: 'MULTAS', classificacao: 'COBERTO', master: 'Cl. 11', termos: ['Infrações e Multas'], dadoSistema: 'multas', responsavelDecisao: '—' },
  { tema: 'INFRAÇÕES', classificacao: 'COBERTO', master: 'Cl. 11', termos: ['Infrações e Multas'], responsavelDecisao: '—' },
  { tema: 'DANOS', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 7.3', responsavelDecisao: 'advogado', observacao: 'Critério desgaste natural × dano indenizável pendente.' },
  { tema: 'AVARIAS', classificacao: 'COBERTO', termos: ['Entrega §2.2', 'Devolução §2.2'], dadoSistema: 'checklists (vistoria)', responsavelDecisao: '—' },
  { tema: 'VISTORIA', classificacao: 'COBERTO', master: 'Cl. 1.2 + 7.1', termos: ['Entrega', 'Devolução'], dadoSistema: 'checklists (fotos, odômetro, carga)', responsavelDecisao: '—' },
  { tema: 'FOTOS', classificacao: 'COBERTO', master: 'Cl. 1.2 (vistoria fotográfica)', dadoSistema: 'arquivos da vistoria', responsavelDecisao: '—' },
  { tema: 'RASTREAMENTO', classificacao: 'COBERTO', master: 'Cl. 12', termos: ['Rastreamento e Telemetria'], responsavelDecisao: '—' },
  { tema: 'TELEMETRIA', classificacao: 'COBERTO', master: 'Cl. 12', termos: ['Rastreamento e Telemetria'], dadoSistema: 'telemetria do veículo', responsavelDecisao: '—' },
  { tema: 'LOCALIZAÇÃO', classificacao: 'COBERTO', termos: ['Rastreamento §1.1 (GPS)'], responsavelDecisao: '—' },
  { tema: 'LGPD', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 12', termos: ['LGPD', 'Rastreamento'], politicaParametro: 'juridico_parametros: lgpd_telemetria', responsavelDecisao: 'advogado', observacao: 'Base legal, retenção e compartilhamento pendentes.' },
  { tema: 'SEGURANÇA DA INFORMAÇÃO', classificacao: 'COBERTO', termos: ['LGPD §4.1 (acesso por perfil, auditoria, hash)'], dadoSistema: 'RLS + audit_log + SHA-256', responsavelDecisao: '—' },
  { tema: 'DOCUMENTAÇÃO DO VEÍCULO', classificacao: 'COBERTO', master: 'Cl. 1.2 + 14.1', termos: ['Entrega (inventário: CRLV)'], responsavelDecisao: '—' },
  { tema: 'CNH', classificacao: 'COBERTO', master: 'Cl. 14.2 (validade + comunicação em 24h)', termos: ['Ciência Operacional §1.2'], dadoSistema: 'motoristas.cnh_numero/validade', responsavelDecisao: '—' },
  { tema: 'CESSÃO', classificacao: 'COBERTO', master: 'Cl. 2.3(a)', responsavelDecisao: '—' },
  { tema: 'SUBLOCAÇÃO', classificacao: 'COBERTO', master: 'Cl. 2.3(a)', termos: ['Ciência Operacional §1.1'], responsavelDecisao: '—' },
  { tema: 'TERCEIROS (condutor autorizado)', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 2.2', termos: ['Declaração de Sinistro §3.1(a)'], responsavelDecisao: 'advogado', observacao: 'Alcance da responsabilidade e campo próprio na declaração pendentes.' },
  { tema: 'RESPONSABILIDADE', classificacao: 'COBERTO', master: 'Cl. 7.2 + 10.3', termos: ['Responsabilidade por Bens'], responsavelDecisao: '—' },
  { tema: 'COMUNICAÇÃO ENTRE AS PARTES', classificacao: 'COBERTO', master: 'Cl. 17.1 (canais do cadastro + app)', responsavelDecisao: '—' },
  { tema: 'SUSPENSÃO', classificacao: 'PARCIAL', master: 'Cl. 5.3(a)', dadoSistema: 'bloqueio de acesso do motorista (app)', responsavelDecisao: 'advogado', observacao: 'Prazo/procedimento de notificação pendente.' },
  { tema: 'RESCISÃO', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 15', termos: ['Rescisão'], dadoSistema: 'contrato_rescisoes (workflow + checklist)', responsavelDecisao: 'advogado', observacao: 'Aviso prévio, purga da mora e cláusula penal pendentes.' },
  { tema: 'DEVOLUÇÃO', classificacao: 'COBERTO', master: 'Cl. 7', termos: ['Devolução'], responsavelDecisao: '—' },
  { tema: 'ENCERRAMENTO', classificacao: 'COBERTO', termos: ['Encerramento'], dadoSistema: 'checklist obrigatório de encerramento', responsavelDecisao: '—' },
  { tema: 'QUITAÇÃO', classificacao: 'DECISAO_JURIDICA', termos: ['Quitação (uso condicionado)'], responsavelDecisao: 'advogado', observacao: 'Se deve existir, alcance e ressalvas — inteiramente do advogado.' },
  { tema: 'ADITIVOS', classificacao: 'COBERTO', master: 'Cl. 18.3', termos: ['Aditivo'], dadoSistema: 'contrato_aditivos', responsavelDecisao: '—' },
  { tema: 'RENOVAÇÃO', classificacao: 'COBERTO', master: 'Cl. 4.1', termos: ['Renovação'], responsavelDecisao: '—', observacao: 'Nunca automática; reajuste pendente (tema REAJUSTE).' },
  { tema: 'FORÇA MAIOR', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 16', responsavelDecisao: 'advogado', observacao: 'Cobrança durante impedimento prolongado pendente.' },
  { tema: 'CONFIDENCIALIDADE', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 17.2', responsavelDecisao: 'advogado' },
  { tema: 'FORO', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 20', responsavelDecisao: 'advogado' },
  { tema: 'ASSINATURA', classificacao: 'DECISAO_JURIDICA', master: 'Cl. 19', dadoSistema: 'contrato_assinaturas (evidências + SHA-256)', responsavelDecisao: 'advogado', observacao: 'Meio de assinatura a contratar.' },
  { tema: 'ANEXOS', classificacao: 'PARCIAL', master: 'Lista de anexos ao final', termos: ['Entrega', 'Seguro', 'Rastreamento', 'LGPD'], responsavelDecisao: 'produto', observacao: '"Resumo das condições comerciais" listado como anexo sem peça própria (dados vivem no contrato/PDF).' },
];

// ---------------------------------------------------------------------------
// CONFLITOS POTENCIAIS (Fase 3 da missão) — divergência registrada SEM decidir o certo.
// ---------------------------------------------------------------------------

export type ConflitoPotencial = {
  id: string;
  documentoA: string;
  documentoB: string;
  tema: string;
  diferenca: string;
  perguntaAdvogado: string;
  /** prioridade OPERACIONAL de revisão — não é análise de risco jurídico */
  prioridade: 'critico' | 'alto' | 'medio' | 'baixo';
  status: 'aberto' | 'tratado_fase6';
  tratamento?: string;
  /**
   * Detector textual (Fase 7): quando o conflito é detectável no TEXTO de um documento
   * específico, permite comparar retorno do advogado ANTES × DEPOIS ("continua" ×
   * "possivelmente resolvido — confirmar"). Conflitos entre documentos/dados sem assinatura
   * textual única não têm detector — permanecem de atualização humana.
   */
  detector?: { docSlug: string; presenteRe: string };
};

export const CONFLITOS_POTENCIAIS: ConflitoPotencial[] = [
  {
    id: 'C1',
    documentoA: 'Contrato Master (Cl. 5.1)',
    documentoB: 'Dado do sistema (contratos.dia_vencimento) — cobrança semanal/diária',
    tema: 'Vencimento × periodicidade',
    diferenca: 'O Master diz "vencimento no dia {{contrato.dia_vencimento}} de cada período", mas dia_vencimento é um dia do MÊS — em cobrança semanal ou diária a expressão não descreve o vencimento real.',
    perguntaAdvogado: 'Como redigir o vencimento para periodicidade semanal/diária (ex.: "toda segunda-feira", "no ato")? A redação atual só é precisa para cobrança mensal.',
    prioridade: 'critico',
    status: 'aberto',
    detector: { docSlug: 'contrato-master', presenteRe: 'dia \\{\\{contrato\\.dia_vencimento\\}\\} de cada per\u00edodo' },
  },
  {
    id: 'C2',
    documentoA: 'Comunicação de Sinistro (§2.1: BO "obrigatório em furto, roubo e danos a terceiros")',
    documentoB: 'Contrato Master (Cl. 10.2(b): BO "quando cabível")',
    tema: 'Boletim de ocorrência',
    diferenca: 'O termo especifica os casos de BO obrigatório; o Master deixa em aberto ("quando cabível"). Os dois textos podem ser lidos como regras diferentes.',
    perguntaAdvogado: 'Definir a lista de hipóteses de BO obrigatório num só lugar (Master) e referenciá-la no termo — quais hipóteses?',
    prioridade: 'medio',
    status: 'aberto',
    detector: { docSlug: 'comunicacao-sinistro', presenteRe: 'obrigat\u00f3rio em furto, roubo' },
  },
  {
    id: 'C3',
    documentoA: 'Termo de Renovação (§2.1 — exibe {{contrato.valor_periodico}} VIGENTE)',
    documentoB: 'Contrato Master (Cl. 5.4 — reajuste possível na renovação)',
    tema: 'Valor na renovação',
    diferenca: 'O termo exibe o valor vigente do contrato; se a renovação alterar o valor, o documento mostraria o antigo.',
    perguntaAdvogado: 'A alteração de valor pode constar do próprio termo de renovação ou deve sempre ser aditivo separado?',
    prioridade: 'alto',
    status: 'tratado_fase6',
    tratamento: 'Fase 6 acrescentou ao termo a nota de que o valor exibido é o vigente e que alteração se formaliza por aditivo próprio; a pergunta ao advogado permanece registrada.',
  },
  {
    id: 'C4',
    documentoA: 'Declaração de Sinistro (§3.1(a): "era eu quem conduzia")',
    documentoB: 'Contrato Master (Cl. 2.2: condução por terceiro AUTORIZADO possível)',
    tema: 'Condutor no sinistro',
    diferenca: 'A declaração presume o locatário ao volante; o Master admite condutor autorizado — não há campo para esse caso.',
    perguntaAdvogado: 'Criar campo/versão da declaração para condutor autorizado? Qual o efeito sobre seguro e responsabilidade?',
    prioridade: 'medio',
    status: 'aberto',
    detector: { docSlug: 'declaracao-sinistro', presenteRe: 'era eu quem conduzia' },
  },
  {
    id: 'C5',
    documentoA: 'Termo de Encerramento (§4.1: quitação "é objeto do Termo de Quitação")',
    documentoB: 'Termo de Quitação (uso CONDICIONADO — pode nem existir, decisão do advogado)',
    tema: 'Dependência entre documentos',
    diferenca: 'O encerramento referencia um documento cuja própria existência depende de decisão jurídica pendente.',
    perguntaAdvogado: 'Se a quitação não for adotada, qual redação substitui a referência no encerramento?',
    prioridade: 'baixo',
    status: 'aberto',
    detector: { docSlug: 'termo-encerramento', presenteRe: 'Termo de Quita\u00e7\u00e3o' },
  },
  {
    id: 'C6',
    documentoA: 'Contrato Master (lista de Anexos: "Resumo das condições comerciais")',
    documentoB: 'Biblioteca (não existe peça própria de resumo comercial)',
    tema: 'Anexo sem peça',
    diferenca: 'O anexo citado não é um documento da biblioteca — os dados vivem no corpo do contrato e no PDF.',
    perguntaAdvogado: 'Manter a citação (com o contrato valendo como o próprio resumo) ou criar a peça? (também é decisão de produto)',
    prioridade: 'baixo',
    status: 'aberto',
    detector: { docSlug: 'contrato-master', presenteRe: 'Resumo das condi\u00e7\u00f5es comerciais' },
  },
  {
    id: 'C7',
    documentoA: 'Documentos (LOCADORA / LOCATÁRIO)',
    documentoB: 'Sistema (partes "primecharge" / "motorista" nas assinaturas e telas)',
    tema: 'Vocabulário',
    diferenca: 'Os papéis têm nomes diferentes no texto jurídico e no sistema (equivalência descrita no GLOSSARIO.md).',
    perguntaAdvogado: 'Confirmar/padronizar a nomenclatura das partes entre documentos e interface.',
    prioridade: 'baixo',
    status: 'aberto',
  },
  {
    id: 'C8',
    documentoA: 'Termos de Entrega/Devolução (inventário e avarias informados no gerador)',
    documentoB: 'Vistoria do sistema (checklists com fotos, odômetro e carga)',
    tema: 'Origem do inventário',
    diferenca: 'O inventário/avarias dos termos é digitado na geração; a vistoria estruturada do sistema ainda não alimenta esses campos automaticamente.',
    perguntaAdvogado: 'Sem pergunta jurídica — decisão de produto registrada (integração vistoria → gerador).',
    prioridade: 'medio',
    status: 'aberto',
  },
];

// ---------------------------------------------------------------------------
// GLOSSÁRIO (Fase 4 da missão) — vocabulário interno + equivalências. Não substitui nada.
// ---------------------------------------------------------------------------

export type TermoGlossario = { termo: string; definicao: string; equivalencias?: string };

export const GLOSSARIO: TermoGlossario[] = [
  { termo: 'LOCADORA', definicao: 'A empresa que loca o veículo (RodaVolt).', equivalencias: 'No sistema: empresa; parte de assinatura "primecharge".' },
  { termo: 'LOCATÁRIO', definicao: 'O motorista que loca o veículo — parte do contrato.', equivalencias: 'No sistema: motorista; parte de assinatura "motorista". Nos docs de sinistro aparece como COMUNICANTE/DECLARANTE; no LGPD, TITULAR.' },
  { termo: 'CONDUTOR AUTORIZADO', definicao: 'Terceiro autorizado por escrito pela LOCADORA a conduzir (Master Cl. 2.2).', equivalencias: 'Não confundir com LOCATÁRIO.' },
  { termo: 'TITULAR', definicao: 'O motorista na condição de titular de dados pessoais (LGPD).' },
  { termo: 'VEÍCULO', definicao: 'O bem locado (veículo automotor elétrico identificado na Cl. 1).', equivalencias: 'Os documentos usam sempre VEÍCULO (nunca "automóvel"/"carro").' },
  { termo: 'CONTRATO', definicao: 'O Contrato de Locação gerado a partir do template master, congelado por versão com hash.' },
  { termo: 'TEMPLATE / MINUTA', definicao: 'O modelo parametrizável. MINUTA = ainda sem revisão jurídica aprovada; carrega o carimbo obrigatório.' },
  { termo: 'VERSÃO OFICIAL', definicao: 'Template publicado COM revisão jurídica aprovada registrada da versão atual.' },
  { termo: 'ADITIVO', definicao: 'Documento que altera condição do contrato sem sobrescrevê-lo (o original permanece congelado).' },
  { termo: 'RENOVAÇÃO / PRORROGAÇÃO', definicao: 'Novo prazo por decisão expressa (renovação pode reajustar condições; prorrogação estende nas mesmas). Nunca automática.' },
  { termo: 'CAUÇÃO', definicao: 'Garantia em dinheiro registrada em contratos.valor_caucao; regras de retenção/devolução pendentes de decisão jurídica.', equivalencias: 'A Cl. 6 sem caução usa o título GARANTIA — mesmo assunto, variante contratual.' },
  { termo: 'FRANQUIA', definicao: 'Valor da participação obrigatória no sinistro conforme a apólice cadastrada — nunca presumido pelo sistema.' },
  { termo: 'SINISTRO', definicao: 'Ocorrência com o veículo (colisão, avaria grave, incêndio, furto, roubo, perda total, dano a terceiros) registrada no módulo de sinistros.' },
  { termo: 'AVARIA', definicao: 'Dano físico constatável em vistoria. DANO é o gênero (inclui prejuízo indenizável); o critério desgaste × dano é pendência jurídica.' },
  { termo: 'RASTREAMENTO', definicao: 'Localização do veículo (GPS).', equivalencias: 'TELEMETRIA é o conjunto maior (km, velocidade, bateria, eventos). Os documentos usam os dois termos juntos e no mesmo sentido do sistema.' },
  { termo: 'TELEMETRIA', definicao: 'Dados de operação do veículo coletados durante a locação.' },
  { termo: 'VISTORIA', definicao: 'Checklist fotográfico com odômetro e carga registrado no sistema (entrega/devolução/renovação).' },
  { termo: 'DEMONSTRATIVO / PRESTAÇÃO DE CONTAS', definicao: 'Relação item a item de débitos/créditos apurados — sempre registrado, nunca calculado como penalidade automática.' },
  { termo: 'RESCISÃO', definicao: 'Fim antecipado ou motivado do contrato via workflow (solicitação → análise → devolução → encerramento).', equivalencias: 'ENCERRAMENTO é o fecho do ciclo (após checklist); não são sinônimos nos documentos.' },
  { termo: 'DEVOLUÇÃO', definicao: 'Restituição física do veículo com vistoria e termo próprios.' },
  { termo: 'ENCERRAMENTO', definicao: 'Conclusão formal do contrato após checklist obrigatório e apuração registrada.' },
  { termo: 'QUITAÇÃO', definicao: 'Declaração recíproca de nada mais dever — uso CONDICIONADO à decisão do advogado.' },
  { termo: 'DOSSIÊ', definicao: 'ZIP com todos os documentos, versões, evidências e auditoria de um contrato.' },
  { termo: 'HASH (SHA-256)', definicao: 'Código de integridade do documento congelado; impresso no PDF e conferido pelo painel de integridade.' },
  { termo: 'CONFORMIDADE OPERACIONAL', definicao: 'Resposta objetiva a "o contrato está operacionalmente completo?" — OK/ATENÇÃO/BLOQUEADO com motivos. NÃO significa validade jurídica.' },
  { termo: 'INTEGRIDADE DOCUMENTAL', definicao: 'Documento existe, congelado, hash confere e assinaturas completas — OK/ATENÇÃO/CRÍTICO.' },
  { termo: 'DIVERGÊNCIA CONTRATUAL', definicao: 'Diferença entre o snapshot congelado do contrato e o cadastro atual. Sinalizada, nunca corrigida automaticamente.' },
  { termo: 'RECONCILIAÇÃO', definicao: 'Verificação sob demanda: banco × snapshot × documento × hash × timeline × arquivos × assinaturas, com relatório exportável.' },
];

// ---------------------------------------------------------------------------
// DECISÕES NÃO-JURÍDICAS registradas na auditoria (Fases 13–14 do pacote: pastas 14 e 15)
// ---------------------------------------------------------------------------

export const DECISOES_PRODUTO: string[] = [
  'Meios de pagamento aceitos: especificar no contrato, em anexo comercial ou manter genérico (Cl. 5.1)?',
  'Expressão do vencimento para cobrança semanal/diária (conflito C1) — exige mudança de produto (campo próprio) além da redação jurídica.',
  '"Resumo das condições comerciais" citado como anexo do Master: criar peça própria ou o contrato vale como resumo (conflito C6)?',
  'Renovação com alteração de valor no próprio termo × sempre por aditivo separado (conflito C3).',
  'Integrar inventário/avarias estruturados da vistoria ao gerador de termos (hoje campos digitados na geração — conflito C8).',
  'Campo de condutor terceiro autorizado na Declaração de Sinistro (com o advogado — conflito C4).',
];

export const DECISOES_OPERACIONAIS: string[] = [
  'Travas de emissão implantadas na Fase 6 (não gerar termo de seguro sem apólice, de sinistro sem ocorrência, de rescisão sem workflow, de aditivo/renovação sem registro, de encerramento/quitação sem apuração) — manter e revisar caso a operação precise de exceção.',
  'Quem digita os campos manuais do gerador de termos (padrão sugerido: operação, na presença do motorista, antes da assinatura).',
  'Canal de envio do Pacote Jurídico ao advogado (o sistema exporta o ZIP e registra o envio; e-mail/drive é manual).',
  'Vistoria de renovação: recomendada no termo, não obrigatória — definir prática padrão da operação.',
  'Prazo interno de resposta ao titular LGPD depois que o advogado definir o canal (termo LGPD §5).',
];

// ---------------------------------------------------------------------------
// PRIORIDADE OPERACIONAL de pendências jurídicas (Fase 15 — filtros da Sala do Advogado).
// Classificação por assunto para ORDENAR a revisão humana. NÃO é análise de risco jurídico.
// ---------------------------------------------------------------------------

export type PrioridadeOperacional = 'critico' | 'alto' | 'medio' | 'baixo';

export const PRIORIDADE_LABEL: Record<PrioridadeOperacional, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
};

const REGRAS_PRIORIDADE: { re: RegExp; prioridade: PrioridadeOperacional }[] = [
  { re: /multa|juros|cláusula penal|penalidade|caução|franquia|perda total|responsabilidade transferível|percentu/i, prioridade: 'critico' },
  { re: /lgpd|base legal|retenção|compartilhamento|foro|assinatura|indicação de condutor|inadimpl|aviso prévio|purga|enquadramento/i, prioridade: 'alto' },
  { re: /desgaste|manutenção|bateria|degradação|substituição|confidencialidade|força maior|impedimento|vistoria|apuração/i, prioridade: 'medio' },
];

export function prioridadePendencia(texto: string): PrioridadeOperacional {
  for (const r of REGRAS_PRIORIDADE) if (r.re.test(texto)) return r.prioridade;
  return 'baixo';
}

// ---------------------------------------------------------------------------
// CONFLITOS ANTES × DEPOIS do retorno (Fase 7/10). Só para conflitos com detector textual no
// documento em questão. "Possivelmente resolvido" NUNCA fecha o conflito sozinho — a lista
// curada (status) é atualizada por humano; isto é um FAROL para a revisão.
// ---------------------------------------------------------------------------

export type SituacaoConflitoRetorno = {
  conflito: ConflitoPotencial;
  antes: boolean;
  depois: boolean;
  situacao: 'continua' | 'possivelmente_resolvido' | 'surgiu';
};

export function compararConflitosDoc(docSlug: string, corpoAntes: string, corpoDepois: string): SituacaoConflitoRetorno[] {
  const resultado: SituacaoConflitoRetorno[] = [];
  for (const c of CONFLITOS_POTENCIAIS) {
    if (!c.detector || c.detector.docSlug !== docSlug) continue;
    const re = new RegExp(c.detector.presenteRe, 'i');
    const antes = re.test(corpoAntes);
    const depois = re.test(corpoDepois);
    if (!antes && !depois) continue;
    resultado.push({
      conflito: c,
      antes,
      depois,
      situacao: antes && !depois ? 'possivelmente_resolvido' : !antes && depois ? 'surgiu' : 'continua',
    });
  }
  return resultado;
}
