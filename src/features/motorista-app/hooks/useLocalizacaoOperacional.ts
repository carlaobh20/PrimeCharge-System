import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocalizacaoMotorista } from './useGeolocalizacaoMotorista';
import { gravarLocalizacaoOperacional, type ResultadoGravarLocalizacao } from '../api/localizacaoOperacional';
import { distanciaEntrePontos } from '@/features/frota/lib/geo';

// FASE 20 — Módulos 4/6/7: hook que liga a CAPTURA (useGeolocalizacaoMotorista, Fase 19) à
// PERSISTÊNCIA (gravarLocalizacaoOperacional, migration 0051), com uma estratégia conservadora
// de frequência e um estado de consentimento sempre visível.
//
// Módulo 4 (consentimento): NUNCA inicia sozinho — só depois de `ativar()`, chamado por um
// botão explícito na tela (mesma disciplina do hook de captura: "a tela decide QUANDO
// oferecer"). Deliberadamente NÃO persistido em localStorage entre sessões — o resto do app do
// motorista evita localStorage de propósito (ver comentários em lib/carrinho.tsx/lib/metas.ts,
// "zero window/localStorage") e persistir "já autorizei antes" faria o compartilhamento
// recomeçar sozinho na próxima visita, sem o motorista ver de novo que está acontecendo — pedir
// de novo a cada sessão é o comportamento mais transparente, não uma limitação.
//
// Módulo 7 (frequência): captura só em primeiro plano (Page Visibility, mesmo padrão do
// heartbeat), cadência de MINUTOS. Só GRAVA (POST real) quando o motorista se moveu o
// suficiente OU quando já faz tempo demais desde a última gravação — reaproveita
// `distanciaEntrePontos` (Módulo 12/14) em vez de inventar um segundo cálculo de distância.

const INTERVALO_CAPTURA_MS = 3 * 60 * 1000; // tenta uma nova leitura de GPS a cada 3 min, só em primeiro plano
const DISTANCIA_MINIMA_PARA_GRAVAR_KM = 0.15; // 150m — abaixo disso, só grava por causa do tempo (heartbeat)
const INTERVALO_MAXIMO_SEM_GRAVAR_MS = 10 * 60 * 1000; // mesmo parado, atualiza a cada 10 min (a "última atualização" não fica velha pra sempre)

export type EstadoConsentimentoLocalizacao =
  | 'NAO_COMPARTILHADA' // motorista não ativou (ou não há contrato ativo)
  | 'COMPARTILHADA' // ativo, capturando com sucesso
  | 'PERMISSAO_NEGADA'
  | 'INDISPONIVEL'; // sem suporte do navegador, ou GPS/sinal indisponível

export function useLocalizacaoOperacional(contratoId: string | null) {
  const geo = useGeolocalizacaoMotorista();
  const [ativado, setAtivado] = useState(false);
  const [ultimaGravacaoMs, setUltimaGravacaoMs] = useState<number | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoGravarLocalizacao | null>(null);
  const ultimaPosicaoGravadaRef = useRef<{ latitude: number; longitude: number; ms: number } | null>(null);

  const podeCompartilhar = ativado && contratoId != null;

  const capturarEAvaliar = useCallback(() => {
    if (!podeCompartilhar) return;
    geo.solicitar();
  }, [podeCompartilhar, geo]);

  // Interval só enquanto a aba está visível — mesmo padrão de useHeartbeatVisibilidade, nunca
  // um setInterval "cego" rodando em background.
  useEffect(() => {
    if (!podeCompartilhar || typeof document === 'undefined') return;
    const talvezCapturar = () => {
      if (document.visibilityState === 'visible') capturarEAvaliar();
    };
    talvezCapturar(); // primeira captura ao ativar, se já visível
    document.addEventListener('visibilitychange', talvezCapturar);
    const intervalo = window.setInterval(talvezCapturar, INTERVALO_CAPTURA_MS);
    return () => {
      document.removeEventListener('visibilitychange', talvezCapturar);
      window.clearInterval(intervalo);
    };
  }, [podeCompartilhar, capturarEAvaliar]);

  // Quando uma posição válida chega, decide se GRAVA (movimento ou staleness) e grava.
  useEffect(() => {
    if (!podeCompartilhar || !contratoId) return;
    if (geo.estado !== 'LOCALIZACAO_DISPONIVEL' || !geo.posicao) return;

    const anterior = ultimaPosicaoGravadaRef.current;
    const agora = geo.posicao.timestamp;
    const distanciaKm = anterior ? distanciaEntrePontos(anterior, geo.posicao) : null;
    const moveuOSuficiente = distanciaKm != null && distanciaKm >= DISTANCIA_MINIMA_PARA_GRAVAR_KM;
    const tempoDemaisSemGravar = anterior == null || agora - anterior.ms >= INTERVALO_MAXIMO_SEM_GRAVAR_MS;

    if (!moveuOSuficiente && !tempoDemaisSemGravar) return; // nem moveu nem passou tempo suficiente — não grava agora

    let cancelado = false;
    gravarLocalizacaoOperacional({
      contratoId,
      latitude: geo.posicao.latitude,
      longitude: geo.posicao.longitude,
      accuracyM: geo.posicao.accuracy,
      timestampLocalizacaoMs: geo.posicao.timestamp,
    }).then((resultado) => {
      if (cancelado) return;
      setUltimoResultado(resultado);
      if (resultado.ok) {
        ultimaPosicaoGravadaRef.current = { latitude: geo.posicao!.latitude, longitude: geo.posicao!.longitude, ms: geo.posicao!.timestamp };
        setUltimaGravacaoMs(geo.posicao!.timestamp);
      }
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reavalia só quando a posição muda de verdade
  }, [geo.estado, geo.posicao?.timestamp, podeCompartilhar, contratoId]);

  const ativar = useCallback(() => {
    setAtivado(true);
  }, []);
  const desativar = useCallback(() => {
    setAtivado(false);
    geo.pararAcompanhamento();
  }, [geo]);

  const estadoConsentimento: EstadoConsentimentoLocalizacao = (() => {
    if (!ativado || !contratoId) return 'NAO_COMPARTILHADA';
    if (geo.estado === 'PERMISSAO_NEGADA') return 'PERMISSAO_NEGADA';
    if (geo.estado === 'LOCALIZACAO_INDISPONIVEL' || geo.estado === 'SEM_DADO') return 'INDISPONIVEL';
    return 'COMPARTILHADA';
  })();

  return {
    estadoConsentimento,
    ativado,
    ativar,
    desativar,
    carregando: geo.carregando,
    suportado: geo.suportado,
    ultimaGravacaoMs,
    ultimoResultado,
    accuracy: geo.posicao?.accuracy ?? null,
  };
}
