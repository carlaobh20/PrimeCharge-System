# PrimeCharge — Smart Fleet Platform
### Constituição oficial da Frota Inteligente — como cada veículo se torna um ativo vivo, ao longo dos próximos anos

Revisado criticamente por Claude antes de publicar, no mesmo padrão de `FOUNDATION_PRINCIPLES.md`. Pontos corrigidos em relação à proposta original do Carlos estão marcados com 🔶, com o motivo — nada foi alterado silenciosamente. Mesmo peso dos demais documentos de fundação: referência obrigatória, não sugestão.

Este documento não redefine multi-tenant, roadmap geral ou modelagem de domínio (`ARQUITETURA.md`), não redefine os princípios técnicos gerais nem Capabilities/State Machines/Eventos (`FOUNDATION_PRINCIPLES.md`, `CORE_CONCEPTS.md`), não redefine a escada processo→automação→IA→agente (`OPERATING_MODEL.md`), não redefine a filosofia/níveis de maturidade de IA (`AI_PLATFORM.md`), não redefine a constituição do Agente (`AGENT_PLATFORM.md`), e não redefine o ciclo econômico da empresa (`VALUE_ENGINE.md`). Onde um assunto já está definido em outro documento, este referencia — nunca repete. O que este documento define, e que não existia em nenhum outro lugar: o que é um Ativo Inteligente, as fontes de dado da frota, as camadas de processamento, o vocabulário de telemetria, a Inspeção Inteligente, a evolução do Health Score, as perguntas que a plataforma deve responder, e os princípios de resiliência específicos de uma frota conectada.

Criado em 2026-08-05, a pedido do Carlos, como o último documento de fundação antes de voltar ao desenvolvimento de funcionalidades do ERP. Documentação pura — nenhum código, migration, componente ou integração real (OBD, API de montadora) foi criado junto com este documento.

## Objetivo

A PrimeCharge não quer só administrar veículos — quer conhecer cada um melhor do que qualquer pessoa conseguiria, sem depender de memória humana: como está sendo usado, como está sendo conduzido, como está sendo carregado, como está se depreciando, como a bateria está envelhecendo, quando vai quebrar, quando deve ser vendido, quanto realmente vale. Cada uma dessas perguntas já tem lugar certo na fundação existente — a maioria corresponde a uma hipótese de IA já registrada por estágio em `VALUE_ENGINE.md` (estágios 1 a 8); a métrica de utilização já é o North Star escolhido (`NORTH_STAR.md`). Este documento é a arquitetura que torna essas hipóteses respondíveis com dado real, quando a hora chegar.

---

## 1. O que é um Ativo Inteligente

```
Veículo cadastrado → Veículo conectado → Veículo inteligente → Ativo inteligente
```

- **Veículo cadastrado**: dado estático no ERP — placa, chassi, marca, modelo, valores de compra. Já existe hoje, desde a Fase 1 (`ARQUITETURA.md`).
- **Veículo conectado**: existe pelo menos uma fonte de dado em tempo real ou quase real ligada a ele (seção 2) — o dado passa a fluir, mas ainda não é interpretado.
- **Veículo inteligente**: o dado conectado passa a alimentar Vehicle Intelligence (`DECISION_LOG.md` DEC-022) — Health Score, Insights, Alertas, Próximas Ações. É interpretação, ainda sobre o veículo isoladamente.
- **Ativo inteligente**: a camada patrimonial (`DECISION_LOG.md` DEC-012 — "Ativo Patrimonial", hoje só o Veículo) ganha inteligência de valor real: depreciação por uso e estado reais (não só idade tabelada), valor residual estimado, momento ótimo de venda. É onde "Veículo inteligente" (o que ele é e como está) se encontra com "Ativo Patrimonial" (quanto vale e quando vender).

**Nota de escopo**: "Ativo inteligente" hoje só tem um instanciamento real — o Veículo. Estender esse conceito a outro tipo de ativo patrimonial (equipamento, notebook) continua condicionado ao mesmo gatilho já registrado em DEC-012 — um segundo tipo de ativo entrar em escopo real —, não uma autorização automática deste documento.

---

## 2. Fontes de informação

Nenhuma implementada agora — lista do que pode, no futuro, alimentar a plataforma, e a função de cada uma:

| Fonte | Função |
|---|---|
| ERP | Dado cadastral, contratual, financeiro e de manutenção já registrado — a base de tudo, e também o consumidor final do que as outras fontes produzem (seção 3). |
| OBD2 | Telemetria bruta do próprio veículo em tempo real — falha, consumo, uso. |
| APIs das montadoras | Telemetria oficial do fabricante, quando disponível — geralmente mais rica que OBD2 genérico, mas dependente de cada marca (ver princípio de não-dependência de fabricante, seção 10). |
| Wallbox | Padrão de carregamento lento/doméstico — horário, profundidade, energia consumida. |
| Carregadores rápidos | Padrão de carregamento público/fora da base — relevante para rotas longas e uso atípico. |
| GPS | Localização, rota, comportamento de condução (velocidade, frenagem, aceleração). |
| Aplicativo do motorista | Canal direto de reporte humano (avaria percebida, foto no ato) — condicionado à existência de um portal do motorista, hoje ainda não decidido (`ARQUITETURA.md`, Fase 8: "portal do motorista, se decidido"). |
| Fotos | Evidência visual de estado — vistoria, avaria, desgaste. Já existe como capability (`arquivos`, `CORE_CONCEPTS.md`, seção 1). |
| Vídeos | Mesmo papel de Fotos, com mais contexto temporal — útil para vistoria e comparação ao longo do tempo. |
| Sensores | Categoria aberta para sensores além de OBD2 (pneu, câmera interna, etc.) — não especificado agora, entra quando um caso real justificar. |
| Manutenções | Histórico real de serviço — valida ou contradiz o que a telemetria de falha sugere. |
| Contratos | Contexto de uso esperado (perfil do motorista, prazo, condição) — permite separar desvio real de padrão já esperado. |
| Financeiro | Custo real associado ao veículo — insumo direto do estágio "Lucro" de `VALUE_ENGINE.md`. |
| Documentação | Validade de documento — já é fonte real hoje (categoria Documental, DEC-022). |
| Vistorias | Estado estruturado do veículo num ponto do tempo — insumo direto de Inspeção Inteligente (seção 5); já existe como capability (`Checklist`, `CORE_CONCEPTS.md`, seção 1). |
| Usuários | Qualquer input manual humano — comentário, tag, correção. Sempre uma fonte legítima, nunca substituída por automação. |
| Agentes | Quando existirem (`AGENT_PLATFORM.md`), também produzem dado — decisão tomada, ação executada — que vira insumo da próxima rodada de inteligência. |

Lista aberta — uma fonte nova se soma quando um caso real justificar, sem exigir nova versão deste documento.

---

## 3. Camadas da plataforma

🔶 **Correção**: a proposta original desenha um pipeline linear terminando em ERP (`Coleta → Validação → Normalização → Inteligência → Agentes → ERP`). Isso contradiz a própria seção 2 deste documento — o ERP já é listado ali como **fonte** de dado (contrato, financeiro, manutenção), não só destino. Um pipeline estritamente linear que termina no ERP não descreve o que já acontece hoje, de verdade, em produção: Vehicle Intelligence (DEC-022) lê dado do ERP (Supabase), calcula Health Score/Insights, e devolve o resultado para dentro do próprio ERP (Cockpit do Ativo, Command Center) — é um ciclo, não uma linha reta. Corrigido abaixo: o ERP é ponto de entrada **e** ponto de consumo, não só o fim da fila.

```
        ┌───────────────────────────────────────────────────────────────┐
        │                                                                 │
        ▼                                                                 │
     Coleta → Validação → Normalização → Inteligência → (Agentes) → Consumo
        ▲                                                                 │
        └── ERP é fonte aqui ──────────────────── ERP é consumidor aqui ──┘
```

- **Coleta**: ingestão bruta de qualquer fonte da seção 2, sem julgamento sobre qualidade.
- **Validação**: o dado é plausível? Está dentro de faixa esperada, veio de fonte reconhecida, não está corrompido. Dado que falha aqui é descartado ou marcado, nunca aceito silenciosamente.
- **Normalização**: conversão para unidade e formato canônicos da plataforma — km sempre na mesma unidade, timestamp sempre no mesmo fuso, independente de qual fonte originou o dado.
- **Inteligência**: análise, previsão, classificação, recomendação — o que `AI_PLATFORM.md` já define por completo; esta camada só aponta onde ela se encaixa no fluxo de dado da frota.
- **Agentes** (opcional, condicional): quando existir um Agente real (`AGENT_PLATFORM.md`), ele age aqui, dentro do escopo autorizado, a partir do que a Inteligência produziu.
- **Consumo**: Command Center, Cockpit do Ativo, Dashboard, BI — todos módulos do próprio ERP. O resultado de todo o processamento volta para dentro do sistema que os módulos de negócio já usam, não para um lugar separado. Isso fecha o ciclo: o ERP alimentou a Coleta com contrato/financeiro/manutenção, e agora recebe de volta Health Score, Insight, Alerta, Próxima Ação.

---

## 4. Telemetria

Sem protocolo, sem fornecedor — só o que interessa ao negócio e por quê:

| Tipo de dado | Por que gera valor |
|---|---|
| Quilometragem (real, contínua) | Troca "km declarado" por "km medido" — melhora precisão de manutenção preventiva (`VALUE_ENGINE.md`, estágio 5) e de depreciação por uso real (estágio 7). |
| Consumo (energia por km) | Indicador direto de eficiência — separa efeito do veículo, da condição de uso e do motorista. Conecta com estágio 4 (Locação) e com a Taxa de utilização (`NORTH_STAR.md`). |
| Temperaturas (bateria, motor) | Sinal precoce de degradação ou risco de falha — antecipa o estágio 5 ("prever necessidade de manutenção antes da quebra"). |
| Estado da bateria (saúde e carga) | O dado mais diretamente ligado ao valor residual de um veículo elétrico — bateria é o componente mais caro e mais sensível à depreciação num EV. Conecta com estágio 7 (Venda do ativo). |
| Falhas / códigos de diagnóstico | Detecção precoce — insumo direto de manutenção preditiva. |
| Uso (tempo rodando vs. parado, distância por dia) | É literalmente o dado bruto que constrói a Taxa de utilização, o North Star já escolhido. |
| Carregamentos (frequência, profundidade, velocidade) | Padrão de carga é um dos maiores fatores de degradação de bateria — dado direto de um futuro Battery Guardian (seção 8) e de orientação de boa prática ao motorista. |
| Tempo parado / tempo rodando | Alimenta diretamente vacância (`VALUE_ENGINE.md`, estágio 3), indicador já existente no produto. |

---

## 5. Inspeção Inteligente

Formaliza a evolução de uma capability que já existe — `Checklist` (`CORE_CONCEPTS.md`, seção 1, "vistoria de veículo já é necessidade real") — quando ganha IA por cima do registro estruturado que já existe hoje:

- **Vistoria inicial**: primeiro registro de estado do veículo — linha de base contra a qual toda comparação futura acontece.
- **Vistoria periódica**: repetição programada da vistoria, mesmo sem evento que a justifique — é o que permite detectar desgaste gradual, não só dano pontual.
- **Vistoria após evento**: disparada por algo específico (devolução de contrato, sinistro, manutenção) — compara o estado antes/depois desse evento específico.
- **Comparação histórica**: cada vistoria nova é lida contra as anteriores do mesmo veículo, não isoladamente — é essa comparação que transforma uma foto em informação (esse risco existia na vistoria anterior? piorou? é novo?).
- **Linha do tempo visual**: sequência cronológica das vistorias de um veículo, navegável — a forma de um humano revisar rapidamente a evolução sem reler laudo por laudo.
- **Score de confiança**: toda leitura de IA sobre uma vistoria carrega um nível de confiança explícito — mesmo princípio já registrado em `AI_PLATFORM.md`, seção 8 ("IA sempre informa o nível de confiança, quando aplicável"), aplicado aqui à leitura de imagem/vídeo especificamente.

Nenhuma IA de visão computacional é implementada agora — esta seção define só a arquitetura de como uma vistoria vira dado comparável ao longo do tempo, para quando essa IA existir de fato (`AI_PLATFORM.md`, Nível 3).

---

## 6. Saúde do Ativo

🔶 **Correção**: a proposta original lista seis novas categorias de Health Score (Saúde da bateria, Telemetria, Consumo, Condução, Manutenção, Valor residual) para somar às três que já existem (Operacional, Documental, Patrimonial — as que hoje têm regra real; DEC-022 já define uma quarta e quinta, Financeira e Comercial, hoje `null` por falta de módulo). Somar seis categorias novas a essa lista quebraria uma decisão já tomada duas vezes nesta plataforma — DEC-022 e DEC-025 tratam as 5 categorias (`HealthCategoriaId`) como um **vocabulário fechado de negócio**, deliberadamente não expandido a cada nova fonte de dado (DEC-025 rejeitou até criar uma categoria nova só para Motorista, preferindo reaproveitar as 5 existentes). Telemetria não é uma nova dimensão de negócio — é uma fonte de dado nova, mais rica, para dimensões que já existem.

**Correção aplicada** — os seis itens da proposta original viram **evidência mais rica dentro das categorias já existentes**, não categorias novas:

| Item da proposta | Onde entra |
|---|---|
| Saúde da bateria | **Operacional** — hoje calculada só por status + inatividade; telemetria de bateria vira um segundo sinal dentro da mesma categoria. |
| Telemetria (geral) | Não é categoria, é fonte — enriquece **Operacional** com dado contínuo em vez de só o `status` atual. |
| Consumo | **Operacional** — eficiência de uso é parte de "como o veículo está operando". |
| Condução | **Operacional** para o Veículo (degradação por padrão de uso) — e, paralelamente, um sinal legítimo dentro de **Driver Intelligence** (`DECISION_LOG.md` DEC-025), já que condução é tão sobre o motorista quanto sobre o veículo. Não cria categoria nova em nenhum dos dois. |
| Manutenção | **Operacional** — manutenção preventiva em dia é, por definição, parte de "como o veículo está operando". |
| Valor residual | **Patrimonial** — hoje calculada por completude/sanidade dos valores de compra/FIPE/mercado; telemetria e histórico real trocam esse proxy estático por uma curva de depreciação informada por uso e estado reais. É a mesma categoria, só com dado melhor por trás. |

Nenhuma fórmula é definida aqui, como pedido — só onde cada novo tipo de sinal se encaixa na estrutura que já existe.

---

## 7. Inteligência — perguntas que a plataforma deve responder

Nenhuma implementada agora. Organizadas por tema, para dar direção a quando cada uma for construída (seção 9):

**Degradação e saúde do veículo**
1. Qual veículo está degradando mais rápido que a média da frota?
2. Qual veículo tem o maior número de falhas recorrentes no mesmo componente?
3. Qual veículo está gerando mais códigos de falha por mês?
4. Qual veículo passou mais tempo em manutenção corretiva do que preventiva?

**Bateria**
5. Qual bateria está envelhecendo mais rápido do que o esperado para o modelo/idade?
6. Qual veículo perdeu mais autonomia real nos últimos meses?
7. Que padrão de carregamento está acelerando a degradação de uma bateria específica?
8. Quando uma bateria específica provavelmente vai precisar de troca?

**Condução**
9. Qual motorista tem o padrão de condução mais agressivo (frenagem brusca, aceleração)?
10. Qual motorista está associado a desgaste prematuro de pneu/freio?
11. Existe correlação entre um motorista específico e degradação de bateria acima da média?
12. Qual motorista dirige de forma mais eficiente (menor consumo por km)?

**Consumo e energia**
13. Qual veículo consome energia acima da média da frota para o mesmo perfil de uso?
14. Que carregador (Wallbox/rápido) está associado a ciclos de carga menos eficientes?
15. Existe padrão de horário/profundidade de carga que degrada mais a bateria?

**Manutenção**
16. Quando este veículo específico deve passar pela próxima revisão, com base no uso real, não só no calendário?
17. Qual componente tem maior probabilidade de falhar nos próximos 30 dias, com base em padrão histórico da frota?
18. Qual oficina/fornecedor está associado a retrabalho recorrente?

**Valor e venda**
19. Quando é o momento ótimo de vender este veículo, considerando valor de mercado real vs. curva de manutenção crescente?
20. Qual veículo já passou do ponto ótimo de depreciação e está destruindo valor por continuar na frota?
21. Quanto este veículo realmente vale hoje, considerando estado real, não só idade/km tabelados?

**Uso e disponibilidade**
22. Qual veículo está parado além do justificável operacionalmente?
23. Qual veículo tem o padrão de uso mais próximo do ideal para maximizar receita sem acelerar depreciação?

**Comparação e ranking**
24. Quais os veículos mais saudáveis da frota hoje, e por quê?
25. Quais os veículos mais críticos da frota hoje, e por quê?
26. Que modelo/marca tem melhor desempenho real (não de tabela/fabricante) na frota da PrimeCharge especificamente?

**Financeiro**
27. Qual veículo tem o menor custo total de propriedade real por km rodado?
28. Qual perfil de motorista é mais lucrativo por veículo?

**Risco**
29. Qual veículo tem maior risco de pane nos próximos 30 dias?
30. Qual combinação veículo + motorista representa o maior risco combinado (degradação técnica + inadimplência)?

---

## 8. Agentes futuros

Só categorias — nenhum agente criado, nenhum nasce fora do caminho já obrigatório (`AGENT_PLATFORM.md`, seção 2: Problema → Processo → Automação → Inteligência → Agente). Cada uma abaixo é um refinamento das categorias já registradas em `AGENT_PLATFORM.md`, seção 11 (majoritariamente **Operacional**, com **Financeiro** para o último item) — não uma taxonomia nova e paralela:

Battery Guardian · Asset Guardian · Maintenance Guardian · Inspection Guardian · Driver Guardian · Charging Guardian · Residual Value Guardian · Fleet Guardian.

Lista aberta, mesmo critério de `AGENT_PLATFORM.md` seção 11 — uma categoria nova só se justifica quando o primeiro Agente real dessa natureza estiver prestes a nascer.

Pesquisa de mercado (`PRODUCT_VISION.md`, Proposta de valor) confirma que Battery Guardian e Asset Guardian mira um espaço vazio real — nenhum concorrente pesquisado combina inteligência de bateria com o fluxo de locação. Deixa de ser suposição interna, passa a ser diferencial validado por evidência externa.

---

## 9. Evolução

```
Fase 1 — ERP
    ↓
Fase 2 — Dados
    ↓
Fase 3 — Telemetria
    ↓
Fase 4 — Inteligência
    ↓
Fase 5 — Agentes
    ↓
Fase 6 — Operação Autônoma
```

Correspondência com os níveis de maturidade já oficializados em `AI_PLATFORM.md`, seção 4 — esta seção não cria um segundo roadmap paralelo, localiza onde a Frota Inteligente entra no já existente:

- **Fase 1 (ERP)** = Nível 0. Cadastro funcionando, sem nenhuma fonte de telemetria ainda.
- **Fase 2 (Dados)** = ainda Nível 0/1 — amplia as fontes manuais/estruturadas (fotos, vistorias, manutenções, seção 2), sem nenhum dispositivo conectado ainda.
- **Fase 3 (Telemetria)** = Nível 1 (ERP Inteligente) — fontes automatizadas (OBD2, GPS, Wallbox) passam a alimentar regra determinística (ainda sem modelo estatístico real).
- **Fase 4 (Inteligência)** = transição de Nível 2 (BI — tendência/histórico sobre o volume acumulado de telemetria) para Nível 3 (Assistentes de IA — quando um caso concreto atender ao critério de `AI_PLATFORM.md`, seção 5).
- **Fase 5 (Agentes)** = Nível 4 — primeiro Guardian real (seção 8), nascido pelo caminho obrigatório de `AGENT_PLATFORM.md`.
- **Fase 6 (Operação Autônoma)** = Nível 5, mesma condição já registrada em `AI_PLATFORM.md` e `AGENT_PLATFORM.md`: múltiplos Agentes maduros e comprovados, não desenhado em detalhe agora.

---

## 10. Princípios obrigatórios

Toda integração de frota deverá:

1. **Não depender de fabricante específico** — nenhuma decisão de arquitetura assume que só existirá um fornecedor de OBD2/Wallbox/API.
2. **Ser substituível** — trocar de fornecedor de telemetria não pode exigir reescrever a camada de Inteligência (seção 3); a fronteira de Normalização existe exatamente para isolar esse risco.
3. **Ser auditável** — toda leitura de telemetria que influenciar uma decisão (Health Score, Alerta, ação de Agente) é rastreável até a fonte, mesmo padrão já exigido de qualquer Agente (`AGENT_PLATFORM.md`, seção 9).
4. **Não travar o ERP** — o ERP nunca depende de telemetria estar disponível para funcionar; telemetria é sempre uma camada de enriquecimento, nunca um requisito de operação (detalhado na seção 11).
5. **Continuar funcionando sem internet** — o cadastro, contrato e financeiro do ERP operam independente de qualquer dispositivo estar online.
6. **Falhar com segurança** — ausência ou falha de leitura de telemetria nunca é interpretada como "tudo bem"; falta de dado aparece como falta de dado, nunca como sinal positivo por omissão.
7. **Armazenar histórico** — telemetria bruta relevante é preservada, não só o resultado processado — sem histórico, comparação ao longo do tempo (seção 5) não é possível.
8. **Não perder dado** — falha de conectividade atrasa a chegada do dado, nunca o descarta silenciosamente.
9. **Permitir novas fontes no futuro** — a lista da seção 2 é aberta por design, nenhuma arquitetura aqui pressupõe um conjunto fechado de fontes.
10. **Obedecer a `FOUNDATION_PRINCIPLES.md`** — nenhuma exceção específica de frota substitui os princípios gerais da plataforma.

🔶 **Correção — princípio ausente na proposta original**: nenhum item cobria **privacidade de dado de condução**. Telemetria de comportamento do motorista (frenagem, velocidade, rota, horário) é dado pessoal sensível sob a LGPD — rastrear "como cada motorista dirige" sem um princípio explícito de minimização e transparência é um risco real de compliance para uma plataforma pensada para 10 anos, não uma hipótese distante. Adicionado como princípio 11, com o mesmo peso dos demais:

11. **Privacidade por design em dado de condução** — telemetria que descreve comportamento humano (não só estado do veículo) é coletada com minimização (só o necessário para a pergunta de negócio que a justifica, seção 7) e com o motorista informado de que esse dado existe. Nenhuma coleta de comportamento de condução é implementada sem esse princípio resolvido antes — não depois.

---

## 11. Backup e Resiliência

Princípios, não tecnologia — a operação do ERP nunca pode depender de nenhum componente externo de telemetria estar no ar:

- **Telemetria é sempre enriquecimento, nunca pré-requisito.** Se o OBD parar, a internet cair, a API da montadora ficar indisponível, um Wallbox ficar offline, ou um dispositivo for trocado — o ERP continua operando exatamente como opera hoje, sem nenhuma dessas fontes. Cadastro, contrato, financeiro, manutenção manual: nada disso depende de telemetria.
- **Degradação com honestidade, não com dado falso.** Quando uma fonte de telemetria está indisponível, o sinal correspondente aparece como indisponível — nunca como um valor último conhecido apresentado como atual, nem como valor neutro inventado para não deixar vazio. Isto não é um princípio novo: é a mesma regra de honestidade já registrada em DEC-022 (`score: null` nunca vira número inventado), aplicada aqui à ausência de telemetria especificamente.
- **Dado atrasado é aceitável, dado perdido não é.** Um dispositivo offline temporariamente acumula localmente (quando o próprio dispositivo permitir) e sincroniza quando a conexão voltar — mesma tolerância a atraso, sem perda, que o mecanismo de Eventos já foi desenhado para ter (`CORE_CONCEPTS.md`, seção 5; outbox, `ARQUITETURA.md`, seção 1.13).
- **Troca de dispositivo nunca apaga histórico.** Identidade do veículo (no ERP) é permanente; identidade do dispositivo de telemetria é substituível — trocar um OBD2 por outro nunca deve parecer, no histórico, que o veículo "nasceu de novo".

---

## 12. Relação com os documentos existentes

- `ARQUITETURA.md` — Storage (fotos/vídeos, seção 1.10) e a estratégia de outbox (seção 1.13) são a infraestrutura real que sustenta as seções 2, 3 e 11 deste documento, quando a implementação começar.
- `FOUNDATION_PRINCIPLES.md` — Princípio 1 (capacidades transversais) já cobre `arquivos`/`Checklist`, reaproveitados nas seções 2 e 5. Princípio 8 (longevidade vem de simplicidade, não de abstração antecipada) fundamenta a correção da seção 6 (taxonomia de Health Score permanece fechada).
- `CORE_CONCEPTS.md` — `Checklist` (seção 1) é a base técnica da Inspeção Inteligente (seção 5); Eventos (seção 5) é o mecanismo de propagação de telemetria quando ela existir.
- `DECISION_LOG.md` — DEC-012 fundamenta o conceito de Ativo Inteligente (seção 1); DEC-022/DEC-025 fundamentam a correção da seção 6 (categorias fechadas do Health Score).
- `PRODUCT_VISION.md` / `NORTH_STAR.md` — a Taxa de utilização da frota (North Star) é construída diretamente a partir do dado de uso/telemetria desta plataforma (seção 4).
- `VALUE_ENGINE.md` — cada pergunta da seção 7 corresponde a uma hipótese de "IA (futuro)" já registrada por estágio naquele documento; este documento é onde essas hipóteses ganham arquitetura.
- `OPERATING_MODEL.md` — a evolução da seção 9 segue a mesma escada processo→automação→IA→agente já definida ali, aplicada especificamente à frota.
- `AI_PLATFORM.md` — os Níveis 0–5 (seção 4 daquele documento) são a referência de maturidade que a seção 9 deste documento mapeia; a taxonomia de tipos de inteligência (seção 7 daquele documento) se aplica a qualquer pergunta da seção 7 deste.
- `AGENT_PLATFORM.md` — todo "Guardian" da seção 8 nasce pelo caminho obrigatório e obedece à estrutura, permissões e auditoria já definidas ali; nenhuma regra nova de agente é criada neste documento.
