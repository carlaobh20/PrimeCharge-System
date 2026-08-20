-- Suíte 66 — APP MOTORISTA: Inteligência Financeira Pessoal ("Minha Meta") — migration 0047.
-- O ponto central desta suíte é PRIVACIDADE NA DIREÇÃO INVERSA das demais tabelas: aqui o dado
-- é do MOTORISTA, e o STAFF (inclusive owner) NÃO pode ver NADA. Também cobre: isolamento
-- A×B e entre empresas, motorista inativo bloqueado, constraints (valores negativos,
-- periodicidade inválida, horas>24), unicidade ganho/dia e snapshot/mês (upsert), trigger de
-- atualizado_em e cascade ao excluir o motorista.
--
-- Usa os helpers _assert/_login criados pela suíte 20 (mesmo banco, mesma sessão de harness).

\set ON_ERROR_STOP on

-- =========================================================================
-- GRUPO 1 — Motorista A: CRUD completo dos próprios dados
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A (a2222222)

insert into motorista_despesas (id, motorista_id, grupo, categoria, nome, valor, periodicidade)
values ('de000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000',
        'vida', 'aluguel_casa', 'Aluguel', 1500, 'mensal');
insert into motorista_despesas (id, motorista_id, grupo, categoria, nome, dependente, valor, periodicidade)
values ('de000000-0000-0000-0000-000000000002', 'a2222222-0000-0000-0000-000000000000',
        'familia', 'escola', 'Escola', 'Filho 1', 200, 'semanal');
select _assert((select count(*) from motorista_despesas) = 2,
  'MF GRUPO1: Motorista A cadastra e vê as próprias despesas (2)');

update motorista_despesas set valor = 1600 where id = 'de000000-0000-0000-0000-000000000001';
select _assert((select valor from motorista_despesas where id='de000000-0000-0000-0000-000000000001') = 1600,
  'MF GRUPO1: Motorista A atualiza a própria despesa');
select _assert(
  (select atualizado_em > criado_em from motorista_despesas where id='de000000-0000-0000-0000-000000000001'),
  'MF GRUPO1: trigger atualizado_em fotografa a alteração');

insert into motorista_meta_config (motorista_id, dias_trabalho, renda_hora)
values ('a2222222-0000-0000-0000-000000000000', 25, 40)
on conflict (motorista_id) do update set dias_trabalho = excluded.dias_trabalho, renda_hora = excluded.renda_hora;
select _assert((select dias_trabalho from motorista_meta_config) = 25,
  'MF GRUPO1: Motorista A grava a própria configuração (25 dias)');

insert into motorista_objetivos (id, motorista_id, nome, valor_meta, valor_atual)
values ('0b000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'Reserva', 5000, 500);
select _assert((select count(*) from motorista_objetivos) = 1,
  'MF GRUPO1: Motorista A cria o próprio objetivo');

insert into motorista_ganhos (motorista_id, data, valor, horas)
values ('a2222222-0000-0000-0000-000000000000', current_date, 400, 10);
select _assert((select count(*) from motorista_ganhos) = 1,
  'MF GRUPO1: Motorista A lança o realizado do dia (manual — nada inventado)');

insert into motorista_custos_snapshots (motorista_id, mes, total, por_grupo)
values ('a2222222-0000-0000-0000-000000000000', date_trunc('month', current_date)::date, 2466.67, '{"vida":1600}'::jsonb);
select _assert((select count(*) from motorista_custos_snapshots) = 1,
  'MF GRUPO1: Motorista A grava o snapshot do mês');

-- =========================================================================
-- GRUPO 2 — Unicidade: 1 ganho por dia, 1 snapshot por mês (semântica de upsert)
-- =========================================================================
do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor)
    values ('a2222222-0000-0000-0000-000000000000', current_date, 999);
    raise exception 'DEVERIA TER BLOQUEADO: segundo ganho no mesmo dia';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO2: segundo INSERT de ganho no mesmo dia bloqueado (unique)';
  end;
end $$;

insert into motorista_ganhos (motorista_id, data, valor, horas)
values ('a2222222-0000-0000-0000-000000000000', current_date, 450, 11)
on conflict (motorista_id, data) do update set valor = excluded.valor, horas = excluded.horas;
select _assert(
  (select count(*) from motorista_ganhos where data = current_date) = 1
  and (select valor from motorista_ganhos where data = current_date) = 450,
  'MF GRUPO2: upsert corrige o dia sem duplicar (450 substituiu 400)');

insert into motorista_custos_snapshots (motorista_id, mes, total)
values ('a2222222-0000-0000-0000-000000000000', date_trunc('month', current_date)::date, 2500)
on conflict (motorista_id, mes) do update set total = excluded.total;
select _assert(
  (select count(*) from motorista_custos_snapshots) = 1
  and (select total from motorista_custos_snapshots) = 2500,
  'MF GRUPO2: upsert do snapshot do mês sem duplicar');

-- =========================================================================
-- GRUPO 3 — Constraints: nada de dado inválido
-- =========================================================================
do $$ begin
  begin
    insert into motorista_despesas (motorista_id, grupo, categoria, nome, valor)
    values ('a2222222-0000-0000-0000-000000000000', 'vida', 'x', 'x', -10);
    raise exception 'DEVERIA TER BLOQUEADO: despesa com valor negativo';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO3: valor negativo rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_despesas (motorista_id, grupo, categoria, nome, valor, periodicidade)
    values ('a2222222-0000-0000-0000-000000000000', 'vida', 'x', 'x', 10, 'bimestral');
    raise exception 'DEVERIA TER BLOQUEADO: periodicidade inválida';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO3: periodicidade fora da lista rejeitada (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_despesas (motorista_id, grupo, categoria, nome, valor)
    values ('a2222222-0000-0000-0000-000000000000', 'lazer', 'x', 'x', 10);
    raise exception 'DEVERIA TER BLOQUEADO: grupo inválido';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO3: grupo fora da lista rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    update motorista_meta_config set dias_trabalho = 0 where motorista_id = 'a2222222-0000-0000-0000-000000000000';
    raise exception 'DEVERIA TER BLOQUEADO: 0 dias de trabalho';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO3: dias_trabalho fora de 1..31 rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor, horas)
    values ('a2222222-0000-0000-0000-000000000000', current_date - 1, 100, 25);
    raise exception 'DEVERIA TER BLOQUEADO: 25 horas num dia';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO3: horas > 24 rejeitado (check)';
  end;
end $$;

-- =========================================================================
-- GRUPO 4 — Ataques de escrita: A não escreve em nome de B
-- =========================================================================
do $$ begin
  begin
    insert into motorista_despesas (motorista_id, grupo, categoria, nome, valor)
    values ('a3333333-0000-0000-0000-000000000000', 'vida', 'x', 'Plantada', 10);
    raise exception 'DEVERIA TER BLOQUEADO: despesa em nome do Motorista B';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO4: A NÃO cadastra despesa em nome de B (with check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor)
    values ('b4444444-0000-0000-0000-000000000000', current_date, 10);
    raise exception 'DEVERIA TER BLOQUEADO: ganho em nome de motorista da empresa B';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO4: A NÃO lança ganho pra motorista de outra empresa';
  end;
end $$;

reset role;

-- =========================================================================
-- GRUPO 5 — Isolamento de leitura: B, empresa B, STAFF (privacidade invertida)
-- =========================================================================
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B (mesma empresa A)
select _assert((select count(*) from motorista_despesas) = 0, 'MF GRUPO5: Motorista B NÃO vê despesas de A');
select _assert((select count(*) from motorista_meta_config) = 0, 'MF GRUPO5: Motorista B NÃO vê config de A');
select _assert((select count(*) from motorista_objetivos) = 0, 'MF GRUPO5: Motorista B NÃO vê objetivos de A');
select _assert((select count(*) from motorista_ganhos) = 0, 'MF GRUPO5: Motorista B NÃO vê ganhos de A');
select _assert((select count(*) from motorista_custos_snapshots) = 0, 'MF GRUPO5: Motorista B NÃO vê snapshots de A');
select _assert((select count(*) from motorista_despesas where id='de000000-0000-0000-0000-000000000001') = 0,
  'MF GRUPO5: Ataque por ID direto: B -> despesa de A = 0 linhas');
reset role;

set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- Motorista C (empresa B)
select _assert((select count(*) from motorista_despesas) = 0, 'MF GRUPO5: motorista de OUTRA empresa NÃO vê nada');
select _assert((select count(*) from motorista_ganhos) = 0, 'MF GRUPO5: motorista de OUTRA empresa NÃO vê ganhos');
reset role;

-- ⚠️ O teste que define esta feature: o STAFF OWNER da própria empresa do motorista NÃO vê.
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A (owner, MESMA empresa de A)
select _assert((select count(*) from motorista_despesas) = 0,
  'MF GRUPO5: STAFF OWNER NÃO vê despesa pessoal de motorista (privacidade — Módulo 33)');
select _assert((select count(*) from motorista_meta_config) = 0, 'MF GRUPO5: STAFF NÃO vê config');
select _assert((select count(*) from motorista_objetivos) = 0, 'MF GRUPO5: STAFF NÃO vê objetivos');
select _assert((select count(*) from motorista_ganhos) = 0, 'MF GRUPO5: STAFF NÃO vê ganhos declarados');
select _assert((select count(*) from motorista_custos_snapshots) = 0, 'MF GRUPO5: STAFF NÃO vê snapshots');
do $$ begin
  begin
    insert into motorista_despesas (motorista_id, grupo, categoria, nome, valor)
    values ('a2222222-0000-0000-0000-000000000000', 'vida', 'x', 'Plantada pelo staff', 10);
    raise exception 'DEVERIA TER BLOQUEADO: staff escrevendo despesa pessoal';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO5: STAFF também NÃO escreve nas tabelas pessoais';
  end;
end $$;
reset role;

set role authenticated;
select _login('55555555-5555-5555-5555-555555555555'); -- Staff INATIVO
select _assert((select count(*) from motorista_despesas) = 0, 'MF GRUPO5: staff inativo NÃO vê nada');
reset role;

-- =========================================================================
-- GRUPO 6 — Motorista DESATIVADO: acesso morre junto com o vínculo
-- (current_motorista_id() da 0045 resolve NULL quando usuarios.ativo = false)
-- =========================================================================
update usuarios set ativo = false where id = '22222222-2222-2222-2222-222222222222';

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select public.current_motorista_id()) is null,
  'MF GRUPO6: motorista desativado -> current_motorista_id() = NULL');
select _assert((select count(*) from motorista_despesas) = 0,
  'MF GRUPO6: motorista desativado NÃO vê nem os próprios dados');
do $$ begin
  begin
    insert into motorista_ganhos (motorista_id, data, valor)
    values ('a2222222-0000-0000-0000-000000000000', current_date - 2, 100);
    raise exception 'DEVERIA TER BLOQUEADO: ganho lançado por motorista desativado';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: MF GRUPO6: motorista desativado NÃO escreve';
  end;
end $$;
reset role;

-- (o trigger de proteção de usuarios barra auto-alteração e o audit_log exige usuário real:
--  reativa com a identidade do Staff A — cenário legítimo de reativação pelo owner)
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
update usuarios set ativo = true where id = '22222222-2222-2222-2222-222222222222';

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from motorista_despesas) = 2,
  'MF GRUPO6: reativado, volta a ver os próprios dados (nada foi perdido)');
reset role;

-- =========================================================================
-- GRUPO 7 — Cascade: excluir o motorista limpa os dados pessoais (LGPD)
-- =========================================================================
insert into motoristas (id, empresa_id, nome_completo, cpf, status)
values ('a6666666-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista Temp MF', '00000000066', 'ativo');
insert into motorista_despesas (motorista_id, grupo, categoria, nome, valor)
values ('a6666666-0000-0000-0000-000000000000', 'vida', 'x', 'Temp', 10);
insert into motorista_ganhos (motorista_id, data, valor)
values ('a6666666-0000-0000-0000-000000000000', current_date, 10);
delete from motoristas where id = 'a6666666-0000-0000-0000-000000000000';
select _assert(
  (select count(*) from motorista_despesas where motorista_id='a6666666-0000-0000-0000-000000000000') = 0
  and (select count(*) from motorista_ganhos where motorista_id='a6666666-0000-0000-0000-000000000000') = 0,
  'MF GRUPO7: excluir o motorista apaga os dados pessoais em cascata (LGPD)');

-- =========================================================================
-- GRUPO 8 — Privacidade estrutural: NENHUMA policy além da do dono
-- =========================================================================
select _assert(
  (select count(*) from pg_policies
    where tablename in ('motorista_despesas','motorista_meta_config','motorista_objetivos',
                        'motorista_ganhos','motorista_custos_snapshots')) = 5,
  'MF GRUPO8: exatamente 1 policy por tabela (só a do dono — staff NÃO tem porta de entrada)');
select _assert(
  (select count(*) from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
    where c.relname in ('motorista_despesas','motorista_meta_config','motorista_objetivos',
                        'motorista_ganhos','motorista_custos_snapshots')
      and tg.tgname like '%audit%') = 0,
  'MF GRUPO8: SEM trigger de audit_log (auditar vazaria despesa pessoal pro staff)');

do $$ begin raise notice '==== MINHA META (0047): TODOS OS TESTES PASSARAM ===='; end $$;
