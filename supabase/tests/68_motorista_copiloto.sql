-- Suíte 68 — APP MOTORISTA: Copiloto do Motorista (Fase 16) — migrations 0049/0050.
-- Cobre motorista_corridas (corrida individual, Fase C) e motorista_config_copiloto (critérios
-- configuráveis do semáforo, Fase B/U). Mesma filosofia de privacidade da suíte 66/67: staff
-- (inclusive owner) NÃO vê NADA aqui — é dado pessoal do motorista.
-- Usa os helpers _assert/_login criados pela suíte 20 (mesmo banco, mesma sessão de harness).

\set ON_ERROR_STOP on

-- =========================================================================
-- GRUPO 1 — Motorista A: registra corridas e configura o Copiloto
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A (a2222222)

insert into motorista_corridas (id, motorista_id, data, hora, app, valor, km_estimado, duracao_estimada_min, classificacao, aceita)
values ('c0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000',
        current_date, '14:30', 'uber', 18.50, 6.2, 15, 'BOM', true);
insert into motorista_corridas (id, motorista_id, data, app, valor, classificacao, aceita)
values ('c0000000-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000000',
        current_date, '99', 7.00, 'RUIM', false);
select _assert((select count(*) from motorista_corridas) = 2,
  'CP GRUPO1: Motorista A registra e vê as próprias corridas (2)');

select _assert((select origem_captura from motorista_corridas where id='c0000000-0000-0000-0000-000000000001') = 'manual',
  'CP GRUPO1: origem_captura default é "manual" (texto livre, não enum)');

insert into motorista_corridas (id, motorista_id, data, app, valor, origem_captura)
values ('c0000000-0000-0000-0000-000000000003', 'a2222222-0000-0000-0000-000000000000',
        current_date, 'indrive', 12.00, 'overlay-experimental');
select _assert((select origem_captura from motorista_corridas where id='c0000000-0000-0000-0000-000000000003') = 'overlay-experimental',
  'CP GRUPO1: origem_captura aceita qualquer texto (não trava em enum rígido — futuras origens não pedem migration)');

insert into motorista_config_copiloto (motorista_id, limiar_rpkm_bom, limiar_rph_bom, peso_rpkm, peso_rph)
values ('a2222222-0000-0000-0000-000000000000', 2.50, 35, 1.5, 1)
on conflict (motorista_id) do update set limiar_rpkm_bom = excluded.limiar_rpkm_bom;
select _assert((select limiar_rpkm_bom from motorista_config_copiloto) = 2.50,
  'CP GRUPO1: Motorista A grava a própria configuração do Copiloto');
select _assert((select limiar_rpkm_ruim from motorista_config_copiloto) is null,
  'CP GRUPO1: limiar não informado fica NULL — NÃO CONFIGURADO, nunca vira zero');

update motorista_config_copiloto set limiar_rph_bom = 40 where motorista_id = 'a2222222-0000-0000-0000-000000000000';
select _assert((select atualizado_em > (now() - interval '1 minute') from motorista_config_copiloto),
  'CP GRUPO1: trigger atualizado_em fotografa a alteração da configuração');

-- =========================================================================
-- GRUPO 2 — Constraints (nunca aceitar dado inválido)
-- =========================================================================
do $$ begin
  begin
    insert into motorista_corridas (motorista_id, data, app, valor) values
      ('a2222222-0000-0000-0000-000000000000', current_date, 'uber', -5);
    raise exception 'FALHOU: valor negativo deveria ser bloqueado';
  exception when check_violation then
    raise notice 'PASS: CP GRUPO2: valor de corrida negativo rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_corridas (motorista_id, data, app, valor, classificacao) values
      ('a2222222-0000-0000-0000-000000000000', current_date, 'uber', 10, 'EXCELENTE');
    raise exception 'FALHOU: classificacao fora da lista deveria ser bloqueada';
  exception when check_violation then
    raise notice 'PASS: CP GRUPO2: classificacao fora de BOM/ATENCAO/RUIM rejeitada (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_corridas (motorista_id, data, app, valor, km_estimado) values
      ('a2222222-0000-0000-0000-000000000000', current_date, 'uber', 10, -3);
    raise exception 'FALHOU: km_estimado negativo deveria ser bloqueado';
  exception when check_violation then
    raise notice 'PASS: CP GRUPO2: km_estimado negativo rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_config_copiloto (motorista_id, peso_rpkm) values
      ('a2222222-0000-0000-0000-000000000000', 0)
    on conflict (motorista_id) do update set peso_rpkm = 0;
    raise exception 'FALHOU: peso zero deveria ser bloqueado (desligar critério é via limiar nulo, não peso 0)';
  exception when check_violation then
    raise notice 'PASS: CP GRUPO2: peso_rpkm = 0 rejeitado (check > 0)';
  end;
end $$;

-- =========================================================================
-- GRUPO 3 — Escrever em nome de outro motorista é bloqueado (with check)
-- =========================================================================
do $$ begin
  begin
    insert into motorista_corridas (motorista_id, data, app, valor) values
      ('a3333333-0000-0000-0000-000000000000', current_date, 'uber', 10); -- Motorista B, logado como A
    raise exception 'FALHOU: A não deveria conseguir lançar corrida em nome de B';
  exception when insufficient_privilege or check_violation then
    raise notice 'PASS: CP GRUPO3: A NÃO lança corrida em nome de B (with check)';
  end;
end $$;

-- =========================================================================
-- GRUPO 4 — Isolamento entre motoristas, empresas e staff
-- =========================================================================
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B
select _assert((select count(*) from motorista_corridas) = 0,
  'CP GRUPO4: Motorista B NÃO vê corridas de A');
select _assert((select count(*) from motorista_config_copiloto) = 0,
  'CP GRUPO4: Motorista B NÃO vê configuração do Copiloto de A');
select _assert((select count(*) from motorista_corridas where id = 'c0000000-0000-0000-0000-000000000001') = 0,
  'CP GRUPO4: Ataque por ID direto: B -> corrida de A = 0 linhas');

select _login('44444444-4444-4444-4444-444444444444'); -- Motorista C, empresa B
select _assert((select count(*) from motorista_corridas) = 0,
  'CP GRUPO4: motorista de OUTRA empresa NÃO vê corridas');
select _assert((select count(*) from motorista_config_copiloto) = 0,
  'CP GRUPO4: motorista de OUTRA empresa NÃO vê configuração do Copiloto');

-- staff owner da empresa A (mesmo dono da frota) — dado pessoal, zero acesso
select _login('11111111-1111-1111-1111-111111111111'); -- staff/owner empresa A
select _assert((select count(*) from motorista_corridas) = 0,
  'CP GRUPO4: STAFF OWNER NÃO vê corridas do motorista (privacidade — mesma regra da 0047/0048)');
select _assert((select count(*) from motorista_config_copiloto) = 0,
  'CP GRUPO4: STAFF NÃO vê configuração do Copiloto');
do $$ begin
  begin
    insert into motorista_corridas (motorista_id, data, app, valor) values
      ('a2222222-0000-0000-0000-000000000000', current_date, 'uber', 10);
    raise exception 'FALHOU: staff não deveria conseguir escrever em motorista_corridas';
  exception when insufficient_privilege or check_violation then
    raise notice 'PASS: CP GRUPO4: STAFF também NÃO escreve em corridas';
  end;
end $$;

-- =========================================================================
-- GRUPO 5 — Motorista desativado perde acesso, reativado recupera
-- =========================================================================
reset role;
update usuarios set ativo = false where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select public.current_motorista_id()) is null,
  'CP GRUPO5: motorista desativado -> current_motorista_id() = NULL');
select _assert((select count(*) from motorista_corridas) = 0,
  'CP GRUPO5: motorista desativado NÃO vê nem as próprias corridas');

reset role;
-- (o trigger de proteção de usuarios barra auto-alteração: reativa com a identidade do Staff A
--  — cenário legítimo de reativação pelo owner, mesmo padrão da suíte 66)
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
update usuarios set ativo = true where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from motorista_corridas) = 3,
  'CP GRUPO5: reativado, volta a ver as próprias corridas (nada foi perdido)');

-- =========================================================================
-- GRUPO 6 — Cascade delete (LGPD) e estrutura (1 policy, 0 trigger de audit_log)
-- =========================================================================
reset role;
-- motorista descartável só pra este teste (Motorista A tem contrato no seed base — FK impede
-- exclusão direta; mesmo padrão da suíte 66, GRUPO7: "Motorista Temp").
insert into motoristas (id, empresa_id, nome_completo, cpf, status) values
  ('a8888888-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista Temp CP', '00000000088', 'ativo');
insert into motorista_corridas (motorista_id, data, app, valor) values
  ('a8888888-0000-0000-0000-000000000000', current_date, 'uber', 15);
insert into motorista_config_copiloto (motorista_id, limiar_rpkm_bom) values
  ('a8888888-0000-0000-0000-000000000000', 2.00);
delete from motoristas where id = 'a8888888-0000-0000-0000-000000000000';
select _assert((select count(*) from motorista_corridas where motorista_id = 'a8888888-0000-0000-0000-000000000000') = 0,
  'CP GRUPO6: excluir o motorista apaga as corridas em cascata (LGPD)');
select _assert((select count(*) from motorista_config_copiloto where motorista_id = 'a8888888-0000-0000-0000-000000000000') = 0,
  'CP GRUPO6: excluir o motorista apaga a configuração do Copiloto em cascata (LGPD)');

select _assert(
  (select count(*) from pg_policies where tablename = 'motorista_corridas') = 1,
  'CP GRUPO6: motorista_corridas tem EXATAMENTE 1 policy (só o dono — staff sem porta)');
select _assert(
  (select count(*) from pg_policies where tablename = 'motorista_config_copiloto') = 1,
  'CP GRUPO6: motorista_config_copiloto tem EXATAMENTE 1 policy (só o dono)');
select _assert(
  not exists (select 1 from pg_trigger where tgrelid = 'motorista_corridas'::regclass and not tgisinternal),
  'CP GRUPO6: SEM trigger nenhum em motorista_corridas (nem audit_log — privacidade)');

do $$ begin raise notice '==== COPILOTO DO MOTORISTA (0049/0050): TODOS OS TESTES PASSARAM ===='; end $$;
