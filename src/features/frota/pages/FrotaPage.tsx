import { useSearchParams } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { Tabs } from '@/shared/components/ui/tabs';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { FrotaDashboardPage } from './FrotaDashboardPage';
import { VeiculosListPage } from './VeiculosListPage';
import { ComparativoFrotaTab } from '../components/ComparativoFrotaTab';
import { CentroInteligenciaFrota } from '../components/inteligencia/CentroInteligenciaFrota';

// Épico 4 — menu "Frota" (substitui "Veículos"). O brief pede 5 sub-telas dentro do módulo
// (Dashboard da Frota / Todos os Veículos / Comparativo / Planejamento de Renovação /
// Inteligência da Frota). Em vez de inventar um padrão de submenu novo no AppLayout (que hoje
// só tem itens de nível único), reaproveita o MESMO componente Tabs já usado no Cockpit do
// Veículo — é a mesma ideia (uma "casca" com abas), só que no nível do módulo em vez do
// registro individual. Rota continua /veiculos, só o rótulo do menu muda pra "Frota" — evita
// quebrar link salvo/histórico do navegador (Palpite, flagado no relatório).
//
// Planejamento de Renovação (Fase D) e Inteligência da Frota ainda não têm dado real por trás
// nesta parte da missão — ficam como EmptyState em vez de tela em branco, mesmo padrão do
// resto do Cockpit (DEC-021). Comparativo (Fase A.4) já foi construído.
const ABAS_VALIDAS = new Set(['dashboard', 'todos', 'comparativo', 'renovacao', 'inteligencia']);

export function FrotaPage() {
  // Achado da auditoria: Centro de Operações linka pra "/veiculos?status=disponivel" (fila
  // "Veículos Parados" etc.) esperando cair direto na lista já filtrada — se a aba padrão
  // continuasse sendo "Dashboard", esse deep link quebraria silenciosamente (a querystring
  // seria ignorada porque VeiculosListPage nem estaria montada). Com `?status=` na URL, a aba
  // inicial vira "Todos os Veículos" em vez de "Dashboard".
  //
  // Épico 5 — `?tab=` explícito tem prioridade sobre `?status=` — usado por VerComparativoCTA
  // (Cockpit do Veículo → "/veiculos?tab=comparativo&destaque=<id>") pra abrir direto na aba
  // certa em vez de sempre cair no Dashboard.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const abaInicial = tabParam && ABAS_VALIDAS.has(tabParam) ? tabParam : searchParams.has('status') ? 'todos' : 'dashboard';

  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Frota</h1>
        <p className="mt-1 text-sm text-neutral-500">Cada veículo tratado como ativo financeiro da empresa.</p>
      </div>

      <div className="mt-6">
        {/* key={abaInicial}: Tabs guarda a aba ativa num useState interno lido só no mount
            (defaultValue), então mudar a querystring SEM remontar o componente (ex.: clicar
            num card "por status" do próprio Dashboard, que já está dentro desta árvore montada)
            mudava a URL mas não trocava a aba visível. Forçar remount quando abaInicial muda
            resolve isso — achado durante a auditoria antes de tornar os cards clicáveis. */}
        <Tabs
          key={abaInicial}
          defaultValue={abaInicial}
          items={[
            { value: 'dashboard', label: 'Dashboard da Frota', content: <FrotaDashboardPage /> },
            { value: 'todos', label: 'Todos os Veículos', content: <VeiculosListPage /> },
            { value: 'comparativo', label: 'Comparativo de Veículos', content: <ComparativoFrotaTab /> },
            {
              value: 'renovacao',
              label: 'Planejamento de Renovação',
              content: (
                <EmptyState
                  icon={CalendarClock}
                  title="Planejamento de Renovação em construção"
                  description="Projeção de depreciação e recomendação de renovação ainda não foram construídas nesta parte da missão."
                  className="mb-8"
                />
              ),
            },
            {
              // Fase 20 — Módulo 9: primeira UI real (localização/presença/mapa). Histórico/
              // oportunidade (Módulos 15/16) seguem bloqueados por RLS (motorista_corridas/
              // motorista_ganhos são privacidade invertida — ver auditoria, seção 0) e por isso
              // ainda não têm seção própria aqui; nada foi fabricado pra preencher esse espaço.
              value: 'inteligencia',
              label: 'Inteligência da Frota',
              content: <CentroInteligenciaFrota />,
            },
          ]}
        />
      </div>
    </div>
  );
}
