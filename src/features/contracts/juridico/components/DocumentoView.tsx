import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { markdownParaHtml } from '../markdown';
import { AVISO_MINUTA } from '../minutaLib';

// Renderização do documento contratual (markdown congelado -> HTML). O HTML sai do NOSSO
// serializador com todo texto escapado (ver markdown.ts) — o dangerouslySetInnerHTML aqui é
// seguro por construção; nenhum conteúdo do usuário vira tag.
//
// Regra 18: documento congelado exibe o selo 🔒 de forma inequívoca.
// Regra 35: enquanto o template não for formalmente aprovado, o aviso de minuta fica visível.
export function DocumentoView({
  corpo,
  congelada,
  templateAprovado,
}: {
  corpo: string;
  congelada: boolean;
  templateAprovado: boolean;
}) {
  const html = useMemo(() => markdownParaHtml(corpo), [corpo]);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {congelada && (
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <Lock className="h-3.5 w-3.5" />
          Documento congelado — imutável. Alterações exigem nova versão.
        </div>
      )}
      {!templateAprovado && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
          {AVISO_MINUTA}
        </div>
      )}
      <div
        className="doc-juridico max-h-[70vh] overflow-y-auto px-8 py-6 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_hr]:my-4 [&_hr]:border-neutral-200 dark:[&_hr]:border-neutral-800 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:text-justify [&_ul]:mb-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
