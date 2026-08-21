# Copiloto Inteligente do Motorista — Fase 17

> Auditoria de reuso completa (obrigatória, feita ANTES do código):
> `claude/auditoria-fase17-copiloto-inteligente.md`. Este documento descreve a arquitetura,
> as fontes de dado, as fórmulas, a classificação de honestidade dos dados, as limitações,
> a privacidade, o reuso e as decisões de escopo desta fase. Atualizado numa segunda passada
> de reconciliação desta mesma fase (ver seção 11) — nomes de função e campos abaixo já
> refletem essa passada.

## 1. Arquitetura

Tudo vive em três camadas, na mesma disciplina do resto do app do motorista:

1. **Motor puro** (`src/features/motorista-app/lib/metas.ts`) — funções sem rede, sem estado,
   sem dependência de React. Módulos A/B/C/F/G desta fase inteira cabem em ~10 funções novas,
   todas testáveis isoladamente.
2. **Agregador único** (`src/features/motorista-app/hooks/useMinhaMeta.ts`) — uma única query
   (`useQuery`) busca os dados; um único `useMemo` deriva tudo, incluindo os campos novos desta
   fase (`historicoPeriodos`, `porHorarioCorridas`, `porDiaSemanaCorridas`,
   `qualidadeBaseCorridas`, `insightsCopilotoLista`).
3. **UI**, três componentes com responsabilidades separadas (nenhum faz cálculo de negócio —
   todos só leem o que o hook já derivou):
   - `CopilotoInteligenteCard.tsx` — **"Seu Copiloto"** (Módulos D+E): grid conectado à meta de
     hoje (`hojeCockpit`, sem motor novo) + os insights automáticos mais relevantes do momento
     (consome `insightsCopiloto()`, Módulo F, sem recalcular nada).
   - `CopilotoCard.tsx` — ferramenta de avaliar/registrar corrida individual (Fase 16) + o
     impacto matemático da última corrida registrada sobre a meta de hoje (parte do Módulo D) +
     "Configurações do Copiloto" (Módulo H, inline).
   - `CopilotoHistoricoCard.tsx` — os três cards de leitura histórica: Histórico de corridas
     (Módulo A), Inteligência por horário/dia da semana (Módulos B/C) e Qualidade da base
     (Módulo G).

Nenhuma camada nova foi criada — a Fase 17 estende exatamente as três camadas que já existiam.

## 2. Fontes de dado

Única fonte: `motorista_corridas` (migration 0049, já aplicada em produção) via
`listCorridasPeriodo(inicio, fim)`, a MESMA chamada que a Fase 16 já fazia (90 dias, variável
`corridas60` no hook — o nome é legado da Fase 16, a janela real são os últimos 90 dias). A
Fase 17 não adicionou nenhuma query nova ao Supabase — os Módulos A/B/C/F/G filtram e agrupam,
em memória, o mesmo array que já chegava do banco.

Configuração do semáforo: `motorista_config_copiloto` (migration 0050, já aplicada em
produção), via `getConfigCopiloto()`/`salvarConfigCopiloto()` — também já existentes desde a
Fase 16.

## 3. Fórmulas (todas com origem declarada)

- **R$/km** e **R$/h**: exclusivamente via `calcularRpKm(valor, km)` e `calcularRph(valor, horas)`
  — as duas únicas funções de divisão que existem para essas métricas em todo o app. Nenhum
  módulo novo reimplementa uma divisão.
- **Histórico de período** (`historicoPorPeriodo(corridas, periodoDias, hojeIso)` — Módulo A):
  soma valor/km/duração das corridas dentro da janela; R$/km e R$/h do período são calculados
  sobre os TOTAIS do período (não a média das médias individuais) — mesma convenção de
  `janelaOperacional` para `motorista_ganhos`. Campos: `qtdCorridas`, `valorTotal`,
  `valorMedioPorCorrida`, `rpHora`, `rpKm`, `kmEstimadoTotal`, `horasEstimadasTotal`,
  `duracaoTotalMin`, `duracaoMediaMin`, `diasComRegistro`, `mediaCorridasPorDiaComRegistro`,
  `distribuicaoPorApp`.
- **Comparação de período** (`compararPeriodoCorridas`): reusa `historicoPorPeriodo` dos dois
  lados (atual e anterior) e `campoEvolucao` (a mesma função da Fase 12.2) — mesmo formato de
  variação absoluta/percentual (`rotulo/atual/anterior/variacaoAbs/variacaoPct`) em todo o app,
  em vez de inventar 8 campos `deltaX`/`deltaXPct` novos quando o formato reusável já cobre
  exatamente isso (decisão de reuso registrada explicitamente — ver seção 11).
- **Faixas de horário** (`inteligenciaPorHorario` — Módulo B): 7 faixas fixas (00–06, 06–09,
  09–12, 12–15, 15–18, 18–21, 21–00), agrupadas pela hora informada na corrida
  (`motorista_corridas.hora`). Corrida sem horário informado, ou com horário inválido, NUNCA
  entra em nenhuma faixa (horário nunca é inventado, nunca vira "00h"). Cada faixa carrega
  `inicio`/`fim`/`label`, `qtdCorridas`, `valorTotal`, `valorMedioPorCorrida`, `rpHora`, `rpKm`,
  `diasObservados` e `classificacaoAmostra`.
- **Dia da semana** (`inteligenciaPorDiaSemana` — Módulo C): agrupado por `getDay()` da DATA REAL
  da corrida (nunca `motorista_ganhos`). Mesmos campos de valor/R$-por-km/hora da faixa de
  horário, mais `duracaoMediaMin` e `diasObservados`.
- **Classificação de amostra** (`classificarAmostra`): <3 dados_insuficientes · 3–6 base_inicial
  · 7–13 base_consistente · 14+ base_relevante. Existe UM enum próprio para isso
  (`ClassificacaoAmostra`), distinto de `ConfiancaDados` (que é sobre dias de `motorista_ganhos`,
  domínio diferente, limiares diferentes).

## 4. Classificação de honestidade dos dados

Todo número mostrado carrega origem explícita:

- **DADO REGISTRADO** — veio direto de uma linha de `motorista_corridas` que o motorista
  registrou.
- **SEM DADOS SUFICIENTES** — não há registros (ou não há registros do período anterior para
  comparar) — nunca um número inventado no lugar.
- **SEM DADO** / **SEM COMPARAÇÃO** — usados na UI quando o campo correspondente é `null`.

`insightsCopiloto` (Módulo F) carrega em CADA insight: `id` (identificador único), `tipo`,
`titulo`, `descricao`, `origem`, `periodo`, `classificacaoAmostra` (a `ClassificacaoAmostra`
acima — campo renomeado nesta passada de reconciliação; antes se chamava `confiancaDados`) e
`dadosBase` (quantas observações sustentam aquele insight específico) — a UI nunca precisa
adivinhar quão confiável é um número.

## 5. Limitações conhecidas (declaradas, não escondidas)

- `motorista_config_copiloto.peso_rpcorrida` existe no banco e na API desde a Fase 16, mas
  `avaliarCorrida()` (e, por consequência, nenhum dos módulos desta fase) ainda usa um critério
  de R$/corrida — é um gap real, fora do pedido explícito da Fase 17, não resolvido aqui.
  Decisão tomada (opção preferida, explícita): "Peso R$/corrida" NÃO aparece na UI de
  Configurações do Copiloto enquanto o motor não o usa — não fingimos que ele funciona.
- Módulos I (cenários com "usar minha média registrada"), J (Plano de Hoje com "janelas com mais
  registros") e K (assistente contextual Q&A) NÃO foram implementados nesta passada — decisão de
  escopo registrada na auditoria, seção 0.
- Faixas de horário e dias da semana são calculados sobre no máximo 90 dias de corridas (a
  mesma janela que o hook já busca) — não há histórico "desde sempre".
- **Comparação de período de 90 dias**: como a query busca só os últimos 90 dias de corridas, o
  "período anterior" de uma comparação de 90 dias (dias -179 a -90) cai inteiramente FORA da
  janela buscada. Na prática, `compararPeriodoCorridas(…, 90, …)` quase sempre retorna
  `anterior: null` ("SEM COMPARAÇÃO") — o motor está correto (nunca finge um período anterior
  vazio como "zero corridas reais"), mas o dado simplesmente não existe em memória para
  comparar. Resolver isso pediria dobrar a janela buscada (180 dias) só para o período de 90d —
  decisão consciente de NÃO fazer isso nesta fase (fora do pedido, e mudaria o volume de dados
  buscado do banco).
- `inteligenciaPorHorario`/`inteligenciaPorDiaSemana` não filtram por período (usam todas as
  corridas passadas, até 90 dias); `insightsCopiloto` recebe `periodo` explícito (default 30d).

## 6. Privacidade e RLS

Nenhuma tabela nova, nenhuma policy nova, nenhum trigger novo. Os Módulos A–H leem e escrevem
exclusivamente em `motorista_corridas`/`motorista_config_copiloto`, ambas com RLS "privacidade
invertida" (1 policy do dono, zero policy de staff, zero audit_log) — provada pela suíte SQL
real (`68_motorista_copiloto.sql`, reexecutada nesta fase dentro do harness completo: 346/346).

## 7. Reuso (o que esta fase NÃO duplicou)

`calcularRpKm`, `calcularRph`, `campoEvolucao`, `arred`, `seguro`, `DIA_SEMANA_LABEL`,
`listCorridasPeriodo`, `getConfigCopiloto`, `salvarConfigCopiloto`, `lerTolerante('copiloto', …)`,
`moduloIndisponivel('copiloto')`, o padrão de config inline (`mostrarConfig`, o mesmo já usado
para `motorista_meta_config`), `horasParaValor` (Fase 11, reusada pelo impacto de corrida do
Módulo D), e o padrão dos demais audit scripts do motorista (convenção idêntica no de Copiloto
Inteligente).

## 8. Decisões de escopo (registradas, não silenciosas)

Ver `claude/auditoria-fase17-copiloto-inteligente.md`, seção 0. Resumo: Módulos A/B/C/D/E/F/G/H
implementados e testados nesta passada; Módulos I/J/K ficam para a próxima; Módulo L
(arquitetura futura) é só documentação (ver `COPILOTO-INTELIGENCIA-FUTURA.md`).

## 9. O que NÃO existe (declarado explicitamente)

- Nenhuma rota nova (`/motorista/copiloto/configuracoes` NÃO existe — Configurações é um bloco
  inline, seguindo o padrão já estabelecido).
- Nenhum assistente conversacional (Módulo K) — não implementado nesta passada.
- Nenhuma extensão de `cenariosOperacionais` (Módulo I) — não implementada nesta passada.
- Nenhuma migration nova.
- Nenhuma integração com IA externa em nenhum ponto (todo o Copiloto é determinístico, motor
  puro sobre dados registrados).

## 10. Próximos passos recomendados

1. Módulo K (Assistente Contextual) — merece uma auditoria de vocabulário dedicada antes de
   codificar, dado o risco de deslizar para afirmação categórica.
2. Módulos I/J — extensões pequenas, mas cada uma pede fixtures determinísticas próprias.
3. Resolver o gap de `peso_rpcorrida` (usar ou remover da superfície de configuração/banco, para
   não deixar um campo gravável que não tem efeito nenhum).
4. Se a comparação de período de 90 dias for considerada valiosa o suficiente, avaliar dobrar a
   janela buscada (180 dias) só para viabilizá-la — hoje ela é SEM COMPARAÇÃO na prática (seção 5).

## 11. Segunda passada — reconciliação com a auditoria de reuso

Esta fase foi entregue em duas passadas na mesma sessão. A primeira implementou os Módulos
A–H+L a partir da especificação inicial. Uma segunda especificação, mais detalhada — citando uma
auditoria de reuso com nomes de função e campos literais — pediu uma reconciliação: a função
`resumoPeriodoCorridas` foi renomeada para `historicoPorPeriodo` (nome exigido pela auditoria);
`ResumoFaixaHorario`/`ResumoDiaSemanaCorridas`/`QualidadeBaseCopiloto` ganharam os campos novos
citados acima; `InsightCopiloto.confiancaDados` foi renomeado para `classificacaoAmostra` e
ganhou `id`; a UI foi reestruturada para que `CopilotoInteligenteCard.tsx` seja literalmente o
card "Seu Copiloto" (Módulos D+E), com o histórico/padrões/qualidade movidos para
`CopilotoHistoricoCard.tsx`; e o impacto matemático da corrida registrada (parte do Módulo D)
foi movido para dentro de `CopilotoCard.tsx`. O script de auditoria automatizada foi reescrito
de 22 para 26 categorias numeradas, cobrindo as fixtures obrigatórias citadas pela segunda
especificação (R$1000/20h, R$1000/200km, R$1000/10 corridas, 1160 vs. 1000 anterior). Nenhuma
migration, RLS ou fetch novo foi introduzido nesta reconciliação — só o motor puro, o agregador
e a UI foram ajustados.

A auditoria de reuso citada pela segunda especificação
(`claude/auditoria-reuso-fase17-copiloto-inteligente-2026-08-21.md`) e o commit-base que ela
citava (`01e9c6c`/`db80bd8`) não correspondem exatamente ao que existe neste repositório — o
documento de auditoria real desta fase é `claude/auditoria-fase17-copiloto-inteligente.md`, e o
código já havia avançado para `b90a25a`/`8152a35` antes da segunda especificação chegar. Isso é
tratado como uma discrepância de nomenclatura/referência entre as duas mensagens, não como um
sinal de que outro trabalho preexistente foi ignorado — todo o conteúdo técnico pedido (nomes de
função, campos, fixtures, regras de vocabulário) foi aplicado literalmente.
