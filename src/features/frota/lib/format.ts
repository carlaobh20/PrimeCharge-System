// Reexport — a formatação de verdade mora em shared/lib/format.ts desde a Sprint 5 (ver
// DEC-024), pra poder ser usada também pelo Command Center. Mantido aqui pra não quebrar
// os imports já existentes no módulo Veículos.
export { formatMoeda, formatKm, diasDesde, formatDataHora, formatDataRelativa, formatDataSimples } from '@/shared/lib/format';
