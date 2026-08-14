import { supabase } from '@/shared/lib/supabase';
import type { ContratoPeriodicidade, ContratoStatus } from '@/features/contracts/types';
import type { VeiculoCategoria, VeiculoStatus } from '@/features/frota/types';

// Épico 11 — App do Motorista. Nenhum filtro `.eq('motorista_id', ...)` aqui de propósito:
// a migration 0034 já garante, via RLS ("contratos: motorista ve os proprios"), que um
// usuário role='motorista' só recebe as próprias linhas.
//
// Fase 1 (2026-08-14, fix R4 da auditoria): PROIBIDO select('*') no portal. RLS protege
// LINHAS, não COLUNAS — o select('*, veiculo:veiculos(*)') antigo entregava ao celular do
// motorista valor_compra, valor_financiado, taxa de juros, banco, chassi, renavam, caução e
// observações internas, mesmo que a tela não mostrasse nada disso. Toda query do portal
// seleciona colunas EXPLÍCITAS, e o tipo espelha exatamente o que trafega — princípio de
// menor privilégio. Ao adicionar um campo aqui, pergunte antes: "o motorista PRECISA disso?"
export type MeuContratoVeiculo = {
  id: string;
  placa: string;
  cor: string | null;
  categoria: VeiculoCategoria;
  status: VeiculoStatus;
  quilometragem: number;
  ano_fabricacao: number;
  ano_modelo: number;
  autonomia_km: number | null;
  capacidade_bateria_kwh: number | null;
  marca: { id: string; nome: string } | null;
  modelo: { id: string; nome: string } | null;
};

export type MeuContrato = {
  id: string;
  status: ContratoStatus;
  periodicidade: ContratoPeriodicidade;
  valor_periodico: number;
  dia_vencimento: number | null;
  data_inicio: string;
  data_fim_prevista: string | null;
  data_fim_real: string | null;
  km_inicial: number | null;
  km_final: number | null;
  criado_em: string;
  veiculo: MeuContratoVeiculo;
};

const COLUNAS_MEU_CONTRATO = [
  'id',
  'status',
  'periodicidade',
  'valor_periodico',
  'dia_vencimento',
  'data_inicio',
  'data_fim_prevista',
  'data_fim_real',
  'km_inicial',
  'km_final',
  'criado_em',
  // Excluídos de propósito (não necessários ao motorista): empresa_id, veiculo_id,
  // motorista_id, valor_caucao, carga_inicial_pct, carga_final_pct, observacoes (notas
  // internas), data_reajuste, indice_reajuste, forma_pagamento, tipo_garantia,
  // percentual_multa_atraso, percentual_juros_atraso, atualizado_em.
  `veiculo:veiculos(
    id, placa, cor, categoria, status, quilometragem, ano_fabricacao, ano_modelo,
    autonomia_km, capacidade_bateria_kwh,
    marca:marcas(id, nome), modelo:modelos(id, nome)
  )`,
  // Excluídos do veículo: chassi, renavam, tipo_aquisicao, data_compra, valor_compra,
  // valor_fipe, valor_mercado, valor_residual_estimado, fornecedor, banco, valor_entrada,
  // valor_financiado, taxa_juros_am_pct, prazo_financiamento_meses, sistema_amortizacao,
  // comprador, valor_venda, data_venda, observacoes — dado financeiro/administrativo da
  // empresa, nunca do portal.
].join(', ');

export async function listMeusContratos(): Promise<MeuContrato[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select(COLUNAS_MEU_CONTRATO)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as MeuContrato[];
}
