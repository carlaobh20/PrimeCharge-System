import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Secao, Pill } from '../ui';
import type { AcaoInsightAssistente, InsightAssistente, OrigemInsightAssistente } from '../../lib/metas';

// ASSISTENTE CONTEXTUAL (Fase 18, Módulo K) — evolução do "Seu Copiloto" (Módulo E da Fase 17):
// consome assistenteContextual() (motor 100% puro, zero IA externa/LLM/API) e só apresenta o que
// o motor já decidiu — prioridade, agrupamento, texto. Este componente NÃO calcula nada, só
// renderiza e, quando o insight tem `acaoDisponivel`, oferece "Ver dados" pra rolar até a seção
// correspondente já existente na tela (nunca uma navegação paralela). Máximo de 3 insights na
// primeira dobra; o resto fica atrás de "Ver mais".

const TOM_ORIGEM: Record<OrigemInsightAssistente, 'verde' | 'ambar' | 'neutro' | 'azul'> = {
  'DADO REGISTRADO': 'verde',
  'HISTÓRICO': 'azul',
  'DADOS INSUFICIENTES': 'neutro',
  'INCONSISTÊNCIA': 'ambar',
  'PROJEÇÃO': 'neutro',
};

function scrollParaSecao(acao: AcaoInsightAssistente) {
  if (!acao) return;
  const id = `secao-${acao}`;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ItemInsight({ insight }: { insight: InsightAssistente }) {
  return (
    <div className="space-y-0.5 rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
      <div className="flex items-center gap-1.5">
        <Pill tom={TOM_ORIGEM[insight.origem]}>{insight.origem}</Pill>
        <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-100">{insight.titulo}</span>
      </div>
      <p className="text-[11px] text-neutral-500">{insight.mensagem}</p>
      {insight.acaoDisponivel && (
        <button
          type="button"
          className="mt-0.5 text-[11px] font-medium text-emerald-700 underline dark:text-emerald-400"
          onClick={() => scrollParaSecao(insight.acaoDisponivel)}
        >
          Ver dados
        </button>
      )}
    </div>
  );
}

export function AssistenteContextualCard({ insights }: { insights: InsightAssistente[] }) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const principais = insights.slice(0, 3);
  const restantes = insights.slice(3);

  return (
    <Secao titulo="Seu Copiloto">
      {insights.length === 0 ? (
        <p className="text-sm text-neutral-500">Não há registros suficientes para gerar este insight.</p>
      ) : (
        <>
          <div className="space-y-2">
            {principais.map((ins) => (
              <ItemInsight key={ins.id} insight={ins} />
            ))}
          </div>
          {restantes.length > 0 && (
            <>
              <button
                type="button"
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-neutral-500 underline"
                onClick={() => setMostrarTodos((v) => !v)}
              >
                {mostrarTodos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {mostrarTodos ? 'Ver menos' : `Ver mais (${restantes.length})`}
              </button>
              {mostrarTodos && (
                <div className="mt-2 space-y-2">
                  {restantes.map((ins) => (
                    <ItemInsight key={ins.id} insight={ins} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      <p className="mt-2 text-[9px] text-neutral-400">
        O sistema informa. O motorista decide. Nenhum insight aqui indica onde trabalhar, nem decide aceitar ou recusar corrida.
      </p>
    </Secao>
  );
}
