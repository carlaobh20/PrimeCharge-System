# PrimeCharge — Modelo Operacional
### A constituição operacional da empresa — como qualquer problema recorrente é resolvido, e em que ordem

Este documento não é sobre o produto (isso é `PRODUCT_VISION.md`/`NORTH_STAR.md`), nem sobre como o software é construído (isso é `ARQUITETURA.md`/`FOUNDATION_PRINCIPLES.md`/`CORE_CONCEPTS.md`). É sobre como a **empresa PrimeCharge** — produto e operação interna, sem distinção — decide o que fazer toda vez que um problema se repete. Aplica-se igualmente a uma funcionalidade do sistema e a uma tarefa manual do dia a dia da operação.

Criado em 2026-08-05, a pedido do Carlos, como parte da revisão arquitetural pré-Sprint 7. Nasce como documento de fundação — mesmo status de `FOUNDATION_PRINCIPLES.md`: referência obrigatória, não sugestão.

---

## 1. Princípio central: a escada de escalonamento

Toda vez que um problema se repete, a resposta segue esta ordem — nunca pular um degrau sem registrar por escrito o motivo (mesmo espírito do fechamento de `FOUNDATION_PRINCIPLES.md`: "toda vez que uma decisão conflitar com um princípio aqui, a atitude correta é registrar o porquê da exceção, não ignorá-lo"):

1. **Processo** — humano, manual, documentado por escrito.
2. **Automação** — script/regra determinística que executa um processo já validado.
3. **IA** — modelo que lida com a variação/julgamento que a automação determinística não cobre.
4. **Agente** — sistema com permissão delimitada para **executar** ação real com base no que IA/automação/processo já produzem.
5. **Funcionário** — contratação de pessoa. Último recurso, não o primeiro.

**Por que essa ordem, e não outra:** cada degrau resolve o problema anterior de forma mais barata e mais fácil de corrigir se estiver errado. Automatizar um processo que ninguém validou manualmente ainda não elimina o caos — replica o caos mais rápido. Colocar IA sobre uma automação que ainda não é determinística é a mesma armadilha, um nível acima. E contratar uma pessoa para um problema que nenhum processo documentou é pagar salário para descobrir, na prática, o que deveria ter sido descoberto no degrau 1.

A escada não é sobre velocidade de implementação — é sobre em que ordem a evidência de que "isso funciona" precisa aparecer antes de investir mais.

---

## 2. Evolução operacional — critérios de transição entre níveis

Um processo só evolui para o próximo nível quando cumprir os critérios do nível atual — nunca por tempo decorrido, nunca por contagem de execuções. Maturidade aqui é definida por características do processo e retorno para o negócio, não por um contador.

### 2.1 Quando nasce um Processo

Nasce no momento em que uma tarefa se repete e alguém precisou lembrar como fez da vez anterior. Nesse ponto, vira passo a passo escrito — mesmo que rudimentar — em vez de continuar só na cabeça de uma pessoa.

### 2.2 Processo → Automação

Um processo pode ser automatizado quando atender simultaneamente aos seguintes critérios:

- Processo estável e documentado;
- Resultado previsível;
- Baixa necessidade de julgamento humano;
- ROI positivo da automação;
- Risco operacional aceitável.

Processo que ainda muda de forma a cada execução, ou cujo resultado não é previsível, não está pronto para automação — isso é sinal de que ele ainda não amadureceu (fica no degrau 1, não avança).

### 2.3 Automação → IA

Uma automação evolui para IA quando regras fixas deixam de produzir os melhores resultados e passa a existir ganho mensurável com análise, previsão, classificação ou recomendação baseada em inteligência.

A IA entra para melhorar decisões, nunca para executar diretamente.

**Relação com `FOUNDATION_PRINCIPLES.md`, Princípio 5 ("IA nunca executa"):** esta seção reforça, não introduz, esse princípio — a IA analisa, prevê, recomenda; a execução, quando existir, é sempre responsabilidade do degrau seguinte (Agente) ou do usuário.

**Critério de honestidade** (mesmo espírito da regra da camada de Intelligence — `score: null` nunca vira número inventado, ver `DECISION_LOG.md` DEC-022): IA só substitui uma etapa que já tinha critério humano claro e testável antes dela. Nunca é usada para inventar um critério que nem uma pessoa treinada saberia explicar hoje.

### 2.4 IA → Agente

Um Agente nasce quando a IA já demonstra confiabilidade suficiente e existe um conjunto de ações claramente delimitado que possa ser executado com segurança.

O Agente continua obedecendo aos limites definidos pela empresa, registra todas as ações e pode ser interrompido ou revogado a qualquer momento. A IA continua sendo responsável por analisar e recomendar. O Agente é responsável por executar somente as ações autorizadas.

Constituição completa do Agente — estrutura obrigatória, hierarquia, comunicação, permissões, memória, auditoria e ciclo de vida — em `AGENT_PLATFORM.md`.

**Conexão com o roadmap:** o `RecommendationCard` que a Sprint 4 deliberadamente não construiu por falta de consumidor real (`DECISION_LOG.md` DEC-023) é o candidato natural a primeiro caso de uso quando este nível nascer de fato — nesse momento, "recomendação" deixa de ser um conceito sem lugar e vira exatamente o insumo que um Agente consome antes de agir.

### 2.5 Agente → Funcionário

Antes de contratar uma pessoa, deve ficar comprovado que o problema não pode ser resolvido por:

1. melhoria do processo;
2. automação;
3. inteligência artificial;
4. agente especializado.

Somente quando essas alternativas forem insuficientes a contratação de um novo funcionário é considerada. O objetivo permanente da PrimeCharge é aumentar escala sem aumentar proporcionalmente a equipe.

**Única exceção legítima para "pular a escada":** contratar uma pessoa para fazer manualmente, hoje, o que nenhum processo ainda documentou — porque essa pessoa é quem vai desenhar o Processo do degrau 1. A partir do momento em que esse processo existe por escrito, a escada volta a valer normalmente para tudo que vier depois.

---

## 3. Como isso se relaciona com o Decision Log e o roadmap

Este documento define o **princípio permanente**; o `DECISION_LOG.md` continua registrando cada decisão pontual de onde, na escada, um problema específico está (e por quê). Nenhuma decisão estrutural nova deixa de ser registrada no Decision Log só porque já segue o princípio geral daqui — a escada explica o "porquê da ordem", o Decision Log registra o "o que foi decidido, quando, e com que risco aceito" caso a caso.

Mapeamento aproximado com as fases de produto discutidas na revisão arquitetural pré-Sprint 7 (2026-08-05): a maior parte do trabalho até a Fase ERP (Fases 1–6 do roadmap de `ARQUITETURA.md`) ainda está nos degraus 1–2 (processo e automação) por módulo de negócio. Fase BI é, em essência, tornar processo e automação **visíveis e mensuráveis**. Fase IA é onde o degrau 3 nasce de fato pela primeira vez, sobre dado real acumulado nas fases anteriores. Fase Agentes é o degrau 4. Fase Operação Autônoma só se justifica depois de Agentes reais terem provado, com auditoria e escopo comprovadamente respeitados, que podem operar com autonomia crescente.

Detalhamento oficial dos níveis de maturidade de IA (Nível 0 ERP → Nível 5 Operação Autônoma, com objetivo/gatilho/dependência de cada um) em `AI_PLATFORM.md`, seção 4 — esta seção mapeia contra a linguagem de "Fases" do roadmap; aquele documento é a referência completa.

---

## 4. Checklist antes de subir um nível

Antes de qualquer problema (de produto ou de operação interna) subir de degrau, responder por escrito:

1. O nível atual atende aos critérios de evolução da seção 2 para o próximo degrau (estabilidade, previsibilidade, necessidade de julgamento humano, ROI, risco aceitável — conforme a transição em questão)?
2. O que exatamente vai ser automatizado, decidido por IA, ou executado pelo Agente está descrito por escrito — não só na cabeça de uma pessoa?
3. Se for Agente: qual é o escopo de ação exato, o que exige aprovação humana antes de executar, e qual o mecanismo de auditoria e de revogação?
4. Essa mudança de nível é estrutural o suficiente para merecer uma entrada no `DECISION_LOG.md`? (Em geral, sim, a partir do degrau 3 em diante.)
