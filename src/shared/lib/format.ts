// Formatação de valor/data — genérico, sem nenhuma dependência de domínio. Vivia em
// features/frota/lib/format.ts (só porque foi o primeiro lugar que precisou), movido pra
// cá na Sprint 5 porque o Command Center também precisa (ver DEC-024). frota/lib/format.ts
// virou um reexport, pra não quebrar nenhum import existente.
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

// Complementa diasDesde: dias até uma data futura (negativo se já passou). Adicionada na
// Sprint 6 para validade de CNH (Motoristas) — genérica o bastante para qualquer campo de
// vencimento futuro (documento, contrato…), por isso mora aqui e não em intelligence/ de
// nenhuma feature.
export function diasAte(dataIso: string | null | undefined) {
  if (!dataIso) return null;
  const alvo = new Date(dataIso).getTime();
  if (Number.isNaN(alvo)) return null;
  const agora = Date.now();
  return Math.floor((alvo - agora) / (1000 * 60 * 60 * 24));
}

// Formata uma coluna `date` (sem horário, ex.: cnh_validade, data_nascimento) direto da
// string yyyy-mm-dd, sem passar por Date/toLocaleString — evitar isso evita deslocar o dia
// por causa de fuso horário quando o valor é interpretado como meia-noite UTC. Adicionada na
// Sprint 6 (Motoristas), genérica para qualquer campo de data-sem-horário futuro.
export function formatDataSimples(dataIso: string | null | undefined) {
  if (!dataIso) return '—';
  const [ano, mes, dia] = dataIso.split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
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
