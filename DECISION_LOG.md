# PrimeCharge Platform — Decision Log

Histórico técnico oficial da plataforma. Toda decisão estrutural importante (arquitetura, modelagem, tecnologia, padrões, estratégia, performance, segurança) entra aqui, na ordem em que foi tomada. Objetivo: qualquer pessoa (ou sessão futura do Claude) entender *por que* o sistema é como é, sem precisar reconstruir o raciocínio do zero.

## Como usar

Nova decisão estrutural → novo `DEC-0XX`, seguindo o template abaixo, no final do arquivo (ordem cronológica). Não editar decisões antigas para "corrigi-las" — se uma decisão for revertida, criar uma nova entrada que referencia a antiga (`Substitui: DEC-00X`) e marcar a antiga como `Status: substituída`.

```
## DEC-0XX — <título curto>
**Data:** AAAA-MM-DD · **Status:** ativa | substituída | revisitar em <condição>
**Decisão:** o que foi decidido, em uma frase.
**Contexto:** o que estava em jogo quando a decisão foi tomada.
**Motivo:** por que essa opção e não outra.
**Alternativas consideradas:** o que foi descartado, e por quê.
**Riscos aceitos:** o que pode dar errado por causa dessa escolha.
**Revisitar quando:** condição concreta que deve disparar reavaliação.
```

---

## DEC-001 — Reescrita completa do zero

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Abandonar o sistema PrimeCharge anterior por completo — zero reuso de código, banco de dados ou arquitetura.
**Contexto:** Decisão de negócio do Carlos, tomada antes do envolvimento do Claude no projeto.
**Motivo:** Construir o software oficial da PrimeCharge sobre uma fundação nova, pensada para escala e qualidade de longo prazo.
**Alternativas consideradas:** Migração incremental do sistema anterior — rejeitada pelo Carlos antes de qualquer análise técnica.
**Riscos aceitos:** Reescritas completas historicamente estendem prazo em 2–3x e reintroduzem bugs já resolvidos no sistema antigo. Sistema antigo confirmado sem dados de produção reais, o que reduz o risco de migração a zero.
**Revisitar quando:** N/A — decisão de negócio já executada (repositório, Supabase e Vercel novos criados).

## DEC-002 — Stack: React + TypeScript + Vite (SPA), não Next.js

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Frontend como SPA pura (Vite), sem server-side rendering.
**Contexto:** Carlos especificou a stack (React, TS, Vite, Supabase, Tailwind, shadcn/ui, React Router, TanStack Query, RHF, Zod).
**Motivo:** Sistema logado, interno às empresas-cliente, sem necessidade de SEO/indexação. Next.js adicionaria complexidade (server components, cache de rota, runtime de servidor) sem benefício real.
**Alternativas consideradas:** Next.js — rejeitado por não haver necessidade de SSR/SEO para um app autenticado.
**Riscos aceitos:** Se no futuro existir necessidade de um site público de marketing/vendas do SaaS, esse deverá ser um projeto separado — não deve ser misturado com o app logado.
**Revisitar quando:** Surgir necessidade real de conteúdo público indexável pelo Google.

## DEC-003 — Multi-tenant via schema compartilhado + RLS

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Uma tabela por entidade, todas com `empresa_id`, isolamento via Row Level Security — não banco/schema por empresa-cliente.
**Contexto:** Definição da estratégia multi-tenant para suportar centenas de empresas no futuro.
**Motivo:** Recomendação oficial do Supabase para SaaS multi-tenant. Schema-per-tenant não escala operacionalmente (migration em N schemas, backup de N bancos cresce linear a cada cliente novo).
**Alternativas consideradas:** Schema/banco por empresa — rejeitado; só se justificaria com 2–3 clientes enterprise exigindo isolamento físico contratual, que não é o caso.
**Riscos aceitos:** Bug de RLS pode vazar dado entre empresas. Mitigado por: toda tabela nova nasce com RLS habilitado (nunca depois), policy no mesmo commit que cria a tabela.
**Revisitar quando:** Surgir cliente enterprise com exigência contratual de isolamento físico total.

## DEC-004 — Branch `main` direta, sem `dev`, na fase inicial

**Data:** 2026-08-05 · **Status:** revisitar em: app em produção com dados reais
**Decisão:** Trabalhar direto na branch `main` enquanto o repositório está vazio/sem uso real.
**Contexto:** Carlos pediu para não usar branch `dev` por enquanto.
**Motivo:** Repositório novo, sem risco no dia 1.
**Alternativas consideradas:** `dev` + PRs desde o início — adiado, não rejeitado.
**Riscos aceitos:** Com o app em produção, um commit quebrado na `main` derruba o sistema de empresas reais.
**Revisitar quando:** O app tiver o primeiro usuário/empresa real usando em produção — voltar a usar `dev` + PRs nesse momento.

## DEC-005 — `empresa_id` e `role` como custom claims no JWT

**Data:** 2026-08-05 · **Status:** ativa (ainda não implementada — Auth Hook pendente)
**Decisão:** Adicionar `empresa_id` e `role` como claims no JWT via Auth Hook do Supabase, em vez de consultar o banco a cada requisição.
**Contexto:** Estratégia de autenticação/autorização da Fase 0.
**Motivo:** Performance — evita SELECT extra em toda chamada; permite que policies de RLS leiam `empresa_id` direto do token.
**Alternativas consideradas:** Subquery em toda policy de RLS — rejeitada por ficar lenta com centenas de empresas e milhares de veículos.
**Riscos aceitos:** Nenhum crítico — é uma escolha de performance, não de segurança (RLS continua sendo a barreira real).
**Revisitar quando:** Implementar o Auth Hook na Fase 0/1 (ainda pendente no momento deste registro).

## DEC-006 — Modelo Motorista = Cliente final (Modelo A) assumido, ainda não confirmado

**Data:** 2026-08-05 · **Status:** ⚠️ aberta — precisa confirmação explícita do Carlos
**Decisão:** Assumir que o Motorista é o próprio cliente final da locação (não existe um `Cliente` PJ/PF separado que gerencia motoristas).
**Contexto:** A lista original de entidades do Carlos incluía `Motorista` mas não `Cliente`, o que deixou ambíguo se são a mesma pessoa ou duas entidades.
**Motivo:** É o modelo mais comum em locação de EV para motorista de aplicativo no Brasil, e é o que a lista original sugere.
**Alternativas consideradas:** Modelo B — Cliente PJ/PF separado que aloca motoristas a veículos. Não descartado, só não confirmado.
**Riscos aceitos:** Se o modelo de negócio real for o B, a tabela `contratos` e as regras de permissão do módulo Comercial precisam mudar de forma, o que pode custar retrabalho se descoberto tarde.
**Revisitar quando:** Antes de iniciar a Fase 2 (Comercial/Contratos) — **esta decisão precisa ser confirmada pelo Carlos antes disso, não depois.**

## DEC-007 — `react-router-dom` mantido na versão mais recente, sem downgrade

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Manter `react-router-dom@7.18.2` apesar de um advisory de segurança nessa faixa de versão, em vez de fazer downgrade.
**Contexto:** `npm audit` reportou "RSC Mode CSRF Bypass" para a versão instalada durante o scaffold da Fase 0.
**Motivo:** O advisory é específico de modo Server Components/framework — este projeto é SPA pura, não usa RSC. Fazer o downgrade sugerido por `npm audit fix --force` exporia a uma faixa de versão anterior com vulnerabilidades muito mais graves (RCE, XSS, open redirect).
**Alternativas consideradas:** Downgrade para a faixa sugerida pelo audit — rejeitado por ser objetivamente pior.
**Riscos aceitos:** Nenhum na prática — o advisory não se aplica ao modo de uso deste projeto.
**Revisitar quando:** Existir um patch específico para o advisory na versão atual, ou o projeto passar a usar recursos de Server Components/framework mode (não previsto).

## DEC-008 — DDD completo (Domain/Application/Infrastructure) adiado

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Não adotar camadas DDD completas agora. Manter a regra já existente ("feature nunca importa de outra feature direto, só via `shared/`") como a versão atual de isolamento de domínio.
**Contexto:** Proposta do Carlos de evoluir a arquitetura para um "Business Operating System" com camadas Business/Application/Domain/Infrastructure.
**Motivo:** DDD em camadas foi desenhado para lógica de negócio complexa rodando em servidor. A arquitetura é BaaS-first (SPA fala direto com Supabase, regra vive em RLS) — empilhar DDD completo briga com essa escolha de stack (DEC-002) sem nenhuma regra de negócio complexa real para justificar.
**Alternativas consideradas:** Implementar DDD completo desde a Fase 0 — rejeitado por custo de indireção sem caso de uso real.
**Riscos aceitos:** Se uma regra de negócio genuinamente complexa aparecer sem essa estrutura, pode exigir refatoração pontual — mitigado por já ter o gatilho definido (ver Revisitar).
**Revisitar quando:** Surgir uma regra de negócio complexa que precise ser testada isolada do Supabase (ex.: cálculo de financiamento multivariável) — nesse momento, extrair só uma pasta `domain/` para essa regra específica, não uma reestruturação geral.

## DEC-009 — Event Bus redirecionado para outbox no Postgres, não JS em memória

**Data:** 2026-08-05 · **Status:** ativa (mecanismo ainda não implementado)
**Decisão:** Efeitos cross-domain ("Contrato criado → Financeiro/Agenda/Auditoria") serão implementados via trigger Postgres + outbox (`audit_log`/`eventos`) + Supabase Database Webhooks — não um event bus em memória no navegador.
**Contexto:** Proposta do Carlos de um Event Bus interno para propagar eventos entre módulos.
**Motivo:** Um event bus em memória no browser perde o evento se a aba fechar no meio do fluxo — inaceitável para dado financeiro/contratual.
**Alternativas consideradas:** Event bus JS in-memory como proposto — rejeitado pelo risco de perda de dado.
**Riscos aceitos:** Nenhum além da complexidade normal de um outbox pattern, que é o padrão correto para esse problema.
**Revisitar quando:** Fase 3 (Financeiro) — quando existir o primeiro efeito cross-domain real para implementar de fato.

## DEC-010 — Workflow engine adiado (regra dos 3)

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Não construir um motor de workflow genérico agora. Fluxos operacionais (compra de veículo, criação de contrato...) são código simples até um padrão real se repetir.
**Contexto:** Proposta de um mecanismo de Workflows para orientar processos operacionais.
**Motivo:** Motor genérico para zero fluxos concretos é adivinhar a forma errada.
**Alternativas consideradas:** Construir o motor agora, de forma abstrata — rejeitado.
**Riscos aceitos:** Algum retrabalho ao extrair o padrão depois — aceitável, é mais barato que manter uma abstração errada por anos.
**Revisitar quando:** Três fluxos concretos (ex.: Compra de veículo, criação de Contrato, e um terceiro) mostrarem o mesmo formato nas Fases 1–2.

## DEC-011 — "Tudo é uma Entidade" implementado como capacidades genéricas, não tabela polimórfica única

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Cada tipo de entidade mantém sua própria tabela forte (`veiculos`, `motoristas`, `contratos`...). Só as capacidades transversais (arquivo, comentário, tag, timeline, favorito) viram tabelas genéricas referenciando `(entidade_tipo, entidade_id, empresa_id)`.
**Contexto:** Proposta do Carlos de que "tudo é uma Entidade", com uma estrutura base comum.
**Motivo:** Uma tabela única para todos os tipos de negócio é o antipadrão EAV/"tabela deus" — quebra integridade referencial, torna RLS muito mais difícil de auditar por tipo, piora performance de índice.
**Alternativas consideradas:** Tabela `entidades` polimórfica única, como proposto originalmente — rejeitada pelos motivos acima.
**Riscos aceitos:** Nenhum além do custo normal de manter N tabelas fortes em vez de uma genérica — aceitável, é o padrão correto em Postgres.
**Revisitar quando:** N/A — decisão estrutural estável.

## DEC-012 — "Tudo é um Ativo" restrito a bens físicos depreciáveis

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Só bens físicos depreciáveis da própria PrimeCharge (veículo, e futuramente notebook/celular/equipamento) compartilham um padrão de "Ativo Patrimonial". Contrato e Motorista/Cliente não são tratados como ativos.
**Contexto:** Proposta do Carlos de que veículos, imóveis, equipamentos, contratos e clientes fossem todos tratados como "Ativo".
**Motivo:** Contrato é um acordo, Motorista/Cliente é uma pessoa — tratá-los com o mesmo esqueleto de ativo patrimonial é modelagem errada, e no caso de pessoas uma escolha sensível do ponto de vista de dados pessoais.
**Alternativas consideradas:** "Tudo é um ativo" como proposto — rejeitado.
**Riscos aceitos:** Nenhum.
**Revisitar quando:** Um segundo tipo de ativo patrimonial além de Veículo entrar em escopo real (não está em nenhuma fase do roadmap hoje).

## DEC-013 — "Platform first" substituído por reuso extraído, não adivinhado

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Nenhuma funcionalidade nova é obrigada a ser desenhada pensando em reuso pelos futuros Prime Fleet/Invest/BI/CRM/AI/Portal. A base já compartilhável (multi-tenant, auth, capacidades de entidade, auditoria) já é a plataforma.
**Contexto:** Proposta do Carlos de que toda funcionalidade nova deveria ser construída pensando em reuso por sete produtos futuros da PrimeCharge.
**Motivo:** Como regra permanente, desacelera toda decisão futura por um benefício que só existe se esses produtos forem construídos de verdade — nenhum tem especificação, prazo ou receita hoje. Adivinhar a forma certa para 7 produtos hipotéticos significa errar a forma 7 vezes.
**Alternativas consideradas:** Regra permanente de "pensar em reuso por 7 produtos" — rejeitada.
**Riscos aceitos:** Algum retrabalho se um segundo produto real vier a ser construído e precisar de algo que não foi generalizado a tempo — aceitável, mais barato que generalizar errado hoje.
**Revisitar quando:** Um segundo produto Prime (Invest, Fleet, BI...) tiver especificação e prazo reais.

## DEC-014 — "Aprovação" não é capability própria

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Aprovação é a composição de uma transição de State Machine (`CORE_CONCEPTS.md`, seção 2) passando por uma checagem de Policy (`CORE_CONCEPTS.md`, seção 3) — não um mecanismo genérico à parte.
**Contexto:** Proposta do Carlos listava "Aprovação" como uma das 15 capabilities transversais da plataforma.
**Motivo:** Aprovação sempre acontece *sobre* uma transição de estado específica de uma entidade específica — não é um recurso independente, é o efeito combinado dos outros dois conceitos já definidos.
**Alternativas consideradas:** Capability própria de "Aprovação" — rejeitada por redundância.
**Riscos aceitos:** Nenhum.
**Revisitar quando:** N/A.

## DEC-015 — Fluxo de trabalho: push de código só a partir da máquina local do Carlos

**Data:** 2026-08-05 · **Status:** ativa (restrição técnica, não decisão de design)
**Decisão:** O Claude escreve e commita localmente no ambiente de nuvem, sincroniza os arquivos para a pasta local do Carlos via ponte com o computador dele, e o Carlos (ou uma sessão futura rodando "no computador dele") executa o `git push` real.
**Contexto:** O ambiente de nuvem desta sessão não consegue autenticar `git push` nem chamadas à API do GitHub para este repositório — bloqueio de "session's authorized repository set" no proxy de rede do sandbox, mesmo com domínios liberados e o GitHub App com acesso total.
**Motivo:** Limitação da infraestrutura da sessão, não escolha de arquitetura do produto.
**Alternativas consideradas:** Rodar a sessão inteira "no computador" do Carlos em vez da nuvem — não adotado ainda, permanece como opção se o contorno atual deixar de ser viável.
**Riscos aceitos:** Todo push depende de uma ação manual do Carlos — atrito de processo, não risco técnico.
**Revisitar quando:** A restrição de rede da sessão de nuvem for resolvida (nenhum caminho conhecido até o momento deste registro), ou o fluxo de trabalho migrar para rodar direto na máquina do Carlos.

## DEC-016 — Alterações de schema no Supabase via SQL colado no dashboard, não via MCP

**Data:** 2026-08-05 · **Status:** ativa (restrição técnica, não decisão de design)
**Decisão:** Mudanças de schema no projeto Supabase do PrimeCharge são feitas colando SQL diretamente no SQL Editor via automação de navegador — não pela integração MCP do Supabase conectada nesta sessão.
**Contexto:** O projeto Supabase do PrimeCharge foi criado manualmente pelo Carlos, numa conta/organização diferente da que a integração MCP tem acesso.
**Motivo:** Limitação de acesso da integração, não escolha de processo.
**Alternativas consideradas:** Nenhuma — é a única via disponível até a conta MCP ganhar acesso ao projeto certo.
**Riscos aceitos:** Sem histórico de migration automatizado (`supabase/migrations/*.sql` no repo é a fonte de verdade manual, precisa ser mantido em sincronia manualmente com o que foi de fato aplicado).
**Revisitar quando:** A integração MCP do Supabase ganhar acesso à organização correta.

---

*Fim da fase de documentação de fundação. A partir daqui, novas entradas neste log só devem surgir de decisões tomadas durante a implementação real (Fase 1 em diante) — não de mais rodadas de planejamento de plataforma.*

## DEC-017 — Marcas e modelos são catálogo global, não escopado por empresa

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** As tabelas `marcas` e `modelos` (Sprint 1, módulo Veículos) não têm `empresa_id` — são catálogo compartilhado entre todas as empresas do sistema, com leitura liberada a qualquer usuário autenticado e cadastro inline pela própria tela de Veículos (sem CRUD dedicado).
**Contexto:** FASE 1.1 pede que toda tabela nasça com `empresa_id` + RLS + policies — mas marca/modelo de veículo é dado de mundo real (BYD existe independente de qual empresa usa o sistema), não dado de negócio de uma empresa específica.
**Motivo:** Escopar por empresa faria cada empresa recadastrar as mesmas 10 marcas/19 modelos do zero, e duplicaria dado idêntico entre tenants sem nenhum ganho de isolamento — marca/modelo não carrega informação sensível ou específica de negócio.
**Alternativas consideradas:** `empresa_id` em `marcas`/`modelos` como todas as outras tabelas — rejeitado por gerar duplicação sem benefício. CRUD dedicado de marcas/modelos nesta sprint — fora de escopo (`FASE 1.1`: "exclusivamente o módulo Veículos"), resolvido com cadastro inline mínimo.
**Riscos aceitos:** Qualquer empresa pode cadastrar uma marca/modelo novo que passa a ficar visível para todas — aceitável para o catálogo de um dado público; se abuso for um problema real, adicionar moderação depois.
**Revisitar quando:** Surgir necessidade real de marca/modelo específico de uma empresa (ex.: veículo de fabricação própria) ou de moderação de cadastro.

## DEC-018 — Unicidade de chassi/RENAVAM/placa escopada por empresa, não global

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** As constraints `unique` de chassi, RENAVAM e placa em `veiculos` são `(empresa_id, campo)`, não só `(campo)`.
**Contexto:** Chassi/RENAVAM/placa são fisicamente únicos no mundo real — um `unique` global pareceria mais "correto" a princípio.
**Motivo:** Com RLS, cada empresa só enxerga suas próprias linhas — se a constraint fosse global, uma empresa poderia tomar erro de "unique violation" causado por uma linha de outra empresa que ela nem consegue ver, o que é uma experiência de erro sem explicação visível para o usuário.
**Alternativas consideradas:** `unique` global — rejeitado pelo motivo acima. Sem constraint nenhuma — rejeitado, perderia a proteção básica contra duplicidade dentro da própria empresa.
**Riscos aceitos:** Duas empresas diferentes podem (no sistema, não na vida real) cadastrar o "mesmo" chassi sem erro — aceitável nesta fase (dado de teste, sem integração com fonte oficial de veículos); revisitar se o sistema passar a validar contra base real (Denatran/FIPE).
**Revisitar quando:** Houver integração com fonte oficial de dados veiculares, ou multi-tenant real com risco de fraude entre empresas usando o mesmo veículo.

## DEC-019 — Primeiro usuário/empresa provisionados manualmente para destravar teste do sistema

**Data:** 2026-08-05 · **Status:** ativa (ação pontual, não padrão permanente)
**Decisão:** Foi criado manualmente (via Supabase Auth) o primeiro usuário de autenticação (`carloshenriqueferro@gmail.com`), a primeira `empresa` ("PrimeCharge") e o primeiro registro em `usuarios` vinculando os dois com `role = 'owner'` — sem passar por nenhum fluxo de signup/onboarding (que não existe ainda).
**Contexto:** A `FASE 1.1` pedia para entregar o módulo Veículos funcionando, mas o banco estava com zero empresas, zero usuários e zero contas de autenticação — sem isso, nenhuma tela do sistema seria acessível (RLS bloqueia tudo sem sessão autenticada com `empresa_id`), então nenhum teste real do módulo seria possível.
**Motivo:** Pré-requisito técnico mínimo para "entregar o sistema funcionando", não um pedido explícito da Sprint 1 — fluxo de signup/onboarding continua fora de escopo e será construído quando o módulo de Autenticação/Usuários virar prioridade.
**Alternativas consideradas:** Deixar o sistema sem nenhum usuário até uma fase futura de Auth — rejeitado, teria entregado um build que compila mas não pode ser usado nem testado, o que não atende ao pedido.
**Riscos aceitos:** Senha temporária foi gerada e comunicada fora deste log (ver mensagem de entrega) — Carlos deve trocá-la assim que possível. Nenhum fluxo de "esqueci minha senha" ou convite de novo usuário existe ainda.
**Revisitar quando:** O módulo de Autenticação/Onboarding (convites, signup, troca de senha) entrar em escopo — provavelmente necessário antes de qualquer segunda pessoa usar o sistema.
