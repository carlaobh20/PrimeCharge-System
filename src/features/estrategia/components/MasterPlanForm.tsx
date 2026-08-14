import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { usePoliticasEstrategicas, useSalvarPoliticas } from '../hooks/usePoliticas';
import { LINHAS_DE_NEGOCIO_FUTURAS, LABEL_LINHA_DE_NEGOCIO, type LinhaDeNegocioFutura } from '../types';

// Épico 3, Missão 1 — Planejamento Mestre, primeira fatia. Deliberadamente SEM meta numérica
// de frota obrigatória (Carlos pediu pra não travar num número fixo — quer que o sistema
// nasça preparado pra simular crescimento grande, não comprometido com um alvo de curto
// prazo). Metas quantitativas (faturamento/lucro desejado) continuam morando em `metas`
// (Missão 5, BOS) — não duplicadas aqui. Esta tela junta só o que ainda não tinha lugar:
// Missão/Visão em texto e o checklist de frentes futuras.
export function MasterPlanForm() {
  const { data: usuario } = useCurrentUsuario();
  const { data: politicas, isLoading } = usePoliticasEstrategicas();
  const salvar = useSalvarPoliticas(usuario?.empresa_id ?? undefined, usuario?.id);

  const [missao, setMissao] = useState('');
  const [visao, setVisao] = useState('');
  const [linhas, setLinhas] = useState<LinhaDeNegocioFutura[]>([]);

  useEffect(() => {
    if (!politicas) return;
    setMissao(politicas.missao ?? '');
    setVisao(politicas.visao ?? '');
    setLinhas(politicas.linhas_de_negocio_futuras ?? []);
  }, [politicas]);

  if (isLoading) {
    return <div className="h-64 cockpit-shimmer rounded-2xl" />;
  }

  function toggleLinha(linha: LinhaDeNegocioFutura) {
    setLinhas((prev) => (prev.includes(linha) ? prev.filter((l) => l !== linha) : [...prev, linha]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    salvar.mutate(
      { missao: missao.trim() || null, visao: visao.trim() || null, linhas_de_negocio_futuras: linhas },
      {
        onSuccess: () => toast.success('Planejamento salvo.'),
        onError: (err) => toast.error('Não foi possível salvar.', extrairMensagemTecnicaDeErro(err)),
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Compass className="h-4 w-4 text-neutral-400" />
          Missão, visão e frentes futuras
        </CardTitle>
        <p className="text-xs text-neutral-500">Nada aqui é obrigatório — o que você não definir fica em branco.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="missao">Missão da empresa</Label>
            <textarea
              id="missao"
              value={missao}
              onChange={(e) => setMissao(e.target.value)}
              rows={2}
              placeholder="Por que a PrimeCharge existe?"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <Label htmlFor="visao">Visão de futuro</Label>
            <textarea
              id="visao"
              value={visao}
              onChange={(e) => setVisao(e.target.value)}
              rows={2}
              placeholder="Onde você quer que a PrimeCharge chegue?"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <Label>Frentes que você está considerando pro futuro (marque as que fizerem sentido, mesmo que "talvez")</Label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LINHAS_DE_NEGOCIO_FUTURAS.map((linha) => (
                <label key={linha} className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-white/10">
                  <input type="checkbox" checked={linhas.includes(linha)} onChange={() => toggleLinha(linha)} />
                  {LABEL_LINHA_DE_NEGOCIO[linha]}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={salvar.isPending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {salvar.isPending ? 'Salvando…' : 'Salvar planejamento'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
