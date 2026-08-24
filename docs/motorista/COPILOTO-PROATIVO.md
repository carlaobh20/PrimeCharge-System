# Copiloto Proativo do Motorista — Fase 18 (Módulos I/J/K)

> Estende a Fase 17 (validada: 930/930 nos 18 audit scripts anteriores, SQL 346/346, tsc limpo,
> build limpo — ver `COPILOTO-INTELIGENCIA.md`). ZERO migration usada como ponto de partida e ZERO
> migration criada nesta fase. Auditoria automatizada:
> `scripts/audit-motorista-copiloto-proativo.ts` (91/91).

## 1. Objetivo e regra de ouro

Transforma o Copiloto de um painel de leitura em um assistente operacional que responde: **"Com
base no que eu registrei, como está minha operação e quais informações são relevantes para minha
decisão agora?"**

Regra de ouro, aplicada em cada linha de texto escrita nesta fase: o PrimeCharge nunca transforma
correlação em causalidade, média em garantia, estimativa em fato, premissa em dado, pouca
observação em conclusão, informação em ordem. **O sistema informa. O motorista decide.**

Por isso o Assistente Contextual (Módulo K) NÃO é um chatbot genérico, NÃO inventa dado, NÃO
promete ganho, NÃO decide aceitar/recusar corrida e NÃO diz onde o motorista "deve" trabalhar.

## 2. Arquitetura — mesmas três camadas da Fase 17

1. **Motor puro** (`src/features/motorista-app/lib/metas.ts`) — bloco "FASE 18 — COPILOTO
   PROATIVO", ao final do arquivo. Zero rede, zero React, zero `Date`/`window`/`localStorage`.
2. **Agregador único** (`src/features/motorista-app/hooks/useMinhaMeta.ts`) — o mesmo `useMemo`
   ganhou dois campos novos: `faltaMeta` (cópia do que já era mostrado em "Falta p/ meta") e
   `assistenteInsights` (resultado de `assistenteContextual()`). `horaAtual` é computado AQUI,
   no hook — `new Date().toTimeString().slice(0, 5)` — porque o motor em `metas.ts` nunca lê
   relógio.
3. **UI**:
   - `SimuladorESe.tsx` — Módulo I: seção nova "Quanto falta, em horas?" acima dos sliders.
   - `PlanoDeHoje.tsx` — Módulo J: seção nova "Janelas com mais registros" /
     "Janelas com maior média registrada" após o bloco "Falta p/ meta".
   - `AssistenteContextualCard.tsx` (novo arquivo) — Módulo K: card "Seu Copiloto" com os
     insights priorizados, montado em `CentroControlePage.tsx` logo após
     `CopilotoInteligenteCard` (que ficou só com a grade Módulo D — o antigo Módulo E, lista de
     insights, foi substituído por este card).

Nenhuma camada nova. Nenhuma rota nova. Nenhum estado global novo.

## 3. Módulo I — Simulador Inteligente

`SimuladorESe` ganhou o prop opcional `faltaMeta?: number | null` (= `max(0, metaMensal −
realizado)`, a mesma expressão já mostrada no Plano de Hoje). Quando `faltaMeta > 0`, mostra:

```
Falta: R$ 5.500,00
Meta pela PREMISSA (R$ 40,00/h): 137h30
Minha média registrada (R$ 47,80/h) · DADO REGISTRADO: 115h04
"Matematicamente, utilizando sua média registrada, a diferença corresponde a 115h04 —
SIMULAÇÃO, não é garantia de resultado."
```

Sem `mediaRegistrada` válida (`null`/`0`): "Não há registros suficientes para usar sua média."

Ambos os valores em horas vêm de `horasParaValor(faltaMeta, taxa)` — a MESMA função já usada pelo
impacto de corrida do Módulo D (Fase 17) e pelo Módulo 2 do Plano de Hoje (Fase 11). Nenhuma
divisão nova foi escrita. O simulador continua operando 100% sobre `useState` local
(`dias`/`renda`/`custo`) — Módulo I só acrescentou leitura, nunca grava `renda_hora`, meta,
configuração ou linha de banco.

**Nota sobre o exemplo da especificação** — ver seção 9 (discrepância aritmética).

## 4. Módulo J — Plano de Hoje Inteligente

Duas funções novas no motor, ambas puras reordenações de `inteligenciaPorHorario()` (Módulo B,
Fase 17) — nenhuma agregação nova:

```ts
janelasPorVolume(faixas)         // ordena por qtdCorridas desc
janelasPorMediaRegistrada(faixas) // filtra rpHora != null, ordena por rpHora desc
```

`PlanoDeHoje` ganhou o prop opcional `porHorarioCorridas?: ResumoFaixaHorario[]` (= o mesmo
`inteligenciaPorHorario(corridas60)` que a Fase 17 já calculava, passado por
`CentroControlePage`). Renderiza as top-3 de cada ranking em duas seções **separadas**:

- **"Janelas com mais registros"** — volume puro.
- **"Janelas com maior média registrada"** — rentabilidade pura, com o aviso "leitura do que já
  aconteceu, não uma indicação de quando trabalhar."

As duas métricas são deliberadamente independentes: uma faixa pode ter muito volume e média
baixa; outra, pouco volume e média alta (testado explicitamente na categoria 9 da auditoria). O
sistema nunca diz "melhor horário" nem "trabalhe nesta faixa" — cada janela mostra
`qtdCorridas`, `rpHora` (quando calculável) e a `Pill` de `classificacaoAmostra`, para o
motorista avaliar a confiabilidade de cada leitura por conta própria.

## 5. Módulo K — Assistente Contextual

`assistenteContextual()` (motor puro) e `AssistenteContextualCard.tsx` (UI). **Zero IA externa,
zero LLM, zero chamada de API, zero rede** — é uma função determinística que reorganiza dados já
calculados.

### 5.1 Decisão de arquitetura: reuso em vez de um segundo motor de insights

Em vez de reimplementar a geração de insights, `assistenteContextual()` **consome**
`insightsCopiloto()` (Módulo F, Fase 17) como fonte primária e mapeia os 9 tipos granulares do
Módulo F para os 9 tipos do Assistente:

| Módulo F (`TipoInsightCopiloto`) | Assistente (`TipoInsightAssistente`) |
|---|---|
| `EVOLUCAO`, `RPH`, `RPKM` | `HISTORICO` |
| `HORARIO`, `DIA_SEMANA`, `META`, `CORRIDA`, `REGISTRO` | mesmo nome |
| `DADO_INSUFICIENTE` | tratado à parte (ver 5.2) — o Assistente gera um mais específico |

Sobre essa base, o Assistente acrescenta: prioridade determinística, `acaoDisponivel` (navegação
"Ver dados"), um `DADO_INSUFICIENTE` mais específico (dias sem registro no período, via
`qualidadeBaseCopiloto()`), `INCONSISTENCIA` (via `inconsistenciasOperacionais()`, Fase 12.2),
`PROJECAO` (via `projecoesDuplas()`, Fase 9) e contexto temporal — só no insight de `HORARIO`, só
quando `horaAtual` existe.

Essa decisão (reuso em vez de um segundo motor) não estava explicitada literalmente na
especificação — é a leitura mais direta da "REGRA ABSOLUTA" de reuso que já regia as fases
anteriores, e evita ter dois lugares diferentes gerando "a maior média registrada do horário X"
com pequenas divergências de texto entre si.

### 5.2 Tipos e prioridade

```ts
type TipoInsightAssistente =
  'META' | 'REGISTRO' | 'HISTORICO' | 'HORARIO' | 'DIA_SEMANA' |
  'DADO_INSUFICIENTE' | 'INCONSISTENCIA' | 'CORRIDA' | 'PROJECAO';
```

Ordem de prioridade (1 = mostrado primeiro): 1 `DADO_INSUFICIENTE` → 2 `INCONSISTENCIA` → 3
`META` → 4 `CORRIDA` → 5 `REGISTRO` → 6 `HISTORICO` → 7 `HORARIO` → 8 `DIA_SEMANA` → 9
`PROJECAO` — exatamente a ordem pedida (dados faltantes → divergências → meta → estado
operacional → histórico → horário → dia da semana → projeção).

### 5.3 Contexto temporal

O motor **nunca lê relógio** — `horaAtual: string | null` (`'HH:MM'`) é passado pelo chamador
(computado uma vez em `useMinhaMeta.ts`). Quando presente e válido, o insight de `HORARIO` ganha
uma frase adicional declarando a origem: *"Agora são 19:30 (relógio do dispositivo) — você está
na faixa 18h–21h, com 31 registro(s) e R$ 47,80/h nos dados disponíveis."* Quando ausente ou
inválido: *"Sem horário atual disponível."* — nunca inventado, nunca silenciosamente omitido.

### 5.4 Origem declarada em cada insight

```ts
type OrigemInsightAssistente =
  'DADO REGISTRADO' | 'HISTÓRICO' | 'DADOS INSUFICIENTES' | 'INCONSISTÊNCIA' | 'PROJEÇÃO';
```

Taxonomia própria do Módulo K (distinta de `OrigemInsightCopiloto` do Módulo F, que só tinha
`'DADO REGISTRADO' | 'SEM DADOS SUFICIENTES'`) — mais granular porque o Assistente combina fontes
de naturezas diferentes (leitura do dia, histórico, inconsistência, projeção) na mesma lista.

### 5.5 Navegação — "Ver dados"

Cada insight carrega `acaoDisponivel: 'meta' | 'historico' | 'padrao' | 'qualidade' |
'inconsistencias' | 'projecao' | null`. O botão "Ver dados" chama
`document.getElementById(\`secao-${acao}\`)?.scrollIntoView(...)` — rolagem para uma seção que já
existe na tela. **Nenhuma rota nova, nenhum estado de aba levantado, nenhuma navegação
paralela.** `HORARIO` e `DIA_SEMANA` compartilham o mesmo destino (`secao-padrao`) porque
`PadraoHorarioDiaCard` (Fase 17) já combina os dois num único card com abas — decisão de
simplificação registrada aqui, não uma omissão.

### 5.6 Prioridade na tela e "Ver mais"

`AssistenteContextualCard` mostra no máximo 3 insights na primeira dobra (`insights.slice(0,
3)`); o restante fica atrás de um botão "Ver mais (N)" que sempre mostra a contagem exata do que
está escondido.

### 5.7 Notificações e corrida individual

Nenhuma notificação push, cron ou serviço externo — o Assistente só existe quando o Centro de
Controle é renderizado (é um card React normal, sem `setInterval`/`Notification` API). Não
substitui a avaliação individual de corrida da Fase 16 (`CopilotoCard`/`avaliarCorrida()`), que
continua separada; o Assistente pode citar "você registrou uma corrida de R$X" (via o insight
`CORRIDA`, herdado do Módulo F), mas nunca decide aceitar/recusar.

## 6. Vocabulário — testado, não só documentado

A auditoria (`scripts/audit-motorista-copiloto-proativo.ts`, categorias 5/12/20) faz grep dos
componentes por frases proibidas: *"você consegue"*, *"você vai conseguir"*, *"você precisa
trabalhar"*, *"melhor horário"*, *"trabalhe neste horário"*, *"vá trabalhar"*, *"fique até"*,
*"essa região está melhor"*, *"vale a pena"*, *"você vai ganhar mais"*. Os testes ignoram
comentários (`//` e `/* */`) para não gerar falso-positivo quando um comentário só EXPLICA a
regra citando a frase proibida entre aspas — problema real encontrado e corrigido durante esta
mesma auditoria (categorias 5 e 24 falharam na primeira rodada por esse motivo exato, corrigido
filtrando comentários antes do grep).

## 7. Testes

`scripts/audit-motorista-copiloto-proativo.ts` — 91/91, 26 categorias: fixtures obrigatórias,
discrepância aritmética do exemplo da especificação (seção 9), Módulo I (premissa × dado
registrado, ausência de histórico, imutabilidade, vocabulário), Módulo J (volume, média,
separação das duas métricas, amostra, ausência de dados, vocabulário), Módulo K (tipos herdados
do F, DADO_INSUFICIENTE dedicado, PROJECAO, INCONSISTENCIA, prioridade completa, máximo 3 na
primeira dobra, navegação, imutabilidade, vocabulário), NaN/Infinity/divisão por zero, reuso
(grep no motor confirmando que `assistenteContextual` nunca chama `inteligenciaPorHorario`/
`compararPeriodoCorridas`/`historicoPorPeriodo`/`inteligenciaPorDiaSemana`/`insightsCopiloto`
diretamente), ausência de query/migration nova.

Regressão completa reexecutada (não assumida verde): os 18 audit scripts anteriores do
motorista/jurídico/amortização (930/930), SQL completo (346/346), `tsc -b --noEmit` limpo,
`oxlint` limpo (só os warnings pré-existentes de outros arquivos), `npm run build` limpo.

## 8. Performance e privacidade

Zero query nova ao Supabase (`Promise.all` do hook continua com as mesmas 11 chamadas). Zero
biblioteca nova. Zero LLM/API externa. Zero tabela nova, zero migration, zero policy nova, zero
alteração de RLS, zero `audit_log`, zero dado enviado para staff, zero timeline administrativa —
os Módulos I/J/K são 100% client-side sobre dados já buscados e já pertencentes ao próprio
motorista.

## 9. Discrepância aritmética do exemplo da especificação (declarada, não escondida)

A especificação da Fase 18 usa, como exemplo literal: *"5.500 / 47,80 ≈ 114,96h"*. O valor
matematicamente correto de `5500 / 47.8` é **≈ 115,0628h**, não 114,96h — uma diferença de
~0,1h (~6 minutos), pequena o bastante para passar despercebida numa leitura rápida, mas real.

Decisão tomada: implementado e testado com o valor correto (`horasParaValor(5500, 47.8) ≈
115,06`), em vez de ajustar a fórmula (ou a tolerância de teste) para bater artificialmente com
"114,96h". A auditoria (categoria 2) inclui um teste que EXISTE justamente para flagrar se, no
futuro, alguém "corrigir" `horasParaValor` para produzir 114,96h — isso seria inventar uma
fórmula errada só para bater com um número de exemplo que já estava incorreto.

## 10. Decisões de escopo e outras notas

- O antigo Módulo E (lista de insights automáticos, dentro de `CopilotoInteligenteCard.tsx` na
  Fase 17) foi **removido** desse componente — ele ficou redundante depois que
  `AssistenteContextualCard` passou a consumir a mesma fonte (`insightsCopiloto()`) com
  prioridade, navegação e contexto temporal adicionais. `CopilotoInteligenteCard.tsx` ficou só
  com a grade Módulo D (meta conectada) + Pill de ritmo.
- `HORARIO` e `DIA_SEMANA` compartilham `secao-padrao` como destino de navegação (seção 5.5).
- `MENSAGEM_ESTADO_DIA` (insight `REGISTRO` de estado do dia) só dispara quando o Módulo F não já
  gerou um insight `REGISTRO` próprio (que cobre "faltam km/duração") — evita duplicar o mesmo
  tipo com duas mensagens diferentes na mesma lista.

## 11. Futuro — Inteligência de Frota (Fase 19 — fundação implementada; UI e persistência ainda não)

> **Atualização (Fase 19):** a fundação desta seção foi implementada — motor de localização
> (`localizacao.ts`), presença (`presenca.ts`), distância (`geo.ts`) e inteligência histórica da
> frota (`inteligenciaFrota.ts`), todos puros e testados (48/48,
> `scripts/audit-motorista-inteligencia-frota.ts`). Documentação completa em
> `docs/frota/LOCALIZACAO-OPERACIONAL.md`, `docs/frota/INTELIGENCIA-FROTA.md` e
> `docs/frota/CENTRO-INTELIGENCIA-FROTA.md`. **Continua sem persistência** (zero migration —
> proposta de schema apresentada, não criada, aguardando aprovação) e **sem UI de staff** (a tab
> "Inteligência da Frota" em `FrotaPage.tsx` continua um placeholder). O texto abaixo, mantido da
> Fase 18, permanece válido como a lista do que NÃO foi implementado.

Esta seção documenta SÓ a direção arquitetural — o código puro é fundação, não a experiência
completa descrita abaixo.

**O que essa fase futura poderia endereçar**, em alto nível: agregações de leitura, no MESMO
padrão determinístico deste documento (motor puro → agregador → UI, origem sempre declarada,
"o sistema informa, o motorista decide"), sobre padrões coletivos e anônimos da frota — por
exemplo, "nos seus dados registrados, faixas de horário com maior volume/média entre motoristas
da mesma frota" — sempre como leitura histórica, nunca como recomendação de aceitar/recusar
corrida ou de posicionamento.

**O que NÃO está sendo implementado nesta fase nem em nenhuma anterior — explicitamente fora de
escopo até que exista uma especificação própria:**

- GPS / geolocalização em tempo real do motorista.
- Mapa ou heatmap de demanda.
- Cálculo ou exibição de "região" com melhor demanda/preço.
- Localização de outros motoristas da frota.
- Direcionamento ativo de carros/motoristas para uma região.
- Precificação dinâmica por região.
- Redistribuição da frota (automática ou sugerida).

Qualquer uma dessas capacidades envolve trade-offs de privacidade (localização de terceiros),
vocabulário (risco real de a leitura virar ordem — "vá pra essa região") e RLS/arquitetura de
dados que merecem uma especificação e uma auditoria de vocabulário próprias, seguindo a mesma
disciplina usada para o Módulo K nesta fase — não uma extensão apressada do que já existe.
