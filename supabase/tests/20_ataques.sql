-- Suíte de segurança — Fase 1 do App do Motorista.
-- Cada bloco assume a identidade de um usuário (role authenticated + jwt.claim.sub) e verifica
-- que a RLS/trigger devolve/bloqueia o esperado. Falha = raise exception (o script todo aborta
-- com ON_ERROR_STOP). "PASS" impresso por teste; no fim, "TODOS OS TESTES PASSARAM".
--
-- Convenções:
--   set role authenticated;                       -> deixa a RLS valer (superuser a ignora)
--   set request.jwt.claim.sub = '<uuid>';         -> quem é o usuário logado (auth.uid())
--   set request.jwt.claim.role = 'authenticated'; -> auth.role()
-- reset role volta a superuser pra trocar de identidade.

\set ON_ERROR_STOP on

create or replace function _assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FALHOU: %', msg; end if;
  raise notice 'PASS: %', msg;
end $$;

-- helper: entra como um usuário
create or replace function _login(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end $$;

-- =========================================================================
-- GRUPO 1 — Isolamento de leitura (Motorista A)
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A

select _assert(
  (select count(*) from usuarios) = 1
  and (select id from usuarios) = '22222222-2222-2222-2222-222222222222',
  'Motorista A vê só o próprio usuario');

select _assert(
  (select count(*) from motoristas) = 1
  and (select id from motoristas) = 'a2222222-0000-0000-0000-000000000000',
  'Motorista A vê só o próprio registro de motorista (não vê B nem C nem o Novo)');

select _assert(
  (select count(*) from contratos) = 1
  and (select id from contratos) = 'c2222222-0000-0000-0000-000000000000',
  'Motorista A vê só o próprio contrato');

select _assert(
  (select count(*) from veiculos) = 1
  and (select id from veiculos) = 'e2222222-0000-0000-0000-000000000000',
  'Motorista A vê só o veículo do próprio contrato');

select _assert((select count(*) from lancamentos) = 0, 'Motorista A NÃO vê lançamentos (staff-only, 0036)');
select _assert((select count(*) from pagamentos) = 0, 'Motorista A NÃO vê pagamentos');
select _assert((select count(*) from checklists) = 0, 'Motorista A NÃO vê checklists');
select _assert((select count(*) from arquivos) = 0, 'Motorista A NÃO vê metadados de arquivos');
select _assert((select count(*) from interacoes) = 0, 'Motorista A NÃO vê interacoes');
select _assert((select count(*) from timeline_eventos) = 0, 'Motorista A NÃO vê timeline');
select _assert((select count(*) from multas) = 0, 'Motorista A NÃO vê multas');
select _assert((select count(*) from manutencoes) = 0, 'Motorista A NÃO vê manutencoes');

-- não vê motorista B especificamente (ataque por ID direto)
select _assert(
  (select count(*) from motoristas where id = 'a3333333-0000-0000-0000-000000000000') = 0,
  'Ataque: Motorista A -> Motorista B por ID = 0 linhas');
select _assert(
  (select count(*) from contratos where id = 'c3333333-0000-0000-0000-000000000000') = 0,
  'Ataque: Motorista A -> Contrato B por ID = 0 linhas');
select _assert(
  (select count(*) from veiculos where id = 'e3333333-0000-0000-0000-000000000000') = 0,
  'Ataque: Motorista A -> Veículo B por ID = 0 linhas');
-- não vê nada da empresa B
select _assert(
  (select count(*) from motoristas where id = 'b4444444-0000-0000-0000-000000000000') = 0,
  'Ataque: Motorista A -> Motorista C (empresa B) = 0 linhas');

reset role;

-- =========================================================================
-- GRUPO 2 — R1: auto-escalada (Motorista A tenta alterar o próprio vínculo)
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');

-- trocar motorista_id -> outro motorista
do $$ begin
  begin
    update usuarios set motorista_id = 'a3333333-0000-0000-0000-000000000000' where id = auth.uid();
    raise exception 'DEVERIA TER BLOQUEADO: troca de motorista_id';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: R1 - troca de motorista_id bloqueada (%)', sqlerrm;
  end;
end $$;

-- apontar motorista_id para NULL
do $$ begin
  begin
    update usuarios set motorista_id = null where id = auth.uid();
    raise exception 'DEVERIA TER BLOQUEADO: motorista_id -> null';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: R1 - motorista_id -> null bloqueado';
  end;
end $$;

-- promover a role staff
do $$ begin
  begin
    update usuarios set role = 'owner' where id = auth.uid();
    raise exception 'DEVERIA TER BLOQUEADO: troca de role';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: R1 - troca de role bloqueada';
  end;
end $$;

-- trocar de empresa
do $$ begin
  begin
    update usuarios set empresa_id = 'b0000000-0000-0000-0000-000000000001' where id = auth.uid();
    raise exception 'DEVERIA TER BLOQUEADO: troca de empresa';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: R1 - troca de empresa bloqueada';
  end;
end $$;

-- reativar/alterar ativo
do $$ begin
  begin
    update usuarios set ativo = false where id = auth.uid();
    raise exception 'DEVERIA TER BLOQUEADO: troca de ativo';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: R1 - troca de ativo bloqueada';
  end;
end $$;

-- tentar editar a linha de OUTRO usuário (policy USING deve dar 0 rows afetadas)
do $$
declare v_rows int;
begin
  update usuarios set nome_completo = 'hackeado' where id = '33333333-3333-3333-3333-333333333333';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'DEVERIA TER BLOQUEADO: editar linha de outro usuario (% rows)', v_rows; end if;
  raise notice 'PASS: R1 - editar linha de outro usuario = 0 rows';
end $$;

-- confirma que o vínculo continua intacto
select _assert(
  (select motorista_id from usuarios where id = auth.uid()) = 'a2222222-0000-0000-0000-000000000000',
  'R1 - motorista_id do A permaneceu intacto após todas as tentativas');

reset role;

-- =========================================================================
-- GRUPO 3 — R2: Storage
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A

-- pode ver o PRÓPRIO documento
select _assert(
  (select count(*) from storage.objects
   where bucket_id='motoristas-documentos'
     and name='a0000000-0000-0000-0000-000000000001/a2222222-0000-0000-0000-000000000000/cnh-a.pdf') = 1,
  'R2 - Motorista A vê o próprio documento');

-- NÃO pode ver o documento do motorista B
select _assert(
  (select count(*) from storage.objects
   where bucket_id='motoristas-documentos'
     and name='a0000000-0000-0000-0000-000000000001/a3333333-0000-0000-0000-000000000000/cnh-b.pdf') = 0,
  'R2 - Motorista A NÃO vê documento do Motorista B');

-- pode ver arquivo do PRÓPRIO contrato
select _assert(
  (select count(*) from storage.objects
   where bucket_id='contratos-arquivos'
     and name='a0000000-0000-0000-0000-000000000001/c2222222-0000-0000-0000-000000000000/contrato-a.pdf') = 1,
  'R2 - Motorista A vê arquivo do próprio contrato');

-- NÃO vê arquivo do contrato B
select _assert(
  (select count(*) from storage.objects
   where bucket_id='contratos-arquivos'
     and name='a0000000-0000-0000-0000-000000000001/c3333333-0000-0000-0000-000000000000/contrato-b.pdf') = 0,
  'R2 - Motorista A NÃO vê arquivo do contrato B');

-- NÃO vê comprovante financeiro (bucket administrativo)
select _assert(
  (select count(*) from storage.objects where bucket_id='financeiro-arquivos') = 0,
  'R2 - Motorista A NÃO vê nenhum financeiro-arquivos');

-- total geral: A só enxerga 2 objetos (o próprio doc + o próprio contrato)
select _assert(
  (select count(*) from storage.objects) = 2,
  'R2 - Motorista A enxerga exatamente 2 objetos de storage (os próprios)');

-- INSERT em pasta de outro motorista -> bloqueado (motorista não tem insert nesta fase)
do $$ begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('motoristas-documentos','a0000000-0000-0000-0000-000000000001/a3333333-0000-0000-0000-000000000000/forjado.pdf');
    raise exception 'DEVERIA TER BLOQUEADO: insert em pasta de outro motorista';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: R2 - insert de storage pelo motorista bloqueado';
  end;
end $$;

reset role;

-- Staff A continua vendo tudo da empresa A (não quebramos o staff)
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A (owner)
select _assert(
  (select count(*) from storage.objects where bucket_id='financeiro-arquivos') = 1,
  'R2 - Staff A continua vendo financeiro-arquivos');
select _assert(
  (select count(*) from storage.objects where bucket_id='motoristas-documentos') = 2,
  'R2 - Staff A vê os 2 documentos de motorista da empresa');
select _assert((select count(*) from lancamentos) = 1, 'Staff A continua vendo lançamentos');
select _assert((select count(*) from motoristas) >= 3, 'Staff A vê todos os motoristas da empresa A');
reset role;

-- Staff INATIVO A não deve ser tratado como staff (eh_staff agora checa ativo)
set role authenticated;
select _login('55555555-5555-5555-5555-555555555555'); -- Staff inativo
select _assert((select count(*) from lancamentos) = 0, 'Staff INATIVO não vê lançamentos (eh_staff checa ativo)');
select _assert((select count(*) from storage.objects where bucket_id='financeiro-arquivos') = 0,
  'Staff INATIVO não vê financeiro-arquivos');
reset role;

-- =========================================================================
-- GRUPO 4 — Empresa B / Motorista C isolamento cruzado
-- =========================================================================
set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- Motorista C (empresa B)
select _assert(
  (select count(*) from contratos) = 1 and (select id from contratos) = 'c4444444-0000-0000-0000-000000000000',
  'Motorista C vê só o próprio contrato (empresa B)');
select _assert(
  (select count(*) from motoristas where empresa_id = 'a0000000-0000-0000-0000-000000000001') = 0,
  'Motorista C NÃO vê nenhum motorista da empresa A');
select _assert((select count(*) from storage.objects) = 0, 'Motorista C não vê storage da empresa A');
reset role;

-- =========================================================================
-- GRUPO 5 — R3: aceite de convite por token (simula fn_aceitar_convite)
-- =========================================================================
-- A função é trigger em auth.users; simulamos inserindo em auth.users com metadata.
-- Rodamos como superuser (o trigger é security definer, roda igual em produção).
reset role;

-- CASO CORRETO: token certo + e-mail certo -> vincula
insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-000000000000', 'novo@a.com',
   '{"nome_completo":"Novo","convite_token":"99999999-9999-9999-9999-999999999999"}');
select _assert(
  (select count(*) from usuarios where id='a1000000-0000-0000-0000-000000000000'
     and role='motorista' and empresa_id='a0000000-0000-0000-0000-000000000001'
     and motorista_id='a9999999-0000-0000-0000-000000000000') = 1,
  'R3 - token correto + email correto -> vínculo criado corretamente');
select _assert(
  (select aceito from convites where token='99999999-9999-9999-9999-999999999999') = true,
  'R3 - convite marcado como aceito');

-- CASO MALICIOSO: e-mail de convidado, SEM token -> NÃO herda vínculo
insert into convites (id, empresa_id, email, role, token, aceito, motorista_id, expira_em) values
  ('c7777777-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'semtoken@a.com', 'motorista',
   '77777777-7777-7777-7777-777777777777', false, 'a9999999-0000-0000-0000-000000000000', now() + interval '7 days');
insert into auth.users (id, email, raw_user_meta_data) values
  ('a2000000-0000-0000-0000-000000000000', 'semtoken@a.com', '{"nome_completo":"Sem Token"}');
select _assert(
  (select count(*) from usuarios where id='a2000000-0000-0000-0000-000000000000') = 0,
  'R3 - ATAQUE: signUp com e-mail convidado SEM token -> nenhum usuario criado (não herda)');

-- CASO ERRADO: token certo + e-mail diferente -> nega
insert into auth.users (id, email, raw_user_meta_data) values
  ('a3000000-0000-0000-0000-000000000000', 'outro@a.com',
   '{"convite_token":"77777777-7777-7777-7777-777777777777"}');
select _assert(
  (select count(*) from usuarios where id='a3000000-0000-0000-0000-000000000000') = 0,
  'R3 - token certo + email diferente -> negado');

-- CASO ERRADO: token inexistente -> nega (email único; não há convite pra ele)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a4000000-0000-0000-0000-000000000000', 'inexistente@a.com',
   '{"convite_token":"00000000-0000-0000-0000-0000000000ff"}');
select _assert(
  (select count(*) from usuarios where id='a4000000-0000-0000-0000-000000000000') = 0,
  'R3 - token inexistente -> negado');

-- TOKEN EXPIRADO -> nega
insert into auth.users (id, email, raw_user_meta_data) values
  ('a5000000-0000-0000-0000-000000000000', 'expirado@a.com',
   '{"convite_token":"88888888-8888-8888-8888-888888888888"}');
select _assert(
  (select count(*) from usuarios where id='a5000000-0000-0000-0000-000000000000') = 0,
  'R3 - token expirado -> negado');

-- TOKEN REUTILIZADO: o token 9999 já foi aceito acima (aceito=true). Uma segunda pessoa
-- (email diferente, já que o Supabase Auth impede reusar o mesmo e-mail) apresentando o
-- mesmo token NÃO é vinculada — o convite já não está pendente.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a6000000-0000-0000-0000-000000000000', 'reuso@a.com',
   '{"convite_token":"99999999-9999-9999-9999-999999999999"}');
select _assert(
  (select count(*) from usuarios where id='a6000000-0000-0000-0000-000000000000') = 0,
  'R3 - token já usado (aceito=true) -> negado na reutilização');

do $$ begin raise notice '========================================'; raise notice 'TODOS OS TESTES PASSARAM'; raise notice '========================================'; end $$;
