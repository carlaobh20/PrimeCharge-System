import { useState } from 'react';
import { Secao } from '../ui';
import {
  calcularMeta,
  formatBRL,
  formatHoras,
  normalizarMensal,
  type GrupoDespesa,
  type PeriodicidadeDespesa,
} from '../../lib/metas';

// ONBOARDING PROGRESSIVO (Módulos 29/30): uma pergunta por vez, nunca planilha. Cada resposta
// mostra o impacto no custo mensal. Termina no momento WOW: custo de vida × dias × horas ×
// renda/hora (premissa) — com o aviso de estimativa.

type Passo = {
  pergunta: string;
  grupo: GrupoDespesa;
  categoria: string;
  nome: string;
  dependentePergunta?: string;
  periodicidadeDefault: PeriodicidadeDespesa;
};

const PASSOS: Passo[] = [
  { pergunta: 'Quanto você paga de aluguel (ou financiamento da casa)?', grupo: 'vida', categoria: 'aluguel_casa', nome: 'Aluguel', periodicidadeDefault: 'mensal' },
  { pergunta: 'Quanto vem de energia + água + gás por mês?', grupo: 'vida', categoria: 'energia', nome: 'Contas da casa', periodicidadeDefault: 'mensal' },
  { pergunta: 'Quanto custa internet + telefone?', grupo: 'vida', categoria: 'internet', nome: 'Internet e telefone', periodicidadeDefault: 'mensal' },
  { pergunta: 'Quanto sua casa gasta com alimentação (mercado)?', grupo: 'vida', categoria: 'alimentacao', nome: 'Alimentação', periodicidadeDefault: 'mensal' },
  { pergunta: 'Tem filhos na escola/creche? Quanto custa por mês?', grupo: 'familia', categoria: 'escola', nome: 'Escola/Creche', dependentePergunta: 'Nome do filho(a) (opcional)', periodicidadeDefault: 'mensal' },
  { pergunta: 'Paga plano de saúde? Quanto?', grupo: 'vida', categoria: 'plano_saude', nome: 'Plano de saúde', periodicidadeDefault: 'mensal' },
  { pergunta: 'Quanto gasta para abastecer/recarregar o carro por semana?', grupo: 'carro', categoria: 'recarga', nome: 'Recarga/Combustível', periodicidadeDefault: 'semanal' },
  { pergunta: 'Lavagem + pequenos cuidados do carro por mês?', grupo: 'carro', categoria: 'lavagem', nome: 'Lavagem e cuidados', periodicidadeDefault: 'mensal' },
  { pergunta: 'Pedágio + estacionamento num dia normal de trabalho?', grupo: 'trabalho', categoria: 'pedagio', nome: 'Pedágio/Estacionamento', periodicidadeDefault: 'diaria' },
];

export function OnboardingMeta({
  aluguelCarroMensal,
  totalAtual,
  onCriarDespesa,
  onSalvarConfig,
  onConcluir,
  salvando,
}: {
  aluguelCarroMensal: number;
  totalAtual: number;
  onCriarDespesa: (d: { grupo: GrupoDespesa; categoria: string; nome: string; dependente?: string | null; valor: number; periodicidade: PeriodicidadeDespesa }) => void;
  onSalvarConfig: (c: { dias_trabalho: number; renda_hora: number }) => void;
  onConcluir: () => void;
  salvando: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const [valor, setValor] = useState('');
  const [dependente, setDependente] = useState('');
  const [ultimoImpacto, setUltimoImpacto] = useState<string | null>(null);
  const [dias, setDias] = useState(26);
  const [renda, setRenda] = useState(40);

  const totalPassos = PASSOS.length + 1; // + configuração final
  const passo = indice < PASSOS.length ? PASSOS[indice] : null;

  const responder = (pular: boolean) => {
    if (passo && !pular) {
      const v = Number(valor.replace(',', '.'));
      if (Number.isFinite(v) && v > 0) {
        onCriarDespesa({
          grupo: passo.grupo,
          categoria: passo.categoria,
          nome: passo.nome,
          dependente: passo.dependentePergunta ? dependente.trim() || null : null,
          valor: v,
          periodicidade: passo.periodicidadeDefault,
        });
        setUltimoImpacto(`Isso adicionou ${formatBRL(normalizarMensal(v, passo.periodicidadeDefault))} ao seu custo mensal.`);
      }
    } else {
      setUltimoImpacto(null);
    }
    setValor('');
    setDependente('');
    setIndice((i) => i + 1);
  };

  // ===== tela final (config + WOW) =====
  if (!passo) {
    const meta = calcularMeta(totalAtual, dias, renda);
    return (
      <Secao>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Último passo</p>
        <div className="mt-2 space-y-3">
          <label className="block text-sm">
            <span className="text-neutral-500">Quantos dias você pretende trabalhar por mês? <strong className="text-neutral-800 dark:text-neutral-100">{dias}</strong></span>
            <input type="range" min={10} max={31} value={dias} onChange={(e) => setDias(Number(e.target.value))} className="mt-1 w-full accent-emerald-600" />
          </label>
          <div>
            <p className="text-sm text-neutral-500">Quanto você faz por hora, em média? (premissa — dá pra ajustar depois)</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[30, 35, 40, 45, 50].map((r) => (
                <button key={r} type="button" onClick={() => setRenda(r)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${renda === r ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-300 text-neutral-500 dark:border-white/20'}`}>
                  R$ {r}
                </button>
              ))}
              <input className="h-9 w-24 rounded-full border border-neutral-300 bg-transparent px-3 text-sm dark:border-white/20" placeholder="Outro" inputMode="decimal" onChange={(e) => { const v = Number(e.target.value.replace(',', '.')); if (Number.isFinite(v) && v > 0) setRenda(v); }} />
            </div>
          </div>

          {/* MOMENTO WOW (Módulo 30) */}
          <div className="rounded-2xl bg-emerald-600 p-4 text-center text-white">
            <p className="text-[11px] uppercase tracking-wide opacity-80">Seu custo de vida</p>
            <p className="text-3xl font-extrabold">{formatBRL(meta.metaMensal)}<span className="text-sm font-normal">/mês</span></p>
            {meta.horasPorDia != null && (
              <p className="mt-1 text-sm opacity-90">
                Para cobrir isso: {meta.diasTrabalho} dias × {formatHoras(meta.horasPorDia)}/dia × {formatBRL(meta.rendaHora)}/h
              </p>
            )}
            <p className="mt-2 text-[10px] opacity-75">Estimativa baseada na renda média informada — não é faturamento real.</p>
          </div>

          <button
            type="button"
            disabled={salvando}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            onClick={() => {
              onSalvarConfig({ dias_trabalho: dias, renda_hora: renda });
              onConcluir();
            }}
          >
            Começar a usar Minha Meta
          </button>
        </div>
      </Secao>
    );
  }

  // ===== pergunta corrente =====
  return (
    <Secao>
      <p className="text-[11px] text-neutral-400">Pergunta {indice + 1} de {totalPassos}</p>
      {aluguelCarroMensal > 0 && indice === 0 && (
        <p className="mt-1 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Já importei do seu contrato RodaVolt: aluguel do carro = {formatBRL(aluguelCarroMensal)}/mês. Você não precisa cadastrar isso.
        </p>
      )}
      {ultimoImpacto && <p className="mt-1 text-[11px] font-medium text-emerald-600">{ultimoImpacto}</p>}
      <p className="mt-2 text-base font-semibold text-neutral-900 dark:text-white">{passo.pergunta}</p>
      <div className="mt-2 space-y-2">
        <input
          autoFocus
          className="h-12 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-lg dark:border-white/10"
          placeholder={`Valor (R$ ${passo.periodicidadeDefault === 'mensal' ? 'por mês' : passo.periodicidadeDefault === 'semanal' ? 'por semana' : 'por dia'})`}
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        {passo.dependentePergunta && (
          <input className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder={passo.dependentePergunta} value={dependente} onChange={(e) => setDependente(e.target.value)} />
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-500 dark:border-white/10" onClick={() => responder(true)}>
          Não tenho / pular
        </button>
        <button type="button" disabled={salvando} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50" onClick={() => responder(false)}>
          Próxima
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-neutral-400">Custo até agora: {formatBRL(totalAtual)}/mês</p>
    </Secao>
  );
}
