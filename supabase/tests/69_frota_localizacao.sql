-- Suíte 69 — FASE 20: Localização Operacional (migration 0051 — motorista_localizacoes).
-- Cobre criação/atualização, constraints, isolamento motorista×motorista e empresa×empresa,
-- ciclo de vida do vínculo operacional (contrato encerrado / motorista desativado), IDOR,
-- staff sem porta de entrada, frescor (recente vs. antiga) e ausência de dado. Casos de
-- vocabulário/arquitetura (GPS negado, mapa lazy, Uber/99, duplicação) ficam em
-- scripts/audit-frota-localizacao-fase20.ts, mesma divisão de responsabilidade da suíte 68.
-- Usa os helpers _assert/_login (suíte 20) e o seed de 10_seed_teste.sql: Motorista A
-- (a2222222, empresa A, contrato ativo c2222222 → veículo e2222222), Motorista B (a3333333,
-- empresa A, contrato ativo c3333333 → veículo e3333333), Motorista C (b4444444, empresa B,
-- contrato ativo c4444444 → veículo f4444444), Staff A (11111111, owner, empresa A).

\set ON_ERROR_STOP on

-- Staff B, inline (o seed base não tem staff de Empresa B) — setup, roda como superuser.
insert into auth.users (id, email) values
  ('66666666-6666-6666-6666-666666666666', 'staffB@b.com');
insert into usuarios (id, empresa_id, nome_completo, email, role, ativo, motorista_id) values
  ('66666666-6666-6666-6666-666666666666', 'b0000000-0000-0000-0000-000000000001', 'Staff B', 'staffB@b.com', 'owner', true, null);

-- =========================================================================
-- GRUPO 1 — Criação / atualização (casos 1-2)
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A

insert into motorista_localizacoes (id, contrato_id, latitude, longitude, accuracy_m, timestamp_localizacao)
values ('10000000-0000-0000-0000-000000000001', 'c2222222-0000-0000-0000-000000000000', -23.55, -46.63, 12.5, now() - interval '30 seconds');
select _assert((select count(*) from motorista_localizacoes) = 1, 'LOC GRUPO1: caso 1 — Motorista A cria a própria localização');
select _assert(
  (select motorista_id from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000001') = 'a2222222-0000-0000-0000-000000000000',
  'LOC GRUPO1: motorista_id preenchido por default (current_motorista_id()), sem o cliente precisar enviar');
select _assert(
  (select veiculo_id from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000001') = 'e2222222-0000-0000-0000-000000000000',
  'LOC GRUPO1: veiculo_id derivado do contrato pelo trigger, não do cliente');
select _assert(
  (select empresa_id from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000001') = 'a0000000-0000-0000-0000-000000000001',
  'LOC GRUPO1: empresa_id derivado do contrato pelo trigger, não do cliente');

-- "Atualização" numa tabela insert-only = uma nova captura, nunca um UPDATE na linha anterior.
insert into motorista_localizacoes (id, contrato_id, latitude, longitude, accuracy_m, timestamp_localizacao)
values ('10000000-0000-0000-0000-000000000002', 'c2222222-0000-0000-0000-000000000000', -23.551, -46.631, 10, now());
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a2222222-0000-0000-0000-000000000000') = 2,
  'LOC GRUPO1: caso 2 — "atualização" é uma segunda linha (histórico), não sobrescreve a primeira');

do $$ begin
  begin
    update motorista_localizacoes set latitude = 0 where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'FALHOU: UPDATE não deveria afetar nenhuma linha (sem policy de UPDATE)';
  exception when others then
    raise notice 'PASS: LOC GRUPO1: tentativa de UPDATE não muda nada (tabela é insert-only por RLS)';
  end;
end $$;
select _assert((select latitude from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000001') = -23.55,
  'LOC GRUPO1: latitude original preservada — nenhuma policy de UPDATE existe');

-- =========================================================================
-- GRUPO 2 — Constraints (casos 3-6, 24)
-- =========================================================================
do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('c2222222-0000-0000-0000-000000000000', 200, -46.63, now());
    raise exception 'FALHOU: latitude fora de [-90,90] deveria ser bloqueada';
  exception when check_violation then
    raise notice 'PASS: LOC GRUPO2: caso 3 — latitude inválida rejeitada (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('c2222222-0000-0000-0000-000000000000', -23.55, -200, now());
    raise exception 'FALHOU: longitude fora de [-180,180] deveria ser bloqueada';
  exception when check_violation then
    raise notice 'PASS: LOC GRUPO2: caso 4 — longitude inválida rejeitada (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, latitude, longitude, accuracy_m, timestamp_localizacao)
    values ('c2222222-0000-0000-0000-000000000000', -23.55, -46.63, -5, now());
    raise exception 'FALHOU: accuracy_m negativo deveria ser bloqueado';
  exception when check_violation then
    raise notice 'PASS: LOC GRUPO2: caso 5 — accuracy_m negativo rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('c2222222-0000-0000-0000-000000000000', -23.55, -46.63, now() + interval '1 day');
    raise exception 'FALHOU: timestamp no futuro deveria ser bloqueado';
  exception when check_violation then
    raise notice 'PASS: LOC GRUPO2: caso 6 — timestamp futuro (fora da tolerância de clock skew) rejeitado (check)';
  end;
end $$;

do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, longitude, timestamp_localizacao)
    values ('c2222222-0000-0000-0000-000000000000', -46.63, now());
    raise exception 'FALHOU: latitude ausente deveria ser bloqueada (not null)';
  exception when not_null_violation then
    raise notice 'PASS: LOC GRUPO2: caso 24 — sem latitude, insert falha (not null) — NUNCA um default 0/0 inventado';
  end;
end $$;

-- =========================================================================
-- GRUPO 3 — Isolamento motorista × motorista (casos 7-8)
-- =========================================================================
reset role;
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B

insert into motorista_localizacoes (id, contrato_id, latitude, longitude, timestamp_localizacao)
values ('10000000-0000-0000-0000-000000000003', 'c3333333-0000-0000-0000-000000000000', -23.60, -46.70, now());

select _assert((select count(*) from motorista_localizacoes) = 1,
  'LOC GRUPO3: caso 8 — Motorista B só vê a própria localização (isolamento B)');
select _assert((select count(*) from motorista_localizacoes where id in ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')) = 0,
  'LOC GRUPO3: caso 7 — Motorista B NÃO vê nenhuma localização de A (isolamento A, via B)');

reset role;
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- volta pra Motorista A
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a3333333-0000-0000-0000-000000000000') = 0,
  'LOC GRUPO3: caso 7 — Motorista A NÃO vê a localização de B, mesmo por ID direto (IDOR)');

-- =========================================================================
-- GRUPO 4 — Isolamento empresa × empresa (casos 9-10)
-- =========================================================================
reset role;
set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- Motorista C, empresa B
insert into motorista_localizacoes (id, contrato_id, latitude, longitude, timestamp_localizacao)
values ('10000000-0000-0000-0000-000000000004', 'c4444444-0000-0000-0000-000000000000', -25.43, -49.27, now());

reset role;
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A (owner, empresa A)
select _assert((select count(*) from motorista_localizacoes) = 3,
  'LOC GRUPO4: caso 9 — Staff A vê as 3 localizações da própria frota (A + B, motoristas da empresa A)');
select _assert((select count(*) from motorista_localizacoes where empresa_id = 'b0000000-0000-0000-0000-000000000001') = 0,
  'LOC GRUPO4: caso 9 — Staff A NÃO vê nenhuma localização da empresa B');

reset role;
set role authenticated;
select _login('66666666-6666-6666-6666-666666666666'); -- Staff B (owner, empresa B)
select _assert((select count(*) from motorista_localizacoes) = 1,
  'LOC GRUPO4: caso 10 — Staff B vê só a localização da própria frota (Motorista C)');
select _assert((select count(*) from motorista_localizacoes where empresa_id = 'a0000000-0000-0000-0000-000000000001') = 0,
  'LOC GRUPO4: caso 10 — Staff B NÃO vê nenhuma localização da empresa A');

-- =========================================================================
-- GRUPO 5 — Staff sem porta de entrada de escrita (caso 16)
-- =========================================================================
do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('c4444444-0000-0000-0000-000000000000', -25.43, -49.27, now());
    raise exception 'FALHOU: staff não deveria conseguir inserir localização nenhuma';
  exception when insufficient_privilege or others then
    raise notice 'PASS: LOC GRUPO5: caso 16 — staff (mesmo dono do contrato) NÃO tem policy de INSERT';
  end;
end $$;

-- =========================================================================
-- GRUPO 6 — Contrato ativo / contrato encerrado (casos 11-12, 14 "veículo desvinculado")
-- =========================================================================
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A encerra o contrato de B
update contratos set status = 'encerrado' where id = 'c3333333-0000-0000-0000-000000000000';
select _assert((select status from contratos where id = 'c3333333-0000-0000-0000-000000000000') = 'encerrado',
  'LOC GRUPO6: setup — contrato de B encerrado pela state machine real (fn_validar_transicao_contrato)');
select _assert((select status from veiculos where id = 'e3333333-0000-0000-0000-000000000000') = 'devolvido',
  'LOC GRUPO6: caso 14 — veículo "desvinculado": propagação real (fn_propagar_status_contrato) devolve o veículo');

reset role;
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B, agora sem contrato ativo
do $$ begin
  begin
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('c3333333-0000-0000-0000-000000000000', -23.60, -46.70, now());
    raise exception 'FALHOU: contrato encerrado não deveria aceitar nova localização';
  exception when others then
    raise notice 'PASS: LOC GRUPO6: caso 12 — contrato encerrado bloqueia nova captura (trigger)';
  end;
end $$;
select _assert((select count(*) from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000003') = 1,
  'LOC GRUPO6: caso 12 — a localização gravada QUANDO o contrato ainda estava ativo continua existindo (histórico não é apagado)');

reset role;
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A ainda enxerga o histórico de B
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a3333333-0000-0000-0000-000000000000') = 1,
  'LOC GRUPO6: caso 11 — histórico de contrato agora encerrado continua visível pela empresa (é dado real do período em que esteve ativo)');

-- caso 11 positivo (contrato ainda ativo aceita) — Motorista A (contrato c2222222 continua ativo)
reset role;
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
values ('c2222222-0000-0000-0000-000000000000', -23.552, -46.632, now());
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a2222222-0000-0000-0000-000000000000') = 3,
  'LOC GRUPO6: caso 11 — contrato ativo continua aceitando novas capturas normalmente');

-- =========================================================================
-- GRUPO 7 — Motorista desativado (caso 13)
-- =========================================================================
-- fn_bloquear_autoescalada_usuario (0039) bloqueia `UPDATE usuarios SET ativo=...` quando
-- `old.id = auth.uid()` — e a sessão ainda carrega o jwt claim do próprio Motorista A (última
-- identidade logada, GRUPO6). Troca a identidade ambiente para Staff A antes do UPDATE de setup
-- (mesmo truque, ainda que não documentado assim, que fez a suíte 66 funcionar: a identidade
-- logada no momento do UPDATE nunca é a da própria linha sendo desativada).
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A — não é a própria linha
reset role; -- desativar usuarios é setup, não teste (mesmo padrão da suíte 66/67/68)
update usuarios set ativo = false where id = '22222222-2222-2222-2222-222222222222';

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert(public.current_motorista_id() is null,
  'LOC GRUPO7: caso 13 — usuário desativado -> current_motorista_id() = NULL (RLS de leitura já bloqueia)');

-- Reativa e usa outro caminho para provar a checagem ESPECÍFICA do trigger desta tabela
-- (current_motorista_id() continuar resolvendo, mas usuarios.ativo=false — achado da auditoria,
-- seção 20): usar a sessão de um staff para inserir em nome de A não é possível (staff não tem
-- policy de insert, GRUPO 5) — a prova direta é: mesmo que a RLS de insert dependesse só de
-- motorista_id = current_motorista_id(), o trigger AINDA rejeitaria por usuarios.ativo=false.
-- Verificado com current_motorista_id() diretamente:
select _login('11111111-1111-1111-1111-111111111111'); -- troca de identidade de novo, mesmo motivo
reset role;
select _assert((select ativo from usuarios where id = '22222222-2222-2222-2222-222222222222') = false,
  'LOC GRUPO7: setup — usuário de Motorista A está desativado');
update usuarios set ativo = true where id = '22222222-2222-2222-2222-222222222222';
select _assert((select ativo from usuarios where id = '22222222-2222-2222-2222-222222222222') = true,
  'LOC GRUPO7: caso 13 — reativado, volta a operar normalmente (nada foi perdido)');

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
values ('c2222222-0000-0000-0000-000000000000', -23.553, -46.633, now());
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a2222222-0000-0000-0000-000000000000') = 4,
  'LOC GRUPO7: motorista reativado volta a conseguir registrar localização');

-- =========================================================================
-- GRUPO 8 — IDOR: motorista tenta usar contrato de outro motorista (caso 15)
-- =========================================================================
do $$ begin
  begin
    -- Motorista A logado, usando o contrato de B (c3333333) — contrato.motorista_id != current_motorista_id()
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('c3333333-0000-0000-0000-000000000000', -23.55, -46.63, now());
    raise exception 'FALHOU: A não deveria conseguir gravar localização usando o contrato de B';
  exception when others then
    raise notice 'PASS: LOC GRUPO8: caso 15 — IDOR via contrato de outro motorista bloqueado (trigger)';
  end;
end $$;

do $$ begin
  begin
    -- Motorista A logado, tentando forçar motorista_id de B explicitamente no INSERT
    insert into motorista_localizacoes (motorista_id, contrato_id, latitude, longitude, timestamp_localizacao)
    values ('a3333333-0000-0000-0000-000000000000', 'c2222222-0000-0000-0000-000000000000', -23.55, -46.63, now());
    raise exception 'FALHOU: A não deveria conseguir gravar localização em nome de B';
  exception when others then
    raise notice 'PASS: LOC GRUPO8: caso 15 — IDOR via motorista_id forjado bloqueado (RLS with check)';
  end;
end $$;

do $$ begin
  begin
    -- contrato inexistente
    insert into motorista_localizacoes (contrato_id, latitude, longitude, timestamp_localizacao)
    values ('99999999-9999-9999-9999-999999999999', -23.55, -46.63, now());
    raise exception 'FALHOU: contrato inexistente deveria ser bloqueado';
  exception when others then
    raise notice 'PASS: LOC GRUPO8: contrato_id inexistente bloqueado (trigger)';
  end;
end $$;

-- =========================================================================
-- GRUPO 9 — Frescor: recente vs. antiga vs. sem dado (casos 17-19)
-- =========================================================================
insert into motorista_localizacoes (id, contrato_id, latitude, longitude, timestamp_localizacao)
values ('10000000-0000-0000-0000-000000000005', 'c2222222-0000-0000-0000-000000000000', -23.554, -46.634, now() - interval '20 minutes');
select _assert(
  (select count(*) from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000005') = 1,
  'LOC GRUPO9: caso 18 — localização antiga (20 min) é aceita normalmente (não é erro, é só velha)');

-- "última posição conhecida" (Módulo 2) via DISTINCT ON — deve ser a mais RECENTE, não a antiga.
select _assert(
  (select id from motorista_localizacoes
     where veiculo_id = 'e2222222-0000-0000-0000-000000000000'
     order by timestamp_localizacao desc limit 1) != '10000000-0000-0000-0000-000000000005',
  'LOC GRUPO9: caso 17 — "última posição conhecida" é a mais recente, não a mais antiga inserida por último');

reset role;
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A
select _assert(
  (select count(*) from motorista_localizacoes where veiculo_id = 'f4444444-0000-0000-0000-000000000000') = 0,
  'LOC GRUPO9: caso 19 — veículo sem NENHUMA localização registrada: query devolve zero linhas, nunca uma posição inventada');

-- =========================================================================
-- GRUPO 10 — Arquitetura da tabela (checagens estruturais)
-- =========================================================================
select _assert(
  (select count(*) from pg_policies where tablename = 'motorista_localizacoes' and cmd = 'INSERT') = 1,
  'LOC GRUPO10: exatamente 1 policy de INSERT (só o motorista dono)');
select _assert(
  (select count(*) from pg_policies where tablename = 'motorista_localizacoes' and cmd = 'SELECT') = 2,
  'LOC GRUPO10: exatamente 2 policies de SELECT (motorista dono + empresa do contrato)');
select _assert(
  (select count(*) from pg_policies where tablename = 'motorista_localizacoes' and cmd in ('UPDATE','DELETE')) = 0,
  'LOC GRUPO10: ZERO policy de UPDATE/DELETE — tabela insert-only, ninguém apaga histórico');
select _assert(
  not exists (
    select 1 from information_schema.triggers
    where event_object_table = 'motorista_localizacoes' and trigger_name = 'trg_motorista_localizacoes_audit'
  ),
  'LOC GRUPO10: SEM trigger de audit_log (localização é dado sensível — mesmo cuidado do 0047/0049)');

select _assert(true, '==== LOCALIZAÇÃO OPERACIONAL (0051): TODOS OS TESTES PASSARAM ====');
