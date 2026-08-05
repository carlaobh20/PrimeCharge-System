# PrimeCharge Platform — Core Concepts
### Conceitos técnicos fundamentais — complementar a ARQUITETURA.md e FOUNDATION_PRINCIPLES.md

Correções em relação à proposta original de Carlos marcadas com 🔶, com o motivo. Documentação pura — nenhum código ou schema foi alterado neste documento.

**Nota de escopo**: este é proposto como o último documento de fundação antes da Fase 1 começar de fato. A partir daqui, o próximo passo é código (módulo de Frota), não mais um `.md` de plataforma, salvo necessidade concreta.

## Como este documento se relaciona com os outros

- `ARQUITETURA.md` — visão geral de sistema, modelagem de domínio, telas, roadmap.
- `FOUNDATION_PRINCIPLES.md` — princípios que toda decisão futura deve respeitar.
- `CORE_CONCEPTS.md` (este) — a forma técnica concreta desses princípios. Onde o conteúdo já existe nos outros dois, este documento referencia em vez de repetir.

---

## 1. Capabilities

Capacidades transversais, reutilizáveis por qualquer entidade. Cada uma com responsabilidade única:

| Capability | Responsabilidade | Status |
|---|---|---|
| Timeline | Histórico cronológico do que aconteceu com a entidade | Adotada — Fase 1 |
| Arquivos | Documentos/fotos/comprovantes anexados | Adotada — Fase 1 |
| Comentários | Anotação humana livre sobre a entidade | Adotada — Fase 1 |
| Tags | Classificação livre, não estruturada | Adotada — Fase 1 |
| Favoritos | Atalho pessoal do usuário para a entidade | Adotada — Fase 1 |
| Checklist | Lista de verificação estruturada (template + itens + respostas) | Adotada — Fase 1/2 (vistoria de veículo já é necessidade real) |
| Eventos | Registro padronizado de toda ação relevante (ver seção 5) | Padrão definido agora, mecanismo implementado na Fase 3 |
| Workflow | Processo com múltiplas etapas automatizadas | Extraído pela regra dos 3 (ver `FOUNDATION_PRINCIPLES.md`, Princípio 6) — não construído agora |
| Automações | Ação disparada por evento/tempo | Mapeada para `pg_cron` + Edge Functions + Database Webhooks do próprio Supabase — Fase 8 |
| Indicadores | Métrica calculada sobre a entidade | Adiada até existir o primeiro caso de uso de BI real |
| IA | Análise/previsão/recomendação (nunca execução) | Adiada até existir o primeiro caso de uso de IA real |
| Relacionamentos | Vínculo entre entidades além de FK simples | Adiada — FKs já cobrem os relacionamentos documentados na Etapa 2.3 de `ARQUITETURA.md`; revisitar só se surgir um caso que FK não resolve |
| Compartilhamento | Compartilhar entidade com terceiro externo | Adiada — nenhuma fase do roadmap tem essa necessidade hoje |

🔶 **Correção**: "Aprovação" não entra como capacidade própria. Aprovação é o resultado de uma transição de **State Machine** (seção 2) passar por uma checagem de **Policy** (seção 3) — não é um mecanismo genérico à parte, é a composição dos outros dois.

Implementação técnica das capacidades adotadas: tabelas genéricas (`arquivos`, `comentarios`, `tags`, `timeline_eventos`, `favoritos`, `checklists`/`checklist_itens`) referenciando qualquer entidade via `(entidade_tipo, entidade_id, empresa_id)` — nunca uma tabela polimórfica única de "Entidade" (ver `FOUNDATION_PRINCIPLES.md`, Princípio 1).

---

## 2. State Machines

Toda entidade com ciclo de vida relevante tem um campo `status` com valores fechados (não texto livre) e transições explícitas — nunca "qualquer status pode virar qualquer status".

**Boas práticas de modelagem:**
- `status` é sempre um enum Postgres (`create type ..._status as enum (...)`), nunca `text` livre.
- Transições válidas são explícitas — via tabela de transições permitidas ou função que valida antes do `UPDATE`. Transição inválida é rejeitada no banco, não só escondida na UI.
- Toda transição de status relevante gera um Evento (seção 5) e um registro de Timeline.
- Transição que exige autorização especial passa por uma Policy (seção 3) antes de ser aplicada.

**Veículo — único ciclo de vida especificado agora** (é o que a Fase 1 precisa de verdade):

```
novo → comprado → preparacao → disponivel → reservado → alugado → devolvido
                                    ↑                         │
                                    └─────── manutencao ←──────┘
                                    │
                              disponivel → venda → encerrado
```

Regras: `alugado` só é alcançável a partir de `reservado` ou `disponivel` (nunca direto de `manutencao`). `venda` e `encerrado` são estados terminais — nenhuma transição sai deles.

**Demais entidades com ciclo de vida** (Contrato, Compra, Documento, Solicitação, Sinistro, Manutenção, Funcionário): seguem o mesmo padrão acima — enum fechado, transições explícitas, evento por transição. O ciclo de vida específico de cada uma é desenhado quando a fase que a introduz chegar (Contrato na Fase 2, Compra/Manutenção na Fase 1/4, Sinistro na Fase 4...), não antes — especificar as oito agora seria o mesmo excesso de planejamento que este documento está tentando conter.

---

## 3. Policies

Regra de autorização de **ação/transição**, separada da regra de negócio e independente de tela. Complementar ao RLS, não redundante:

- **RLS** responde "este usuário pode *ver/tocar* esta linha?" — sempre ativo, aplicado no banco, baseado em `empresa_id` e `role`.
- **Policy** responde "este usuário pode executar *esta ação específica* agora?" — geralmente depende de mais contexto do que RLS consegue expressar sozinho (valor da operação, estado atual da entidade, alçada do cargo).

Padrão: cada Policy é uma função pura `pode(usuario, acao, contexto) → boolean`, colocada perto da entidade que ela protege (`features/<entidade>/policies/`), chamada antes de qualquer transição de State Machine ou ação sensível.

Exemplos concretos do pedido original:
- "Quem pode aprovar uma compra?" → `podeAprovarCompra(usuario, compra)` — checa role + valor da compra vs. alçada do usuário.
- "Quem pode cancelar um contrato?" → `podeCancelarContrato(usuario, contrato)` — checa role + se o contrato está em estado que permite cancelamento.
- "Quem pode vender um veículo?" → `podeVenderVeiculo(usuario, veiculo)` — checa role + se o veículo está em estado `disponivel`.
- "Quem pode excluir um documento?" → `podeExcluirDocumento(usuario, documento)`.
- "Quem pode aprovar uma despesa?" → `podeAprovarDespesa(usuario, despesa)` — mesma lógica de alçada por valor.

Implementadas como funções Postgres (reaproveitáveis por RLS quando fizer sentido) e espelhadas em TypeScript no client só para UI condicional (esconder/desabilitar botão) — a decisão de verdade é sempre no banco.

---

## 4. Entidades

**O que caracteriza uma entidade**: tem identidade própria (não é só um atributo de outra coisa), tem ciclo de vida ou histórico relevante, e é referenciada por mais de um módulo. Se não atende isso, é campo — não entidade.

**Capacidades mínimas de toda entidade**: `id` (uuid), `empresa_id`, `criado_em`/`atualizado_em`, e RLS habilitado desde a criação da tabela. As Capabilities da seção 1 (arquivo, comentário, tag, timeline, favorito) se aplicam por composição — a entidade não precisa de nenhum campo extra para ganhá-las, só existir no `entidade_tipo`.

**Quando criar uma entidade nova vs. reutilizar um comportamento existente**:
- Cria-se entidade nova quando o conceito tem identidade e ciclo de vida próprios (ex.: `Sinistro` é entidade — acontece, tem status, gera custo, referencia `Veiculo` e `Contrato`).
- Reutiliza-se comportamento existente quando o conceito é só uma variação de algo que já existe (ex.: não se cria `SinistroGrave` como entidade separada — é um `Sinistro` com um campo `gravidade`).
- Na dúvida, a pergunta é: "isso precisa aparecer sozinho numa lista, ter dono e ter status?" Se sim, é entidade.

---

## 5. Eventos

Padrão único de shape para todo evento gerado pela plataforma (mecanismo de outbox já definido em `ARQUITETURA.md`, seção 1.13 — esta seção define a forma do evento, não o transporte):

| Campo | Descrição |
|---|---|
| `origem` | Módulo/feature que gerou o evento (ex.: `contratos`) |
| `tipo` | Nome do evento (ex.: `contrato.criado`, `veiculo.status_alterado`) |
| `entidade_tipo` / `entidade_id` | A que entidade o evento pertence |
| `usuario_id` | Quem disparou (nulo se foi automação/sistema) |
| `criado_em` | Timestamp |
| `payload` | `jsonb` — dados específicos do evento |
| `prioridade` | `baixa` / `normal` / `alta` / `critica` — usada para roteamento de notificação |
| `destino` | Quais consumidores devem reagir (`timeline`, `auditoria`, `indicadores`, `command_center`, `bi`, `automacao`, `notificacoes`) — pode ser mais de um |

Implementação real (tabela `eventos`, triggers que a populam, Database Webhooks que a consomem): construída na Fase 3, quando existir o primeiro efeito cross-domain real. Até lá, `audit_log` (já existente desde a Fase 0) cobre o caso de auditoria.

---

## 6. Padrões obrigatórios para todo novo módulo

Checklist a seguir sempre que um módulo novo (Frota, Comercial, Financeiro...) começar a ser construído:

1. Tabela(s) com `empresa_id`, RLS habilitado e policy de `select` no mesmo commit que cria a tabela — nunca depois.
2. `status` como enum + transições explícitas, se a entidade tiver ciclo de vida (seção 2).
3. Policies de ação escritas antes da tela que dispara a ação, não depois (seção 3).
4. Capacidades transversais (arquivo/comentário/tag/timeline) conectadas via `entidade_tipo`, sem reinventar tabela própria para isso.
5. Toda transição de status relevante registrada como Evento (seção 5), mesmo que o consumidor real só passe a existir depois.
6. Estrutura de pastas feature-based (`features/<modulo>/{api,components,hooks,schemas,types,pages}`), conforme `ARQUITETURA.md` seção 1.2.
7. Nenhuma chamada direta a `supabase.from(...)` fora da camada `api/` da feature.
