# Relatório — Fase 19: Fundação do Centro de Inteligência Operacional (Frota)

**Data:** 2026-08-21 · **Branch:** `dev` (commits `d04c892`+`5aea170` na nuvem / `69bb6c5`+
`9ccfc02` no dispositivo — mesmo diff) · **Sem push para `main`.**

## 0. A verdade desconfortável primeiro

[Certo] **A auditoria encontrou um bloqueio estrutural que muda o que "Inteligência de Frota"
pode significar hoje**: `motorista_corridas`, `motorista_ganhos` e `motorista_recargas` — as
únicas fontes de dado operacional que existem — têm exatamente **1 policy de RLS cada (o
próprio dono) e ZERO policy de staff**. Nenhuma conta de staff, hoje, consegue fazer SELECT
nelas. Isso significa que `inteligenciaFrotaHistorica()` (Módulo 9), embora construída e
testada, **não tem nenhum dado real de frota inteira para processar** — só o próprio motorista
teria acesso ao próprio histórico, o que já existe desde a Fase 17/18.

[Provável] Não é um bug — é a "privacidade invertida" das Fases 16-18 funcionando exatamente
como projetada. Mas quer dizer que qualquer versão futura de "Inteligência de Frota" que
realmente agregue dados de vários motoristas para staff **exige uma decisão de produto sua sobre
RLS antes de existir de verdade** — não é uma questão técnica que eu resolvo sozinho numa
próxima fase.

## 1. Auditoria

`claude/auditoria-fase19-inteligencia-frota.md` — feita por dois agentes de leitura
independentes sobre o repositório real, ANTES de qualquer código, respondendo aos 24 pontos da
REGRA 0. Principais achados, todos com evidência arquivo:linha no documento:

- Zero mecanismo de geolocalização existe hoje (`navigator.geolocation` nunca chamado).
- `telemetria_eventos` existe como tabela, mas está vazia por design desde a Missão 2 (migration
  `0010`) — zero produtor, zero consumidor.
- Supabase Realtime nunca foi usado no projeto.
- `checklists.gps_lat`/`gps_lng` existem como colunas de preparo de OUTRA fase futura (Vistoria
  Inteligente), não populadas, não usadas em nenhum lugar de `src/`.
- Já existe uma tab "Inteligência da Frota" vazia (placeholder "em construção") dentro de
  `FrotaPage.tsx` — ponto de montagem natural para uma fase futura de UI.
- Já existe um módulo `features/frota/intelligence/` inteiro (health score, oportunidades
  financeiras, alertas, comparativo) — domínio diferente (saúde/valorização de ativo), com um
  tipo `Opportunity` genérico em `@/shared/intelligence/types.ts` que **não reusei** para o
  Módulo 11 desta fase porque o formato não cabe no conceito pedido (decisão explicada na seção
  4 abaixo).

## 2. Dados encontrados (reutilizáveis)

`veiculos`, `contratos`, `motoristas`, `empresas` (todas com `empresa_id`/RLS já estabelecidos);
`current_motorista_id()`/`eh_staff()`; `FAIXAS_HORARIO`/`classificarAmostra`/`DIA_SEMANA_LABEL`
(Fase 17); o padrão "privacidade invertida" (0047-0050); `checklists` genérico
(`entidade_tipo`/`entidade_id`) como o mecanismo real de vistoria/checklist de veículo.

## 3. Dados inexistentes

Nenhuma tabela de localização. Nenhuma coluna de região/bairro em `veiculos`/`contratos`.
Nenhuma biblioteca de mapa no `package.json`. Nenhuma função de distância geográfica em lugar
nenhum do repositório antes desta fase. Nenhuma integração Uber/99.

## 4. Reuso (o que NÃO foi duplicado)

`FAIXAS_HORARIO`, `classificarAmostra`, `DIA_SEMANA_LABEL` — importados de `metas.ts` (Fase 17),
não copiados, na agregação de frota. `coordenadaValida` — usado por `geo.ts` em vez de uma
segunda validação de limites geográficos. **Decisão explícita de NÃO reusar** o tipo
`Opportunity` de `@/shared/intelligence/types.ts`: aquele é sobre oportunidade financeira de
ativo (valorização de veículo para venda), campos e domínio incompatíveis com "oportunidade
histórica operacional" (região/horário) — forçar o mesmo tipo pros dois criaria uma falsa
equivalência, não uma reutilização real. Registrado em `docs/frota/INTELIGENCIA-FROTA.md`, seção
4.

## 5. Arquitetura

Motor puro + hooks client-only, mesma disciplina de camadas das fases anteriores (Fase 17/18:
motor sem `Date`/`window`/rede → hook injeta o que falta → UI só lê). 6 arquivos novos:
`localizacao.ts` (interpretação de geolocalização), `useGeolocalizacaoMotorista.ts` (chama
`navigator.geolocation`), `presenca.ts` (`presencaMotorista()`), `useHeartbeatVisibilidade.ts`
(Page Visibility API), `geo.ts` (`distanciaEntrePontos()`), `inteligenciaFrota.ts`
(`inteligenciaFrotaHistorica()`, `oportunidadeOperacional()`, tipo `RecomendacaoOperacional`,
taxonomia `OrigemDadoFrota`). **Nenhuma UI de staff foi tocada** — decisão de escopo explicada na
seção 13.

## 6. Migration — ZERO migration criada

Proposta de schema (`motorista_localizacoes`, RLS "privacidade invertida") apresentada em
`docs/frota/LOCALIZACAO-OPERACIONAL.md`, seção 2, exatamente como o Módulo 3 pediu ("PARAR.
Apresentar primeiro"). **Não criada, não aplicada.** Depende da sua aprovação.

## 7. RLS

Zero alteração. Confirmado programaticamente (auditoria script, categorias 8-12): as policies de
`motorista_corridas`/`veiculos`/`motoristas`/`contratos` continuam com a mesma contagem e a
mesma condição de antes desta fase.

## 8. Localização

Módulo 1 implementado e testado: 4 estados honestos (LOCALIZACAO_DISPONIVEL/INDISPONIVEL,
PERMISSAO_NEGADA, SEM_DADO), nunca uma coordenada inventada em nenhum ramo de erro (testado
explicitamente). **Sem persistência** — a captura funciona, mas se perde ao fechar a aba, porque
não há tabela aprovada ainda (seção 6). Detalhe completo:
`docs/frota/LOCALIZACAO-OPERACIONAL.md`.

## 9. Presença

Módulo 2/5: `presencaMotorista()` pura (janelas declaradas: ≤2min ONLINE, ≤15min
SEM_ATUALIZACAO, senão OFFLINE) + heartbeat via Page Visibility API, só em memória do
dispositivo do motorista — **não chega a staff** (mesma limitação de persistência da seção 8).
"ONLINE" documentado explicitamente como "há atividade no app", nunca "está trabalhando".

## 10. Mapa

Comparação técnica MapLibre vs. Leaflet documentada (`docs/frota/CENTRO-INTELIGENCIA-FROTA.md`,
seção 3) — recomendação Leaflet (bundle ~40KB vs. ~200KB+ gzip) para quando a UI for construída.
**Nenhuma biblioteca adicionada** ao `package.json` nesta fase.

## 11. Histórico

Módulo 8: nenhuma tabela nova — `RegistroOperacionalFrota` é um formato de entrada agnóstico de
fonte, deliberadamente não acoplado ao tipo por-motorista da Fase 17 (ver seção 0 sobre a
limitação de acesso). `inteligenciaFrotaHistorica()` agrega por faixa de horário e dia da semana,
com o campo novo `concentracaoOperacional` (fração dos registros vindos do motorista mais
presente na faixa — evita que uma "média da frota" seja, na prática, a leitura de 1 pessoa só).

## 12. Inteligência

`oportunidadeOperacional()` — nunca "demanda atual", sempre "oportunidade histórica", testado
literalmente. `RecomendacaoOperacional` — só o tipo, zero gerador (Módulo 13: "NÃO enviar, NÃO
executar, NÃO notificar, NÃO direcionar. Somente arquitetura" — respeitado à risca). Taxonomia
`OrigemDadoFrota` com 9 categorias, nunca misturadas.

## 13. Limitações

- **A limitação estrutural da seção 0** é a mais importante: sem decisão de RLS, o motor de
  frota não tem dado real pra processar.
- Localização só funciona com a aba em primeiro plano — não há captura confiável em background
  numa PWA sem Background Geolocation API (experimental, pouco suportada). Documentado em
  `docs/frota/LOCALIZACAO-OPERACIONAL.md`, seção 5.
- Nenhum teste em dispositivo iOS real foi feito (fora do escopo de uma sessão de código) —
  histórico de iOS Safari restringir mais agressivamente permissões de localização em PWA.
- **Decisão de escopo**: não toquei `FrotaPage.tsx` nem criei nenhuma tela — a especificação
  pede explicitamente para não construir "dashboard gigante" nesta fase, e eu não tinha lido essa
  tela a fundo antes de hoje; editá-la agora seria risco sem o ganho que a própria especificação
  pede para adiar.

## 14. Privacidade

Nada foi persistido nesta fase (motor 100% client-side) — a garantia de privacidade é, por ora,
automática (não há onde vazar dado que não existe). A proposta de schema da seção 6 já nasce com
zero visibilidade de staff, mesma disciplina de 0047-0050. Risco registrado para quando a
persistência existir: dar a staff qualquer visibilidade de localização muda o modelo de
privacidade que o motorista aceitou até aqui — merece consentimento revisado, não só uma RLS
nova.

## 15. Testes

`scripts/audit-motorista-inteligencia-frota.ts` — 26 categorias (os 26 casos exatos pedidos no
Módulo 19): GPS em todos os estados possíveis (permitido/negado/inexistente/timestamp
antigo/coordenada inválida/lat-lng fora dos limites), isolamento de motorista/empresa/staff por
grep estrutural sobre migrations existentes, localização sem dado, presença sem localização,
histórico vs. demanda, oportunidade histórica vs. demanda atual (texto literal testado),
distância exata (fixture matemática: 1° de longitude no equador ≈ 111,19km), mesma coordenada,
ausência de histórico/dados suficientes, Uber/99 não integrados, zero coordenada inventada, zero
motor/dashboard/query duplicado.

## 16. Resultado dos testes

**48/48** no script novo. Regressão completa (não assumida verde): os 19 scripts anteriores + o
novo, **1069/1069 combinados, zero FALHOU**. SQL real reexecutado do zero: **346/346 PASS**,
zero regressão (zero migration criada — confirmado por grep, não só por memória).

## 17. tsc

`npx tsc -b --noEmit` — limpo, exit 0, saída vazia.

## 18. Lint

`npx oxlint` (repo inteiro) — limpo. Zero warning novo nos 7 arquivos desta fase (6 de código +
1 de teste); os warnings no output são todos pré-existentes de outros arquivos.

## 19. Build

`npm run build` — ok, `✓ built in 4.42s`. Mesmos avisos pré-existentes de chunk grande
(`pdfmake`, `vfs_fonts`), não relacionados a esta fase.

## 20. Performance

Zero biblioteca nova. Zero query nova (confirmado por grep: nenhum dos 6 arquivos chama
`supabase.from(`). Hooks de geolocalização/visibilidade só chamam APIs nativas sob demanda,
nunca `setInterval` agressivo.

## 21. Arquivos alterados

**Criados (11):** `claude/auditoria-fase19-inteligencia-frota.md`,
`docs/frota/{LOCALIZACAO-OPERACIONAL,INTELIGENCIA-FROTA,CENTRO-INTELIGENCIA-FROTA}.md`,
`scripts/audit-motorista-inteligencia-frota.ts`, `src/features/frota/lib/{geo,presenca,
inteligenciaFrota}.ts`, `src/features/motorista-app/lib/localizacao.ts`,
`src/features/motorista-app/hooks/{useGeolocalizacaoMotorista,useHeartbeatVisibilidade}.ts`.
**Alterados (2):** `CLAUDE.md`, `docs/motorista/COPILOTO-PROATIVO.md` (seção 11 atualizada, não
duplicada). Total: 13 arquivos, +1441/-9 linhas.

## 22. Commit

`feat: fundacao inteligencia de frota` — nuvem `d04c892`, dispositivo `69bb6c5` (mesmo diff).
Mais um commit de limpeza (`docs(motorista): relatório da Fase 18`, arquivo que tinha ficado sem
commit da fase anterior). **Sem push para `main`.**

## 23. Bundle

Sem impacto mensurável — nenhuma tela ainda importa os 6 arquivos novos (Módulo 6/UI ficou
explicitamente fora do escopo desta fase). Os chunks do build ficaram do mesmo tamanho de antes.

## 24. Próximos passos

1. **Decisão sua, específica**: aprovar (ou ajustar) o schema proposto de
   `motorista_localizacoes` (`docs/frota/LOCALIZACAO-OPERACIONAL.md`, seção 2) — sem isso,
   localização nunca sai da memória do navegador.
2. **Decisão sua, separada da anterior**: se/quando staff deve enxergar QUALQUER coisa de
   localização/frota agregada — hoje a RLS bloqueia isso por completo (seção 0). Não é uma
   ampliação técnica trivial; é uma mudança de modelo de privacidade.
3. Testar geolocalização em device iOS real antes de qualquer expectativa de produto sobre
   confiabilidade.
4. Só depois dessas duas decisões faz sentido avançar pro Módulo 6 (UI real do Centro de
   Inteligência) e pro Módulo 7 (mapa).

---

**Próximo passo concreto:** me diga se aprova o schema de `motorista_localizacoes` da seção 6 (ou
quer ajustar algo nele) — é o único bloqueio real para a próxima fase avançar de "captura em
memória" para "captura que persiste".

**Pergunta minha sem resposta:** você quer que staff tenha ALGUMA visibilidade agregada de
localização/presença da frota, ou isso deve continuar 100% privado do motorista (só ele vê a
própria posição, como já é com corrida/ganho hoje)? É a decisão que mais muda o que a Fase 20
pode construir.
