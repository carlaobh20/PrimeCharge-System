import { useState } from 'react';

// "Compartilhar" (header e sidebar do Cockpit) — copia o link real da página atual.
// Funcionalidade genuína, não placeholder: qualquer link direto já funciona desde o fix
// do vercel.json (DEC-020).
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
