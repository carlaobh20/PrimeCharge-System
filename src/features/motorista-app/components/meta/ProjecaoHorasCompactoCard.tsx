import { Secao, Linha } from '../ui';
import { formatBRL, formatHoras, type ProjecoesDuplas } from '../../lib/metas';

// FASE 23 — PROJEÇÃO + HORAS, COMPACTO. Duas leituras que hoje vivem espalhadas (RitmoMesCard/
// TresNumerosCard/PlanoDeHoje) resumidas em 1 card curto. Nada recalculado — mesmos valores.

export function ProjecaoHorasCompactoCard({
  projecoes,
  horasNecessariasHoje,
  rsHoraReal,
}: {
  projecoes: ProjecoesDuplas;
  horasNecessariasHoje: number | null;
  rsHoraReal: number | null;
}) {
  return (
    <Secao titulo="Projeção e horas">
      <Linha label="Projeção do mês (premissa)" value={formatBRL(projecoes.pelaPremissa.valor)} />
      {projecoes.peloHistorico && <Linha label="Projeção do mês (histórico real)" value={formatBRL(projecoes.peloHistorico.valor)} />}
      <Linha label="Horas necessárias hoje" value={horasNecessariasHoje != null ? `≈ ${formatHoras(horasNecessariasHoje)}` : '—'} />
      {rsHoraReal != null && <Linha label="R$/h real (últimos 14d)" value={formatBRL(rsHoraReal)} />}
    </Secao>
  );
}
