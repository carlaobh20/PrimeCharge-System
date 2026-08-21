// ===========================================================================
// FASE 19 — MÓDULO 12: DISTÂNCIA (motor puro, zero dependência)
// Fórmula de Haversine — a matemática correta para distância em linha reta entre dois pontos
// numa esfera (a Terra, aproximada). NÃO é distância de rota/trânsito — isso exigiria uma API
// de rotas externa, fora do escopo desta fase (fundação, não integração externa).
// Nunca produz recomendação: só a matemática ("Carro A está 2,1 km" — ver auditoria, Módulo 12
// da especificação: "sem transformar isso em recomendação automática").
// ===========================================================================

import { coordenadaValida } from '@/features/motorista-app/lib/localizacao';

const RAIO_TERRA_KM = 6371;

export type PontoGeografico = { latitude: number; longitude: number };

const paraRadianos = (graus: number) => (graus * Math.PI) / 180;

/**
 * Distância em km entre dois pontos geográficos. `null` quando qualquer uma das duas
 * coordenadas é inválida (fora dos limites geográficos, NaN, Infinity) — nunca uma distância
 * calculada sobre um ponto inventado. Retorna exatamente `0` quando os dois pontos coincidem
 * (A → A), nunca `null` nesse caso — coincidir é uma distância real, não uma ausência de dado.
 */
export function distanciaEntrePontos(a: PontoGeografico, b: PontoGeografico): number | null {
  if (!coordenadaValida(a.latitude, a.longitude) || !coordenadaValida(b.latitude, b.longitude)) return null;

  const dLat = paraRadianos(b.latitude - a.latitude);
  const dLng = paraRadianos(b.longitude - a.longitude);
  const lat1 = paraRadianos(a.latitude);
  const lat2 = paraRadianos(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const distanciaKm = RAIO_TERRA_KM * c;

  // Ponto flutuante pode deixar A→A como algo como 1.7e-13 em vez de exatamente 0 — arredondar
  // para metros (3 casas decimais de km) evita "0,0000000001 km" aparecendo em qualquer UI futura.
  return Math.round(distanciaKm * 1000) / 1000;
}
