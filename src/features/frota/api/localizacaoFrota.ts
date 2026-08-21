import { supabase } from '@/shared/lib/supabase';

// FASE 20 — Módulos 9/10/13: dados para o Centro de Inteligência da Frota (lado staff). RLS já
// isola por empresa em cada uma das 3 tabelas (current_empresa_id()); este arquivo só busca e
// combina em memória — sem RPC/SQL cru, sem view nova (auditoria, seção 4). Colunas sempre
// explícitas (Módulo 24 — "nenhum select *"), nunca `select('*')`.

export type VeiculoFrota = {
  id: string;
  placa: string;
  status: string;
  marca: string | null;
  modelo: string | null;
};

async function listVeiculosDaFrota(): Promise<VeiculoFrota[]> {
  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, status, marca:marcas(nome), modelo:modelos(nome)')
    .order('placa', { ascending: true });
  if (error) throw error;
  return (data as unknown as Array<{ id: string; placa: string; status: string; marca: { nome: string } | null; modelo: { nome: string } | null }>).map((v) => ({
    id: v.id,
    placa: v.placa,
    status: v.status,
    marca: v.marca?.nome ?? null,
    modelo: v.modelo?.nome ?? null,
  }));
}

type ContratoAtivoResumo = { id: string; veiculo_id: string; motorista_id: string };

async function listContratosAtivosDaFrota(): Promise<ContratoAtivoResumo[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select('id, veiculo_id, motorista_id')
    .eq('status', 'ativo');
  if (error) throw error;
  return data as ContratoAtivoResumo[];
}

type MotoristaResumo = { id: string; nome_completo: string };

async function listMotoristasDaFrota(): Promise<MotoristaResumo[]> {
  const { data, error } = await supabase.from('motoristas').select('id, nome_completo');
  if (error) throw error;
  return data as MotoristaResumo[];
}

export type LocalizacaoRecente = {
  motorista_id: string;
  veiculo_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  timestamp_localizacao: string;
};

// Limite de linhas: o suficiente pra cobrir a última captura de cada veículo ativo de uma
// empresa de porte razoável sem depender de DISTINCT ON via RPC (auditoria, seção 4/9-10).
// Se uma empresa tiver uma frota realmente grande a ponto de estourar isso, é sinal de que vale
// a pena revisitar a decisão de não criar RPC — não inventado silenciosamente aqui.
const LIMITE_LOCALIZACOES_RECENTES = 500;

async function listLocalizacoesRecentes(): Promise<LocalizacaoRecente[]> {
  const { data, error } = await supabase
    .from('motorista_localizacoes')
    .select('motorista_id, veiculo_id, latitude, longitude, accuracy_m, timestamp_localizacao')
    .order('timestamp_localizacao', { ascending: false })
    .limit(LIMITE_LOCALIZACOES_RECENTES);
  if (error) {
    // Schema pode ainda não existir neste ambiente (migration 0051 sem autorização de produção
    // ainda) — mesmo padrão de honestidade de schemaGuard.ts, tratado aqui porque este arquivo é
    // do lado staff (schemaGuard.ts vive em motorista-app/api, não importado daqui de propósito
    // — evita acoplar os dois apps por uma função de 3 linhas).
    const code = (error as { code?: string }).code;
    if (code === 'PGRST205' || code === '42P01') return [];
    throw error;
  }
  return data as LocalizacaoRecente[];
}

export type VeiculoFrotaComLocalizacao = VeiculoFrota & {
  motoristaId: string | null;
  motoristaNome: string | null;
  contratoId: string | null;
  ultimaLocalizacao: { latitude: number; longitude: number; accuracyM: number | null; timestampMs: number } | null;
};

/**
 * Combina veículos + contrato ativo + motorista + última localização conhecida (a mais recente
 * primeiro por `veiculo_id`, via dedup em memória — a query já vem ordenada por
 * `timestamp_localizacao desc`, então o primeiro encontro por veículo já é o mais recente).
 */
export async function listFrotaComLocalizacao(): Promise<VeiculoFrotaComLocalizacao[]> {
  const [veiculos, contratos, motoristas, localizacoes] = await Promise.all([
    listVeiculosDaFrota(),
    listContratosAtivosDaFrota(),
    listMotoristasDaFrota(),
    listLocalizacoesRecentes(),
  ]);

  const contratoPorVeiculo = new Map(contratos.map((c) => [c.veiculo_id, c]));
  const nomePorMotorista = new Map(motoristas.map((m) => [m.id, m.nome_completo]));
  const localizacaoPorVeiculo = new Map<string, LocalizacaoRecente>();
  for (const loc of localizacoes) {
    if (!localizacaoPorVeiculo.has(loc.veiculo_id)) localizacaoPorVeiculo.set(loc.veiculo_id, loc);
  }

  return veiculos.map((v) => {
    const contrato = contratoPorVeiculo.get(v.id) ?? null;
    const loc = localizacaoPorVeiculo.get(v.id) ?? null;
    return {
      ...v,
      motoristaId: contrato?.motorista_id ?? null,
      motoristaNome: contrato ? (nomePorMotorista.get(contrato.motorista_id) ?? null) : null,
      contratoId: contrato?.id ?? null,
      ultimaLocalizacao: loc
        ? { latitude: loc.latitude, longitude: loc.longitude, accuracyM: loc.accuracy_m, timestampMs: new Date(loc.timestamp_localizacao).getTime() }
        : null,
    };
  });
}
