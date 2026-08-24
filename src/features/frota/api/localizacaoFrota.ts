import { supabase } from '@/shared/lib/supabase';
import { lerTolerante } from '@/shared/lib/schemaGuard';

// FASE 20 (2ª passada) — Módulos 9/10/11/13/24: dados para o Centro de Inteligência da Frota
// (lado staff). RLS já isola por empresa em cada tabela (current_empresa_id()); este arquivo
// busca e combina veículos/contratos/motoristas em memória (sem RPC/SQL cru), mas a "última
// posição por veículo" agora vem da VIEW `motorista_localizacoes_atual` (migration 0052 —
// DISTINCT ON, security_invoker=true), não mais de um dedup em memória sobre as últimas N
// capturas cruas. Colunas sempre explícitas (Módulo 24/G — "nenhum select *"), nunca
// `select('*')`. Reusa `lerTolerante`/schemaGuard (Módulo 28/L) — mesmo padrão do app do
// motorista, movido para shared/lib nesta passada justamente para ser reusável pelos dois apps.

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

const MODULO_LOCALIZACAO_FROTA = 'motorista_localizacoes_atual';

/**
 * Última posição conhecida de CADA veículo (uma linha por veiculo_id) — via a view
 * `motorista_localizacoes_atual` (migration 0052), não mais buscando N linhas cruas e
 * deduplicando em memória. Corrige um risco real da versão anterior: numa frota grande, as
 * últimas 500 CAPTURAS podiam vir todas de poucos veículos muito ativos, deixando de fora a
 * última posição de um veículo que só capturou há mais tempo (o card "SEM LOCALIZAÇÃO" mentiria
 * pra esse veículo). A view faz DISTINCT ON no banco — sempre uma linha por veículo, sempre a
 * mais recente, não importa o tamanho da frota.
 */
async function listLocalizacoesRecentes(): Promise<LocalizacaoRecente[]> {
  return lerTolerante(
    MODULO_LOCALIZACAO_FROTA,
    async () => {
      const { data, error } = await supabase
        .from('motorista_localizacoes_atual')
        .select('motorista_id, veiculo_id, latitude, longitude, accuracy_m, timestamp_localizacao');
      if (error) throw error;
      return data as LocalizacaoRecente[];
    },
    [],
  );
}

export type PontoHistorico = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  timestamp_localizacao: string;
};

// Módulo 24/12 (2ª passada): a tela NUNCA carrega o histórico inteiro de cara — só a última
// posição (acima). Histórico é consulta SEPARADA, chamada só quando o staff clica "Ver
// histórico" de um veículo específico (nunca no mount do Centro de Inteligência). Limite
// defensivo: 200 pontos mais recentes — o suficiente pra qualquer leitura visual de percurso
// recente sem devolver um histórico ilimitado numa única resposta.
const LIMITE_HISTORICO_POR_VEICULO = 200;

/** Histórico de localizações de UM veículo, sob demanda (Módulo 12/24 — nunca eager). */
export async function getHistoricoLocalizacoes(veiculoId: string): Promise<PontoHistorico[]> {
  return lerTolerante(
    'motorista_localizacoes',
    async () => {
      const { data, error } = await supabase
        .from('motorista_localizacoes')
        .select('id, latitude, longitude, accuracy_m, timestamp_localizacao')
        .eq('veiculo_id', veiculoId)
        .order('timestamp_localizacao', { ascending: false })
        .limit(LIMITE_HISTORICO_POR_VEICULO);
      if (error) throw error;
      return data as PontoHistorico[];
    },
    [],
  );
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
