import type { Veiculo, VeiculoStatus } from '../types';
import type { Manutencao, Multa } from '@/features/operacoes/types';

// Épico 4 — "Ativo Financeiro", Parte 5. "Saúde do Ativo" é uma leitura DIFERENTE do veículo do
// que o Health Score operacional que já existe (frota/intelligence/healthScore.ts, usado no
// Command Center e no Cockpit) — por isso vive num módulo próprio, com seu próprio conjunto de
// categorias (as 10 que a missão pediu), em vez de estender/renomear o Health Score existente e
// arriscar quebrar quem já consome ele. Mesmo princípio de "nunca preenche dado que não existe"
// (DEC-022): categoria sem modelo de dado por trás (Seguro, Sinistros) sempre entra como
// score=null, nunca um número inventado — e a nota geral só faz média das categorias com dado
// real, igual o motor existente.
export type CategoriaSaudeAtivoId =
  | 'receita'
  | 'custos'
  | 'disponibilidade'
  | 'documentacao'
  | 'seguro'
  | 'manutencao'
  | 'quilometragem'
  | 'idade'
  | 'multas'
  | 'sinistros';

export type CategoriaSaudeAtivoResult = {
  categoria: CategoriaSaudeAtivoId;
  label: string;
  score: number | null;
  motivos: string[];
};

export type SaudeDoAtivoResult = {
  overall: number | null;
  categoriasAvaliadas: number;
  categoriasTotais: number;
  categorias: CategoriaSaudeAtivoResult[];
};

const STATUS_DISPONIBILIDADE_SCORE: Partial<Record<VeiculoStatus, number>> = {
  disponivel: 100,
  alugado: 100,
  reservado: 90,
  preparacao: 60,
  devolvido: 60,
  manutencao: 30,
};

function calcularCategoriaReceita(receitaConfirmada: number, diasNaFrota: number): CategoriaSaudeAtivoResult {
  if (diasNaFrota < 30) {
    return { categoria: 'receita', label: 'Receita', score: null, motivos: ['Menos de 30 dias na frota — cedo pra avaliar.'] };
  }
  const score = receitaConfirmada > 0 ? 100 : 20;
  const motivos =
    receitaConfirmada > 0
      ? [`Receita confirmada de ${receitaConfirmada.toFixed(2)} registrada.`]
      : ['Nenhuma receita confirmada registrada apesar de mais de 30 dias na frota.'];
  return { categoria: 'receita', label: 'Receita', score, motivos };
}

function calcularCategoriaCustos(receitaConfirmada: number, despesaConfirmada: number): CategoriaSaudeAtivoResult {
  if (receitaConfirmada === 0 && despesaConfirmada === 0) {
    return { categoria: 'custos', label: 'Custos', score: null, motivos: ['Sem receita nem despesa registrada ainda.'] };
  }
  const razao = despesaConfirmada / Math.max(receitaConfirmada, 1);
  const score = Math.max(0, Math.min(100, Math.round(100 - razao * 100)));
  return {
    categoria: 'custos',
    label: 'Custos',
    score,
    motivos: [`Despesa confirmada equivale a ${Math.round(razao * 100)}% da receita confirmada.`],
  };
}

function calcularCategoriaDisponibilidade(status: VeiculoStatus): CategoriaSaudeAtivoResult {
  const score = STATUS_DISPONIBILIDADE_SCORE[status] ?? null;
  const motivos =
    score !== null
      ? [`Status atual: ${status}.`]
      : [`Status atual (${status}) está fora do ciclo operacional — disponibilidade não se aplica.`];
  return { categoria: 'disponibilidade', label: 'Disponibilidade', score, motivos };
}

function calcularCategoriaDocumentacao(totalDocumentos: number): CategoriaSaudeAtivoResult {
  const score = totalDocumentos === 0 ? 30 : totalDocumentos === 1 ? 70 : 100;
  const motivos = [totalDocumentos === 0 ? 'Nenhum documento cadastrado.' : `${totalDocumentos} documento(s) cadastrado(s).`];
  return { categoria: 'documentacao', label: 'Documentação', score, motivos };
}

function calcularCategoriaSeguro(): CategoriaSaudeAtivoResult {
  return { categoria: 'seguro', label: 'Seguro', score: null, motivos: ['Sem modelo de dado de apólice de seguro no sistema ainda.'] };
}

function calcularCategoriaManutencao(manutencoes: Pick<Manutencao, 'status_execucao' | 'data_agendada'>[]): CategoriaSaudeAtivoResult {
  if (manutencoes.length === 0) {
    return { categoria: 'manutencao', label: 'Manutenção', score: null, motivos: ['Nenhuma manutenção registrada ainda.'] };
  }
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasadas = manutencoes.filter((m) => m.status_execucao === 'agendada' && m.data_agendada !== null && m.data_agendada < hoje);
  if (atrasadas.length > 0) {
    return {
      categoria: 'manutencao',
      label: 'Manutenção',
      score: 20,
      motivos: [`${atrasadas.length} manutenção(ões) agendada(s) e atrasada(s).`],
    };
  }
  return { categoria: 'manutencao', label: 'Manutenção', score: 90, motivos: ['Nenhuma manutenção agendada em atraso.'] };
}

// Judgment call documentado (Palpite): 20.000 km/ano é a referência usada aqui pra "uso normal"
// de um veículo de locação — não é um número oficial, é um limiar arbitrário mas razoável.
// Ajustável sem mudar a assinatura da função.
const KM_ESPERADO_POR_ANO = 20000;

function calcularCategoriaQuilometragem(quilometragem: number, idadeAnos: number): CategoriaSaudeAtivoResult {
  const esperado = Math.max(1, idadeAnos) * KM_ESPERADO_POR_ANO;
  const razao = quilometragem / esperado;
  const score = razao <= 1 ? 100 : razao <= 1.5 ? 70 : razao <= 2 ? 40 : 15;
  return {
    categoria: 'quilometragem',
    label: 'Quilometragem',
    score,
    motivos: [`${quilometragem.toLocaleString('pt-BR')} km rodados — referência de ${Math.round(esperado).toLocaleString('pt-BR')} km pra idade do veículo.`],
  };
}

// Judgment call documentado (Palpite): faixas de idade que penalizam a nota — depreciação e
// risco de manutenção sobem com o tempo, mas o corte exato (2/5/8 anos) é uma escolha, não um
// padrão oficial do setor.
function calcularCategoriaIdade(anoFabricacao: number, anoAtual: number): CategoriaSaudeAtivoResult {
  const idade = Math.max(0, anoAtual - anoFabricacao);
  const score = idade <= 2 ? 100 : idade <= 5 ? 80 : idade <= 8 ? 50 : 20;
  return { categoria: 'idade', label: 'Idade', score, motivos: [`${idade} ano(s) de fabricação.`] };
}

function calcularCategoriaMultas(multas: Pick<Multa, 'status'>[]): CategoriaSaudeAtivoResult {
  const pendentes = multas.filter((m) => m.status === 'pendente').length;
  const score = pendentes === 0 ? 100 : pendentes === 1 ? 70 : pendentes === 2 ? 40 : 10;
  const motivos = [pendentes === 0 ? 'Nenhuma multa pendente.' : `${pendentes} multa(s) pendente(s).`];
  return { categoria: 'multas', label: 'Multas', score, motivos };
}

function calcularCategoriaSinistros(): CategoriaSaudeAtivoResult {
  return { categoria: 'sinistros', label: 'Sinistros', score: null, motivos: ['Sem modelo de dado de sinistros no sistema ainda.'] };
}

export type SaudeDoAtivoInput = {
  veiculo: Pick<Veiculo, 'status' | 'quilometragem' | 'ano_fabricacao' | 'data_compra' | 'criado_em'>;
  totalDocumentos: number;
  receitaConfirmada: number;
  despesaConfirmada: number;
  diasNaFrota: number;
  manutencoes: Pick<Manutencao, 'status_execucao' | 'data_agendada'>[];
  multas: Pick<Multa, 'status'>[];
  hoje?: Date;
};

export function calcularSaudeDoAtivo(input: SaudeDoAtivoInput): SaudeDoAtivoResult {
  const hoje = input.hoje ?? new Date();
  const anoAtual = hoje.getFullYear();

  const categorias: CategoriaSaudeAtivoResult[] = [
    calcularCategoriaReceita(input.receitaConfirmada, input.diasNaFrota),
    calcularCategoriaCustos(input.receitaConfirmada, input.despesaConfirmada),
    calcularCategoriaDisponibilidade(input.veiculo.status),
    calcularCategoriaDocumentacao(input.totalDocumentos),
    calcularCategoriaSeguro(),
    calcularCategoriaManutencao(input.manutencoes),
    calcularCategoriaQuilometragem(input.veiculo.quilometragem, anoAtual - input.veiculo.ano_fabricacao),
    calcularCategoriaIdade(input.veiculo.ano_fabricacao, anoAtual),
    calcularCategoriaMultas(input.multas),
    calcularCategoriaSinistros(),
  ];

  const avaliadas = categorias.filter((c) => c.score !== null);
  const overall = avaliadas.length === 0 ? null : Math.round(avaliadas.reduce((soma, c) => soma + (c.score as number), 0) / avaliadas.length);

  return { overall, categoriasAvaliadas: avaliadas.length, categoriasTotais: categorias.length, categorias };
}
