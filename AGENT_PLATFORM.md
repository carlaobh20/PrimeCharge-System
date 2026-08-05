# PrimeCharge — Agent Platform
### Constituição oficial dos Agentes — como qualquer agente nasce, opera e é desligado nos próximos 10 anos

Revisado criticamente por Claude antes de publicar, no mesmo padrão de `FOUNDATION_PRINCIPLES.md`. Pontos corrigidos em relação à proposta original do Carlos estão marcados com 🔶, com o motivo — nada foi alterado silenciosamente. Mesmo peso dos demais documentos de fundação: referência obrigatória, não sugestão.

Este documento não redefine a escada processo→automação→IA→agente→funcionário (`OPERATING_MODEL.md`), não redefine a filosofia de IA nem os níveis de maturidade Nível 0–5 (`AI_PLATFORM.md`), não redefine Capabilities/State Machines/Policies/Eventos (`CORE_CONCEPTS.md`). Onde um assunto já está definido em outro documento, este referencia — nunca repete. O que este documento define, e que não existia em nenhum outro lugar: o papel específico do Agente, sua estrutura obrigatória, hierarquia, comunicação, permissões, memória, auditoria, ciclo de vida e categorias.

Criado em 2026-08-05, a pedido do Carlos, como o último documento de fundação antes de agentes reais começarem a ser construídos. Documentação pura — nenhum código, migration, componente ou agente implementado.

## Objetivo

A PrimeCharge é construída para operar com o menor número possível de funcionários — processo, automação, IA e agente são sempre preferidos à contratação (mesmo objetivo permanente já registrado em `OPERATING_MODEL.md`, seção 2.5: "aumentar escala sem aumentar proporcionalmente a equipe"). Isso não significa criar agente para tudo. Este documento existe justamente para impor disciplina sobre quando um agente nasce (seção 2) e, com o mesmo peso, quando ele **não** deve nascer (seção 3) — um modelo permissivo demais aqui custa mais caro em 10 anos do que a contratação que ele tentou evitar.

---

## 1. O que é um Agente

Definições rápidas dos quatro degraus anteriores (detalhamento completo em `OPERATING_MODEL.md`, seção 2 — não repetido aqui):

- **Processo**: ação humana documentada por escrito (`OPERATING_MODEL.md`, 2.1).
- **Automação**: execução determinística de um processo já validado (`OPERATING_MODEL.md`, 2.2).
- **IA**: análise, previsão, classificação ou recomendação sobre a variação que uma regra fixa não cobre — nunca executa (`OPERATING_MODEL.md`, 2.3; `AI_PLATFORM.md`, seção 3).

**Agente** — o foco deste documento: é a unidade operacional com **permissão delimitada para executar uma ação real**, a partir de uma decisão que ela mesma não tomou sozinha. A decisão vem de uma IA já madura (Nível 3 de `AI_PLATFORM.md`) ou de uma regra determinística já validada. O Agente tem "mãos", nunca tem o "juízo" — quem decide continua sendo a IA ou a regra; o Agente só executa dentro do escopo que lhe foi dado (`OPERATING_MODEL.md`, seção 2.4; `AI_PLATFORM.md`, seção 3: "quem executa é sempre usuário, automação ou agente autorizado").

Um "Agente" sem IA ou regra determinística validada por trás decidindo não é um Agente — é uma automação com nome bonito, e deve ser chamado assim.

- **Funcionário**: último recurso — pessoa contratada só quando processo, automação, IA e agente, nessa ordem, já foram esgotados (`OPERATING_MODEL.md`, 2.5).

---

## 2. Como nasce um agente

```
Problema → Processo → Automação → Inteligência (IA) → Agente
```

Cada seta representa um degrau que só é alcançado quando o anterior cumpriu seu critério de maturidade — nunca por urgência, nunca por pular etapa (mesmo princípio de `OPERATING_MODEL.md`, seção 1: "nunca pular um degrau sem registrar por escrito o motivo").

- **Problema → Processo**: alguém identifica algo que se repete e escreve como isso deve ser feito (`OPERATING_MODEL.md`, 2.1). Um Problema sem Processo nunca justifica um Agente diretamente, não importa quão urgente pareça — pular direto de Problema para Agente é o mesmo erro que pular direto de Problema para Funcionário do outro lado da escada.
- **Processo → Automação**: o processo prova estabilidade, previsibilidade e ROI (`OPERATING_MODEL.md`, 2.2).
- **Automação → Inteligência**: a automação esbarra em variação que regra fixa não cobre, e existe ganho mensurável em analisar/prever/recomendar (`OPERATING_MODEL.md`, 2.3).
- **Inteligência → Agente**: a IA já demonstra confiabilidade suficiente e existe um conjunto de ações claramente delimitado e seguro para executar (`OPERATING_MODEL.md`, 2.4). Este é o único ponto de nascimento válido de um Agente — nenhum Agente nasce "do zero", sempre nasce de uma Inteligência já comprovada.

---

## 3. Quando NÃO criar um agente

- **Quando um processo resolve**: o problema ainda não se repetiu o suficiente, ou ainda muda de forma a cada execução (`OPERATING_MODEL.md`, 2.1/2.2). Criar um Agente aqui é construir "mãos" para uma decisão que ainda nem existe de forma estável.
- **Quando uma automação resolve**: a entrada é determinística, sem necessidade de julgamento. Um Agente aqui é desperdício — uma automação direta resolve sem o custo extra de escopo, permissão e auditoria que todo Agente exige (seção 4).
- **Quando uma IA sozinha resolve**: a IA já entrega o ganho (análise, recomendação) e a execução ainda cabe bem a um usuário decidindo manualmente. Criar um Agente aqui antecipa um risco de execução automática que ninguém pediu ainda. O teste continua sendo o de `AI_PLATFORM.md`, seção 5 — mas aplicado especificamente à **execução**: existe ganho mensurável em automatizar a execução em si, não só em ter a recomendação?
- **Quando um funcionário resolve**: a natureza do trabalho exige julgamento ou responsabilidade que a lei, o cliente ou o risco do negócio exigem que seja humano (`OPERATING_MODEL.md`, 2.5). Nenhum Agente deve ser criado para contornar essa exigência.

---

## 4. Estrutura obrigatória

Todo Agente nasce com estes campos preenchidos — nenhum Agente entra em Homologação (seção 10) sem os 19 abaixo definidos por escrito:

| Campo | Define |
|---|---|
| Nome | Identificador único e estável do Agente. |
| **Responsável humano** 🔶 | A pessoa (não um cargo genérico) responsável por este Agente — quem responde quando ele erra, quem decide pausá-lo ou desligá-lo. |
| Missão | Por que este Agente existe, em uma frase. |
| Objetivo | O resultado concreto que o Agente busca produzir. |
| Responsabilidade | O que este Agente possui de ponta a ponta — o que ninguém mais deve fazer no lugar dele. |
| Escopo | Os limites do que ele pode tocar — entidades, módulos, tipos de ação. |
| Entradas | O que o Agente recebe para poder decidir/agir. |
| Saídas | O que o Agente produz — dado, ação, ou ambos. |
| Ferramentas | Os sistemas/APIs/funções que ele tem capacidade técnica de chamar (ver distinção com Permissões, seção 7). |
| Permissões | Quais dessas ferramentas ele está de fato autorizado a usar, e sob quais condições (seção 7). |
| Limites | O que ele nunca pode fazer, mesmo tendo a ferramenta disponível. |
| KPIs | Métricas que medem se o Agente está cumprindo o Objetivo. |
| Critérios de sucesso | O que caracteriza uma execução bem-sucedida. |
| Critérios de falha | O que caracteriza uma execução malsucedida — e o que acontece a seguir. |
| Critérios de parada | Condição que interrompe o Agente automaticamente (circuit breaker) — nunca depende só de alguém perceber e desligar manualmente. |
| Auditoria | Como cada ação deste Agente é registrada (seção 9). |
| Memória | O que este Agente especificamente lembra entre execuções (seção 8). |
| Logs | Onde e como o rastro técnico de execução fica disponível para investigação. |
| **Versão** 🔶 | Identificador de versão da lógica/prompt/regra do Agente — toda decisão auditada (seção 9) referencia a versão que a produziu. |

🔶 **Correção**: a lista original não incluía **Responsável humano** nem **Versão**. Sem um humano nomeado por Agente, a auditoria (seção 9) diz *o que* aconteceu mas nunca diz *quem* deveria ter agido quando algo deu errado — trilha sem dono é trilha que ninguém lê a tempo. Sem versão, um Agente cuja lógica evolui perde a capacidade de explicar uma decisão passada com a regra exata que a gerou — auditoria vira arqueologia. Os dois são baratos de exigir agora e caros de reconstruir depois que existirem dezenas de decisões já tomadas sem eles.

**Ferramentas vs. Permissões**: são conceitos distintos e não intercambiáveis. Ferramenta é capacidade técnica (o Agente sabe *como* chamar `enviar_email()`); Permissão é autorização (o Agente pode chamar `enviar_email()` *agora*, *para este destinatário*, *neste contexto*). Um Agente pode ter a ferramenta e não ter a permissão — é o padrão esperado, não a exceção (seção 7).

---

## 5. Hierarquia

🔶 **Correção**: a proposta original (Supervisor → Coordenador → Especialista → Executor, quatro níveis fixos) desenha uma estrutura organizacional completa antes de existir um único Agente real. É o mesmo erro que a plataforma já rejeitou em outras circunstâncias — motor de workflow genérico (DEC-010), Action Registry genérico (DEC-021), tabela polimórfica de Entidade (DEC-011), e mais recentemente a hierarquia de IA centralizada (DEC-028): desenhar a forma antes do primeiro caso de uso real tende a errar a forma, e um organograma de quatro camadas para uma empresa que ainda não tem nenhum Agente em produção é montar o quadro de funcionários antes de contratar o primeiro.

**Versão corrigida — hierarquia ganha-se, não se desenha antecipadamente:**

- **Todo Agente tem exatamente um nível hierárquico até prova de necessidade de mais: Especialista.** Um Especialista responde diretamente ao seu Responsável humano (seção 4) — não a outro Agente.
- **Quem decide**: o Responsável humano de cada Agente, sempre, até `AI_PLATFORM.md` Nível 4 comprovar confiabilidade suficiente para reduzir a aprovação caso a caso (`AI_PLATFORM.md`, seção 4, Nível 4).
- **Quem coordena**: ninguém, por padrão. Coordenação entre Agentes só nasce quando **dois** Especialistas atuam sobre o mesmo domínio/entidade e produzem risco real de decisão conflitante — o gatilho concreto é dois, não três, porque o risco de conflito já existe com dois agentes tocando o mesmo dado (diferente da "regra dos 3" de `DECISION_LOG.md` DEC-010, que é sobre repetição de padrão, não sobre conflito de execução). Só nesse momento nasce um papel de Coordenador — humano por padrão; um Coordenador-agente segue o mesmo caminho de nascimento de qualquer outro Agente (seção 2), não é assumido de graça.
- **Quem apenas executa**: todo Especialista, sempre — nenhum Agente decide fora do que sua Inteligência de origem já decidiu (seção 1).
- **Quem pode conversar com quem**: nenhum Agente fala diretamente com outro Agente (ver seção 6) — toda coordenação passa por dado estruturado (Eventos) ou pelo Responsável humano/Coordenador, nunca por chamada direta agente-para-agente.
- **Quem nunca conversa diretamente**: dois Especialistas entre si, sempre. Essa restrição não é uma limitação técnica temporária — é a decisão que elimina, por construção, a maior parte dos riscos listados na seção 6 (loop, corrida, mensagem infinita).

"Supervisor" como papel de topo permanece — mas é sempre o Responsável humano de cada Agente, não uma camada de Agente supervisor, até que `AI_PLATFORM.md` Nível 5 (Operação Autônoma) esteja, de fato, comprovado.

---

## 6. Comunicação

Agentes **não conversam diretamente entre si**. Esta é a decisão central desta seção, e ela resolve a maior parte dos riscos listados pelo Carlos de uma vez só — não por regra de etiqueta entre agentes, mas por remover a própria possibilidade de um protocolo de chat peer-to-peer, que é a origem raiz de loop, corrida e mensagem infinita em qualquer sistema multiagente.

**O modelo:**

- Toda "comunicação" entre Agentes acontece através do mecanismo de Eventos já existente (`CORE_CONCEPTS.md`, seção 5; outbox via trigger Postgres + Database Webhooks, `ARQUITETURA.md`, seção 1.13) — um Agente emite um evento, outro Agente (ou automação) pode reagir a esse evento de forma assíncrona. Não existe ciclo de pergunta-resposta entre dois Agentes, só publicação e reação — por isso não existe loop de conversa para começar.
- **Duplicidade de tarefa**: antes de agir, um Agente reivindica a tarefa (mecanismo de claim/lock, padrão já usado em qualquer fila de processamento — não é uma invenção nova, é o mesmo cuidado que qualquer `UPDATE ... WHERE status = 'pendente'` atômico já garante). Dois Agentes nunca competem pela mesma tarefa porque só um consegue reivindicá-la.
- **Corrida de execução sobre o mesmo dado**: mesma disciplina que qualquer escrita concorrente no sistema já exige — verificação de versão/`atualizado_em` antes de gravar (optimistic locking). Não é uma regra nova para Agentes, é a regra que já vale para qualquer escrita concorrente na plataforma, aplicada também a Agentes.
- **Decisões conflitantes**: como não existe negociação direta entre Agentes, uma recomendação conflitante nunca vira uma "discussão" entre eles — é resolvida pelo Responsável humano ou por uma Policy de alçada (`CORE_CONCEPTS.md`, seção 3, mesmo padrão de `podeAprovarCompra`/`podeAprovarDespesa`), nunca por um novo mecanismo de arbitragem entre agentes.
- **Mensagens infinitas**: eliminadas por design — sem protocolo bidirecional, um evento é consumido uma única vez (registro de processamento já feito, mesmo padrão de idempotência do outbox), nunca reprocessado em loop.

---

## 7. Permissões

Modelo **default-deny**: todo Agente nasce sem nenhuma permissão. Cada permissão é concedida de forma explícita, por tipo de ação, nunca herdada em bloco de um "papel" genérico.

**Teto de permissão**: nenhum Agente pode ter permissão mais ampla do que o Responsável humano que o supervisiona teria, no mesmo papel (`role`), fazendo a mesma ação manualmente. Isso amarra a permissão do Agente ao RBAC humano da plataforma — e é por isso que fechar o gap de autorização por role registrado em `DECISION_LOG.md` DEC-026 é pré-requisito para qualquer Agente real: um teto amarrado a um RBAC que hoje não é aplicado de fato é um teto que não existe.

**Categorias de ação, da mais para a menos permitida por padrão:**

1. **Leitura** — consultar dado dentro do escopo. Padrão mais próximo de "seguro por padrão".
2. **Análise/recomendação** — produzir Insight/Alerta/recomendação sem alterar nada (isto já é IA, não Agente — ver seção 1).
3. **Escrita reversível dentro do escopo** — ex.: atualizar um campo não-crítico, criar um registro de rascunho.
4. **Execução de ação de negócio delimitada** — ex.: disparar uma automação de cobrança já existente, dentro de parâmetro pré-aprovado.
5. **Ação financeira** — aprovar pagamento, alterar valor, disparar cobrança fora do parâmetro padrão. **Nunca autônoma** — todo Agente que toca dinheiro exige aprovação humana explícita, caso a caso, até `AI_PLATFORM.md` Nível 4 comprovar confiabilidade suficiente para uma classe de ação financeira específica e de baixo risco (nunca para todas de uma vez).
6. **Ação destrutiva/irreversível** (excluir registro, revogar acesso, apagar arquivo) — **nunca concedida a nenhum Agente**, sem prazo de revisão previsto neste documento. Se uma exclusão for necessária, o Agente sinaliza e um humano confirma — mesmo padrão que a própria plataforma já usa hoje com humanos (`ConfirmDialog` com `destructive`, `DECISION_LOG.md` DEC-021).
7. **Criação de usuário/concessão de acesso** — nunca concedida a nenhum Agente, pelo mesmo motivo da categoria 6: é uma ação que expande a superfície de permissão do próprio sistema, e delegar isso a um Agente cria um caminho de escalonamento de privilégio que nenhuma auditoria detecta a tempo.

**Envio de comunicação externa** (e-mail, mensagem a cliente): tratado como categoria 4 (execução delimitada) — só dentro de template/parâmetro pré-aprovado, nunca texto livre gerado e enviado sem revisão, até existir histórico real que justifique afrouxar essa regra.

---

## 8. Memória

- **Memória de execução (curto prazo)**: contexto da tarefa atual — entradas, estado intermediário. Vive só durante a execução, é descartada ao fim. Nunca é a fonte de verdade de nada; se um dado dela precisa sobreviver, ele precisa ser gravado explicitamente como memória de longo prazo ou como dado de negócio normal (nas tabelas do módulo correspondente).
- **Memória de longo prazo (conhecimento permanente)**: só o que for genuinamente reutilizável entre execuções — padrão aprendido, não dado bruto de uma execução específica. Grava em tabela própria de memória de Agente, com o mesmo tratamento de auditoria de qualquer outra tabela sensível (`CORE_CONCEPTS.md`, seção 6, item 1). Reaproveita a infraestrutura de capacidades já existente (`arquivos`/`comentários`/`timeline_eventos`, `CORE_CONCEPTS.md`, seção 1) sempre que o formato genérico já servir — uma tabela nova e específica de memória de Agente só se justifica se o formato genérico realmente não bastar, mesmo critério já usado para toda capacidade da plataforma.
- **O que nunca deve ser armazenado**: qualquer credencial, senha, token ou chave de API em memória de Agente, sob nenhuma circunstância. Dado pessoal sensível além do estritamente necessário à tarefa. Qualquer inferência não verificável apresentada como fato — reforça o princípio já registrado em `AI_PLATFORM.md`, seção 8 ("IA nunca inventa dados").
- Toda memória de longo prazo é auditável e revisável por um humano — nunca uma "caixa preta" de aprendizado invisível que ninguém consegue inspecionar depois.

---

## 9. Auditoria

A maior parte do que o Carlos pediu já está coberta pela forma de Evento existente (`CORE_CONCEPTS.md`, seção 5) e por `audit_log` (`ARQUITETURA.md`, seção 1.8) — esta seção não inventa um segundo sistema de auditoria, mapeia o que já existe contra o que é específico de Agente:

| Requisito | Onde já vive | O que falta |
|---|---|---|
| Quem iniciou | `usuario_id` do Evento (`null` se automação/sistema) | Precisa de um `agente_id` quando a origem for um Agente — campo novo, a desenhar na implementação real, não agora. |
| Quando | `criado_em` | Já coberto. |
| Quanto tempo levou | — | Campo novo (`duracao_ms`), a desenhar na implementação. |
| Qual IA participou / qual contexto recebeu / qual decisão tomou / qual ferramenta utilizou / motivo da decisão | `payload` (jsonb) | Já existe o campo certo (`payload`); falta definir, na implementação real, um sub-formato obrigatório para eventos originados por Agente, garantindo que nenhum desses itens fique de fora. |
| Quais arquivos alterou | Capability `arquivos` + `timeline_eventos` | Já coberto por reuso — nenhuma estrutura nova necessária. |
| Quais registros modificou | `audit_log` (`dados_antigos`/`dados_novos`) | Já coberto por reuso — nenhuma estrutura nova necessária. |
| Qual resultado produziu | `payload` | Já existe o campo certo. |

Princípio permanente: **nenhuma ação de Agente é aceitável sem essa trilha completa.** Se um Agente não consegue produzir todos os itens acima para uma ação específica, essa ação não deveria ter sido autorizada para esse Agente (seção 7).

---

## 10. Ciclo de vida

🔶 **Correção**: a proposta original lista "Monitoramento" como um estado sequencial entre "Produção" e "Pausado". Isso quebra a própria convenção de State Machine já estabelecida em `CORE_CONCEPTS.md`, seção 2 (estados fechados e mutuamente exclusivos) — monitoramento não é um lugar que o Agente visita depois de estar em produção, é uma condição permanente de estar em produção. Um Agente em Produção que não está sendo monitorado não é um Agente em Produção correto, é um Agente em Produção com uma falha de processo. Corrigido abaixo: monitoramento vira uma propriedade contínua de Homologação e Produção, não um estado à parte.

```
criado → homologação → produção ⇄ pausado
                          │
                          ↓
                      bloqueado ──→ (volta para homologação — nunca direto para produção)
                          
produção → aposentado → removido
```

- **Criado**: registrado com a estrutura obrigatória completa (seção 4). Ainda não executa nada real.
- **Homologação**: executa em ambiente controlado/escopo reduzido, sob monitoramento ativo constante, sem ainda ter todas as permissões de Produção liberadas. Critério de saída: os Critérios de sucesso (seção 4) atendidos de forma consistente, não uma única vez.
- **Produção**: executa de verdade, dentro do escopo e permissão autorizados, sob monitoramento ativo constante (não uma fase separada — uma condição permanente deste estado).
- **Pausado**: interrupção reversível e temporária, iniciada por decisão operacional normal (dependência fora do ar, revisão pontual). Volta para Produção sem precisar de nova Homologação.
- **Bloqueado**: interrupção disparada por violação de limite, falha de auditoria ou incidente de segurança — nunca uma decisão operacional de rotina. **Sempre volta para Homologação, nunca direto para Produção** — um Agente que foi bloqueado precisa provar de novo que atende aos Critérios de sucesso antes de voltar a agir.
- **Aposentado**: não é mais usado ativamente, mas configuração, versão e histórico de auditoria permanecem preservados — pode, em teoria, ser reativado (volta para Homologação, nunca direto para Produção).
- **Removido**: 🔶 **correção** — "removido" nunca significa apagar o histórico de ações auditadas (seção 9). A plataforma já trata isso como princípio geral (nenhuma exclusão permanente de `audit_log`); "Removido" aqui significa que a configuração/lógica do Agente deixa de existir e ele não pode mais ser reativado — o rastro do que ele fez enquanto existiu nunca é apagado. Estado terminal.

---

## 11. Categorias

Vocabulário compartilhado para quando agentes reais começarem a existir — **isto não é um compromisso de construir nenhuma delas**, é a lista de categorias que qualquer Agente futuro deve se encaixar para efeito de organização, permissão-padrão e prestação de contas:

Operacional · Financeiro · Comercial · Marketing · Suporte · Jurídico · BI · Compliance · Documentação · Comunicação · Relacionamento · Tecnologia · Produto · Gestão.

Lista aberta — uma categoria nova só se justifica quando o primeiro Agente real dessa natureza estiver prestes a nascer (seção 2), nunca antecipadamente.

Categorias específicas de frota (Battery Guardian, Asset Guardian, Maintenance Guardian, entre outras) — refinamentos de "Operacional"/"Financeiro" aplicados especificamente a veículos — estão em `SMART_FLEET_PLATFORM.md`, seção 8.

---

## 12. Como entram no roadmap

```
ERP → BI → IA → Agentes → Operação Autônoma
```

Corresponde exatamente aos níveis de maturidade já oficializados em `AI_PLATFORM.md`, seção 4 — este documento não redefine o roadmap, só localiza onde o Agente entra nele:

- **ERP** = Nível 0 (`AI_PLATFORM.md`) — nenhum Agente possível ainda, dado ainda não existe.
- **BI** = Nível 2 — nenhum Agente ainda; é onde o volume de dado histórico começa a existir para uma IA real (Nível 3) ter o que analisar depois.
- **IA** = Nível 3 (Assistentes de IA) — pré-requisito direto de qualquer Agente (seção 2 deste documento). Nenhum Agente nasce antes de uma IA real e comprovada existir no domínio específico.
- **Agentes** = Nível 4 (Agentes Especialistas) — o próprio assunto deste documento entra em vigor de fato aqui.
- **Operação Autônoma** = Nível 5 — condicional a múltiplos Agentes Especialistas reais e maduros, com hierarquia (seção 5) só então eventualmente crescendo além de "Especialista" caso a evidência real justifique.

---

## 13. Princípios obrigatórios

Todo Agente deve:

1. Ter responsabilidade única.
2. Ter escopo pequeno.
3. Ser auditável (seção 9).
4. Ter baixo acoplamento — não depender de outro Agente para decidir (seção 5/6).
5. Falhar com segurança — um erro de execução nunca deve deixar dado em estado inconsistente; falhar e não fazer nada é sempre preferível a falhar e fazer a coisa errada.
6. Pedir ajuda quando necessário: ao encontrar uma situação fora do seu Escopo ou dos seus Critérios de sucesso (seção 4), devolve a decisão para o Responsável humano em vez de tentar resolver fora do que foi autorizado — mecanismo concreto de "segurança sempre prevalece sobre autonomia" (`AI_PLATFORM.md`, princípio 7).
7. Não duplicar trabalho (seção 6 — claim/lock).
8. Não agir fora das permissões concedidas (seção 7).
9. Não tomar decisão financeira sem autorização explícita (seção 7, categoria 5).
10. Obedecer ao Princípio 5 de `FOUNDATION_PRINCIPLES.md` ("IA nunca executa") — a IA por trás do Agente decide, o Agente executa; nunca se confundem.

🔶 **Correção**: a lista original incluía **"ser reutilizável"** como princípio obrigatório de todo Agente. Isso contradiz uma decisão já estabelecida da própria plataforma: `FOUNDATION_PRINCIPLES.md`, Princípio 7, e `DECISION_LOG.md` DEC-013 rejeitam explicitamente desenhar qualquer coisa pensando em reuso antecipado — "reuso é extraído quando um segundo consumidor real aparece, não adivinhado". Exigir que todo Agente já nasça "reutilizável" é pedir para adivinhar a forma certa antes de existir um segundo caso real — exatamente o erro que essa decisão já existe para evitar. **Removido como obrigação.** Responsabilidade única e escopo pequeno (princípios 1 e 2) já são o que torna reuso possível *quando* fizer sentido — reuso em si não é objetivo de design de nenhum Agente individual.

---

## 14. Relação com os demais documentos

- `OPERATING_MODEL.md` — define a escada processo→automação→IA→agente→funcionário e os critérios de transição entre eles. Este documento assume essa escada como dada e detalha só o degrau Agente.
- `AI_PLATFORM.md` — define a filosofia de IA, os 6 níveis de maturidade (Nível 0–5) e os princípios obrigatórios de IA. Este documento é o complemento direto: onde `AI_PLATFORM.md` para em "Agente executa dentro de escopo autorizado" (seção 3 daquele documento), este começa.
- `FOUNDATION_PRINCIPLES.md` — Princípio 5 ("IA nunca executa") é o princípio de fronteira que todo Agente obedece (seção 13, item 10). Princípio 7 (reuso extraído, não adivinhado) e Princípio 8 (longevidade vem de simplicidade, não de abstração antecipada) fundamentam as correções das seções 5 e 13 deste documento.
- `CORE_CONCEPTS.md` — a forma de Evento (seção 5) é o mecanismo de comunicação entre Agentes (seção 6 deste documento); Policies (seção 3) é o mecanismo de resolução de decisão conflitante (seção 6); State Machines (seção 2) é a convenção que rege o ciclo de vida do Agente (seção 10).
- `DECISION_LOG.md` — DEC-010/011/021/028 são o precedente direto da correção da seção 5 (hierarquia não desenhada antecipadamente); DEC-013 é o precedente direto da correção da seção 13 (reuso não obrigatório); DEC-026 é pré-requisito de segurança para o modelo de permissões da seção 7.
- `ARQUITETURA.md` — `audit_log` e o mecanismo de outbox (seção 1.8/1.13) são a infraestrutura real que sustenta a auditoria (seção 9) e a comunicação por eventos (seção 6) deste documento, quando a implementação começar.
