// ===========================================================================
// FASE 20 — MÓDULOS 9/11: CENTRO DE INTELIGÊNCIA DA FROTA (motor puro)
// Classifica o FRESCOR de uma localização (Módulo 11 — nunca representa tudo como "ponto
// normal") e agrega o resumo da frota (Módulo 9 — cards). Zero rede, zero `Date.now()` dentro
// da função (injetado pelo chamador, mesma disciplina de `presencaMotorista`/`classificarAmostra`).
// ===========================================================================

export type EstadoFrescorLocalizacao =
  | 'LOCALIZACAO_ATUAL'
  | 'LOCALIZACAO_RECENTE'
  | 'SEM_ATUALIZACAO'
  | 'SEM_LOCALIZACAO';

/** Janelas alinhadas de propósito com `JANELAS_PRESENCA_PADRAO` (Fase 19) — mesma ideia de
 *  "evidência recente" aplicada a uma captura de localização em vez de um heartbeat de página. */
export type JanelasFrescor = { atualMs: number; recenteMs: number };
export const JANELAS_FRESCOR_PADRAO: JanelasFrescor = {
  atualMs: 2 * 60 * 1000,
  recenteMs: 15 * 60 * 1000,
};

export function frescorLocalizacao(
  timestampMs: number | null,
  agoraMs: number,
  janelas: JanelasFrescor = JANELAS_FRESCOR_PADRAO,
): EstadoFrescorLocalizacao {
  if (timestampMs == null || !Number.isFinite(timestampMs)) return 'SEM_LOCALIZACAO';
  const idade = agoraMs - timestampMs;
  if (!Number.isFinite(idade) || idade < 0) return 'SEM_LOCALIZACAO'; // timestamp "do futuro" nunca é tratado como válido
  if (idade <= janelas.atualMs) return 'LOCALIZACAO_ATUAL';
  if (idade <= janelas.recenteMs) return 'LOCALIZACAO_RECENTE';
  return 'SEM_ATUALIZACAO';
}

export type ItemFrotaComLocalizacao = {
  veiculoId: string;
  placa: string;
  statusVeiculo: string;
  motoristaId: string | null;
  motoristaNome: string | null;
  contratoId: string | null;
  ultimaLocalizacao: { latitude: number; longitude: number; accuracyM: number | null; timestampMs: number } | null;
};

export type ResumoFrota = {
  totalVeiculos: number;
  /** ATUAL + RECENTE — "tem localização utilizável agora", mesmo que não seja o segundo exato. */
  localizacaoAtiva: number;
  semAtualizacao: number;
  semLocalizacao: number;
};

/** Módulo 9 — os 4 cards do Centro de Inteligência da Frota. Nunca soma além de
 *  `totalVeiculos` (cada veículo cai em exatamente uma categoria). */
export function resumoFrota(itens: ItemFrotaComLocalizacao[], agoraMs: number): ResumoFrota {
  let localizacaoAtiva = 0;
  let semAtualizacao = 0;
  let semLocalizacao = 0;
  for (const item of itens) {
    const estado = frescorLocalizacao(item.ultimaLocalizacao?.timestampMs ?? null, agoraMs);
    if (estado === 'LOCALIZACAO_ATUAL' || estado === 'LOCALIZACAO_RECENTE') localizacaoAtiva += 1;
    else if (estado === 'SEM_ATUALIZACAO') semAtualizacao += 1;
    else semLocalizacao += 1;
  }
  return { totalVeiculos: itens.length, localizacaoAtiva, semAtualizacao, semLocalizacao };
}
