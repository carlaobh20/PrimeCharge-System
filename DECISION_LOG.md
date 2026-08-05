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

**Data:** 2026-08-05 · **Status:** ativa — pendente, com gatilho de implementação definido em 2026-08-05 (ver atualização abaixo)
**Decisão:** Adicionar `empresa_id` e `role` como claims no JWT via Auth Hook do Supabase, em vez de consultar o banco a cada requisição.
**Contexto:** Estratégia de autenticação/autorização da Fase 0.
**Motivo:** Performance — evita SELECT extra em toda chamada; permite que policies de RLS leiam `empresa_id` direto do token.
**Alternativas consideradas:** Subquery em toda policy de RLS — rejeitada por ficar lenta com centenas de empresas e milhares de veículos.
**Riscos aceitos:** Nenhum crítico — é uma escolha de performance, não de segurança (RLS continua sendo a barreira real).
**Revisitar quando:** Ver gatilho concreto na atualização abaixo — deixa de ser "pendente sem prazo".

**Atualização (2026-08-05, revisão arquitetural pré-Sprint 7):** Confirmado que `current_empresa_id()` (subquery em `usuarios`, ver `supabase/migrations/0001_fase0_fundacao.sql`) continua sendo o mecanismo real por trás de toda policy de RLS do sistema — o Auth Hook nunca foi implementado. Isso não é, por si só, um problema na escala atual (poucas empresas, poucos usuários); o problema era a decisão ficar pendente sem prazo. A pedido do Carlos, o gatilho fica explícito: implementar o Auth Hook **no mais tardar no início da Fase 6 (Equipe & Governança)** — momento em que o trabalho em `usuarios`/roles já vai estar em andamento por causa do DEC-026, e a mudança se paga junto. Antecipar esse prazo se, antes disso, aparecer qualquer um destes sinais concretos: a tabela `usuarios` ultrapassar a ordem de milhares de linhas, ou for observada degradação perceptível de latência atribuível às policies de RLS. Sem esses sinais, a subquery continua aceitável — a decisão original (DEC-005) permanece ativa, só deixou de ser indefinida.

## DEC-006 — Modelo Motorista = Cliente final (Modelo A) — confirmado por Carlos

**Data:** 2026-08-05 · **Status:** ativa — confirmada por Carlos na Sprint 6, via `AskUserQuestion`
**Decisão:** Motorista é o próprio cliente final da locação (não existe um `Cliente` PJ/PF separado que gerencia motoristas). Contrato (futuro) se relaciona diretamente a Motorista.
**Contexto:** A lista original de entidades do Carlos incluía `Motorista` mas não `Cliente`, o que deixou ambíguo se são a mesma pessoa ou duas entidades. A Sprint 6 (Cockpit do Motorista) pedia KPIs de formato contratual (Receita gerada, Tempo médio de contrato, Inadimplência, Lifetime Value) cuja modelagem correta dependia diretamente dessa decisão — construir o schema sem confirmar arriscava migração cara se a resposta fosse Modelo B. Bloqueado explicitamente antes de escrever schema ou código, e confirmado pelo Carlos: **Modelo A**.
**Motivo:** É o modelo mais comum em locação de EV para motorista de aplicativo no Brasil, e é o que a lista original sugere.
**Alternativas consideradas:** Modelo B — Cliente PJ/PF separado que aloca motoristas a veículos. Descartado por decisão explícita do Carlos.
**Riscos aceitos:** Nenhum residual — decisão de negócio confirmada pelo dono do produto antes da implementação, não uma suposição da IA.
**Revisitar quando:** Não previsto — só se o modelo de negócio real mudar (ex.: PrimeCharge passar a atender clientes PJ com frota de motoristas terceirizados).

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

## DEC-020 — `vercel.json` com rewrite de SPA adicionado após 404 encontrado no teste end-to-end

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Adicionado `vercel.json` na raiz do repo com rewrite `"/(.*)" → "/index.html"`.
**Contexto:** Teste real no navegador (pós-deploy) mostrou 404 (`NOT_FOUND`) ao navegar direto ou dar refresh em qualquer rota que não seja `/` (ex.: `/veiculos/:id`). Causa: Vercel serve SPA estática por arquivo físico por padrão — sem rewrite, só `/index.html` existe fisicamente, e o React Router nunca chega a rodar para rotas que exigem carregamento direto do servidor.
**Motivo:** É o fix padrão e único necessário para qualquer SPA com client-side routing hospedada na Vercel.
**Alternativas consideradas:** Nenhuma — não é uma escolha de design, é a configuração obrigatória para este tipo de deploy.
**Riscos aceitos:** Nenhum.
**Revisitar quando:** N/A — configuração estável, esperada permanecer assim mesmo com novas rotas futuras.

## DEC-021 — Cockpit do Ativo: Command Actions concretas por ação, não um motor genérico

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** A Sprint 2 transformou a ficha do veículo em "Cockpit do Ativo" (header premium, faixa de KPIs, 9 abas, sidebar direita, Command Actions). Cada Command Action (Registrar km, Alterar status, Adicionar documento, Vender, Duplicar…) é um componente de Dialog concreto e específico — não existe um "Action Registry"/motor de ações genérico por trás.
**Contexto:** O pedido da Sprint 2 lista 11 ações rápidas abrindo dialogs, o que pareceria pedir um sistema genérico de ações/comandos (padrão command palette).
**Motivo:** DEC-010 (motor de workflow adiado, "regra dos 3") e DEC-008 (DDD/camadas adiadas) já estabeleceram que abstração genérica só se justifica com 3 casos reais repetidos — 11 ações com formas de dado completamente diferentes (uma atualiza `quilometragem`, outra abre upload de arquivo, outra nem tem backend ainda) não são "o mesmo padrão 3 vezes", são casos distintos. Um motor genérico aqui seria abstração prematura disfarçada de arquitetura.
**Alternativas consideradas:** Sistema genérico de "ações registráveis" com metadata declarativa — rejeitado, mesma razão do DEC-010.
**Riscos aceitos:** Alguma repetição de estrutura entre os componentes de Dialog (todos usam o mesmo `Dialog` primitivo, mas o conteúdo de cada um é escrito à mão) — aceitável, é o preço de não generalizar cedo.
**Revisitar quando:** Um quarto ou quinto módulo (Motoristas, Contratos…) precisar do mesmo padrão de Command Actions — nesse ponto, extrair a estrutura comum já observada em 3+ casos reais, não antes.

### Nota: dado real vs. placeholder nesta sprint

Ações com backend real, sem gambiarra: Alterar status, Adicionar documento, Novo comentário, Nova tag, Registrar km, Duplicar veículo (pré-preenche o formulário de criação com os campos não-únicos), Vender veículo (reaproveita a state machine — só oferece a ação quando "venda" é uma transição válida a partir do status atual), Compartilhar (copia o link real da página), aba Histórico (lê `audit_log`, que já existia desde a Fase 0 e nunca tinha sido lida por nenhuma tela até agora).

Ainda sem módulo de negócio por trás, mostrado com honestidade ("em breve", nunca dado fake): Registrar manutenção, Registrar abastecimento, Gerar relatório/Exportar PDF, Arquivar, e os KPIs de Receita/Custo/ROI/Saúde do ativo/Status documental (dependem de Financeiro, Manutenção e Contratos, nenhum construído ainda).
**Risco registrado nesta sprint, não bloqueante:** essas abas/KPIs "em breve" vão ficar assim por um tempo indeterminado — se o Cockpit for mostrado a alguém de fora (cliente, investidor) antes desses módulos existirem, pode passar a impressão de mais completude do que existe de fato. Vale ter isso em mente antes de qualquer demo externa.

**Atualização (ver DEC-022):** "Saúde do ativo" e "Status documental" deixaram de ser placeholder na Sprint 3 — passaram a ter regra real por trás (Vehicle Intelligence). Receita acumulada/Custo acumulado/ROI continuam "em breve", ainda dependem do Financeiro.

## DEC-022 — Vehicle Intelligence: camada de regras/métricas desacoplada da UI, sem motor genérico de score

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Sprint 3 criou `src/features/frota/intelligence/` — funções puras (zero import de React ou do client Supabase) que calculam Health Score (5 categorias: Operacional, Documental, Patrimonial, Financeira, Comercial), Insights, Alertas, Próximas Ações e Comparativos com a frota. Um hook único (`useVehicleIntelligence`) é a única ponte entre os dados (React Query) e essas funções — nem a página, nem os componentes de painel, calculam nada.
**Contexto:** Pedido explícito da Sprint 3: "toda inteligência deve ficar desacoplada da UI", sem criar módulo de negócio novo (Contratos/Financeiro/Compras seguem fora de escopo).
**Motivo:** Isolar regra de negócio testável fora do Supabase é exatamente o gatilho que a DEC-008 já previu pra extrair uma camada própria ("regra de negócio genuinamente complexa que precise ser testada isolada do Supabase") — diferente da Sprint 2 (Command Actions), aqui a generalização é o pedido em si, não uma escolha nossa de abstrair cedo.
**Regra de honestidade do Health Score:** cada categoria retorna `score: null` quando não existe regra real por trás (Financeira e Comercial retornam `null` sempre, hoje — dependem de módulos inexistentes). O score geral (`overall`) só é calculado como média das categorias com `score` real, nunca preenche uma categoria sem dado com valor arbitrário pra fechar a conta — e a UI sempre mostra "X de 5 categorias avaliadas" ao lado do número, pra nunca parecer mais completo do que é.
**Categorias com regra real nesta sprint:** Operacional (status atual + inatividade, via `timeline_eventos`), Documental (quantidade de documentos cadastrados — ainda sem data de validade, porque `arquivos` não tem esse campo), Patrimonial (completude e sanidade dos valores de compra/FIPE/mercado, já existentes em `veiculos`).
**Categorias sem regra ainda:** Financeira e Comercial — dependem de Financeiro/Contratos, fora de escopo desta sprint por instrução explícita.
**Alternativas consideradas:** Calcular as 5 categorias sempre com algum score (default neutro tipo 50) pra nunca aparecer "sem dado" — rejeitado, geraria um número de aparência confiável sobre dado inexistente.
**Riscos aceitos:** Comparativos de frota (v1) ficam limitados a métricas já presentes na consulta de listagem (km, dias em operação, valor de mercado) — comparar Health Score veículo-a-veículo exigiria calcular o score de toda a frota (N+1 consultas por veículo), não implementado agora.
**Revisitar quando:** Financeiro/Contratos existirem (ativa as categorias Financeira/Comercial); `arquivos` ganhar campo de data de validade (enriquece a categoria Documental); Comparativo de Health Score se mostrar necessário (nesse ponto, considerar pré-calcular e cachear o score da frota em vez de calcular sob demanda).

**Atualização (ver DEC-023):** os tipos de exibição (`Insight`, `Alerta`, `NextAction`, `HealthScoreResult`, `ComparativoItem`/`ComparativoResult`) e os componentes de Card que os renderizam foram movidos para `shared/` na Sprint 4, para poderem ser reaproveitados por outras features. O cálculo (Health Score, Insights, Alertas...) continua 100% dentro de `features/frota/intelligence/`, sem nenhuma mudança de regra.

**Atualização (ver DEC-031):** a taxonomia de 5 categorias (`HealthCategoriaId`) foi reafirmada como fechada na criação de `SMART_FLEET_PLATFORM.md` — telemetria futura (bateria, consumo, condução, manutenção) entra como evidência mais rica dentro de Operacional/Patrimonial, nunca como categoria nova.

## DEC-023 — Intelligence First: framework de 3 perguntas + Cards de inteligência componentizados em shared/

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Toda entidade relevante da plataforma (Veículo, e futuramente Motorista, Contrato, Compra, Empresa...) deve, além do CRUD básico, responder a três perguntas através de sua própria camada `intelligence/`: (1) O que aconteceu? (Alertas/Insights, derivados de eventos e dado real); (2) O que isso significa? (Health Score, interpretação consolidada); (3) O que deve ser feito agora? (Próximas Ações, sempre ligadas a um Command Action real, nunca decorativas). Essa camada é o que o futuro Command Center, Dashboard, BI, IA e Automações vão consumir — não cada tela calculando de novo.

Como parte desta decisão, os 6 tipos de Card pedidos foram avaliados um a um:
- **HealthScoreCard, InsightCard, AlertCard, NextActionCard, MetricComparisonCard** — construídos e movidos para `shared/components/intelligence/` (tipos correspondentes em `shared/intelligence/types.ts`), junto com os Panels do Cockpit do Ativo que os compõem (que continuam em `features/frota/`, pois título/ícone/copy são específicos do módulo Veículos).
- **RecommendationCard — não construído nesta sprint.** Não existe hoje nenhuma fonte de dado real que produza uma "recomendação" distinta de Insight (o que significa) e de NextAction (o que fazer, com ação concreta ligada). Construir o componente sem nenhum consumidor real seria a mesma abstração prematura que DEC-008/DEC-010/DEC-021 já rejeitaram, agora aplicada a um componente de UI em vez de a uma engine — ou o componente fica morto no repo, ou vira gambiarra pra caber Insight dentro dele.

**Contexto:** Pedido explícito desta sprint listava os 6 nomes de Card e pedia registro automático de uma decisão "DEC-022 — Intelligence First". Esse número já estava em uso (Vehicle Intelligence, Sprint 3) — esta entrada foi registrada como **DEC-023** para não sobrescrever/duplicar uma entrada existente do log. Ver aviso na entrega desta sprint.
**Motivo:** Para os 5 Cards com dado real, movê-los pra `shared/` não é abstração especulativa — é a única forma de honrar o pedido de reuso futuro por Motoristas/Contratos/Compras/Financeiro/Empresas, já que a regra do próprio projeto ("feature nunca importa de outra feature direto, só via `shared/`", DEC-008) proíbe uma feature futura de importar diretamente de `features/frota/`. Deixá-los lá dentro tornaria a promessa de reuso falsa por construção.
**Alternativas consideradas:** Construir RecommendationCard mesmo sem consumidor, "pronto pra quando precisar" — rejeitado pelo mesmo motivo de DEC-010. Manter os 5 Cards reais dentro de `features/frota/` — rejeitado, inviabilizaria o reuso que é o próprio objetivo do pedido.
**Riscos aceitos:** Nenhum novo — o cálculo de regra de negócio continua isolado por feature; só o contrato de exibição (tipos + Card) é compartilhado.
**Revisitar quando:** Uma segunda feature (Motoristas, Contratos...) precisar de fato de uma camada `intelligence/` própria — nesse momento, ela reusa os Cards e tipos de `shared/` sem nenhuma alteração aqui, e cria sua própria pasta `features/<módulo>/intelligence/` com as regras específicas do seu domínio. Se um caso real de "recomendação" distinta de Insight/NextAction aparecer, construir RecommendationCard nesse momento, não antes.

## DEC-024 — Command Center: centro de decisão operacional, Dashboard vira exclusivamente analítico

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Criada `features/command-center/` — nova Home do sistema (rota `/`, substituindo o Dashboard como página inicial). Consolida, hoje, a inteligência de todos os veículos da frota em 6 Engines (funções puras, sem UI): AlertEngine, InsightEngine, ActionEngine (consolidam o que Vehicle Intelligence já calcula por veículo — DEC-022), OpportunityEngine e RiskEngine (dois conceitos novos desta sprint, sem equivalente anterior), e PriorityEngine (calcula Impacto/Urgência/Prioridade de qualquer item, usado pelos outros 5). O Dashboard (`/dashboard`) deixa de ser a tela inicial e passa a ser exclusivamente analítico (tendência/histórico), não mais o lugar de decisão do dia a dia.

**Desvios do pedido literal, registrados aqui para não ficarem silenciosos:**

1. **Estrutura de pastas** — o pedido listava `application/engine/widgets/cards/hooks/services/types/pages`. `application/` foi substituída por `hooks/` (mesmo papel de orquestrar dado + engine pra UI — é a convenção já usada em `useVehicleIntelligence`, features/frota/) porque "application" reintroduziria o vocabulário de camadas DDD que a DEC-008 já decidiu adiar, sem nenhum ganho real aqui. `types/` virou `types.ts` (arquivo único), mesma convenção de `features/frota/types.ts`. O resto — `engine/`, `widgets/`, `cards/`, `services/`, `pages/` — foi seguido literalmente.
2. **Exceção pontual à DEC-008** ("feature nunca importa de outra feature direto, só via `shared/`"): o Command Center precisa ler o Health Score/Insights/Alertas/Próximas Ações que `features/frota/intelligence/` já calcula, sem recalcular a regra em outro lugar (recalcular quebraria DEC-022 — duas fontes de verdade pra saúde de um veículo). A solução: `features/frota/intelligence/index.ts`, um barril público que reexporta só as funções de cálculo e seus tipos de input — nenhum outro arquivo de `features/frota/` pode ser importado de fora. Command Center (e futuramente Dashboard/BI) pode importar desse barril; features de negócio continuam proibidas de se importar entre si. Registrado como exceção explícita, não como revogação de DEC-008.
3. **Coleta em lote, não N+1**: calcular a intelligence de N veículos exigiria, ingenuamente, 4×N consultas (documentos/eventos/comentários/tags por veículo) — inaceitável numa tela que carrega a cada login. `shared/capabilities/api/*.ts` ganhou uma variante `*PorEntidades` em cada uma das 4 capabilities (arquivos, timeline, comentários, tags), usando `.in('entidade_id', ids)` — o Command Center faz sempre 4 consultas, não importa o tamanho da frota. `diasDesde`/`formatMoeda`/`formatKm` (puramente genéricos, só moravam em `features/frota/lib/` por terem sido usados lá primeiro) subiram pra `shared/lib/format.ts` pelo mesmo motivo dos Cards na DEC-023 — `features/frota/lib/format.ts` virou reexport.
4. **"Resumo da Frota" e "Health Médio da Empresa" viraram um bloco visual só** (`ResumoFrotaWidget`), não dois — é a mesma informação (total de veículos, quantos avaliados, média), separá-la em duas caixas quase idênticas lado a lado não ajudava a leitura da tela.
5. **Próximas Ações no Command Center não abrem os dialogs de Command Action direto na Home** — viram link pro Cockpit do veículo (Sprint 2), que já tem os 11 Command Actions prontos. Duplicar os dialogs na Home multiplicaria manutenção sem ganho: a Home aponta o "onde", o Cockpit resolve o "como".

**Contexto:** Pedido explícito desta sprint: 6 Engines nomeados, Home organizada em 10 blocos (Prioridades do Dia, Alertas, Oportunidades, Riscos, Próximas Ações, Insights, Resumo da Frota, Health Médio da Empresa, Veículos Críticos, Veículos Destaque), toda informação com Impacto/Urgência/Prioridade/Origem/Categoria, sem criar Contratos/Financeiro/Compras, "preparar para crescimento futuro sem reescrita".
**Motivo dos 2 conceitos novos:** Insight/Alerta/Próxima Ação (Vehicle Intelligence) descrevem o veículo isoladamente; "Oportunidade" e "Risco" são leituras cross-fleet que não existiam antes. RiskEngine não inventa critério de gravidade — promove o que Vehicle Intelligence já marcou como crítico (Alerta crítico, categoria de Health Score com status crítico), pra não ter duas régua diferentes de "o que é grave". OpportunityEngine tem uma única regra real (veículo disponível/devolvido com valor de mercado ≥ 95% do valor de compra) — deliberadamente estreita, sem inventar oportunidade sobre dado ausente (mesma regra de honestidade da DEC-022).
**Categoria e prioridade como contrato compartilhado:** `Insight`/`Alerta`/`NextAction` (shared/intelligence/types.ts) ganharam campo `categoria: HealthCategoriaId` (reaproveita as mesmas 5 categorias do Health Score — DEC-022), e um novo tipo `PriorityMeta` (`impacto`/`urgencia`/`prioridade`/`origem`/`origemId`/`origemLabel`) foi adicionado ao mesmo arquivo. Ficam em `shared/` porque qualquer feature futura que quiser alimentar o Command Center precisa produzir esse formato, sem depender de código de dentro de `features/command-center/`.
**Alternativas consideradas:** Motor genérico de "Engines plugáveis" com um registro declarativo — rejeitado, mesma razão de DEC-010: zero segundo módulo real hoje pra justificar a abstração; os 6 Engines atuais são 6 cálculos concretos, não uma plataforma de engines. Recalcular a intelligence de cada veículo dentro do Command Center em vez de reexportar de `features/frota/` — rejeitado, criaria duas fontes de verdade pra saúde do mesmo veículo.
**Riscos aceitos:** O volume de dado por consulta batched cresce com o tamanho da frota (o número de consultas continua fixo em 4, mas cada uma delas devolve mais linhas). Aceitável para o tamanho de frota esperado nesta fase; se a Home ficar lenta com frotas grandes, o próximo passo é paginar ou pré-calcular/cachear, não voltar a 1 consulta por veículo. Limiares de "crítico" (Health Score < 50) e "destaque" (≥ 85) são um primeiro corte arbitrário, não calibrado com dado real de produção.
**Revisitar quando:** Um segundo módulo (Motoristas, Contratos...) precisar alimentar os Engines — nesse momento, cada Engine passa a agregar `origem` de mais de um tipo, sem mudar a assinatura de `PriorityMeta`/`CommandCenterFeedItem`. Volume de frota grande o suficiente para a consulta batched pesar no carregamento da Home. Um segundo caso real de "prioridade calculada de outro jeito" aparecer — hoje há só uma matriz Impacto×Urgência (`priorityEngine.ts`), compartilhada por todos os Engines.

---

## DEC-025 — Cockpit do Motorista: segundo módulo de negócio, consolida o padrão de hoisting para `shared/`

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Construído `features/motoristas/` — segundo grande Cockpit da plataforma (depois de Veículos), com Driver Intelligence completa (Health Score, Insights, Alertas, Próximas Ações, Comparativos, Oportunidades, Riscos) espelhando exatamente a estrutura e os princípios de Vehicle Intelligence (DEC-022/DEC-023). Motoristas ser o "segundo módulo real" disparou uma rodada de hoisting pra `shared/` de tudo que já morava em `features/frota/` só porque foi o primeiro lugar que precisou — consolidando a "regra dos 3"/hoisting já em uso desde a DEC-023.

**Hoisted para `shared/` nesta sprint (cada um porque Motoristas é o segundo consumidor real):**

1. `KpiCard` — `features/frota/components/KpiCard.tsx` → `shared/components/ui/kpi-card.tsx`.
2. `useCopyPageLink` — `features/frota/lib/useCopyPageLink.ts` → `shared/hooks/useCopyPageLink.ts` (arquivo antigo virou reexport).
3. `ConfirmDialog` e `PlaceholderActionDialog` — `features/frota/components/dialogs/` → `shared/components/ui/confirm-dialog.tsx` e `shared/components/ui/placeholder-action-dialog.tsx` (100% genéricos desde a Sprint 2, sem nenhum dado de domínio — arquivos antigos viraram reexport).
4. Tipos `Opportunity`/`Risk` — nasceram só no Command Center (Sprint 5, DEC-024) como conceitos dele; Motoristas precisou dos dois, então o formato base (sem `PriorityMeta`) subiu pra `shared/intelligence/types.ts`. `features/command-center/types.ts` passou a definir `PrioritizedOpportunity = Opportunity & PriorityMeta` e `PrioritizedRisk = Risk & PriorityMeta`, mesma nomenclatura de `PrioritizedAlerta`/`PrioritizedInsight`/`PrioritizedAction`.
5. `OpportunityCard`/`RiskCard` — `features/command-center/cards/` → `shared/components/intelligence/`, mesmo motivo dos outros Cards na DEC-023.
6. `gerarRiscos` — diferente de `gerarOportunidades` (que é sempre específico do domínio — "o que é uma boa oportunidade" muda totalmente entre Veículo e Motorista), a regra de Risco é genuinamente genérica: promove a Risco todo Alerta crítico e toda categoria de Health Score com status crítico, sem nenhum conhecimento sobre a entidade de origem. Foi pra `shared/intelligence/risks.ts` direto — não é uma feature "emprestando" de outra (proibido por DEC-008), é uma função pura tipo `formatKm`.
7. `diasAte` e `formatDataSimples` — `shared/lib/format.ts` ganhou os dois: `diasAte` (complementa `diasDesde`, calcula dias até uma data futura — usado pra validade da CNH) e `formatDataSimples` (formata coluna `date` sem passar por `Date`/fuso horário, evita bug de deslocar o dia).

**Refatoração de responsabilidade (Command Center vira agregador puro também para Oportunidade/Risco):** na Sprint 5, a regra de Oportunidade (valorização de veículo) e Risco (promoção de Alerta/Health crítico) morava dentro de `features/command-center/engine/{opportunityEngine,riskEngine}.ts` — funcionava, mas quebrava o mesmo princípio que Alert/Insight/Action Engine já seguiam (DEC-022: a regra de negócio de uma entidade mora só na feature dela, o Command Center só agrega e prioriza). Corrigido nesta sprint: `gerarOportunidades` foi pra `features/frota/intelligence/opportunities.ts`, `gerarRiscos` foi pra `shared/intelligence/risks.ts` (ver item 6 acima), e os dois Engines do Command Center foram reescritos para só mapear o que `fleetIntelligenceCollector.ts` já calculou, adicionando `PriorityMeta` — exatamente o mesmo papel de `alertEngine`/`insightEngine`/`actionEngine`. `identificarOportunidades`/`identificarRiscos` renomeados para `consolidarOportunidades`/`consolidarRiscos` para deixar esse papel explícito no nome.

**Driver Intelligence — desenho das 5 categorias de Health Score:** reaproveita as mesmas 5 categorias do Veículo (`HealthCategoriaId` é um tipo compartilhado, e criar uma união paralela só para Motorista seria a abstração errada na direção contrária — DEC-010). Duas com regra real: `operacional` (status + inatividade, mesmo desenho de Veículo, adaptado à state machine do Motorista) e `documental` (quantidade de documentos + validade da CNH — mais rica que a versão do Veículo desde já, porque Motorista já tem o campo `cnh_validade`, que `arquivos` de Veículo ainda não tem). Três com `score: null` de propósito, mesma regra de honestidade da DEC-022: `patrimonial` (dependeria do vínculo Motorista↔Veículo via Contratos), `financeira` (dependeria de cobrança/Financeiro) e `comercial` (dependeria de histórico de Contratos).

**KPIs — 2 reais, 6 honestos como "Em breve":** `Dias como cliente` e `Health Score`/`Score documental` são reais desde já (mesmo dado que alimenta a aba Indicadores). `Receita gerada`, `Tempo médio de contrato`, `Pontualidade`, `Inadimplência` e `Lifetime Value` dependem de Contratos/Financeiro, ainda não construídos — aparecem como "Em breve" na `KpiCard` (`pending`), nunca com número inventado (DEC-021).

**Desvios do pedido literal, registrados aqui para não ficarem silenciosos:**

1. **Abas "Dados Gerais" e "Histórico" adicionadas**, mesmo não estando na lista literal do Carlos (que citava Timeline, Comentários, Arquivos, Eventos, Indicadores, Configurações) — por consistência com o Cockpit do Ativo, que já estabelece essas duas como parte do padrão de Cockpit da plataforma (dados cadastrais legíveis sem abrir o formulário de edição, e trilha de auditoria bruta via `fn_audit_log()`).
2. **Aba "Financeiro" omitida** — estava na lista de abas do Veículo mas não foi pedida para Motorista nesta sprint; como o Motorista ainda não tem nenhum dado financeiro real (Contratos/Financeiro não existem), criar uma aba vazia idêntica à do Veículo não agregava nada além do que "Em breve" nos KPIs já comunica.
3. **`ArquivosTab` do Motorista tem só 1 painel (Documentos)**, não 2 como no Veículo (Fotos + Documentos) — Motorista não tem bucket de foto de capa (avatar do Cockpit é por iniciais do nome, não foto), então não existe uma segunda categoria de arquivo hoje.
4. **Menu "Mais opções" do header simplificado para só "Excluir"** — o Veículo tem Duplicar/Vender/Arquivar ali; nenhum desses 3 conceitos tem equivalente direto e óbvio pra Motorista nesta sprint (duplicar um cliente não faz sentido; "bloquear" já é uma Command Action de primeira classe, não um item de menu secundário). Evita inventar ações sem consumidor real.
5. **Command Actions**: 5 reais (documento, status, comentário, tag, bloquear) + 5 honestas como "em breve" (vincular-veículo, contrato, cobrança, ocorrência, relatório) — "compartilhar" fica fora do sistema de Command Action, mesmo padrão do Veículo (é resolvido direto no header/sidebar via `useCopyPageLink`, não abre dialog).

**Contexto:** Pedido explícito desta sprint: Cockpit do Motorista completo (Header/KPIs/Abas/Sidebar/Command Actions), Driver Intelligence decoplada da UI espelhando Vehicle Intelligence, 8 KPIs nomeados (nunca com número inventado), reuso máximo de componentes compartilhados, decisões estruturais registradas automaticamente. Bloqueado no início pela confirmação de DEC-006 (ver acima) antes de qualquer schema.
**Motivo:** Estabelecer, com dois Cockpits reais construídos (Veículo e Motorista) no mesmo padrão, que a arquitetura de Cockpit + Intelligence layer da plataforma é reutilizável de verdade — não um acidente de uma feature só. Cada hoisting desta sprint segue a mesma régua desde a DEC-023: nada sobe pra `shared/` até um segundo consumidor real aparecer.
**Alternativas consideradas:** Duplicar `ConfirmDialog`/`PlaceholderActionDialog`/`KpiCard`/`useCopyPageLink` dentro de `features/motoristas/` em vez de hoisted — rejeitado, são 100% genéricos e duplicar código idêntico entre os dois únicos Cockpits da plataforma não tem nenhum ganho, só custo de manutenção dobrado. Criar uma categoria de Health Score nova e exclusiva de Motorista em vez de reaproveitar as 5 existentes — rejeitado, `HealthCategoriaId` já é um tipo compartilhado de propósito (DEC-022) e as 5 categorias (operacional/documental/patrimonial/financeira/comercial) cobrem o vocabulário de negócio da PrimeCharge como um todo, não só de Veículo.
**Riscos aceitos:** A regra de "documentação completa" usada em `gerarOportunidades` do Motorista (2+ documentos e CNH válida) é um primeiro corte arbitrário, não calibrado com processo real de aprovação de motorista — mesmo espírito da regra de valorização do Veículo (DEC-025 não inventa dado, mas o limiar em si pode precisar ajuste quando houver processo comercial real). `diasAte`/CNH: cálculo usa `Date`, então tem a mesma granularidade de dia (não de hora) que o resto da camada de formatação — aceitável para o caso de uso (alerta de vencimento em 30 dias), não para nada que precise de precisão sub-diária.
**Revisitar quando:** Módulo de Contratos existir — nesse momento as 3 categorias `sem_dado` (patrimonial/financeira/comercial) ganham regra real, os 5 KPIs "Em breve" passam a ter dado, e `gerarOportunidades`/`opportunities.ts` provavelmente precisa de uma segunda regra (motorista com contrato prestes a vencer sem renovação = oportunidade de retenção, ou risco, a definir). Um terceiro módulo (Contratos, Compras, Empresas) precisar de `ConfirmDialog`/`PlaceholderActionDialog`/`KpiCard`/etc. não muda nada — já estão em `shared/`, é só importar.

---

## DEC-026 — Gap de autorização por role dentro da empresa reconhecido; fechamento obrigatório antes da Fase 2

**Data:** 2026-08-05 · **Status:** fechada parcialmente (módulo Contratos) — ver DEC-035. Veículos/Motoristas permanecem sem enforcement por `permissoes`.
**Decisão:** Reconhecido formalmente que o sistema hoje não faz enforcement de autorização por `role` dentro da mesma empresa — RLS isola empresa contra empresa (DEC-003), mas qualquer usuário autenticado de uma empresa (independente de `role`: motorista, operador, gestor_frota, gestor_financeiro, admin, owner) tem acesso de leitura/escrita igual a todos os dados dessa empresa a nível de banco. A única diferenciação hoje é ocultação de botão/rota na UI, não uma barreira real no backend. Fechar esse gap — no mínimo nas ações e leituras mais sensíveis — é obrigatório antes de a Fase 2 (Comercial/Contratos) começar.
**Contexto:** Levantado na revisão arquitetural completa pedida pelo Carlos antes da Sprint 7 (2026-08-05). A tabela `permissoes` (role × módulo × ação) existe no schema desde a Fase 0 e está documentada em `CORE_CONCEPTS.md` como o mecanismo de Policy da plataforma, mas checagem no código do frontend (`grep` por consumo de `permissoes`, checagem de `role`, `pode(`) confirmou zero pontos de uso real. A única autorização granular que existe de fato hoje são funções pontuais tipo `pode_excluir_veiculo()`.
**Motivo:** Com Contratos e Financeiro entrando em escopo na Fase 2, o custo de um `role` poder ler ou alterar dado financeiro/contratual que não deveria — ou de qualquer papel poder fazer o que só `admin`/`owner` deveria — deixa de ser teórico. Travar esse gatilho agora evita que a Fase 2 comece sobre uma base de autorização que só parece completa porque a tabela `permissoes` existe.
**Alternativas consideradas:** Deixar como está e resolver "quando aparecer problema" — rejeitada, é exatamente o tipo de decisão silenciosa que esta revisão foi pedida para evitar. Construir o sistema de permissões completo agora (editor de roles, UI de gestão de permissões) — rejeitada por ser abstração maior do que o problema pede neste momento; o necessário é fechar os pontos sensíveis via RLS/policy, não construir uma plataforma de permissões completa sem um segundo consumidor real.
**Riscos aceitos:** Entre agora e o fechamento do gap, qualquer usuário autenticado de uma empresa continua com acesso de fato irrestrito aos dados dessa empresa — aceito nesta fase porque o volume de usuários reais é baixo e controlado (provisionamento manual, DEC-019), mas deixa de ser aceitável no momento em que um segundo `role` além de owner/admin passar a ser usado por uma pessoa real.
**Revisitar quando:** Obrigatoriamente antes do início da Fase 2 (Comercial/Contratos) — e antecipadamente, no momento em que qualquer usuário com `role` diferente de `owner`/`admin` for provisionado para uso real.

## DEC-027 — Observabilidade mínima obrigatória antes da Fase 2 (decisão de princípio, não de ferramenta)

**Data:** 2026-08-05 · **Status:** fechada — ver DEC-036
**Decisão:** A plataforma precisa de monitoramento mínimo de erros em produção (captura de exceção não tratada, com stack trace e contexto de usuário/empresa) antes do início da Fase 2. Esta é uma decisão sobre a **necessidade** de observabilidade, não sobre qual ferramenta — a implementação inicial provavelmente será Sentry (ou equivalente gratuito/de baixo custo compatível com SPA React), mas a decisão sobrevive a uma eventual troca de ferramenta.
**Contexto:** Levantado na mesma revisão arquitetural (2026-08-05). Hoje, um erro em produção só é percebido se um usuário relatar manualmente — não existe nenhuma captura automática de exceção, nem no frontend nem em função alguma do lado do banco.
**Motivo:** Na Fase 1 (Frota/Motoristas), um bug silencioso é inconveniente. A partir da Fase 2 (Comercial/Contratos), o mesmo tipo de bug silencioso passa a poder custar um contrato mal registrado, uma cobrança que não dispara, ou um dado financeiro incorreto sem que ninguém saiba até tarde demais. Observabilidade precisa existir antes desse ponto, não depois do primeiro incidente.
**Alternativas consideradas:** Adiar observabilidade para "quando der problema real" — rejeitada, mesmo raciocínio do DEC-026: o ponto de instalar isso é antes do incidente, não depois. Investir em stack de observabilidade completo (APM, tracing distribuído, dashboards de performance) já nesta fase — rejeitada por ser desproporcional ao volume atual de uso; captura básica de erro é suficiente até a Fase 2/3.
**Riscos aceitos:** Entre agora e a implementação, bugs em produção continuam invisíveis exceto por relato manual — aceito por ainda estar na Fase 1, com poucos usuários e sem dado financeiro real em jogo.
**Revisitar quando:** Obrigatoriamente antes do início da Fase 2 (Comercial/Contratos). Reavaliar a ferramenta específica (hoje: Sentry como candidato) se surgir opção mais alinhada ao stack ou ao orçamento no momento da implementação.

## DEC-028 — AI Platform: constituição própria criada; IA integra-se via padrão `intelligence/` por módulo, não motor centralizado

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Criado `AI_PLATFORM.md` como constituição oficial da camada de Inteligência Artificial da PrimeCharge — filosofia, 6 níveis de maturidade (Nível 0 ERP → Nível 5 Operação Autônoma), taxonomia de tipos de inteligência, critério de quando usar IA, princípios obrigatórios. Fixada, como decisão arquitetural, a forma como a IA vai se integrar à plataforma quando o primeiro caso real (Nível 3) existir: cada módulo que adotar IA ganha sua própria pasta `features/<módulo>/intelligence/` (funções puras, mesmo padrão de Vehicle Intelligence/DEC-022 e Driver Intelligence/DEC-025) — não um motor de IA centralizado ou serviço genérico compartilhado por todos os módulos. Só a camada de exibição (Cards, tipos) é compartilhada via `shared/`, nunca o cálculo/regra.
**Contexto:** Pedido explícito do Carlos, revisão arquitetural pós-Sprint 6/pré-Sprint 7: documentar a fundação oficial da camada de IA antes de qualquer implementação real. Documentação pura — nenhum código, migration, componente ou tabela criada junto com esta decisão.
**Motivo:** Um motor de IA centralizado, desenhado agora para nenhum caso de uso real ainda existente, é exatamente o antipadrão que a plataforma já rejeitou nas mesmas circunstâncias — motor de workflow genérico (DEC-010), Action Registry genérico (DEC-021), tabela polimórfica de Entidade (DEC-011). O padrão `intelligence/` por feature já está comprovado em produção por dois módulos reais (Veículos, Motoristas) — estendê-lo para IA em vez de inventar uma segunda forma de organizar a mesma ideia é a opção mais barata e mais consistente com o resto da plataforma.
**Alternativas consideradas:** Motor de IA centralizado/serviço único que todos os módulos chamam — rejeitado, mesma razão de todo motor genérico já rejeitado nesta plataforma (DEC-010/DEC-011/DEC-021): forma desenhada antes de qualquer caso de uso real tende a errar a forma. Não formalizar nada agora, decidir só quando o primeiro caso de IA aparecer — rejeitado; documentação é barata e evita decisão apressada no meio de uma sprint futura, e o Carlos pediu explicitamente a fundação agora.
**Riscos aceitos:** Nenhum residual — é decisão de documentação/arquitetura, sem código associado. Risco teórico: se o primeiro caso real de IA exigir infraestrutura genuinamente compartilhada (ex.: um cliente de chamada a modelo/API externa), essa parte específica sobe para `shared/` normalmente, sem contradizer esta decisão — só a regra de negócio de cada módulo é que nunca deve ser centralizada.
**Revisitar quando:** O primeiro caso real de Nível 3 (Assistentes de IA, ver `AI_PLATFORM.md`, seção 4) for implementado — nesse momento, validar se o padrão `intelligence/` por módulo realmente se sustenta na prática ou se algo genuinamente genérico precisa ser extraído antes do previsto.

## DEC-029 — Coordenação entre Agentes: hierarquia ganha-se (não desenhada antecipadamente), comunicação só via Eventos, nunca chat direto entre agentes

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Rejeitada a proposta original de hierarquia fixa de 4 níveis (Supervisor → Coordenador → Especialista → Executor) para Agentes. Todo Agente nasce como "Especialista", respondendo diretamente ao seu Responsável humano — um papel de Coordenador só nasce quando dois Especialistas atuarem sobre o mesmo domínio/entidade e produzirem risco real de decisão conflitante. Fixado também que nenhum Agente se comunica diretamente com outro Agente — toda coordenação passa pelo mecanismo de Eventos já existente (`CORE_CONCEPTS.md`, seção 5; outbox, `ARQUITETURA.md`, seção 1.13) ou pelo Responsável humano/Coordenador, nunca por chamada direta agente-para-agente.
**Contexto:** Levantado na criação de `AGENT_PLATFORM.md` (constituição oficial dos Agentes), a pedido do Carlos. A proposta original pedia uma arquitetura organizacional completa de 4 camadas e um "modelo de comunicação entre agentes" que evitasse loop, duplicidade, corrida de execução e mensagem infinita.
**Motivo:** Desenhar uma hierarquia de 4 camadas antes de existir um único Agente real é o mesmo antipadrão já rejeitado nesta plataforma em outras circunstâncias — motor de workflow genérico (DEC-010), Action Registry genérico (DEC-021), tabela polimórfica de Entidade (DEC-011), motor de IA centralizado (DEC-028). Quanto à comunicação: a decisão de nunca permitir chat direto entre Agentes elimina, por construção, a origem raiz da maioria dos riscos que o Carlos listou (loop e mensagem infinita só existem onde existe protocolo bidirecional de conversa) — e reaproveita a infraestrutura de Eventos que a plataforma já tem, em vez de inventar um novo mecanismo de mensageria entre agentes.
**Alternativas consideradas:** Hierarquia fixa de 4 níveis desde o início — rejeitada, mesma razão de todo motor genérico já rejeitado. Protocolo de chat/negociação direta entre Agentes (padrão comum em frameworks multiagente) — rejeitado deliberadamente; é a fonte mais comum de loop e corrida em sistemas multiagente, e a plataforma já tem um mecanismo de propagação assíncrona (Eventos) que resolve o mesmo problema sem esse risco.
**Riscos aceitos:** Nenhum residual — é decisão de documentação/arquitetura, sem código associado ainda. Risco teórico: se um caso real futuro genuinamente precisar de negociação bidirecional entre dois Agentes (não apenas reação a evento), essa necessidade específica precisa ser reavaliada quando aparecer — não antes.
**Revisitar quando:** O primeiro caso real de dois Especialistas atuando sobre o mesmo domínio/entidade aparecer (gatilho concreto do nascimento de um Coordenador, ver `AGENT_PLATFORM.md`, seção 5) — ou o primeiro Agente real (`AI_PLATFORM.md`, Nível 4) for implementado, o que vier primeiro.

## DEC-030 — Permissões de Agente: teto nunca excede o papel do Responsável humano; ação financeira e destrutiva nunca são autônomas

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Todo Agente nasce sem nenhuma permissão (default-deny), com permissões concedidas explicitamente por tipo de ação. Fixado como regra permanente: nenhum Agente pode ter permissão mais ampla do que seu Responsável humano teria, no mesmo `role`, fazendo a mesma ação manualmente — o teto de permissão do Agente está amarrado ao RBAC humano da plataforma. Ações financeiras (aprovar pagamento, alterar valor) nunca são autônomas — sempre exigem aprovação humana explícita, caso a caso, até `AI_PLATFORM.md` Nível 4 comprovar confiabilidade suficiente para uma classe específica e de baixo risco. Ações destrutivas/irreversíveis (excluir registro, revogar acesso) e criação de usuário/concessão de acesso nunca são concedidas a nenhum Agente, sem prazo de revisão previsto.
**Contexto:** Levantado na criação de `AGENT_PLATFORM.md`, a pedido do Carlos: "quero um modelo de permissões extremamente seguro."
**Motivo:** Amarrar o teto de permissão do Agente ao papel do Responsável humano evita que um Agente termine com mais poder de fato do que a pessoa que o supervisiona — um risco de escalonamento de privilégio silencioso que só apareceria em produção, tarde demais. Isso também explicita uma dependência crítica já registrada: o teto só é real se `DECISION_LOG.md` DEC-026 (gap de RBAC por role) estiver fechado antes de qualquer Agente entrar em Produção — um teto amarrado a um RBAC que hoje não é aplicado de fato é um teto que não existe.
**Alternativas consideradas:** Permissão por "papel de Agente" genérico, independente do Responsável humano — rejeitada, quebra o vínculo de responsabilidade que a seção 4 de `AGENT_PLATFORM.md` exige (Responsável humano nomeado). Permitir ação financeira autônoma abaixo de um valor de alçada pequeno desde o início — rejeitada por ora; nenhum histórico real de confiabilidade existe ainda para calibrar esse valor com segurança.
**Riscos aceitos:** Nenhum residual — é decisão de documentação/arquitetura, sem código associado ainda.
**Revisitar quando:** `DECISION_LOG.md` DEC-026 for fechado (pré-requisito, não opcional, antes de qualquer Agente real entrar em Produção). Ação financeira autônoma de baixo risco pode ser revisitada quando um Agente específico tiver histórico real e auditável de confiabilidade suficiente (`AGENT_PLATFORM.md`, seção 10 — Produção sustentada, sem incidente).

## DEC-031 — Smart Fleet Platform: camadas em ciclo (ERP é fonte e consumo, não só destino final); Health Score permanece com taxonomia fechada de 5 categorias

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Corrigido o modelo de camadas da Frota Inteligente (`SMART_FLEET_PLATFORM.md`, seção 3) de um pipeline linear terminando em ERP para um ciclo: ERP é fonte de dado na Coleta (contrato, financeiro, manutenção) **e** consumidor final do resultado (Command Center, Cockpit, Dashboard, BI). Fixado também que a taxonomia de 5 categorias do Health Score (`HealthCategoriaId`, DEC-022) permanece fechada — telemetria de bateria, consumo, condução e manutenção entram como evidência mais rica dentro das categorias Operacional/Patrimonial já existentes, nunca como categorias novas.
**Contexto:** Levantado na criação de `SMART_FLEET_PLATFORM.md`, a pedido do Carlos. A proposta original desenhava um pipeline `Coleta → Validação → Normalização → Inteligência → Agentes → ERP` (ERP só como destino) e propunha 6 categorias novas de Health Score (Saúde da bateria, Telemetria, Consumo, Condução, Manutenção, Valor residual) somadas às 3 já existentes.
**Motivo:** O pipeline linear contradizia a própria lista de fontes do mesmo documento (ERP já aparece como fonte, seção 2) e não descrevia o que Vehicle Intelligence já faz hoje em produção (lê do ERP, calcula, devolve para o ERP — DEC-022). Quanto ao Health Score: DEC-022 e DEC-025 já tratam as 5 categorias como vocabulário fechado de negócio, deliberadamente não expandido a cada nova fonte de dado (DEC-025 chegou a rejeitar uma categoria nova só para Motorista, preferindo reaproveitar as 5 existentes) — telemetria é fonte de dado nova, não dimensão de negócio nova.
**Alternativas consideradas:** Manter o pipeline linear como proposto — rejeitado, contradição interna do próprio documento. Criar as 6 categorias novas de Health Score — rejeitado, reverteria uma decisão já tomada duas vezes (DEC-022/DEC-025) sem nenhum caso de uso real que justifique a reversão.
**Riscos aceitos:** Nenhum residual — é decisão de documentação/arquitetura, sem código associado ainda.
**Revisitar quando:** O primeiro caso real de telemetria (Fase 3 de `SMART_FLEET_PLATFORM.md`, seção 9) for implementado — validar se as categorias Operacional/Patrimonial realmente comportam a riqueza do novo dado, ou se uma categoria genuinamente nova se justificar nesse momento, com caso de uso real, não antes.

## DEC-032 — Telemetria de condução exige privacidade por design (LGPD)

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Nenhuma coleta de dado de comportamento de condução (frenagem, velocidade, rota, horário) é implementada sem minimização de dado e sem o motorista informado de que esse dado existe e para que serve — princípio obrigatório, não opcional, registrado em `SMART_FLEET_PLATFORM.md`, seção 10, item 11.
**Contexto:** Levantado na criação de `SMART_FLEET_PLATFORM.md`. A proposta original listava 10 princípios obrigatórios de integração de frota, nenhum deles cobrindo privacidade do dado de condução.
**Motivo:** Telemetria de comportamento humano é dado pessoal sensível sob a LGPD — diferente de telemetria só do veículo (temperatura, falha, consumo agregado), dado de condução describe uma pessoa especificamente. Construir uma plataforma pensada para 10 anos sem esse princípio explícito desde o início é risco real de compliance, não hipótese distante — mesma linha de cuidado já registrada para dado pessoal em `FOUNDATION_PRINCIPLES.md` (Princípio 2, correção sobre Motorista/Cliente) e em `DECISION_LOG.md` DEC-012.
**Alternativas consideradas:** Tratar privacidade como parte genérica de "boas práticas", sem princípio formal específico — rejeitado; a ausência de menção explícita na proposta original é exatamente o tipo de lacuna que este documento existe para evitar.
**Riscos aceitos:** Nenhum residual — é decisão de documentação/arquitetura, sem código ou coleta de dado associada ainda.
**Revisitar quando:** O primeiro caso real de telemetria de condução (GPS, comportamento) for implementado — nesse momento, este princípio precisa virar mecanismo concreto (aviso ao motorista, política de retenção), não antes.

## DEC-033 — Proposta de Valor finalizada a partir de pesquisa de mercado; North Star confirmado; escopo de mercado corrigido para "frota eletrificada"

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Fechada, de forma definitiva, a Proposta de Valor da PrimeCharge (`PRODUCT_VISION.md`) a partir de pesquisa de mercado real (locadoras tradicionais, fleet management com módulo EV, battery analytics — nacional e internacional; raciocínio completo em `claude/analise-posicionamento-proposta-valor.md`, Projects): a PrimeCharge mira o espaço vazio confirmado na interseção entre ERP completo de locadora, inteligência real de saúde de ativo elétrico, e foco no mercado brasileiro — nenhum concorrente pesquisado ocupa essa interseção hoje. Como consequência direta, a condicionalidade de `NORTH_STAR.md` é resolvida: Taxa de utilização da frota confirmada como North Star principal até a Fase 6, com promoção explícita de Receita perdida evitada a North Star principal a partir da Fase 7 (quando BI existir). Corrigido também o escopo de mercado-alvo: de "locadoras 100% elétricas" para "locadoras de frota eletrificada" (100% elétrico + híbrido plug-in) — o primeiro recorte definia um mercado hoje quase inexistente no Brasil.
**Contexto:** Pedido explícito do Carlos: fechar definitivamente a última seção pendente da fundação (`PRODUCT_VISION.md`, Proposta de Valor), com pesquisa de mercado real, análise crítica da arquitetura já construída, e liberdade explícita para propor mudança de direção completa se a pesquisa revelasse posicionamento superior.
**Motivo:** A pesquisa confirmou a tese original em vez de refutá-la — não foi encontrado, entre dezenas de concorrentes (tradicionais e EV-especialistas, nacionais e internacionais), nenhum que combine as três dimensões que a PrimeCharge já está arquitetada para entregar. A honestidade necessária: a PrimeCharge hoje (ago/2026) ainda não entrega esse espaço por completo (faltam Contratos, Financeiro, telemetria real) — a proposta de valor registrada reflete isso explicitamente como aposta de posicionamento e timing bem evidenciada, não como entrega já concluída. Quanto ao North Star: a Proposta de Valor confirmada ("antecipamos risco antes de qualquer outro sistema") corresponde exatamente ao cenário 3 que `NORTH_STAR.md` já havia identificado como o gatilho para promover Receita perdida evitada a métrica principal assim que existir instrumentação — a mudança formaliza um raciocínio que o próprio documento já antecipava, não inventa um novo. Quanto ao escopo: dado real do parque nacional mostra que frota eletrificada em locação hoje é majoritariamente híbrido plug-in, não 100% elétrico puro — restringir a "100% elétrica" definiria, na prática, um mercado quase inexistente.
**Alternativas consideradas:** Manter Missão/Visão/Proposta de Valor como rascunho pendente indefinidamente — rejeitada; Carlos pediu explicitamente o fechamento definitivo, e a pesquisa forneceu evidência suficiente para isso. Propor pivô completo de direção (ex.: virar plataforma de battery analytics pura, sem ERP de locação) — avaliado e rejeitado; a pesquisa mostra que os players de battery analytics mais sofisticados (TWAICE, Volterra) não atendem o caso de uso de locação exatamente porque não têm a camada de ERP por baixo — abandonar o ERP seria abandonar a única vantagem estrutural que a pesquisa confirmou. Declarar a PrimeCharge já como líder do espaço identificado — rejeitada por não ser verdade hoje; a proposta de valor registrada é explícita sobre isso ser uma aposta bem evidenciada, não uma entrega concluída.
**Riscos aceitos:** Janela de execução — entre hoje e o momento em que Contratos, Financeiro e telemetria real existirem, um battery-analytics estrangeiro (Volterra, Electra) poderia decidir entrar em locação, ou um ERP local (Sisloc) poderia integrar um parceiro de battery analytics, fechando a lacuna antes da PrimeCharge. Nenhuma evidência de que isso esteja em andamento hoje, mas é risco a monitorar, não a ignorar. Nenhum risco residual quanto ao North Star ou ao escopo de mercado — ambos são correções de documentação/arquitetura, sem código associado.
**Revisitar quando:** Um concorrente real (nacional ou internacional) anunciar produto ocupando a mesma interseção identificada — reavaliar a Proposta de Valor nesse momento. A promoção do North Star para Receita perdida evitada é reavaliada tecnicamente quando o BI (Fase 7) estiver pronto para calcular a métrica com confiança.

---

## DEC-034 — Módulo Contratos: schema, primeira State Machine de fato validada no banco, Cockpit e Contract Intelligence (Sprint 7)

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Construído `features/contracts/` (Cockpit completo: Header/KPIs/Sidebar/Command Actions/Abas/Dialogs) e `supabase/migrations/0005_modulo_contratos.sql`, no mesmo padrão de Veículos (DEC-022/DEC-023) e Motoristas (DEC-025). Tabela `contratos` liga Empresa → Motorista → Veículo, confirmando DEC-006 em schema (colunas `veiculo_id`/`motorista_id`, sem `cliente_id`). Status modelado como enum fechado de 8 valores (rascunho → em_análise → aprovado → assinado → ativo → renovação → encerrado/cancelado) com transições explícitas — e, pela primeira vez na plataforma, a promessa de `CORE_CONCEPTS.md` seção 2 ("transição inválida é rejeitada no banco, não só escondida na UI") é implementada de fato: `fn_validar_transicao_contrato()` (trigger `BEFORE UPDATE`) rejeita qualquer `UPDATE status` fora da tabela de transições válidas, com `RAISE EXCEPTION`. Veículo e Motorista continuam validando a state machine só no client (constantes TS) — gap pré-existente, não fechado retroativamente nesta sprint (ver "Revisitar quando").
**Contract Intelligence** (`features/contracts/intelligence/`) segue a mesma taxonomia fechada de 5 categorias (`HealthCategoriaId`, DEC-022/DEC-025/DEC-031): `operacional` e `documental` com regra real desde já (mesmo padrão de Veículo/Motorista), e `comercial` também real — primeiro caso do módulo com dado 100% próprio (proximidade da data de fim prevista sem renovação), não emprestado de outro módulo. `patrimonial` e `financeira` permanecem `score: null`/`sem_dado` (dependem de Financeiro, ainda não construído) — nenhum número inventado (regra de Honestidade da sprint). Um alerta liga diretamente à pesquisa de mercado (`claude/pesquisa-mercado-rental-ev-2026.md`, DEC-033): `carga_final_pct < 25` no ato da devolução gera alerta — "veículo elétrico devolvido descarregado e oferecido como disponível" é a dor operacional nº 1 do setor segundo a pesquisa, e nenhum concorrente pesquisado bloqueia ou alerta isso hoje.
**Trigger de propagação de status** — ver DEC-037.
**Fechamento parcial de DEC-026 e DEC-027** — ver DEC-035 e DEC-036, respectivamente.
**Contexto:** Pedido explícito da Sprint 7: "não quero apenas um CRUD, quero o Cockpit do Contrato" — mesmo padrão de qualidade de Veículos/Motoristas/Command Center, com State Machine explícita, Contract Intelligence honesta, e integração com Command Center (DEC-038).
**Motivo:** Contrato é a peça central da Fase 2 (Comercial) — é o que realiza, de fato, o modelo de negócio (locação de veículo elétrico a um motorista). Validar a state machine no banco (não só no client) deixou de ser opcional no momento em que o próprio contrato passou a disparar efeito colateral real em duas outras tabelas (propagação de status, DEC-037) — uma transição inválida vinda de qualquer lugar (bug de UI, chamada direta à API, script) não pode mais corromper o estado de Veículo/Motorista por tabela.
**Alternativas consideradas:** Criar uma entidade `Cliente` separada de `Motorista` — rejeitada, DEC-006 já é definitiva sobre isso. Deixar a state machine só no client, como Veículo/Motorista já fazem — rejeitada especificamente para Contrato porque a propagação de status (DEC-037) torna uma transição inválida não tratada um risco real de dado incorreto em cascata, não só uma UI inconsistente.
**Riscos aceitos:** Veículo e Motorista continuam com state machine validada só no client — inconsistência de rigor entre módulos, aceita nesta sprint porque nenhum dos dois hoje dispara efeito colateral em outra tabela por transição de status (Contrato é o primeiro). `uq_contratos_veiculo_ativo` (um contrato "ativo" por veículo) é índice único parcial — correto para o caso de uso atual, mas seria preciso revisar se o produto um dia permitir múltiplos contratos simultâneos por veículo (ex.: compartilhamento).
**Revisitar quando:** Veículo ou Motorista ganhar seu próprio efeito colateral cross-tabela por transição de status (mesmo gatilho que tornou isso obrigatório para Contrato) — nesse momento, retrofit da validação server-side para os dois. Financeiro (Fase 3) existir — `patrimonial`/`financeira` ganham regra real, KPIs "Pagamentos recebidos"/"Inadimplência" saem de "Em breve".

---

## DEC-035 — Fechamento parcial da DEC-026 (RBAC): `permissoes` finalmente com consumidor real, começando por Contratos

**Data:** 2026-08-05 · **Status:** ativa — fecha DEC-026 só para o módulo Contratos, não retroativamente
**Decisão:** `permissoes` (role × módulo × ação, existente desde a Fase 0 mas sem nenhum consumidor real até aqui — gap formalizado em DEC-026) passa a ser aplicada de fato: `public.pode(p_modulo, p_acao)` (função SQL genérica, `security definer`) lê a role do usuário autenticado e responde `true`/`false` para qualquer par módulo/ação, com `coalesce(..., false)` — ausência de linha na tabela é negação, nunca permissão implícita. `fn_validar_transicao_contrato()` (DEC-034) chama `pode('contratos', <ação correspondente à transição>)` antes de aceitar qualquer mudança de status, e rejeita com `RAISE EXCEPTION` se a role do usuário não tiver a permissão — a checagem vive no banco, não só na UI (ocultar botão continua existindo como UX, mas deixa de ser a única barreira). Matriz seedada para `modulo = 'contratos'`: `super_admin`/`owner`/`admin` têm todas as ações; `gestor_frota` conduz o ciclo operacional completo (ver, criar, editar, enviar_analise, aprovar, assinar, ativar, renovar, encerrar) mas não cancela nem exclui; `gestor_financeiro` só enxerga e registra pagamento; `operador` prepara rascunho e envia para análise, sem decidir aprovação/ativação/encerramento; `motorista` não tem nenhuma permissão de `contratos` (sem portal do motorista ainda, `ARQUITETURA.md` Fase 8).
**Contexto:** DEC-026 (2026-08-05, mesma revisão arquitetural) registrou o gap como "obrigatório fechar antes da Fase 2" sem prescrever como. Contratos é a primeira feature da Fase 2 — o ponto natural de fechar o gap é aqui, não como uma sprint de infraestrutura separada e desacoplada de um caso de uso real.
**Motivo:** Fechar o gap "em geral" (ex.: RLS por role em todo `SELECT`/`UPDATE` de toda tabela) seria a abstração maior que DEC-010 já rejeita por princípio — sem um segundo módulo real usando o mesmo mecanismo, o desenho correto não está claro ainda. Fechar especificamente para as transições de status do Contrato é o caso mais sensível e mais concreto disponível hoje (mudar o status de um contrato tem efeito financeiro/contratual real), e a função `pode()` já nasce genérica o suficiente (module + action) para o próximo módulo (Financeiro, Fase 3) reaproveitar sem redesenho.
**Alternativas consideradas:** Fechar DEC-026 por completo agora, retrofitando `pode_excluir_veiculo`/`pode_excluir_motorista` e todo `UPDATE`/`INSERT` de Veículo/Motorista para passar por `permissoes` — rejeitada, escopo desproporcional ao pedido desta sprint (que é Contratos, não uma sprint de hardening geral) e sem um segundo caso de uso real ainda para validar o desenho de `pode()` antes de generalizar. Continuar sem nenhum enforcement real, adiando de novo — rejeitada, é exatamente o adiamento que DEC-026 já registrou como não aceitável a partir da Fase 2.
**Riscos aceitos:** Veículos e Motoristas continuam com autorização só por lista de roles hardcoded (`pode_excluir_veiculo`/`pode_excluir_motorista`), não pela tabela `permissoes` — DEC-026 permanece formalmente aberto para os dois. Qualquer ação de Contrato que não seja mudança de status (ex.: `UPDATE` de campos como `valor_periodico` sem trocar `status`) ainda não passa por `pode()` — só as transições de state machine estão cobertas; edição de dados do contrato continua liberada para qualquer usuário da empresa (mesma política de `UPDATE` por `empresa_id`, sem checagem de role).
**Revisitar quando:** Financeiro (Fase 3) precisar do mesmo mecanismo — nesse momento, avaliar se `pode()` deve ganhar mais consumidores em Veículos/Motoristas também, fechando DEC-026 por completo. Um `role` diferente de `owner`/`admin` for provisionado para uso real numa empresa-cliente (gatilho que DEC-026 já registrava como não adiável).

---

## DEC-036 — Fechamento da DEC-027 (Observabilidade mínima): captura de erro em produção implementada

**Data:** 2026-08-05 · **Status:** ativa — fecha DEC-027
**Decisão:** Implementada a captura mínima de exceção em produção que DEC-027 exigia antes da Fase 2, com dois lados: (1) banco — tabela `erros_sistema` (`empresa_id`, `usuario_id`, `mensagem`, `stack`, `contexto jsonb`, `url`, `criado_em`), RLS com `INSERT` liberado a qualquer usuário autenticado (é telemetria de sistema, não dado de negócio) e `SELECT` restrito a `super_admin`/`owner`/`admin` da própria empresa; (2) frontend — `shared/lib/errorReporting.ts` (`capturarErro()`, sem dependência de React, nunca lança — uma falha ao reportar não pode virar um novo erro não tratado) mais dois pontos de captura: `shared/components/ErrorBoundary.tsx` (erro de render dentro da árvore React, um só Boundary no topo de `App.tsx`) e `instalarCapturaGlobalDeErros()` (`window.onerror` + `unhandledrejection`, instalado uma vez em `main.tsx`, antes do primeiro render) — cobrindo juntos o que Error Boundaries sozinhos não cobrem (erro de listener de evento, Promise sem `.catch`).
**Contexto:** DEC-027 (2026-08-05, mesma revisão arquitetural) registrou a ausência de qualquer captura de erro como pendência obrigatória antes da Fase 2, deixando a ferramenta em aberto ("provavelmente Sentry ou equivalente").
**Motivo:** A implementação escolhida (tabela própria + captura no client) em vez de uma ferramenta terceira (Sentry) porque: (a) fecha o requisito mínimo real de DEC-027 (captura com stack trace e contexto de usuário/empresa) sem introduzir uma dependência externa nova nem custo recorrente numa fase do produto ainda pré-receita; (b) mantém o dado dentro do próprio Supabase, já com RLS multi-tenant pronto, em vez de enviar stack traces (que podem conter dado sensível de contexto) para um serviço terceiro sem avaliação de compliance prévia; (c) sobrevive a uma troca de ferramenta futura sem retrabalho — se Sentry (ou equivalente) entrar depois, `capturarErro()` é o único ponto que precisaria mudar, não os dois pontos de captura.
**Alternativas consideradas:** Integrar Sentry (ou equivalente) diretamente nesta sprint — avaliada e adiada; DEC-027 já registrava a ferramenta como decisão em aberto, não uma exigência, e a solução com tabela própria fecha o requisito funcional sem essa dependência. Granularidade de Error Boundary por rota/seção (em vez de um só no topo) — rejeitada por ora, sem nenhum caso real registrado de um erro isolado numa tela que devesse deixar o resto do app funcionando; reavaliar se esse caso aparecer.
**Riscos aceitos:** Nenhuma agregação, alerta automático (ex.: e-mail/Slack quando um erro novo aparece) ou dashboard de erro existe ainda — a captura é passiva (grava, mas ninguém é avisado ativamente); alguém precisa consultar `erros_sistema` manualmente. Aceitável para o volume de uso atual (poucos usuários reais), mas deixa de ser suficiente assim que houver usuário de produção real dependendo do sistema no dia a dia — nesse ponto, alerta ativo passa a ser necessário, não só registro passivo.
**Revisitar quando:** Volume de usuários reais em produção justificar alerta ativo em vez de consulta manual — nesse momento, avaliar Sentry (ou equivalente) como camada adicional sobre `capturarErro()`, não substituição da tabela (o registro em `erros_sistema` continua útil como histórico multi-tenant consultável via RLS).

---

## DEC-037 — Trigger de propagação de status: Contrato → Veículo/Motorista, sem Event Bus completo

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** `fn_propagar_status_contrato()` (trigger `AFTER UPDATE` em `contratos`) propaga efeito de mudança de status do Contrato para as duas entidades relacionadas: contrato → `ativo` aluga o veículo (`veiculos.status = 'alugado'`, só se estava `disponivel` ou `reservado`) e ativa o motorista (`motoristas.status = 'ativo'`, só se estava `em_analise`); contrato → `encerrado`/`cancelado` devolve o veículo para `devolvido` (não direto para `disponivel` — a state machine do próprio Veículo já exige uma vistoria de devolução antes de voltar a ficar disponível). Implementado como trigger direto no Postgres, não como um Event Bus/fila de eventos.
**Contexto:** `docs/ARQUITETURA.md` (seção 1.13, já registrada antes desta sprint) já havia adiado deliberadamente um Event Bus completo para a Fase 3 (Financeiro) — "o lugar correto é o banco: trigger Postgres grava num outbox... desenho isso de verdade na Fase 3". Contrato é o primeiro caso real de efeito colateral cross-tabela na plataforma (mudar o status de um contrato precisa mudar o status de outras duas entidades), então a decisão adiada precisou de uma resposta concreta agora.
**Motivo:** Um trigger direto e síncrono é suficiente e mais simples que um outbox/fila para dois efeitos colaterais determinísticos, síncronos e dentro da mesma transação — não há necessidade real de processamento assíncrono, retry, ou desacoplamento entre serviços nesta fase (um outbox resolve um problema — múltiplos consumidores, replay, desacoplamento de deploy — que não existe aqui ainda). Manter a propagação como efeito automático de banco (não uma chamada explícita do frontend após o `UPDATE` de status) garante que ela acontece mesmo se o `UPDATE` vier de qualquer lugar (script, chamada direta à API), não só do fluxo da UI — mesmo raciocínio de robustez que levou `fn_validar_transicao_contrato` a viver no banco (DEC-034).
**Alternativas consideradas:** Implementar o Event Bus/outbox completo já nesta sprint — rejeitada, contradiria a decisão já registrada em `ARQUITETURA.md` de adiar para a Fase 3, sem um segundo consumidor real do "evento contrato mudou de status" hoje (só Veículo/Motorista, ambos resolvidos direto pelo mesmo trigger). Fazer a propagação no frontend (uma segunda chamada `update` explícita após `updateContratoStatus`) — rejeitada, quebraria na hora que o `UPDATE` de status viesse de qualquer lugar fora do fluxo específico da tela (ex.: uma correção manual, um script futuro), e duplicaria a regra "quando ativa, aluga o veículo" em dois lugares (client e potencialmente banco).
**Riscos aceitos:** A propagação é silenciosa — se `UPDATE veiculos ... where status in (...)` não afetar nenhuma linha (porque o veículo já estava em outro status inesperado), o trigger não avisa ninguém, só não propaga. Aceitável hoje porque o `UPDATE` original já passou pela validação de state machine (DEC-034), tornando esse caso extremamente raro (só aconteceria com uma corrida de concorrência entre dois `UPDATE`s simultâneos). Nenhum outbox/histórico de "o que foi propagado e quando" existe fora da timeline genérica (`fn_timeline_contrato`) — se um dia for preciso auditar propagação especificamente, hoje só dá pra inferir pelo `audit_log` de cada tabela.
**Revisitar quando:** Um segundo módulo real precisar reagir a mudança de status de Contrato além de Veículo/Motorista (ex.: Financeiro gerando cobrança quando contrato ativa) — esse é o gatilho concreto que `ARQUITETURA.md` já previa para desenhar o outbox de verdade, não antes.

---

## DEC-038 — Command Center generalizado para múltiplas origens (Veículos, Motoristas, Contratos); gap de Motoristas nunca conectado é fechado junto

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Os cinco Engines de priorização do Command Center (`alertEngine`, `insightEngine`, `actionEngine`, `opportunityEngine`, `riskEngine`) deixam de depender do tipo `VeiculoIntelligenceSnapshot` (que embutia o objeto `veiculo` inteiro) e passam a consumir um formato genérico, `EntityIntelligenceSnapshot` (`origemTipo`/`origemId`/`origemLabel`/`hrefBase` + os 5 resultados de intelligence) — exatamente o gatilho de generalização que a própria DEC-024 já previa ("quando uma segunda feature precisar alimentar os Engines"). Dois novos coletores em lote (mesmo padrão de `fleetIntelligenceCollector.ts`, DEC-024 item 3: N consultas fixas, nunca N+1) foram criados: `driverIntelligenceCollector.ts` e `contractIntelligenceCollector.ts`. `useCommandCenter()` agora busca Veículos, Motoristas e Contratos em paralelo, adapta os três formatos para `EntityIntelligenceSnapshot[]` e alimenta os 5 Engines com o array combinado. `href` de Próxima Ação deixou de ser hardcoded por feature (`/veiculos/${id}/editar`) — qualquer `actionKey` que comece com `"editar"` (convenção já usada por Veículo e Motorista) aponta para `${hrefBase}/editar`, o resto para o Cockpit. **Motoristas nunca havia sido conectado ao Command Center**, apesar de Driver Intelligence existir desde a Sprint 6 (DEC-025) — gap pré-existente identificado durante esta sprint e fechado junto, no mesmo movimento de generalização (não como um "engine de Motorista" à parte). `fleetHealthEngine`/`ResumoFrotaWidget`/`VeiculosListWidget` ("resumo da frota") **não foram tocados** — continuam exclusivamente sobre Veículos, porque não faziam parte do pedido desta sprint e a informação (estado físico de ativo) não faz sentido misturada com Motorista/Contrato.
**Contexto:** Pedido explícito da Sprint 7: "o módulo deve alimentar automaticamente o Command Center... sempre reutilizando os Engines existentes, sem duplicar regras."
**Motivo:** Duplicar os 5 Engines (um "ContractAlertEngine" etc.) para Contratos violaria DEC-023/DEC-025 (nunca copiar código quando o padrão já existe e um segundo/terceiro consumidor real aparece) — a lógica de prioridade (matriz Impacto×Urgência) e de consolidação já é 100% independente de qual feature originou o Alerta/Insight/Ação; só o "envelope" (`veiculo`) precisava deixar de vazar pros Engines. Fechar o gap de Motoristas junto, em vez de registrar e adiar de novo, segue a mesma disciplina já usada com DEC-026/DEC-027 nesta sprint: nomear a lacuna, registrar o risco, e resolver com o menor esforço real possível dentro do trabalho que já está em andamento — não abrir uma sprint separada só para isso.
**Alternativas consideradas:** Criar `EntityIntelligenceSnapshot` como wrapper que também some sobre o tipo `VeiculoIntelligenceSnapshot` original (deprecar o antigo) — rejeitada; `fleetHealthEngine` genuinamente precisa do objeto `veiculo` completo (categoria, valores, status) para "Veículos Críticos"/"Veículos Destaque", então manter os dois formatos (um completo para esse caso, um genérico para os 5 Engines) é mais simples que forçar tudo por um tipo só que ninguém usa por inteiro. Adicionar um `if (origemTipo === 'veiculo')` dentro de cada Engine em vez de um formato genérico — rejeitada, reintroduziria acoplamento a features específicas exatamente onde DEC-024 já havia conseguido eliminá-lo.
**Riscos aceitos:** `useCommandCenter()` agora dispara 3 buscas de lista (Veículos/Motoristas/Contratos) + 3 buscas de intelligence em lote (4+4+3 consultas batched) em paralelo — mais chamadas de rede no carregamento da Home do que antes (só Veículos). Aceitável para o volume esperado nesta fase (mesmo racional de risco aceito já registrado em DEC-024 item/"Riscos aceitos" para o crescimento de volume por consulta); se ficar lento com dado real de produção, o próximo passo é paralelizar com `Promise.all` mais agressivo ou paginar/cachear, não voltar a buscar só uma origem.
**Revisitar quando:** Um quarto módulo (Financeiro, Compras) precisar alimentar os Engines — `EntityIntelligenceSnapshot` já deveria bastar sem mudança de formato, só um quarto coletor. Carregamento da Home degradar com volume real de produção (frota + motoristas + contratos grandes simultaneamente).

---

## DEC-039 — Exceção complementar à DEC-008/DEC-024: hooks de leitura de listagem entre features de negócio, escopo estreito e explícito

**Data:** 2026-08-05 · **Status:** ativa
**Decisão:** Reconhecida e formalizada uma segunda exceção pontual à regra de ouro de DEC-008 ("feature nunca importa de outra feature direto, só via `shared/`"), complementar à exceção já registrada em DEC-024 (que cobre só o barril `intelligence/index.ts`, funções puras de cálculo): features de negócio podem importar, diretamente de outra feature, **hooks de leitura de listagem** (`useVeiculos`, `useMotoristas`, `useContratos` — sempre a variante de consulta, nunca mutação) quando o propósito é popular uma relação real entre entidades (dropdown de seleção num formulário) ou agregar dado de múltiplas origens (Command Center). Continuam proibidos, sem exceção: importar componentes de UI, funções de `api/` que escrevem, ou qualquer lógica de negócio de outra feature. Dois usos concretos cobertos por esta exceção: `ContratoForm` (`features/contracts/`) importa `useVeiculos`/`useMotoristas` para popular os selects de Veículo/Motorista do formulário de contrato; `useCommandCenter` (`features/command-center/`) importa `useVeiculos`/`useMotoristas`/`useContratos` para obter as três listas de entidades antes de rodar os coletores de intelligence (DEC-038).
**Contexto:** Ao construir `ContratoForm.tsx` nesta sprint, a necessidade de listar Veículos e Motoristas reais para os selects de seleção esbarrou de frente na regra de ouro de DEC-008 — e a revisão crítica desta mesma sprint encontrou que `useCommandCenter.ts` já importava `useVeiculos` diretamente de `features/frota/hooks/` **desde a Sprint 5** (DEC-024), sem nunca ter sido registrado como exceção — só o barril de `intelligence/` foi formalizado, não os hooks de listagem que o próprio Command Center sempre precisou para obter a lista de veículos a processar. Esta entrada corrige essa lacuna de registro (a prática já existia, silenciosa) e estende o mesmo raciocínio ao novo caso real de `ContratoForm`.
**Motivo:** DEC-006 já decidiu que Contrato liga diretamente Veículo e Motorista — um formulário de Contrato que não consegue listar veículos/motoristas reais para vincular não cumpre a própria decisão que justifica a existência do módulo. Recriar essas listas dentro de `features/contracts/` (duplicando `listVeiculos`/`listMotoristas`) violaria DEC-023 (nunca copiar código) muito mais diretamente do que importar o hook de leitura já existente. A alternativa "mover `useVeiculos`/`useMotoristas` para `shared/`" foi avaliada e rejeitada: eles não são genéricos (retornam tipos específicos do domínio Veículo/Motorista, com filtros específicos do domínio) — mover pra `shared/` só pra contornar a regra seria abstração forçada, o oposto do que DEC-010 pede.
**Alternativas consideradas:** Duplicar `listVeiculos`/`listMotoristas` dentro de `features/contracts/api/` — rejeitada, viola DEC-023 de forma mais direta do que a exceção proposta. Criar uma API dedicada em `shared/` só para "listagem básica de referência" (`shared/api/referencias.ts`, retornando `{id, label}` genérico para qualquer entidade) — avaliada e adiada por ora: seria a abstração correta no longo prazo (um único ponto para popular qualquer select de referência cross-feature), mas hoje só há 2 consumidores reais (Veículo e Motorista, ambos só para o caso de Contrato) — não atinge a "regra dos 3" (DEC-010) para justificar a extração agora. Revogar a regra de ouro de DEC-008 de forma ampla — rejeitada, o valor de "feature não quebra outra feature ao mudar" continua real para o resto do vocabulário (componentes, `api/` de escrita, regra de negócio).
**Riscos aceitos:** Uma mudança de assinatura em `useVeiculos`/`useMotoristas`/`useContratos` agora pode quebrar consumidores em `features/contracts/` e `features/command-center/`, não só na feature de origem — acoplamento real, aceito porque é estreito (só leitura de lista, tipos já estáveis desde Sprint 2/6) e explícito (registrado aqui, não descoberto por acidente num build quebrado). Se um quarto ou quinto caso real de "preciso listar entidade de outra feature" aparecer, a extração para `shared/api/referencias.ts` (rejeitada acima por não atingir a regra dos 3) deve ser reconsiderada — nesse ponto ela atinge o critério.
**Revisitar quando:** Um terceiro consumidor real de "listar entidade de outra feature para popular relação/agregação" aparecer além de `ContratoForm`/`useCommandCenter` (ex.: Financeiro precisando listar Contratos) — nesse momento, reavaliar `shared/api/referencias.ts` como extração genérica, já com 3 casos reais para desenhar corretamente. Qualquer um dos hooks cobertos por esta exceção precisar de uma mutação (não só leitura) por outra feature — isso NÃO está coberto por esta decisão e exige uma exceção nova, mais estreita ainda, ou uma API dedicada.
