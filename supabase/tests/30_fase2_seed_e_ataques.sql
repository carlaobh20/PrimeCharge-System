-- Fase 2 — seed adicional + ataques sobre os dados novos (pagamentos, documentos, lojinha,
-- vistoria, chamados). Roda DEPOIS de 10_seed_teste.sql. Reusa os IDs de lá.
\set ON_ERROR_STOP on

-- ---- setup adicional (superuser, ignora RLS) ----
insert into contas_bancarias (id, empresa_id, nome) values
  ('cb000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Caixa A');

-- pagamento do lançamento receita do motorista A (já existe o lançamento 1a00... no seed base)
insert into pagamentos (id, empresa_id, lancamento_id, conta_bancaria_id, status, valor, data_prevista, data_pagamento) values
  ('9a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
   '1a000000-0000-0000-0000-000000000000', 'cb000000-0000-0000-0000-000000000000', 'pago', 1400, current_date, current_date);

-- lançamento receita do motorista B (A não pode ver)
insert into lancamentos (id, empresa_id, tipo, descricao, valor, contrato_id, motorista_id, data_prevista) values
  ('1b000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'receita', 'Aluguel B', 1400,
   'c3333333-0000-0000-0000-000000000000', 'a3333333-0000-0000-0000-000000000000', current_date);

-- despesa com motorista_id de A preenchido (A NÃO deve ver — só receita)
insert into lancamentos (id, empresa_id, tipo, descricao, valor, motorista_id, data_prevista) values
  ('1c000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'despesa', 'Despesa interna', 500,
   'a2222222-0000-0000-0000-000000000000', current_date);

-- arquivos: documento do motorista A (vê), do motorista B (não vê), do contrato A (vê), financeiro (não vê)
insert into arquivos (id, empresa_id, entidade_tipo, entidade_id, nome_arquivo, caminho_storage) values
  ('d0c00000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'motorista', 'a2222222-0000-0000-0000-000000000000', 'cnh-a.pdf', 'motoristas-documentos/a.../cnh-a.pdf'),
  ('d0c00000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000001', 'motorista', 'a3333333-0000-0000-0000-000000000000', 'cnh-b.pdf', 'motoristas-documentos/a.../cnh-b.pdf'),
  ('d0c00000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000001', 'contrato', 'c2222222-0000-0000-0000-000000000000', 'contrato-a.pdf', 'contratos-arquivos/a.../contrato-a.pdf'),
  ('d0c00000-0000-0000-0000-00000000000f', 'a0000000-0000-0000-0000-000000000001', 'lancamento', '1a000000-0000-0000-0000-000000000000', 'nf.pdf', 'financeiro-arquivos/a.../nf.pdf');

-- produtos + estoque
insert into produtos (id, empresa_id, nome, preco_venda, custo, estoque_minimo) values
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Água 500ml', 3.50, 1.20, 10),
  ('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pano microfibra', 12.00, 5.00, 5);
insert into movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo) values
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'entrada_compra', 100, 'carga inicial'),
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'entrada_compra', 20, 'carga inicial');

-- pedido do motorista A com 1 item + pedido do B (isolamento)
insert into pedidos (id, empresa_id, motorista_id, contrato_id, status) values
  ('4d000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'c2222222-0000-0000-0000-000000000000', 'solicitado'),
  ('4d000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000000', 'c3333333-0000-0000-0000-000000000000', 'solicitado');
insert into pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) values
  ('4d000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 2, 3.50),
  ('4d000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000002', 1, 12.00);

-- vistoria (checklist) do contrato A + do contrato B
insert into checklists (id, empresa_id, titulo, tipo, entidade_tipo, entidade_id, contrato_id, motorista_id, status) values
  ('cc000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'Vistoria entrega A', 'entrega', 'veiculo', 'e2222222-0000-0000-0000-000000000000', 'c2222222-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', 'concluido'),
  ('cc000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000001', 'Vistoria entrega B', 'entrega', 'veiculo', 'e3333333-0000-0000-0000-000000000000', 'c3333333-0000-0000-0000-000000000000', 'a3333333-0000-0000-0000-000000000000', 'concluido');
insert into checklist_itens (checklist_id, descricao) values
  ('cc000000-0000-0000-0000-00000000000a', 'Frente'),
  ('cc000000-0000-0000-0000-00000000000b', 'Frente');

-- =========================================================================
-- ATAQUES FASE 2 (Motorista A)
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');

-- Pagamentos/cobranças
select _assert((select count(*) from lancamentos) = 1
  and (select id from lancamentos) = '1a000000-0000-0000-0000-000000000000',
  'F2 Pagamentos: A vê só a própria receita (não a receita de B nem a despesa dele)');
select _assert((select count(*) from lancamentos where id='1b000000-0000-0000-0000-000000000000') = 0,
  'F2 Pagamentos: A NÃO vê a receita do B');
select _assert((select count(*) from lancamentos where id='1c000000-0000-0000-0000-000000000000') = 0,
  'F2 Pagamentos: A NÃO vê a despesa interna (mesmo com motorista_id dele)');
select _assert((select count(*) from pagamentos) = 1
  and (select id from pagamentos) = '9a000000-0000-0000-0000-000000000000',
  'F2 Pagamentos: A vê só o próprio pagamento');

-- Documentos
select _assert((select count(*) from arquivos) = 2,
  'F2 Documentos: A vê exatamente 2 arquivos (doc próprio + contrato próprio)');
select _assert((select count(*) from arquivos where id='d0c00000-0000-0000-0000-00000000000b') = 0,
  'F2 Documentos: A NÃO vê documento do motorista B');
select _assert((select count(*) from arquivos where id='d0c00000-0000-0000-0000-00000000000f') = 0,
  'F2 Documentos: A NÃO vê arquivo financeiro');

-- Lojinha
select _assert((select count(*) from itens_dos_meus_pedidos()) = 1,
  'F2 Lojinha: itens_dos_meus_pedidos() devolve só os itens do pedido de A');
select _assert((select produto_nome from itens_dos_meus_pedidos() limit 1) = 'Água 500ml',
  'F2 Lojinha: nome do produto vem certo (RPC junta produtos)');
select _assert((select count(*) from pedidos) = 1
  and (select id from pedidos) = '4d000000-0000-0000-0000-00000000000a',
  'F2 Lojinha: A vê só o próprio pedido');
select _assert((select count(*) from produtos) = 0,
  'F2 Lojinha: A NÃO lê a tabela produtos direto (só via catálogo)');
select _assert((select count(*) from catalogo_lojinha()) = 2,
  'F2 Lojinha: catálogo devolve os 2 produtos ativos da empresa');
select _assert((select bool_and(quantidade_disponivel is not null) from catalogo_lojinha()),
  'F2 Lojinha: catálogo traz quantidade_disponivel (sem custo/estoque_minimo)');

-- Vistoria
select _assert((select count(*) from checklists) = 1
  and (select id from checklists) = 'cc000000-0000-0000-0000-00000000000a',
  'F2 Vistoria: A vê só a própria vistoria');
select _assert((select count(*) from checklist_itens) = 1,
  'F2 Vistoria: A vê só os itens da própria vistoria');
select _assert((select count(*) from checklists where id='cc000000-0000-0000-0000-00000000000b') = 0,
  'F2 Vistoria: A NÃO vê a vistoria do B');

reset role;

-- =========================================================================
-- CHAMADOS
-- =========================================================================
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- Motorista A

-- abrir chamado próprio -> OK
insert into chamados (id, empresa_id, motorista_id, contrato_id, veiculo_id, categoria, assunto, descricao, aberto_por)
values ('ac000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000',
  'c2222222-0000-0000-0000-000000000000', 'e2222222-0000-0000-0000-000000000000', 'veiculo', 'Barulho no freio', 'Faz barulho ao frear', auth.uid());
select _assert((select count(*) from chamados where id='ac000000-0000-0000-0000-00000000000a') = 1,
  'F2 Chamados: A abre o próprio chamado');

-- abrir chamado no NOME de outro motorista -> bloqueado
do $$ begin
  begin
    insert into chamados (empresa_id, motorista_id, categoria, assunto, descricao, aberto_por)
    values ('a0000000-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000000', 'outro', 'x', 'x', auth.uid());
    raise exception 'DEVERIA TER BLOQUEADO: chamado em nome de outro motorista';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F2 Chamados: abrir em nome de outro motorista bloqueado';
  end;
end $$;

-- abrir chamado encostado no veículo de OUTRO -> bloqueado
do $$ begin
  begin
    insert into chamados (empresa_id, motorista_id, veiculo_id, categoria, assunto, descricao, aberto_por)
    values ('a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'e3333333-0000-0000-0000-000000000000', 'veiculo', 'x', 'x', auth.uid());
    raise exception 'DEVERIA TER BLOQUEADO: chamado no veículo de outro';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F2 Chamados: abrir no veículo de outro bloqueado';
  end;
end $$;

-- motorista NÃO pode se auto-resolver (transição exige pode suporte gerenciar)
do $$ begin
  begin
    update chamados set status='resolvido' where id='ac000000-0000-0000-0000-00000000000a';
    raise exception 'DEVERIA TER BLOQUEADO: motorista resolvendo o próprio chamado';
  exception when others then
    if sqlerrm like '%DEVERIA TER BLOQUEADO%' then raise; end if;
    raise notice 'PASS: F2 Chamados: motorista NÃO resolve o próprio chamado';
  end;
end $$;

-- mas PODE cancelar o próprio
update chamados set status='cancelado' where id='ac000000-0000-0000-0000-00000000000a';
select _assert((select status from chamados where id='ac000000-0000-0000-0000-00000000000a') = 'cancelado',
  'F2 Chamados: motorista cancela o próprio chamado');

reset role;

-- Motorista B não vê o chamado de A
set role authenticated;
select _login('33333333-3333-3333-3333-333333333333');
select _assert((select count(*) from chamados) = 0, 'F2 Chamados: Motorista B NÃO vê o chamado de A');
reset role;

-- Staff resolve/gerencia
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff owner
-- reabrir seria inválido (cancelado é terminal) — cria um novo pra testar resolução
reset role;
insert into chamados (id, empresa_id, motorista_id, categoria, assunto, descricao, aberto_por)
values ('ac000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000001', 'a2222222-0000-0000-0000-000000000000', 'financeiro', 'Dúvida cobrança', 'x', null);
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
update chamados set status='resolvido' where id='ac000000-0000-0000-0000-00000000000b';
select _assert((select status from chamados where id='ac000000-0000-0000-0000-00000000000b') = 'resolvido'
  and (select resolvido_em from chamados where id='ac000000-0000-0000-0000-00000000000b') is not null,
  'F2 Chamados: staff resolve e resolvido_em é preenchido');
reset role;

do $$ begin raise notice '==== FASE 2: TODOS OS TESTES PASSARAM ===='; end $$;
