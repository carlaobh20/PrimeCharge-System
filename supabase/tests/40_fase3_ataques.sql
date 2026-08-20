-- Fase 3 — vistoria-write, uploads, notificações, idempotência, concorrência.
-- Roda DEPOIS de 30_fase2. Reusa IDs de 10_seed / 30_fase2.
\set ON_ERROR_STOP on

-- setup: um veículo + contrato ASSINADO do motorista A (a vistoria de ENTREGA só conclui a
-- partir de 'assinado' — é o que ativa o contrato; o contrato c2222222 do seed já está 'ativo').
insert into veiculos (id, empresa_id, marca_id, modelo_id, ano_fabricacao, ano_modelo, chassi, renavam, placa, categoria, tipo_aquisicao, status, quilometragem)
values ('e5000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2024, 2025, 'CHASSI-A5', 'RENAV-A5', 'AAA5A55', 'hatch', 'compra_direta', 'reservado', 0);
insert into contratos (id, empresa_id, veiculo_id, motorista_id, status, data_inicio, periodicidade, valor_periodico)
values ('c5000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', 'assinado', current_date, 'semanal', 1400);

-- =========================================================================
-- VISTORIA WRITE (Motorista A)
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');

-- A cria a própria vistoria de entrega (aberto, no contrato ASSINADO próprio)
insert into checklists (id, empresa_id, titulo, tipo, entidade_tipo, entidade_id, contrato_id, motorista_id, status)
values ('cc000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000001', 'Vistoria app A', 'entrega', 'veiculo', 'e5000000-0000-0000-0000-000000000000', 'c5000000-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', 'aberto');
select _assert((select count(*) from checklists where id='cc000000-0000-0000-0000-0000000000a1') = 1,
  'F3 Vistoria: motorista cria a própria vistoria');

-- A adiciona item e responde
insert into checklist_itens (id, checklist_id, descricao, resposta, aplicavel)
values ('11100000-0000-0000-0000-0000000000a1', 'cc000000-0000-0000-0000-0000000000a1', 'Frente', true, true);
update checklist_itens set observacao='ok' where id='11100000-0000-0000-0000-0000000000a1';
select _assert((select observacao from checklist_itens where id='11100000-0000-0000-0000-0000000000a1') = 'ok',
  'F3 Vistoria: motorista preenche item da própria vistoria');

-- A envia pra análise (marca enviada_motorista_em, status continua aberto)
update checklists set enviada_motorista_em = now(), confirmacao_motorista = true, odometro_km = 42100 where id='cc000000-0000-0000-0000-0000000000a1';
select _assert((select enviada_motorista_em from checklists where id='cc000000-0000-0000-0000-0000000000a1') is not null
  and (select status from checklists where id='cc000000-0000-0000-0000-0000000000a1') = 'aberto',
  'F3 Vistoria: motorista envia pra análise (status continua aberto, não propaga contrato)');

-- A NÃO consegue concluir a própria vistoria (isso ativaria/encerraria o contrato)
do $$ begin
  begin
    update checklists set status='concluido' where id='cc000000-0000-0000-0000-0000000000a1';
    raise exception 'DEVERIA TER BLOQUEADO: motorista concluindo a própria vistoria';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F3 Vistoria: motorista NÃO conclui a própria vistoria (não propaga contrato)';
  end;
end $$;

-- A NÃO cria vistoria no veículo/contrato de outro
do $$ begin
  begin
    insert into checklists (empresa_id, titulo, tipo, entidade_tipo, entidade_id, contrato_id, motorista_id, status)
    values ('a0000000-0000-0000-0000-000000000001', 'Vistoria fraude', 'entrega', 'veiculo', 'e3333333-0000-0000-0000-000000000000', 'c3333333-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', 'aberto');
    raise exception 'DEVERIA TER BLOQUEADO: vistoria no veículo/contrato de outro';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F3 Vistoria: motorista NÃO cria vistoria no contrato/veículo de outro';
  end;
end $$;

reset role;

-- Staff conclui a vistoria enviada -> deve gerar notificação (trigger)
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff owner
-- (a conclusão real exige campos; aqui forçamos só o status pra testar a NOTIFICAÇÃO e a permissão)
-- staff tem pode('operacoes','concluir'), então a transição passa; mas a validação de conclusão
-- de entrega exige assinatura etc. Para isolar o teste de notificação, marcamos os campos mínimos.
update checklists set assinatura_url='x', carga_pct=80, confirmacao_motorista=true, odometro_km=42100 where id='cc000000-0000-0000-0000-0000000000a1';
update checklists set status='concluido' where id='cc000000-0000-0000-0000-0000000000a1';
select _assert((select status from checklists where id='cc000000-0000-0000-0000-0000000000a1') = 'concluido',
  'F3 Vistoria: staff conclui a vistoria do motorista');
reset role;

-- Motorista A vê a notificação de vistoria concluída
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from notificacoes where tipo='vistoria' and motorista_id='a2222222-0000-0000-0000-000000000000') >= 1,
  'F3 Notificações: motorista recebe notificação de vistoria concluída');
reset role;

-- =========================================================================
-- UPLOADS — isolamento de storage no INSERT
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');

-- A grava documento na PRÓPRIA pasta -> OK
insert into storage.objects (bucket_id, name)
values ('motoristas-documentos', 'a0000000-0000-0000-0000-000000000001/a2222222-0000-0000-0000-000000000000/cnh-novo.pdf');
select _assert((select count(*) from storage.objects where name like '%a2222222%cnh-novo%') = 1,
  'F3 Upload: motorista grava documento na própria pasta');

-- A tenta gravar na pasta de OUTRO motorista -> bloqueado
do $$ begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('motoristas-documentos', 'a0000000-0000-0000-0000-000000000001/a3333333-0000-0000-0000-000000000000/fraude.pdf');
    raise exception 'DEVERIA TER BLOQUEADO: upload na pasta de outro motorista';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F3 Upload: motorista NÃO grava na pasta de outro motorista';
  end;
end $$;

-- A registra o arquivo (metadado) apontando pra si -> OK
insert into arquivos (empresa_id, entidade_tipo, entidade_id, nome_arquivo, caminho_storage, usuario_id)
values ('a0000000-0000-0000-0000-000000000001', 'motorista', 'a2222222-0000-0000-0000-000000000000', 'cnh-novo.pdf', 'motoristas-documentos/a.../cnh-novo.pdf', auth.uid());
select _assert((select count(*) from arquivos where nome_arquivo='cnh-novo.pdf') = 1,
  'F3 Upload: motorista registra arquivo próprio');

-- A tenta registrar arquivo em nome de outro motorista -> bloqueado
do $$ begin
  begin
    insert into arquivos (empresa_id, entidade_tipo, entidade_id, nome_arquivo, caminho_storage, usuario_id)
    values ('a0000000-0000-0000-0000-000000000001', 'motorista', 'a3333333-0000-0000-0000-000000000000', 'x.pdf', 'x', auth.uid());
    raise exception 'DEVERIA TER BLOQUEADO: arquivo em nome de outro motorista';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F3 Upload: motorista NÃO registra arquivo de outro motorista';
  end;
end $$;

reset role;

-- =========================================================================
-- REVISÃO DE DOCUMENTO -> notificação
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff
-- staff rejeita o documento do motorista A (arquivo doc próprio criado no seed fase2)
update arquivos set status_revisao='rejeitado', motivo_rejeicao='Foto ilegível', revisado_por=auth.uid(), revisado_em=now()
  where id='d0c00000-0000-0000-0000-00000000000a';
reset role;
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from notificacoes where tipo='documento' and motorista_id='a2222222-0000-0000-0000-000000000000') >= 1,
  'F3 Notificações: motorista é notificado quando documento é recusado');
-- motorista vê o motivo
select _assert((select motivo_rejeicao from arquivos where id='d0c00000-0000-0000-0000-00000000000a') = 'Foto ilegível',
  'F3 Documentos: motorista vê o motivo da recusa');
reset role;

-- =========================================================================
-- NOTIFICAÇÕES — isolamento + marcar lida + idempotência
-- =========================================================================
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333'); -- Motorista B
select _assert((select count(*) from notificacoes) = 0, 'F3 Notificações: Motorista B NÃO vê notificações de A');
reset role;

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- A
update notificacoes set lida=true, lida_em=now() where motorista_id='a2222222-0000-0000-0000-000000000000' and lida=false;
select _assert((select count(*) from notificacoes where motorista_id='a2222222-0000-0000-0000-000000000000' and lida=false) = 0,
  'F3 Notificações: motorista marca as próprias como lidas');
reset role;

-- =========================================================================
-- IDEMPOTÊNCIA / CONCORRÊNCIA DE ESTOQUE
-- =========================================================================
-- Idempotência: entregar um pedido gera 1 lançamento; entregar/re-transicionar não duplica.
-- Concorrência: estoque=1, dois pedidos de 1 -> só um aprova, o outro falha (sem estoque negativo).
-- Setup como superuser.
reset role;
-- produto com estoque exatamente 1
insert into produtos (id, empresa_id, nome, preco_venda) values
  ('40000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-000000000001', 'Item escasso', 10.00);
insert into movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo)
values ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000e1', 'entrada_compra', 1, 'só 1');
-- dois pedidos solicitados, cada um pedindo 1
insert into pedidos (id, empresa_id, motorista_id, status) values
  ('4d000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'solicitado'),
  ('4d000000-0000-0000-0000-0000000000e2', 'a0000000-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000000', 'solicitado');
insert into pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) values
  ('4d000000-0000-0000-0000-0000000000e1', '40000000-0000-0000-0000-0000000000e1', 1, 10.00),
  ('4d000000-0000-0000-0000-0000000000e2', '40000000-0000-0000-0000-0000000000e1', 1, 10.00);

set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff

-- aprova o 1º (baixa estoque pra 0)
update pedidos set status='aprovado' where id='4d000000-0000-0000-0000-0000000000e1';
select _assert(
  (select coalesce(sum(quantidade),0) from movimentacoes_estoque where produto_id='40000000-0000-0000-0000-0000000000e1') = 0,
  'F3 Estoque: aprovar pedido baixa o estoque (1 -> 0)');

-- aprova o 2º -> deve FALHAR (estoque insuficiente, trigger anti-negativo)
do $$ begin
  begin
    update pedidos set status='aprovado' where id='4d000000-0000-0000-0000-0000000000e2';
    raise exception 'DEVERIA TER BLOQUEADO: segundo pedido sem estoque';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F3 Estoque: segundo pedido falha por estoque insuficiente (sem negativo)';
  end;
end $$;
select _assert(
  (select coalesce(sum(quantidade),0) from movimentacoes_estoque where produto_id='40000000-0000-0000-0000-0000000000e1') = 0,
  'F3 Estoque: nunca fica negativo');

-- entrega o 1º -> gera 1 lançamento (idempotência do lançamento de pedido)
update pedidos set status='separando' where id='4d000000-0000-0000-0000-0000000000e1';
update pedidos set status='pronto' where id='4d000000-0000-0000-0000-0000000000e1';
update pedidos set status='entregue' where id='4d000000-0000-0000-0000-0000000000e1';
select _assert(
  (select count(*) from lancamentos where pedido_id='4d000000-0000-0000-0000-0000000000e1') = 1,
  'F3 Cobrança: pedido entregue gera exatamente 1 lançamento (não duplica)');

-- cancelar pedido já aprovado devolve o estoque (reversão)
insert into pedidos (id, empresa_id, motorista_id, status) values
  ('4d000000-0000-0000-0000-0000000000e3', 'a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'solicitado');
reset role;
insert into movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo)
values ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000e1', 'entrada_compra', 5, 'reposição');
insert into pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) values
  ('4d000000-0000-0000-0000-0000000000e3', '40000000-0000-0000-0000-0000000000e1', 2, 10.00);
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update pedidos set status='aprovado' where id='4d000000-0000-0000-0000-0000000000e3'; -- estoque 5 -> 3
update pedidos set status='cancelado' where id='4d000000-0000-0000-0000-0000000000e3'; -- devolve -> 5
select _assert(
  (select coalesce(sum(quantidade),0) from movimentacoes_estoque where produto_id='40000000-0000-0000-0000-0000000000e1') = 5,
  'F3 Estoque: cancelar pedido aprovado devolve o estoque (ledger, não edição de saldo)');
reset role;

do $$ begin raise notice '==== FASE 3: TODOS OS TESTES PASSARAM ===='; end $$;
