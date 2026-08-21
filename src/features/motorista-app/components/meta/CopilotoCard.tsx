import { useState } from 'react';
import { Gauge, Zap } from 'lucide-react';
import { Secao, Pill } from '../ui';
import {
  avaliarCorrida,
  CLASSIFICACAO_CORRIDA_LABEL,
  formatBRL,
  type AvaliacaoCorrida,
  type ClassificacaoCorrida,
  type ConfigCopiloto,
} from '../../lib/metas';
import type { CorridaRow } from '../../api/corridasPessoais';

// COPILOTO DO MOTORISTA (Fase 16, Fases A/B/D/N) — avaliação de corrida individual.
// avaliarCorrida() roda no cliente (é pura, zero rede) assim que os 3 campos mínimos existem;
// SALVAR é uma ação separada e explícita — nada é gravado só por ter sido avaliado.
// "O sistema informa. O motorista decide." — nunca um botão "Aceitar"/"Recusar".

const TOM_CLASSIFICACAO: Record<ClassificacaoCorrida, 'verde' | 'ambar' | 'vermelho'> = {
  BOM: 'verde',
  ATENCAO: 'ambar',
  RUIM: 'vermelho',
};
const EMOJI_CLASSIFICACAO: Record<ClassificacaoCorrida, string> = { BOM: '🟢', ATENCAO: '🟡', RUIM: '🔴' };

export function CopilotoCard({
  corridasHoje,
  qtdCorridasHoje,
  somaValorCorridasHoje,
  divergenciaCorridasValor,
  divergenciaCorridasQtd,
  configCopiloto,
  copilotoConfigurado,
  onRegistrar,
  salvando,
}: {
  corridasHoje: CorridaRow[];
  qtdCorridasHoje: number;
  somaValorCorridasHoje: number;
  divergenciaCorridasValor: { registradoNoDia: number; somaDasCorridas: number; diferenca: number } | null;
  divergenciaCorridasQtd: { registradoNoDia: number; qtdCorridasIndividuais: number } | null;
  configCopiloto: ConfigCopiloto;
  copilotoConfigurado: boolean;
  onRegistrar: (c: { valor: number; km_estimado: number | null; duracao_estimada_min: number | null; app: string | null; classificacao: ClassificacaoCorrida | null }) => void;
  salvando: boolean;
}) {
  const [f, setF] = useState({ valor: '', km: '', min: '', app: '' });
  const [avaliacao, setAvaliacao] = useState<AvaliacaoCorrida | null>(null);

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && s.trim() !== '' ? n : null;
  };
  const valor = num(f.valor);

  const avaliar = () => {
    if (valor == null) return;
    const r = avaliarCorrida({ valor, kmEstimado: num(f.km), duracaoEstimadaMin: num(f.min) }, configCopiloto);
    setAvaliacao(r);
  };

  const registrar = () => {
    if (valor == null) return;
    onRegistrar({
      valor,
      km_estimado: num(f.km),
      duracao_estimada_min: num(f.min),
      app: f.app.trim() || null,
      classificacao: avaliacao?.configurado ? avaliacao.classificacao : null,
    });
    setF({ valor: '', km: '', min: '', app: '' });
    setAvaliacao(null);
  };

  return (
    <Secao titulo="Copiloto" acao={<Pill tom="neutro">Beta</Pill>}>
      <p className="text-[11px] text-neutral-500">
        Avalie uma corrida antes de decidir. O sistema mostra os números — a decisão de aceitar ou não é sempre sua.
      </p>

      {!copilotoConfigurado && (
        <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500 dark:bg-white/5">
          Você ainda não configurou limiares de R$/km ou R$/h. Sem eles, o Copiloto só mostra os números da corrida — não classifica.
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <input
          autoFocus
          className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10"
          placeholder="Valor (R$)"
          inputMode="decimal"
          value={f.valor}
          onChange={(e) => { setF((v) => ({ ...v, valor: e.target.value })); setAvaliacao(null); }}
        />
        <input
          className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10"
          placeholder="Km (opcional)"
          inputMode="decimal"
          value={f.km}
          onChange={(e) => { setF((v) => ({ ...v, km: e.target.value })); setAvaliacao(null); }}
        />
        <input
          className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10"
          placeholder="Min (opcional)"
          inputMode="numeric"
          value={f.min}
          onChange={(e) => { setF((v) => ({ ...v, min: e.target.value })); setAvaliacao(null); }}
        />
      </div>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10"
        placeholder="App (opcional — Uber, 99, inDrive...)"
        value={f.app}
        onChange={(e) => setF((v) => ({ ...v, app: e.target.value }))}
      />

      <button
        type="button"
        disabled={valor == null}
        className="mt-2 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        onClick={avaliar}
      >
        Avaliar corrida
      </button>

      {avaliacao && (
        <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>{EMOJI_CLASSIFICACAO[avaliacao.classificacao]}</span>
            <Pill tom={TOM_CLASSIFICACAO[avaliacao.classificacao]}>{CLASSIFICACAO_CORRIDA_LABEL[avaliacao.classificacao]}</Pill>
          </div>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-300">{avaliacao.observacao}</p>
          <div className="space-y-1 border-t border-neutral-100 pt-2 dark:border-white/10">
            {avaliacao.criterios.map((c) => (
              <p key={c.rotulo} className="text-[11px] text-neutral-500">
                <span className="font-medium text-neutral-700 dark:text-neutral-200">{c.rotulo}:</span> {c.detalhe}
              </p>
            ))}
          </div>
          <button
            type="button"
            disabled={salvando}
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={registrar}
          >
            Registrar esta corrida
          </button>
          <p className="text-[9px] text-neutral-400">Registrar guarda a corrida no seu histórico — não é uma resposta ao aplicativo.</p>
        </div>
      )}

      {qtdCorridasHoje > 0 && (
        <div className="mt-3 border-t border-neutral-100 pt-2 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Hoje</p>
          <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-300">
            {qtdCorridasHoje} corrida{qtdCorridasHoje > 1 ? 's' : ''} registrada{qtdCorridasHoje > 1 ? 's' : ''} · soma {formatBRL(somaValorCorridasHoje)}
          </p>
          {divergenciaCorridasValor && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              DADOS DIFERENTES: seu ganho do dia registrado é {formatBRL(divergenciaCorridasValor.registradoNoDia)}, mas a soma das corridas é {formatBRL(divergenciaCorridasValor.somaDasCorridas)}. Nenhum dos dois foi alterado automaticamente.
            </p>
          )}
          {divergenciaCorridasQtd && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              DADOS DIFERENTES: contagem manual do dia diz {divergenciaCorridasQtd.registradoNoDia} corridas; você registrou {divergenciaCorridasQtd.qtdCorridasIndividuais} individualmente.
            </p>
          )}
          <div className="mt-1 space-y-0.5">
            {corridasHoje.slice(0, 5).map((c) => (
              <p key={c.id} className="text-[11px] text-neutral-500">
                {c.hora ? `${c.hora} · ` : ''}{c.app ?? 'App não informado'} · {formatBRL(c.valor)}
                {c.classificacao ? ` · ${EMOJI_CLASSIFICACAO[c.classificacao]}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </Secao>
  );
}
