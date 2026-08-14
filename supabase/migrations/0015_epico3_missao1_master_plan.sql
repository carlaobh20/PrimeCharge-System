-- Épico 3 — Missão 1: Planejamento Mestre da Empresa, primeira fatia (2026-08-09).
--
-- Extensão de `politicas_empresa` (não uma tabela nova) — ela já é o singleton "DNA da
-- empresa" por empresa_id (ver migration 0014). Missão/Visão e as frentes de negócio futuras
-- que o proprietário está considerando são, na prática, mais uma faceta do mesmo DNA, não um
-- conceito novo que precise de tabela própria — mesmo raciocínio já registrado lá.
--
-- `linhas_de_negocio_futuras` como array de texto (não JSON livre): vocabulário fechado,
-- validado por CHECK — evita o mesmo risco que a válvula `outras_politicas` já corre por
-- natureza (typo silencioso nunca lido por ninguém), só que aqui dá pra fechar de propósito
-- porque a lista de opções já veio inteira do brief (não é um campo aberto).

alter table politicas_empresa add column if not exists missao text;
alter table politicas_empresa add column if not exists visao text;
alter table politicas_empresa add column if not exists linhas_de_negocio_futuras text[] not null default '{}'::text[];

alter table politicas_empresa drop constraint if exists chk_politicas_empresa_linhas_negocio;
alter table politicas_empresa add constraint chk_politicas_empresa_linhas_negocio check (
  linhas_de_negocio_futuras <@ array[
    'lojinha','wallbox','acessorios','seguros','software','marketplace','franquia','investidores','novas_cidades'
  ]::text[]
);
