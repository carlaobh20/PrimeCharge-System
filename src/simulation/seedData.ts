// Missão 7 — Modo Simulação: gerador do dataset fictício "PrimeCharge Mobility".
//
// Produz ~2 anos de histórico coerente de uma locadora de veículos elétricos operando de
// verdade: frota misturando marcas reais do mercado EV, motoristas, contratos em todos os
// estágios do ciclo de vida, financeiro completo (lançamentos + pagamentos derivados dos
// contratos ativos mês a mês), multas, manutenções (algumas geram lançamento de despesa,
// igual ao trigger real), checklists, documentos com vencimento, metas e uma timeline com
// milhares de eventos — tudo com os MESMOS módulos/telas que já existem, nada de tela nova
// (pedido explícito da Missão 7).
//
// Determinístico por seed numérico simples (sem crypto) — não precisa ser imprevisível,
// precisa ser plausível e reproduzível dentro da mesma ativação.

import type { SimulationTables, Row } from './store';
import {
  SIMULATION_EMPRESA_ID,
  SIMULATION_CENTRO_CUSTO_OPERACAO_ID,
  SIMULATION_CENTRO_CUSTO_MANUTENCAO_ID,
  SIMULATION_CENTRO_CUSTO_ADMIN_ID,
  SIMULATION_CONTA_OPERACIONAL_ID,
  SIMULATION_CONTA_RESERVA_ID,
} from './constants';

export type SimulationCurrentUser = { id: string; nome: string | null; email: string | null };

// ---------- utilidades ----------

let seedCounter = 1;
function rnd(): number {
  // LCG simples — determinístico dentro da mesma geração, sem depender de Math.random
  // (evita qualquer flakiness em teste manual/replay).
  seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
  return seedCounter / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function randInt(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
// IDs gerados com prefixo textual + contador — únicos, legíveis em devtools, nunca colidem
// com UUID real (formato diferente de propósito).
let idCounters: Record<string, number> = {};
function nextId(kind: string): string {
  idCounters[kind] = (idCounters[kind] ?? 0) + 1;
  return `sim-${kind}-${String(idCounters[kind]).padStart(5, '0')}`;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function toISODateTime(d: Date): string {
  return d.toISOString();
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

// ---------- catálogo de marcas/modelos (fictício, isolado da produção) ----------

const MARCAS_MODELOS: { marca: string; modelos: string[]; categoria: string }[] = [
  { marca: 'BYD', modelos: ['Dolphin', 'Seal', 'Song Plus'], categoria: 'hatch' },
  { marca: 'GAC Aion', modelos: ['Y Plus', 'ES'], categoria: 'suv' },
  { marca: 'Tesla', modelos: ['Model 3', 'Model Y'], categoria: 'suv' },
  { marca: 'Volvo', modelos: ['EX30', 'XC40 Recharge'], categoria: 'suv' },
  { marca: 'BMW', modelos: ['iX1', 'i4'], categoria: 'suv' },
  { marca: 'Mercedes-Benz', modelos: ['EQA', 'EQB'], categoria: 'suv' },
  { marca: 'GWM', modelos: ['Ora 03', 'Haval H6 HEV'], categoria: 'hatch' },
  { marca: 'Hyundai', modelos: ['Kona Electric', 'Ioniq 5'], categoria: 'suv' },
  { marca: 'Kia', modelos: ['Niro EV', 'EV6'], categoria: 'suv' },
];

const CORES = ['Branco', 'Prata', 'Preto', 'Cinza', 'Azul', 'Vermelho', 'Verde'];

// ---------- pessoas fictícias ----------

const NOMES_MOTORISTAS = [
  'Rafael Souza Lima', 'Juliana Costa Ferreira', 'Marcos Paulo Andrade', 'Camila Ribeiro Santos',
  'Eduardo Nogueira Alves', 'Patrícia Gomes Barbosa', 'Thiago Martins Rocha', 'Fernanda Lopes Cardoso',
  'Bruno Carvalho Teixeira', 'Larissa Pereira Dias', 'Gustavo Henrique Melo', 'Aline Cristina Duarte',
  'Rodrigo Almeida Pinto', 'Vanessa Oliveira Castro', 'Leonardo Batista Nunes', 'Priscila Fernandes Rezende',
  'Felipe Augusto Moreira', 'Renata Souza Cunha', 'Diego Ramos Vieira', 'Bianca Torres Machado',
  'André Luiz Correia', 'Simone Cardoso Freitas', 'Vinícius Tavares Lima', 'Carolina Nascimento Reis',
  'Paulo Roberto Guimarães', 'Débora Martins Siqueira', 'Rafael Costa Brandão', 'Michele Aparecida Farias',
];

const NOMES_EQUIPE = [
  { nome: 'Sandra Regina Lopes', role: 'gestor_frota' as const, email: 'sandra.lopes@primechargemobility.app' },
  { nome: 'Marcelo Antunes Cruz', role: 'gestor_financeiro' as const, email: 'marcelo.cruz@primechargemobility.app' },
  { nome: 'Tatiane Borges Almeida', role: 'operador' as const, email: 'tatiane.almeida@primechargemobility.app' },
];

const CIDADES_MG = ['Belo Horizonte', 'Contagem', 'Betim', 'Nova Lima'];

function cpfFalso(n: number): string {
  return `999${String(100000 + n).padStart(6, '0')}`;
}
function placaFalsa(n: number): string {
  const letras = String.fromCharCode(65 + (n % 26)) + String.fromCharCode(65 + ((n * 3) % 26)) + String.fromCharCode(65 + ((n * 7) % 26));
  return `SIM${n % 10}${letras.slice(0, 1)}${String(n).padStart(2, '0')}`;
}

// ---------- montagem principal ----------

export function buildSimulationDataset(currentUser: SimulationCurrentUser | null): SimulationTables {
  seedCounter = 42;
  idCounters = {};

  const hoje = new Date();
  const fundacao = addMonths(hoje, -24); // "2 anos de operação"

  const tables: SimulationTables = {
    empresas: [],
    usuarios: [],
    marcas: [],
    modelos: [],
    veiculos: [],
    motoristas: [],
    contratos: [],
    contas_bancarias: [],
    centros_custo: [],
    lancamentos: [],
    pagamentos: [],
    multas: [],
    manutencoes: [],
    checklists: [],
    checklist_itens: [],
    metas: [],
    tags: [],
    comentarios: [],
    favoritos: [],
    arquivos: [],
    timeline_eventos: [],
    acoes_operacionais: [],
  };

  const push = (table: string, row: Row) => tables[table].push(row);
  const timeline = (entidadeTipo: string, entidadeId: string, tipo: string, descricao: string, quando: Date, usuarioId: string | null = null) => {
    push('timeline_eventos', {
      id: nextId('tl'),
      empresa_id: SIMULATION_EMPRESA_ID,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      tipo,
      descricao,
      metadata: null,
      usuario_id: usuarioId,
      criado_em: toISODateTime(quando),
    });
  };

  // ---------- empresa ----------
  push('empresas', {
    id: SIMULATION_EMPRESA_ID,
    nome: 'PrimeCharge Mobility',
    criado_em: toISODateTime(fundacao),
  });

  // ---------- usuários ----------
  const donoId = currentUser?.id ?? nextId('usr');
  push('usuarios', {
    id: donoId,
    empresa_id: SIMULATION_EMPRESA_ID,
    nome_completo: currentUser?.nome ?? 'Carlos Ferro',
    email: currentUser?.email ?? 'carloshenriqueferro@gmail.com',
    role: 'owner',
    ativo: true,
    criado_em: toISODateTime(fundacao),
  });
  const equipeIds: string[] = [];
  for (const membro of NOMES_EQUIPE) {
    const id = nextId('usr');
    equipeIds.push(id);
    push('usuarios', {
      id,
      empresa_id: SIMULATION_EMPRESA_ID,
      nome_completo: membro.nome,
      email: membro.email,
      role: membro.role,
      ativo: true,
      criado_em: toISODateTime(addDays(fundacao, randInt(1, 60))),
    });
  }
  const responsavelIds = [donoId, ...equipeIds];

  // ---------- marcas/modelos ----------
  const modeloIdsPorMarca: Record<string, string[]> = {};
  const categoriaPorModelo: Record<string, string> = {};
  for (const grupo of MARCAS_MODELOS) {
    const marcaId = nextId('marca');
    push('marcas', { id: marcaId, nome: grupo.marca, criado_em: toISODateTime(fundacao) });
    modeloIdsPorMarca[marcaId] = [];
    for (const nomeModelo of grupo.modelos) {
      const modeloId = nextId('modelo');
      push('modelos', { id: modeloId, marca_id: marcaId, nome: nomeModelo, criado_em: toISODateTime(fundacao) });
      modeloIdsPorMarca[marcaId].push(modeloId);
      categoriaPorModelo[modeloId] = grupo.categoria;
    }
  }
  const marcaIds = Object.keys(modeloIdsPorMarca);

  // ---------- veículos ----------
  const STATUS_FROTA: [string, number][] = [
    ['alugado', 18], ['disponivel', 6], ['manutencao', 3], ['reservado', 2],
    ['venda', 2], ['encerrado', 4], ['devolvido', 2], ['preparacao', 2], ['comprado', 2], ['novo', 1],
  ];
  const TOTAL_VEICULOS = 42;
  const veiculos: Row[] = [];
  for (let i = 1; i <= TOTAL_VEICULOS; i++) {
    const status = pickWeighted(STATUS_FROTA);
    const marcaId = pick(marcaIds);
    const modeloId = pick(modeloIdsPorMarca[marcaId]);
    const categoria = categoriaPorModelo[modeloId];
    const idadeMeses = randInt(1, 24);
    const dataCompra = addMonths(hoje, -idadeMeses);
    const anoFabricacao = dataCompra.getFullYear();
    const valorCompra = randInt(110, 620) * 1000;
    const depreciacaoPct = Math.min(0.35, idadeMeses * 0.012);
    const valorFipe = Math.round(valorCompra * (1 - depreciacaoPct));
    const km = status === 'novo' || status === 'comprado' || status === 'preparacao' ? 0 : randInt(500, 62000);

    const veiculoId = nextId('veic');
    const row: Row = {
      id: veiculoId,
      empresa_id: SIMULATION_EMPRESA_ID,
      marca_id: marcaId,
      modelo_id: modeloId,
      ano_fabricacao: anoFabricacao,
      ano_modelo: anoFabricacao + (rnd() > 0.6 ? 1 : 0),
      chassi: `9SIM${String(i).padStart(13, '0')}`,
      renavam: `1${String(1000000000 + i)}`,
      placa: placaFalsa(i),
      cor: pick(CORES),
      categoria,
      tipo_aquisicao: pick(['compra_direta', 'compra_direta', 'financiamento', 'leasing']),
      status,
      quilometragem: km,
      autonomia_km: randInt(300, 650),
      capacidade_bateria_kwh: Math.round((randInt(280, 1100) / 10) * 10) / 10,
      data_compra: toISODate(dataCompra),
      valor_compra: valorCompra,
      valor_fipe: valorFipe,
      valor_mercado: Math.round(valorFipe * 0.97),
      valor_residual_estimado: Math.round(valorFipe * 0.6),
      observacoes: '[SIMULAÇÃO] frota PrimeCharge Mobility',
      comprador: null,
      valor_venda: null,
      data_venda: null,
      criado_em: toISODateTime(dataCompra),
      atualizado_em: toISODateTime(addDays(hoje, -randInt(0, 30))),
    };
    if (status === 'venda' || status === 'encerrado') {
      row.observacoes = '[SIMULAÇÃO] anunciado/vendido após fim de contrato';
    }
    if (status === 'encerrado') {
      row.comprador = 'Locadora Horizonte Verde Ltda';
      row.valor_venda = Math.round(valorFipe * 0.94);
      row.data_venda = toISODate(addDays(hoje, -randInt(5, 60)));
    }
    veiculos.push(row);
    push('veiculos', row);

    timeline('veiculo', veiculoId, 'compra', `Veículo ${row.placa} adquirido (${grupo(marcaId)} — R$ ${valorCompra.toLocaleString('pt-BR')})`, dataCompra, donoId);
    timeline('veiculo', veiculoId, 'cadastro', `Veículo ${row.placa} cadastrado na frota`, addDays(dataCompra, 1), donoId);
    if (row.data_venda) {
      timeline('veiculo', veiculoId, 'venda', `Veículo ${row.placa} vendido para ${row.comprador} por R$ ${(row.valor_venda as number).toLocaleString('pt-BR')}`, new Date(row.data_venda as string), donoId);
    }

    // documentos do veículo
    const docs: { categoria: string; nome: string; validadeDias: number }[] = [
      { categoria: 'crlv', nome: `CRLV ${anoFabricacao + 1} — ${row.placa}`, validadeDias: randInt(-30, 300) },
      { categoria: 'seguro', nome: `Apólice de seguro — ${row.placa}`, validadeDias: randInt(-15, 200) },
      { categoria: 'ipva', nome: `IPVA ${hoje.getFullYear()} — ${row.placa}`, validadeDias: randInt(-20, 150) },
      { categoria: 'licenciamento', nome: `Licenciamento — ${row.placa}`, validadeDias: randInt(-10, 250) },
    ];
    for (const doc of docs) {
      push('arquivos', {
        id: nextId('arq'),
        empresa_id: SIMULATION_EMPRESA_ID,
        entidade_tipo: 'veiculo',
        entidade_id: veiculoId,
        categoria: doc.categoria,
        nome_arquivo: doc.nome,
        caminho_storage: `simulacao/veiculos/${veiculoId}/${doc.categoria}.pdf`,
        tipo_mime: 'application/pdf',
        tamanho_bytes: randInt(80_000, 900_000),
        usuario_id: donoId,
        data_validade: toISODate(addDays(hoje, doc.validadeDias)),
        criado_via: 'manual',
        criado_em: toISODateTime(addDays(dataCompra, randInt(1, 10))),
      });
    }
  }
  function grupo(marcaId: string): string {
    return (tables.marcas.find((m) => m.id === marcaId)?.nome as string) ?? 'Marca';
  }

  // ---------- motoristas ----------
  const STATUS_MOTORISTA: [string, number][] = [
    ['ativo', 18], ['lead', 3], ['em_analise', 2], ['inativo', 2], ['bloqueado', 1], ['encerrado', 2],
  ];
  const motoristas: Row[] = [];
  for (let i = 0; i < NOMES_MOTORISTAS.length; i++) {
    const status = pickWeighted(STATUS_MOTORISTA);
    const temCnh = status !== 'lead' && status !== 'em_analise';
    const nascimento = addDays(hoje, -randInt(23, 55) * 365);
    const cadastro = addDays(fundacao, randInt(0, 700));
    const motoristaId = nextId('mot');
    const row: Row = {
      id: motoristaId,
      empresa_id: SIMULATION_EMPRESA_ID,
      nome_completo: NOMES_MOTORISTAS[i],
      cpf: cpfFalso(i),
      email: `${NOMES_MOTORISTAS[i].split(' ')[0].toLowerCase()}.${NOMES_MOTORISTAS[i].split(' ').slice(-1)[0].toLowerCase()}@simulacao.primecharge.app`,
      telefone: `319${String(88800000 + i)}`,
      data_nascimento: toISODate(nascimento),
      cnh_numero: temCnh ? `MG${String(2000000 + i)}` : null,
      cnh_categoria: temCnh ? 'B' : null,
      cnh_validade: temCnh ? toISODate(addDays(hoje, randInt(-40, 900))) : null,
      status,
      endereco: `Rua Simulação, ${100 + i}`,
      cidade: pick(CIDADES_MG),
      estado: 'MG',
      observacoes: status === 'bloqueado' ? '[SIMULAÇÃO] bloqueado após ocorrência na devolução' : '[SIMULAÇÃO]',
      criado_em: toISODateTime(cadastro),
      atualizado_em: toISODateTime(addDays(hoje, -randInt(0, 30))),
    };
    motoristas.push(row);
    push('motoristas', row);
    timeline('motorista', motoristaId, 'cadastro', `Motorista ${row.nome_completo} cadastrado`, cadastro, donoId);
    if (status === 'encerrado') {
      timeline('motorista', motoristaId, 'encerramento', `Contrato de motorista encerrado — ${row.nome_completo}`, addDays(hoje, -randInt(5, 90)), donoId);
    }

    if (temCnh) {
      push('arquivos', {
        id: nextId('arq'),
        empresa_id: SIMULATION_EMPRESA_ID,
        entidade_tipo: 'motorista',
        entidade_id: motoristaId,
        categoria: 'cnh',
        nome_arquivo: `CNH — ${row.nome_completo}`,
        caminho_storage: `simulacao/motoristas/${motoristaId}/cnh.pdf`,
        tipo_mime: 'application/pdf',
        tamanho_bytes: randInt(80_000, 400_000),
        usuario_id: donoId,
        data_validade: row.cnh_validade,
        criado_via: 'manual',
        criado_em: toISODateTime(cadastro),
      });
    }
  }

  // ---------- contas bancárias e centros de custo ----------
  push('contas_bancarias', {
    id: SIMULATION_CONTA_OPERACIONAL_ID, empresa_id: SIMULATION_EMPRESA_ID, nome: 'Conta Operacional',
    banco: 'Itaú', agencia: '1234', conta: '00012345-6', tipo: 'corrente', saldo_inicial: 180000, ativa: true,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(fundacao),
  });
  push('contas_bancarias', {
    id: SIMULATION_CONTA_RESERVA_ID, empresa_id: SIMULATION_EMPRESA_ID, nome: 'Reserva',
    banco: 'Nubank', agencia: '0001', conta: '00098765-4', tipo: 'poupanca', saldo_inicial: 420000, ativa: true,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(fundacao),
  });
  push('centros_custo', {
    id: SIMULATION_CENTRO_CUSTO_OPERACAO_ID, empresa_id: SIMULATION_EMPRESA_ID, nome: 'Operação de Frota',
    descricao: 'Receitas e despesas diretas de locação [SIMULAÇÃO]', ativo: true,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(fundacao),
  });
  push('centros_custo', {
    id: SIMULATION_CENTRO_CUSTO_MANUTENCAO_ID, empresa_id: SIMULATION_EMPRESA_ID, nome: 'Manutenção',
    descricao: 'Custos de manutenção preventiva e corretiva [SIMULAÇÃO]', ativo: true,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(fundacao),
  });
  push('centros_custo', {
    id: SIMULATION_CENTRO_CUSTO_ADMIN_ID, empresa_id: SIMULATION_EMPRESA_ID, nome: 'Administrativo',
    descricao: 'Seguros, IPVA e despesas administrativas [SIMULAÇÃO]', ativo: true,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(fundacao),
  });

  // ---------- contratos + financeiro derivado ----------
  const veiculosAlugaveis = veiculos.filter((v) => v.status === 'alugado');
  const motoristasAtivos = motoristas.filter((m) => m.status === 'ativo');
  const veiculosEncerradosOuDevolvidos = veiculos.filter((v) => v.status === 'encerrado' || v.status === 'devolvido' || v.status === 'venda');
  const motoristasInativosOuEncerrados = motoristas.filter((m) => m.status === 'inativo' || m.status === 'encerrado' || m.status === 'bloqueado');

  let mIdx = 0;
  const nextMotoristaAtivo = () => motoristasAtivos[mIdx++ % motoristasAtivos.length];

  function gerarLancamentosEPagamentosDoContrato(contrato: Row, veiculo: Row, ativo: boolean) {
    const inicio = new Date(contrato.data_inicio as string);
    const fimReal = contrato.data_fim_real ? new Date(contrato.data_fim_real as string) : hoje;
    let cursor = new Date(inicio);
    while (cursor <= fimReal && cursor <= hoje) {
      const lancamentoId = nextId('lan');
      const atrasado = ativo && rnd() < 0.08; // ~8% de aluguéis com atraso real, pra alertas/inadimplência fazerem sentido
      const dataPrevista = toISODate(cursor);
      const noPassado = cursor < addDays(hoje, -5);
      const statusPagamento = atrasado ? 'pendente' : noPassado ? 'pago' : 'pendente';
      push('lancamentos', {
        id: lancamentoId,
        empresa_id: SIMULATION_EMPRESA_ID,
        tipo: 'receita',
        status: statusPagamento === 'pago' ? 'confirmada' : 'prevista',
        descricao: `[SIMULAÇÃO] Aluguel mensal — ${veiculo.placa}`,
        valor: contrato.valor_periodico,
        categoria: 'aluguel',
        centro_custo_id: SIMULATION_CENTRO_CUSTO_OPERACAO_ID,
        contrato_id: contrato.id,
        veiculo_id: veiculo.id,
        motorista_id: contrato.motorista_id,
        data_prevista: dataPrevista,
        data_confirmacao: statusPagamento === 'pago' ? dataPrevista : null,
        criado_via: 'manual',
        observacoes: '[SIMULAÇÃO]',
        criado_em: toISODateTime(cursor),
        atualizado_em: toISODateTime(cursor),
      });
      push('pagamentos', {
        id: nextId('pag'),
        empresa_id: SIMULATION_EMPRESA_ID,
        lancamento_id: lancamentoId,
        conta_bancaria_id: SIMULATION_CONTA_OPERACIONAL_ID,
        status: statusPagamento,
        valor: contrato.valor_periodico,
        forma_pagamento: pick(['pix', 'boleto', 'cartao']),
        data_prevista: dataPrevista,
        data_pagamento: statusPagamento === 'pago' ? toISODate(addDays(cursor, randInt(0, 2))) : null,
        observacoes: '[SIMULAÇÃO]',
        criado_em: toISODateTime(cursor),
        atualizado_em: toISODateTime(cursor),
      });
      timeline('contrato', contrato.id as string, 'pagamento', `Aluguel de ${dataPrevista} — ${statusPagamento === 'pago' ? 'pago' : 'pendente'}`, cursor, donoId);
      timeline('veiculo', veiculo.id as string, 'checkin_mensal', `Quilometragem e carga verificadas — ${veiculo.placa}`, addDays(cursor, randInt(1, 5)), donoId);
      cursor = addMonths(cursor, 1);
    }
  }

  const contratos: Row[] = [];
  let contratosCount = 0;

  for (const veiculo of veiculosAlugaveis) {
    const motorista = nextMotoristaAtivo();
    if (!motorista) continue;
    contratosCount++;
    const inicio = addDays(new Date(veiculo.data_compra as string), randInt(3, 20));
    const status = contratosCount % 6 === 0 ? 'renovacao' : 'ativo';
    const contratoId = nextId('con');
    const row: Row = {
      id: contratoId,
      empresa_id: SIMULATION_EMPRESA_ID,
      veiculo_id: veiculo.id,
      motorista_id: motorista.id,
      status,
      data_inicio: toISODate(inicio),
      data_fim_prevista: status === 'renovacao' ? toISODate(addMonths(hoje, randInt(1, 3))) : null,
      data_fim_real: null,
      periodicidade: 'mensal',
      valor_periodico: randInt(2200, 7200),
      valor_caucao: randInt(1000, 3200),
      km_inicial: 0,
      km_final: null,
      carga_inicial_pct: 100,
      carga_final_pct: null,
      observacoes: status === 'renovacao' ? '[SIMULAÇÃO] em processo de renovação' : '[SIMULAÇÃO]',
      criado_em: toISODateTime(inicio),
      atualizado_em: toISODateTime(addDays(hoje, -randInt(0, 20))),
    };
    contratos.push(row);
    push('contratos', row);
    timeline('contrato', contratoId, 'criacao', `Contrato firmado — ${veiculo.placa} × ${motorista.nome_completo}`, inicio, donoId);
    timeline('contrato', contratoId, 'primeiro_aluguel', `Primeiro aluguel cobrado — ${veiculo.placa}`, addDays(inicio, 30), donoId);
    gerarLancamentosEPagamentosDoContrato(row, veiculo, true);
  }

  // contratos encerrados/cancelados — histórico do "há anos operando"
  let encerradosGerados = 0;
  for (const veiculo of veiculosEncerradosOuDevolvidos) {
    const motorista = pick(motoristasInativosOuEncerrados.length > 0 ? motoristasInativosOuEncerrados : motoristas);
    encerradosGerados++;
    const inicio = addDays(new Date(veiculo.data_compra as string), randInt(3, 20));
    const fim = addDays(hoje, -randInt(5, 90));
    const cancelado = encerradosGerados % 4 === 0;
    const contratoId = nextId('con');
    const row: Row = {
      id: contratoId,
      empresa_id: SIMULATION_EMPRESA_ID,
      veiculo_id: veiculo.id,
      motorista_id: motorista.id,
      status: cancelado ? 'cancelado' : 'encerrado',
      data_inicio: toISODate(inicio),
      data_fim_prevista: toISODate(fim),
      data_fim_real: cancelado ? null : toISODate(fim),
      periodicidade: 'mensal',
      valor_periodico: randInt(2200, 7200),
      valor_caucao: randInt(1000, 3200),
      km_inicial: 0,
      km_final: cancelado ? null : (veiculo.quilometragem as number),
      carga_inicial_pct: 100,
      carga_final_pct: cancelado ? null : randInt(15, 45),
      observacoes: cancelado ? '[SIMULAÇÃO] cancelado antes da entrega' : '[SIMULAÇÃO] encerrado normalmente',
      criado_em: toISODateTime(inicio),
      atualizado_em: toISODateTime(fim),
    };
    contratos.push(row);
    push('contratos', row);
    timeline('contrato', contratoId, 'criacao', `Contrato firmado — ${veiculo.placa} × ${motorista.nome_completo}`, inicio, donoId);
    if (!cancelado) {
      gerarLancamentosEPagamentosDoContrato(row, veiculo, false);
      timeline('contrato', contratoId, 'encerramento', `Contrato encerrado — devolução de ${veiculo.placa}`, fim, donoId);
    } else {
      timeline('contrato', contratoId, 'cancelamento', `Contrato cancelado antes da entrega — ${veiculo.placa}`, addDays(inicio, 1), donoId);
    }
  }

  // despesas fixas por veículo (seguro semestral, IPVA anual) — só nos alugados/disponíveis (frota ativa)
  for (const veiculo of veiculos.filter((v) => ['alugado', 'disponivel', 'reservado', 'manutencao'].includes(v.status as string))) {
    let cursorSeguro = new Date(veiculo.data_compra as string);
    while (cursorSeguro <= hoje) {
      const lancamentoId = nextId('lan');
      const pago = cursorSeguro < addDays(hoje, -5);
      push('lancamentos', {
        id: lancamentoId, empresa_id: SIMULATION_EMPRESA_ID, tipo: 'despesa', status: pago ? 'confirmada' : 'prevista',
        descricao: `[SIMULAÇÃO] Seguro semestral — ${veiculo.placa}`, valor: randInt(1100, 2200), categoria: 'seguro',
        centro_custo_id: SIMULATION_CENTRO_CUSTO_ADMIN_ID, contrato_id: null, veiculo_id: veiculo.id, motorista_id: null,
        data_prevista: toISODate(cursorSeguro), data_confirmacao: pago ? toISODate(cursorSeguro) : null,
        criado_via: 'manual', observacoes: '[SIMULAÇÃO]', criado_em: toISODateTime(cursorSeguro), atualizado_em: toISODateTime(cursorSeguro),
      });
      push('pagamentos', {
        id: nextId('pag'), empresa_id: SIMULATION_EMPRESA_ID, lancamento_id: lancamentoId, conta_bancaria_id: SIMULATION_CONTA_OPERACIONAL_ID,
        status: pago ? 'pago' : 'pendente', valor: randInt(1100, 2200), forma_pagamento: 'boleto',
        data_prevista: toISODate(cursorSeguro), data_pagamento: pago ? toISODate(addDays(cursorSeguro, 2)) : null,
        observacoes: '[SIMULAÇÃO]', criado_em: toISODateTime(cursorSeguro), atualizado_em: toISODateTime(cursorSeguro),
      });
      cursorSeguro = addMonths(cursorSeguro, 6);
    }
    let cursorIpva = new Date(veiculo.data_compra as string);
    cursorIpva.setMonth(0, 15);
    if (cursorIpva < new Date(veiculo.data_compra as string)) cursorIpva = addMonths(cursorIpva, 12);
    while (cursorIpva <= hoje) {
      const lancamentoId = nextId('lan');
      const pago = cursorIpva < addDays(hoje, -5);
      push('lancamentos', {
        id: lancamentoId, empresa_id: SIMULATION_EMPRESA_ID, tipo: 'despesa', status: pago ? 'confirmada' : 'prevista',
        descricao: `[SIMULAÇÃO] IPVA anual — ${veiculo.placa}`, valor: randInt(2200, 4800), categoria: 'ipva',
        centro_custo_id: SIMULATION_CENTRO_CUSTO_ADMIN_ID, contrato_id: null, veiculo_id: veiculo.id, motorista_id: null,
        data_prevista: toISODate(cursorIpva), data_confirmacao: pago ? toISODate(cursorIpva) : null,
        criado_via: 'manual', observacoes: '[SIMULAÇÃO]', criado_em: toISODateTime(cursorIpva), atualizado_em: toISODateTime(cursorIpva),
      });
      push('pagamentos', {
        id: nextId('pag'), empresa_id: SIMULATION_EMPRESA_ID, lancamento_id: lancamentoId, conta_bancaria_id: SIMULATION_CONTA_OPERACIONAL_ID,
        status: pago ? 'pago' : 'pendente', valor: randInt(2200, 4800), forma_pagamento: 'boleto',
        data_prevista: toISODate(cursorIpva), data_pagamento: pago ? toISODate(addDays(cursorIpva, 2)) : null,
        observacoes: '[SIMULAÇÃO]', criado_em: toISODateTime(cursorIpva), atualizado_em: toISODateTime(cursorIpva),
      });
      cursorIpva = addMonths(cursorIpva, 12);
    }
  }

  // ---------- manutenções (algumas geram lançamento de despesa, igual ao trigger real) ----------
  const oficinas = ['Oficina Elétrica BH', 'EV Center BH', 'Autorizada BH', 'GreenTech Serviços', 'ElectroCar Manutenção'];
  const veiculosParaManutencao = veiculos.filter((v) => v.status !== 'novo');
  for (let i = 0; i < 60; i++) {
    const veiculo = pick(veiculosParaManutencao);
    const realizada = rnd() < 0.82;
    const dataExec = realizada ? addDays(hoje, -randInt(3, 700)) : null;
    const manutencaoId = nextId('man');
    const custo = realizada ? randInt(280, 3400) : null;
    const row: Row = {
      id: manutencaoId,
      empresa_id: SIMULATION_EMPRESA_ID,
      veiculo_id: veiculo.id,
      tipo: pick(['preventiva', 'preventiva', 'corretiva']),
      descricao: `[SIMULAÇÃO] ${pick(['Revisão programada', 'Rodízio de pneus', 'Reparo em sensor', 'Troca de módulo de carregamento', 'Revisão pré-devolução', 'Alinhamento e balanceamento'])}`,
      oficina: pick(oficinas),
      km: realizada ? randInt(1000, 60000) : null,
      custo,
      data_execucao: dataExec ? toISODate(dataExec) : null,
      data_agendada: realizada ? null : toISODate(addDays(hoje, randInt(1, 45))),
      status_execucao: realizada ? 'realizada' : 'agendada',
      criado_por: donoId,
      criado_em: toISODateTime(dataExec ?? hoje),
      atualizado_em: toISODateTime(dataExec ?? hoje),
    };
    push('manutencoes', row);
    if (realizada) {
      timeline('veiculo', veiculo.id as string, 'manutencao', `${row.descricao} — ${row.oficina} (R$ ${(custo as number).toLocaleString('pt-BR')})`, dataExec as Date, donoId);
      if (custo && custo > 0) {
        const lancamentoId = nextId('lan');
        push('lancamentos', {
          id: lancamentoId, empresa_id: SIMULATION_EMPRESA_ID, tipo: 'despesa', status: 'confirmada',
          descricao: `[SIMULAÇÃO] Manutenção: ${row.descricao} — ${veiculo.placa}`, valor: custo, categoria: 'manutencao',
          centro_custo_id: SIMULATION_CENTRO_CUSTO_MANUTENCAO_ID, contrato_id: null, veiculo_id: veiculo.id, motorista_id: null,
          data_prevista: row.data_execucao, data_confirmacao: row.data_execucao, criado_via: 'automacao',
          observacoes: '[SIMULAÇÃO] gerado automaticamente a partir da manutenção', manutencao_id: manutencaoId,
          criado_em: toISODateTime(dataExec as Date), atualizado_em: toISODateTime(dataExec as Date),
        });
        push('pagamentos', {
          id: nextId('pag'), empresa_id: SIMULATION_EMPRESA_ID, lancamento_id: lancamentoId, conta_bancaria_id: SIMULATION_CONTA_OPERACIONAL_ID,
          status: 'pago', valor: custo, forma_pagamento: 'boleto', data_prevista: row.data_execucao,
          data_pagamento: row.data_execucao, observacoes: '[SIMULAÇÃO]', criado_em: toISODateTime(dataExec as Date), atualizado_em: toISODateTime(dataExec as Date),
        });
      }
    }
  }

  // ---------- multas ----------
  const orgaos = ['DETRAN-MG', 'DER-MG', 'PRF'];
  const infracoes = ['Excesso de velocidade até 20%', 'Estacionamento em local proibido', 'Avanço de sinal vermelho', 'Uso de celular ao dirigir', 'Faixa exclusiva de ônibus', 'Excesso de velocidade acima de 50%'];
  const contratosPorVeiculo = new Map<string, Row>();
  contratos.forEach((c) => contratosPorVeiculo.set(c.veiculo_id as string, c));
  for (let i = 0; i < 26; i++) {
    const veiculo = pick(veiculos.filter((v) => ['alugado', 'devolvido', 'encerrado'].includes(v.status as string)));
    const contrato = contratosPorVeiculo.get(veiculo.id as string);
    const dataInfracao = addDays(hoje, -randInt(5, 500));
    push('multas', {
      id: nextId('mul'),
      empresa_id: SIMULATION_EMPRESA_ID,
      veiculo_id: veiculo.id,
      motorista_id: contrato?.motorista_id ?? null,
      contrato_id: contrato?.id ?? null,
      orgao_autuador: pick(orgaos),
      descricao: `[SIMULAÇÃO] ${pick(infracoes)}`,
      data_infracao: toISODate(dataInfracao),
      data_vencimento: toISODate(addDays(dataInfracao, 60)),
      valor: randInt(130, 890) + 0.16,
      pontos: pick([3, 4, 5, 7]),
      status: pick(['paga', 'paga', 'pendente', 'pendente', 'recorrida']),
      criado_por: donoId,
      criado_em: toISODateTime(dataInfracao),
      atualizado_em: toISODateTime(dataInfracao),
    });
    timeline('veiculo', veiculo.id as string, 'multa', `Multa registrada — ${pick(infracoes)}`, dataInfracao, donoId);
  }

  // ---------- checklists + itens ----------
  const itensPadrao = [
    'Lataria sem avarias', 'Pneus em condição adequada', 'Nível de carga da bateria conferido',
    'Documentação no veículo', 'Cabo de recarga presente',
  ];
  let checklistsGerados = 0;
  for (const contrato of contratos) {
    if (checklistsGerados >= 34) break;
    const veiculo = veiculos.find((v) => v.id === contrato.veiculo_id);
    if (!veiculo) continue;
    const tituloEntrega = `[SIMULAÇÃO] Checklist de entrega — ${veiculo.placa}`;
    const concluidoEntrega = addDays(new Date(contrato.data_inicio as string), 0);
    const checklistEntregaId = nextId('chk');
    push('checklists', {
      id: checklistEntregaId, empresa_id: SIMULATION_EMPRESA_ID, titulo: tituloEntrega, status: 'concluido',
      entidade_tipo: 'veiculo', entidade_id: veiculo.id, responsavel_id: pick(responsavelIds),
      concluido_em: toISODateTime(concluidoEntrega), concluido_por: donoId,
      criado_em: toISODateTime(concluidoEntrega), atualizado_em: toISODateTime(concluidoEntrega),
    });
    itensPadrao.forEach((descricao, ordem) => {
      push('checklist_itens', {
        id: nextId('chi'), checklist_id: checklistEntregaId, ordem, descricao, obrigatorio: true,
        resposta: true, respondido_por: donoId, respondido_em: toISODateTime(concluidoEntrega),
        criado_em: toISODateTime(concluidoEntrega), atualizado_em: toISODateTime(concluidoEntrega),
      });
    });
    checklistsGerados++;

    if ((contrato.status === 'encerrado' || contrato.status === 'cancelado') && checklistsGerados < 34) {
      const dataDevolucao = contrato.data_fim_real ? new Date(contrato.data_fim_real as string) : hoje;
      const checklistDevolucaoId = nextId('chk');
      push('checklists', {
        id: checklistDevolucaoId, empresa_id: SIMULATION_EMPRESA_ID, titulo: `[SIMULAÇÃO] Checklist de devolução — ${veiculo.placa}`,
        status: 'concluido', entidade_tipo: 'veiculo', entidade_id: veiculo.id, responsavel_id: pick(responsavelIds),
        concluido_em: toISODateTime(dataDevolucao), concluido_por: donoId,
        criado_em: toISODateTime(dataDevolucao), atualizado_em: toISODateTime(dataDevolucao),
      });
      itensPadrao.forEach((descricao, ordem) => {
        push('checklist_itens', {
          id: nextId('chi'), checklist_id: checklistDevolucaoId, ordem, descricao, obrigatorio: true,
          resposta: rnd() > 0.15, respondido_por: donoId, respondido_em: toISODateTime(dataDevolucao),
          criado_em: toISODateTime(dataDevolucao), atualizado_em: toISODateTime(dataDevolucao),
        });
      });
      checklistsGerados++;
    }
  }
  // alguns checklists ainda abertos (frota em preparação) — realismo de "pendências" no Command Center
  for (const veiculo of veiculos.filter((v) => ['preparacao', 'comprado', 'novo'].includes(v.status as string))) {
    const checklistId = nextId('chk');
    push('checklists', {
      id: checklistId, empresa_id: SIMULATION_EMPRESA_ID, titulo: `[SIMULAÇÃO] Checklist técnico de entrada — ${veiculo.placa}`,
      status: 'aberto', entidade_tipo: 'veiculo', entidade_id: veiculo.id, responsavel_id: pick(responsavelIds),
      concluido_em: null, concluido_por: null,
      criado_em: toISODateTime(addDays(hoje, -randInt(1, 10))), atualizado_em: toISODateTime(addDays(hoje, -randInt(1, 10))),
    });
    itensPadrao.forEach((descricao, ordem) => {
      push('checklist_itens', {
        id: nextId('chi'), checklist_id: checklistId, ordem, descricao, obrigatorio: true,
        resposta: null, respondido_por: null, respondido_em: null,
        criado_em: toISODateTime(hoje), atualizado_em: toISODateTime(hoje),
      });
    });
  }

  // ---------- metas ----------
  push('metas', {
    id: nextId('met'), empresa_id: SIMULATION_EMPRESA_ID, titulo: '[SIMULAÇÃO] Receita mensal de locação',
    descricao: 'Meta de receita recorrente mensal com aluguéis ativos', unidade: 'moeda', valor_alvo: 95000,
    valor_atual: 78400, data_alvo: toISODate(addMonths(hoje, 6)), status: 'em_andamento', criado_por: donoId,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(hoje),
  });
  push('metas', {
    id: nextId('met'), empresa_id: SIMULATION_EMPRESA_ID, titulo: '[SIMULAÇÃO] Taxa de utilização da frota',
    descricao: '% da frota alugada versus frota total', unidade: 'percentual', valor_alvo: 85, valor_atual: 62,
    data_alvo: toISODate(addMonths(hoje, 6)), status: 'em_andamento', criado_por: donoId,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(hoje),
  });
  push('metas', {
    id: nextId('met'), empresa_id: SIMULATION_EMPRESA_ID, titulo: '[SIMULAÇÃO] Frota ativa',
    descricao: 'Número de veículos operacionais na frota', unidade: 'numero', valor_alvo: 60, valor_atual: TOTAL_VEICULOS,
    data_alvo: toISODate(addMonths(hoje, 12)), status: 'em_andamento', criado_por: donoId,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(hoje),
  });
  push('metas', {
    id: nextId('met'), empresa_id: SIMULATION_EMPRESA_ID, titulo: '[SIMULAÇÃO] Health Score médio da frota',
    descricao: 'Média do Health Score de todos os veículos ativos', unidade: 'percentual', valor_alvo: 90, valor_atual: 81,
    data_alvo: toISODate(addMonths(hoje, 3)), status: 'em_andamento', criado_por: donoId,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(hoje),
  });
  push('metas', {
    id: nextId('met'), empresa_id: SIMULATION_EMPRESA_ID, titulo: '[SIMULAÇÃO] Inadimplência sob controle',
    descricao: 'Manter pagamentos em atraso abaixo de 5% do total previsto', unidade: 'percentual', valor_alvo: 5, valor_atual: 8,
    data_alvo: toISODate(addMonths(hoje, 2)), status: 'em_andamento', criado_por: donoId,
    criado_em: toISODateTime(fundacao), atualizado_em: toISODateTime(hoje),
  });

  // ---------- tags, comentários, favoritos ----------
  const veiculosDestaque = veiculos.slice(0, 6);
  for (const v of veiculosDestaque) {
    push('tags', { id: nextId('tag'), empresa_id: SIMULATION_EMPRESA_ID, entidade_tipo: 'veiculo', entidade_id: v.id, tag: pick(['premium', 'alta demanda', 'baixo custo de manutenção', 'top performer']), usuario_id: donoId, criado_em: toISODateTime(hoje) });
  }
  for (const m of motoristas.slice(0, 5)) {
    push('tags', { id: nextId('tag'), empresa_id: SIMULATION_EMPRESA_ID, entidade_tipo: 'motorista', entidade_id: m.id, tag: pick(['top motorista', 'pontual', 'novo']), usuario_id: donoId, criado_em: toISODateTime(hoje) });
  }
  const comentariosTexto = [
    'Aguardando peça, previsão de retorno em 5 dias.',
    'Cliente satisfeito, possível renovação antecipada.',
    'Verificar histórico de multas antes de aprovar novo contrato.',
    'Veículo com ótima aceitação — considerar ampliar frota deste modelo.',
  ];
  for (let i = 0; i < 18; i++) {
    const entidadeTipo = pick(['veiculo', 'motorista', 'contrato']);
    const pool = entidadeTipo === 'veiculo' ? veiculos : entidadeTipo === 'motorista' ? motoristas : contratos;
    const alvo = pick(pool);
    push('comentarios', {
      id: nextId('com'), empresa_id: SIMULATION_EMPRESA_ID, entidade_tipo: entidadeTipo, entidade_id: alvo.id,
      texto: `[SIMULAÇÃO] ${pick(comentariosTexto)}`, usuario_id: pick(responsavelIds),
      criado_em: toISODateTime(addDays(hoje, -randInt(0, 60))), atualizado_em: toISODateTime(addDays(hoje, -randInt(0, 60))),
    });
  }
  for (const v of veiculosDestaque.slice(0, 4)) {
    push('favoritos', { id: nextId('fav'), empresa_id: SIMULATION_EMPRESA_ID, entidade_tipo: 'veiculo', entidade_id: v.id, usuario_id: donoId, criado_em: toISODateTime(hoje) });
  }

  // ---------- ações operacionais ----------
  const ACOES_BASE: { titulo: string; tipo: string; prioridade: string }[] = [
    { titulo: '[SIMULAÇÃO] Renovar seguro vencendo', tipo: 'documento', prioridade: 'alta' },
    { titulo: '[SIMULAÇÃO] Agendar revisão preventiva', tipo: 'manutencao', prioridade: 'media' },
    { titulo: '[SIMULAÇÃO] Cobrar aluguel em atraso', tipo: 'financeiro', prioridade: 'critica' },
    { titulo: '[SIMULAÇÃO] Validar CNH próxima do vencimento', tipo: 'documento', prioridade: 'alta' },
    { titulo: '[SIMULAÇÃO] Confirmar renovação de contrato', tipo: 'contrato', prioridade: 'media' },
    { titulo: '[SIMULAÇÃO] Checklist de devolução pendente', tipo: 'checklist', prioridade: 'baixa' },
  ];
  for (let i = 0; i < 16; i++) {
    const base = pick(ACOES_BASE);
    const concluida = rnd() < 0.4;
    const entidadeTipo = pick(['veiculo', 'motorista', 'contrato']);
    const pool = entidadeTipo === 'veiculo' ? veiculos : entidadeTipo === 'motorista' ? motoristas : contratos;
    const alvo = pick(pool);
    push('acoes_operacionais', {
      id: nextId('aco'), empresa_id: SIMULATION_EMPRESA_ID, titulo: base.titulo, descricao: `${base.titulo} — ${entidadeTipo} vinculado`,
      tipo: base.tipo, status: concluida ? 'concluida' : pick(['pendente', 'pendente', 'em_andamento']),
      prioridade: base.prioridade, origem: 'sistema', responsavel_id: pick(responsavelIds),
      prazo: toISODate(addDays(hoje, randInt(-5, 20))), entidade_tipo: entidadeTipo, entidade_id: alvo.id,
      gerado_por: 'simulacao', concluida_em: concluida ? toISODateTime(addDays(hoje, -randInt(0, 10))) : null,
      concluida_por: concluida ? donoId : null,
      criado_em: toISODateTime(addDays(hoje, -randInt(1, 40))), atualizado_em: toISODateTime(hoje),
    });
  }

  // ---------- reforço de timeline ----------
  // Os blocos acima já registram os marcos de ciclo de vida (compra, cadastro, contrato,
  // venda, multa, manutenção...). O pedido explícito da Missão 7 é "milhares de eventos" —
  // uma operação real de verdade também acumula um evento por movimentação financeira
  // (lançamento lançado, pagamento confirmado) e por item de checklist respondido. Passe
  // final sobre o que já foi gerado, em vez de espalhar mais chamadas de timeline() pelos
  // loops acima — mais fácil de auditar que o volume bate com o dado real gerado.
  const checklistPorId = new Map<string, Row>();
  tables.checklists.forEach((c) => checklistPorId.set(c.id as string, c));
  const lancamentoPorId = new Map<string, Row>();
  tables.lancamentos.forEach((l) => lancamentoPorId.set(l.id as string, l));

  for (const l of tables.lancamentos) {
    if (!l.veiculo_id) continue;
    timeline('veiculo', l.veiculo_id as string, l.tipo === 'receita' ? 'receita_lancada' : 'despesa_lancada',
      `${l.tipo === 'receita' ? 'Receita' : 'Despesa'} lançada: ${l.descricao} (R$ ${(l.valor as number).toLocaleString('pt-BR')})`,
      new Date(l.criado_em as string), donoId);
  }
  for (const p of tables.pagamentos) {
    if (p.status !== 'pago') continue;
    const lancamento = lancamentoPorId.get(p.lancamento_id as string);
    if (!lancamento?.veiculo_id) continue;
    timeline('veiculo', lancamento.veiculo_id as string, 'pagamento_confirmado',
      `Pagamento confirmado — R$ ${(p.valor as number).toLocaleString('pt-BR')} via ${p.forma_pagamento}`,
      new Date(p.data_pagamento as string), donoId);
  }
  for (const ci of tables.checklist_itens) {
    if (ci.resposta == null || !ci.respondido_em) continue;
    const checklist = checklistPorId.get(ci.checklist_id as string);
    if (!checklist) continue;
    timeline(checklist.entidade_tipo as string, checklist.entidade_id as string, 'checklist_item',
      `Item verificado (${checklist.titulo}): ${ci.descricao}`, new Date(ci.respondido_em as string), donoId);
  }
  for (const a of tables.arquivos) {
    timeline(a.entidade_tipo as string, a.entidade_id as string, 'documento_anexado',
      `Documento anexado: ${a.nome_arquivo}`, new Date(a.criado_em as string), donoId);
  }

  return tables;
}
