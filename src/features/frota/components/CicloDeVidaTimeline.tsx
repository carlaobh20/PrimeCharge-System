import { ESTAGIOS_CICLO_VIDA, ESTAGIO_CICLO_VIDA_LABEL, estagioCicloVida } from '../intelligence/cicloDeVida';
import type { VeiculoStatus } from '../types';

// Épico 4, Parte 6 — "Ciclo de Vida". Deliberadamente NÃO é uma progress bar (estágios
// anteriores marcados como "concluídos") — um veículo real oscila indefinidamente entre
// Disponível ⇄ Alugado ⇄ Manutenção ao longo de anos, então "marcar Alugado como concluído"
// enquanto o carro está em Manutenção pela quinta vez seria enganoso. Em vez disso, é um
// indicador de POSIÇÃO: só o estágio atual é destacado, os outros 7 ficam neutros.
export function CicloDeVidaTimeline({ status }: { status: VeiculoStatus }) {
  const atual = estagioCicloVida(status);

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ciclo de Vida</h3>
      <div className="mt-4 flex items-center">
        {ESTAGIOS_CICLO_VIDA.map((estagio, i) => {
          const isAtual = estagio === atual;
          return (
            <div key={estagio} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={
                    isAtual
                      ? 'h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20'
                      : 'h-2 w-2 rounded-full bg-neutral-300 dark:bg-white/20'
                  }
                />
                <span
                  className={
                    isAtual
                      ? 'whitespace-nowrap text-[11px] font-semibold text-emerald-600'
                      : 'whitespace-nowrap text-[10px] text-neutral-400'
                  }
                >
                  {ESTAGIO_CICLO_VIDA_LABEL[estagio]}
                </span>
              </div>
              {i < ESTAGIOS_CICLO_VIDA.length - 1 && <div className="mx-1 h-px flex-1 bg-neutral-200 dark:bg-white/10" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
