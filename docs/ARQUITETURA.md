# PrimeCharge OS — Documento de Arquitetura (v1)
### Fase 0 — Planejamento. Nenhum código foi escrito.

---

## Resumo executivo

Este documento define a fundação técnica do PrimeCharge OS: um ERP multi-tenant para empresas de locação de veículos elétricos, pensado para escalar de 1 para centenas de empresas-cliente sem refatoração estrutural.

Três decisões deste documento divergem ou detalham o que foi pedido, e estão marcadas com 🔶 **[Decisão de CTO]** ao longo do texto — cada uma com motivo, risco e alternativa. O resto segue exatamente o solicitado.

Formato de confiança usado: **[Certo]** = prática documentada/consolidada, **[Provável]** = recomendação forte baseada em padrão de mercado, **[Palpite]** = suposição que depende de contexto de negócio que só você tem.

---

# ETAPA 1 — ARQUITETURA COMPLETA DO SISTEMA

## 1.1 Visão geral

```
┌─────────────────────────────────────────────┐
│  Vercel (CDN + hosting estático)             │
│  React + TypeScript + Vite (SPA)             │
└───────────────────┬───────────────────────────┘
                    │ HTTPS (REST/RPC via supabase-js)
┌───────────────────▼───────────────────────────┐
│  Supabase                                     │
│  • Postgres (dados + RLS)                     │
│  • Auth (JWT)                                 │
│  • Storage (arquivos)                         │
│  • Edge Functions (lógica sensível/pesada)     │
└─────────────────────────────────────────────┘
```

O frontend é uma SPA que fala diretamente com o Supabase. Não existe um backend Node/Express intermediário — a segurança vive no banco (RLS), não em uma API que poderíamos esquecer de proteger. Isso é o modelo "BaaS-first" e é o que o Supabase foi desenhado para fazer bem.

🔶 **[Decisão de CTO — Vite/SPA vs. Next.js]**
Você especificou Vite. Eu testei essa escolha antes de aceitar, porque normalmente eu perguntaria "vocês vão precisar de SSR/SEO?" — e a resposta aqui é não: o PrimeCharge OS é um sistema logado, interno às empresas-cliente, sem necessidade de indexação no Google. Next.js adicionaria complexidade (server components, cache de rota, runtime de servidor) sem benefício real para este caso. **A escolha sobreviveu ao teste — Vite é a decisão correta aqui.** [Certo]
Ressalva: se no futuro vocês quiserem um site público de marketing/vendas do SaaS (`primecharge.com` institucional, com SEO), isso deve ser um projeto **separado** (Next.js ou até um site estático simples), nunca misturado com o app logado. Decisão a tomar quando isso vier a existir, não agora.

## 1.2 Estrutura de pastas

Modelo: **feature-based** (por domínio de negócio), não por tipo de arquivo. Isso é o que permite baixo acoplamento — cada módulo (Frota, Contratos, Financeiro...) pode evoluir, ser testado e até ser removido sem tocar nos outros.

```
src/
├── app/                      # bootstrap: main.tsx, App.tsx, providers globais
│   ├── providers/            # QueryClientProvider, AuthProvider, ThemeProvider
│   └── router/                # definição de rotas (React Router)
│
├── features/                  # um diretório por domínio de negócio
│   ├── auth/
│   ├── empresas/               # gestão do tenant
│   ├── usuarios/                # usuários, perfis, permissões
│   ├── frota/                   # veículos, marcas, modelos
│   ├── manutencao/
│   ├── documentos-veiculo/      # licenciamento, IPVA, seguro
│   ├── motoristas/
│   ├── contratos/
│   ├── financeiro/              # contas, receitas, despesas, centro de custos
│   ├── compras/                 # fornecedores, compras, financiamento, consórcio
│   ├── multas-sinistros/
│   ├── agenda/
│   └── dashboard/
│       cada feature/xxx contém:
│       ├── api/                # funções que chamam supabase-js (data access)
│       ├── components/          # componentes só usados aqui
│       ├── hooks/                # hooks React Query específicos da feature
│       ├── schemas/              # validação Zod
│       ├── types/
│       └── pages/                # telas roteadas
│
├── shared/                     # o que é genuinamente reutilizável entre features
│   ├── components/ui/           # shadcn/ui (Button, Input, Table, Dialog...)
│   ├── components/layout/       # Sidebar, Topbar, PageHeader
│   ├── hooks/
│   ├── lib/                     # supabase client, utils, formatters
│   └── types/                   # tipos globais (ex.: tipos gerados do Supabase)
│
├── config/                     # constantes, feature flags, variáveis de rota
└── styles/
```

Regra de ouro: **uma feature nunca importa componentes internos de outra feature diretamente** — só via `shared/`. Isso é o que evita o "efeito bola de neve" onde mexer em Contratos quebra Financeiro.

## 1.3 Padrões e convenções

- **Nomenclatura de arquivos**: `kebab-case` para arquivos (`vehicle-list.tsx`), `PascalCase` para componentes React, `camelCase` para funções/variáveis.
- **Data access**: toda chamada ao Supabase passa por uma função em `features/xxx/api/` — nenhum componente chama `supabase.from(...)` diretamente. Isso cria uma camada de repositório fina, que facilita trocar de estratégia de cache, adicionar logging, ou (no limite) trocar de banco sem reescrever telas inteiras.
- **Estado de servidor**: sempre TanStack Query (cache, retry, invalidação). **Nunca** guardar dado de servidor em `useState`.
- **Estado de UI**: `useState`/`useReducer` local; Context só para estado realmente global (sessão do usuário, tema, empresa ativa).
- **Formulários**: React Hook Form + Zod, schema de validação sempre no mesmo diretório da feature, reaproveitado no client E, quando possível, espelhado nas constraints do banco.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) — necessário para manter histórico legível conforme o time crescer.
- **Branches**: `main` (produção) ← `dev` (integração) ← `feature/nome-da-feature`. Você pediu para trabalharmos direto na `main` por enquanto (dia 1, repo vazio, sem risco) — no momento em que o app estiver em produção com dados reais, vou reforçar a recomendação de voltar a usar `dev` + PRs, porque nesse ponto um commit quebrado na main derruba o sistema de empresas reais.

## 1.4 Aliases

```
@/           → src/
@/features   → src/features
@/shared     → src/shared
@/config     → src/config
```
Configurado no `vite.config.ts` e espelhado no `tsconfig.json`. Evita `../../../../shared/lib/utils`.

## 1.5 Estratégia de autenticação

Supabase Auth, e-mail + senha como método principal (adequado para times internos de empresas B2B). JWT emitido pelo Supabase carrega `user_id` e é usado em toda chamada. Sessão gerenciada pelo `supabase-js` client (refresh automático de token).

🔶 **[Decisão de CTO — claim de tenant no JWT]** Vou adicionar `empresa_id` (e o `role`) como **custom claim** no JWT via Postgres function/hook do Supabase (Auth Hooks), em vez de buscar isso do banco a cada requisição. Motivo: performance (evita um SELECT extra em toda chamada) e permite que as políticas de RLS leiam o `empresa_id` direto do token. Risco de não fazer isso: cada policy RLS precisaria de subquery, o que fica lento com centenas de empresas e milhares de veículos. [Provável]

## 1.6 Estratégia de autorização (RBAC)

Dois níveis, nunca só um:
1. **RLS no Postgres** — a barreira de verdade. Nenhuma linha de nenhuma tabela é visível ou editável fora da `empresa_id` do usuário logado, e algumas ações exigem role mínimo. Isso vale mesmo que exista um bug na tela.
2. **UI condicional** — esconder/desabilitar botões conforme permissão, só para experiência do usuário (não é segurança).

Roles previstos (ajustável na Etapa 2 se você quiser outra granularidade):
`super_admin` (equipe PrimeCharge, acesso entre empresas — suporte/operação do SaaS) → `owner` (dono da empresa-cliente) → `admin` → `gestor_frota` / `gestor_financeiro` (permissões por módulo) → `operador` → `motorista` (acesso restrito ao próprio contrato/veículo, se o app tiver um portal do motorista no futuro).

Tabela `permissoes` fina (não hardcoded em `if role === 'admin'` espalhado pelo código) — permite ajustar quem pode o quê sem deploy.

## 1.7 Estratégia multi-tenant

🔶 **[Decisão de CTO — schema compartilhado + RLS, não schema-per-tenant]**
Existem duas abordagens clássicas: (a) um schema/banco por empresa, ou (b) schema único com `empresa_id` em toda tabela + RLS. Eu escolho **(b)**. [Certo — é a recomendação oficial do Supabase para SaaS multi-tenant, e é o padrão usado por praticamente todo SaaS B2B em Postgres]

- **Motivo**: schema-per-tenant parece "mais isolado", mas não escala operacionalmente — rodar uma migration em 300 schemas, monitorar 300 conexões, fazer backup de 300 bancos é um pesadelo de manutenção que cresce linearmente com cada cliente novo.
- **Risco do schema único**: um bug de RLS pode vazar dado entre empresas. Mitigação: toda tabela nova nasce com RLS habilitado por padrão (nunca criamos tabela sem policy), e testamos policies com um checklist antes de cada deploy.
- **Alternativa que eu rejeito, mas registro**: schema-per-tenant só faria sentido se vocês tivessem 2-3 clientes enterprise gigantes pagando por isolamento físico total (ex.: exigência contratual/compliance). Não é o caso descrito.

Toda tabela de negócio tem `empresa_id uuid not null references empresas(id)`. Índice composto começando por `empresa_id` em toda tabela de alto volume (ex.: `(empresa_id, status)`).

## 1.8 Estratégia de auditoria

Tabela `audit_log` genérica: `id, empresa_id, tabela, registro_id, acao (insert/update/delete), dados_antigos jsonb, dados_novos jsonb, usuario_id, criado_em`. Populada por trigger Postgres genérico (`AFTER INSERT/UPDATE/DELETE`) aplicado nas tabelas sensíveis (contratos, pagamentos, veículos, usuários) — não em todas, para não gerar ruído. [Provável — é o padrão para ERPs com exigência de rastreabilidade financeira]

## 1.9 Estratégia de logs

- **Frontend**: erros de runtime capturados e reportados (recomendo Sentry — free tier cobre o início; decisão de adicionar quando o app for para produção real, não bloqueia a Fase 0).
- **Backend/banco**: logs nativos do Supabase (Postgres logs, Auth logs) via `get_logs`, que eu já tenho acesso direto para investigar problemas sem te pedir nada.
- **Deploy**: logs de build/runtime da Vercel, também acessíveis diretamente por mim.

## 1.10 Estratégia para arquivos

Supabase Storage, buckets segmentados por tipo de conteúdo (não por empresa — o isolamento é via policy, não via bucket, senão teríamos que criar bucket a cada empresa nova):
`veiculos-documentos`, `veiculos-fotos`, `contratos-arquivos`, `sinistros-evidencias`, `avatares`.
Caminho dentro do bucket sempre prefixado por `empresa_id/` e policy de Storage restringindo leitura/escrita a esse prefixo — mesmo princípio do RLS aplicado a arquivo.

## 1.11 Estratégia de notificações

Fase inicial: notificações in-app (tabela `notificacoes`, lidas via Realtime do Supabase) + e-mail transacional (vencimento de contrato, IPVA, seguro, manutenção agendada) via Resend ou SMTP do próprio Supabase.
Fora de escopo agora, mas desenhado para caber depois sem retrabalho: WhatsApp/SMS (existe integração Twilio disponível quando vocês decidirem priorizar isso).

## 1.12 Estratégia de escalabilidade

- Paginação sempre keyset (`where id > cursor`), nunca `OFFSET` puro em tabelas grandes.
- Índices compostos por `empresa_id` + coluna de filtro mais comum de cada tabela.
- TanStack Query com cache e `staleTime` configurado por tipo de dado (dado de cadastro muda pouco → cache longo; dado financeiro → cache curto).
- Code-splitting por rota (Vite faz isso nativamente com `React.lazy` + rotas) — o bundle inicial não cresce conforme o ERP cresce em módulos.
- Edge Functions do Supabase para qualquer processamento pesado (geração de relatório, cálculo em lote) — nunca bloquear a UI esperando um cálculo pesado no client.

---

# ETAPA 2 — MODELAGEM DE DOMÍNIO

Sem tabelas ainda — só entidades e relações, como pedido.

## 2.1 Ponto que preciso que você resolva antes da Etapa 5

⚠️ Na sua lista de entidades aparece **Motorista**, mas não aparece **Cliente**. Isso muda o modelo de contrato de forma estrutural, então preciso confirmar:

- **Modelo A**: a empresa (tenant) loca o veículo **diretamente para o motorista** (ex.: motorista de app tipo Uber/99 aluga o carro elétrico direto da PrimeCharge). Motorista = Cliente. → 1 entidade.
- **Modelo B**: a empresa loca para um **Cliente PJ/PF** que por sua vez **aloca motoristas** aos veículos (ex.: uma frota B2B onde o cliente empresarial gerencia vários motoristas). → Cliente e Motorista são entidades **separadas**, e o Contrato se relaciona ao Cliente, não direto ao Motorista.

Vou seguir com o **Modelo A** (Motorista = Cliente final) por enquanto, porque é o que a sua lista original sugere e é o modelo mais comum em locação de EV para motoristas de aplicativo no Brasil. [Palpite — depende do seu modelo de negócio real] **Se for o Modelo B, me avisa antes da aprovação final**, porque isso muda a tabela `contratos` e as regras de permissão do módulo Comercial.

## 2.2 Entidades por área

**Tenancy & Acesso**
`Empresa` (tenant) · `Usuario` · `Perfil` (role) · `Permissao` · `Convite` (convite pendente de usuário para a empresa)

**Pessoas**
`Socio` · `Funcionario` · `Motorista` (= cliente final, ver 2.1)

**Frota**
`Veiculo` · `Modelo` · `Marca` · `Fornecedor` · `Compra` · `Financiamento` · `Consorcio` · `Documento` (genérico, polimórfico) · `Licenciamento` · `IPVA` · `Seguro` · `Sinistro` · `Multa` · `Manutencao` · `Checklist` (vistoria de entrega/devolução) · `Vacancia` (período em que o veículo ficou parado/disponível, usado para indicador de ociosidade)

**Comercial**
`Contrato` · `Agenda` (compromissos: manutenção agendada, devolução, vistoria, renovação de documento)

**Financeiro**
`Pagamento` · `Receita` · `Despesa` · `ContaBancaria` · `CentroDeCusto`

**Sistema (transversal, não é módulo de negócio)**
`AuditLog` · `Notificacao` · `Indicador` (calculado/materializado, não é uma entidade "digitada" pelo usuário)

## 2.3 Relacionamentos principais

- `Empresa` 1—N tudo (todo o resto pertence a uma empresa — é a raiz do multi-tenant).
- `Usuario` N—N `Perfil` (via tabela de associação, um usuário pode ter mais de um perfil); `Perfil` 1—N `Permissao`.
- `Veiculo` N—1 `Modelo` N—1 `Marca`; `Veiculo` N—1 `Fornecedor` (via `Compra`).
- `Compra` 1—1 `Veiculo` (a compra que originou o veículo na frota); `Compra` 1—0/1 `Financiamento` OU 1—0/1 `Consorcio` (mutuamente exclusivos — um veículo é financiado OU consorciado OU pago à vista).
- `Veiculo` 1—N `Manutencao`, 1—N `Multa`, 1—N `Sinistro`, 1—N `Documento`, 1—N `Licenciamento`/`IPVA` (histórico anual), 1—N `Checklist`, 1—N `Vacancia`.
- `Contrato` N—1 `Veiculo`, N—1 `Motorista`, 1—N `Pagamento`, 1—N `Checklist` (vistoria de início e fim de contrato).
- `Pagamento` gera `Receita` (se é o cliente pagando a PrimeCharge) ou está associado a uma `Despesa` (se é a empresa pagando fornecedor/financiamento) — ambos amarrados a `ContaBancaria` e opcionalmente a `CentroDeCusto`.
- `Financiamento`/`Consorcio` geram `Despesa` recorrente (parcela).
- `Agenda` é polimórfica: referencia `Manutencao`, `Licenciamento`, `Contrato` (renovação/devolução) — um compromisso, várias origens possíveis.
- `AuditLog` referencia qualquer tabela sensível via `(tabela, registro_id)`.

---

# ETAPA 3 — MAPA COMPLETO DO SISTEMA

## 3.1 Navegação (sidebar por módulo)

```
📊 Dashboard
🚗 Frota
   ├─ Veículos (lista, ficha do veículo)
   ├─ Marcas e Modelos
   ├─ Manutenções
   ├─ Documentos (Licenciamento, IPVA, Seguro)
   └─ Multas e Sinistros
🤝 Comercial
   ├─ Motoristas / Clientes
   ├─ Contratos
   ├─ Checklists (vistorias)
   └─ Agenda
💰 Financeiro
   ├─ Visão Geral (fluxo de caixa)
   ├─ Receitas
   ├─ Despesas
   ├─ Contas Bancárias
   └─ Centros de Custo
🛒 Compras & Ativos
   ├─ Fornecedores
   ├─ Compras
   └─ Financiamentos / Consórcios
👥 Equipe
   ├─ Usuários
   ├─ Sócios e Funcionários
   └─ Perfis e Permissões
⚙️ Configurações
   ├─ Dados da Empresa
   ├─ Auditoria (log de ações)
   └─ Notificações
```

## 3.2 Telas por módulo (padrão repetido: Lista → Detalhe/Ficha → Formulário)

- **Dashboard**: KPIs (veículos ativos/ociosos, contratos vencendo, inadimplência, receita x despesa do mês, alertas de documento vencendo).
- **Veículos**: lista com filtro/busca, ficha do veículo (aba Dados, aba Documentos, aba Histórico de Manutenção, aba Contrato Atual, aba Financeiro do veículo), formulário de cadastro/edição.
- **Contratos**: lista (com status: ativo, encerrado, inadimplente), ficha do contrato (dados, veículo vinculado, motorista vinculado, pagamentos, checklists), formulário de novo contrato (fluxo guiado: seleciona veículo disponível → seleciona/cadastra motorista → define condições → gera checklist de entrega).
- **Motoristas/Clientes**: lista, ficha (documentos, histórico de contratos, pendências), formulário.
- **Financeiro**: visão geral (gráfico fluxo de caixa), lista de lançamentos (receita/despesa) com filtro por centro de custo, tela de conciliação bancária (futuro).
- **Manutenções**: lista/calendário, ficha da manutenção (veículo, oficina, custo, peças), formulário.
- **Multas/Sinistros**: lista, ficha (veículo, motorista responsável no momento, valor, status de recurso).
- **Equipe**: lista de usuários, tela de convite, matriz de permissões por perfil (visual, tipo checklist de módulo x ação).
- **Auth**: Login, Recuperar senha, Aceitar convite/Cadastro, **Onboarding de nova empresa** (tela especial: cria a `Empresa`, o primeiro `Usuario` como `owner`, e um wizard curto de configuração inicial — essencial para o futuro SaaS self-service).

---

# ETAPA 4 — ROADMAP DE DESENVOLVIMENTO

## 4.1 Fases (cada uma sobe funcional, ninguém espera "tudo pronto" para ver algo rodando)

**Fase 0 — Fundação** (pré-requisito de tudo)
Setup do projeto, design system base (shadcn configurado, layout com sidebar), autenticação, multi-tenant skeleton (`Empresa`, `Usuario`, `Perfil`, `Permissao`, RLS básico), onboarding de empresa.

**Fase 1 — Frota (núcleo)**
`Veiculo`, `Marca`, `Modelo`, `Fornecedor`, `Compra`. Sem isso, nenhum outro módulo tem o que referenciar.
*Depende de*: Fase 0.

**Fase 2 — Comercial**
`Motorista`, `Contrato`, `Checklist`. É o módulo que gera receita — prioridade alta assim que a frota existir.
*Depende de*: Fase 1 (precisa de Veículo).

**Fase 3 — Financeiro**
`ContaBancaria`, `CentroDeCusto`, `Receita`, `Despesa`, `Pagamento`.
*Depende de*: Fase 2 (Pagamento nasce do Contrato).

**Fase 4 — Documentação & Compliance da Frota**
`Documento`, `Licenciamento`, `IPVA`, `Seguro`, `Sinistro`, `Multa`, `Manutencao`, `Agenda`.
*Depende de*: Fase 1 (Veículo já precisa existir); pode rodar em paralelo com Fase 3.

**Fase 5 — Ativos & Aquisição**
`Financiamento`, `Consorcio` (ligados à `Compra` da Fase 1, mas geram `Despesa` — por isso vêm depois do Financeiro).
*Depende de*: Fase 1 e Fase 3.

**Fase 6 — Equipe & Governança**
`Socio`, `Funcionario`, matriz de permissões refinada (a base de `Usuario`/`Perfil` já existe desde a Fase 0 — aqui é o refinamento).
*Depende de*: Fase 0.

**Fase 7 — Indicadores & Dashboard**
KPIs consolidados, relatórios. Só faz sentido com dado real das fases anteriores alimentando.
*Depende de*: Fases 1–5.

**Fase 8 — Auditoria avançada, notificações, preparação comercial do SaaS**
Billing entre empresas, portal do motorista (se decidido), WhatsApp/e-mail avançado.
*Depende de*: tudo.

## 4.2 Riscos

- **Maior risco**: RLS mal configurado vazando dado entre empresas — mitigado com checklist de policy obrigatório antes de cada tabela nova ir ao ar. [Certo — é o risco #1 de qualquer SaaS multi-tenant]
- **Segundo risco**: ambiguidade Cliente/Motorista (Etapa 2.1) não resolvida antes da Fase 2 — pode forçar migration de schema no meio do caminho. Resolver **antes** da aprovação.
- **Terceiro risco**: você pediu "tudo, sem deixar nada pra trás" — reforço o ponto que já registrei: mesmo modelando o domínio inteiro agora, vou **entregar em fases**, porque tentar codar as 8 fases em paralelo sem nada em produção é o cenário onde progresso técnico e progresso de negócio mais se confundem.

## 4.3 Prioridade sugerida (se eu tivesse que cortar por tempo)
Fase 0 → 1 → 2 → 3 são inegociáveis (é o motor de receita). Fases 4–8 podem ser reordenadas conforme o que gerar mais valor pro negócio primeiro — essa é uma decisão sua, não técnica, e prefiro que você a tome quando cada fase anterior estiver rodando de verdade.

---

# ETAPA 5 — APROVAÇÃO

Não escrevi nenhuma linha de código. Antes de eu começar:

1. **Confirma o Modelo A ou B** da questão 2.1 (Motorista = Cliente, ou são entidades separadas)?
2. **Arquitetura aprovada** para eu começar pela Fase 0?
