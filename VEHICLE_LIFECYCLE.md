# PrimeCharge — Vehicle Lifecycle
### Ciclo completo do ativo — da compra à saída definitiva da frota, e o que acontece depois

Revisado criticamente por Claude antes de publicar, no mesmo padrão de `FOUNDATION_PRINCIPLES.md`. Pontos corrigidos em relação à instrução original do Carlos estão marcados com 🔶, com o motivo — nada foi alterado silenciosamente. Mesmo peso dos demais documentos de fundação: referência obrigatória, não sugestão.

Este documento não redefine State Machines/Policies/Eventos como conceito técnico (`CORE_CONCEPTS.md`), não redefine o ciclo econômico da empresa (`VALUE_ENGINE.md`), não redefine Ativo Inteligente/telemetria/Health Score (`SMART_FLEET_PLATFORM.md`), e não redefine a modelagem de domínio ou o roadmap geral (`ARQUITETURA.md`). Onde um assunto já está definido em outro documento, este referencia — nunca repete. O que este documento define, e que não existia em nenhum outro lugar: a jornada de negócio completa do veículo (mais ampla que o `status` técnico), as regras de evolução entre fases, e dois gaps arquiteturais reais que esta consolidação encontrou na State Machine já em produção.

Criado em 2026-08-05, a pedido do Carlos, pausando a Sprint 8 (Financeiro) para consolidar regras de negócio de fundação antes de continuar. Documentação pura — nenhum código, migration, tela ou componente foi alterado junto com este documento.

## Objetivo

O Veículo já tem State Machine implementada e validada desde a Fase 1 (`CORE_CONCEPTS.md`, seção 2), e já tem Vehicle Intelligence julgando sua saúde (DEC-022). O que ainda não existe por escrito é a jornada completa como conceito de negócio: como "Compra", "Manutenção" e "Renovação" — palavras que o Carlos usa no dia a dia da operação — se relacionam com os 10 estados técnicos já implementados, e o que acontece com um ativo depois que ele sai definitivamente da frota. Este documento fecha essa lacuna, e serve de ponte entre a State Machine técnica e o ciclo de valor econômico já registrado em `VALUE_ENGINE.md`.

---

## 1. Jornada vs. State Machine

Mesma distinção estabelecida em `DRIVER_LIFECYCLE.md`, seção 1, aplicada aqui ao ativo em vez de à pessoa: a **State Machine** é o campo `status` técnico da tabela `veiculos`, fechado e validado (`CORE_CONCEPTS.md`, seção 2). A **Jornada** é o conceito de negócio mais amplo pedido pelo Carlos ("Compra, Preparação, Locação, Manutenção, Renovação, Venda, Pós-venda") — algumas dessas palavras mapeiam 1:1 para um estado, outras mapeiam para uma decisão que dispara uma transição, e uma (Pós-venda) não mapeia para estado nenhum, porque acontece depois que o estado já é terminal. Tratar as duas coisas como sinônimos levaria a inventar estados nesta consolidação sem necessidade real — o que a seção 3 evita fazer.

---

## 2. A State Machine hoje implementada (referência, não redefinição)

`VeiculoStatus` (`src/features/frota/types.ts`), 10 valores fechados, já validados no client hoje (ainda sem trigger de banco dedicado — diferente do Contrato, que ganhou `fn_validar_transicao_contrato` na Sprint 7, DEC-034; o Veículo continua na mesma situação de antes: regra só no client, ver `DECISION_LOG.md` DEC-035 sobre esse mesmo gap de enforcement no banco, ainda deliberadamente fora de escopo).

```
novo → comprado → preparacao → disponivel → reservado → alugado → devolvido
                                    ↑                         │
                                    └─────── manutencao ←──────┘
                                    │
                              disponivel → venda → encerrado
```

`alugado` só é alcançável a partir de `reservado` ou `disponivel` (nunca direto de `manutencao`). `venda` e `encerrado` são terminais — nenhuma transição sai deles. Regra já registrada em `CORE_CONCEPTS.md`, seção 2, e replicada sem alteração em código (`VEICULO_STATUS_TRANSITIONS`).

---

## 3. As fases da jornada (negócio) mapeadas sobre a State Machine (técnica)

| Fase pedida pelo Carlos | Mapeamento | Natureza |
|---|---|---|
| **Compra** | `novo → comprado` | Transição direta — 1:1 com a State Machine |
| **Preparação** | `comprado → preparacao → disponivel` | Transição direta — 1:1 |
| **Locação** | `disponivel → reservado → alugado → devolvido` (e volta) | Ciclo completo — o mesmo veículo passa por esta fase repetidamente ao longo da vida útil |
| **Manutenção** | `disponivel/devolvido → manutencao → disponivel` | Estado próprio, alcançável de mais de um lugar — não é uma fase única na linha do tempo, é um desvio que pode acontecer a qualquer momento dentro do ciclo de Locação |
| **Renovação** | 🔶 **não é um estado — é uma decisão de negócio, ver seção 6.2** | Decisão que **leva** à transição `disponivel → venda`, não uma fase com estado próprio |
| **Venda** | `venda → encerrado` | Transição direta — mas com semântica mais ampla que "venda comercial", ver seção 6.1 |
| **Pós-venda** | Sem representação no banco, depois de `encerrado` | Mesmo raciocínio de `DRIVER_LIFECYCLE.md`, seção 3 — não é um estado novo, é o que acontece depois que o estado já é terminal |

**Pós-venda em detalhe**: comparação entre o valor de venda real e o `valor_residual_estimado` que o veículo carregava antes de sair (`src/features/frota/types.ts`) — o dado mais direto para calibrar futuras estimativas de valor residual (`VALUE_ENGINE.md`, estágio 7/8, e `SMART_FLEET_PLATFORM.md`, seção 7, pergunta 21). Nenhuma automação de Pós-venda existe hoje; esta seção só reserva o lugar dela na jornada, mesmo padrão do documento irmão.

---

## 4. Regras de evolução — o que precisa ser verdade em cada transição

| Transição | Critério de negócio |
|---|---|
| `novo → comprado` | Compra formalizada (hoje: campos `data_compra`/`valor_compra` preenchidos, sem entidade `Compra` própria ainda — fora do roadmap atual) |
| `comprado → preparacao` | Veículo fisicamente recebido, início de preparação para operação |
| `preparacao → disponivel` | Checklist de preparação/vistoria inicial completo (`Checklist`, `CORE_CONCEPTS.md` seção 1; Vistoria inicial, `SMART_FLEET_PLATFORM.md` seção 5) |
| `disponivel → reservado/alugado` | Contrato em `rascunho`/`em_analise` (reserva) ou `ativo` (locação — via `fn_propagar_status_contrato`, DEC-037) |
| `alugado → devolvido` | Contrato chega a `encerrado`/`cancelado` (mesmo trigger) |
| `devolvido → disponivel` | Vistoria de devolução aprovada — **sem checagem automática de carga mínima hoje**, apesar de ser a dor operacional nº1 do setor segundo a pesquisa de mercado (`claude/pesquisa-mercado-rental-ev-2026.md`; ver também o alerta já real de "veículo devolvido com <25% de carga", Sprint 7) — o alerta existe, o bloqueio de disponibilidade automático não. Não corrigido aqui, só registrado como lacuna já conhecida e fora de escopo desta consolidação (não é um gap novo, é um Insight/Alerta que ainda não virou regra de bloqueio) |
| `disponivel/devolvido → manutencao` | Falha detectada, manutenção preventiva agendada, ou dano identificado em vistoria |
| `manutencao → disponivel` | Manutenção concluída, checklist de retorno aprovado |
| `disponivel → venda` | Decisão de renovação de frota (seção 6.2) |
| `venda → encerrado` | Venda formalizada — ver seção 6.1 sobre o que conta como "venda" |

---

## 5. Eventos da jornada

Mesmo shape já definido (`CORE_CONCEPTS.md`, seção 5). Vocabulário específico desta jornada, para quando a implementação real acontecer:

`veiculo.criado` · `veiculo.status_alterado` (já existe como Timeline hoje) · `veiculo.checklist_preparacao_concluido` · `veiculo.locado` · `veiculo.devolvido` · `veiculo.manutencao_iniciada`/`veiculo.manutencao_concluida` · `veiculo.decisao_renovacao_frota` (futuro, ver seção 6.2) · `veiculo.venda_iniciada`/`veiculo.venda_concluida` · `veiculo.pos_venda_valor_realizado` (futuro — compara valor real ao estimado).

---

## 6. Achados críticos — dois gaps reais entre a jornada pedida e a State Machine já em produção

### 6.1 — "venda" hoje só cobre saída comercial normal, não perda total

🔶 A State Machine atual só alcança `encerrado` a partir de `venda`. Isso não cobre um caso real de frota: perda total por sinistro grave ou roubo (`ARQUITETURA.md` já lista `Sinistro`/`Multa` como entidades futuras da Fase 4). Um veículo roubado ou sinistrado com perda total não passa por uma "venda" no sentido comercial — passa por indenização de seguro. Forçar esse caso pelo caminho `disponivel → venda → encerrado` seria semanticamente errado (não houve venda) e criar um estado novo só para esse caso reabriria a discussão de enum inflado que `SMART_FLEET_PLATFORM.md` seção 6 já rejeitou para Health Score, pelo mesmo motivo de fundo (`FOUNDATION_PRINCIPLES.md`, Princípio 8 — simplicidade antes de abstração antecipada). **Proposta registrada, não implementada**: ampliar a *semântica* documentada de `venda` para "saída patrimonial definitiva da frota, por venda comercial ou por indenização de seguro" — sem mudar o enum nem o código, só a documentação de negócio sobre o que esse estado já cobre. Quando Sinistro existir como entidade (Fase 4), o campo que precisar diferenciar "venda comercial" de "baixa por sinistro" é um dado (`motivo_baixa`, mesmo padrão do achado equivalente em `DRIVER_LIFECYCLE.md` seção 6.2), nunca um estado novo. Ver DEC-044.

### 6.2 — "Renovação" é um nome usado duas vezes na plataforma para conceitos diferentes

🔶 `ContratoStatus` já tem um estado chamado `renovacao` (DEC-034) — significa "o contrato deste motorista/veículo específico está sendo renovado". O pedido desta consolidação usa "Renovação" para outra coisa: a decisão de tirar um veículo de operação e vendê-lo por já ter passado do ponto ótimo de depreciação (`disponivel → venda`, guiado pela curva de valor residual, `VALUE_ENGINE.md` estágio 7, e pela pergunta 19-20 de `SMART_FLEET_PLATFORM.md` seção 7: "quando é o momento ótimo de vender"). São dois conceitos genuinamente diferentes — um é sobre a relação com um motorista, o outro é sobre o ciclo de vida do ativo — usando a mesma palavra. Isso é um risco real de confusão em conversa e em qualquer IA futura que precise interpretar "renovação" sem contexto adicional (`AI_PLATFORM.md`, taxonomia de tipos de inteligência). **Proposta registrada, não implementada**: manter os dois conceitos como estão (nenhum dos dois precisa mudar de nome no código), mas fixar por escrito, aqui e em qualquer documento futuro, que "Renovação de Contrato" (`ContratoStatus.renovacao`) e "Renovação de Frota" (a decisão desta seção) nunca são a mesma coisa e devem sempre ser escritas por extenso quando o contexto não deixa óbvio qual das duas está em jogo. Ver DEC-045.

---

## 7. Relação com Value Engine

Mapeamento direto entre a jornada deste documento e os 8 estágios já registrados em `VALUE_ENGINE.md` — este documento não redesenha a cadeia de valor, só a percorre pela lente do ciclo de vida técnico:

| Fase desta jornada | Estágio de `VALUE_ENGINE.md` |
|---|---|
| Compra | Compra de ativos |
| Preparação | Preparação |
| Disponibilidade (`disponivel`) | Disponibilidade |
| Locação | Locação → Receita |
| Manutenção | Custos |
| (resultado do ciclo completo) | Lucro |
| Renovação de frota → Venda | Venda do ativo → Reinvestimento |

A "Taxa de utilização da frota" (North Star, `NORTH_STAR.md`) é, na prática, a proporção de tempo que os veículos da frota passam nos estados `reservado`/`alugado` (fase Locação) contra os demais — esta jornada é a fonte primária desse cálculo quando ele for implementado.

## 8. Relação com Smart Fleet Platform

`SMART_FLEET_PLATFORM.md` define um eixo ortogonal a este documento: enquanto este documento descreve **em que estado operacional** o veículo está (seção 2), aquele descreve **quanto o sistema sabe** sobre o veículo (`Veículo cadastrado → conectado → inteligente → Ativo inteligente`, seção 1 daquele documento). Um veículo pode estar em qualquer fase desta jornada em qualquer nível de maturidade de dado daquele documento — as duas dimensões são independentes. A Inspeção Inteligente (`SMART_FLEET_PLATFORM.md`, seção 5) é o mecanismo técnico por trás das vistorias citadas na seção 4 deste documento (preparação e devolução). Health Score (categoria Patrimonial) é quem hoje estima `valor_residual_estimado`, o dado que a fase Pós-venda (seção 3) usa para se calibrar.

## 9. Relação com Command Center

O Command Center já consolida Veículos como uma das três origens que os 5 Engines de priorização processam (DEC-038) — nenhuma mudança nova aqui. As transições desta jornada (seção 2) e os gaps encontrados (seção 6) são candidatos naturais a virar Alertas/Insights no Command Center quando a lacuna da seção 4 (checagem de carga na devolução) ou o dado de `motivo_baixa` (seção 6.1) existirem de fato — este documento não implementa nenhum dos dois, só aponta onde eles se conectam.

---

## 10. Relação com os documentos existentes

- `CORE_CONCEPTS.md` — State Machines (seção 2) é a base técnica da seção 2 deste documento.
- `DECISION_LOG.md` — DEC-022 fundamenta o Health Score citado na seção 8; DEC-034/DEC-037 fundamentam a relação com Contratos citada na seção 4; DEC-044/DEC-045 nascem deste documento (seção 6).
- `VALUE_ENGINE.md` — mapeamento direto na seção 7; nenhuma redefinição de estágio.
- `SMART_FLEET_PLATFORM.md` — eixo de maturidade de dado (seção 8), Inspeção Inteligente e Health Score Patrimonial usados nas seções 3 e 8.
- `NORTH_STAR.md` — Taxa de utilização da frota citada na seção 7 como métrica derivada diretamente desta jornada.
- `DRIVER_LIFECYCLE.md` — espelha, do lado da pessoa, o mesmo raciocínio da seção 1 (Jornada vs. State Machine) e o mesmo padrão de correção nas seções 6.1/6.2 (dado novo em vez de estado novo).
- `PRIME_DRIVER_PROGRAM.md` — a elegibilidade de compra de veículo por um motorista (seção 7 daquele documento) usa a fase Venda desta jornada como o evento que a torna possível — este documento não define quem pode comprar, só quando o ativo está disponível para isso.
