export function formatMoeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatKm(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return '—';
  return `${valor.toLocaleString('pt-BR')} km`;
}

export function diasDesde(dataIso: string | null | undefined) {
  if (!dataIso) return null;
  const inicio = new Date(dataIso).getTime();
  const agora = Date.now();
  if (Number.isNaN(inicio) || inicio > agora) return null;
  return Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));
}

export function formatDataHora(dataIso: string | null | undefined) {
  if (!dataIso) return '—';
  return new Date(dataIso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDataRelativa(dataIso: string | null | undefined) {
  if (!dataIso) return '—';
  const dias = diasDesde(dataIso);
  if (dias === null) return formatDataHora(dataIso);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}
