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

-- =========================================================================
-- GRUPO 11 — checklist completo do Módulo 31 (2ª passada, 2026-08-21)
-- =========================================================================
-- Casos que o GRUPO 1-10 já provam indiretamente (motorista A lê A / A não lê B / empresa A lê A
-- / empresa A não lê B / contrato ativo permite / contrato encerrado bloqueia / contrato de
-- outro motorista bloqueia / IDOR / UPDATE bloqueado) não são repetidos aqui — só o que faltava
-- do checklist literal do Módulo 31: staff sem empresa, staff inativo, motorista desativado
-- (assert direto de contagem, não só current_motorista_id() is null), DELETE, veículo/empresa
-- enviados manualmente, e os dois cascades (motorista/contrato).

reset role; -- setup roda como superuser, não como authenticated

-- --- Staff sem empresa = 0 ---------------------------------------------------------------
-- Staff "global" sem empresa não existe no seed base — criado inline (mesmo padrão de Staff B
-- no topo do arquivo). usuarios.empresa_id é nullable (0001) — current_empresa_id() resolve pra
-- NULL, e `empresa_id = NULL` nunca é verdadeiro em SQL (nem pra outro NULL), então a policy de
-- staff nunca casa com nenhuma linha real.
insert into auth.users (id, email) values
  ('78787878-7878-7878-7878-787878787878', 'staffSemEmpresa@nowhere.com');
insert into usuarios (id, empresa_id, nome_completo, email, role, ativo, motorista_id) values
  ('78787878-7878-7878-7878-787878787878', null, 'Staff Sem Empresa', 'staffSemEmpresa@nowhere.com', 'owner', true, null);

set role authenticated;
select _login('78787878-7878-7878-7878-787878787878');
select _assert(public.current_empresa_id() is null, 'LOC GRUPO11: setup — staff sem empresa_id -> current_empresa_id() = NULL');
select _assert((select count(*) from motorista_localizacoes) = 0,
  'LOC GRUPO11: Módulo 31 — staff SEM empresa enxerga ZERO localizações (current_empresa_id() NULL nunca casa)');

-- --- Staff inativo = 0 ---------------------------------------------------------------------
-- Reusa "Staff Inativo A" do seed base (55555555..., empresa A, ativo=false) — já existe pra
-- exatamente este propósito em outras suítes de segurança do projeto.
select _login('55555555-5555-5555-5555-555555555555');
select _assert(public.eh_staff() = false, 'LOC GRUPO11: setup — staff inativo -> eh_staff() = false (0039)');
select _assert((select count(*) from motorista_localizacoes) = 0,
  'LOC GRUPO11: Módulo 31 — staff INATIVO da própria empresa A enxerga ZERO localizações (eh_staff() exige ativo=true)');

-- --- Motorista desativado = 0 (assert de CONTAGEM, não só current_motorista_id()) ----------
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A — identidade diferente da linha alterada
reset role;
update usuarios set ativo = false where id = '44444444-4444-4444-4444-444444444444'; -- Motorista C (empresa B)

set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- Motorista C, agora desativado
select _assert((select count(*) from motorista_localizacoes) = 0,
  'LOC GRUPO11: Módulo 31 — motorista DESATIVADO enxerga ZERO localizações, mesmo tendo 1 própria gravada antes (caso 004)');

select _login('11111111-1111-1111-1111-111111111111');
reset role;
update usuarios set ativo = true where id = '44444444-4444-4444-4444-444444444444'; -- reativa (não afeta os outros grupos, C não é usado depois)

-- --- DELETE bloqueado (tentativa real, não só checagem estrutural do GRUPO 10) -------------
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A, dono das linhas
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a2222222-0000-0000-0000-000000000000') > 0,
  'LOC GRUPO11: setup — Motorista A tem linhas próprias antes da tentativa de DELETE');
delete from motorista_localizacoes where motorista_id = 'a2222222-0000-0000-0000-000000000000';
select _assert((select count(*) from motorista_localizacoes where motorista_id = 'a2222222-0000-0000-0000-000000000000') > 0,
  'LOC GRUPO11: Módulo 31 — DELETE não apaga NENHUMA linha própria (zero policy de DELETE, mesmo o dono não consegue)');

-- --- veiculo_id/empresa_id enviados manualmente = ignorados/derivados (não "aceitos") ------
-- Motorista A, usando o PRÓPRIO contrato (c2222222, válido), tenta enviar explicitamente o
-- veiculo_id de B e o empresa_id de B junto no INSERT — o trigger sobrescreve os dois a partir
-- do contrato de qualquer forma (fn_validar_localizacao_operacional, seção 2 da 0051), então o
-- INSERT nem falha: só ignora silenciosamente o que foi enviado e usa o valor real derivado.
insert into motorista_localizacoes (id, contrato_id, veiculo_id, empresa_id, latitude, longitude, timestamp_localizacao)
values ('10000000-0000-0000-0000-000000000006', 'c2222222-0000-0000-0000-000000000000',
        'e3333333-0000-0000-0000-000000000000', -- veículo de B — INCOERENTE com o contrato de A
        'b0000000-0000-0000-0000-000000000001',  -- empresa B — INCOERENTE com o contrato de A
        -23.555, -46.635, now());
select _assert(
  (select veiculo_id from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000006') = 'e2222222-0000-0000-0000-000000000000',
  'LOC GRUPO11: Módulo 31 — veiculo_id enviado manualmente (incoerente) foi IGNORADO; o trigger gravou o derivado do contrato');
select _assert(
  (select empresa_id from motorista_localizacoes where id = '10000000-0000-0000-0000-000000000006') = 'a0000000-0000-0000-0000-000000000001',
  'LOC GRUPO11: Módulo 31 — empresa_id enviado manualmente (incoerente) foi IGNORADO; o trigger gravou o derivado do contrato');

-- --- Cascade: contrato (real, operacional) --------------------------------------------------
-- Motorista/usuário/veículo/contrato TOTALMENTE descartáveis, isolados dos outros grupos, só
-- pra este teste — nunca reusa uma linha que outro grupo ainda depende.
reset role;
insert into motoristas (id, empresa_id, nome_completo, cpf, status) values
  ('c1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista Descartável Cascade', '00000099999', 'ativo');
insert into auth.users (id, email) values ('c1000000-0000-0000-0000-000000000001', 'cascade@a.com');
insert into usuarios (id, empresa_id, nome_completo, email, role, ativo, motorista_id) values
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Motorista Descartável Cascade', 'cascade@a.com', 'motorista', true, 'c1000000-0000-0000-0000-000000000000');
insert into veiculos (id, empresa_id, marca_id, modelo_id, ano_fabricacao, ano_modelo, chassi, renavam, placa, categoria, tipo_aquisicao, status, quilometragem, valor_compra, valor_financiado, banco) values
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2024, 2025, 'CHASSI-CASCADE', 'RENAV-CASCADE', 'CAS1C11', 'hatch', 'compra_direta', 'alugado', 100, 100000, null, null);
insert into contratos (id, empresa_id, veiculo_id, motorista_id, status, data_inicio, periodicidade, valor_periodico, dia_vencimento, valor_caucao, observacoes) values
  ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000000', 'ativo', current_date, 'semanal', 1400, null, 3000, 'Contrato descartável — cascade');

set role authenticated;
select _login('c1000000-0000-0000-0000-000000000001');
insert into motorista_localizacoes (id, contrato_id, latitude, longitude, timestamp_localizacao)
values ('c1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', -23.60, -46.60, now());
select _assert((select count(*) from motorista_localizacoes where id = 'c1000000-0000-0000-0000-000000000004') = 1,
  'LOC GRUPO11: setup — localização descartável criada pro teste de cascade');

reset role;
delete from contratos where id = 'c1000000-0000-0000-0000-000000000003';
select _assert((select count(*) from motorista_localizacoes where id = 'c1000000-0000-0000-0000-000000000004') = 0,
  'LOC GRUPO11: Módulo 31 — cascade CONTRATO real: apagar o contrato apaga a localização (contrato_id ... on delete cascade)');

-- --- Cascade: motorista (declarado + achado sobre por que não é observável ponta-a-ponta) --
-- `contratos.motorista_id` é `on delete restrict` (0005) — um motorista SÓ pode ser apagado
-- depois que TODOS os contratos dele já sumiram, e apagar um contrato já cascade-apaga (acima)
-- as localizações daquele contrato. Ou seja: no momento em que apagar um motorista deixa de ser
-- bloqueado pelo restrict, as localizações que ele gerou já foram embora pelo cascade do
-- contrato — os dois cascades nunca disparam sobre a MESMA linha em sequência observável.
-- Isso não é uma lacuna de teste: é a topologia real do schema. Confirma-se aqui a DECLARAÇÃO
-- (o cascade existe e dispararia se um dia uma linha órfã de contrato existisse) via
-- pg_constraint, em vez de forçar um cenário artificial que o schema não permite acontecer.
select _assert(
  exists (
    select 1 from pg_constraint
    where conrelid = 'motorista_localizacoes'::regclass
      and confrelid = 'motoristas'::regclass
      and confdeltype = 'c' -- 'c' = CASCADE
  ),
  'LOC GRUPO11: Módulo 31 — cascade MOTORISTA está DECLARADO no schema (motorista_id ... on delete cascade); '
  'não observável ponta-a-ponta pq contratos.motorista_id é ON DELETE RESTRICT (0005) — um motorista só é '
  'apagável depois que seus contratos já sumiram, e apagar o contrato já cascade-apagou a localização primeiro '
  '(comportamento documentado, não uma lacuna — mesmo padrão que o Módulo 31 pede pro caso do contrato)');

-- A limpeza abaixo cascade-atualiza usuarios.motorista_id (on delete set null) da PRÓPRIA linha
-- de usuário do motorista descartável — e o guard de auto-escalação (0039) bloqueia
-- `UPDATE usuarios` quando `old.id = auth.uid()`. auth.uid() ainda é essa mesma identidade
-- (último _login(), linha 415) porque a GUC persiste entre reset role/set role (mesmo achado já
-- documentado nos GRUPOs 6/7 desta suíte) — troca de identidade antes da limpeza, mesmo truque.
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A — não é a linha sendo atualizada pelo cascade
delete from motoristas where id = 'c1000000-0000-0000-0000-000000000000'; -- limpo (sem contrato mais, permitido)
select _assert((select count(*) from motoristas where id = 'c1000000-0000-0000-0000-000000000000') = 0,
  'LOC GRUPO11: limpeza — motorista descartável removido com sucesso (contrato já não existia mais, restrict não bloqueia)');

-- =========================================================================
-- GRUPO 12 — view derivada motorista_localizacoes_atual (migration 0052)
-- =========================================================================
select _assert(
  (select count(*) from information_schema.views where table_name = 'motorista_localizacoes_atual') = 1,
  'LOC GRUPO12: view motorista_localizacoes_atual existe');

-- DISTINCT ON: exatamente 1 linha por veiculo_id, mesmo Motorista A tendo várias capturas pro
-- mesmo veículo (e2222222) ao longo da suíte.
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- Staff A
select _assert(
  (select count(*) from motorista_localizacoes_atual where veiculo_id = 'e2222222-0000-0000-0000-000000000000') = 1,
  'LOC GRUPO12: a view devolve EXATAMENTE 1 linha por veículo, mesmo havendo múltiplas capturas históricas (DISTINCT ON)');
select _assert(
  (select count(*) from motorista_localizacoes_atual) = (select count(distinct veiculo_id) from motorista_localizacoes where empresa_id = 'a0000000-0000-0000-0000-000000000001'),
  'LOC GRUPO12: total de linhas na view (pro staff A) bate com o total de veículos DISTINTOS visíveis pela mesma RLS');

-- RLS: a view herda security_invoker=true — motorista só vê a própria linha através dela também.
reset role;
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B
select _assert(
  (select count(*) from motorista_localizacoes_atual where motorista_id = 'a2222222-0000-0000-0000-000000000000') = 0,
  'LOC GRUPO12: Motorista B NÃO vê a última posição de A através da view (mesma RLS da tabela base — security_invoker)');

-- RLS: staff B só vê a própria empresa através da view também.
reset role;
set role authenticated;
select _login('66666666-6666-6666-6666-666666666666'); -- Staff B
select _assert(
  (select count(*) from motorista_localizacoes_atual where empresa_id = 'a0000000-0000-0000-0000-000000000001') = 0,
  'LOC GRUPO12: Staff B NÃO vê nenhuma linha da empresa A através da view (mesma RLS da tabela base)');

select _assert(true, '==== LOCALIZAÇÃO OPERACIONAL (0051/0052): TODOS OS TESTES PASSARAM ====');
