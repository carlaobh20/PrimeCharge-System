import { useEffect, useState } from 'react';
import { presencaMotorista, JANELAS_PRESENCA_PADRAO, type EstadoPresenca, type JanelasPresenca } from '@/features/frota/lib/presenca';

// FASE 19 — MÓDULO 5: HEARTBEAT (evidência de atividade, só client-side, só em memória).
// Usa a Page Visibility API — sem `setInterval` agressivo: o "heartbeat" é o próprio evento
// `visibilitychange` (e uma marcação inicial ao montar), não um polling automático. Enquanto a
// aba está visível, atualiza a "última evidência" a cada 60s (bem menos frequente que um
// polling de segundo em segundo) só para a janela de presença não expirar sozinha com o app
// aberto e parado — ainda assim está longe de "agressivo".
//
// IMPORTANTE (ver auditoria, seção 14): isto só prova que o motorista tem o app com a aba em
// primeiro plano NESTE dispositivo, NESTE momento — não é transmitido a staff nenhum (não há
// tabela aprovada para isso, ver auditoria seção 5) e não funciona com o app em background por
// tempo longo (limitação real de PWA/mobile, documentada, não escondida).

const INTERVALO_ATUALIZACAO_VISIVEL_MS = 60_000;

export function useHeartbeatVisibilidade(janelas: JanelasPresenca = JANELAS_PRESENCA_PADRAO) {
  const [ultimaEvidenciaMs, setUltimaEvidenciaMs] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoPresenca>('SEM_DADO');

  useEffect(() => {
    if (typeof document === 'undefined') return; // SSR/teste sem DOM — nunca finge evidência

    const marcarEvidencia = () => {
      if (document.visibilityState === 'visible') setUltimaEvidenciaMs(Date.now());
    };

    marcarEvidencia(); // primeira marcação ao montar, se já estiver visível
    document.addEventListener('visibilitychange', marcarEvidencia);
    const intervalo = window.setInterval(marcarEvidencia, INTERVALO_ATUALIZACAO_VISIVEL_MS);

    return () => {
      document.removeEventListener('visibilitychange', marcarEvidencia);
      window.clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    setEstado(presencaMotorista(ultimaEvidenciaMs, Date.now(), janelas));
    // Reavalia periodicamente mesmo sem novo evento — a evidência pode "envelhecer" para
    // SEM_ATUALIZACAO/OFFLINE sem nenhuma ação do motorista (ele simplesmente parou de usar).
    const revalidar = window.setInterval(() => setEstado(presencaMotorista(ultimaEvidenciaMs, Date.now(), janelas)), 30_000);
    return () => window.clearInterval(revalidar);
  }, [ultimaEvidenciaMs, janelas]);

  return { estado, ultimaEvidenciaMs };
}
