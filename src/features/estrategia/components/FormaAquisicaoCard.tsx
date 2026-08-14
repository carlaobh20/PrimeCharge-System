import type { ReactNode } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { FORMAS_AQUISICAO, LABEL_FORMA_AQUISICAO, type CenarioSimulacaoInput, type FormaAquisicao } from '../types';

// Auditoria "Simulador Financeiro — Visão Executiva" (2026-08-13), Parte 2/3. Antes desta missão
// só existiam os campos "Entrada" e "Valor financiado" — pra simular compra à vista, o dono
// precisava digitar o preço cheio em "Entrada" e zerar "Financiado", sem a tela nunca explicar
// isso. "Preço do veículo" NÃO é uma coluna nova (a auditoria confirmou: preço = entrada +
// financiado sempre bateu, nos dois modos) — aqui ele é só a forma como o dono ENXERGA e EDITA o
// que já existe. Nunca guardamos "preço" separado — cada onChange recalcula
// valor_entrada_por_veiculo/valor_financiado_por_veiculo, que continuam sendo os únicos dois
// campos persistidos (mesmo padrão de sempre, sem segunda fonte de verdade).
//
// forma_aquisicao (migration 0038) só decide QUAIS campos aparecem — não entra em nenhuma fórmula
// financeira (o motor não olha pra ela; capital_investido = valor_entrada_por_veiculo nos dois
// casos, ver simulacaoEmpresarial.ts).
function precoAtual(valor: CenarioSimulacaoInput): number {
  return valor.valor_entrada_por_veiculo + valor.valor_financiado_por_veiculo;
}

function CampoMoeda({ valor, onChange, id }: { valor: number; onChange: (v: number) => void; id: string }) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      className="h-7 min-w-0 px-1.5 text-right text-xs"
      value={formatarMoedaInput(valor)}
      onChange={(e) => onChange(digitosParaReais(e.target.value))}
    />
  );
}

function Linha({ label, children, sufixo = 'R$' }: { label: string; children: ReactNode; sufixo?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs font-normal text-neutral-500">{label}</Label>
      <div className="flex w-36 shrink-0 items-center gap-1">
        {children}
        <span className="w-10 shrink-0 text-[10px] text-neutral-400">{sufixo}</span>
      </div>
    </div>
  );
}

export function FormaAquisicaoCard({ valor, onChange }: { valor: CenarioSimulacaoInput; onChange: (patch: Partial<CenarioSimulacaoInput>) => void }) {
  const preco = precoAtual(valor);
  const avista = valor.forma_aquisicao === 'avista';

  function mudarForma(forma: FormaAquisicao) {
    if (forma === 'avista') {
      // Preserva o preço atual (entrada + financiado) inteiro como capital próprio — nenhum
      // dinheiro "some" ao trocar de modo, só muda quem ele representa.
      onChange({ forma_aquisicao: forma, valor_entrada_por_veiculo: preco, valor_financiado_por_veiculo: 0 });
    } else {
      onChange({ forma_aquisicao: forma });
    }
  }

  function mudarPreco(novoPreco: number) {
    if (avista) {
      onChange({ valor_entrada_por_veiculo: novoPreco });
    } else {
      // Entrada fica como está; financiado absorve a diferença — mesma regra da Parte 3 da
      // missão ("financiamento = preço − entrada"), nunca editável direto.
      onChange({ valor_financiado_por_veiculo: Math.max(0, novoPreco - valor.valor_entrada_por_veiculo) });
    }
  }

  function mudarEntrada(novaEntrada: number) {
    onChange({ valor_entrada_por_veiculo: novaEntrada, valor_financiado_por_veiculo: Math.max(0, preco - novaEntrada) });
  }

  return (
    <Card className="mb-3 break-inside-avoid">
      <CardContent className="py-2.5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Compra do veículo</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-normal text-neutral-500">Forma de aquisição</Label>
            <div className="flex gap-1.5">
              {FORMAS_AQUISICAO.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => mudarForma(f)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    valor.forma_aquisicao === f ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                  }`}
                >
                  {LABEL_FORMA_AQUISICAO[f]}
                </button>
              ))}
            </div>
          </div>

          <Linha label="Preço do veículo">
            <CampoMoeda id="preco_veiculo" valor={preco} onChange={mudarPreco} />
          </Linha>

          {avista ? (
            <Linha label="Capital próprio utilizado">
              <span className="w-full text-right text-xs text-neutral-500">{formatMoeda(preco)}</span>
            </Linha>
          ) : (
            <>
              <Linha label="Entrada">
                <CampoMoeda id="valor_entrada_por_veiculo" valor={valor.valor_entrada_por_veiculo} onChange={mudarEntrada} />
              </Linha>
              <Linha label="Valor financiado">
                <span className="w-full text-right text-xs text-neutral-500">{formatMoeda(valor.valor_financiado_por_veiculo)}</span>
              </Linha>
              <Linha label="Prazo" sufixo="meses">
                <Input
                  id="prazo_financiamento_meses"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  className="h-7 min-w-0 px-1.5 text-right text-xs"
                  value={valor.prazo_financiamento_meses ?? ''}
                  onChange={(e) => onChange({ prazo_financiamento_meses: e.target.value === '' ? 0 : Math.round(Number(e.target.value)) })}
                />
              </Linha>
              <Linha label="Juros" sufixo="% a.m.">
                <Input
                  id="taxa_juros_am_pct"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className="h-7 min-w-0 px-1.5 text-right text-xs"
                  value={valor.taxa_juros_am_pct ?? ''}
                  onChange={(e) => onChange({ taxa_juros_am_pct: e.target.value === '' ? 0 : Number(e.target.value) })}
                />
              </Linha>
            </>
          )}
        </div>
        {avista && (
          <p className="mt-2 border-t border-neutral-100 pt-2 text-[11px] leading-snug text-neutral-400 dark:border-white/5">
            Sem financiamento: o carro entra no patrimônio pelo preço cheio e o caixa sai integralmente na compra.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
