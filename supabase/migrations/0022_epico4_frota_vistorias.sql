-- Épico 4 — "FROTA", Fase B (Vistorias). Migration 0022.
--
-- Reaproveita `checklists`/`checklist_itens` (já existentes desde 0007) em vez de criar uma
-- tabela "vistorias" nova e paralela — auditoria confirmou que `checklists` já tinha colunas
-- preparadas exatamente para isso desde a migration 0010 (`assinatura_url`, `gps_lat/lng`,
-- comentário original: "Preparo Fase 4/5 (Vistoria Inteligente) — sem UI web nesta missão").
-- Esta migration só adiciona o que ainda faltava pra virar "vistoria" de verdade, e é esta
-- missão que finalmente escreve a UI real por cima.
--
-- 1. `checklists.tipo` — qual evento gerou esta vistoria (entrega/devolução/renovação/
--    manutenção/sinistro). Nullable: checklists genéricos já existentes (sem tipo de vistoria)
--    continuam válidos, não migrados.
-- 2. `checklists.odometro_km` / `checklists.carga_pct` — estado do veículo no momento da
--    vistoria. Não reaproveita contratos.km_inicial/km_final porque nem toda vistoria está
--    ligada a um contrato (manutenção e sinistro, por exemplo, não têm contrato associado
--    necessariamente).
-- 3. `checklist_itens.foto_url` — foto obrigatória por item (brief pede "fotos" no nível do
--    item do checklist, não só da vistoria como um todo). Fotos/vídeos gerais da vistoria
--    inteira continuam usando a tabela `arquivos` já existente (entidade_tipo='checklist') —
--    não duplicado aqui.
--
-- Nada disso quebra o ChecklistsPanel genérico existente (Sprint 7) — todas as colunas são
-- nullable, checklist antigo sem tipo continua funcionando exatamente como antes.

do $$ begin
  create type checklist_tipo as enum ('entrega','devolucao','renovacao','manutencao','sinistro');
exception
  when duplicate_object then null;
end $$;

alter table checklists add column if not exists tipo checklist_tipo;
alter table checklists add column if not exists odometro_km integer;
alter table checklists add column if not exists carga_pct numeric(5,2);

alter table checklist_itens add column if not exists foto_url text;

comment on column checklists.tipo is 'Épico 4, Fase B — tipo de evento da vistoria (entrega/devolução/renovação/manutenção/sinistro). Null para checklists genéricos pré-existentes.';
comment on column checklists.odometro_km is 'Épico 4, Fase B — odômetro no momento da vistoria.';
comment on column checklists.carga_pct is 'Épico 4, Fase B — % de carga da bateria no momento da vistoria.';
comment on column checklist_itens.foto_url is 'Épico 4, Fase B — foto obrigatória por item de vistoria (URL no storage). Null para checklists genéricos que não exigem foto.';

-- ============================================================
-- Storage — bucket de fotos por item de checklist + assinatura digital da vistoria.
-- `assinatura_url` existe desde a migration 0010 mas NUNCA teve bucket/policy criados (era só
-- "preparo", comentário original confirma: "Sem UI web nesta missão") — esta migration é a
-- primeira a ativar upload real, então cria o bucket que faltava também para ela, não só para
-- foto_url (novo). Mesmo padrão de RLS por empresa já usado em veiculos-fotos (migration 0003).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('checklists-fotos', 'checklists-fotos', false)
on conflict (id) do nothing;

drop policy if exists "checklists-fotos: select por empresa" on storage.objects;
create policy "checklists-fotos: select por empresa" on storage.objects
  for select using (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "checklists-fotos: insert por empresa" on storage.objects;
create policy "checklists-fotos: insert por empresa" on storage.objects
  for insert with check (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "checklists-fotos: delete por empresa" on storage.objects;
create policy "checklists-fotos: delete por empresa" on storage.objects
  for delete using (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
