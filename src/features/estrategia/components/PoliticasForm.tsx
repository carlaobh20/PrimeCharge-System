import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { usePoliticasEstrategicas, useSalvarPoliticas } from '../hooks/usePoliticas';
import { CAMPOS_POLITICAS_TIPADOS, LABEL_POLITICA, type PoliticasEmpresaInput } from '../types';

// Épico 2 — Fase 2. "Regras da Empresa" (brief original) / "DNA da RodaVolt" (ajuste de
// modelagem pedido antes da migration, ver supabase/migrations/0014_epico2_politicas_empresa.sql):
// o proprietário define aqui os limites que toda recomendação futura (Radar de Oportunidades,
// Comitê de Investimentos, Motor de Recomendações) vai precisar respeitar. Nenhum campo é
// obrigatório — política não definida fica em branco/null (DEC-022, honestidade de dado), não
// um valor default inventado.
export function PoliticasForm() {
  const { data: usuario } = useCurrentUsuario();
  const { data: politicas, isLoading } = usePoliticasEstrategicas();
  const salvar = useSalvarPoliticas(usuario?.empresa_id ?? undefined, usuario?.id);

  const [valores, setValores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!politicas) return;
    const iniciais: Record<string, string> = {};
    for (const campo of CAMPOS_POLITICAS_TIPADOS) {
      const v = politicas[campo];
      iniciais[campo] = v === null ? '' : String(v);
    }
    setValores(iniciais);
  }, [politicas]);

  if (isLoading) {
    return <div className="h-64 cockpit-shimmer rounded-2xl" />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: PoliticasEmpresaInput = {};
    for (const campo of CAMPOS_POLITICAS_TIPADOS) {
      const texto = valores[campo]?.trim();
      payload[campo] = texto ? Number(texto) : null;
    }
    salvar.mutate(payload, {
      onSuccess: () => toast.success('Políticas salvas.'),
      onError: (err) => toast.error('Não foi possível salvar.', extrairMensagemTecnicaDeErro(err)),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-neutral-400" />
          Políticas da empresa
        </CardTitle>
        <p className="text-xs text-neutral-500">
          Deixe em branco o que você ainda não quer definir — nunca preenchemos um limite sozinhos.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS_POLITICAS_TIPADOS.map((campo) => (
            <div key={campo}>
              <Label htmlFor={campo}>{LABEL_POLITICA[campo]}</Label>
              <Input
                id={campo}
                type="number"
                step="0.1"
                inputMode="decimal"
                value={valores[campo] ?? ''}
                onChange={(e) => setValores((prev) => ({ ...prev, [campo]: e.target.value }))}
                placeholder="Não definido"
              />
            </div>
          ))}

          <div className="col-span-full flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={salvar.isPending}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {salvar.isPending ? 'Salvando…' : 'Salvar políticas'}
            </button>
            {politicas?.atualizado_em && (
              <span className="text-xs text-neutral-400">Última atualização: {new Date(politicas.atualizado_em).toLocaleString('pt-BR')}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
