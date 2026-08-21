// ===========================================================================
// FASE 19 — MÓDULO 1: LOCALIZAÇÃO REAL (motor puro — zero React, zero rede, zero navigator)
// Interpreta o resultado bruto de `navigator.geolocation` (ou sua ausência) num estado
// honesto. Este arquivo NUNCA chama `navigator.*` diretamente — isso é responsabilidade do
// hook (`hooks/useGeolocalizacaoMotorista.ts`), que injeta aqui só os valores já obtidos.
// Separar assim permite testar toda a lógica de decisão sem precisar de um navegador de
// verdade (a suíte de testes desta fase roda em Node via tsx).
//
// Regra de ouro deste módulo: NUNCA inventar uma posição. Latitude/longitude 0/0, "cidade
// padrão" ou qualquer coordenada fixa como fallback de erro são proibidos — em qualquer
// falha (permissão negada, GPS indisponível, navegador sem suporte, timestamp expirado,
// coordenada fora dos limites geográficos), a posição retornada é `null`, nunca um valor
// inventado.
// ===========================================================================

/** Estado honesto da localização — nunca "disponível" com um dado inventado por trás. */
export type EstadoLocalizacao =
  | 'LOCALIZACAO_DISPONIVEL' // posição obtida, válida e recente
  | 'LOCALIZACAO_INDISPONIVEL' // navegador suporta e permissão concedida, mas falhou (GPS off, timeout, sinal fraco) ou o dado veio inválido/expirado
  | 'PERMISSAO_NEGADA' // motorista negou explicitamente
  | 'SEM_DADO'; // navegador sem suporte, ou ainda não solicitado

/** De onde a posição veio — Módulo 3. Nesta fase só 'PWA_GPS' tem implementação real (Módulo 1);
 *  os demais existem como vocabulário para quando (e se) uma fonte real existir — nunca um
 *  adapter fictício (ver auditoria, seção 4: "não criar adapter fictício para fontes inexistentes"). */
export type OrigemLocalizacao = 'PWA_GPS' | 'TELEMETRIA' | 'OBD' | 'OUTRA';

export type PosicaoGPS = {
  latitude: number;
  longitude: number;
  /** Metros — direto do `GeolocationPosition.coords.accuracy` do navegador. Null quando a
   *  origem não fornece essa informação (nunca inventada). */
  accuracy: number | null;
  /** Epoch ms do MOMENTO EM QUE O NAVEGADOR CAPTUROU a posição (`GeolocationPosition.timestamp`)
   *  — nunca o horário em que o app recebeu/processou o resultado. */
  timestamp: number;
  origem: OrigemLocalizacao;
};

export type ResultadoLocalizacao = {
  estado: EstadoLocalizacao;
  /** Só não-null quando estado === 'LOCALIZACAO_DISPONIVEL'. */
  posicao: PosicaoGPS | null;
  /** Motivo legível, só para debug/log — nunca exibido como se fosse um dado registrado. */
  motivo: string;
};

/** Espelha os códigos de erro reais de `GeolocationPositionError` (1/2/3) sem depender do tipo
 *  do DOM (permite testar em Node, onde `GeolocationPositionError` não existe globalmente). */
export type CodigoErroGeolocalizacao = 1 | 2 | 3; // 1 PERMISSION_DENIED · 2 POSITION_UNAVAILABLE · 3 TIMEOUT

/** Idade máxima aceita para uma posição ser considerada "atual" — 5 minutos. Acima disso, uma
 *  posição tecnicamente válida vira LOCALIZACAO_INDISPONIVEL: é dado antigo, não localização
 *  atual (mesma disciplina de "premissa vs. dado" das fases anteriores — nunca fingir que um
 *  registro velho é o presente). Valor exposto para o chamador poder ajustar conscientemente,
 *  nunca escondido dentro da função. */
export const IDADE_MAXIMA_POSICAO_MS = 5 * 60 * 1000;

/** Valida os limites geográficos reais — nunca aceita latitude fora de [-90,90] ou longitude
 *  fora de [-180,180]. NaN/Infinity também são rejeitados (Number.isFinite cobre os dois). */
export function coordenadaValida(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Suporte do navegador — checado pelo HOOK via `'geolocation' in navigator`; injetado aqui
 *  como booleano pra manter esta função livre de `navigator`. */
export function interpretarSuporteGeolocalizacao(suportado: boolean): ResultadoLocalizacao | null {
  if (suportado) return null; // segue para os outros ramos — não decide sozinho
  return { estado: 'SEM_DADO', posicao: null, motivo: 'navegador sem suporte a navigator.geolocation' };
}

/** Interpreta o erro devolvido por `getCurrentPosition`/`watchPosition`. */
export function interpretarErroGeolocalizacao(codigo: CodigoErroGeolocalizacao): ResultadoLocalizacao {
  if (codigo === 1) {
    return { estado: 'PERMISSAO_NEGADA', posicao: null, motivo: 'motorista negou a permissão de localização' };
  }
  if (codigo === 2) {
    return { estado: 'LOCALIZACAO_INDISPONIVEL', posicao: null, motivo: 'GPS indisponível (sinal, hardware ou sistema operacional)' };
  }
  return { estado: 'LOCALIZACAO_INDISPONIVEL', posicao: null, motivo: 'tempo esgotado aguardando o GPS' };
}

/** Interpreta um resultado bruto de sucesso — ainda pode ser recusado aqui (coordenada
 *  inválida ou timestamp expirado nunca viram LOCALIZACAO_DISPONIVEL). `agoraMs` é injetado
 *  pelo chamador (nunca `Date.now()` dentro deste motor — mantém a função pura e testável). */
export function interpretarPosicaoGeolocalizacao(
  bruto: { latitude: number; longitude: number; accuracy: number | null; timestamp: number },
  agoraMs: number,
  idadeMaximaMs: number = IDADE_MAXIMA_POSICAO_MS,
): ResultadoLocalizacao {
  if (!coordenadaValida(bruto.latitude, bruto.longitude)) {
    return { estado: 'LOCALIZACAO_INDISPONIVEL', posicao: null, motivo: `coordenada fora dos limites geográficos (lat=${bruto.latitude}, lng=${bruto.longitude})` };
  }
  const idade = agoraMs - bruto.timestamp;
  if (!Number.isFinite(idade) || idade < 0 || idade > idadeMaximaMs) {
    return { estado: 'LOCALIZACAO_INDISPONIVEL', posicao: null, motivo: `posição desatualizada (${Number.isFinite(idade) ? `${Math.round(idade / 1000)}s` : 'timestamp inválido'})` };
  }
  return {
    estado: 'LOCALIZACAO_DISPONIVEL',
    posicao: {
      latitude: bruto.latitude,
      longitude: bruto.longitude,
      accuracy: bruto.accuracy != null && Number.isFinite(bruto.accuracy) ? bruto.accuracy : null,
      timestamp: bruto.timestamp,
      origem: 'PWA_GPS',
    },
    motivo: 'posição obtida do navigator.geolocation do dispositivo',
  };
}
