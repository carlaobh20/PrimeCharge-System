-- Fase 4 — filas operacionais do staff (Central de Atendimento). Roda DEPOIS de 40_fase3.
-- Verifica que o que o motorista envia aparece pro staff, e continua invisível pro outro motorista.
\set ON_ERROR_STOP on

-- setup (superuser): uma vistoria ENVIADA e não concluída, um documento AGUARDANDO, um chamado ABERTO.
-- vistoria enviada de A (status aberto + enviada_motorista_em), no contrato assinado c5 do 40_fase3
insert into checklists (id, empresa_id, titulo, tipo, entidade_tipo, entidade_id, contrato_id, motorista_id, status, enviada_motorista_em)
values ('cc000000-0000-0000-0000-0000000000f4', 'a0000000-0000-0000-0000-000000000001', 'Vistoria fila', 'entrega', 'veiculo', 'e5000000-0000-0000-0000-000000000000', 'c5000000-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', 'aberto', now());
-- documento aguardando de A
insert into arquivos (id, empresa_id, entidade_tipo, entidade_id, nome_arquivo, caminho_storage, status_revisao)
values ('d0c00000-0000-0000-0000-0000000000f4', 'a0000000-0000-0000-0000-000000000001', 'motorista', 'a2222222-0000-0000-0000-000000000000', 'rg.pdf', 'motoristas-documentos/a.../rg.pdf', 'aguardando');
-- chamado aberto de A
insert into chamados (id, empresa_id, motorista_id, categoria, assunto, descricao, aberto_por, status)
values ('ac000000-0000-0000-0000-0000000000f4', 'a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'veiculo', 'Fila chamado', 'x', null, 'aberto');

-- STAFF vê as três filas
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff owner

select _assert(
  (select count(*) from checklists where status='aberto' and enviada_motorista_em is not null and id='cc000000-0000-0000-0000-0000000000f4') = 1,
  'F4 Fila: staff vê vistoria enviada aguardando análise');
select _assert(
  (select count(*) from arquivos where entidade_tipo='motorista' and status_revisao in ('aguardando','em_analise') and id='d0c00000-0000-0000-0000-0000000000f4') = 1,
  'F4 Fila: staff vê documento aguardando revisão');
select _assert(
  (select count(*) from chamados where status in ('aberto','em_analise','aguardando_motorista') and id='ac000000-0000-0000-0000-0000000000f4') = 1,
  'F4 Fila: staff vê chamado aberto');

-- staff aprova o documento -> some da fila + notifica o motorista
update arquivos set status_revisao='aprovado', revisado_por=auth.uid(), revisado_em=now() where id='d0c00000-0000-0000-0000-0000000000f4';
select _assert(
  (select count(*) from arquivos where entidade_tipo='motorista' and status_revisao in ('aguardando','em_analise') and id='d0c00000-0000-0000-0000-0000000000f4') = 0,
  'F4 Fila: documento aprovado sai da fila');
reset role;
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert(
  (select count(*) from notificacoes where tipo='documento' and motorista_id='a2222222-0000-0000-0000-000000000000') >= 1,
  'F4 Fila: aprovar documento notifica o motorista');
reset role;

-- Motorista B NÃO vê a fila do staff (nem a vistoria/documento/chamado de A)
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333');
select _assert((select count(*) from checklists where id='cc000000-0000-0000-0000-0000000000f4') = 0, 'F4 Fila: B não vê vistoria de A');
select _assert((select count(*) from arquivos where id='d0c00000-0000-0000-0000-0000000000f4') = 0, 'F4 Fila: B não vê documento de A');
select _assert((select count(*) from chamados where id='ac000000-0000-0000-0000-0000000000f4') = 0, 'F4 Fila: B não vê chamado de A');
reset role;

-- Staff INATIVO não vê a fila (eh_staff checa ativo)
set role authenticated;
select _login('55555555-5555-5555-5555-555555555555');
select _assert((select count(*) from chamados) = 0, 'F4 Fila: staff inativo não vê chamados');
reset role;

do $$ begin raise notice '==== FASE 4: TODOS OS TESTES PASSARAM ===='; end $$;
