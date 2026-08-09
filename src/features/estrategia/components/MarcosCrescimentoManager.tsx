import { useState } from 'react';
import { Flag, Plus, Trash2, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import {
  useMarcosCrescimento,
  useCreateMarcoCrescimento,
  useUpdateMarcoCrescimento,
  useExcluirMarcoCrescimento,
  useCenarioSimulacao,
} from '../hooks/useSimulacao';
import { MARCOS_FROTA } from '../intelligence/growthTimeline';
import { TIPOS_GATILHO, LABEL_TIPO_GATILHO, type TipoGatilho } from '../types';

// Épico 3 — Simulação Empresarial. Cada marco é um evento importante da empresa (Contratar
// funcionário, Abrir lojinha, Comprar Wallbox, Franquear...) disparado por uma das 8 métricas
// que o Carlos pediu — inclusive "quantidade de veículos", que substitui o que antes seriam
// eventos fixos tipo "compra do 3º/5º/10º veículo": agora é só mais um marco cadastrado como
// qualquer outro, mesma tabela, mesmo motor (simulacaoEmpresarial.ts).
export function MarcosCrescimentoManager() {
  const { data: usuario } = useCurrentUsuario();
  const { data: marcos, isLoading } = useMarcosCrescimento();
  const { data: cenario } = useCenarioSimulacao();
  const criar = useCreateMarcoCrescimento(usuario?.empresa_id ?? undefined, usuario?.id);
  const atualizar = useUpdateMarcoCrescimento();
  const excluir = useExcluirMarcoCrescimento();

  const [nome, setNome] = useState('');
  const [tipoGatilho, setTipoGatilho] = useState<TipoGatilho>('veiculos');
  const [valorGatilho, setValorGatilho] = useState('');

  function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Dê um nome ao marco.');
      return;
    }
    if (tipoGatilho !== 'manual' && !valorGatilho.trim()) {
      toast.error('Informe o número que dispara este marco.');
      return;
    }
    criar.mutate(
      { nome: nome.trim(), tipo_gatilho: tipoGatilho, valor_gatilho: tipoGatilho === 'manual' ? null : Number(valorGatilho) },
      {
        onSuccess: () => {
          setNome('');
          setValorGatilho('');
          toast.success('Marco adicionado.');
        },
        onError: (err) => toast.error('Não foi possível adicionar.', extrairMensagemTecnicaDeErro(err)),
      }
    );
  }

  function sugerirMarcosDeFrota() {
    const teto = cenario?.objetivo_veiculos ?? 1000;
    const sugeridos = MARCOS_FROTA.filter((n) => n <= teto);
    for (const n of sugeridos) {
      criar.mutate({ nome: `${n}º veículo`, tipo_gatilho: 'veiculos', valor_gatilho: n, ordem: n });
    }
  }

  if (isLoading) {
    return <div className="h-48 cockpit-shimmer rounded-2xl" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Flag className="h-4 w-4 text-neutral-400" />
          Marcos de crescimento
        </CardTitle>
        <p className="text-xs text-neutral-500">
          Cada marco é um evento importante da empresa, disparado pela métrica que você escolher — não precisa ser só
          quantidade de veículos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdicionar} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="marco-nome">Nome do marco</Label>
            <Input id="marco-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Abrir lojinha" />
          </div>
          <div className="min-w-[200px]">
            <Label htmlFor="marco-tipo">Disparado por</Label>
            <Select id="marco-tipo" value={tipoGatilho} onChange={(e) => setTipoGatilho(e.target.value as TipoGatilho)}>
              {TIPOS_GATILHO.map((t) => (
                <option key={t} value={t}>
                  {LABEL_TIPO_GATILHO[t]}
                </option>
              ))}
            </Select>
          </div>
          {tipoGatilho !== 'manual' && (
            <div className="w-32">
              <Label htmlFor="marco-valor">Valor</Label>
              <Input id="marco-valor" type="number" step="0.01" value={valorGatilho} onChange={(e) => setValorGatilho(e.target.value)} />
            </div>
          )}
          <button
            type="submit"
            disabled={criar.isPending}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </form>

        {(marcos?.length ?? 0) === 0 && (
          <button
            type="button"
            onClick={sugerirMarcosDeFrota}
            className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sugerir marcos de frota (1, 5, 10, 20, 50, 100...)
          </button>
        )}

        {marcos && marcos.length > 0 && (
          <div className="space-y-1.5">
            {marcos.map((marco) => (
              <div
                key={marco.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{marco.nome}</span>
                  <span className="text-xs text-neutral-400">
                    {LABEL_TIPO_GATILHO[marco.tipo_gatilho]}
                    {marco.valor_gatilho !== null && ` — ${marco.valor_gatilho}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {marco.tipo_gatilho === 'manual' && (
                    <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <input
                        type="checkbox"
                        checked={marco.concluido_manualmente}
                        onChange={(e) => atualizar.mutate({ id: marco.id, payload: { concluido_manualmente: e.target.checked } })}
                      />
                      Concluído
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => excluir.mutate(marco.id)}
                    className="text-neutral-400 transition-colors hover:text-red-600"
                    aria-label={`Remover ${marco.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
