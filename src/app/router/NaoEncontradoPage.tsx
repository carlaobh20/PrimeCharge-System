import { Link } from 'react-router-dom';

// 404 — rota desconhecida. Neutra o suficiente pra servir tanto ao painel admin quanto ao
// portal do motorista (não assume qual dos dois); o link "/" cai no guard certo por role.
export function NaoEncontradoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-3xl font-semibold text-neutral-300 dark:text-neutral-700">404</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">Página não encontrada.</p>
      <Link to="/" className="mt-2 text-sm font-medium text-emerald-600 hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}
