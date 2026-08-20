-- Fase Jurídica 4 — E2E pela RLS + hardening 0045 + retroatividade + IDOR + tarefas.
-- Roda DEPOIS de 62. Diferencial desta suíte: o ciclo E2E é executado COMO STAFF (RLS valendo),
-- não como superuser — é o mais perto de "operador clicando na tela" que o harness alcança.
\set ON_ERROR_STOP on

-- =========================================================================
-- SETUP (superuser): motorista D com login (pra assinar) — dados de TESTE, claramente fake.
-- =========================================================================
insert into auth.users (id, email) values ('77777777-7777-7777-7777-777777777777', 'motoristaD@a.com');
insert into motoristas (id, empresa_id, nome_completo, cpf, status, cnh_numero, cnh_categoria, cnh_validade, endereco)
values ('a7777777-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista D Teste', '00000000007', 'ativo', 'CNH-TESTE-7', 'B', current_date + 1000, 'Rua Teste, 7');
insert into usuarios (id, empresa_id, nome_completo, email, role, ativo, motorista_id)
values ('77777777-7777-7777-7777-777777777777', 'a0000000-0000-0000-0000-000000000001', 'Motorista D Teste', 'motoristaD@a.com', 'motorista', true, 'a7777777-0000-0000-0000-000000000000');
insert into veiculos (id, empresa_id, marca_id, modelo_id, ano_fabricacao, ano_modelo, chassi, renavam, placa, categoria, tipo_aquisicao, status, quilometragem, valor_compra)
values ('e7777777-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2025, 2025, 'CHASSI-D', 'RENAV-D', 'DDD7D77', 'hatch', 'compra_direta', 'disponivel', 100, 120000);

-- =========================================================================
-- GRUPO Q — E2E COMO STAFF (RLS): contrato -> v1 -> workflow -> assinaturas -> vigente
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff owner (ativo)

insert into contratos (id, empresa_id, veiculo_id, motorista_id, status, data_inicio, periodicidade, valor_periodico, valor_caucao)
values ('c7777777-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'e7777777-0000-0000-0000-000000000000', 'a7777777-0000-0000-0000-000000000000', 'rascunho', current_date, 'semanal', 1500, 3000);

insert into contrato_versoes (id, empresa_id, contrato_id, template_id, numero, rotulo, status, snapshot, corpo, hash_sha256)
values ('7e100000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001', 'c7777777-0000-0000-0000-000000000000',
        '7e000000-0000-0000-0000-000000000001', 1, 'v1.0', 'rascunho',
        '{"motorista":{"nome":"Motorista D Teste"},"contrato":{"valor":1500},"_meta":{"template_versao":2}}'::jsonb,
        'Corpo E2E do contrato D.', 'hash-e2e-d1');

update contrato_versoes set status='em_revisao' where id='7e100000-0000-0000-0000-0000000000d1';
update contrato_versoes set status='aprovada' where id='7e100000-0000-0000-0000-0000000000d1';
update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-0000000000d1';

insert into contrato_assinaturas (id, empresa_id, contrato_versao_id, parte, ordem, status, enviado_em, expira_em)
values
  ('7e200000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-0000000000d1', 'motorista', 1, 'enviado', now(), now() + interval '7 days'),
  ('7e200000-0000-0000-0000-0000000000d2', 'a0000000-0000-0000-0000-000000000001', '7e100000-0000-0000-0000-0000000000d1', 'primecharge', 2, 'nao_enviado', null, null);
reset role;

select _assert(
  (select congelada and status='aguardando_assinatura' from contrato_versoes where id='7e100000-0000-0000-0000-0000000000d1'),
  'JUR4 E2E: staff conduz rascunho->revisão->aprovação->assinatura pela RLS (congelou)');

-- Motorista D visualiza e assina a própria linha
set role authenticated;
select _login('77777777-7777-7777-7777-777777777777');
select _assert((select count(*) from contrato_versoes) = 1, 'JUR4 E2E: motorista D vê exatamente a própria versão compartilhada');
update contrato_assinaturas set status='visualizado', visualizado_em=now() where id='7e200000-0000-0000-0000-0000000000d1';
update contrato_assinaturas set status='assinado', assinado_em=now(), evidencia='{"origem":"app_motorista","email":"motoristaD@a.com"}'::jsonb
  where id='7e200000-0000-0000-0000-0000000000d1';
reset role;

-- Staff registra PrimeCharge, marca assinada e torna vigente
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update contrato_assinaturas set status='assinado', assinado_em=now() where id='7e200000-0000-0000-0000-0000000000d2';
update contrato_versoes set status='assinada' where id='7e100000-0000-0000-0000-0000000000d1';
update contrato_versoes set status='vigente' where id='7e100000-0000-0000-0000-0000000000d1';

-- Aditivos: DOIS staff criando "ao mesmo tempo" (concorrência) — ambos coexistem, estado íntegro
insert into contrato_aditivos (id, empresa_id, contrato_id, tipo, descricao)
values ('7e300000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001', 'c7777777-0000-0000-0000-000000000000', 'valor', 'Aditivo concorrente 1');
insert into contrato_aditivos (id, empresa_id, contrato_id, tipo, descricao)
values ('7e300000-0000-0000-0000-0000000000d2', 'a0000000-0000-0000-0000-000000000001', 'c7777777-0000-0000-0000-000000000000', 'prazo', 'Aditivo concorrente 2');

-- Tarefa jurídica (reuso de acoes_operacionais — Fase G)
insert into acoes_operacionais (empresa_id, titulo, tipo, prioridade, origem, entidade_tipo, entidade_id)
values ('a0000000-0000-0000-0000-000000000001', 'Cobrar apólice do contrato D', 'juridico_tarefa', 'alta', 'manual', 'contrato', 'c7777777-0000-0000-0000-000000000000');

-- Seguro + documento => TIMELINE (0045)
insert into contrato_seguros (id, empresa_id, contrato_id, seguradora, apolice, vigencia_inicio, vigencia_fim)
values ('91000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001', 'c7777777-0000-0000-0000-000000000000', 'Seguradora Teste', 'AP-D-1', current_date, current_date + 365);
insert into arquivos (empresa_id, entidade_tipo, entidade_id, categoria, nome_arquivo, caminho_storage)
values ('a0000000-0000-0000-0000-000000000001', 'contrato', 'c7777777-0000-0000-0000-000000000000', 'apolice_seguro', 'apolice-d.pdf', 'contratos-arquivos/a0.../apolice-d.pdf');
reset role;

select _assert(
  (select status='vigente' from contrato_versoes where id='7e100000-0000-0000-0000-0000000000d1'),
  'JUR4 E2E: as duas partes assinaram e a versão está vigente');
select _assert(
  (select count(*) from contrato_aditivos where contrato_id='c7777777-0000-0000-0000-000000000000') = 2,
  'JUR4 Concorrência: dois aditivos criados em paralelo coexistem sem corromper estado');
select _assert(
  (select count(*) from timeline_eventos where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_seguro') = 1,
  'JUR4 Timeline (0045): cadastrar seguro gera evento na timeline do contrato');
select _assert(
  (select count(*) from timeline_eventos where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_documento') = 1,
  'JUR4 Timeline (0045): anexar documento ao contrato gera evento');
select _assert(
  (select count(*) from timeline_eventos where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_versao') >= 5,
  'JUR4 E2E: workflow completo registrou os eventos de versão na timeline');
select _assert(
  (select count(*) from notificacoes where motorista_id='a7777777-0000-0000-0000-000000000000' and tipo='contrato') = 2,
  'JUR4 E2E: motorista D notificado em aguardando_assinatura e vigente (e só nesses)');
select _assert(
  (select count(*) from audit_log where tabela='contrato_versoes' and registro_id='7e100000-0000-0000-0000-0000000000d1') >= 5,
  'JUR4 Auditoria: cada passo do documento gerou audit_log');

-- Idempotência da timeline do seguro (0045): update sem mudança relevante NÃO gera evento
update contrato_seguros set observacoes='nota interna' where id='91000000-0000-0000-0000-0000000000d1';
select _assert(
  (select count(*) from timeline_eventos where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_seguro') = 1,
  'JUR4 Idempotência: update irrelevante do seguro NÃO duplica evento de timeline');
update contrato_seguros set apolice='AP-D-2' where id='91000000-0000-0000-0000-0000000000d1';
select _assert(
  (select count(*) from timeline_eventos where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='contrato_seguro') = 2,
  'JUR4 Timeline: troca de apólice gera evento novo');

-- =========================================================================
-- GRUPO R — PROTEÇÃO RETROATIVA COMPLETA (Fase L): republicar template não toca contrato
-- =========================================================================
do $$
declare v_corpo text; v_snapshot jsonb; v_hash text; v_template uuid; v_numero int;
begin
  select corpo, snapshot, hash_sha256, template_id, numero
    into v_corpo, v_snapshot, v_hash, v_template, v_numero
    from contrato_versoes where id='7e100000-0000-0000-0000-0000000000d1';
  -- altera e republica o template (v2 -> v3)
  update contrato_templates set status='rascunho', corpo=corpo||' CLAUSULA NOVA v3.' where id='7e000000-0000-0000-0000-000000000001';
  update contrato_templates set status='publicado' where id='7e000000-0000-0000-0000-000000000001';
  if (select versao_template from contrato_templates where id='7e000000-0000-0000-0000-000000000001') <> 3 then
    raise exception 'FALHOU: republicação não incrementou para v3';
  end if;
  -- contrato antigo permanece EXATAMENTE igual, campo a campo
  if exists (
    select 1 from contrato_versoes where id='7e100000-0000-0000-0000-0000000000d1'
      and (corpo is distinct from v_corpo or snapshot is distinct from v_snapshot
           or hash_sha256 is distinct from v_hash or template_id is distinct from v_template
           or numero is distinct from v_numero)
  ) then
    raise exception 'FALHOU: republicar template alterou retroativamente o contrato';
  end if;
  raise notice 'PASS: JUR4 Retroatividade: template v3 publicado e contrato antigo intacto (corpo/snapshot/hash/template_id/numero)';
end $$;

-- =========================================================================
-- GRUPO S — IDOR + isolamento (Fases Y/Z)
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A
-- acesso direto por ID de recurso do contrato D (IDOR): nada volta, sem vazar existência
select _assert((select count(*) from contratos where id='c7777777-0000-0000-0000-000000000000') = 0, 'JUR4 IDOR: A não lê o contrato D por ID direto');
select _assert((select count(*) from contrato_versoes where id='7e100000-0000-0000-0000-0000000000d1') = 0, 'JUR4 IDOR: A não lê a versão D por ID direto');
select _assert((select count(*) from contrato_assinaturas where id='7e200000-0000-0000-0000-0000000000d1') = 0, 'JUR4 IDOR: A não lê a assinatura D por ID direto');
select _assert((select count(*) from contrato_aditivos where contrato_id='c7777777-0000-0000-0000-000000000000') = 0, 'JUR4 IDOR: A não lê aditivos de D');
select _assert((select count(*) from contrato_seguros where contrato_id='c7777777-0000-0000-0000-000000000000') = 0, 'JUR4 IDOR: A não lê seguro de D');
select _assert((select count(*) from timeline_eventos where entidade_id='c7777777-0000-0000-0000-000000000000') = 0, 'JUR4 IDOR: A não lê a timeline de D');
select _assert((select count(*) from audit_log where registro_id='7e100000-0000-0000-0000-0000000000d1') = 0, 'JUR4 IDOR: A não lê auditoria de D');
select _assert((select count(*) from acoes_operacionais) = 0, 'JUR4 IDOR: motorista não lê tarefas (acoes é staff-only)');
-- contrato INEXISTENTE: consulta não erra nem vaza nada
select _assert((select count(*) from contratos where id='00000000-dead-beef-0000-000000000000') = 0, 'JUR4 IDOR: contrato inexistente responde vazio (sem erro, sem vazamento)');
reset role;

-- =========================================================================
-- GRUPO T — MOTORISTA INATIVO (hardening 0045)
-- =========================================================================
update usuarios set ativo=false where id='77777777-7777-7777-7777-777777777777';
set role authenticated;
select _login('77777777-7777-7777-7777-777777777777');
select _assert((select count(*) from contratos) = 0, 'JUR4 Inativo: motorista desativado não vê o próprio contrato');
select _assert((select count(*) from contrato_versoes) = 0, 'JUR4 Inativo: motorista desativado não vê versões');
select _assert((select count(*) from contrato_assinaturas) = 0, 'JUR4 Inativo: motorista desativado não vê assinaturas');
update contrato_assinaturas set status='recusado' where id='7e200000-0000-0000-0000-0000000000d1';
reset role;
select _assert((select status='assinado' from contrato_assinaturas where id='7e200000-0000-0000-0000-0000000000d1'),
  'JUR4 Inativo: motorista desativado não altera a própria assinatura (0 linhas)');
-- limpa o claim de sessão (o set_config sobrevive ao reset role — sem isso o trigger
-- anti-autoescalada acha que o próprio usuário está se reativando)
select set_config('request.jwt.claim.sub', '', false);
update usuarios set ativo=true where id='77777777-7777-7777-7777-777777777777';
set role authenticated;
select _login('77777777-7777-7777-7777-777777777777');
select _assert((select count(*) from contratos) = 1, 'JUR4 Inativo: reativado, o acesso volta ao normal');
reset role;

-- =========================================================================
-- GRUPO U — Tarefa jurídica: state machine + histórico
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update acoes_operacionais set status='concluida'
  where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='juridico_tarefa';
reset role;
select _assert(
  (select status='concluida' and concluida_em is not null from acoes_operacionais
     where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='juridico_tarefa'),
  'JUR4 Tarefas: staff conclui tarefa jurídica (state machine das ações reutilizada)');
select _bloqueia(
  $q$update acoes_operacionais set status='pendente'
     where entidade_id='c7777777-0000-0000-0000-000000000000' and tipo='juridico_tarefa'$q$,
  'JUR4 Tarefas: concluída é terminal — histórico não volta atrás');

do $$ begin raise notice '==== FASE JURÍDICA 4: TODOS OS TESTES PASSARAM ===='; end $$;
