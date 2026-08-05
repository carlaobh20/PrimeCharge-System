# PrimeCharge OS

Sistema de gestão (ERP) para empresas de locação de veículos elétricos.

## Status atual: Fase 1 — Sprint 1 (módulo Veículos)

Fundação (auth/tenancy/auditoria) e primeiro módulo de negócio completo: cadastro, listagem, detalhe e edição de veículos, com as capacidades genéricas (fotos, documentos, timeline, comentários, tags, favoritos) conectadas.

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
