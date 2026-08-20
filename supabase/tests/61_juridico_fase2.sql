-- Fase Jurídica 2 — workflow ponta a ponta + notificações (0043) + recusa + ataques extras.
-- Roda DEPOIS de 60_juridico.sql e assume o estado que ele deixou no contrato A (c2222222):
--   v1 (7e1...01) vigente/congelada; v2 (7e1...02) rascunho; assinaturas da v1 criadas.
\set ON_ERROR_STOP on

-- =========================================================================
-- GRUPO G — Workflow completo da v2: rascunho -> revisão -> aprovação ->
-- assinatura (congela + notifica) -> assinada -> vigente; v1 -> substituída.
-- =========================================================================
update contrato_versoes set status='em_revisao' where id='7e100000-0000-0000-0000-000000000002';
update contrato_versoes set status='aprovada'   where id='7e100000-0000-0000-0000-000000000002';

-- Baseline: a jornada da v1 (na suíte 60) já gerou 1 notificação de assinatura + 1 de vigência.
select _assert((select count(*) from notificacoes where tipo='contrato' and motorista_id='a2222222-0000-0000-0000-000000000000') = 2,
  'JUR2 Notif: aprovar NÃO gera notificação nova (só as 2 da jornada da v1 existem)');

update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-000000000002';
select _assert(
  (select congelada from contrato_versoes where id='7e100000-0000-0000-0000-000000000002'),
  'JUR2 Workflow: v2 congela ao entrar em aguardando_assinatura');
select _assert(
  (select count(*) from notificacoes where tipo='contrato' and motorista_id='a2222222-0000-0000-0000-000000000000'
     and titulo like '%aguardando sua assinatura%') = 2,
  'JUR2 Notif: entrar em aguardando_assinatura notifica o motorista (v1 + v2 = 2, 0043)');

-- assinaturas da v2
insert into contrato_assinaturas (id, empresa_id, contrato_versao_id, parte, ordem, status, enviado_em)
values
  ('7e200000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-000000000002', 'motorista', 1, 'enviado', now()),
  ('7e200000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-000000000002', 'primecharge', 2, 'nao_enviado', null);

-- motorista A visualiza e assina A PRÓPRIA linha pela RLS
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
update contrato_assinaturas set status='visualizado', visualizado_em=now() where id='7e200000-0000-0000-0000-000000000011';
update contrato_assinaturas set status='assinado', assinado_em=now(),
  evidencia='{"user_agent":"teste","origem":"app_motorista","email":"motoristaA@a.com"}'::jsonb
  where id='7e200000-0000-0000-0000-000000000011';
reset role;
select _assert(
  (select status='assinado' and evidencia->>'origem'='app_motorista' from contrato_assinaturas where id='7e200000-0000-0000-0000-000000000011'),
  'JUR2 Workflow: motorista visualiza e assina a própria linha (evidência registrada)');

-- staff registra a assinatura da PrimeCharge
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_assinaturas set status='assinado', assinado_em=now() where id='7e200000-0000-0000-0000-000000000012';
reset role;
select _assert((select status='assinado' from contrato_assinaturas where id='7e200000-0000-0000-0000-000000000012'),
  'JUR2 Workflow: staff registra a assinatura da PrimeCharge');

-- timeline de assinatura (0043) registrou os eventos
select _assert(
  (select count(*) from timeline_eventos where entidade_tipo='contrato'
     and entidade_id='c2222222-0000-0000-0000-000000000000' and tipo='contrato_assinatura') >= 3,
  'JUR2 Timeline: mudanças de assinatura viram eventos na timeline do contrato (0043)');

-- v2 assinada -> vigente notifica; v1 vira substituída
update contrato_versoes set status='assinada' where id='7e100000-0000-0000-0000-000000000002';
update contrato_versoes set status='vigente'  where id='7e100000-0000-0000-0000-000000000002';
select _assert(
  (select count(*) from notificacoes where tipo='contrato' and motorista_id='a2222222-0000-0000-0000-000000000000'
     and titulo like '%vigente%') = 2,
  'JUR2 Notif: versão vigente notifica o motorista (v1 + v2 = 2, 0043)');
update contrato_versoes set status='substituida' where id='7e100000-0000-0000-0000-000000000001';
select _assert(
  (select status='substituida' and corpo='Corpo original renderizado da v1.' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR2 Versão: v1 substituída permanece com o corpo original intacto (histórico preservado)');

-- =========================================================================
-- GRUPO H — Ciclo de correção + RECUSA (regras 25/38): v3 devolvida na
-- revisão, corrigida, enviada, RECUSADA pelo motorista — nada se apaga.
-- =========================================================================
insert into contrato_versoes (id, empresa_id, contrato_id, template_id, numero, rotulo, status, snapshot, corpo, hash_sha256, criado_por)
values ('7e100000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
        'c2222222-0000-0000-0000-000000000000', '7e000000-0000-0000-0000-000000000001',
        3, 'v3.0', 'rascunho', '{"contrato":{"valor":1600}}'::jsonb, 'Corpo da v3.', 'hash-v3', '11111111-1111-1111-1111-111111111111');

update contrato_versoes set status='em_revisao' where id='7e100000-0000-0000-0000-000000000003';
update contrato_versoes set status='rascunho'   where id='7e100000-0000-0000-0000-000000000003'; -- devolvida p/ correção
select _assert((select status='rascunho' from contrato_versoes where id='7e100000-0000-0000-0000-000000000003'),
  'JUR2 Workflow: revisão devolve para rascunho (ciclo de correção)');
update contrato_versoes set corpo='Corpo da v3 corrigido.' where id='7e100000-0000-0000-0000-000000000003'; -- ainda não congelada: pode
update contrato_versoes set status='em_revisao' where id='7e100000-0000-0000-0000-000000000003';
update contrato_versoes set status='aprovada' where id='7e100000-0000-0000-0000-000000000003';
update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-000000000003';

insert into contrato_assinaturas (id, empresa_id, contrato_versao_id, parte, ordem, status, enviado_em)
values ('7e200000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-000000000003', 'motorista', 1, 'enviado', now());

-- motorista RECUSA com motivo
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
update contrato_assinaturas set status='recusado', motivo_recusa='Valor diferente do combinado'
  where id='7e200000-0000-0000-0000-000000000021';
reset role;
select _assert(
  (select status='recusado' and motivo_recusa='Valor diferente do combinado' from contrato_assinaturas where id='7e200000-0000-0000-0000-000000000021'),
  'JUR2 Recusa: motorista recusa com motivo registrado');
select _assert(
  (select count(*) from timeline_eventos where tipo='contrato_assinatura' and metadata->>'status'='recusado'
     and metadata->>'motivo_recusa'='Valor diferente do combinado') = 1,
  'JUR2 Recusa: recusa vira evento de timeline com o motivo');
select _assert(
  (select status='aguardando_assinatura' and congelada from contrato_versoes where id='7e100000-0000-0000-0000-000000000003'),
  'JUR2 Recusa: a versão NÃO é apagada nem alterada pela recusa (segue congelada, aguardando decisão)');
-- staff decide cancelar a v3 recusada (transição válida) — histórico permanece
update contrato_versoes set status='cancelada' where id='7e100000-0000-0000-0000-000000000003';
select _assert(
  (select count(*) from contrato_versoes where contrato_id='c2222222-0000-0000-0000-000000000000') = 3,
  'JUR2 Recusa: cancelar a versão recusada não apaga nada (3 versões no histórico)');

-- =========================================================================
-- GRUPO I — Ataques extras (regra 37), incluindo empresa B (motorista C).
-- Setup: versão compartilhável no contrato de B (para provar que A não alcança).
-- =========================================================================
insert into contrato_versoes (id, empresa_id, contrato_id, numero, rotulo, status, snapshot, corpo, hash_sha256)
values ('7e100000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000001',
        'c3333333-0000-0000-0000-000000000000', 1, 'v1.0', 'rascunho', '{"contrato":{"valor":1400}}'::jsonb, 'Corpo B.', 'hash-b');
update contrato_versoes set status='em_revisao' where id='7e100000-0000-0000-0000-000000000099';
update contrato_versoes set status='aprovada' where id='7e100000-0000-0000-0000-000000000099';
update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-000000000099';
insert into contrato_assinaturas (id, empresa_id, contrato_versao_id, parte, ordem, status, enviado_em)
values ('7e200000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-000000000099', 'motorista', 1, 'enviado', now());

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A

-- A não ASSINA a assinatura do contrato de B (update atinge 0 linhas)
update contrato_assinaturas set status='assinado' where id='7e200000-0000-0000-0000-000000000099';
-- A não MUDA status da versão de B
update contrato_versoes set status='cancelada' where id='7e100000-0000-0000-0000-000000000099';
-- A não ALTERA hash/snapshot/numero da versão de B (nem vê a linha)
update contrato_versoes set hash_sha256='hackeado' where id='7e100000-0000-0000-0000-000000000099';
reset role;
select _assert((select status='enviado' from contrato_assinaturas where id='7e200000-0000-0000-0000-000000000099'),
  'JUR2 Ataque: A NÃO assina a assinatura do contrato de B');
select _assert(
  (select status='aguardando_assinatura' and hash_sha256='hash-b' from contrato_versoes where id='7e100000-0000-0000-0000-000000000099'),
  'JUR2 Ataque: A NÃO muda status nem hash da versão de B');

-- A não cria assinatura em versão alheia (RLS levanta exceção no insert)
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _bloqueia(
  $q$insert into contrato_assinaturas (empresa_id, contrato_versao_id, parte, ordem)
     values ('a0000000-0000-0000-0000-000000000001','7e100000-0000-0000-0000-000000000099','motorista',1)$q$,
  'JUR2 Ataque: A NÃO cria linha de assinatura (insert é staff-only)');
-- A não cria aditivo
select _bloqueia(
  $q$insert into contrato_aditivos (empresa_id, contrato_id, tipo, descricao)
     values ('a0000000-0000-0000-0000-000000000001','c2222222-0000-0000-0000-000000000000','valor','tentativa')$q$,
  'JUR2 Ataque: motorista NÃO cria aditivo nem no próprio contrato');
reset role;

-- Motorista C (EMPRESA B) não vê nada da empresa A
set role authenticated;
select _login('44444444-4444-4444-4444-444444444444');
select _assert((select count(*) from contrato_versoes) = 0, 'JUR2 Ataque: motorista C (empresa B) não vê nenhuma versão da empresa A');
select _assert((select count(*) from contrato_assinaturas) = 0, 'JUR2 Ataque: motorista C (empresa B) não vê nenhuma assinatura da empresa A');
select _assert((select count(*) from contrato_templates) = 0, 'JUR2 Ataque: motorista C (empresa B) não vê templates da empresa A');
reset role;

-- B (mesma empresa, outro contrato) vê a PRÓPRIA versão compartilhada — e só ela
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333');
select _assert(
  (select count(*) from contrato_versoes) = 1
  and (select id from contrato_versoes) = '7e100000-0000-0000-0000-000000000099',
  'JUR2 RLS: motorista B vê exatamente a própria versão em assinatura (e nenhuma de A)');
reset role;

-- =========================================================================
-- GRUPO J — 0043: coluna empresas.endereco existe e aceita escrita
-- =========================================================================
update empresas set endereco='Av. Teste, 100 — Belo Horizonte/MG' where id='a0000000-0000-0000-0000-000000000001';
select _assert(
  (select endereco='Av. Teste, 100 — Belo Horizonte/MG' from empresas where id='a0000000-0000-0000-0000-000000000001'),
  'JUR2 Empresa: coluna endereco (0043) grava e lê');

do $$ begin raise notice '==== FASE JURÍDICA 2: TODOS OS TESTES PASSARAM ===='; end $$;
