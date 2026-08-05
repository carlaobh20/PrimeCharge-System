import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { useAcoesPorEmpresa } from '@/features/operacoes/hooks/useAcoes';
import { formatDataSimples } from '@/shared/lib/format';

// Widget independente, não um Engine novo (DEC-051 já rejeitou uma 5ª origem no Command
// Center pra Financeiro pelo mesmo raciocínio — aqui é mais direto ainda: Ação Operacional já
// É a fila real, não precisa passar pelos Engines de priorização de Alerta/Insight/Oportunidade/
// Risco, que continuam servindo só Veículo/Motorista/Contrato). Busca seus próprios dados via
// useAcoesPorEmpresa — não depende de useCommandCenter/coletarInteligencia*.
export function AcoesOperacionaisWidget() {
  const { data: acoes, isLoading } = useAcoesPorEmpresa();

  const abertas = (acoes ?? []).filter((a) => a.status === 'pendente' || a.status === 'em_andamento');
  const hoje = new Date();
  const atrasadas = abertas.filter((a) => a.prazo && new Date(a.prazo) < hoje);
  const proximas = [...abertas]
    .sort((a, b) => {
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    })
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <ClipboardList className="h-3.5 w-3.5" />
          Ações Operacionais
        </h2>
        <Link to="/operacoes/acoes" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
          Ver todas
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-neutral-500">Carregando…</p>
      ) : abertas.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Nenhuma ação em aberto.
        </div>
      ) : (
        <>
          {atrasadas.length > 0 && (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
              {atrasadas.length} ação(ões) atrasada(s)
            </p>
          )}
          <ul className="mt-2 space-y-1.5">
            {proximas.map((a) => (
              <li key={a.id} className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">{a.titulo}</span>
                {a.prazo && <span className="ml-1.5 text-xs text-neutral-400">— {formatDataSimples(a.prazo)}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
