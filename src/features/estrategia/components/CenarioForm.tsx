import { useEffect, useState } from 'react';
import { ArrowDown, Rocket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { useCenarioSimulacao, useSalvarCenarioSimulacao } from '../hooks/useSimulacao';
import type { CenarioSimulacaoInput } from '../types';

type CampoNumerico = Exclude<keyof CenarioSimulacaoInput, 'reinvestir_lucro'>;

const CAMPOS: { chave: CampoNumerico; label: string; sufixo?: string }[] = [
  { chave: 'capital_disponivel', label: 'Capital disponível', sufixo: 'R$' },
  { chave: 'veiculos_iniciais', label: 'Pretendo comprar', sufixo: 'veículos' },
  { chave: 'valor_entrada_por_veiculo', label: 'Valor de entrada (por veículo)', sufixo: 'R$' },
  { chave: 'valor_financiado_por_veiculo', label: 'Valor financiado (por veículo)', sufixo: 'R$' },
  { chave: 'taxa_juros_am_pct', label: 'Taxa de juros', sufixo: '% ao mês' },
  { chave: 'prazo_financiamento_meses', label: 'Prazo do financiamento', sufixo: 'meses' },
  { chave: 'seguro_mensal_por_veiculo', label: 'Seguro (por veículo)', sufixo: 'R$/mês' },
  { chave: 'ipva_anual_por_veiculo', label: 'IPVA (por veículo)', sufixo: 'R$/ano' },
  { chave: 'aluguel_esperado_mensal_por_veiculo', label: 'Valor esperado do aluguel (por veículo)', sufixo: 'R$/mês' },
  { chave: 'ocupacao_esperada_pct', label: 'Taxa de ocupação esperada', sufixo: '%' },
  { chave: 'inadimplencia_esperada_pct', label: 'Inadimplência esperada', sufixo: '%' },
  { chave: 'objetivo_veiculos', label: 'Objetivo', sufixo: 'veículos' },
  { chave: 'prazo_desejado_meses', label: 'Prazo desejado', sufixo: 'meses' },
];

// Épico 3 — Simulação Empresarial. Formulário deliberadamente em sequência única (não é uma
// tabela de configurações genérica) — segue exatamente a ordem que o Carlos desenhou, pra
// simular a "história sendo contada" desde o preenchimento: tenho X capital → pretendo comprar Y
// veículos → ... → objetivo → prazo. "Reinvestir lucro" fica destacado como pergunta SIM/NÃO,
// não como mais um campo numérico da lista.
export function CenarioForm() {
  const { data: usuario } = useCurrentUsuario();
  const { data: cenario, isLoading } = useCenarioSimulacao();
  const salvar = useSalvarCenarioSimulacao(usuario?.empresa_id ?? undefined, usuario?.id);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [reinvestirLucro, setReinvestirLucro] = useState(true);

  useEffect(() => {
    if (!cenario) return;
    const iniciais: Record<string, string> = {};
    for (const { chave } of CAMPOS) {
      iniciais[chave] = String(cenario[chave] ?? '');
    }
    setValores(iniciais);
    setReinvestirLucro(cenario.reinvestir_lucro);
  }, [cenario]);

  if (isLoading) {
    return <div className="h-96 cockpit-shimmer rounded-2xl" />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const faltando = CAMPOS.filter(({ chave }) => !valores[chave]?.trim());
    if (faltando.length > 0) {
      toast.error('Preencha todos os campos.', `Faltando: ${faltando.map((f) => f.label).join(', ')}`);
      return;
    }

    const numeros: Record<string, number> = {};
    for (const { chave } of CAMPOS) {
      numeros[chave] = Number(valores[chave]);
    }
    const payload = { ...numeros, reinvestir_lucro: reinvestirLucro } as unknown as CenarioSimulacaoInput;

    salvar.mutate(payload, {
      onSuccess: () => toast.success('Cenário simulado.'),
      onError: (err) => toast.error('Não foi possível simular.', extrairMensagemTecnicaDeErro(err)),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Rocket className="h-4 w-4 text-neutral-400" />
          Construa a estratégia da PrimeCharge
        </CardTitle>
        <p className="text-xs text-neutral-500">
          Responda na ordem — no final, clique em Simular e veja a história do crescimento da empresa.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-1">
          {CAMPOS.map(({ chave, label, sufixo }, i) => (
            <div key={chave}>
              <div className="flex items-end gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <Label htmlFor={chave}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={chave}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={valores[chave] ?? ''}
                      onChange={(e) => setValores((prev) => ({ ...prev, [chave]: e.target.value }))}
                    />
                    {sufixo && <span className="shrink-0 text-xs text-neutral-400">{sufixo}</span>}
                  </div>
                </div>
              </div>
              {i < CAMPOS.length - 1 && (
                <div className="flex justify-start pl-3">
                  <ArrowDown className="my-1 h-3.5 w-3.5 text-neutral-300 dark:text-neutral-700" />
                </div>
              )}
            </div>
          ))}

          <div className="!mt-4 flex items-end gap-3 border-t border-neutral-100 pt-4 dark:border-white/5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              ?
            </span>
            <div className="flex-1">
              <Label>Reinvestir o lucro na compra de novos veículos?</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReinvestirLucro(true)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${reinvestirLucro ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setReinvestirLucro(false)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!reinvestirLucro ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={salvar.isPending}
              className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {salvar.isPending ? 'Simulando…' : 'Simular'}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
