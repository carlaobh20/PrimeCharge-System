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
