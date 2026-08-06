-- PrimeCharge OS — Missão 3, correções de segurança/schema encontradas na Parte 12
-- (Revisão Arquitetural Completa), 2026-08-06.
-- Referência: DECISION_LOG.md DEC-095 a DEC-097.
--
-- Nenhuma destas três correções foi aplicada a nenhum projeto Supabase real — `main` só
-- tem migrations até 0005, `dev` até 0010, e nenhum projeto vinculado a este ambiente
-- corresponde ao PrimeCharge. Mesmo assim, o padrão já estabelecido pelas migrations
-- 0008/0009 (DEC-064/DEC-067: "recriar a função numa migration nova, nunca editar uma
-- já commitada") é seguido aqui por consistência de histórico, não por necessidade de
-- migração de dado real.

-- ============================================================
-- 1. pode_excluir_contrato / pode_excluir_lancamento — faltava o check `u.ativo = true`
--    que DEC-064 já tinha aplicado a current_empresa_id()/pode(), e DEC-067 já tinha
--    estendido a pode_excluir_veiculo/pode_excluir_motorista. Essas duas funções, do
--    mesmo padrão exato (0005/0006), ficaram fora das duas rodadas — usuário admin
--    desativado com sessão viva ainda conseguia excluir Contrato ou Lançamento.
-- ============================================================

create or replace function public.pode_excluir_contrato(p_contrato_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from contratos c
    join usuarios u on u.id = auth.uid()
    where c.id = p_contrato_id
      and c.empresa_id = u.empresa_id
      and u.ativo = true
      and u.role in ('super_admin','owner','admin')
  );
$$;

create or replace function public.pode_excluir_lancamento(p_lancamento_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from lancamentos l
    join usuarios u on u.id = auth.uid()
    where l.id = p_lancamento_id
      and l.empresa_id = u.empresa_id
      and u.ativo = true
      and u.role in ('super_admin','owner','admin')
  );
$$;

-- ============================================================
-- 2. Paridade autoria/role entre `arquivos` (metadado) e `storage.objects` (binário).
--    pode_excluir_arquivo (0008) já libera o próprio autor do upload, além das roles de
--    gestão. pode_excluir_storage_da_empresa() só checava role — um autor conseguia
--    apagar a linha de `arquivos` mas era barrado pelo RLS do bucket, e
--    src/shared/capabilities/api/arquivos.ts:deleteArquivo() ignorava o erro do
--    `.remove()` (correção de código nesta mesma missão), então a UI mostrava sucesso
--    com o arquivo binário órfão no bucket para sempre — risco real em buckets com PII
--    (motoristas-documentos) sob LGPD.
--    Fix: a função de storage passa a receber bucket+nome e aceitar autoria também,
--    igual pode_excluir_arquivo já faz — comparando contra a linha de `arquivos` cujo
--    caminho_storage corresponde ao objeto sendo apagado.
-- ============================================================

create or replace function public.pode_excluir_storage_da_empresa(p_bucket text, p_name text) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where u.id = auth.uid()
      and u.ativo = true
      and u.role in ('super_admin','owner','admin','gestor_frota','gestor_financeiro')
  )
  or exists (
    select 1 from arquivos a
    join usuarios u on u.id = auth.uid()
    where a.caminho_storage = p_bucket || '/' || p_name
      and a.usuario_id = auth.uid()
      and u.ativo = true
  );
$$;

drop policy if exists "veiculos-fotos: delete restrito por role" on storage.objects;
create policy "veiculos-fotos: delete restrito por autoria ou role" on storage.objects
  for delete using (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa(bucket_id, name)
  );

drop policy if exists "veiculos-documentos: delete restrito por role" on storage.objects;
create policy "veiculos-documentos: delete restrito por autoria ou role" on storage.objects
  for delete using (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa(bucket_id, name)
  );

drop policy if exists "motoristas-documentos: delete restrito por role" on storage.objects;
create policy "motoristas-documentos: delete restrito por autoria ou role" on storage.objects
  for delete using (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa(bucket_id, name)
  );

drop policy if exists "contratos-arquivos: delete restrito por role" on storage.objects;
create policy "contratos-arquivos: delete restrito por autoria ou role" on storage.objects
  for delete using (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa(bucket_id, name)
  );

drop policy if exists "financeiro-arquivos: delete restrito por role" on storage.objects;
create policy "financeiro-arquivos: delete restrito por autoria ou role" on storage.objects
  for delete using (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa(bucket_id, name)
  );

-- ============================================================
-- 3. manutencoes.veiculo_id / telemetria_eventos.veiculo_id usavam ON DELETE CASCADE
--    (herdado sem discussão de um copy-paste do padrão de tabela genérica) — contradiz
--    DEC-077 (evento real nunca é apagado fisicamente) e, no caso de `manutencoes`,
--    esvazia exatamente o dado que DEC-083 chama de vantagem competitiva que "cresce
--    com o tempo": excluir um veículo antigo (o mais provável de ser excluído) apagaria
--    seu histórico de manutenção mais valioso junto.
--    manutencoes → RESTRICT, mesmo padrão de contratos.veiculo_id (0005): não deixa
--    excluir um veículo com histórico de manutenção real.
--    telemetria_eventos → SET NULL, mesmo padrão de lancamentos.veiculo_id (0006): o
--    evento de telemetria sobrevive à exclusão do veículo, sem bloquear a exclusão
--    (volume potencialmente alto, RESTRICT inviabilizaria excluir qualquer veículo
--    com telemetria real).
-- ============================================================

alter table manutencoes drop constraint if exists manutencoes_veiculo_id_fkey;
alter table manutencoes
  add constraint manutencoes_veiculo_id_fkey
  foreign key (veiculo_id) references veiculos(id) on delete restrict;

alter table telemetria_eventos alter column veiculo_id drop not null;
alter table telemetria_eventos drop constraint if exists telemetria_eventos_veiculo_id_fkey;
alter table telemetria_eventos
  add constraint telemetria_eventos_veiculo_id_fkey
  foreign key (veiculo_id) references veiculos(id) on delete set null;
