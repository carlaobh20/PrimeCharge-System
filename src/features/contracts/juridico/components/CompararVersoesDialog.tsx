import { useMemo, useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Select } from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import { diffCondicoes, diffLinhas, resumoDiff } from '../diff';
import type { ContratoVersao } from '../types';

// Comparação VERSÃO × VERSÃO (regra 16): primeiro as CONDIÇÕES que mudaram (diff do snapshot,
// legível pra operação), depois o diff textual linha a linha do corpo (visão documento).
export function CompararVersoesDialog({
  open,
  onOpenChange,
  versoes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versoes: ContratoVersao[]; // ordenadas numero desc
}) {
  const [idA, setIdA] = useState<string>('');
  const [idB, setIdB] = useState<string>('');

  const a = versoes.find((v) => v.id === (idA || versoes[1]?.id));
  const b = versoes.find((v) => v.id === (idB || versoes[0]?.id));

  const mudancas = useMemo(() => (a && b ? diffCondicoes(a.snapshot, b.snapshot) : []), [a, b]);
  const linhas = useMemo(() => (a && b ? diffLinhas(a.corpo ?? '', b.corpo ?? '') : []), [a, b]);
  const resumo = useMemo(() => resumoDiff(linhas), [linhas]);

  const rotulo = (v: ContratoVersao | undefined) => (v ? (v.rotulo ?? `v${v.numero}`) : '—');
  // esconder da comparação as chaves internas (_meta.*)
  const mudancasVisiveis = mudancas.filter((m) => !m.campo.startsWith('_meta.'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Comparar versões" className="max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <Select value={a?.id ?? ''} onChange={(e) => setIdA(e.target.value)} className="max-w-[180px]">
          {versoes.map((v) => (
            <option key={v.id} value={v.id}>
              {rotulo(v)} ({v.status})
            </option>
          ))}
        </Select>
        <span className="text-sm text-neutral-500">→</span>
        <Select value={b?.id ?? ''} onChange={(e) => setIdB(e.target.value)} className="max-w-[180px]">
          {versoes.map((v) => (
            <option key={v.id} value={v.id}>
              {rotulo(v)} ({v.status})
            </option>
          ))}
        </Select>
        <span className="ml-auto text-xs text-neutral-500">
          {resumo.removidas} linha(s) removida(s) · {resumo.adicionadas} adicionada(s)
        </span>
      </div>

      {a && b && a.id === b.id && <p className="text-sm text-neutral-500">Selecione duas versões diferentes.</p>}

      {a && b && a.id !== b.id && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Condições que mudaram</h3>
            {mudancasVisiveis.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhuma condição do snapshot mudou entre {rotulo(a)} e {rotulo(b)}.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 uppercase text-neutral-500 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2">Campo</th>
                      <th className="px-3 py-2">{rotulo(a)}</th>
                      <th className="px-3 py-2">{rotulo(b)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mudancasVisiveis.map((m) => (
                      <tr key={m.campo} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">{m.campo}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">{m.antes || '—'}</td>
                        <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">{m.depois || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Documento (linha a linha)</h3>
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-neutral-200 font-mono text-[11px] leading-relaxed dark:border-neutral-800">
              {linhas.map((l, i) =>
                l.tipo === 'igual' ? null : (
                  <div
                    key={i}
                    className={cn(
                      'whitespace-pre-wrap px-3 py-0.5',
                      l.tipo === 'removida'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
                    )}
                  >
                    {l.tipo === 'removida' ? '− ' : '+ '}
                    {l.texto || ' '}
                  </div>
                ),
              )}
              {resumo.removidas === 0 && resumo.adicionadas === 0 && (
                <p className="px-3 py-2 text-neutral-500">Os corpos das duas versões são idênticos.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
