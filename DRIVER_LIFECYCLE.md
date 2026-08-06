# PrimeCharge — Driver Lifecycle
### Jornada completa do motorista — do primeiro contato até a saída definitiva, e o que acontece entre um e outro

Revisado criticamente por Claude antes de publicar, no mesmo padrão de `FOUNDATION_PRINCIPLES.md`. Pontos corrigidos em relação à instrução original do Carlos estão marcados com 🔶, com o motivo — nada foi alterado silenciosamente. Mesmo peso dos demais documentos de fundação: referência obrigatória, não sugestão.

Este documento não redefine State Machines/Policies/Eventos como conceito técnico (`CORE_CONCEPTS.md`), não redefine DEC-006 (Motorista = Cliente final) nem a modelagem de domínio (`ARQUITETURA.md`), não redefine Driver Intelligence/Health Score (`DECISION_LOG.md` DEC-025), e não redefine a State Machine de Contrato (DEC-034). Onde um assunto já está definido em outro documento, este referencia — nunca repete. O que este documento define, e que não existia em nenhum outro lugar: a jornada de negócio completa do motorista (mais ampla que o campo `status` técnico), os eventos específicos dessa jornada, as regras de evolução entre fases, e dois gaps arquiteturais reais que esta consolidação encontrou na implementação já existente.

Criado em 2026-08-05, a pedido do Carlos, pausando a Sprint 8 (Financeiro) para consolidar regras de negócio de fundação antes de continuar. Documentação pura — nenhum código, migration, tela ou componente foi alterado junto com este documento.

> **Nota de atualização (2026-08-06, auditoria da Missão 2):** o gap 6.1 abaixo ("motorista nunca sai de `ativo`") foi fechado na migration `0006_modulo_financeiro.sql` (DEC-050) — `fn_propagar_status_contrato` ganhou o caminho inverso (`contrato encerrado/cancelado` → motorista `inativo`, se não houver outro contrato ativo). A validação de transição em si (`fn_validar_transicao_motorista`) ganhou trigger de banco na migration `0008_auditoria_seguranca.sql` (DEC-067). O texto original abaixo não foi reescrito (preserva o histórico da decisão), só este aviso foi adicionado.

## Objetivo

A PrimeCharge já trata o Motorista como Cliente final (DEC-006) e já tem Driver Intelligence (DEC-025) julgando a saúde dessa relação. O que ainda não existe por escrito é a jornada completa: o que acontece **antes** do motorista virar um registro no banco (`lead`), o que precisa ser verdade em cada transição para ela ser legítima, e o que acontece **depois** que a relação formal termina. Sem isso, cada nova decisão de produto sobre motorista (renovação, fidelidade, indicação, reativação) corre o risco de inventar sua própria versão da jornada — este documento existe para que exista uma única versão, referenciada por todos os outros.

---

## 1. Jornada vs. State Machine — uma distinção que este documento precisa deixar clara antes de tudo

🔶 **Correção de premissa**: o pedido original descreve "jornada completa... desde Lead até Pós-venda" como se fosse uma lista de estados. Não é — e tratar os dois como sinônimos é o primeiro erro que este documento evita. A **State Machine** (`CORE_CONCEPTS.md`, seção 2) é o `status` técnico do registro `motoristas` no banco: um enum fechado, validado, cada transição gerando evento. A **Jornada** é um conceito de negócio mais amplo, que inclui fases sem representação alguma no banco — contato de marketing antes do motorista existir como registro, e relacionamento pós-relação depois que ele já terminou. Confundir as duas leva a um erro concreto: tentar criar um estado novo (`pos_venda`) para cobrir uma fase de negócio que na verdade acontece **depois** do estado terminal (`encerrado`), quebrando a própria definição de estado terminal que `CORE_CONCEPTS.md` já estabelece ("nenhuma transição sai" de um estado terminal). A solução não é abrir uma exceção na State Machine — é reconhecer que Jornada e State Machine vivem em camadas diferentes, e mapear uma na outra (seção 3).

---

## 2. A State Machine hoje implementada (referência, não redefinição)

`MotoristaStatus` (`src/features/motoristas/types.ts`), 6 valores fechados, validados no client hoje — sem trigger de banco equivalente ao `fn_validar_transicao_contrato` do Contrato (DEC-034); ver seção 6.1 sobre esse gap.

| De | Para | Evento de negócio típico |
|---|---|---|
| `lead` | `em_analise` | Motorista enviou documentação inicial |
| `lead` | `encerrado` | Lead desistiu ou foi descartado antes da análise |
| `em_analise` | `ativo` | Aprovado — hoje só acontece via trigger de Contrato ativando (`fn_propagar_status_contrato`, DEC-037): `em_analise → ativo` é automático quando o primeiro Contrato do motorista vira `ativo`, nunca uma ação manual solta |
| `em_analise` | `encerrado` | Reprovado, ou motorista desistiu durante a análise |
| `ativo` | `inativo` | Sem contrato vigente no momento, mas relação não terminou (ver gap, seção 6.1 — hoje esta transição não é automática) |
| `ativo` | `bloqueado` | Violação (inadimplência quando Financeiro existir, comportamento, documentação vencida sem regularização) — ação sujeita a RBAC (DEC-035) |
| `ativo` | `encerrado` | Motorista opta por sair, ou a PrimeCharge encerra a relação |
| `inativo` | `ativo` | Novo contrato assinado e ativado |
| `inativo` | `encerrado` | Relação encerrada a partir de um período de inatividade |
| `bloqueado` | `ativo` | Desbloqueio — pendência resolvida |
| `bloqueado` | `encerrado` | Desligamento definitivo, sem retorno |
| `encerrado` | — | Terminal — nenhuma transição sai |

Nenhuma dessas transições muda nesta consolidação. O que muda é o que cerca cada uma (seções 3 a 6).

---

## 3. As fases da jornada (negócio) mapeadas sobre a State Machine (técnica)

```
[Aquisição] → Lead → Qualificação → Ativação → Relacionamento ativo → Intercorrência ⇄ Relacionamento ativo → Encerramento → [Pós-venda]
    (sem registro)   status: lead   em_analise      ativo (+contrato)      inativo/bloqueado                    status: encerrado    (sem status —
                                                                                                                                        relação já terminou)
```

- **Aquisição** (sem representação no banco): qualquer contato de marketing/indicação antes de existir um registro `motoristas` — landing page, campanha, indicação de outro motorista (relação direta com PRIME_DRIVER_PROGRAM, seção 8). Não é uma fase deste documento definir — é responsabilidade de um futuro módulo de Marketing/CRM, fora do roadmap atual. Citado aqui só para deixar claro que "Lead" já é o **segundo** momento da jornada, não o primeiro.
- **Lead** (`status: lead`): primeiro registro no sistema. Ainda não é cliente, é candidato.
- **Qualificação** (`status: em_analise`): documentação em avaliação. Health Score documental (DEC-025) já roda aqui.
- **Ativação** (transição `em_analise → ativo`): o momento em que o primeiro Contrato vira `ativo` — este documento não redefine quando um Contrato pode ativar (DEC-034), só registra que é o gatilho real da ativação do motorista.
- **Relacionamento ativo** (`status: ativo`): onde a maior parte do valor da relação acontece — é aqui que Driver Score (`PRIME_DRIVER_PROGRAM.md`) acumula, que renovação e upgrade ficam elegíveis, que a maior parte dos Insights/Oportunidades de Driver Intelligence (DEC-025) se aplica.
- **Intercorrência** (`status: inativo` ou `bloqueado`): desvio temporário do relacionamento ativo — sem contrato vigente, ou bloqueado por violação. Reversível por definição (ambos os estados voltam para `ativo`).
- **Encerramento** (transição para `status: encerrado`): fim formal da relação. Estado terminal — mas não o fim da jornada de negócio, só o fim do que a State Machine acompanha.
- **Pós-venda** (sem representação no banco, depois de `encerrado`): pesquisa de satisfação, elegibilidade de win-back (reativação como novo Lead depois de um período), indicação mesmo após sair (o motorista que saiu bem continua podendo indicar — ver seção 8), avaliação do que funcionou/não funcionou na relação. **Não é um estado novo** — é a fase de negócio que existe depois que o estado já é terminal, pelo mesmo raciocínio da correção da seção 1. Nenhum código, tela ou automação de Pós-venda é implementado agora; esta seção só reserva o lugar dela na jornada.

---

## 4. Regras de evolução — o que precisa ser verdade em cada transição

Nenhuma dessas regras é nova onde já existe equivalente registrado (Health Score, RBAC, State Machine) — esta seção só consolida o critério de negócio por trás de cada transição da seção 2, a maior parte delas ainda dependente de módulos que não existem:

| Transição | Critério de negócio | Onde vive a checagem técnica |
|---|---|---|
| `lead → em_analise` | Documentação mínima enviada (CNH, CPF) | Hoje: manual. Health Score documental (DEC-025) informa a decisão, não a impõe |
| `em_analise → ativo` | Documentação válida + Contrato assinado e ativado | `fn_propagar_status_contrato` (DEC-037) — automático, não manual |
| `ativo → inativo` | Nenhum contrato vigente | **Não implementado hoje — gap, ver seção 6.1** |
| `ativo → bloqueado` | Violação registrada, checagem de role via `permissoes` | RBAC real desde DEC-035 |
| `bloqueado → ativo` | Pendência resolvida, aprovação de quem bloqueou ou superior | RBAC real desde DEC-035 |
| `* → encerrado` | Decisão definitiva (motorista ou empresa) | Manual hoje; nenhuma Policy dedicada ainda (`podeEncerrarMotorista`, mesmo padrão de `podeVenderVeiculo`, `CORE_CONCEPTS.md` seção 3) — não construída, sem consumidor real até RBAC de Motorista existir (mesmo escopo deliberadamente deixado de fora em DEC-035) |

---

## 5. Eventos da jornada

Reaproveita o shape de Evento já definido (`CORE_CONCEPTS.md`, seção 5) e a mesma implementação faseada (via `audit_log`/`timeline_eventos` até a Fase 3 formalizar `eventos`). Vocabulário específico desta jornada, para quando a implementação real acontecer — nenhum destes é criado agora:

`motorista.criado` · `motorista.status_alterado` (já existe como Timeline hoje, ver `fn_audit_log`) · `motorista.documentacao_completa` · `motorista.contrato_vinculado` · `motorista.contrato_renovado` · `motorista.contrato_encerrado` · `motorista.encerrado` · `motorista.reativado` (retorno depois de `encerrado`, ver seção 6.2) · `motorista.indicacao_recebida` (futuro, ligado a PRIME_DRIVER_PROGRAM) · `motorista.pos_venda_contato` (futuro).

---

## 6. Achados críticos — dois gaps reais entre a jornada documentada e o código já em produção

Esta consolidação não é só desenho de futuro: revisar a jornada contra o trigger real de Contrato (`fn_propagar_status_contrato`, migration `0005_modulo_contratos.sql`) encontrou dois pontos em que a implementação de hoje não sustenta a jornada descrita acima. Registrados como decisões (`DECISION_LOG.md` DEC-040/DEC-041), não corrigidos em código — por instrução explícita desta consolidação ("não altere código", "não altere migrations").

### 6.1 — Motorista nunca sai de `ativo` quando o contrato termina

🔶 O trigger de propagação (DEC-037) só cobre um sentido: `contrato → ativo` ativa o motorista (`em_analise → ativo`). Não existe o caminho inverso — `contrato → encerrado`/`cancelado` **não** move o motorista para `inativo`. Na prática, um motorista cujo único contrato terminou continua com `status: ativo` indefinidamente, a menos que alguém mude isso manualmente. Isso quebra a definição desta seção 3 ("Relacionamento ativo" = motorista com contrato vigente) e distorce qualquer métrica futura que confie em `status: ativo` como proxy de "motorista com contrato hoje" (inclusive elegibilidade de renovação/upgrade em `PRIME_DRIVER_PROGRAM.md`, seção 6). **Proposta registrada, não implementada**: `fn_propagar_status_contrato` deveria, ao receber `contrato → encerrado/cancelado`, checar se o motorista tem outro contrato `ativo`/`renovacao` — se não tiver, mover para `inativo`, nunca direto para `encerrado` (fim de um contrato não é fim da relação; o motorista pode alugar de novo). Ver DEC-040.

### 6.2 — `encerrado` mistura motivos que a jornada precisa distinguir

🔶 O enum `MotoristaStatus` tem um único estado terminal (`encerrado`) alcançável a partir de `lead`, `em_analise`, `ativo`, `inativo` e `bloqueado`. Isso é correto para a State Machine (todos são, de fato, o mesmo estado técnico) — mas é insuficiente para a jornada: um lead que nunca avançou, um motorista reprovado na análise, e um motorista que teve anos de relacionamento ativo e saiu bem chegam ao mesmo `encerrado`, sem nenhum dado que distinga os três. Isso prejudica diretamente a fase de Pós-venda (seção 3): elegibilidade de win-back, decisão de reativar como novo Lead vs. restaurar histórico, e a métrica de "Taxa de renovação de contrato" (`VALUE_ENGINE.md`) não conseguem ser calculadas com precisão sem essa distinção. **Proposta registrada, não implementada**: campo futuro `motivo_encerramento` (categórico — ex.: `lead_nao_avancou`, `reprovado_analise`, `encerrado_motorista`, `encerrado_empresa`, `bloqueio_definitivo`), sem criar nenhum estado novo — resolve o problema como dado, não como State Machine, mesmo padrão já usado para não inflar o enum de Veículo (ver `VEHICLE_LIFECYCLE.md`, seção 6.1, achado equivalente do lado do ativo). Ver DEC-041.

---

## 7. Relação com Contratos

Contrato (DEC-034) já é o gatilho real de duas transições da jornada do motorista (seção 2: `em_analise → ativo` na ativação, e — depois de DEC-040 ser implementada — `ativo → inativo` no encerramento). A relação é estrutural, não incidental: por DEC-006, não existe Cliente separado de Motorista, então todo o ciclo comercial da PrimeCharge passa pela dupla Motorista↔Contrato. Este documento não redefine a State Machine do Contrato — só registra onde ela empurra a do Motorista, e onde ainda não empurra (seção 6.1).

## 8. Relação com Driver Score e PRIME_DRIVER_PROGRAM

A fase "Relacionamento ativo" (seção 3) é onde o Driver Score acumula (`PRIME_DRIVER_PROGRAM.md`, seção 3) — tempo como motorista ativo, cumprimento de contrato, comportamento, indicações. Elegibilidade de renovação, upgrade e compra de veículo (`PRIME_DRIVER_PROGRAM.md`, seções 6-7) dependem diretamente do estado e do tempo de permanência na fase ativa desta jornada — este documento define a jornada, aquele define o que ela habilita. A fase de Pós-venda (seção 3) também se conecta ao programa: um motorista que saiu bem pode continuar indicando (o programa não exige `status: ativo` para o benefício de indicação — ver `PRIME_DRIVER_PROGRAM.md`, seção 8).

## 9. Relação com IA e Agentes

Nenhuma IA ou Agente decide uma transição desta jornada hoje — todas são manuais ou automáticas por trigger determinístico (seção 2). Quando uma predição de risco de churn ou de inadimplência (candidato de Nível 3, `AI_PLATFORM.md`, seção 4) existir, ela **recomenda** uma transição (ex.: sinalizar risco de o motorista não renovar) — nunca a executa; a execução continua sendo do usuário ou, futuramente, de um Agente autorizado dentro do escopo definido em `AGENT_PLATFORM.md` (ex.: um "Driver Guardian", já listado como categoria aberta em `SMART_FLEET_PLATFORM.md`, seção 8). Este documento não cria esse Agente — só reserva onde ele atuaria, caso um dia nasça pelo caminho obrigatório (`AGENT_PLATFORM.md`, seção 2).

---

## 10. Relação com os documentos existentes

- `CORE_CONCEPTS.md` — State Machines (seção 2) é a base técnica da seção 2 deste documento; Eventos (seção 5) é a base da seção 5; Policies (seção 3) é onde `podeEncerrarMotorista` (seção 4, não implementada) deveria nascer.
- `DECISION_LOG.md` — DEC-006 fundamenta a existência deste documento (Motorista = Cliente final, então a jornada do motorista é a jornada comercial inteira da PrimeCharge); DEC-025 é a base de Driver Intelligence/Health Score citada nas seções 2 e 8; DEC-034/DEC-037 são a base da relação com Contratos (seção 7); DEC-040/DEC-041 nascem deste documento (seção 6).
- `ARQUITETURA.md` — modelagem de domínio (Motorista, Contrato) e RLS/RBAC (seção 1.8) sustentam as checagens da seção 4.
- `VALUE_ENGINE.md` — "Taxa de renovação de contrato" (citada no estágio 4, Locação) depende diretamente da precisão da jornada descrita aqui, especialmente do achado da seção 6.2.
- `PRIME_DRIVER_PROGRAM.md` — consome a fase "Relacionamento ativo" desta jornada como base de Driver Score e elegibilidade; este documento não define nenhuma regra de fidelidade, só o estado sobre o qual ela se aplica.
- `VEHICLE_LIFECYCLE.md` — espelha, do lado do ativo, o mesmo raciocínio da seção 1 (Jornada vs. State Machine) e da seção 6.2 (estado terminal único cobrindo motivos distintos).
- `AI_PLATFORM.md` / `AGENT_PLATFORM.md` — fundamentam a seção 9 (fronteira entre recomendação e execução, aplicada especificamente à jornada do motorista).
