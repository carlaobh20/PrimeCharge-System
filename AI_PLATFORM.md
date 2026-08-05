# PrimeCharge — AI Platform
### Constituição oficial da camada de Inteligência Artificial — complementar aos documentos existentes, nunca duplicada

Este documento não redefine multi-tenant, roadmap ou modelagem de domínio (`ARQUITETURA.md`), não redefine os princípios técnicos gerais (`FOUNDATION_PRINCIPLES.md`, `CORE_CONCEPTS.md`), não redefine a escada de escalonamento processo→automação→IA→agente→funcionário (`OPERATING_MODEL.md`), e não redefine o que justifica construir qualquer coisa no produto (`PRODUCT_VISION.md`). Onde um assunto já está definido em outro documento, este documento referencia — nunca repete.

O que este documento define, e que não existia em nenhum outro lugar antes: a filosofia oficial, os níveis de maturidade, a taxonomia de tipos de inteligência e os princípios obrigatórios especificamente da camada de IA.

Criado em 2026-08-05, a pedido do Carlos. Nasce como documento de fundação — mesmo status de `FOUNDATION_PRINCIPLES.md` e `OPERATING_MODEL.md`: referência obrigatória, não sugestão. Documentação pura — nenhum código, migration, componente ou tabela foi criado junto com este documento.

---

## 1. O que é a AI Platform

**Missão:** transformar o dado real que a operação da PrimeCharge já produz em análise, previsão e recomendação que aumentam a qualidade da decisão — humana, ou mais adiante, de um Agente autorizado. A AI Platform nunca substitui a decisão, só a informa melhor.

**Problema que resolve:** hoje, e durante boa parte do roadmap, qualquer leitura "profunda" do negócio — o que vai dar problema antes de dar, o que está funcionando melhor que a média, o que vale a pena repetir — depende de uma pessoa olhar o dado e perceber o padrão manualmente. A AI Platform existe para fazer esse reconhecimento de padrão em escala, sobre dado que a própria operação já gerou, sem exigir que alguém lembre de checar (mesma filosofia central de `PRODUCT_VISION.md`: "o usuário nunca deve descobrir problema — o sistema antecipa").

**Por que ela existe:** `VALUE_ENGINE.md` já registra, para cada um dos 8 estágios do ciclo econômico da empresa, uma seção "IA (futuro)" com uma hipótese concreta de uso (prever modelo de melhor retorno, prever manutenção antes da quebra, recomendar preço dinâmico, entre outras). A AI Platform é a fundação que torna essas hipóteses implementáveis quando a hora chegar, sem que cada módulo invente sua própria forma de fazer IA.

**Qual seu limite:** a AI Platform nunca executa diretamente (seção 3). Não é um módulo de negócio — não compete com Frota, Contratos ou Financeiro — é uma capacidade transversal (seção 6) que módulos de negócio consomem quando fizer sentido. E só existe quando há ganho real mensurável (seção 5): não entra porque a tecnologia permite, entra porque prova retorno.

---

## 2. Relação com a plataforma

**ERP:** a IA nunca é o ERP, opera sobre o dado que o ERP já registra e valida. Sem ERP funcionando (Fases 1 em diante de `ARQUITETURA.md`), não existe dado real para a IA analisar — é uma dependência de dado, não uma coincidência de cronograma.

**Command Center:** já é hoje o "cérebro operacional" da plataforma (`FOUNDATION_PRINCIPLES.md`, Princípio 4), mesmo sem nenhuma IA real por trás — os 6 Engines (DEC-024) são hoje regra determinística (Automação, degrau 2 de `OPERATING_MODEL.md`). A IA entra quando essas regras deixarem de bastar (`OPERATING_MODEL.md`, seção 2.3); nesse momento, o Command Center passa a consumir Alertas/Insights/Ações "aumentados" por IA, sem precisar mudar sua interface de consumo — o formato (`Insight`/`Alerta`/`NextAction`, DEC-022/023) já é o certo.

**Dashboard:** módulo exclusivamente analítico (DEC-024) — é onde a IA de previsão/explicação aparece primeiro de forma visível ao usuário (tendência, projeção), diferente do Command Center, que é sobre "o que fazer agora".

**BI:** quando existir (Fase 7 de `ARQUITETURA.md`), é o consumidor natural de IA de classificação/otimização em lote — BI é olhar para trás com rigor; IA aplicada a BI é complementar isso com previsão.

**Eventos:** o mecanismo de outbox (`CORE_CONCEPTS.md`, seção 5; `FOUNDATION_PRINCIPLES.md`, Princípio 3) é o sistema nervoso que alimenta qualquer IA que precise reagir a "isso aconteceu agora" — depende de Eventos existir de fato (Fase 3 em diante).

**Workflows:** quando existirem (regra dos 3, DEC-010), IA pode entrar como uma etapa de decisão dentro de um workflow (ex.: classificar o risco do motorista como parte do fluxo de aprovação de contrato) — o workflow continua sendo Automação (degrau 2 de `OPERATING_MODEL.md`), a IA é um passo dentro dele, não o motor do workflow.

**Automações:** automação e IA não competem. Automação é regra fixa e determinística; IA entra exatamente onde a automação para de bastar (`OPERATING_MODEL.md`, seção 2.3). Uma automação pode consumir a saída de uma IA como parte do seu próprio fluxo (ex.: automação de cobrança consultando um score de risco calculado por IA antes de decidir a régua).

**Agentes:** Agente é quem executa a decisão que a IA recomenda, dentro de escopo autorizado (`OPERATING_MODEL.md`, seção 2.4). A relação é sempre: IA decide/recomenda, Agente executa — nunca o contrário. Constituição completa do Agente (estrutura, hierarquia, permissões, memória, auditoria, ciclo de vida) em `AGENT_PLATFORM.md`.

**Usuários:** o usuário sempre pode ver a recomendação, entender o porquê (seção 8) e ignorá-la. A IA nunca remove a decisão final do usuário, mesmo quando um Agente estiver automatizando parte da execução.

---

## 3. Filosofia oficial

**A IA nunca executa diretamente.**

A IA:
- analisa;
- prevê;
- explica;
- classifica;
- recomenda.

Quem executa é sempre:
- o usuário;
- a automação;
- o agente autorizado.

Este princípio não nasce aqui — já existe em `FOUNDATION_PRINCIPLES.md` (Princípio 5, "IA nunca executa") e em `ARQUITETURA.md` (seção 1.13). Este documento não o substitui, é a expansão dele: aqui ele ganha taxonomia (seção 7), critério objetivo de quando se aplica (seção 5) e princípios operacionais permanentes (seção 8).

**Compatibilidade com `OPERATING_MODEL.md`:** a fronteira entre IA (decide/recomenda) e Agente (executa), definida nas seções 2.3 e 2.4 daquele documento, é exatamente esta mesma fronteira — dita em três níveis de detalhe diferentes (princípio geral → modelo operacional da escada → constituição de domínio da IA), sem nenhuma contradição entre os três.

---

## 4. Níveis de maturidade

Seis níveis, cada um construído sobre o anterior — nenhum nível nasce sem o anterior estar maduro no domínio em questão.

### Nível 0 — ERP

**Objetivo:** registrar a realidade da operação corretamente — dado certo, no lugar certo, auditável. É a fundação de tudo; sem ela, nenhum nível seguinte tem matéria-prima.
**Quando nasce:** já nasceu — é onde a PrimeCharge está hoje (Fases 1–6 de `ARQUITETURA.md`: Frota, Motoristas/Comercial, Financeiro, Compras, Equipe).
**Do que depende:** de nada além de si mesmo.
**O que ainda não deve existir:** qualquer IA. Neste nível, IA sobre dado ainda incompleto ou não confiável produziria recomendação sobre uma base ruim — pior que não ter recomendação nenhuma.

### Nível 1 — ERP Inteligente

**Objetivo:** o ERP passa a alertar e sugerir sobre a própria operação usando regra determinística (ainda não modelo estatístico/IA) — é a Automação do `OPERATING_MODEL.md` (degrau 2) aplicada de forma consistente em cada módulo.
**Quando nasce:** já começou. Vehicle Intelligence (DEC-022) e Driver Intelligence (DEC-025) são, tecnicamente, ERP Inteligente: Health Score, Alertas, Insights e Próximas Ações são hoje regra fixa (status, prazo, completude de dado) — nenhum modelo estatístico real por trás ainda.
**Do que depende:** dado real e completo do módulo em questão (Nível 0 maduro nesse módulo específico).
**O que ainda não deve existir:** modelo estatístico/IA de verdade — a régua continua sendo 100% regra escrita e explicável por uma pessoa. Ainda não é "IA" no sentido da taxonomia da seção 7, é o degrau imediatamente anterior, deliberadamente, antes de qualquer modelo.

### Nível 2 — Business Intelligence

**Objetivo:** agregação, histórico, tendência, comparação — olhar para trás com rigor, diferente do papel do Command Center/Nível 1, que é reagir ao presente.
**Quando nasce:** Fase 7 de `ARQUITETURA.md` (Indicadores & Dashboard), quando existir volume real de dado acumulado das fases anteriores para uma tendência significar alguma coisa.
**Do que depende:** Nível 0 maduro nos módulos que alimentam os indicadores (no mínimo Financeiro, Frota, Comercial).
**O que ainda não deve existir:** IA preditiva de verdade — BI mostra o que aconteceu e a tendência estatística simples (média móvel, variação percentual). Prever o que vai acontecer é papel do Nível 3.

### Nível 3 — Assistentes de IA

**Objetivo:** a primeira IA real (classificação, previsão, recomendação com modelo — não regra fixa), mas ainda como assistente: analisa e recomenda, o usuário decide e executa 100% das vezes.
**Quando nasce:** quando um dos critérios da seção 5 for atendido de fato num caso concreto — nunca por data de calendário. Candidatos mais prováveis, pela maturidade de dado esperada: score de risco de motorista (`VALUE_ENGINE.md`, estágio 4), previsão de manutenção antes da quebra (`VALUE_ENGINE.md`, estágio 5), preço dinâmico de locação (`VALUE_ENGINE.md`, estágio 3). Previsão de degradação de bateria/saúde do ativo (`SMART_FLEET_PLATFORM.md`, seção 6) é candidato prioritário validado por pesquisa de mercado, não só hipótese interna — é a lacuna que nenhum concorrente pesquisado preenche (`PRODUCT_VISION.md`, Proposta de valor).
**Do que depende:** Nível 1 maduro no módulo em questão — dado limpo, completo, com volume real. IA sem volume de dado suficiente é estatística de amostra pequena disfarçada de inteligência.
**O que ainda não deve existir:** execução automática de qualquer tipo, nem um Agente ainda. Toda recomendação passa por decisão humana explícita, sempre.

### Nível 4 — Agentes Especialistas

**Objetivo:** a IA do Nível 3, já validada e confiável, ganha um Agente que executa dentro de escopo delimitado (`OPERATING_MODEL.md`, seção 2.4) — sem exigir aprovação humana caso a caso para ações de baixo risco já comprovadas.
**Quando nasce:** quando um Assistente de IA (Nível 3) tiver operado tempo suficiente com recomendação aceita consistentemente pelo usuário, e existir um conjunto de ações claramente delimitado e de risco aceitável para automatizar.
**Do que depende:** Nível 3 maduro e comprovado no caso específico. Nenhum Agente nasce do zero — sempre nasce de um Assistente que já provou confiabilidade.
**O que ainda não deve existir:** Agente operando fora de escopo delimitado, sem trilha de auditoria, ou sem mecanismo de revogação — pré-requisito não negociável já registrado em `OPERATING_MODEL.md`, seção 2.4. Constituição completa deste nível em `AGENT_PLATFORM.md`.

### Nível 5 — Operação Autônoma

**Objetivo:** múltiplos Agentes Especialistas operando em conjunto, com supervisão humana de exceção — não de cada ação individual. A operação se auto-regula dentro de limites definidos pela empresa.
**Quando nasce:** só depois de Agentes Especialistas reais (Nível 4) terem provado, com auditoria e escopo comprovadamente respeitados, que podem operar com autonomia crescente — mesma condição já registrada em `OPERATING_MODEL.md`, seção 3.
**Do que depende:** Nível 4 maduro em múltiplos domínios simultaneamente.
**O que ainda não deve existir hoje:** nada disso é desenhado em detalhe agora. Antecipar a forma da Operação Autônoma antes de existir um único Agente Especialista real seria o mesmo erro que `FOUNDATION_PRINCIPLES.md` já rejeitou explicitamente (Princípio 8 — abstração antecipada).

---

## 5. Quando usar IA

IA só deve existir quando houver ganho real, provado — nunca porque a tecnologia permite. Este documento não inventa um critério paralelo: usa o mesmo crivo já registrado em `PRODUCT_VISION.md` ("Princípios do produto — o que justifica construir algo") e o critério específico da transição Automação → IA em `OPERATING_MODEL.md`, seção 2.3 (regra fixa deixa de produzir os melhores resultados, existe ganho mensurável com análise/previsão/classificação/recomendação).

Aplicado especificamente a IA, o teste é:

- **Reduz tempo?** Mensurável — quantidade de horas/tarefas por período que a IA elimina, comparado ao processo atual.
- **Reduz custo?** Mensurável — custo evitado (multa, manutenção corretiva, inadimplência) com base histórica real, não estimativa otimista.
- **Reduz risco?** Mensurável — incidente evitado ou exposição financeira/legal reduzida, comprovável, não hipotético.
- **Aumenta receita?** Mensurável — receita adicional atribuível de forma razoável (ex.: menos vacância por matching mais rápido).
- **Melhora decisões?** Mensurável — uma decisão que hoje é tomada sem dado suficiente passa a ter base concreta.

Se nenhum desses ganhos for mensurável antes de construir, a resposta correta é não construir ainda — o problema continua no Nível 1 (ERP Inteligente, regra fixa e explicável) até o ganho aparecer de verdade.

---

## 6. IA como capacidade transversal

Qualquer módulo futuro poderá usar IA: Veículos, Motoristas, Contratos, Financeiro, Compras, Empresas, BI, Command Center — nenhum desses é dono exclusivo da capacidade.

`CORE_CONCEPTS.md`, seção 1, já lista "IA" na tabela de Capabilities transversais ("Análise/previsão/recomendação — nunca execução — adiada até existir o primeiro caso de uso real"). Esta seção é a expansão dessa linha, não uma segunda definição.

**Decisão arquitetural de como isso se integra, sem duplicar implementação:** IA não nasce como um motor centralizado nem como um serviço único que todos os módulos chamam. Segue exatamente o padrão já comprovado por Vehicle Intelligence (DEC-022) e Driver Intelligence (DEC-025): cada módulo que adotar IA ganha sua própria pasta `features/<módulo>/intelligence/` — funções puras, zero acoplamento a React/Supabase — e só a camada de **exibição** (Cards, tipos) é compartilhada via `shared/`, nunca o cálculo. Isso evita o mesmo antipadrão que a plataforma já rejeitou em outras circunstâncias — motor de workflow genérico (DEC-010), Action Registry genérico (DEC-021), tabela polimórfica de Entidade (DEC-011): desenhar a forma genérica antes de existir um segundo caso de uso real tende a errar a forma.

Quando um segundo módulo além do primeiro caso real (Nível 3) precisar de IA, vale a mesma "regra dos 3"/hoisting já em uso desde a DEC-023: infraestrutura genuinamente genérica (ex.: um cliente de chamada a modelo/API externa, um formato padrão de `confidence`) sobe para `shared/` nesse momento — a regra de negócio de cada módulo nunca sai da sua própria pasta `intelligence/`.

---

## 7. Tipos de Inteligência

Taxonomia oficial — vocabulário comum para descrever o que uma IA específica faz, a partir do Nível 3. Nenhum destes está implementado hoje; cada um é ilustrado com um caso hipotético já registrado em `VALUE_ENGINE.md`, para não ficar abstrato:

- **Classificação** — atribuir uma categoria/rótulo a um dado. Ex.: score de risco do motorista (`VALUE_ENGINE.md`, estágio 4 — Locação → Receita).
- **Previsão** — estimar um valor futuro a partir de padrão histórico. Ex.: necessidade de manutenção antes da quebra (estágio 5 — Custos); momento ótimo de venda do ativo (estágio 7 — Venda do ativo).
- **Detecção** — identificar uma anomalia ou padrão fora do esperado. Ex.: gargalo sistemático de preparação (estágio 2 — Preparação); padrão recorrente de atraso de pagamento (estágio 4).
- **Recomendação** — sugerir a próxima ação, sempre associada a uma Command Action real existente, nunca decorativa (mesmo princípio de DEC-023 para `NextAction`). Ex.: preço dinâmico de locação (estágio 3 — Disponibilidade); alocação de capital para o próximo ciclo de compra (estágio 8 — Reinvestimento).
- **Explicação** — tornar compreensível o "porquê" de um Health Score, Insight ou Alerta já calculado. Não gera dado novo, interpreta o que já existe em linguagem que o usuário entende sem precisar ler regra ou código.
- **Otimização** — encontrar a melhor configuração dentro de restrições conhecidas. Ex.: identificar quais veículos/modelos/perfis de motorista são mais lucrativos (estágio 6 — Lucro).
- **Planejamento** — sequenciar ações/recursos ao longo do tempo. Ex.: matching veículo-motorista mais rápido possível (estágio 3).
- **Simulação** — testar uma hipótese ("e se") sem afetar dado real, puramente análise, nunca execução. Ex.: simular o impacto de um novo modelo de veículo na frota antes da compra (estágio 1 — Capital → Compra de ativos).

---

## 8. Princípios obrigatórios

Permanentes, aplicáveis a toda IA que vier a existir na plataforma, não só à primeira implementação:

1. **IA nunca inventa dados.** Mesma regra da honestidade já em produção (DEC-022: `score: null` nunca vira número inventado). Aplicada agora como princípio permanente de toda IA futura, não só do Health Score.
2. **IA sempre informa o nível de confiança, quando aplicável.** Toda saída de classificação/previsão/recomendação carrega, quando o método permitir, um indicador de confiança visível ao usuário — nunca um número apresentado como certeza absoluta.
3. **IA trabalha sobre dados auditáveis.** Nunca sobre uma fonte de dado paralela e não rastreável — sempre sobre o que já passa pela trilha normal da plataforma (`audit_log`/`timeline_eventos`, `CORE_CONCEPTS.md`, seção 5).
4. **Toda recomendação deve poder ser explicada.** Nenhuma "caixa preta" apresentada como fato. Quando o método não permitir explicação completa, o mínimo aceitável é "por que este padrão foi considerado relevante" — nunca silêncio.
5. **Toda ação precisa ser rastreável.** Para ações executadas por Agente (nunca pela IA diretamente, seção 3), a trilha de auditoria já é pré-requisito não negociável (`OPERATING_MODEL.md`, seção 2.4).
6. **A IA deve degradar com honestidade quando faltar informação.** Extensão direta da regra de honestidade (DEC-022): faltando dado, a resposta correta é "não sei"/`null`, nunca um valor plausível inventado para fechar a conta.
7. **Segurança sempre prevalece sobre autonomia.** Em qualquer conflito entre "o Agente poderia agir mais rápido sem aprovação" e "isso reduz uma camada de segurança", a segurança vence — mesmo espírito do pré-requisito de escopo delimitado e revogável (`OPERATING_MODEL.md`, seção 2.4).
8. **O usuário sempre pode ignorar uma recomendação.** A IA nunca remove a decisão final do usuário (seção 3). Ignorar uma recomendação nunca é bloqueado, penalizado ou dificultado pela interface.

---

## 9. Roadmap

Registro de quando cada capacidade entra — não implementação, só registro, conforme pedido.

- **Nível 0 (ERP):** Fases 1–6 de `ARQUITETURA.md` — em andamento.
- **Nível 1 (ERP Inteligente):** já em andamento desde a Sprint 3 (Vehicle Intelligence, DEC-022) e Sprint 6 (Driver Intelligence, DEC-025) — se estende a cada novo módulo que ganhar Cockpit próprio (Contratos, Financeiro, quando existirem).
- **Nível 2 (Business Intelligence):** Fase 7 de `ARQUITETURA.md` (Indicadores & Dashboard).
- **Nível 3 (Assistentes de IA):** sem fase fixa de calendário — nasce no primeiro caso concreto que atender aos critérios da seção 5, provavelmente depois de Financeiro/Contratos existirem (Fases 2–3) e gerarem volume real de dado. Candidatos mais próximos: score de risco de motorista, previsão de manutenção.
- **Nível 4 (Agentes Especialistas):** depois de pelo menos um caso de Nível 3 operar tempo suficiente com confiabilidade comprovada — sem data, condicional a evidência real, não a cronograma.
- **Nível 5 (Operação Autônoma):** sem horizonte definido — condicional a múltiplos Agentes Especialistas reais e maduros operando simultaneamente.

---

## Como este documento é usado

Referência obrigatória para toda decisão futura envolvendo IA — mas não estática. Evolui por decisão explícita e registrada no `DECISION_LOG.md`, nunca por interpretação livre. Nenhuma seção deste documento autoriza, por si só, começar a implementar IA — a autorização de implementar continua vindo do Carlos, caso a caso, quando um uso real atender aos critérios da seção 5.
