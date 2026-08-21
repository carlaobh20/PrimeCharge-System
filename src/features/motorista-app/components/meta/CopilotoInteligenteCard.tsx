import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Secao, Pill } from '../ui';
import {
  CLASSIFICACAO_AMOSTRA_LABEL,
  formatBRL,
  formatHoras,
  STATUS_DIA_HOJE_LABEL,
  type InsightCopiloto,
  type MetaHojeCockpit,
} from '../../lib/metas';

// SEU COPILOTO (Fase 17, Módulos D/E) — card contextual: conecta o Copiloto à meta do dia
// (Módulo D, reusando SOMENTE o que useMinhaMeta já deriva de calcularMetaHoje/rebalancear —
// nenhum motor de meta novo aqui) e mostra os insights automáticos mais relevantes do momento
// (Módulo E, consumindo insightsCopiloto() — Módulo F — sem recalcular nada). Card deliberadamente
// separado do CopilotoCard: este é só leitura contextual, o outro é onde se avalia/registra
// corrida — responsabilidades diferentes, sem sobrecarregar um componente só.

const TOM_ORIGEM: Record<InsightCopiloto['origem'], 'verde' | 'ambar' | 'neutro'> = {
  'DADO REGISTRADO': 'verde',
  'SEM DADOS SUFICIENTES': 'neutro',
};

const PRIORIDADE_TIPO: InsightCopiloto['tipo'][] = ['META', 'CORRIDA', 'EVOLUCAO', 'RPH', 'RPKM', 'HORARIO', 'DIA_SEMANA', 'REGISTRO', 'DADO_INSUFICIENTE'];

export function CopilotoInteligenteCard({
  hojeCockpit,
  qtdCorridasHoje,
  somaValorCorridasHoje,
  insightsCopilotoLista,
}: {
  hojeCockpit: MetaHojeCockpit;
  qtdCorridasHoje: number;
  somaValorCorridasHoje: number;
  insightsCopilotoLista: InsightCopiloto[];
}) {
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const insightsReais = insightsCopilotoLista.filter((i) => i.tipo !== 'DADO_INSUFICIENTE');
  const ordenados = [...insightsCopilotoLista].sort(
    (a, b) => PRIORIDADE_TIPO.indexOf(a.tipo) - PRIORIDADE_TIPO.indexOf(b.tipo),
  );
  const principais = ordenados.slice(0, 3);
  const restantes = ordenados.slice(3);

  return (
    <Secao titulo="Seu Copiloto">
      {/* Módulo D — Copiloto conectado à Meta (zero motor novo, só leitura do que já existe) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Meta de hoje</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(hojeCockpit.metaHoje)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Realizado</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {hojeCockpit.realizadoHoje != null ? formatBRL(hojeCockpit.realizadoHoje) : 'NÃO INFORMADO'}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Corridas registradas</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{qtdCorridasHoje}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Valor das corridas</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(somaValorCorridasHoje)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Restante</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {hojeCockpit.faltanteHoje != null ? formatBRL(hojeCockpit.faltanteHoje) : 'R$ 0,00'}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">Horas necessárias</p>
          <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
            {hojeCockpit.horasNecessariasHoje != null ? formatHoras(hojeCockpit.horasNecessariasHoje) : 'SEM DADO'}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[11px] text-neutral-500">Ritmo:</span>
        <Pill tom={hojeCockpit.status === 'acima_ritmo' ? 'verde' : hojeCockpit.status === 'abaixo_ritmo' ? 'ambar' : 'neutro'}>
          {STATUS_DIA_HOJE_LABEL[hojeCockpit.status]}
        </Pill>
      </div>

      {/* Módulo E — insights automáticos mais relevantes do momento (Módulo F consumido, não recalculado) */}
      <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-white/10">
        {insightsReais.length === 0 ? (
          <p className="text-sm text-neutral-500">Não há registros suficientes para gerar este insight.</p>
        ) : (
          <>
            <div className="space-y-2">
              {principais.map((ins) => (
                <div key={ins.id} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Pill tom={TOM_ORIGEM[ins.origem]}>{ins.origem}</Pill>
                    <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-100">{ins.titulo}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">{ins.descricao}</p>
                </div>
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
                  {mostrarTodos ? 'Ver menos' : `Ver mais insights (${restantes.length})`}
                </button>
                {mostrarTodos && (
                  <div className="mt-2 space-y-2">
                    {restantes.map((ins) => (
                      <div key={ins.id} className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Pill tom={TOM_ORIGEM[ins.origem]}>{ins.origem}</Pill>
                          <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-100">{ins.titulo}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500">{ins.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <p className="mt-2 text-[9px] text-neutral-400">
        Classificação de amostra: {CLASSIFICACAO_AMOSTRA_LABEL.dados_insuficientes.toLowerCase()}, base inicial, base consistente ou
        base relevante — mede só a QUANTIDADE de registros, nunca confiança estatística ou causalidade.
      </p>
    </Secao>
  );
}
