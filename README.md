# PrimeCharge OS

Sistema de gestão (ERP) para empresas de locação de veículos elétricos.

## Status atual: Fase 1 — Sprint 2 (Cockpit do Ativo)

Fundação (auth/tenancy/auditoria) e módulo Veículos completo (Sprint 1: cadastro, listagem, detalhe, edição). Sprint 2 transformou a ficha do veículo em "Cockpit do Ativo": header premium, faixa de KPIs, 9 abas (Dados Gerais, Timeline, Arquivos, Comentários, Financeiro, Indicadores, Eventos, Histórico, Configurações), sidebar direita e Command Actions — ver DEC-021 em `DECISION_LOG.md`.

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
