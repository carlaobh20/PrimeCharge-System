import { useCommandCenter } from '../hooks/useCommandCenter';
import { useFilasDeTrabalho, type FilaDeTrabalho } from '../hooks/useFilasDeTrabalho';
import { FilasDeTrabalhoWidget } from '../widgets/FilasDeTrabalhoWidget';
import { PrioridadesDoDiaWidget } from '../widgets/PrioridadesDoDiaWidget';
import { AlertasWidget } from '../widgets/AlertasWidget';
import { OportunidadesWidget } from '../widgets/OportunidadesWidget';
import { RiscosWidget } from '../widgets/RiscosWidget';
import { ProximasAcoesWidget } from '../widgets/ProximasAcoesWidget';
import { InsightsWidget } from '../widgets/InsightsWidget';
import { ResumoFrotaWidget } from '../widgets/ResumoFrotaWidget';
import { VeiculosListWidget } from '../widgets/VeiculosListWidget';
import { AcoesOperacionaisWidget } from '../widgets/AcoesOperacionaisWidget';

function CentroDeOperacoesSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-28 cockpit-shimmer rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-56 cockpit-shimmer rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// Centro de Operações — substitui a Central de Comando como Home (Épico 1, "Operação
// Perfeita"). Decisão registrada: em vez de um módulo novo, isto ABSORVE a Central de
// Comando — mesmo useCommandCenter, mesmos Engines/Widgets de Alerta/Risco/Oportunidade/
// Insight/Prioridades do Dia (agora clicáveis, ver alertEngine.ts e afins), só ganhou a grid
// de 12 filas de trabalho no topo (useFilasDeTrabalho) como novo ponto de entrada principal —
// "um operador deve conseguir trabalhar o dia inteiro olhando só pra esta tela".
export function CentroDeOperacoesPage() {
  const resultado = useCommandCenter();
  const filasResultado = useFilasDeTrabalho();

  if (resultado.isLoading || filasResultado.isLoading) return <CentroDeOperacoesSkeleton />;

  // Achado de campo (2026-08-09): antes desta checagem, um erro em qualquer uma das
  // consultas de useFilasDeTrabalho deixava a Home travada no esqueleto de carregamento pra
  // sempre, sem nenhum aviso — ver comentário em useFilasDeTrabalho.ts. Mostrar o erro é
  // melhor que uma tela em branco, mesmo sem um design bonito pra isso ainda.
  if (filasResultado.isError || resultado.isError) {
    const erro = filasResultado.isError ? filasResultado.error : resultado.isError ? resultado.error : null;
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Não consegui carregar o Centro de Operações.
          <br />
          Detalhe técnico: {erro instanceof Error ? erro.message : String(erro)}
        </div>
      </div>
    );
  }

  const { alertas, insights, acoes, oportunidades, riscos, resumoFrota, prioridadesDoDia } = resultado;

  const prioridadeAlertas: FilaDeTrabalho['prioridade'] =
    alertas.length === 0 ? null : alertas.some((a) => a.severidade === 'critico') ? 'critica' : 'media';

  const filas = filasResultado.filas.map((fila) =>
    fila.chave === 'alertas' ? { ...fila, quantidade: alertas.length, prioridade: prioridadeAlertas } : fila
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Centro de Operações</h1>
        <p className="mt-1 text-sm text-neutral-500">
          O que precisa acontecer agora em toda a operação — veículos, motoristas, contratos e financeiro — em um
          lugar só. Clique em qualquer número pra resolver.
        </p>
      </div>

      <FilasDeTrabalhoWidget filas={filas} />

      <PrioridadesDoDiaWidget itens={prioridadesDoDia} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AcoesOperacionaisWidget />
        <div id="alertas-secao">
          <AlertasWidget alertas={alertas} />
        </div>
        <OportunidadesWidget oportunidades={oportunidades} />
        <RiscosWidget riscos={riscos} />
        <ProximasAcoesWidget acoes={acoes} />
        <InsightsWidget insights={insights} />
        <ResumoFrotaWidget resumo={resumoFrota} />
        <VeiculosListWidget tom="critico" itens={resumoFrota.veiculosCriticos} />
        <VeiculosListWidget tom="destaque" itens={resumoFrota.veiculosDestaque} />
      </div>
    </div>
  );
}
