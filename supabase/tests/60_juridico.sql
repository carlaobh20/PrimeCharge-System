-- Fase Jurídica — Centro de Contratos (migration 0042). Roda DEPOIS de 50_fase4.
-- Cobre: state machine da VERSÃO (transições válidas/inválidas), congelamento ao entrar em
-- assinatura, IMUTABILIDADE do conteúdo congelado, versionamento (v1 intacta ao criar v2 +
-- numero único), SNAPSHOT preservado independente do cadastro, timeline+auditoria, e RLS A×B
-- (motorista vê só o próprio contrato em estado compartilhável; não aprova; não vê/edita o de
-- outro; assina só a própria linha; staff inativo bloqueado; template staff-only).
--
-- Reusa os helpers _login/_assert (20_ataques) e o seed (10_seed) — empresa A com staff owner
-- (11111...), motorista A (22222.../a2222222) no contrato c2222222, motorista B (33333...) no
-- contrato c3333333, motorista C (44444.../empresa B), staff inativo (55555...).
\set ON_ERROR_STOP on

-- helper: espera que o SQL LEVANTE exceção (bloqueio por trigger/RLS). Falha se passar.
create or replace function _bloqueia(p_sql text, p_msg text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception
    when others then
      raise notice 'PASS: %', p_msg;
      return;
  end;
  raise exception 'FALHOU: % (esperava bloqueio, mas o comando passou)', p_msg;
end $$;

-- =========================================================================
-- SETUP (superuser — ignora RLS, mas os TRIGGERS ainda disparam)
-- =========================================================================
-- Template publicável da empresa A
insert into contrato_templates (id, empresa_id, nome, tipo, corpo, variaveis, status, criado_por)
values ('7e000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        'Locação Padrão', 'padrao', 'Contrato entre {{empresa.nome}} e {{motorista.nome}}. Valor {{contrato.valor}}.',
        '["empresa.nome","motorista.nome","contrato.valor"]'::jsonb, 'publicado',
        '11111111-1111-1111-1111-111111111111');

-- Versão 1 do contrato A, em rascunho, com snapshot congelado dos dados do momento da geração
insert into contrato_versoes (id, empresa_id, contrato_id, template_id, numero, rotulo, status, snapshot, corpo, criado_por)
values ('7e100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        'c2222222-0000-0000-0000-000000000000', '7e000000-0000-0000-0000-000000000001',
        1, 'v1.0', 'rascunho',
        '{"motorista":{"nome":"Motorista A"},"contrato":{"valor":1400}}'::jsonb,
        'Corpo original renderizado da v1.', '11111111-1111-1111-1111-111111111111');

-- =========================================================================
-- GRUPO A — State machine da versão (triggers, testados como superuser)
-- =========================================================================
update contrato_versoes set status='em_revisao' where id='7e100000-0000-0000-0000-000000000001';
select _assert((select status from contrato_versoes where id='7e100000-0000-0000-0000-000000000001')='em_revisao',
  'JUR State: rascunho -> em_revisao (válida)');

update contrato_versoes set status='aprovada' where id='7e100000-0000-0000-0000-000000000001';
select _assert(
  (select status='aprovada' and aprovada_em is not null from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR State: em_revisao -> aprovada carimba aprovada_em');

-- pulo inválido (aprovada -> assinada, sem passar por aguardando_assinatura)
select _bloqueia(
  $q$update contrato_versoes set status='assinada' where id='7e100000-0000-0000-0000-000000000001'$q$,
  'JUR State: aprovada -> assinada (pulo) é bloqueada');

-- aprovada -> aguardando_assinatura CONGELA a versão
update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-000000000001';
select _assert(
  (select congelada is true and congelada_em is not null from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR Freeze: entrar em aguardando_assinatura congela a versão (congelada_em setado)');

-- =========================================================================
-- GRUPO B — Imutabilidade do conteúdo congelado
-- =========================================================================
select _bloqueia(
  $q$update contrato_versoes set corpo='ADULTERADO' where id='7e100000-0000-0000-0000-000000000001'$q$,
  'JUR Imutável: editar corpo de versão congelada é bloqueado');
select _bloqueia(
  $q$update contrato_versoes set snapshot='{"hack":true}'::jsonb where id='7e100000-0000-0000-0000-000000000001'$q$,
  'JUR Imutável: editar snapshot de versão congelada é bloqueado');
select _bloqueia(
  $q$update contrato_versoes set hash_sha256='deadbeef' where id='7e100000-0000-0000-0000-000000000001'$q$,
  'JUR Imutável: editar hash de versão congelada é bloqueado');
select _bloqueia(
  $q$update contrato_versoes set numero=99 where id='7e100000-0000-0000-0000-000000000001'$q$,
  'JUR Imutável: editar numero de versão congelada é bloqueado');
-- conteúdo intacto depois das tentativas
select _assert(
  (select corpo='Corpo original renderizado da v1.' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR Imutável: corpo permanece o original após tentativas de adulteração');

-- metadados de fluxo AINDA evoluem numa versão congelada (status/assinatura), só o conteúdo trava
update contrato_versoes set status='assinada' where id='7e100000-0000-0000-0000-000000000001';
select _assert(
  (select status='assinada' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR Fluxo: status de versão congelada avança (aguardando_assinatura -> assinada)');
update contrato_versoes set status='vigente' where id='7e100000-0000-0000-0000-000000000001';
select _assert((select status='vigente' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR State: assinada -> vigente (válida)');

-- transição terminal inválida (vigente -> rascunho)
select _bloqueia(
  $q$update contrato_versoes set status='rascunho' where id='7e100000-0000-0000-0000-000000000001'$q$,
  'JUR State: vigente -> rascunho é bloqueada (terminal só segue p/ substituida)');

-- =========================================================================
-- GRUPO C — Versionamento + snapshot
-- =========================================================================
-- criar v2 do MESMO contrato não apaga nem altera a v1
insert into contrato_versoes (id, empresa_id, contrato_id, template_id, numero, rotulo, status, snapshot, corpo, criado_por)
values ('7e100000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
        'c2222222-0000-0000-0000-000000000000', '7e000000-0000-0000-0000-000000000001',
        2, 'v2.0', 'rascunho', '{"contrato":{"valor":1500}}'::jsonb, 'Corpo da v2.', '11111111-1111-1111-1111-111111111111');
select _assert((select count(*) from contrato_versoes where contrato_id='c2222222-0000-0000-0000-000000000000')=2,
  'JUR Versão: v2 criada; contrato passa a ter 2 versões');
select _assert(
  (select corpo='Corpo original renderizado da v1.' and status='vigente' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR Versão: v1 permanece intacta (corpo e status) após criar v2');

-- numero duplicado dentro do mesmo contrato é bloqueado (unique contrato_id,numero)
select _bloqueia(
  $q$insert into contrato_versoes (empresa_id, contrato_id, numero, status, corpo)
     values ('a0000000-0000-0000-0000-000000000001','c2222222-0000-0000-0000-000000000000',1,'rascunho','dup')$q$,
  'JUR Versão: numero duplicado no mesmo contrato é bloqueado (unique)');

-- snapshot é imune a mudança de cadastro: renomear o motorista NÃO altera o snapshot da v1
update motoristas set nome_completo='Motorista A (renomeado depois)' where id='a2222222-0000-0000-0000-000000000000';
select _assert(
  (select snapshot->'motorista'->>'nome'='Motorista A' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR Snapshot: renomear o motorista no cadastro NÃO altera o snapshot histórico da v1');

-- =========================================================================
-- GRUPO D — Timeline + auditoria (reuso de timeline_eventos / audit_log)
-- =========================================================================
select _assert(
  (select count(*) from timeline_eventos
     where entidade_tipo='contrato' and entidade_id='c2222222-0000-0000-0000-000000000000' and tipo='contrato_versao') >= 3,
  'JUR Timeline: criação + mudanças de status da versão viram eventos na timeline do contrato');
select _assert(
  (select count(*) from audit_log where tabela='contrato_versoes' and registro_id='7e100000-0000-0000-0000-000000000001') >= 1,
  'JUR Auditoria: contrato_versoes gera registros em audit_log');

-- =========================================================================
-- GRUPO E — Assinaturas (setup) + RLS do motorista
-- =========================================================================
-- duas partes assinam a v1 (vigente): motorista + primecharge
insert into contrato_assinaturas (id, empresa_id, contrato_versao_id, parte, ordem, status)
values
  ('7e200000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-000000000001', 'motorista', 1, 'enviado'),
  ('7e200000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-000000000001', 'primecharge', 2, 'nao_enviado');

-- aditivo no contrato A
insert into contrato_aditivos (id, empresa_id, contrato_id, contrato_versao_id, tipo, descricao, status)
values ('7e300000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        'c2222222-0000-0000-0000-000000000000', '7e100000-0000-0000-0000-000000000001', 'valor', 'Reajuste anual', 'vigente');

-- ---- Motorista A ----
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');

-- vê SÓ a versão do próprio contrato em estado compartilhável (v1 vigente); NÃO vê a v2 (rascunho)
select _assert(
  (select count(*) from contrato_versoes)=1
  and (select id from contrato_versoes)='7e100000-0000-0000-0000-000000000001',
  'JUR RLS: motorista A vê só a v1 (vigente) do próprio contrato — não vê a v2 (rascunho)');

-- NÃO aprova/avança versão (sem policy de update p/ motorista -> update atinge 0 linhas)
update contrato_versoes set status='substituida' where id='7e100000-0000-0000-0000-000000000001';
reset role;
select _assert((select status='vigente' from contrato_versoes where id='7e100000-0000-0000-0000-000000000001'),
  'JUR RLS: motorista NÃO consegue mudar status da versão (segue vigente)');
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');

-- NÃO cria versão (WITH CHECK de insert é staff-only) -> RLS levanta exceção
select _bloqueia(
  $q$insert into contrato_versoes (empresa_id, contrato_id, numero, status, corpo)
     values ('a0000000-0000-0000-0000-000000000001','c2222222-0000-0000-0000-000000000000',3,'rascunho','motorista tentando')$q$,
  'JUR RLS: motorista NÃO cria versão (insert bloqueado pela RLS)');

-- vê e assina SÓ a própria linha de assinatura (parte=motorista)
select _assert((select count(*) from contrato_assinaturas)=1
  and (select parte from contrato_assinaturas)='motorista',
  'JUR RLS: motorista vê só a própria linha de assinatura (não a do primecharge)');
update contrato_assinaturas set status='assinado', assinado_em=now() where parte='motorista';
select _assert((select status from contrato_assinaturas where parte='motorista')='assinado',
  'JUR RLS: motorista assina a própria linha (nao_enviado/enviado -> assinado)');

-- vê o aditivo do próprio contrato
select _assert((select count(*) from contrato_aditivos)=1,
  'JUR RLS: motorista A vê o aditivo do próprio contrato');

-- NÃO vê templates (staff-only)
select _assert((select count(*) from contrato_templates)=0,
  'JUR RLS: motorista NÃO vê templates (staff-only)');
reset role;

-- motorista NÃO consegue mexer na linha do primecharge (0 linhas afetadas)
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
update contrato_assinaturas set status='assinado' where parte='primecharge';
reset role;
select _assert((select status from contrato_assinaturas where parte='primecharge')='nao_enviado',
  'JUR RLS: motorista NÃO altera a linha de assinatura do primecharge');

-- ---- Motorista B (mesma empresa, contrato diferente) NÃO vê nada de A ----
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333');
select _assert((select count(*) from contrato_versoes)=0, 'JUR RLS: motorista B NÃO vê versões do contrato de A');
select _assert((select count(*) from contrato_assinaturas)=0, 'JUR RLS: motorista B NÃO vê assinaturas de A');
select _assert((select count(*) from contrato_aditivos)=0, 'JUR RLS: motorista B NÃO vê aditivos de A');
reset role;

-- ---- Staff INATIVO (eh_staff = false) não vê nada ----
set role authenticated;
select _login('55555555-5555-5555-5555-555555555555');
select _assert((select count(*) from contrato_templates)=0, 'JUR RLS: staff inativo NÃO vê templates');
select _assert((select count(*) from contrato_versoes)=0, 'JUR RLS: staff inativo NÃO vê versões');
reset role;

-- ---- Staff ATIVO (owner) vê tudo da empresa A ----
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
select _assert((select count(*) from contrato_templates)=1, 'JUR RLS: staff vê o template da empresa');
select _assert((select count(*) from contrato_versoes)=2, 'JUR RLS: staff vê as 2 versões do contrato');
select _assert((select count(*) from contrato_assinaturas)=2, 'JUR RLS: staff vê as 2 assinaturas (motorista + primecharge)');
select _assert((select count(*) from contrato_aditivos)=1, 'JUR RLS: staff vê o aditivo');
reset role;

do $$ begin raise notice '==== FASE JURÍDICA: TODOS OS TESTES PASSARAM ===='; end $$;
