# Copiloto Inteligente do Motorista — Fase 17

> Auditoria de reuso completa (obrigatória, feita ANTES do código):
> `claude/auditoria-fase17-copiloto-inteligente.md`. Este documento descreve a arquitetura,
> as fontes de dado, as fórmulas, a classificação de honestidade dos dados, as limitações,
> a privacidade, o reuso e as decisões de escopo desta fase.

## 1. Arquitetura

Tudo vive em três camadas, na mesma disciplina do resto do app do motorista:

1. **Motor puro** (`src/features/motorista-app/lib/metas.ts`) — funções sem rede, sem estado,
   sem dependência de React. Módulos A/B/C/F/G desta fase inteira cabem em ~10 funções novas,
   todas testáveis isoladamente.
2. **Agregador único** (`src/features/motorista-app/hooks/useMinhaMeta.ts`) — uma única query
   (`useQuery`) busca os dados; um único `useMemo` deriva tudo, incluindo os campos novos desta
   fase (`historicoPeriodos`, `porHorarioCorridas`, `porDiaSemanaCorridas`,
   `qualidadeBaseCorridas`, `insightsCopilotoLista`).
3. **UI** (`components/meta/CopilotoCard.tsx` + `CopilotoInteligenteCard.tsx`) — consome o que
   o hook já derivou; nenhum componente faz cálculo de negócio.

Nenhuma camada nova foi criada — a Fase 17 estende exatamente as três camadas que já existiam.

## 2. Fontes de dado

Única fonte: `motorista_corridas` (migration 0049, já aplicada em produção) via
`listCorridasPeriodo(inicio, fim)`, a MESMA chamada que a Fase 16 já fazia (90 dias, variável
`corridas60` no hook). A Fase 17 não adicionou nenhuma query nova ao Supabase — os Módulos
A/B/C/F/G filtram e agrupam, em memória, o mesmo array que já chegava do banco.

Configuração do semáforo: `motorista_config_copiloto` (migration 0050, já aplicada em
produção), via `getConfigCopiloto()`/`salvarConfigCopiloto()` — também já existentes desde a
Fase 16.

## 3. Fórmulas (todas com origem declarada)

- **R$/km** e **R$/h**: exclusivamente via `calcularRpKm(valor, km)` e `calcularRph(valor, horas)`
  — as duas únicas funções de divisão que existem para essas métricas em todo o app. Nenhum
  módulo novo reimplementa uma divisão.
- **Resumo de período** (`resumoPeriodoCorridas`): soma valor/km/duração das corridas dentro da
  janela; R$/km e R$/h do período são calculados sobre os TOTAIS do período (não a média das
  médias individuais) — mesma convenção de `janelaOperacional` para `motorista_ganhos`.
- **Comparação de período** (`compararPeriodoCorridas`): reusa `campoEvolucao` (a mesma função
  da Fase 12.2) — mesmo formato de variação absoluta/percentual em todo o app.
- **Faixas de horário** (`inteligenciaPorHorario`): 7 faixas fixas (00–06, 06–09, 09–12, 12–15,
  15–18, 18–21, 21–00), agrupadas pela hora informada na corrida (`motorista_corridas.hora`).
  Corrida sem horário informado NUNCA entra em nenhuma faixa (horário nunca é inventado).
- **Dia da semana** (`inteligenciaPorDiaSemana`): agrupado por `getDay()` da data da corrida.
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

`insightsCopiloto` também carrega `confiancaDados` (a `ClassificacaoAmostra` acima) e
`dadosBase` (quantas observações sustentam aquele insight específico) em CADA insight — a UI
nunca precisa adivinhar quão confiável é um número.

## 5. Limitações conhecidas (declaradas, não escondidas)

- `motorista_config_copiloto.peso_rpcorrida` existe no banco e na API desde a Fase 16, mas
  `avaliarCorrida()` (e, por consequência, nenhum dos módulos desta fase) ainda usa um critério
  de R$/corrida — é um gap real, fora do pedido explícito da Fase 17, não resolvido aqui.
- Módulos I (cenários com "usar minha média registrada"), J (Plano de Hoje com "janelas com mais
  registros") e K (assistente contextual Q&A) NÃO foram implementados nesta passada — decisão de
  escopo registrada na auditoria, seção 0.
- Faixas de horário e dias da semana são calculados sobre no máximo 90 dias de corridas (a
  mesma janela que o hook já busca) — não há histórico "desde sempre".
- `inteligenciaPorHorario`/`inteligenciaPorDiaSemana` não filtram por período (usam todas as
  corridas passadas, até 90 dias); `insightsCopiloto` recebe `periodo` explícito (default 30d).

## 6. Privacidade e RLS

Nenhuma tabela nova, nenhuma policy nova, nenhum trigger novo. Os Módulos A–H leem e escrevem
exclusivamente em `motorista_corridas`/`motorista_config_copiloto`, ambas com RLS "privacidade
invertida" (1 policy do dono, zero policy de staff, zero audit_log) — provada por 26 asserts SQL
reais (suíte `68_motorista_copiloto.sql`, reexecutada nesta fase: 346/346 no harness completo).

## 7. Reuso (o que esta fase NÃO duplicou)

`calcularRpKm`, `calcularRph`, `campoEvolucao`, `arred`, `seguro`, `DIA_SEMANA_LABEL`,
`listCorridasPeriodo`, `getConfigCopiloto`, `salvarConfigCopiloto`, `lerTolerante('copiloto', …)`,
`moduloIndisponivel('copiloto')`, o padrão de config inline (`mostrarConfig`, o mesmo já usado
para `motorista_meta_config`), e o padrão dos 8 audit scripts anteriores (convenção idêntica no
9º).

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
3. Resolver o gap de `peso_rpcorrida` (usar ou remover da superfície de configuração, para não
   deixar um campo configurável que não tem efeito nenhum).
