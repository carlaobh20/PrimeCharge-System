# PrimeCharge OS

Sistema de gestão (ERP) para empresas de locação de veículos elétricos.

## Status atual: Fase 1 — Sprint 6 (Cockpit do Motorista)

Fundação (auth/tenancy/auditoria) e módulo Veículos completo (Sprint 1: cadastro, listagem, detalhe, edição). Sprint 2 transformou a ficha do veículo em "Cockpit do Ativo" (DEC-021). Sprint 3 deu ao veículo uma camada de inteligência operacional própria — `src/features/frota/intelligence/`: Health Score (5 categorias), Insights, Alertas, Próximas Ações e Comparativo com a frota, tudo desacoplado da UI (DEC-022). Sprint 4 formalizou "Intelligence First" como princípio de plataforma e componentizou os Cards de exibição em `src/shared/components/intelligence/` (DEC-023). Sprint 5 criou o **Command Center** (`src/features/command-center/`) — nova Home do sistema, com 6 Engines (Alert/Insight/Opportunity/Risk/Priority/Action) que consolidam a inteligência de toda a frota em blocos de decisão (Prioridades do Dia, Alertas, Oportunidades, Riscos, Próximas Ações, Insights, Resumo da Frota, Veículos Críticos/Destaque). O Dashboard (`/dashboard`) deixou de ser a tela inicial e virou exclusivamente analítico — ver DEC-024. Sprint 6 construiu o **Cockpit do Motorista** (`src/features/motoristas/`) — segundo Cockpit da plataforma, no mesmo padrão do Veículo: Header/KPIs/Abas/Sidebar/Command Actions, e uma **Driver Intelligence** própria (`src/features/motoristas/intelligence/`) espelhando Vehicle Intelligence. Confirmou DEC-006 (Motorista = Cliente final, Modelo A) e consolidou o padrão de hoisting pra `shared/` (KpiCard, ConfirmDialog, PlaceholderActionDialog, useCopyPageLink, Opportunity/Risk, gerarRiscos) — ver DEC-025.

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura, modelagem de domínio, mapa de telas e roadmap completo.
- [`FOUNDATION_PRINCIPLES.md`](FOUNDATION_PRINCIPLES.md), [`CORE_CONCEPTS.md`](CORE_CONCEPTS.md), [`DECISION_LOG.md`](DECISION_LOG.md), [`PRODUCT_VISION.md`](PRODUCT_VISION.md), [`NORTH_STAR.md`](NORTH_STAR.md), [`VALUE_ENGINE.md`](VALUE_ENGINE.md) — documentos de fundação da plataforma.

## Stack

React + TypeScript + Vite (SPA) · Supabase (Postgres, Auth, Storage, Edge Functions) · TailwindCSS + shadcn/ui · React Router · TanStack Query · React Hook Form + Zod · Deploy via Vercel.

## Rodando localmente

```
npm install
cp .env.example .env.local   # preencha com a URL e a publishable key do Supabase
npm run dev
```

## Estrutura de pastas

Modelo feature-based — detalhes completos em `docs/ARQUITETURA.md`, seção 1.2.
