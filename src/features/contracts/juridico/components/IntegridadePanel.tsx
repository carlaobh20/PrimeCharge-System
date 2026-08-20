import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatDataSimples } from '@/shared/lib/format';
import type { ContratoVersao } from '../types';
import { hashCorpo } from '../lib';

// INTEGRIDADE DO DOCUMENTO (Fase S): recalcula o SHA-256 do corpo armazenado e compara com o
// hash congelado. Divergência = ALERTA CRÍTICO — o sistema NUNCA corrige silenciosamente
// (se o banco foi adulterado por fora da aplicação, isso precisa aparecer, não sumir).
// O hash oficial continua sendo um só: SHA-256 do corpo congelado (decisão da 0042).
export function IntegridadePanel({ versao }: { versao: ContratoVersao }) {
  const verificacao = useQuery({
    queryKey: ['juridico', 'integridade', versao.id, versao.hash_sha256],
    enabled: !!versao.corpo && !!versao.hash_sha256,
    queryFn: async () => {
      const recalculado = await hashCorpo(versao.corpo!);
      return { recalculado, integro: recalculado === versao.hash_sha256 };
    },
  });

  if (!versao.hash_sha256 || !versao.corpo) {
    return (
      <p className="text-[11px] text-neutral-400">
        Integridade: sem hash registrado ainda (documento não congelado).
      </p>
    );
  }
  if (verificacao.isLoading) return <p className="text-[11px] text-neutral-400">Verificando integridade…</p>;

  if (verificacao.data?.integro) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Íntegro — SHA-256 do corpo confere com o hash congelado
        {versao.congelada_em && ` (congelado em ${formatDataSimples(versao.congelada_em)})`}.
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-900/20"
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
        <ShieldAlert className="h-4 w-4" aria-hidden /> ALERTA CRÍTICO DE INTEGRIDADE
      </p>
      <p className="mt-1 text-[11px] leading-snug text-red-700 dark:text-red-400">
        O SHA-256 recalculado do corpo NÃO confere com o hash congelado — o conteúdo pode ter sido
        alterado fora do fluxo do sistema. Nada foi corrigido automaticamente. Preserve os dados e
        investigue pela auditoria.
      </p>
      <p className="mt-1 break-all font-mono text-[9px] text-red-500">
        esperado: {versao.hash_sha256}
        <br />
        recalculado: {verificacao.data?.recalculado}
      </p>
    </div>
  );
}
