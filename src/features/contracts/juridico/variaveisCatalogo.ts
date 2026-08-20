// CATÁLOGO ÚNICO DE VARIÁVEIS da biblioteca contratual (Fase 5, regra 14 da missão).
// Toda variável {{...}} usada em qualquer minuta PRECISA existir aqui, com origem no sistema.
// Consumidores: gerar-matriz-variaveis.ts (documentação), validação de importação de retorno do
// advogado (variável sem origem BLOQUEIA o import) e audit scripts (zero variável órfã).
// Fonte única — se uma minuta nova inventar variável, o audit e a matriz FALHAM até ela entrar aqui.

export type TipoVariavel = 'texto' | 'moeda' | 'data' | 'numero' | 'documento' | 'lista';

export type VariavelCatalogo = {
  /** origem do dado no sistema (tabela.coluna ou derivação) */
  origem: string;
  tipo: TipoVariavel;
  /** true = sem valor BLOQUEIA a geração; false = sai [SEM VALOR] visível (ou some via {{#se}}) */
  obrigatoria: boolean;
  descricao: string;
  exemplo: string;
  /** regra de validação aplicada/observada (texto descritivo — a validação dura é do banco/UI) */
  validacao?: string;
};

export const CATALOGO_VARIAVEIS: Record<string, VariavelCatalogo> = {
  // ---------------- EMPRESA (LOCADORA) ----------------
  'empresa.razao_social': { origem: 'empresas.nome', tipo: 'texto', obrigatoria: true, descricao: 'Razão social da locadora', exemplo: 'PrimeCharge Locadora LTDA' },
  'empresa.cnpj': { origem: 'empresas.cnpj', tipo: 'documento', obrigatoria: false, descricao: 'CNPJ da locadora', exemplo: '00.000.000/0001-00', validacao: 'formato CNPJ' },
  'empresa.endereco': { origem: 'empresas.endereco (0043) ou campo do wizard', tipo: 'texto', obrigatoria: false, descricao: 'Endereço da sede', exemplo: 'Av. X, 100 — Belo Horizonte/MG' },

  // ---------------- MOTORISTA (LOCATÁRIO) ----------------
  'motorista.nome': { origem: 'motoristas.nome_completo', tipo: 'texto', obrigatoria: true, descricao: 'Nome completo do motorista', exemplo: 'João da Silva' },
  'motorista.cpf': { origem: 'motoristas.cpf', tipo: 'documento', obrigatoria: true, descricao: 'CPF do motorista', exemplo: '123.456.789-01', validacao: '11 dígitos' },
  'motorista.cnh': { origem: 'motoristas.cnh_numero + cnh_categoria', tipo: 'documento', obrigatoria: true, descricao: 'CNH com categoria', exemplo: '99887766554 (categoria B)' },
  'motorista.endereco': { origem: 'motoristas.endereco', tipo: 'texto', obrigatoria: false, descricao: 'Endereço do motorista', exemplo: 'Rua Y, 22' },
  'motorista.email': { origem: 'motoristas.email', tipo: 'texto', obrigatoria: false, descricao: 'E-mail de contato', exemplo: 'joao@email.com' },
  'motorista.telefone': { origem: 'motoristas.telefone', tipo: 'texto', obrigatoria: false, descricao: 'Telefone de contato', exemplo: '(31) 99999-0000' },

  // ---------------- VEÍCULO ----------------
  'veiculo.marca_modelo': { origem: 'marcas.nome + modelos.nome', tipo: 'texto', obrigatoria: true, descricao: 'Marca e modelo', exemplo: 'BYD Dolphin' },
  'veiculo.placa': { origem: 'veiculos.placa', tipo: 'documento', obrigatoria: true, descricao: 'Placa', exemplo: 'ABC1D23' },
  'veiculo.renavam': { origem: 'veiculos.renavam', tipo: 'documento', obrigatoria: true, descricao: 'RENAVAM', exemplo: '01234567890' },
  'veiculo.chassi': { origem: 'veiculos.chassi', tipo: 'documento', obrigatoria: true, descricao: 'Chassi', exemplo: '9BW…' },
  'veiculo.ano': { origem: 'veiculos.ano_fabricacao/ano_modelo', tipo: 'texto', obrigatoria: true, descricao: 'Ano fabricação/modelo', exemplo: '2024/2025' },
  'veiculo.cor': { origem: 'veiculos.cor', tipo: 'texto', obrigatoria: false, descricao: 'Cor', exemplo: 'Branco' },
  'veiculo.quilometragem': { origem: 'veiculos.quilometragem', tipo: 'numero', obrigatoria: false, descricao: 'Km atual do cadastro', exemplo: '42000' },
  'veiculo.capacidade_bateria': { origem: 'veiculos.capacidade_bateria_kwh', tipo: 'numero', obrigatoria: false, descricao: 'Capacidade da bateria (kWh)', exemplo: '44' },

  // ---------------- CONTRATO (condições comerciais) ----------------
  'contrato.numero': { origem: 'contratos.id (8 primeiros caracteres)', tipo: 'texto', obrigatoria: true, descricao: 'Número do contrato', exemplo: 'C7777777' },
  'contrato.valor_periodico': { origem: 'contratos.valor_periodico (formatado BRL)', tipo: 'moeda', obrigatoria: true, descricao: 'Valor por período', exemplo: 'R$ 1.400,00' },
  'contrato.periodicidade': { origem: 'contratos.periodicidade', tipo: 'texto', obrigatoria: true, descricao: 'diária/semanal/mensal', exemplo: 'semanal' },
  'contrato.dia_vencimento': { origem: 'contratos.dia_vencimento', tipo: 'numero', obrigatoria: false, descricao: 'Dia de vencimento', exemplo: '5' },
  'contrato.valor_caucao': { origem: 'contratos.valor_caucao (formatado BRL)', tipo: 'moeda', obrigatoria: false, descricao: 'Caução (vazio = contrato sem caução; ativa bloco condicional)', exemplo: 'R$ 3.000,00' },
  'contrato.data_inicio': { origem: 'contratos.data_inicio', tipo: 'data', obrigatoria: true, descricao: 'Início da vigência', exemplo: '01/09/2026' },
  'contrato.prazo': { origem: 'derivado de data_inicio/data_fim_prevista', tipo: 'texto', obrigatoria: true, descricao: 'Prazo por extenso', exemplo: 'de 01/09/2026 a 01/09/2027' },
  'contrato.km_incluso': { origem: 'wizard (condições) — decisão comercial', tipo: 'texto', obrigatoria: false, descricao: 'Limite de km (vazio = quilometragem livre; ativa bloco condicional)', exemplo: '3.000 km/mês' },
  'contrato.valor_km_excedente': { origem: 'wizard (condições) — decisão comercial', tipo: 'moeda', obrigatoria: false, descricao: 'Valor por km excedente', exemplo: 'R$ 0,80' },
  'contrato.regras_especificas': { origem: 'wizard (condições) / contratos.observacoes', tipo: 'texto', obrigatoria: false, descricao: 'Condições particulares', exemplo: '—' },

  // ---------------- SEGURO (contrato_seguros, 0044) ----------------
  'seguro.seguradora': { origem: 'contrato_seguros.seguradora', tipo: 'texto', obrigatoria: false, descricao: 'Seguradora', exemplo: 'Seguradora X' },
  'seguro.apolice': { origem: 'contrato_seguros.apolice', tipo: 'documento', obrigatoria: false, descricao: 'Número da apólice', exemplo: 'AP-123456' },
  'seguro.vigencia': { origem: 'contrato_seguros.vigencia_inicio/fim (formatado)', tipo: 'texto', obrigatoria: false, descricao: 'Vigência da apólice', exemplo: 'de 01/09/2026 a 01/09/2027' },
  'seguro.franquia': { origem: 'contrato_seguros.franquia_valor (formatado BRL)', tipo: 'moeda', obrigatoria: false, descricao: 'Franquia', exemplo: 'R$ 5.000,00' },
  'seguro.coberturas': { origem: 'contrato_seguros.coberturas (só as marcadas true)', tipo: 'lista', obrigatoria: false, descricao: 'Coberturas declaradas como contratadas', exemplo: 'danos a terceiros; roubo/furto' },
  'seguro.exclusoes': { origem: 'contrato_seguros.coberturas (só as marcadas false)', tipo: 'lista', obrigatoria: false, descricao: 'Coberturas declaradas como NÃO contratadas', exemplo: 'colisão' },
  'seguro.assistencia': { origem: 'contrato_seguros.assistencia', tipo: 'texto', obrigatoria: false, descricao: 'Assistências', exemplo: 'guincho 24h' },

  // ---------------- VISTORIA / ENTREGA / DEVOLUÇÃO (checklists) ----------------
  'entrega.data': { origem: 'checklists (tipo entrega).criado_em ou informado no gerador', tipo: 'data', obrigatoria: false, descricao: 'Data da entrega', exemplo: '01/09/2026' },
  'entrega.km': { origem: 'checklists.odometro_km (vistoria de entrega)', tipo: 'numero', obrigatoria: false, descricao: 'Km na entrega', exemplo: '42.000' },
  'entrega.bateria_pct': { origem: 'checklists.carga_pct (vistoria de entrega)', tipo: 'numero', obrigatoria: false, descricao: '% de bateria na entrega', exemplo: '86' },
  'entrega.itens': { origem: 'informado no gerador (inventário)', tipo: 'lista', obrigatoria: false, descricao: 'Itens entregues (chaves, carregador, cabos, documentos, acessórios)', exemplo: '1 chave; 1 carregador portátil; 1 cabo tipo 2; CRLV digital' },
  'entrega.avarias': { origem: 'informado no gerador / vistoria', tipo: 'texto', obrigatoria: false, descricao: 'Avarias preexistentes registradas', exemplo: 'risco no para-choque traseiro' },
  'entrega.observacoes': { origem: 'informado no gerador', tipo: 'texto', obrigatoria: false, descricao: 'Observações da entrega', exemplo: '—' },
  'devolucao.data': { origem: 'informado no gerador', tipo: 'data', obrigatoria: false, descricao: 'Data da devolução', exemplo: '01/09/2027' },
  'devolucao.km': { origem: 'checklists.odometro_km (vistoria de devolução)', tipo: 'numero', obrigatoria: false, descricao: 'Km na devolução', exemplo: '78.500' },
  'devolucao.bateria_pct': { origem: 'checklists.carga_pct (vistoria de devolução)', tipo: 'numero', obrigatoria: false, descricao: '% de bateria na devolução', exemplo: '54' },
  'devolucao.itens': { origem: 'informado no gerador (inventário)', tipo: 'lista', obrigatoria: false, descricao: 'Itens devolvidos', exemplo: '1 chave; 1 carregador portátil' },
  'devolucao.avarias': { origem: 'informado no gerador / vistoria', tipo: 'texto', obrigatoria: false, descricao: 'Avarias constatadas na devolução', exemplo: '—' },
  'devolucao.pendencias': { origem: 'informado no gerador', tipo: 'texto', obrigatoria: false, descricao: 'Pendências apuradas (débitos, itens faltantes)', exemplo: '—' },
  'devolucao.observacoes': { origem: 'informado no gerador', tipo: 'texto', obrigatoria: false, descricao: 'Observações da devolução', exemplo: '—' },

  // ---------------- SINISTRO (sinistros) ----------------
  'sinistro.tipo': { origem: 'sinistros.tipo', tipo: 'texto', obrigatoria: false, descricao: 'Tipo do sinistro', exemplo: 'colisão' },
  'sinistro.data': { origem: 'sinistros.data_ocorrencia', tipo: 'data', obrigatoria: false, descricao: 'Data da ocorrência', exemplo: '15/10/2026' },
  'sinistro.descricao': { origem: 'sinistros.descricao', tipo: 'texto', obrigatoria: false, descricao: 'Descrição da ocorrência', exemplo: 'colisão traseira na Av. X' },
  'sinistro.documentos': { origem: 'informado no gerador (protocolo de entrega)', tipo: 'lista', obrigatoria: false, descricao: 'Documentos entregues relativos ao sinistro', exemplo: 'boletim de ocorrência; 12 fotos; orçamento' },

  // ---------------- MULTA (multas) ----------------
  'multa.orgao': { origem: 'multas.orgao_autuador', tipo: 'texto', obrigatoria: false, descricao: 'Órgão autuador', exemplo: 'DETRAN-MG' },
  'multa.descricao': { origem: 'multas.descricao', tipo: 'texto', obrigatoria: false, descricao: 'Descrição da infração', exemplo: 'excesso de velocidade' },
  'multa.data': { origem: 'multas.data_infracao', tipo: 'data', obrigatoria: false, descricao: 'Data da infração', exemplo: '10/10/2026' },
  'multa.valor': { origem: 'multas.valor (formatado BRL)', tipo: 'moeda', obrigatoria: false, descricao: 'Valor da multa', exemplo: 'R$ 195,23' },

  // ---------------- ADITIVO (contrato_aditivos) ----------------
  'aditivo.tipo': { origem: 'contrato_aditivos.tipo', tipo: 'texto', obrigatoria: false, descricao: 'Tipo do aditivo', exemplo: 'valor' },
  'aditivo.descricao': { origem: 'contrato_aditivos.descricao', tipo: 'texto', obrigatoria: false, descricao: 'Descrição da mudança e motivo', exemplo: 'Reajuste do valor semanal…' },
  'aditivo.data': { origem: 'contrato_aditivos.criado_em', tipo: 'data', obrigatoria: false, descricao: 'Data do aditivo', exemplo: '18/08/2026' },
  'aditivo.condicao_anterior': { origem: 'informado no gerador', tipo: 'texto', obrigatoria: false, descricao: 'Condição vigente antes do aditivo', exemplo: 'R$ 1.400,00/semana' },
  'aditivo.condicao_nova': { origem: 'informado no gerador', tipo: 'texto', obrigatoria: false, descricao: 'Condição nova pactuada', exemplo: 'R$ 1.500,00/semana' },
  'aditivo.data_efeito': { origem: 'informado no gerador', tipo: 'data', obrigatoria: false, descricao: 'Data em que a mudança passa a valer', exemplo: '01/10/2026' },

  // ---------------- RESCISÃO (contrato_rescisoes, 0044) ----------------
  'rescisao.motivo': { origem: 'contrato_rescisoes.motivo', tipo: 'texto', obrigatoria: false, descricao: 'Motivo da rescisão', exemplo: 'encerramento por acordo' },
  'rescisao.solicitante': { origem: 'contrato_rescisoes.solicitante', tipo: 'texto', obrigatoria: false, descricao: 'motorista/empresa/acordo (ativa blocos condicionais do termo)', exemplo: 'acordo' },
  'rescisao.data': { origem: 'contrato_rescisoes.criado_em', tipo: 'data', obrigatoria: false, descricao: 'Data da solicitação', exemplo: '18/08/2026' },
  'rescisao.valores': { origem: 'contrato_rescisoes.valores (apuração REGISTRADA — nunca calculada)', tipo: 'lista', obrigatoria: false, descricao: 'Apuração financeira registrada pela operação', exemplo: 'saldo devedor R$ 0,00; caução R$ 3.000,00' },

  // ---------------- GERAIS ----------------
  'data.hoje': { origem: 'data da geração do documento', tipo: 'data', obrigatoria: true, descricao: 'Data de emissão', exemplo: '18/08/2026' },
  'local.assinatura': { origem: 'juridico_parametros ou informado no gerador', tipo: 'texto', obrigatoria: false, descricao: 'Local de assinatura', exemplo: 'Belo Horizonte/MG' },
};

/** Variáveis usadas que NÃO existem no catálogo — órfãs. Import/audit BLOQUEIAM se houver. */
export function variaveisSemCatalogo(variaveis: string[]): string[] {
  return variaveis.filter((v) => !CATALOGO_VARIAVEIS[v]);
}
