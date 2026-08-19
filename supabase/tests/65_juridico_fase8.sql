-- Fase Jurídica 8 — GOVERNANÇA: retroatividade REPETIDA (v→v+1→v+2), concorrência de
-- republicação/revisões/seguros, registro órfão detectável (versão sem template) e RLS das
-- estruturas de governança. Roda DEPOIS de 64. ZERO migration nesta fase — a suíte prova que o
-- schema EXISTENTE sustenta a governança.
\set ON_ERROR_STOP on

-- =========================================================================
-- BASELINE
-- =========================================================================
create temporary table _f8 as
select
  (select versao_template from contrato_templates where id='7e000000-0000-0000-0000-000000000001') as versao_ini,
  (select corpo from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as c_corpo,
  (select snapshot from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as c_snap,
  (select hash_sha256 from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as c_hash,
  (select numero from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as c_num,
  (select template_id from contrato_versoes where id='7e100000-0000-0000-0000-000000000001') as c_tpl,
  (select count(*) from contrato_assinaturas where contrato_versao_id='7e100000-0000-0000-0000-000000000001') as c_ass;

-- =========================================================================
-- MÓDULO 26 — RETROATIVIDADE REPETIDA: republicar DUAS vezes; contrato intacto após CADA uma
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_templates set status='rascunho'  where id='7e000000-0000-0000-0000-000000000001';
update contrato_templates set status='publicado' where id='7e000000-0000-0000-0000-000000000001';
reset role;

select _assert(
  (select versao_template from contrato_templates where id='7e000000-0000-0000-0000-000000000001')
    = (select versao_ini from _f8) + 1,
  'JUR8 Retro: 1ª republicação incrementa a versão do template');
select _assert(
  (select corpo=(select c_corpo from _f8) and snapshot=(select c_snap from _f8)
      and hash_sha256=(select c_hash from _f8) and numero=(select c_num from _f8)
      and template_id=(select c_tpl from _f8)
     from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR8 Retro: após v+1, contrato preserva corpo/snapshot/hash/numero/template_id');

set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_templates set status='rascunho'  where id='7e000000-0000-0000-0000-000000000001';
update contrato_templates set status='publicado' where id='7e000000-0000-0000-0000-000000000001';
reset role;

select _assert(
  (select versao_template from contrato_templates where id='7e000000-0000-0000-0000-000000000001')
    = (select versao_ini from _f8) + 2,
  'JUR8 Retro: 2ª republicação incrementa de novo (versões monotônicas, nunca sobrescreve)');
select _assert(
  (select corpo=(select c_corpo from _f8) and snapshot=(select c_snap from _f8)
      and hash_sha256=(select c_hash from _f8)
     from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR8 Retro: após v+2, contrato CONTINUA byte a byte intacto');
select _assert(
  (select count(*) from contrato_assinaturas where contrato_versao_id='7e100000-0000-0000-0000-000000000001')
    = (select c_ass from _f8),
  'JUR8 Retro: assinaturas do contrato não foram tocadas pelas republicações');

-- =========================================================================
-- MÓDULO 27 — CONCORRÊNCIA: duas revisões jurídicas "simultâneas" COEXISTEM (histórico, nunca
-- upsert silencioso); duas trocas de apólice seguidas geram DOIS eventos (nada colapsa estado).
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
insert into contrato_revisoes_juridicas (empresa_id, template_id, versao_template, responsavel_nome, status, observacoes)
select 'a0000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', versao_template, 'Revisor A', 'aprovado', 'concorrente 1'
  from contrato_templates where id='7e000000-0000-0000-0000-000000000001';
insert into contrato_revisoes_juridicas (empresa_id, template_id, versao_template, responsavel_nome, status, observacoes)
select 'a0000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', versao_template, 'Revisor B', 'aprovado', 'concorrente 2'
  from contrato_templates where id='7e000000-0000-0000-0000-000000000001';
reset role;
select _assert(
  (select count(*) from contrato_revisoes_juridicas
    where template_id='7e000000-0000-0000-0000-000000000001' and observacoes like 'concorrente %') = 2,
  'JUR8 Concorrência: duas aprovações simultâneas coexistem como REGISTROS (nenhuma engole a outra)');

create temporary table _f8_tl as
select count(*) as n from timeline_eventos
 where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_seguro';
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_seguros set apolice='AP-D-CONC-1' where id='91000000-0000-0000-0000-0000000000d1';
update contrato_seguros set apolice='AP-D-CONC-2' where id='91000000-0000-0000-0000-0000000000d1';
reset role;
select _assert(
  (select count(*) from timeline_eventos
    where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_seguro')
    = (select n from _f8_tl) + 2,
  'JUR8 Concorrência: duas alterações de seguro geram DOIS eventos de timeline (estado consistente)');

-- =========================================================================
-- MÓDULO 19 — REGISTRO ÓRFÃO DETECTÁVEL: template removido → versão fica SEM origem (set null),
-- mas o DOCUMENTO do contrato permanece intacto. Nada é apagado em cascata no contrato.
-- =========================================================================
insert into contrato_templates (id, empresa_id, nome, tipo, corpo, variaveis, status)
values ('7e000000-0000-0000-0000-00000000f8f8', 'a0000000-0000-0000-0000-000000000001',
        'Template Temporário F8', 'padrao', 'Corpo temporário {{motorista.nome}}.', '["motorista.nome"]'::jsonb, 'publicado');
insert into contrato_versoes (id, empresa_id, contrato_id, template_id, numero, rotulo, status, snapshot, corpo, hash_sha256)
values ('7e100000-0000-0000-0000-0000000000f8', 'a0000000-0000-0000-0000-000000000001',
        'c7777777-0000-0000-0000-000000000000', '7e000000-0000-0000-0000-00000000f8f8',
        90, 'v90.0', 'rascunho', '{"_meta":{"template_versao":1}}'::jsonb, 'Corpo órfão de teste.', 'hash-f8');
delete from contrato_templates where id='7e000000-0000-0000-0000-00000000f8f8';
select _assert(
  (select template_id is null and corpo='Corpo órfão de teste.'
     from contrato_versoes where id='7e100000-0000-0000-0000-0000000000f8'),
  'JUR8 Órfão: apagar template deixa a versão SEM origem (detectável) e com o documento INTACTO');
select _assert(
  (select count(*) from contrato_versoes where template_id is null) >= 1,
  'JUR8 Órfão: consulta de governança encontra versões sem template de origem');

-- =========================================================================
-- MÓDULO 25 — RLS das estruturas de governança (decisões humanas em juridico_parametros)
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
insert into juridico_parametros (empresa_id, chave, valor)
values ('a0000000-0000-0000-0000-000000000001', 'divergencia_f8_teste', '{"decisao":"ignorada","justificativa":"teste"}'::jsonb);
reset role;

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- motorista A
select _assert((select count(*) from juridico_parametros)=0, 'JUR8 RLS: motorista NÃO vê parâmetros/decisões de governança');
select _assert((select count(*) from contrato_revisoes_juridicas)=0, 'JUR8 RLS: motorista NÃO vê revisões jurídicas');
reset role;

set role authenticated;
select _login('44444444-4444-4444-4444-444444444444'); -- empresa B
select _assert((select count(*) from juridico_parametros where chave='divergencia_f8_teste')=0,
  'JUR8 RLS: empresa B NÃO vê decisões de governança da empresa A');
reset role;

set role authenticated;
select _login('55555555-5555-5555-5555-555555555555'); -- staff inativo
select _assert((select count(*) from juridico_parametros)=0, 'JUR8 RLS: staff inativo NÃO vê parâmetros');
select _assert((select count(*) from contrato_versoes)=0, 'JUR8 RLS: staff inativo NÃO vê versões de contrato');
reset role;

set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
select _assert((select count(*) from juridico_parametros where chave='divergencia_f8_teste')=1,
  'JUR8 RLS: staff ativo da empresa vê a decisão registrada');
reset role;

do $$ begin raise notice '==== FASE JURÍDICA 8: TODOS OS TESTES PASSARAM ===='; end $$;
