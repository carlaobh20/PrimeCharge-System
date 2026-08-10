import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { calcularResumoFinanciamentoReal } from '../../intelligence/financiamentoReal';
import {
  SISTEMA_AMORTIZACAO_LABEL,
  TIPOS_AQUISICAO_COM_FINANCIAMENTO,
  TIPO_AQUISICAO_LABEL,
  type Veiculo,
} from '../../types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-800 dark:text-neutral-200">{value}</dd>
    </div>
  );
}

// Épico 4 — "Ativo Financeiro", Parte 1 (2026-08-10). Aba nova no Cockpit: concentra tudo sobre
// o NASCIMENTO do ativo — Compra + Financiamento — num lugar só, em vez de espalhado. Bloco
// Compra reaproveita campos que já existiam (valor_compra/valor_fipe/data_compra/
// tipo_aquisicao, ver Dados Gerais) + fornecedor (novo, migration 0020) — mostrados aqui de
// novo, lado a lado com Financiamento, porque juntos é que respondem "como este ativo nasceu".
//
// O resumo do financiamento (saldo devedor/parcela atual/quitação) é só um teaser — o gráfico
// completo (Fluxo do Financiamento) é a Parte 2 da mesma missão, ainda não construída.
export function AquisicaoTab({ veiculo }: { veiculo: Veiculo }) {
  const temFinanciamento = TIPOS_AQUISICAO_COM_FINANCIAMENTO.includes(veiculo.tipo_aquisicao);
  const resumo = temFinanciamento ? calcularResumoFinanciamentoReal(veiculo) : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Compra</h3>
        <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
          <Field label="Forma de aquisição" value={TIPO_AQUISICAO_LABEL[veiculo.tipo_aquisicao]} />
          <Field label="Valor de compra" value={formatMoeda(veiculo.valor_compra)} />
          <Field label="FIPE" value={formatMoeda(veiculo.valor_fipe)} />
          <Field label="Fornecedor" value={veiculo.fornecedor ?? '—'} />
          <Field label="Data da compra" value={veiculo.data_compra ? formatDataSimples(veiculo.data_compra) : '—'} />
        </dl>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Financiamento</h3>
        {!temFinanciamento ? (
          <p className="mt-2 text-sm text-neutral-400">Aquisição por compra direta — sem financiamento.</p>
        ) : (
          <>
            <dl className="mt-2 divide-y divide-neutral-100 dark:divide-white/5">
              <Field label="Banco" value={veiculo.banco ?? '—'} />
              <Field label="Entrada" value={formatMoeda(veiculo.valor_entrada)} />
              <Field label="Valor financiado" value={formatMoeda(veiculo.valor_financiado)} />
              <Field label="Taxa" value={veiculo.taxa_juros_am_pct !== null ? `${veiculo.taxa_juros_am_pct}% a.m.` : '—'} />
              <Field label="Prazo" value={veiculo.prazo_financiamento_meses !== null ? `${veiculo.prazo_financiamento_meses} meses` : '—'} />
              <Field label="Sistema" value={veiculo.sistema_amortizacao ? SISTEMA_AMORTIZACAO_LABEL[veiculo.sistema_amortizacao] : '—'} />
              <Field
                label="Primeiro vencimento"
                value={veiculo.primeiro_vencimento_financiamento ? formatDataSimples(veiculo.primeiro_vencimento_financiamento) : '—'}
              />
            </dl>

            {!resumo ? (
              <p className="mt-3 text-[11px] text-neutral-400">
                Preencha valor financiado, taxa, prazo, sistema e primeiro vencimento pra ver saldo devedor e parcela atual.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-sm dark:border-white/5">
                <div>
                  <p className="text-xs text-neutral-400">Saldo devedor atual</p>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(resumo.saldoDevedorAtual)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">{resumo.quitado ? 'Quitado' : 'Parcela atual'}</p>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {resumo.quitado ? '✓' : formatMoeda(resumo.parcelaAtual)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Já pago</p>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatMoeda(resumo.totalPago)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">{resumo.quitado ? 'Quitado em' : 'Quitação prevista'}</p>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">{formatDataSimples(resumo.quitacaoPrevista)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
