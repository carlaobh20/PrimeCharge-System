import {
  AlertTriangle,
  ClipboardList,
  FileText,
  ParkingCircle,
  Receipt,
  RefreshCw,
  Siren,
  Truck,
  UserX,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { QueueCard } from '../cards/QueueCard';
import type { FilaDeTrabalho } from '../hooks/useFilasDeTrabalho';

const ICONE: Record<string, LucideIcon> = {
  entregas: Truck,
  devolucoes: Truck,
  manutencoes: Wrench,
  multas: Siren,
  documentos: FileText,
  financeiro: Wallet,
  cobrancas: Receipt,
  renovacoes: RefreshCw,
  'veiculos-parados': ParkingCircle,
  'motoristas-bloqueados': UserX,
  checklists: ClipboardList,
  alertas: AlertTriangle,
};

// Cada fila fala de um jeito diferente sobre "dias" — prazo vencendo não é o mesmo que
// checklist aberto há tempo, que não é o mesmo que "aproximação por falta de tracking real de
// status" (ver comentário em useFilasDeTrabalho.ts sobre veiculos-parados/motoristas-bloqueados).
const CONTEXTO_DIAS: Record<string, (dias: number) => string> = {
  entregas: (d) => `aberto há ${d} dia(s)`,
  devolucoes: (d) => `aberto há ${d} dia(s)`,
  manutencoes: (d) => (d < 0 ? `${Math.abs(d)} dia(s) atrasado` : `em ${d} dia(s)`),
  multas: (d) => (d < 0 ? `${Math.abs(d)} dia(s) atrasado` : `vence em ${d} dia(s)`),
  documentos: (d) => (d < 0 ? `${Math.abs(d)} dia(s) vencido` : `vence em ${d} dia(s)`),
  cobrancas: (d) => (d < 0 ? `${Math.abs(d)} dia(s) atrasado` : `vence em ${d} dia(s)`),
  renovacoes: (d) => (d < 0 ? `${Math.abs(d)} dia(s) vencido` : `vence em ${d} dia(s)`),
  'veiculos-parados': (d) => `aprox. ${d} dia(s) sem mudança de status`,
  'motoristas-bloqueados': (d) => `aprox. ${d} dia(s) bloqueado`,
  checklists: (d) => `aberto há ${d} dia(s)`,
};

// Centro de Operações (Épico 1) — a grid de 12 filas é o "coração" pedido na missão: cada
// card mostra quantidade/prioridade/impacto/dias e clica direto pro filtro certo (ver
// useFilasDeTrabalho.ts pro porquê de calcular ao vivo em vez de ler acoes_operacionais, e
// pras limitações de precisão de link conhecidas — Entregas/Devoluções/Checklists hoje
// convergem pro mesmo link de /operacoes/acoes, porque não existe uma página de checklists
// própria ainda; ver relatório final do Épico 1 pra lista completa de gaps).
export function FilasDeTrabalhoWidget({ filas }: { filas: FilaDeTrabalho[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {filas.map((fila) => (
        <QueueCard key={fila.chave} fila={fila} icon={ICONE[fila.chave] ?? ClipboardList} contextoDias={CONTEXTO_DIAS[fila.chave]} />
      ))}
    </div>
  );
}
