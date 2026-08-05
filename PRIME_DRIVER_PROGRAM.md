# PrimeCharge — Prime Driver Program
### Programa oficial de fidelidade — como a PrimeCharge reconhece e recompensa o motorista que fica

Revisado criticamente por Claude antes de publicar, no mesmo padrão de `FOUNDATION_PRINCIPLES.md`. Pontos corrigidos em relação à instrução original do Carlos estão marcados com 🔶, com o motivo — nada foi alterado silenciosamente. Mesmo peso dos demais documentos de fundação: referência obrigatória, não sugestão.

Este documento não redefine a jornada do motorista nem sua State Machine (`DRIVER_LIFECYCLE.md`), não redefine Driver Intelligence/Health Score (`DECISION_LOG.md` DEC-025), não redefine a jornada do veículo (`VEHICLE_LIFECYCLE.md`), não redefine os níveis de maturidade de IA (`AI_PLATFORM.md`) nem a constituição do Agente (`AGENT_PLATFORM.md`). Onde um assunto já está definido em outro documento, este referencia — nunca repete. O que este documento define, e que não existia em nenhum outro lugar: o Driver Score como métrica de fidelidade (distinta do Health Score), os níveis do programa e seus critérios, e as três elegibilidades pedidas (renovação, upgrade, compra do veículo).

Criado em 2026-08-05, a pedido do Carlos, pausando a Sprint 8 (Financeiro) para consolidar regras de negócio de fundação antes de continuar. Documentação pura — nenhum código, migration, tela ou componente foi alterado junto com este documento.

## Objetivo

A pesquisa de mercado já confirmou um espaço vazio real: nenhum concorrente pesquisado implementa "gamificação/pontuação do locatário responsável" de forma ativa e mensurável (`claude/pesquisa-mercado-rental-ev-2026.md`, achado 6). O Prime Driver Program é a resposta estrutural a esse espaço — mas este documento existe também para impor disciplina sobre o que o programa **é**: uma camada de reconhecimento sobre dado que a plataforma já produz (Health Score, tempo de relacionamento, histórico de contrato), não uma segunda fonte de verdade paralela sobre o motorista.

---

## 1. O que este programa é, e o que não é

🔶 **Correção de escopo, antes de qualquer regra**: nada neste documento constrói um motor de fidelidade genérico agora. A "regra dos 3" (`FOUNDATION_PRINCIPLES.md`, Princípio 6; `DECISION_LOG.md` DEC-010) já rejeitou generalização antes de existir repetição real — e hoje existem zero motoristas com histórico suficiente para calibrar limiar nenhum (Sprint 8/Financeiro, pré-requisito de vários sinais abaixo, ainda nem começou). Este documento define o **vocabulário e as regras de negócio** do programa — o que qualifica, o que não qualifica, o que cada nível significa — para que, quando a implementação acontecer, ela não precise inventar essas regras no meio do código. Não constrói tela, não constrói cálculo, não implementa nada. Os números de limiar usados nas seções 5-7 são ponto de partida documentado, não calibração final — precisam ser revisitados com dado real assim que houver massa suficiente de motoristas em cada nível para saber se o critério é realista.

---

## 2. Driver Score não é o Health Score — e por que os dois podem coexistir sem violar DEC-025

🔶 **Correção de premissa**: tratar "Driver Score" como se fosse obviamente uma coisa nova, sem checar contra o que já existe, seria repetir o erro que `SMART_FLEET_PLATFORM.md`, seção 6, já corrigiu para telemetria — inflar uma taxonomia fechada com uma categoria que na verdade é outra fonte de dado para algo que já existe. Por isso, antes de definir Driver Score, é preciso responder: é o mesmo número que o Health Score do Motorista (DEC-022/DEC-025), com outro nome?

**Resposta: não — e a diferença não é cosmética, é de propósito.** Health Score responde "quão saudável/de baixo risco é esta relação, para a empresa decidir o que fazer"; é uma ferramenta de gestão de risco, consumida principalmente pelo Command Center. Driver Score responde uma pergunta diferente: "quanto este motorista já conquistou de reconhecimento, pela PrimeCharge, por ficar e se comportar bem"; é uma ferramenta de retenção, pensada para ser mostrada **ao próprio motorista** (quando existir portal do motorista, `ARQUITETURA.md` Fase 8 — hoje não existe, então o programa por enquanto só afeta decisão interna, seção 4). Um score de risco pode cair rápido (uma CNH vencida derruba o Health Score documental hoje mesmo); um score de fidelidade não deveria cair pelo mesmo motivo instantâneo — perder fidelidade acumulada por um documento vencido temporariamente seria um design ruim de programa de retenção, mesmo que seja um sinal de risco real para a empresa.

**Como os dois convivem sem duplicar dado (mesmo espírito de DEC-025 — reuso, não taxonomia paralela)**: Driver Score **não** é uma sexta categoria de `HealthCategoriaId`, não é armazenado como Health Score, e não substitui nenhuma das 5 categorias existentes. É uma métrica derivada, calculada a partir de um subconjunto dos mesmos sinais que já alimentam Health Score (`operacional`, `documental`) mais sinais que Health Score deliberadamente não cobre porque não são sobre risco (tempo de relacionamento, indicações — seção 3). Nenhuma captura de dado nova duplicada; o que muda é a fórmula que lê o mesmo dado com outro objetivo.

**E a diferença para o "score de risco do motorista" já citado em `AI_PLATFORM.md` (candidato de Nível 3, ligado a `VALUE_ENGINE.md` estágio 4)?** Também distinto, e pelo mesmo motivo: aquele é preditivo (usa padrão histórico para prever inadimplência/risco futuro, exige modelo estatístico real — Nível 3, ainda não construído); Driver Score é sempre baseado em regra determinística sobre dado já ocorrido (Nível 1, "ERP Inteligente" — nunca precisa de modelo estatístico para existir). Os dois podem, no futuro, compartilhar sinais de entrada — mas nunca devem ser apresentados como o mesmo número, nem confundidos num mesmo painel sem identificação clara de qual é qual. Ver DEC-042.

---

## 3. Sinais que compõem o Driver Score

Honestidade de dado (DEC-022, `AI_PLATFORM.md` seção 8) aplicada aqui sem exceção: um sinal sem dado real por trás retorna `null`, nunca um valor neutro inventado para "não deixar vazio".

| Sinal | Fonte | Status hoje |
|---|---|---|
| Tempo de relacionamento (dias como motorista ativo) | `motoristas.criado_em` + histórico de `status` | Real hoje — já é KPI ("Dias como cliente", Sprint 6) |
| Documentação em dia | Health Score, categoria `documental` (DEC-025) | Real hoje |
| Comportamento operacional (status, inatividade) | Health Score, categoria `operacional` (DEC-025) | Real hoje |
| Contratos cumpridos sem cancelamento por violação | Histórico de `contratos` (DEC-034) | Dado existe (Timeline/histórico de Contrato); regra de leitura ainda não escrita — não implementado nesta consolidação |
| Pontualidade de pagamento | Financeiro (Sprint 8, ainda não iniciada) | Sem dado — `null` até Financeiro existir |
| Indicações trazidas (referral) | Não existe capability hoje | Não implementado — precisaria de uma estrutura nova (ex.: campo `indicado_por` em `motoristas`, ou entidade `Indicacao`); avaliar via `CORE_CONCEPTS.md` seção 4 ("precisa aparecer sozinho numa lista, ter dono e ter status?") quando o caso for real, não agora |
| Avaliação humana da locadora | Não existe campo hoje | Não implementado |

O `overall` do Driver Score, quando implementado, segue a mesma regra do `overall` de Health Score (DEC-022): média só dos sinais com dado real, sempre exibido junto de "quantos de N sinais foram avaliados" — nunca fechando a conta com um sinal inventado.

---

## 4. Níveis

🔶 A proposta original ("Bronze, Prata, Ouro, Black, ou outra melhor") pede explicitamente uma segunda opinião sobre o nome. Avaliação honesta: Bronze/Prata/Ouro é convenção genérica, mas reconhecida sem esforço por qualquer motorista brasileiro (mesma lógica de programas de milhagem, cartão de crédito, clube de assinatura); "Black" como topo também já é vocabulário estabelecido no mercado financeiro brasileiro (cartão Black é sinônimo de nível mais alto para o público-alvo deste programa — motorista de aplicativo, o mesmo perfil que já reconhece "cartão Black" como categoria superior). **Não estou propondo um nome alternativo** — a esquema já proposto é funcional e reconhecível, e gastar esforço de design em nomenclatura quando o critério de evolução (a parte que realmente importa) ainda não está calibrado com dado real seria priorizar a coisa errada. [Provável] O risco real deste esquema não é o nome, é o **top tier virar cosmético** se os critérios de Ouro/Black não estiverem amarrados a um benefício genuinamente diferenciado (seções 6-7) — mantenho os 4 nomes propostos, com essa ressalva registrada.

| Nível | Critério de entrada (provisório — seção 1) | Benefícios |
|---|---|---|
| **Bronze** | Todo motorista `ativo` (`DRIVER_LIFECYCLE.md`, seção 2) com documentação em dia | Nenhum benefício extra — nível base, igual ao que qualquer motorista `ativo` já tem hoje |
| **Prata** | Bronze + 6 meses contínuos como `ativo` + Health Score operacional/documental sem alerta crítico no período | Prioridade de atendimento (sem custo real de implementação — regra de fila/priorização) |
| **Ouro** | Prata + 12 meses contínuos + nenhum contrato encerrado por violação no histórico + (quando Financeiro existir) sem inadimplência registrada | Elegibilidade a upgrade de categoria de veículo (seção 6) |
| **Black** | Ouro + 24 meses contínuos + (quando Financeiro existir) histórico financeiro exemplar sustentado | Elegibilidade a compra do veículo (seção 7) |

---

## 5. Elegibilidade de renovação de contrato

🔶 **Correção de premissa**: o pedido lista "elegibilidade para renovação" como se fosse mais um degrau gated por nível do programa, junto com upgrade e compra. Não deveria ser. Renovação é **continuidade de uma relação que já está indo bem** — negar renovação a um motorista Bronze em dia (documentação válida, sem violação, sem inadimplência quando isso existir) só porque ele ainda não acumulou 6 meses de Prata seria punir um motorista bom por não ter fidelidade acumulada, o oposto do que um programa de retenção deveria fazer. Renovação é elegível para **qualquer motorista em `ativo` ou `inativo` sem bloqueio ativo**, independente do nível do programa — o programa (Prata/Ouro/Black) afeta o que a renovação **oferece** (condição, prioridade), nunca se ela é possível. Ver DEC-043.

---

## 6. Elegibilidade de upgrade

Categoria de veículo superior (ex.: hatch → SUV, `VeiculoCategoria`, `src/features/frota/types.ts`) mediante disponibilidade real da frota (`VEHICLE_LIFECYCLE.md`, seção 2 — o veículo alvo precisa estar `disponivel`). Critério de elegibilidade do motorista: nível **Ouro** ou superior (seção 4). A disponibilidade do lado do ativo não é controlada por este documento — é sempre subordinada ao estado real do veículo, nunca prometida ao motorista antes de confirmada.

## 7. Elegibilidade de compra do veículo

O ponto de maior consequência do programa — conecta diretamente `PRIME_DRIVER_PROGRAM.md` a `VEHICLE_LIFECYCLE.md`. Duas condições, ambas necessárias e nenhuma sozinha suficiente:

1. **Do lado do motorista** (este documento): nível **Black**, e tempo mínimo dirigindo o veículo específico que pretende comprar (proposta: 12 meses contínuos no mesmo veículo — não apenas 24 meses de programa em veículos diferentes).
2. **Do lado do ativo** (`VEHICLE_LIFECYCLE.md`): o veículo precisa estar num ponto do ciclo de vida em que vender faz sentido para a empresa — seja pela decisão de "Renovação de Frota" (`VEHICLE_LIFECYCLE.md`, seção 6.2) chegando naturalmente, seja por uma decisão comercial de antecipar a venda a este motorista específico por ser financeiramente vantajosa. Este documento não decide quando um veículo pode ser vendido — só decide quando um motorista pode ser o comprador, se e quando o veículo já puder ser vendido.

[Palpite] Vender o próprio veículo ao motorista que o dirigiu é uma hipótese de produto da PrimeCharge, não algo que a pesquisa de mercado validou diretamente — o benchmark mais próximo encontrado (Autonomy, EUA) é assinatura, não transferência de propriedade ao fim do contrato (`claude/analise-posicionamento-proposta-valor.md`). Vale registrar essa diferença de confiança: os demais benefícios deste programa (prioridade, upgrade) têm paralelo direto com o que já existe no mercado de locação; este é o mais especulativo dos três, e o de maior impacto financeiro se der errado — merece validação com motoristas reais antes de qualquer implementação, não só desenho em documento.

## 8. Indicação (referral) e a fase Pós-venda

Achado da pesquisa de mercado (`claude/pesquisa-mercado-rental-ev-2026.md`, item 6): nenhum concorrente implementa reconhecimento ativo do comportamento do motorista — espaço aberto. Este documento reserva o conceito (indicação soma sinal ao Driver Score, seção 3) sem implementar a estrutura de dado que ela exigiria (seção 3, linha "Indicações"). Importante: o benefício de indicação **não exige `status: ativo`** — um motorista que chegou à fase Pós-venda (`DRIVER_LIFECYCLE.md`, seção 3) de forma positiva continua podendo indicar e continuar valendo sinal para o Driver Score, mesmo fora da relação ativa. Isso é uma decisão deliberada: fidelidade que só conta enquanto o motorista está pagando não é fidelidade, é apenas volume de contrato.

## 9. Relação com IA, Smart Fleet e futuros Agentes

**IA**: Driver Score (seção 2) é sempre Nível 1 (regra determinística) nesta fase — nenhuma IA decide nível de programa. Quando um "score de risco preditivo" real existir (Nível 3, `AI_PLATFORM.md`), ele permanece um objeto distinto (seção 2), podendo no máximo **informar** um Insight/Alerta sobre o motorista (ex.: "risco de não renovar"), nunca alterar o Driver Score ou o nível do programa diretamente — IA nunca executa (`FOUNDATION_PRINCIPLES.md`, Princípio 5).

**Smart Fleet**: sinal de "Condução" (telemetria futura, `SMART_FLEET_PLATFORM.md` seção 6) é hoje mapeado para Health Score Operacional do Motorista, não para Driver Score diretamente — qualquer uso futuro de dado de condução (frenagem, velocidade) para afetar o Driver Score precisa obrigatoriamente respeitar o Princípio 11 daquele documento (privacidade por design em dado de condução, DEC-032) antes de existir, sem exceção.

**Agentes futuros**: nenhum Agente é criado por este documento. Um "Driver Guardian" (já listado como categoria aberta em `SMART_FLEET_PLATFORM.md`, seção 8, sob a categoria Operacional de `AGENT_PLATFORM.md` seção 11) poderia, no futuro, executar ações delimitadas do programa (ex.: disparar oferta de renovação pré-aprovada dentro de parâmetro, categoria 4 de permissão — `AGENT_PLATFORM.md`, seção 7) — mas nasce pelo caminho obrigatório (Problema → Processo → Automação → IA → Agente, `AGENT_PLATFORM.md` seção 2), não antes.

---

## 10. Relação com os documentos existentes

- `DRIVER_LIFECYCLE.md` — a fase "Relacionamento ativo" daquele documento é onde o Driver Score acumula (seção 3); este documento não redefine a jornada, só o que ela habilita.
- `DECISION_LOG.md` — DEC-022/DEC-025 fundamentam a distinção Driver Score × Health Score (seção 2); DEC-042/DEC-043 nascem deste documento.
- `VEHICLE_LIFECYCLE.md` — elegibilidade de compra (seção 7) depende diretamente da fase Venda daquele documento; nenhuma duplicação de regra de quando um veículo pode ser vendido.
- `AI_PLATFORM.md` — fundamenta a distinção entre Driver Score (Nível 1) e score de risco preditivo (Nível 3 candidato), seção 2 e 9.
- `AGENT_PLATFORM.md` — fundamenta os limites de um futuro Driver Guardian (seção 9).
- `SMART_FLEET_PLATFORM.md` — Princípio 11 (privacidade em dado de condução) é pré-requisito de qualquer uso futuro de telemetria no Driver Score (seção 9).
- `VALUE_ENGINE.md` / `NORTH_STAR.md` — retenção via fidelidade (este documento) é um dos mecanismos que sustenta "Taxa de renovação de contrato" e, por extensão, Taxa de utilização da frota.
