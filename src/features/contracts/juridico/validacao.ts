// Validação pré-geração + montagem do SNAPSHOT — puro, testável.
//
// O snapshot é a fotografia dos dados no momento da geração: o documento renderizado usa SÓ o
// snapshot (nunca o cadastro vivo), e o snapshot congela junto com a versão (trigger 0042).
// A validação decide se PODE gerar: BLOQUEIO = não gera; ALERTA = gera, mas fica visível.
import { variaveisFaltando } from './lib';

// Formas mínimas dos dados que o wizard carrega — espelham colunas reais (não select('*')).
export type MotoristaParaContrato = {
  id: string;
  nome_completo: string;
  cpf: string;
  status: string;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  cnh_validade: string | null;
  endereco: string | null;
};

export type VeiculoParaContrato = {
  id: string;
  placa: string;
  renavam: string;
  chassi: string;
  ano_fabricacao: number;
  ano_modelo: number;
  cor?: string | null;
  status: string;
  quilometragem: number;
  marca?: { nome: string } | null;
  modelo?: { nome: string } | null;
};

export type CondicoesContrato = {
  valor_periodico: number;
  periodicidade: string;
  dia_vencimento: number | null;
  valor_caucao: number | null;
  data_inicio: string;
  data_fim_prevista: string | null;
  km_incluso?: string | null;
  regras_especificas?: string | null;
};

export type EmpresaParaContrato = { id: string; nome: string; cnpj?: string | null; endereco?: string | null };

export type ItemValidacao = {
  nivel: 'ok' | 'alerta' | 'bloqueio';
  rotulo: string;
  detalhe?: string;
};

export type ResultadoValidacao = {
  itens: ItemValidacao[];
  bloqueios: ItemValidacao[];
  alertas: ItemValidacao[];
  podeGerar: boolean;
};

const PERIODICIDADE_LABEL: Record<string, string> = { diaria: 'diária', semanal: 'semanal', mensal: 'mensal' };

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDataBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Monta o snapshot completo (empresa + motorista + veículo + condições + template) no formato
 * que o corpo do template consome ({{empresa.razao_social}}, {{motorista.nome}}, ...).
 * Valores já formatados pra leitura humana — o documento é texto jurídico, não API.
 */
export function montarSnapshot(params: {
  empresa: EmpresaParaContrato;
  motorista: MotoristaParaContrato;
  veiculo: VeiculoParaContrato;
  condicoes: CondicoesContrato;
  template: { id: string; nome: string; versao_template: number };
}): Record<string, unknown> {
  const { empresa, motorista, veiculo, condicoes, template } = params;
  const prazo = condicoes.data_fim_prevista
    ? `de ${formatDataBR(condicoes.data_inicio)} a ${formatDataBR(condicoes.data_fim_prevista)}`
    : 'indeterminado';
  return {
    empresa: {
      razao_social: empresa.nome,
      cnpj: empresa.cnpj ?? '',
      endereco: empresa.endereco ?? '',
    },
    motorista: {
      nome: motorista.nome_completo,
      cpf: motorista.cpf,
      cnh: motorista.cnh_numero
        ? `${motorista.cnh_numero}${motorista.cnh_categoria ? ` (categoria ${motorista.cnh_categoria})` : ''}`
        : '',
      endereco: motorista.endereco ?? '',
    },
    veiculo: {
      marca_modelo: [veiculo.marca?.nome, veiculo.modelo?.nome].filter(Boolean).join(' ') || '',
      placa: veiculo.placa,
      renavam: veiculo.renavam,
      chassi: veiculo.chassi,
      ano: `${veiculo.ano_fabricacao}/${veiculo.ano_modelo}`,
      cor: veiculo.cor ?? '',
      quilometragem: String(veiculo.quilometragem),
    },
    contrato: {
      valor_periodico: formatBRL(condicoes.valor_periodico),
      periodicidade: PERIODICIDADE_LABEL[condicoes.periodicidade] ?? condicoes.periodicidade,
      dia_vencimento: condicoes.dia_vencimento != null ? String(condicoes.dia_vencimento) : '',
      valor_caucao: condicoes.valor_caucao != null ? formatBRL(condicoes.valor_caucao) : '',
      data_inicio: formatDataBR(condicoes.data_inicio),
      prazo,
      km_incluso: condicoes.km_incluso ?? '',
      regras_especificas: condicoes.regras_especificas ?? '',
    },
    _meta: {
      template_id: template.id,
      template_nome: template.nome,
      template_versao: template.versao_template,
      gerado_em: new Date().toISOString(),
    },
  };
}

/** Validação completa pré-geração (Etapa 5 do wizard). */
export function validarParaGeracao(params: {
  motorista: MotoristaParaContrato | null;
  veiculo: VeiculoParaContrato | null;
  condicoes: CondicoesContrato | null;
  templateCorpo: string | null;
  snapshot: Record<string, unknown> | null;
  /** contrato ativo existente no veículo (unique parcial do banco impede o segundo) */
  veiculoTemContratoAtivo?: boolean;
  documentosMotoristaAprovados?: boolean;
  hoje?: string; // injetável p/ teste determinístico (ISO yyyy-mm-dd)
}): ResultadoValidacao {
  const itens: ItemValidacao[] = [];
  const hoje = params.hoje ?? new Date().toISOString().slice(0, 10);

  // ---- Motorista ----
  const mot = params.motorista;
  if (!mot) itens.push({ nivel: 'bloqueio', rotulo: 'Motorista', detalhe: 'Nenhum motorista selecionado.' });
  else {
    itens.push({ nivel: 'ok', rotulo: 'Motorista', detalhe: mot.nome_completo });
    if (!mot.cpf || mot.cpf.replace(/\D/g, '').length !== 11)
      itens.push({ nivel: 'bloqueio', rotulo: 'CPF', detalhe: 'CPF ausente ou incompleto no cadastro.' });
    else itens.push({ nivel: 'ok', rotulo: 'CPF' });
    if (mot.status !== 'ativo')
      itens.push({ nivel: 'bloqueio', rotulo: 'Status do motorista', detalhe: `Motorista está "${mot.status}" — só motorista ativo contrata.` });
    if (!mot.cnh_numero)
      itens.push({ nivel: 'bloqueio', rotulo: 'CNH', detalhe: 'Número da CNH ausente no cadastro.' });
    else if (mot.cnh_validade && mot.cnh_validade.slice(0, 10) < hoje)
      itens.push({ nivel: 'bloqueio', rotulo: 'CNH', detalhe: `CNH vencida em ${formatDataBR(mot.cnh_validade)}.` });
    else {
      itens.push({ nivel: 'ok', rotulo: 'CNH' });
      if (!mot.cnh_validade)
        itens.push({ nivel: 'alerta', rotulo: 'Validade da CNH', detalhe: 'Sem data de validade no cadastro — confirme antes de assinar.' });
    }
    if (!mot.endereco)
      itens.push({ nivel: 'alerta', rotulo: 'Endereço', detalhe: 'Endereço incompleto — o contrato sai com o campo em branco.' });
    if (params.documentosMotoristaAprovados === false)
      itens.push({ nivel: 'alerta', rotulo: 'Documentos', detalhe: 'Há documento do motorista não aprovado na revisão.' });
  }

  // ---- Veículo ----
  const vei = params.veiculo;
  if (!vei) itens.push({ nivel: 'bloqueio', rotulo: 'Veículo', detalhe: 'Nenhum veículo selecionado.' });
  else {
    itens.push({ nivel: 'ok', rotulo: 'Veículo', detalhe: vei.placa });
    if (!vei.placa) itens.push({ nivel: 'bloqueio', rotulo: 'Placa', detalhe: 'Veículo sem placa.' });
    else itens.push({ nivel: 'ok', rotulo: 'Placa' });
    if (params.veiculoTemContratoAtivo)
      itens.push({ nivel: 'bloqueio', rotulo: 'Disponibilidade', detalhe: 'Este veículo já tem contrato ATIVO — encerre ou escolha outro.' });
    // Status reais do enum veiculo_status (frota/types.ts): bloqueiam os terminais/indisponíveis.
    if (['manutencao', 'venda', 'encerrado'].includes(vei.status))
      itens.push({ nivel: 'bloqueio', rotulo: 'Status do veículo', detalhe: `Veículo está "${vei.status}".` });
    else if (vei.status === 'alugado' && !params.veiculoTemContratoAtivo)
      itens.push({ nivel: 'alerta', rotulo: 'Status do veículo', detalhe: 'Marcado como "alugado" mas sem contrato ativo — confira o cadastro.' });
  }

  // ---- Condições ----
  const cond = params.condicoes;
  if (!cond) itens.push({ nivel: 'bloqueio', rotulo: 'Condições', detalhe: 'Condições comerciais não preenchidas.' });
  else {
    if (!(cond.valor_periodico > 0))
      itens.push({ nivel: 'bloqueio', rotulo: 'Valor', detalhe: 'Valor periódico precisa ser maior que zero.' });
    else itens.push({ nivel: 'ok', rotulo: 'Valor', detalhe: formatBRL(cond.valor_periodico) });
    if (!cond.data_inicio) itens.push({ nivel: 'bloqueio', rotulo: 'Data de início', detalhe: 'Obrigatória.' });
    else itens.push({ nivel: 'ok', rotulo: 'Início', detalhe: formatDataBR(cond.data_inicio) });
    if (cond.data_fim_prevista && cond.data_fim_prevista <= cond.data_inicio)
      itens.push({ nivel: 'bloqueio', rotulo: 'Prazo', detalhe: 'Data de término precisa ser depois do início.' });
    else itens.push({ nivel: 'ok', rotulo: 'Prazo' });
    if (cond.valor_caucao != null && cond.valor_caucao < 0)
      itens.push({ nivel: 'bloqueio', rotulo: 'Caução', detalhe: 'Caução não pode ser negativa.' });
    if (cond.valor_caucao == null || cond.valor_caucao === 0)
      itens.push({ nivel: 'alerta', rotulo: 'Caução', detalhe: 'Sem caução — a Cláusula 5 sai vazia. Intencional?' });
  }

  // ---- Template × snapshot (variáveis) ----
  if (!params.templateCorpo) {
    itens.push({ nivel: 'bloqueio', rotulo: 'Template', detalhe: 'Nenhum template selecionado.' });
  } else if (params.snapshot) {
    const faltando = variaveisFaltando(params.templateCorpo, params.snapshot);
    // km_incluso/regras vazios são decisão comercial (viram [SEM VALOR] visível), não bloqueio;
    // dados de identificação faltando são BLOQUEIO (contrato sem CPF/placa não existe).
    const criticas = faltando.filter((v) => !v.startsWith('contrato.km_incluso') && !v.startsWith('contrato.regras'));
    if (criticas.length > 0)
      itens.push({
        nivel: 'bloqueio',
        rotulo: 'Variáveis do template',
        detalhe: `Sem valor no snapshot: ${criticas.join(', ')}`,
      });
    else itens.push({ nivel: 'ok', rotulo: 'Variáveis do template', detalhe: 'Todas preenchidas' });
    const opcionais = faltando.filter((v) => v.startsWith('contrato.km_incluso') || v.startsWith('contrato.regras'));
    if (opcionais.length > 0)
      itens.push({ nivel: 'alerta', rotulo: 'Campos opcionais', detalhe: `Sairão como [SEM VALOR]: ${opcionais.join(', ')}` });
  }

  const bloqueios = itens.filter((i) => i.nivel === 'bloqueio');
  const alertas = itens.filter((i) => i.nivel === 'alerta');
  return { itens, bloqueios, alertas, podeGerar: bloqueios.length === 0 };
}
