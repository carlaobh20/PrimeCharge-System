import { Secao, Linha, Pill } from '../ui';
import { useLocalizacaoOperacional } from '../../hooks/useLocalizacaoOperacional';

// FASE 20 — Módulos 4/18/19: card do Centro de Controle do motorista. Pequeno de propósito
// ("não transformar isso em dashboard", Módulo 18) — só o estado factual do compartilhamento,
// nunca um mapa ou histórico aqui (isso é do Centro de Inteligência da Frota, do lado staff).

function idadeLegivel(ms: number): string {
  const segundos = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (segundos < 60) return `${segundos}s atrás`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min atrás`;
  const horas = Math.round(minutos / 60);
  return `${horas}h atrás`;
}

export function LocalizacaoOperacionalCard({ contratoId }: { contratoId: string | null }) {
  const loc = useLocalizacaoOperacional(contratoId);

  return (
    <Secao titulo="Localização operacional">
      {!contratoId ? (
        <p className="text-[13px] text-neutral-500">
          Sem contrato ativo — localização operacional não se aplica agora.
        </p>
      ) : (
        <>
          <Linha
            label="Status"
            value={
              loc.estadoConsentimento === 'COMPARTILHADA' ? (
                <Pill tom="verde">● Compartilhada</Pill>
              ) : loc.estadoConsentimento === 'PERMISSAO_NEGADA' ? (
                <Pill tom="vermelho">● Permissão negada</Pill>
              ) : loc.estadoConsentimento === 'INDISPONIVEL' ? (
                <Pill tom="ambar">● Indisponível</Pill>
              ) : (
                <Pill tom="neutro">● Não compartilhada</Pill>
              )
            }
          />
          {loc.ultimaGravacaoMs != null && (
            <>
              <Linha label="Última atualização" value={idadeLegivel(loc.ultimaGravacaoMs)} />
              <Linha label="Precisão" value={loc.accuracy != null ? `≈ ${Math.round(loc.accuracy)} m` : 'NÃO INFORMADO'} />
            </>
          )}

          {loc.estadoConsentimento === 'NAO_COMPARTILHADA' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={loc.ativar}
                disabled={!loc.suportado}
                className="w-full rounded-xl bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              >
                Compartilhar localização
              </button>
              {!loc.suportado && (
                <p className="mt-1 text-[11px] text-neutral-400">Este navegador não suporta localização.</p>
              )}
            </div>
          )}
          {loc.estadoConsentimento !== 'NAO_COMPARTILHADA' && (
            <button type="button" onClick={loc.desativar} className="mt-2 text-[11px] text-neutral-400 underline">
              Parar de compartilhar
            </button>
          )}

          <p className="mt-2 text-[11px] text-neutral-400">
            Quando disponível, sua localização pode ser usada para recursos operacionais relacionados ao
            veículo e ao contrato. Quem pode ver: você mesmo, e a empresa do seu contrato ativo — nunca
            outras empresas, nem outros motoristas.
          </p>
        </>
      )}
    </Secao>
  );
}
