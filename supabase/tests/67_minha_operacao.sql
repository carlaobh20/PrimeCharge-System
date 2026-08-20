-- Suíte 67 — Diário Operacional do Motorista (migration 0048).
-- Mesma filosofia de privacidade da 66: dado do MOTORISTA, staff vê ZERO. Cobre: colunas novas
-- de motorista_ganhos (km/corridas/apps opcionais + km_fim>=km_inicio), motorista_recargas
-- (CRUD dono, constraints custo/kwh/bateria, isolamento A×B×empresa×staff×desativado,
-- cascade), idempotência do encerramento (1 linha por dia mesmo com upsert repetido) e prova
-- estrutural (1 policy, zero audit trigger).
-- Usa _assert/_login criados pela suíte 20.

\set ON_ERROR_STOP on

-- =========================================================================
-- GRUPO 1 — Motorista A: dia completo do diário + recargas próprias
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A (a2222222)

-- dia só com ganho+horas continua válido (campos novos são OPCIONAIS)
insert into motorista_ganhos (motorista_id, data, valor, horas)
values ('a2222222-0000-0000-0000-000000000000', current_date - 10, 350, 8);
select _assert(
  (select km_inicio is null and corridas is null from motorista_ganhos where data = current_date - 10),
  'OP GRUPO1: dia só com ganho+horas continua válido (diário é opcional)');

-- dia completo do diário
insert into motorista_ganhos (motorista_id, data, valor, horas, km_inicio, km_fim, corridas, apps)
values ('a2222222-0000-0000-0000-000000000000', current_date - 9, 400, 10, 100.0, 250.0, 18, array['uber','99']);
select _assert(
  (select km_fim - km_inicio = 150.0 and corridas = 18 and apps = array['uber','99']
     from motorista_ganhos where data = current_date - 9),
  'OP GRUPO1: dia com km 100→250 (150 rodados), 18 corridas, apps uber+99');

-- ENCERRAR DIA duas vezes = upsert, nunca segunda linha (idempotência)
insert into motorista_ganhos (motorista_id, data, valor, horas, km_inicio, km_fim)
values ('a2222222-0000-0000-0000-000000000000', current_date - 9, 420, 10, 100.0, 260.0)
on conflict (motorista_id, data) do update
  set valor = excluded.valor, horas = excluded.horas, km_inicio = excluded.km_inicio, km_fim = excluded.km_fim;
select _assert(
  (select count(*) from motorista_ganhos where data = current_date - 9) = 1
  and (select valor from motorista_ganhos where data = current_date - 9) = 420,
  'OP GRUPO1: encerrar o dia 2x não cria 2ª linha (upsert corrige a mesma)');

-- recargas: eventos independentes (duas no mesmo dia são DUAS recargas)
insert into motorista_recargas (id, motorista_id, data, custo, kwh, pct_inicial, pct_final, local)
values ('ec000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000',
        current_date - 9, 32.40, 18.7, 31, 84, 'Eletroposto Centro');
insert into motorista_recargas (motorista_id, data, custo)
values ('a2222222-0000-0000-0000-000000000000', current_date - 9, 15.00);
select _assert((select count(*) from motorista_recargas where data = current_date - 9) = 2,
  'OP GRUPO1: duas recargas no mesmo dia = dois EVENTOS independentes');
select _assert(
  (select kwh = 18.7 and pct_inicial = 31 and pct_final = 84 from motorista_recargas
    where id = 'ec000000-0000-0000-0000-000000000001'),
  'OP GRUPO1: recarga completa 18,7 kWh 31%→84% gravada');

delete from motorista_recargas where motorista_id = 'a2222222-0000-0000-0000-000000000000' and custo = 15.00;
select _assert((select count(*) from motorista_recargas where data = current_date - 9) = 1,
  'OP GRUPO1: motorista remove a própria recarga');

-- =========================================================================
-- GRUPO 2 — Constraints do diário
-- =========================================================================
do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor, km_inicio, km_fim)
    values ('a2222222-0000-0000-0000-000000000000', current_date - 8, 100, 250.0, 100.0);
    raise exception 'DEVERIA TER BLOQUEADO: km final menor que inicial';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: km_fim < km_inicio bloqueado (constraint)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor, km_inicio)
    values ('a2222222-0000-0000-0000-000000000000', current_date - 8, 100, -5);
    raise exception 'DEVERIA TER BLOQUEADO: km negativo';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: km negativo bloqueado';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor, corridas)
    values ('a2222222-0000-0000-0000-000000000000', current_date - 8, 100, -3);
    raise exception 'DEVERIA TER BLOQUEADO: corridas negativas';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: corridas negativas bloqueadas';
  end;
end $$;

-- só um dos odômetros informado é PERMITIDO (a UI mostra "KM INCOMPLETO", não calcula)
insert into motorista_ganhos (motorista_id, data, valor, km_inicio)
values ('a2222222-0000-0000-0000-000000000000', current_date - 7, 200, 300.0);
select _assert((select km_fim is null from motorista_ganhos where data = current_date - 7),
  'OP GRUPO2: só km_inicio informado é aceito (KM INCOMPLETO fica pra UI, sem cálculo)');

do $$ begin
  begin
    insert into motorista_recargas (motorista_id, data, custo) values ('a2222222-0000-0000-0000-000000000000', current_date, -10);
    raise exception 'DEVERIA TER BLOQUEADO: recarga com custo negativo';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: custo de recarga negativo bloqueado';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_recargas (motorista_id, data, custo, kwh) values ('a2222222-0000-0000-0000-000000000000', current_date, 10, -2);
    raise exception 'DEVERIA TER BLOQUEADO: kWh negativo';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: kWh negativo bloqueado';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_recargas (motorista_id, data, custo, pct_inicial) values ('a2222222-0000-0000-0000-000000000000', current_date, 10, -1);
    raise exception 'DEVERIA TER BLOQUEADO: bateria < 0';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: bateria < 0%% bloqueada';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_recargas (motorista_id, data, custo, pct_final) values ('a2222222-0000-0000-0000-000000000000', current_date, 10, 101);
    raise exception 'DEVERIA TER BLOQUEADO: bateria > 100';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: bateria > 100%% bloqueada';
  end;
end $$;

-- ataque de escrita: recarga em nome de outro motorista
do $$ begin
  begin
    insert into motorista_recargas (motorista_id, data, custo)
    values ('a3333333-0000-0000-0000-000000000000', current_date, 10);
    raise exception 'DEVERIA TER BLOQUEADO: recarga em nome do Motorista B';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO2: A NÃO registra recarga em nome de B (with check)';
  end;
end $$;
reset role;

-- =========================================================================
-- GRUPO 3 — Isolamento de leitura (a privacidade que define a feature)
-- =========================================================================
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B (mesma empresa)
select _assert((select count(*) from motorista_recargas) = 0, 'OP GRUPO3: Motorista B NÃO vê recargas de A');
select _assert((select count(*) from motorista_ganhos where km_inicio is not null) = 0,
  'OP GRUPO3: Motorista B NÃO vê o diário (km) de A');
reset role;

set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- empresa B
select _assert((select count(*) from motorista_recargas) = 0, 'OP GRUPO3: empresa B NÃO vê recargas');
reset role;

set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- STAFF OWNER da empresa de A
select _assert((select count(*) from motorista_recargas) = 0,
  'OP GRUPO3: STAFF OWNER NÃO vê recargas (km/apps/corridas são dados PESSOAIS)');
select _assert((select count(*) from motorista_ganhos) = 0, 'OP GRUPO3: STAFF continua sem ver ganhos/diário');
reset role;

set role authenticated;
select _login('55555555-5555-5555-5555-555555555555'); -- staff inativo
select _assert((select count(*) from motorista_recargas) = 0, 'OP GRUPO3: staff inativo NÃO vê nada');
reset role;

-- motorista DESATIVADO
update usuarios set ativo = false where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from motorista_recargas) = 0, 'OP GRUPO3: motorista desativado NÃO vê as próprias recargas');
do $$ begin
  begin
    insert into motorista_recargas (motorista_id, data, custo) values ('a2222222-0000-0000-0000-000000000000', current_date, 5);
    raise exception 'DEVERIA TER BLOQUEADO: recarga por motorista desativado';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: OP GRUPO3: motorista desativado NÃO escreve';
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
update usuarios set ativo = true where id = '22222222-2222-2222-2222-222222222222';

-- =========================================================================
-- GRUPO 4 — Cascade (LGPD) + prova estrutural
-- =========================================================================
insert into motoristas (id, empresa_id, nome_completo, cpf, status)
values ('a5555555-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista Temp OP', '00000000055', 'ativo');
insert into motorista_recargas (motorista_id, data, custo)
values ('a5555555-0000-0000-0000-000000000000', current_date, 20);
delete from motoristas where id = 'a5555555-0000-0000-0000-000000000000';
select _assert(
  (select count(*) from motorista_recargas where motorista_id = 'a5555555-0000-0000-0000-000000000000') = 0,
  'OP GRUPO4: excluir o motorista apaga as recargas em cascata (LGPD)');

select _assert(
  (select count(*) from pg_policies where tablename = 'motorista_recargas') = 1,
  'OP GRUPO4: motorista_recargas tem EXATAMENTE 1 policy (só o dono — staff sem porta)');
select _assert(
  (select count(*) from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
    where c.relname = 'motorista_recargas' and not tg.tgisinternal) = 0,
  'OP GRUPO4: SEM trigger nenhum em recargas (nem audit_log — privacidade)');

do $$ begin raise notice '==== DIÁRIO OPERACIONAL (0048): TODOS OS TESTES PASSARAM ===='; end $$;
