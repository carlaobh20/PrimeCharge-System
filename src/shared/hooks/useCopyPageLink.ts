import { useState } from 'react';

// "Compartilhar" (Cockpit — header e sidebar) — copia o link real da página atual. Morava
// em features/frota/, hoisted pra shared/ na Sprint 6 (mesmo motivo de KpiCard: Motoristas é
// o segundo módulo a precisar, ver DEC-025).
export function useCopyPageLink() {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return { copiado, copiar };
}
