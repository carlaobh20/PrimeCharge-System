import { Link } from 'react-router-dom';
import { FileText, FileCheck2, ClipboardCheck, LifeBuoy, User, Bell, ChevronRight, type LucideIcon } from 'lucide-react';

// Épico 11 — App do Motorista. Tela "Mais": índice de navegação para as áreas menos frequentes.
// Alvos de toque grandes, um link por linha.

type ItemMenu = { to: string; icon: LucideIcon; label: string };

const ITENS: ItemMenu[] = [
  { to: '/motorista/contrato', icon: FileText, label: 'Contrato' },
  { to: '/motorista/documentos', icon: FileCheck2, label: 'Documentos' },
  { to: '/motorista/vistorias', icon: ClipboardCheck, label: 'Vistorias' },
  { to: '/motorista/notificacoes', icon: Bell, label: 'Notificações' },
  { to: '/motorista/suporte', icon: LifeBuoy, label: 'Suporte' },
  { to: '/motorista/perfil', icon: User, label: 'Perfil' },
];

function ItemNavegacao({ item }: { item: ItemMenu }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.label}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-neutral-400" />
    </Link>
  );
}

export function MaisPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mais</h1>
      <div className="space-y-3">
        {ITENS.map((item) => (
          <ItemNavegacao key={item.to} item={item} />
        ))}
      </div>
    </div>
  );
}
