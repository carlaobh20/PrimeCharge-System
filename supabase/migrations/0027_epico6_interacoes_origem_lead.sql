-- Épico 6, Fase 1.2 — Registro de conversas (interações) + Origem do lead.
--
-- Contexto: o CRM/Kanban de motoristas (migrations 0025/0026) já tem funil, prioridade e
-- exclusão. Faltava registrar CONTATO (ligação, WhatsApp, e-mail, visita) com o lead/motorista
-- e saber DE ONDE ele veio. Não reaproveitamos a tabela `comentarios` genérica porque interação
-- tem semântica própria (data/hora em que a conversa ACONTECEU, que pode ser retroativa, e não
-- apenas quando foi digitada; canal obrigatório) — uma tabela dedicada deixa isso explícito em
-- vez de forçar convenções dentro de um campo de texto livre.

-- 1. Origem do lead — direto em `motoristas`, é atributo do cadastro, não um evento.
alter table motoristas
  add column if not exists origem_lead text
    check (origem_lead is null or origem_lead in ('indicacao','rede_social','propaganda','busca_organica','evento','outro')),
  add column if not exists origem_lead_detalhe text;

-- 2. Interações
create table if not exists interacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  entidade_tipo text not null check (entidade_tipo in ('motorista')),
  entidade_id uuid not null,
  ocorrida_em timestamptz not null,
  canal text not null check (canal in ('ligacao','whatsapp','email','presencial','outro')),
  conteudo text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_interacoes_entidade on interacoes(entidade_tipo, entidade_id, ocorrida_em desc);
create index if not exists idx_interacoes_empresa on interacoes(empresa_id);

alter table interacoes enable row level security;

drop policy if exists interacoes_select on interacoes;
create policy interacoes_select on interacoes for select
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists interacoes_insert on interacoes;
create policy interacoes_insert on interacoes for insert
  with check (
    empresa_id = (select empresa_id from usuarios where id = auth.uid())
    and pode('motoristas', 'editar')
  );

-- 3. Mirror para a timeline única do motorista (padrão já usado por outras capabilities —
-- ver migration 0024). Usa ocorrida_em como criado_em do evento espelhado, de propósito: uma
-- conversa registrada retroativamente deve aparecer na timeline na posição cronológica real,
-- não na posição em que foi digitada.
create or replace function fn_timeline_interacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canal_label text;
begin
  v_canal_label := case new.canal
    when 'ligacao' then 'Ligação'
    when 'whatsapp' then 'WhatsApp'
    when 'email' then 'E-mail'
    when 'presencial' then 'Presencial'
    else 'Outro'
  end;

  insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, criado_por, criado_em)
  values (
    new.empresa_id,
    new.entidade_tipo,
    new.entidade_id,
    'interacao_registrada',
    'Conversa registrada (' || v_canal_label || '): ' || new.conteudo,
    new.usuario_id,
    new.ocorrida_em
  );

  return new;
end;
$$;

drop trigger if exists trg_interacoes_timeline on interacoes;
create trigger trg_interacoes_timeline
  after insert on interacoes
  for each row execute function fn_timeline_interacao();
