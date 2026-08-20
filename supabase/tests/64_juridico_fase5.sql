-- Fase Jurídica 5 — BIBLIOTECA CONTRATUAL: histórico imutável de templates (0046) + RPC de
-- importação + retroatividade completa + RLS. Roda DEPOIS de 63 (aproveita template 7e000000-01,
-- que já acumulou fotografias nas edições de corpo das suítes 62/63 — os asserts usam DELTAS).
\set ON_ERROR_STOP on

-- =========================================================================
-- BASELINE (superuser): quantas fotografias o template padrão já tem
-- =========================================================================
create temporary table _f5_base as
select
  (select count(*) from contrato_template_versoes where template_id='7e000000-0000-0000-0000-000000000001') as fotos,
  (select corpo from contrato_templates where id='7e000000-0000-0000-0000-000000000001') as corpo_atual,
  (select versao_template from contrato_templates where id='7e000000-0000-0000-0000-000000000001') as versao_atual,
  (select corpo from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as contrato_corpo,
  (select snapshot from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as contrato_snapshot;

-- As edições de corpo das suítes 62/63 (2 updates com corpo alterado) DEVEM ter sido fotografadas
-- automaticamente pelo trigger do 0046 — prova que ninguém precisa "lembrar" de versionar.
select _assert((select fotos from _f5_base) >= 2,
  'JUR5 0046: edições de corpo das suítes anteriores foram fotografadas automaticamente');

-- =========================================================================
-- GRUPO W — FOTOGRAFIA AUTOMÁTICA + HASH (como STAFF, RLS valendo)
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');

-- staff edita o corpo direto (sem RPC): fotografia com origem default 'edicao'
update contrato_templates set corpo = corpo || ' Cláusula adicionada na fase 5.'
  where id='7e000000-0000-0000-0000-000000000001';
reset role;

select _assert(
  (select count(*) from contrato_template_versoes where template_id='7e000000-0000-0000-0000-000000000001')
    = (select fotos from _f5_base) + 1,
  'JUR5 0046: editar o corpo cria exatamente UMA fotografia nova');
select _assert(
  (select corpo = (select corpo_atual from _f5_base) and origem='edicao'
     from contrato_template_versoes
    where template_id='7e000000-0000-0000-0000-000000000001'
    order by criado_em desc, id limit 1),
  'JUR5 0046: a fotografia guarda o corpo ANTERIOR com origem=edicao (default)');
select _assert(
  (select hash_sha256 = encode(digest((select corpo_atual from _f5_base), 'sha256'), 'hex')
     from contrato_template_versoes
    where template_id='7e000000-0000-0000-0000-000000000001'
    order by criado_em desc, id limit 1),
  'JUR5 0046: hash SHA-256 da fotografia bate com o corpo fotografado');

-- editar campo que NÃO é corpo não fotografa nada (histórico só de redação)
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_templates set nome = nome where id='7e000000-0000-0000-0000-000000000001';
reset role;
select _assert(
  (select count(*) from contrato_template_versoes where template_id='7e000000-0000-0000-0000-000000000001')
    = (select fotos from _f5_base) + 1,
  'JUR5 0046: update sem mudança de corpo NÃO gera fotografia');

-- =========================================================================
-- GRUPO X — RPC DE IMPORTAÇÃO (retorno do advogado) + ORIGENS
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
select fn_atualizar_corpo_template(
  '7e000000-0000-0000-0000-000000000001',
  'Contrato entre {{empresa.nome}} e {{motorista.nome}}. Valor {{contrato.valor}}. Redação revisada pelo advogado.',
  'retorno_advogado', 'Dra. Teste — Escritório Fake', 'retorno da revisão de teste');
reset role;

select _assert(
  (select corpo like '%Redação revisada pelo advogado.%'
     from contrato_templates where id='7e000000-0000-0000-0000-000000000001'),
  'JUR5 RPC: importação do retorno atualizou o corpo do template');
select _assert(
  (select origem='retorno_advogado' and responsavel_nome='Dra. Teste — Escritório Fake'
      and observacao='retorno da revisão de teste'
     from contrato_template_versoes
    where template_id='7e000000-0000-0000-0000-000000000001'
    order by criado_em desc, id limit 1),
  'JUR5 RPC: fotografia registra origem retorno_advogado + responsável + observação');
select _assert(
  (select count(*) from contrato_template_versoes where template_id='7e000000-0000-0000-0000-000000000001')
    = (select fotos from _f5_base) + 2,
  'JUR5 RPC: importação fotografou a redação anterior (v1 enviada nunca se perde)');

-- origem inválida é bloqueada (só edicao/retorno_advogado/ajuste_interno passam pelo RPC)
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
select _bloqueia(
  $q$select fn_atualizar_corpo_template('7e000000-0000-0000-0000-000000000001','x','hackeada')$q$,
  'JUR5 RPC: origem inválida é rejeitada');
reset role;

-- =========================================================================
-- GRUPO Y — IMUTABILIDADE DO HISTÓRICO (nem superuser altera/apaga)
-- =========================================================================
select _bloqueia(
  $q$update contrato_template_versoes set corpo='adulterado'
     where template_id='7e000000-0000-0000-0000-000000000001'$q$,
  'JUR5 Imutável: UPDATE em fotografia é bloqueado (até para superuser)');
select _bloqueia(
  $q$delete from contrato_template_versoes
     where template_id='7e000000-0000-0000-0000-000000000001'$q$,
  'JUR5 Imutável: DELETE de fotografia é bloqueado (até para superuser)');

-- =========================================================================
-- GRUPO Z — RETROATIVIDADE COMPLETA: republicar template NÃO toca contrato gerado
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_templates set status='rascunho' where id='7e000000-0000-0000-0000-000000000001';
update contrato_templates set status='publicado' where id='7e000000-0000-0000-0000-000000000001';
reset role;

select _assert(
  (select versao_template from contrato_templates where id='7e000000-0000-0000-0000-000000000001')
    = (select versao_atual from _f5_base) + 1,
  'JUR5 Retro: republicação criou versão nova do template');
select _assert(
  (select corpo = (select contrato_corpo from _f5_base)
      and snapshot = (select contrato_snapshot from _f5_base)
     from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR5 Retro: contrato gerado permanece BYTE A BYTE igual após edições + retorno + republicação');

-- =========================================================================
-- GRUPO AA — RLS: histórico é staff-only da própria empresa
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- motorista A
select _assert((select count(*) from contrato_template_versoes)=0,
  'JUR5 RLS: motorista NÃO vê histórico de templates');
select _bloqueia(
  $q$select fn_atualizar_corpo_template('7e000000-0000-0000-0000-000000000001','tentativa do motorista','edicao')$q$,
  'JUR5 RLS: motorista NÃO consegue alterar template via RPC (security invoker)');
reset role;

set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- motorista da empresa B
select _assert((select count(*) from contrato_template_versoes)=0,
  'JUR5 RLS: usuário de OUTRA empresa não vê o histórico da empresa A');
reset role;

set role authenticated;
select _login('55555555-5555-5555-5555-555555555555'); -- staff INATIVO
select _assert((select count(*) from contrato_template_versoes)=0,
  'JUR5 RLS: staff inativo NÃO vê histórico');
reset role;

set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
select _assert(
  (select count(*) from contrato_template_versoes where template_id='7e000000-0000-0000-0000-000000000001') >= 4,
  'JUR5 RLS: staff ativo vê o histórico completo da empresa');
reset role;

do $$ begin raise notice '==== FASE JURÍDICA 5: TODOS OS TESTES PASSARAM ===='; end $$;
