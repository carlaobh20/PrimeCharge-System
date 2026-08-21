import { useCallback, useRef, useState } from 'react';
import {
  interpretarErroGeolocalizacao,
  interpretarPosicaoGeolocalizacao,
  interpretarSuporteGeolocalizacao,
  type CodigoErroGeolocalizacao,
  type ResultadoLocalizacao,
} from '../lib/localizacao';

// FASE 19 — MÓDULO 1: hook que efetivamente chama `navigator.geolocation` (a única coisa que
// este arquivo faz que `lib/localizacao.ts` não pode — toda a DECISÃO de estado continua lá,
// motor puro). NENHUMA persistência: o resultado fica só em memória de React. Sem uma tabela
// aprovada para guardar localização (ver auditoria, seção 5 — proposta ainda pendente da sua
// decisão), qualquer captura se perde ao fechar a aba — isso é intencional nesta fase, não um
// bug: primeiro provar que a CAPTURA funciona, depois decidir se e como persistir.
//
// Nunca chama getCurrentPosition sozinho ao montar — só quando o motorista pede
// explicitamente (`solicitar()`), porque pedir permissão de localização sem contexto é
// justamente o tipo de UX que os navegadores penalizam (e o próprio motorista rejeita por
// reflexo). A tela que usar este hook decide QUANDO oferecer o botão.

const RESULTADO_INICIAL: ResultadoLocalizacao = { estado: 'SEM_DADO', posicao: null, motivo: 'localização ainda não solicitada' };

export function useGeolocalizacaoMotorista() {
  const [resultado, setResultado] = useState<ResultadoLocalizacao>(RESULTADO_INICIAL);
  const [carregando, setCarregando] = useState(false);
  // Guarda o watchId só pra permitir `pararAcompanhamento()` — nunca inicia watch sozinho.
  const watchIdRef = useRef<number | null>(null);

  const suportado = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const processarSucesso = useCallback((posicao: GeolocationPosition) => {
    setCarregando(false);
    setResultado(
      interpretarPosicaoGeolocalizacao(
        {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          accuracy: posicao.coords.accuracy,
          timestamp: posicao.timestamp,
        },
        Date.now(),
      ),
    );
  }, []);

  const processarErro = useCallback((erro: GeolocationPositionError) => {
    setCarregando(false);
    setResultado(interpretarErroGeolocalizacao(erro.code as CodigoErroGeolocalizacao));
  }, []);

  /** Solicita a posição UMA VEZ — a ação que o Módulo 1 pede ("descobrir se conseguimos
   *  obter... quando o motorista autorizar"). Pede permissão do navegador na primeira
   *  chamada; chamadas seguintes já usam a permissão concedida/negada anteriormente. */
  const solicitar = useCallback(() => {
    const semSuporte = interpretarSuporteGeolocalizacao(suportado);
    if (semSuporte) {
      setResultado(semSuporte);
      return;
    }
    setCarregando(true);
    navigator.geolocation.getCurrentPosition(processarSucesso, processarErro, {
      enableHighAccuracy: false, // não pedir GPS de alta precisão por padrão — custo de bateria, e a Fase 19 é sobre PROVAR viabilidade, não otimizar precisão
      timeout: 10_000,
      maximumAge: 0, // nunca aceitar um cache do navegador sem checar a idade aqui — a validação de idade é sempre feita em interpretarPosicaoGeolocalizacao, não delegada ao browser
    });
  }, [suportado, processarSucesso, processarErro]);

  /** Acompanhamento contínuo (watchPosition) — só usado se uma tela realmente precisar (ex.:
   *  um futuro mapa ao vivo). Nunca chamado automaticamente por este hook. */
  const iniciarAcompanhamento = useCallback(() => {
    const semSuporte = interpretarSuporteGeolocalizacao(suportado);
    if (semSuporte) {
      setResultado(semSuporte);
      return;
    }
    if (watchIdRef.current != null) return; // já acompanhando — não duplica o watch
    watchIdRef.current = navigator.geolocation.watchPosition(processarSucesso, processarErro, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 0,
    });
  }, [suportado, processarSucesso, processarErro]);

  const pararAcompanhamento = useCallback(() => {
    if (watchIdRef.current != null && suportado) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, [suportado]);

  return { ...resultado, carregando, suportado, solicitar, iniciarAcompanhamento, pararAcompanhamento };
}
