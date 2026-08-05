# PrimeCharge OS

Sistema de gestão (ERP) para empresas de locação de veículos elétricos.

## Status atual: Fase 0 — Fundação

Scaffold inicial do app criado. Ainda não há telas reais de negócio — isso começa na Fase 1 (Frota).

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura, modelagem de domínio, mapa de telas e roadmap completo.

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
