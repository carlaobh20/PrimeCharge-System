// ===========================================================================
// FASE 19 — MÓDULO 2/5: PRESENÇA (conceito DERIVADO — motor puro)
// `presencaMotorista()` nunca lê relógio, nunca acessa `Date`/`window`/`document` — recebe a
// última evidência de atividade e o instante "agora" como parâmetros (mesmo padrão de pureza
// de `assistenteContextual()`, Fase 18: quem calcula "agora" é o CHAMADOR, nunca o motor).
//
// "ONLINE" aqui NUNCA significa "está trabalhando" — significa só "há evidência recente de
// atividade no aplicativo" (heartbeat de visibilidade de página, ou uma localização recente,
// ou qualquer outro timestamp de atividade real que o chamador injetar). Nenhuma linha
// artificial é criada; nenhum enum novo no banco (esta fase não cria NENHUMA tabela — ver
// auditoria, seção 5). "Última evidência" pode vir de qualquer fonte real disponível — nesta
// fase, só a visibilidade de página local ao dispositivo do motorista (ver
// `hooks/useHeartbeatVisibilidade.ts`, no app do motorista); ela não é transmitida a staff
// nenhum, porque não existe (ainda) uma tabela aprovada para isso.
// ===========================================================================

export type EstadoPresenca = 'SEM_DADO' | 'ONLINE' | 'SEM_ATUALIZACAO' | 'OFFLINE';

/** Janelas de tempo, em ms, que definem os três estados com evidência (SEM_DADO é quando não
 *  há evidência nenhuma, não depende de janela). Documentadas e ajustáveis pelo chamador —
 *  nunca escondidas dentro da função. Corte inicial (mesma disciplina do
 *  `classificarAmostra` da Fase 17: um valor precisa existir, é declarado explicitamente, e
 *  pode ser revisto por decisão de produto):
 *  - até 2 minutos sem nova evidência → ONLINE (janela generosa o suficiente para cobrir o
 *    intervalo entre heartbeats de visibilidade sem parecer "piscando" a cada segundo);
 *  - de 2 a 15 minutos → SEM_ATUALIZACAO (evidência existe, mas está velha — nunca chamado de
 *    "offline" só porque o navegador ficou em segundo plano por alguns minutos, conforme a
 *    limitação documentada na auditoria, seção 14);
 *  - acima de 15 minutos → OFFLINE. */
export type JanelasPresenca = { onlineMs: number; semAtualizacaoMs: number };

export const JANELAS_PRESENCA_PADRAO: JanelasPresenca = {
  onlineMs: 2 * 60 * 1000,
  semAtualizacaoMs: 15 * 60 * 1000,
};

/**
 * @param ultimaEvidenciaMs epoch ms da última atividade real conhecida (heartbeat de
 *   visibilidade, localização recente, etc.) — `null` quando não existe NENHUMA evidência
 *   (motorista nunca abriu o app, ou é uma fonte que ainda não existe).
 * @param agoraMs epoch ms do instante atual — sempre injetado pelo chamador, nunca lido daqui.
 */
export function presencaMotorista(
  ultimaEvidenciaMs: number | null,
  agoraMs: number,
  janelas: JanelasPresenca = JANELAS_PRESENCA_PADRAO,
): EstadoPresenca {
  if (ultimaEvidenciaMs == null || !Number.isFinite(ultimaEvidenciaMs)) return 'SEM_DADO';
  const idade = agoraMs - ultimaEvidenciaMs;
  if (!Number.isFinite(idade) || idade < 0) return 'SEM_DADO'; // evidência "do futuro" nunca é tratada como válida — sinal de relógio incoerente, não presença
  if (idade <= janelas.onlineMs) return 'ONLINE';
  if (idade <= janelas.semAtualizacaoMs) return 'SEM_ATUALIZACAO';
  return 'OFFLINE';
}
