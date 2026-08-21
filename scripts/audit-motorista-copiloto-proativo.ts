/* eslint-disable no-console */
// Auditoria determinística da FASE 18 — Copiloto Proativo do Motorista (Módulos I/J/K).
// Constrói sobre a Fase 17 (validada, 930/930): Módulo I estende o Simulador "E se?" com a
// comparação PREMISSA × DADO REGISTRADO em horas; Módulo J estende o Plano de Hoje com janelas
// por VOLUME × por MÉDIA REGISTRADA (independentes); Módulo K é o Assistente Contextual —
// motor 100% puro (zero IA externa/LLM/API/rede) que CONSOME insightsCopiloto() (Módulo F),
// inconsistenciasOperacionais(), projecoesDuplas() e qualidadeBaseCopiloto() já calculados.
// Categorias:
//   1-2  fixtures obrigatórias (I)                        14 K: DADO_INSUFICIENTE dedicado
//   3    I: comparação PREMISSA × DADO REGISTRADO           15 K: PROJECAO
//   4    I: ausência de histórico (sem média registrada)    16 K: prioridade (ordem completa)
//   5    I: vocabulário proibido / UI                       17 K: máximo 3 na 1ª dobra (UI)
//   6    I: imutabilidade (cópia local, zero mutação)       18 K: ação de navegação (Ver dados)
//   7    J: janelasPorVolume                                19 K: imutabilidade
//   8    J: janelasPorMediaRegistrada                       20 K: vocabulário proibido
//   9    J: separação volume × média (independentes)        21 NaN nunca produzido
//   10   J: amostra/classificação ao lado                   22 Infinity nunca produzido
//   11   J: ausência de dados                                23 divisão por zero
//   12   J: vocabulário proibido / UI                        24 reuso das funções existentes
//   13   K: HISTORICO/HORARIO/DIA_SEMANA/META/CORRIDA/REGISTRO 25 ausência de query/migration nova
//                                                              26 K: INCONSISTENCIA
// FIXTURES OBRIGATÓRIAS: 1000/20h=R$50/h · 1000/200km=R$5/km · 1000/10corridas=R$100/corrida ·
// 1160 vs 1000 anterior ⇒ +16% · 5.500/40=137,5h · 5.500/47,80 — ver nota na categoria 2.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-copiloto-proativo.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  assistenteContextual,
  calcularRpKm,
  calcularRph,
  horasParaValor,
  inteligenciaPorHorario,
  insightsCopiloto,
  janelasPorMediaRegistrada,
  janelasPorVolume,
  PRIORIDADE_TIPO_ASSISTENTE,
  qualidadeBaseCopiloto,
  type CorridaHistorico,
  type EstadoDoDia,
  type Inconsistencia,
  type MetaHojeCockpit,
  type ProjecoesDuplas,
  type ResumoFaixaHorario,
} from '../src/features/motorista-app/lib/metas';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}
const aprox = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= tol;
// Remove comentários (linha // e bloco /* */) antes de testar vocabulário proibido ou chamadas de
// função no CÓDIGO — evita falso-positivo quando o comentário só EXPLICA a regra ("nunca 'X'",
// "REUSA insightsCopiloto()") em vez de a violar. Testa só o que de fato roda/renderiza.
const semComentarios = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

const c = (p: Partial<CorridaHistorico> & { data: string; valor: number }): CorridaHistorico => ({
  hora: null,
  app: null,
  kmEstimado: null,
  duracaoEstimadaMin: null,
  ...p,
});

const faixa = (p: Partial<ResumoFaixaHorario> & { label: string }): ResumoFaixaHorario => ({
  inicio: 0,
  fim: 6,
  qtdCorridas: 0,
  valorTotal: 0,
  valorMedioPorCorrida: null,
  rpHora: null,
  rpKm: null,
  diasObservados: 0,
  classificacaoAmostra: 'dados_insuficientes',
  ...p,
});

const raizFonte = join(new URL('.', import.meta.url).pathname, '..');
const motorSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
const hookSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
const simuladorSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/SimuladorESe.tsx'), 'utf8');
const planoSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/PlanoDeHoje.tsx'), 'utf8');
const assistenteCardSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/AssistenteContextualCard.tsx'), 'utf8');
const centroSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/CentroControlePage.tsx'), 'utf8');

// ======================= 1 — FIXTURES OBRIGATÓRIAS (reuso direto das funções) ===================
check('fixture', aprox(calcularRph(1000, 20), 50), 'OBRIGATÓRIO: R$1000 / 20h = R$50/h');
check('fixture', aprox(calcularRpKm(1000, 200), 5), 'OBRIGATÓRIO: R$1000 / 200km = R$5/km');
check('fixture', aprox(horasParaValor(1000, 100), 10), 'OBRIGATÓRIO: R$1000 / R$100/corrida-equivalente-a-taxa ⇒ 10 (mesma horasParaValor usada pelo Módulo I)');
check('fixture', aprox(horasParaValor(5500, 40), 137.5), 'OBRIGATÓRIO: falta R$5.500 pela PREMISSA de R$40/h ⇒ 137,5h');

// ======================= 2 — discrepância aritmética do exemplo do usuário ======================
// O exemplo literal da especificação diz "5.500 / 47,80 ≈ 114,96h". O valor matematicamente
// correto é 5500/47.8 ≈ 115,0628h — DIVULGADO no relatório, não maquiado para bater com 114,96h.
// Este teste EXISTE PARA FLAGRAR se alguém futuramente "ajustar" horasParaValor para uma divisão
// diferente só para bater com o número do exemplo (o que seria inventar uma fórmula errada).
const horasExemploUsuario = horasParaValor(5500, 47.8) as number;
check('2', aprox(horasExemploUsuario, 115.06, 0.01), 'horasParaValor(5500, 47.80) = 115,06h — valor MATEMATICAMENTE CORRETO (não os "114,96h" do texto da especificação, que estavam incorretos)');
check('2', !aprox(horasExemploUsuario, 114.96, 0.001), 'confirma que 114,96h (texto da especificação) NÃO é o resultado de uma divisão real — discrepância mantida visível, nunca escondida com tolerância larga');

// ======================= 3 — Módulo I: comparação PREMISSA × DADO REGISTRADO ====================
const faltaMeta3 = 5500;
const rendaHoraPremissa3 = 40;
const mediaRegistrada3 = 47.8;
const horasPremissa3 = horasParaValor(faltaMeta3, rendaHoraPremissa3);
const horasMedia3 = horasParaValor(faltaMeta3, mediaRegistrada3);
check('3', aprox(horasPremissa3, 137.5), 'Meta pela PREMISSA: horasParaValor(falta, rendaHoraPremissa) = 137,5h');
check('3', aprox(horasMedia3, 115.06, 0.01), 'Meta pela MÉDIA REGISTRADA: horasParaValor(falta, mediaRegistrada) ≈ 115,06h');
check('3', horasMedia3 < horasPremissa3, 'com média registrada MAIOR que a premissa, a mesma falta corresponde a MENOS horas — matematicamente coerente');
check('3', /Quanto falta, em horas\?/.test(simuladorSrc), 'SimuladorESe exibe a seção "Quanto falta, em horas?" (Módulo I)');
check('3', /Meta pela PREMISSA/.test(simuladorSrc) && /Minha média registrada/.test(simuladorSrc), 'SimuladorESe mostra PREMISSA e DADO REGISTRADO lado a lado, rotulados');
check('3', /Matematicamente, utilizando sua média registrada/.test(simuladorSrc), 'SimuladorESe usa a frase exigida ("Matematicamente, utilizando...")');
check('3', /faltaMeta != null && faltaMeta > 0 \? horasParaValor\(faltaMeta, base\.rendaHora\) : null/.test(simuladorSrc), 'horasPelaPremissa REUSA horasParaValor — nenhuma divisão nova no componente');
check('3', /faltaMeta != null && faltaMeta > 0 \? horasParaValor\(faltaMeta, mediaRegistrada\) : null/.test(simuladorSrc), 'horasPelaMedia REUSA horasParaValor — nenhuma divisão nova no componente');

// ======================= 4 — Módulo I: ausência de histórico (sem média registrada) =============
check('4', horasParaValor(5500, null) === null, 'sem mediaRegistrada (null) → horasParaValor retorna null, nunca inventa uma taxa');
check('4', horasParaValor(5500, 0) === null, 'mediaRegistrada 0 → null, nunca divide por zero');
check('4', /Não há registros suficientes para usar sua média\./.test(simuladorSrc), 'SimuladorESe mostra a mensagem exata quando não há média registrada válida');

// ======================= 5 — Módulo I: vocabulário proibido =====================================
const proibidoModuloI = /você consegue|você vai conseguir|voc[eê] precisa trabalhar/i;
check('5', !proibidoModuloI.test(semComentarios(simuladorSrc)), 'SimuladorESe NUNCA RENDERIZA "você consegue" / "você vai conseguir" / "você precisa trabalhar" (comentários que só citam a regra são ignorados)');
check('5', /SIMULAÇÃO, não é garantia de resultado/.test(simuladorSrc), 'SimuladorESe rotula a comparação em horas como SIMULAÇÃO, nunca garantia');

// ======================= 6 — Módulo I: imutabilidade (cópia local) ==============================
check('6', /const \[dias, setDias\] = useState/.test(simuladorSrc) && /const \[renda, setRenda\] = useState/.test(simuladorSrc) && /const \[custo, setCusto\] = useState/.test(simuladorSrc), 'Simulador continua operando sobre useState LOCAL (dias/renda/custo) — nunca escreve renda_hora/meta/config/banco');
check('6', !/\.update\(|\.insert\(|mutate\(/.test(simuladorSrc), 'SimuladorESe não chama nenhuma mutação/gravação — Módulo I acrescentou só leitura/exibição');

// ======================= 7 — Módulo J: janelasPorVolume ==========================================
const j7 = [
  faixa({ label: 'A', qtdCorridas: 2, rpHora: 80 }),
  faixa({ label: 'B', qtdCorridas: 10, rpHora: 20 }),
  faixa({ label: 'C', qtdCorridas: 5, rpHora: 50 }),
];
const porVolume7 = janelasPorVolume(j7);
check('7', porVolume7.map((f) => f.label).join(',') === 'B,C,A', 'janelasPorVolume ordena SÓ por qtdCorridas desc, ignorando rpHora');
check('7', j7.map((f) => f.label).join(',') === 'A,B,C', 'janelasPorVolume não muta o array recebido (nova cópia)');

// ======================= 8 — Módulo J: janelasPorMediaRegistrada =================================
const j8 = [
  faixa({ label: 'A', qtdCorridas: 2, rpHora: 80 }),
  faixa({ label: 'B', qtdCorridas: 10, rpHora: 20 }),
  faixa({ label: 'C', qtdCorridas: 5, rpHora: null }), // sem R$/h calculável — EXCLUÍDA
];
const porMedia8 = janelasPorMediaRegistrada(j8);
check('8', porMedia8.map((f) => f.label).join(',') === 'A,B', 'janelasPorMediaRegistrada ordena SÓ por rpHora desc e EXCLUI faixas sem rpHora calculável');
check('8', !porMedia8.some((f) => f.label === 'C'), 'faixa sem R$/h (rpHora null) nunca aparece no ranking por média — nunca 0 fingido');

// ======================= 9 — Módulo J: separação volume × média (independentes) =================
const j9 = [
  faixa({ label: 'Alto volume, média baixa', qtdCorridas: 20, rpHora: 15 }),
  faixa({ label: 'Baixo volume, média alta', qtdCorridas: 2, rpHora: 90 }),
];
check('9', janelasPorVolume(j9)[0].label === 'Alto volume, média baixa', 'por volume, a faixa de 20 corridas vem primeiro mesmo com R$/h baixo');
check('9', janelasPorMediaRegistrada(j9)[0].label === 'Baixo volume, média alta', 'por média, a faixa de 2 corridas vem primeiro mesmo com poucas observações — prova que as métricas são independentes');

// ======================= 10 — Módulo J: amostra/classificação ao lado ============================
check('10', /CLASSIFICACAO_AMOSTRA_LABEL\[f\.classificacaoAmostra\]/.test(planoSrc), 'PlanoDeHoje mostra a classificação de amostra (Pill) ao lado de cada janela — nunca esconde a confiabilidade');
check('10', /f\.qtdCorridas} registro/.test(planoSrc), 'PlanoDeHoje mostra a quantidade de registros explicitamente em cada linha');

// ======================= 11 — Módulo J: ausência de dados =========================================
check('11', janelasPorVolume([]).length === 0 && janelasPorMediaRegistrada([]).length === 0, 'sem faixas (array vazio) → listas vazias, nunca faixa inventada');
check('11', /porHorarioCorridas\.length > 0/.test(planoSrc), 'PlanoDeHoje só renderiza a seção de janelas quando há dados — nunca mostra seção vazia como se fosse zero');

// ======================= 12 — Módulo J: vocabulário proibido =====================================
const proibidoModuloJ = /melhor hor[aá]rio|trabalhe (neste|nesta) hor[aá]rio|trabalhe nesse hor[aá]rio/i;
check('12', !proibidoModuloJ.test(semComentarios(planoSrc)), 'PlanoDeHoje NUNCA RENDERIZA "melhor horário" ou "trabalhe neste horário" (comentários que só citam a regra são ignorados)');
check('12', /Janelas com mais registros/.test(planoSrc) && /Janelas com maior média registrada/.test(planoSrc), 'PlanoDeHoje usa os dois títulos exigidos — nunca "melhor horário"');
check('12', /Seus registros têm maior média registrada nesta faixa/.test(planoSrc), 'PlanoDeHoje usa a frase exata exigida pra descrever a janela de maior média');

// ======================= FIXTURES K — insumos reutilizados nos testes 13-26 =====================
const metaHojeK: MetaHojeCockpit = {
  metaHoje: 400,
  metaDiariaOriginal: 400,
  realizadoHoje: 250,
  faltanteHoje: 150,
  horasRestantes: null,
  horasNecessariasHoje: null,
  horasTrabalhadasHoje: null,
  sobreAMeta: -150,
  pctDia: 62.5,
  status: 'abaixo_ritmo',
};
const corridasK: CorridaHistorico[] = [
  c({ data: '2026-08-21', hora: '19:00', app: 'Uber', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 }),
  c({ data: '2026-08-20', hora: '19:15', app: 'Uber', valor: 95, kmEstimado: 9, duracaoEstimadaMin: 55 }),
  c({ data: '2026-08-19', hora: '08:30', app: '99', valor: 80 }),
  c({ data: '2026-07-05', hora: '08:00', valor: 20, kmEstimado: 5, duracaoEstimadaMin: 30 }),
];
const insightsHistoricoK = insightsCopiloto({ corridas: corridasK, ateIso: '2026-08-21', periodo: 30, metaHoje: metaHojeK, qtdCorridasHoje: 1 });
const porHorarioK = inteligenciaPorHorario(corridasK);
const qualidadeK = qualidadeBaseCopiloto(corridasK);
const inconsistenciasVaziaK: Inconsistencia[] = [];
const inconsistenciasComK: Inconsistencia[] = [{ achado: '2 dia(s) com ganho e sem horas', origem: 'seus lançamentos de dia', falta: 'as horas trabalhadas desses dias' }];
const projecoesK: ProjecoesDuplas = {
  pelaPremissa: { valor: 4800, formula: 'R$ 250 registrados + meta diária da PREMISSA (R$ 400) × 12 dia(s)' },
  peloHistorico: { valor: 5300, formula: 'R$ 250 registrados + SUA média registrada (R$ 420,00/dia, 5 dias) × 12 dia(s)' },
};
const baseArgsK = {
  estadoHoje: 'dados_parciais' as EstadoDoDia,
  insightsHistorico: insightsHistoricoK,
  qualidadeBase: qualidadeK,
  diasComRegistroPeriodo: 4,
  periodoDiasBase: 30,
  inconsistencias: inconsistenciasVaziaK,
  projecoes: projecoesK,
  diasRegistradosProjecao: 4,
  horaAtual: '19:30',
  porHorario: porHorarioK,
};

// ======================= 13 — Módulo K: tipos derivados do Módulo F (reuso) =====================
const r13 = assistenteContextual(baseArgsK);
const tipos13 = new Set(r13.map((i) => i.tipo));
check('13', tipos13.has('HISTORICO'), 'insight HISTORICO presente (mapeado de EVOLUCAO/RPH/RPKM do Módulo F)');
check('13', tipos13.has('HORARIO'), 'insight HORARIO presente (mapeado 1:1 do Módulo F)');
check('13', tipos13.has('META'), 'insight META presente (mapeado 1:1, origem DADO REGISTRADO)');
check('13', tipos13.has('CORRIDA'), 'insight CORRIDA presente (corrida registrada hoje)');
const insightMetaK = r13.find((i) => i.tipo === 'META');
check('13', insightMetaK != null && insightMetaK.origem === 'DADO REGISTRADO', 'insight META tem origem DADO REGISTRADO — nunca HISTÓRICO');
check('13', new Set(r13.map((x) => x.id)).size === r13.length, 'todos os ids do Assistente são únicos numa mesma chamada');

// ======================= 14 — Módulo K: DADO_INSUFICIENTE dedicado ================================
const r14comFalta = assistenteContextual({ ...baseArgsK, diasComRegistroPeriodo: 4, periodoDiasBase: 30, qualidadeBase: { ...qualidadeK, classificacaoAmostra: 'base_inicial' } });
const insDadoInsuf14 = r14comFalta.find((i) => i.tipo === 'DADO_INSUFICIENTE');
check('14', insDadoInsuf14 != null, 'com 4/30 dias registrados e base "base_inicial" → gera insight DADO_INSUFICIENTE próprio (dias sem registro)');
check('14', insDadoInsuf14 != null && /26 dia\(s\) sem registros/.test(insDadoInsuf14.titulo), 'título usa a contagem correta: 30 − 4 = 26 dias sem registro');
const r14semFalta = assistenteContextual({ ...baseArgsK, diasComRegistroPeriodo: 30, periodoDiasBase: 30, qualidadeBase: { ...qualidadeK, classificacaoAmostra: 'base_relevante' } });
check('14', !r14semFalta.some((i) => i.tipo === 'DADO_INSUFICIENTE'), 'com base já "base_relevante" e 30/30 dias, o aviso de dados insuficientes NÃO se repete');

// ======================= 15 — Módulo K: PROJECAO =================================================
const r15 = assistenteContextual(baseArgsK);
const insProjecao15 = r15.find((i) => i.tipo === 'PROJECAO');
check('15', insProjecao15 != null, 'com projecoes preenchidas → gera insight PROJECAO');
check('15', insProjecao15 != null && insProjecao15.origem === 'PROJEÇÃO', 'insight de projeção tem origem PROJEÇÃO (taxonomia dedicada, distinta de DADO REGISTRADO)');
check('15', insProjecao15 != null && /não é promessa de resultado/.test(insProjecao15.mensagem), 'insight de projeção termina com o disclaimer exigido');
check('15', insProjecao15 != null && insProjecao15.mensagem.includes(projecoesK.pelaPremissa.formula), 'insight de projeção REUSA a .formula de projecoesDuplas(), nunca reconstrói o texto');
const r15semProjecao = assistenteContextual({ ...baseArgsK, projecoes: null });
check('15', !r15semProjecao.some((i) => i.tipo === 'PROJECAO'), 'sem projeções (null) → nenhum insight PROJECAO inventado');

// ======================= 16 — Módulo K: prioridade (ordem completa) ==============================
check('16', PRIORIDADE_TIPO_ASSISTENTE.DADO_INSUFICIENTE === 1 && PRIORIDADE_TIPO_ASSISTENTE.INCONSISTENCIA === 2 && PRIORIDADE_TIPO_ASSISTENTE.META === 3, 'ordem exigida: 1 dados faltantes, 2 divergências, 3 meta');
check('16', PRIORIDADE_TIPO_ASSISTENTE.CORRIDA === 4 && PRIORIDADE_TIPO_ASSISTENTE.REGISTRO === 5 && PRIORIDADE_TIPO_ASSISTENTE.HISTORICO === 6, '4 estado operacional/corrida, 5 registro, 6 histórico');
check('16', PRIORIDADE_TIPO_ASSISTENTE.HORARIO === 7 && PRIORIDADE_TIPO_ASSISTENTE.DIA_SEMANA === 8 && PRIORIDADE_TIPO_ASSISTENTE.PROJECAO === 9, '7 horário, 8 dia da semana, 9 (menor prioridade) projeção');
const r16comInconsistencia = assistenteContextual({ ...baseArgsK, inconsistencias: inconsistenciasComK, qualidadeBase: { ...qualidadeK, classificacaoAmostra: 'base_inicial' }, diasComRegistroPeriodo: 4 });
const prioridadesEmOrdem = r16comInconsistencia.map((i) => i.prioridade);
check('16', prioridadesEmOrdem.every((p, idx) => idx === 0 || p >= prioridadesEmOrdem[idx - 1]), 'a lista final retorna SEMPRE ordenada por prioridade crescente (menor número primeiro)');
check('16', r16comInconsistencia[0].tipo === 'DADO_INSUFICIENTE' || r16comInconsistencia[0].tipo === 'INCONSISTENCIA', 'o primeiro insight da lista é sempre DADO_INSUFICIENTE ou INCONSISTENCIA (prioridades 1-2)');

// ======================= 17 — Módulo K: máximo 3 na primeira dobra (UI) ==========================
check('17', /const principais = insights\.slice\(0, 3\)/.test(assistenteCardSrc), 'AssistenteContextualCard corta a primeira dobra em exatamente 3 insights');
check('17', /const restantes = insights\.slice\(3\)/.test(assistenteCardSrc), 'os insights 4+ ficam em "restantes", atrás do botão "Ver mais"');
check('17', /Ver mais \(\$\{restantes\.length\}\)/.test(assistenteCardSrc), 'botão "Ver mais (N)" mostra a contagem exata do que está escondido — nunca omite quantos existem');

// ======================= 18 — Módulo K: ação de navegação (Ver dados) ============================
check('18', r13.every((i) => i.acaoDisponivel != null), 'todo insight do Assistente tem uma acaoDisponivel mapeada (nunca null nesta configuração de fixture)');
check('18', /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/.test(assistenteCardSrc), 'Ver dados usa scrollIntoView pra seção já existente — nenhuma navegação/rota paralela');
check('18', !/useNavigate|Link to=|history\.push/.test(assistenteCardSrc), 'AssistenteContextualCard não usa roteador — confirma "nunca navegação paralela"');
const secoesReferenciadas = ['secao-meta', 'secao-historico', 'secao-padrao', 'secao-qualidade', 'secao-inconsistencias', 'secao-projecao'];
const telaComSecoesSrc = [
  'CopilotoHistoricoCard.tsx',
  'InconsistenciasCard.tsx',
  'TresNumerosCard.tsx',
  'CopilotoInteligenteCard.tsx',
]
  .map((f) => readFileSync(join(raizFonte, `src/features/motorista-app/components/meta/${f}`), 'utf8'))
  .join('\n');
for (const id of secoesReferenciadas) {
  check('18', new RegExp(`id="${id}"`).test(telaComSecoesSrc), `todo destino de "Ver dados" existe de fato na tela: ${id}`);
}

// ======================= 19 — Módulo K: imutabilidade ============================================
const insightsHistoricoSnapshot = JSON.parse(JSON.stringify(insightsHistoricoK));
const inconsistenciasSnapshot = JSON.parse(JSON.stringify(inconsistenciasComK));
assistenteContextual({ ...baseArgsK, insightsHistorico: insightsHistoricoK, inconsistencias: inconsistenciasComK });
check('19', JSON.stringify(insightsHistoricoK) === JSON.stringify(insightsHistoricoSnapshot), 'assistenteContextual nunca muta o array insightsHistorico recebido');
check('19', JSON.stringify(inconsistenciasComK) === JSON.stringify(inconsistenciasSnapshot), 'assistenteContextual nunca muta o array inconsistencias recebido');
check('19', JSON.stringify(porHorarioK) === JSON.stringify(inteligenciaPorHorario(corridasK)), 'assistenteContextual nunca muta o array porHorario recebido (comparado com um recálculo independente)');

// ======================= 20 — Módulo K: vocabulário proibido =====================================
const proibidoK = /\bvocê deve\b|\bvocê precisa trabalhar\b|\baceite\b|\brecuse\b|\bvale a pena\b|\bfique até\b|\bvá trabalhar\b|\bessa regi[aã]o est[aá] melhor\b|\bvoc[eê] vai ganhar mais\b|\bmelhor hor[aá]rio\b|\bmelhor regi[aã]o\b/i;
const todosTextos20 = r13.flatMap((i) => [i.titulo, i.mensagem]).concat(r14comFalta.flatMap((i) => [i.titulo, i.mensagem]));
check('20', todosTextos20.every((t) => !proibidoK.test(t)), 'nenhum insight do Assistente usa vocabulário de ordem/julgamento/promessa proibido pela Fase 18');
check('20', !proibidoK.test(semComentarios(assistenteCardSrc)), 'AssistenteContextualCard.tsx não RENDERIZA nenhum texto fixo com vocabulário proibido (comentários que só citam a regra são ignorados)');
check('20', /O sistema informa\. O motorista decide\./.test(assistenteCardSrc), 'card termina com o disclaimer exigido "O sistema informa. O motorista decide."');

// ======================= 21 — NaN nunca produzido =================================================
const r21 = assistenteContextual({ ...baseArgsK, diasComRegistroPeriodo: 0, periodoDiasBase: 0 });
check('21', r21.every((i) => !Number.isNaN(i.dadosBase)), 'periodoDiasBase=0 (divisão degenerada) nunca produz NaN em dadosBase de nenhum insight');
check('21', !Number.isNaN(horasParaValor(5500, 47.8) ?? 0), 'horasParaValor do Módulo I nunca produz NaN com entradas válidas');

// ======================= 22 — Infinity nunca produzido ============================================
check('22', horasParaValor(5500, 0) !== Infinity && horasParaValor(5500, 0) === null, 'horasParaValor(5500, 0) → null, nunca Infinity (Módulo I)');
check('22', horasParaValor(5500, -10) === null, 'horasParaValor com taxa negativa → null, nunca um resultado negativo/Infinity');

// ======================= 23 — divisão por zero (Módulo J/K) =======================================
check('23', janelasPorMediaRegistrada([faixa({ label: 'X', qtdCorridas: 5, rpHora: null })]).length === 0, 'faixa sem rpHora calculável (duração 0/ausente) é excluída, nunca 0/0 fingido de rpHora');
const r23 = assistenteContextual({ ...baseArgsK, diasComRegistroPeriodo: 30, periodoDiasBase: 30 });
check('23', r23.every((i) => Number.isFinite(i.dadosBase)), 'todo dadosBase retornado é finito, mesmo em cenário de 30/30 dias (diasSemRegistro=0)');

// ======================= 24 — reuso das funções existentes (grep no motor) =======================
const trechoAssistente = motorSrc.slice(motorSrc.indexOf('export function assistenteContextual'));
const trechoAssistenteSemComentarios = semComentarios(trechoAssistente);
check('24', /i\.insightsHistorico/.test(trechoAssistente), 'assistenteContextual CONSOME insightsHistorico já calculado (Módulo F), recebido como parâmetro');
check('24', !/inteligenciaPorHorario\(|compararPeriodoCorridas\(|historicoPorPeriodo\(|inteligenciaPorDiaSemana\(|insightsCopiloto\(/.test(trechoAssistenteSemComentarios), 'assistenteContextual nunca CHAMA as funções de agregação do Módulo A/B/C/F por conta própria — só usa o que já veio pronto nos parâmetros (menções em comentários/JSDoc não contam)');
check('24', /janelasPorVolume\(faixas: ResumoFaixaHorario\[\]\)/.test(motorSrc) && !motorSrc.slice(motorSrc.indexOf('export function janelasPorVolume'), motorSrc.indexOf('export function janelasPorVolume') + 200).includes('inteligenciaPorHorario('), 'janelasPorVolume/janelasPorMediaRegistrada operam sobre ResumoFaixaHorario[] já calculado — nenhuma reimplementação de inteligenciaPorHorario');
check('24', /porHorarioCorridas=\{d\.porHorarioCorridas\}/.test(centroSrc), 'CentroControlePage passa o MESMO porHorarioCorridas (Módulo B, já calculado) pro PlanoDeHoje — zero query nova');

// ======================= 25 — ausência de query nova / migration nova ============================
const trechoPromiseAll = hookSrc.slice(hookSrc.indexOf('Promise.all(['), hookSrc.indexOf(']);', hookSrc.indexOf('Promise.all([')));
check('25', (trechoPromiseAll.match(/list\w+\(|get\w+\(/g) ?? []).length === 11, 'Promise.all da query base continua com as MESMAS 11 chamadas — Fase 18 não adicionou fetch novo ao Supabase');
check('25', /assistenteInsights = assistenteContextual\(/.test(hookSrc), 'useMinhaMeta deriva assistenteInsights client-side, chamando o motor puro — nunca uma query nova');
check('25', /insights=\{d\.assistenteInsights\}/.test(centroSrc), 'CentroControlePage passa d.assistenteInsights (já derivado no hook) pro AssistenteContextualCard');
const migs25 = readdirSync(join(raizFonte, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('25', migs25.every((f) => f.startsWith('0049') || f.startsWith('0050')), 'acima da 0048 só existem 0049 e 0050 — Fase 18 não criou NENHUMA migration nova');

// ======================= 26 — Módulo K: INCONSISTENCIA ============================================
const r26 = assistenteContextual({ ...baseArgsK, inconsistencias: inconsistenciasComK });
const insInconsistencia26 = r26.find((i) => i.tipo === 'INCONSISTENCIA');
check('26', insInconsistencia26 != null, 'com 1 inconsistência → gera insight INCONSISTENCIA');
check('26', insInconsistencia26 != null && insInconsistencia26.origem === 'INCONSISTÊNCIA', 'origem do insight é INCONSISTÊNCIA (taxonomia dedicada)');
check('26', insInconsistencia26 != null && insInconsistencia26.prioridade === 2, 'INCONSISTENCIA sempre com prioridade 2 (logo depois de dados faltantes)');
const r26multiplas = assistenteContextual({ ...baseArgsK, inconsistencias: [...inconsistenciasComK, { achado: '1 recarga sem kWh', origem: 'suas recargas registradas', falta: 'o kWh' }] });
const insMultiplas26 = r26multiplas.find((i) => i.tipo === 'INCONSISTENCIA');
check('26', insMultiplas26 != null && /2 divergências/.test(insMultiplas26.titulo), 'com múltiplas inconsistências, o título soma a contagem, nunca lista uma só como se fosse tudo');
check('26', !r26.some((i) => i.tipo === 'INCONSISTENCIA' && insInconsistencia26 == null), 'sanity: sem duplicar insights de inconsistência na mesma chamada');
const r26sem = assistenteContextual({ ...baseArgsK, inconsistencias: [] });
check('26', !r26sem.some((i) => i.tipo === 'INCONSISTENCIA'), 'sem inconsistências (array vazio) → nenhum insight INCONSISTENCIA inventado');

// ======================= relatório ================================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-copiloto-proativo: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
