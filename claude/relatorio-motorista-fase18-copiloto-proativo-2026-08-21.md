# Relatório — Fase 18: Copiloto Proativo do Motorista (Módulos I/J/K)

**Data:** 2026-08-21 · **Branch:** `dev` (commit `eadfa9b` na nuvem / `e7f7070` no dispositivo —
mesmo diff: 16 arquivos, +1198/-121) · **Sem push para `main`.**

## 0. Discrepância encontrada (na frente, não escondida)

[Certo] O exemplo literal da sua especificação — *"5.500 / 47,80 ≈ 114,96h"* — está
matematicamente incorreto. `5500 / 47,8 = 115,0628...h` (≈ 115h04, não 114h58/114,96h). Implementei
com o valor correto e testei explicitamente contra ele — não ajustei a fórmula nem afrouxei a
tolerância do teste para fingir bater com 114,96h. Isso não muda nada de funcional (a lógica é a
mesma: `horasParaValor(falta, taxa)`), só o número do seu exemplo estava errado.

## 1. Auditoria (feita antes do código)

[Certo] Reli o motor completo (`metas.ts`, ~2350 linhas antes desta fase) e os 3 componentes de UI
do Copiloto (Fase 17) antes de escrever qualquer linha nova. Confirmado por leitura direta:
`inteligenciaPorHorario()` (Módulo B), `insightsCopiloto()` (Módulo F), `qualidadeBaseCopiloto()`
(Módulo G), `inconsistenciasOperacionais()` e `projecoesDuplas()` (Fase 12.2/9) já existiam e
cobriam exatamente os insumos que os Módulos I/J/K precisavam — decisão tomada de reusar tudo isso
em vez de criar um segundo motor de insights (detalhe na seção 4).

## 2. Arquivos criados

- `src/features/motorista-app/components/meta/AssistenteContextualCard.tsx` — card "Seu
  Copiloto" (Módulo K), consome `assistenteInsights` já derivado no hook.
- `scripts/audit-motorista-copiloto-proativo.ts` — 91/91, 26 categorias.
- `docs/motorista/COPILOTO-PROATIVO.md` — arquitetura completa de I/J/K + seção "Futuro —
  Inteligência de Frota" (arquitetura-only).

## 3. Arquivos alterados

`metas.ts` (motor: +266 linhas — `janelasPorVolume`, `janelasPorMediaRegistrada`,
`assistenteContextual` e tipos), `useMinhaMeta.ts` (deriva `faltaMeta` e `assistenteInsights`),
`SimuladorESe.tsx` (Módulo I), `PlanoDeHoje.tsx` (Módulo J), `CopilotoInteligenteCard.tsx`
(perdeu o Módulo E antigo — ver seção 15), `CentroControlePage.tsx` (monta o novo card, passa os
props novos), `ui.tsx` (`Secao` ganhou `id?`), `CopilotoHistoricoCard.tsx` /
`InconsistenciasCard.tsx` / `TresNumerosCard.tsx` (ids de âncora para "Ver dados"), `CLAUDE.md` /
`COPILOTO-INTELIGENCIA.md` / `MINHA-META.md` (changelog).

## 4. Funções reutilizadas (nada recalculado)

`horasParaValor` (Fase 11), `inteligenciaPorHorario` (Módulo B), `insightsCopiloto` (Módulo F),
`qualidadeBaseCopiloto` (Módulo G), `inconsistenciasOperacionais`, `projecoesDuplas`,
`formatBRL`/`formatHoras`. A auditoria (categoria 24) faz grep no corpo de `assistenteContextual`
e confirma que ele NUNCA chama `inteligenciaPorHorario`/`compararPeriodoCorridas`/
`historicoPorPeriodo`/`inteligenciaPorDiaSemana`/`insightsCopiloto` diretamente — só consome o que
já chega pronto nos parâmetros.

## 5. Funções novas

`janelasPorVolume`, `janelasPorMediaRegistrada` (Módulo J — puras reordenações), `assistenteContextual`
(Módulo K — motor determinístico, zero IA/LLM/API), `faixaHorarioAtual` (helper interno, mapeia
`horaAtual` pra uma das 7 faixas fixas).

## 6. Migrations

[Certo] Zero. Confirmado programaticamente na auditoria (categoria 25): acima da `0048` só
existem `0049` e `0050`, ambas já em produção antes desta fase.

## 7. Queries

[Certo] Zero query nova ao Supabase. O `Promise.all` do hook continua com as mesmas 11 chamadas
(testado na categoria 25). `assistenteInsights` e `faltaMeta` são derivados 100% client-side no
mesmo `useMemo` que já existia.

## 8. RLS

Inalterada — nenhuma policy tocada, nenhuma tabela nova, nenhum trigger novo. Confirmado pela
suíte SQL real (346/346, ver seção 10) e pela contagem de `create policy` das migrations
0049/0050 (inalterada desde a Fase 17).

## 9. Testes

`audit-motorista-copiloto-proativo.ts`, 26 categorias, 91/91: fixtures obrigatórias (incluindo a
discrepância da seção 0), Módulo I (premissa × dado registrado, ausência de histórico,
imutabilidade, vocabulário), Módulo J (volume, média, separação das duas métricas — testado
explicitamente que uma faixa de 20 corridas e R$/h baixo aparece primeiro por volume enquanto uma
de 2 corridas e R$/h alto aparece primeiro por média —, amostra, ausência de dados, vocabulário),
Módulo K (tipos herdados do F, `DADO_INSUFICIENTE` dedicado, `PROJECAO`, `INCONSISTENCIA`,
prioridade completa 1→9, máximo 3 na primeira dobra, navegação "Ver dados", imutabilidade,
vocabulário), NaN/Infinity/divisão-por-zero, reuso, ausência de query/migration nova.

[Certo] Durante a escrita dos testes, bati de novo na MESMA classe de falso-positivo já vista na
Fase 17: um comentário/JSDoc que só EXPLICA a regra ("nunca 'você consegue'...") acionava o
próprio grep de vocabulário proibido, porque o teste rodava contra o arquivo inteiro sem excluir
comentários. Corrigi filtrando `//` e `/* */` antes do grep nas categorias afetadas (5 e 24) — a
mesma lição da Fase 17, agora resolvida de forma mais genérica (função `semComentarios()`) em vez
de reescrever cada comentário linha a linha.

## 10. Resultado dos testes (regressão completa, não assumida verde)

- 18 audit scripts anteriores (8 motorista + 9 jurídico/amortização) + o novo:
  **1021/1021, zero FALHOU.**
- SQL real, banco recriado do zero (`pc_test`, todas as 50 migrations): **346/346 PASS**, zero
  regressão. [Palpite baixo] O Postgres local não estava rodando no início desta sessão
  (`service postgresql start` foi necessário) — não é sinal de nada quebrado, só o container
  tinha acabado de subir.

## 11. tsc

`npx tsc -b --noEmit` — limpo (saída vazia, exit 0).

## 12. Lint

`npx oxlint` — limpo. 2 warnings novos apareceram na primeira rodada (imports/parâmetro não
usados no meu próprio script de teste) — corrigidos antes de considerar a fase pronta; os
warnings restantes no output são pré-existentes de outros arquivos, não desta fase.

## 13. Build

`npm run build` — ok, `✓ built in 3.65s`. Avisos de chunk grande (`pdfmake`, `vfs_fonts`) são
pré-existentes, não relacionados a esta fase.

## 14. Performance

Zero biblioteca nova, zero LLM/API externa, zero query nova (seção 7), zero `setInterval`/push —
o Assistente só roda quando o Centro de Controle está aberto na tela, exatamente como pedido.

## 15. Limitações e decisões de arquitetura (declaradas, não escondidas)

- **[Decisão]** `assistenteContextual()` (Módulo K) REUSA `insightsCopiloto()` (Módulo F) como
  fonte primária em vez de reimplementar a geração de HORARIO/DIA_SEMANA/META/CORRIDA/REGISTRO —
  não estava escrito literalmente na sua especificação, mas segue a "regra absoluta de reuso" que
  já regia as fases anteriores. Risco que eu descartei conscientemente: ter dois motores gerando
  "maior média registrada às 18h-21h" com textos ligeiramente diferentes entre si.
- **[Decisão]** O antigo Módulo E (lista de insights, dentro de `CopilotoInteligenteCard.tsx` na
  Fase 17) foi **removido** — ficou redundante depois que o Assistente passou a cobrir a mesma
  fonte com mais recursos (prioridade, navegação, contexto temporal). `CopilotoInteligenteCard.tsx`
  ficou só com a grade Módulo D (meta conectada).
- **[Decisão]** `HORARIO` e `DIA_SEMANA` compartilham o mesmo destino de navegação
  (`secao-padrao`), porque `PadraoHorarioDiaCard` (Fase 17) já combina os dois num card único com
  abas. Simplificação deliberada, não uma seção faltando.
- Gap conhecido da Fase 17, ainda não resolvido: `peso_rpcorrida` continua gravável no banco sem
  efeito em `avaliarCorrida()` — fora do escopo desta fase.
- Faixas de horário/dia da semana continuam limitadas aos 90 dias de corridas que o hook já busca
  (limitação herdada, não nova).

## 16. Próximos passos recomendados

1. Validar visualmente o Centro de Controle (o card "Seu Copiloto" logo após a grade de meta, com
   no máximo 3 insights e o botão "Ver mais").
2. Resolver o gap de `peso_rpcorrida` (usar ou remover da superfície de configuração).
3. Fase futura "Inteligência de Frota" — arquitetura documentada em `COPILOTO-PROATIVO.md`, seção
   11, explicitamente SEM GPS/mapa/heatmap/região/demanda — não iniciar sem especificação própria.
4. Depois de validar em `dev`, promover para `main` (não fiz esse merge — só você decide isso).

## 17. Pendência da Fase 17 (ainda sem resposta sua)

O relatório da 2ª passada da Fase 17 (`claude/relatorio-motorista-fase17-copiloto-inteligente-
reconciliacao-2026-08-21.md`) tinha duas perguntas de design abertas que você não respondeu — só
seguiu direto para a Fase 18. Registrando de novo para não se perder: elas seguem sem decisão sua.
Se quiser, me diga quais eram que eu retomo o contexto e resumo aqui.

---

**Próximo passo concreto:** abra o Centro de Controle em `dev` (local ou preview do Vercel) e
confirme visualmente que o card "Seu Copiloto" aparece do jeito esperado — depois disso, me diga
se quer que eu prepare o merge pra `main`.

**Pergunta minha sem resposta:** quais eram as duas decisões de design pendentes da Fase 17 (seção
17 acima) — ainda quer decidir sobre elas, ou seguimos sem voltar nisso?
