// Tipos do módulo Veículos — espelha supabase/migrations/0003_modulo_veiculos.sql
// e a State Machine documentada em CORE_CONCEPTS.md, seção 2.

export type VeiculoStatus =
  | 'novo'
  | 'comprado'
  | 'preparacao'
  | 'disponivel'
  | 'reservado'
  | 'alugado'
  | 'devolvido'
  | 'manutencao'
  | 'venda'
  | 'encerrado';

export type VeiculoCategoria =
  | 'hatch'
  | 'sedan'
  | 'suv'
  | 'pickup'
  | 'van'
  | 'moto'
  | 'onibus'
  | 'caminhao'
  | 'outro';

export type TipoAquisicao = 'compra_direta' | 'financiamento' | 'consorcio' | 'leasing';

export type Marca = {
  id: string;
  nome: string;
  criado_em: string;
};

export type Modelo = {
  id: string;
  marca_id: string;
  nome: string;
  criado_em: string;
};

export type Veiculo = {
  id: string;
  empresa_id: string;
  marca_id: string;
  modelo_id: string;
  ano_fabricacao: number;
  ano_modelo: number;
  chassi: string;
  renavam: string;
  placa: string;
  cor: string | null;
  categoria: VeiculoCategoria;
  tipo_aquisicao: TipoAquisicao;
  status: VeiculoStatus;
  quilometragem: number;
  autonomia_km: number | null;
  capacidade_bateria_kwh: number | null;
  data_compra: string | null;
  valor_compra: number | null;
  valor_fipe: number | null;
  valor_mercado: number | null;
  valor_residual_estimado: number | null;
  observacoes: string | null;
  // Dado real da venda — Missão 4 (fecha DEC-044). Antes só existia a transição de status
  // para 'venda', sem capturar comprador/valor/data; "venda" ficava indistinguível de
  // qualquer outra baixa de veículo no histórico.
  comprador: string | null;
  valor_venda: number | null;
  data_venda: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type VeiculoComRelacoes = Veiculo & { marca: Marca; modelo: Modelo };

export const VEICULO_STATUS_LABEL: Record<VeiculoStatus, string> = {
  novo: 'Novo',
  comprado: 'Comprado',
  preparacao: 'Em preparação',
  disponivel: 'Disponível',
  reservado: 'Reservado',
  alugado: 'Alugado',
  devolvido: 'Devolvido',
  manutencao: 'Em manutenção',
  venda: 'Em venda',
  encerrado: 'Encerrado',
};

// Espelha o diagrama de CORE_CONCEPTS.md seção 2: alugado só a partir de reservado/disponível
// (nunca direto de manutenção); venda e encerrado são terminais.
export const VEICULO_STATUS_TRANSITIONS: Record<VeiculoStatus, VeiculoStatus[]> = {
  novo: ['comprado'],
  comprado: ['preparacao'],
  preparacao: ['disponivel'],
  disponivel: ['reservado', 'alugado', 'manutencao', 'venda'],
  // Achado da Fase 9 (Missão 5, auditoria geral): 'disponivel' removido daqui — o banco
  // (fn_validar_transicao_veiculo, migration 0008) só aceita reservado→alugado; a UI oferecia
  // "Mover para Disponível" a partir de Reservado e a transição sempre falhava com erro
  // técnico do Postgres. O gap real (reserva cancelada precisar voltar a 'disponivel') já
  // estava documentado na própria migration como pendência — corrigir o banco exige decidir o
  // que acontece com um Contrato vinculado à reserva cancelada, fora do escopo desta correção
  // pontual de UI/banco desalinhados.
  reservado: ['alugado'],
  alugado: ['devolvido'],
  devolvido: ['manutencao', 'disponivel'],
  manutencao: ['disponivel'],
  venda: ['encerrado'],
  encerrado: [],
};

export const VEICULO_STATUS_COLOR: Record<VeiculoStatus, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'> = {
  novo: 'secondary',
  comprado: 'secondary',
  preparacao: 'warning',
  disponivel: 'success',
  reservado: 'info',
  alugado: 'info',
  devolvido: 'warning',
  manutencao: 'destructive',
  venda: 'default',
  encerrado: 'secondary',
};

export const VEICULO_CATEGORIA_LABEL: Record<VeiculoCategoria, string> = {
  hatch: 'Hatch',
  sedan: 'Sedan',
  suv: 'SUV',
  pickup: 'Pickup',
  van: 'Van',
  moto: 'Moto',
  onibus: 'Ônibus',
  caminhao: 'Caminhão',
  outro: 'Outro',
};

export const TIPO_AQUISICAO_LABEL: Record<TipoAquisicao, string> = {
  compra_direta: 'Compra direta',
  financiamento: 'Financiamento',
  consorcio: 'Consórcio',
  leasing: 'Leasing',
};
