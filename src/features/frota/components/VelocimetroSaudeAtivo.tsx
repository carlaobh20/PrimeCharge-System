import type { SaudeDoAtivoResult } from '../intelligence/saudeDoAtivo';

// Épico 4 — "Ativo Financeiro", Parte 5. Velocímetro 0-100, construído do zero (não existe
// nenhum componente de gauge/radial no design system ainda — auditoria prévia confirmou).
// "Mostrar somente a nota. A composição fica em tooltip." — literal: só o arco + o número
// grande ficam sempre visíveis; as 10 categorias só aparecem no hover.
const RAIO = 80;
const CX = 100;
const CY = 100;
const ESPESSURA = 16;

function pontoNoArco(scorePct: number, raio: number): { x: number; y: number } {
  const angulo = Math.PI * (1 - scorePct / 100);
  return { x: CX + raio * Math.cos(angulo), y: CY - raio * Math.sin(angulo) };
}

// large-arc-flag sempre 0: a escala inteira (score 0 a 100) cobre exatamente um semicírculo
// (180°) — nenhum trecho parcial dela passa de 180°, então o arco "maior" (flag=1) nunca é o
// certo aqui. (Bug real encontrado na verificação visual: score=55 desenhava dois pedaços
// desconectados porque `scoreAte - scoreDe > 50` misturava unidade de score com grau angular —
// score 92, por exemplo, ainda "parecia" certo por coincidência, o arco errado só ficava visível
// no meio da faixa.)
function caminhoArco(scoreDe: number, scoreAte: number, raio: number): string {
  const inicio = pontoNoArco(scoreDe, raio);
  const fim = pontoNoArco(scoreAte, raio);
  return `M ${inicio.x} ${inicio.y} A ${raio} ${raio} 0 0 1 ${fim.x} ${fim.y}`;
}

function corPorScore(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function VelocimetroSaudeAtivo({ saude }: { saude: SaudeDoAtivoResult }) {
  const score = saude.overall;

  return (
    <div className="group relative rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Saúde do Ativo</h3>

      <svg viewBox="0 0 200 110" className="mt-1 w-full max-w-[220px]">
        {/* Zonas de fundo — crítico/atenção/ok, sempre visíveis mesmo sem score (referência) */}
        <path d={caminhoArco(0, 40, RAIO)} fill="none" stroke="#fecaca" strokeWidth={ESPESSURA} strokeLinecap="round" />
        <path d={caminhoArco(40, 70, RAIO)} fill="none" stroke="#fde68a" strokeWidth={ESPESSURA} strokeLinecap="round" />
        <path d={caminhoArco(70, 100, RAIO)} fill="none" stroke="#a7f3d0" strokeWidth={ESPESSURA} strokeLinecap="round" />

        {score !== null && (
          <path
            d={caminhoArco(0, score, RAIO)}
            fill="none"
            stroke={corPorScore(score)}
            strokeWidth={ESPESSURA}
            strokeLinecap="round"
          />
        )}

        <text x={CX} y={CY - 6} textAnchor="middle" className="fill-neutral-900 dark:fill-neutral-100" style={{ fontSize: 34, fontWeight: 700 }}>
          {score !== null ? score : '—'}
        </text>
      </svg>

      {/* Tooltip com a composição — só no hover, per "mostrar somente a nota" */}
      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-3 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:border-white/10 dark:bg-neutral-900">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          {saude.categoriasAvaliadas}/{saude.categoriasTotais} categorias com dado
        </p>
        <dl className="space-y-1">
          {saude.categorias.map((c) => (
            <div key={c.categoria} className="flex items-center justify-between text-xs">
              <dt className="text-neutral-500">{c.label}</dt>
              <dd className={c.score !== null ? 'font-medium text-neutral-800 dark:text-neutral-200' : 'text-neutral-400'}>
                {c.score !== null ? c.score : 'sem dado'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
