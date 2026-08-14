-- Seed de cenário para os testes de segurança da Fase 1.
-- Empresa A: staff A, motorista A, motorista B (+ contratos e veículos).
-- Empresa B: motorista C. Cruzamentos A×B×C testam isolamento por motorista e por empresa.
-- Rodado como superuser (ignora RLS na inserção — é setup, não teste).

-- IDs fixos pra referência nos asserts (UUIDs legíveis).
-- empresas
insert into empresas (id, nome, cnpj) values
  ('a0000000-0000-0000-0000-000000000001', 'Locadora A', '11111111000111'),
  ('b0000000-0000-0000-0000-000000000001', 'Locadora B', '22222222000122');

-- auth.users (o que o Supabase Auth criaria)
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'staffA@a.com'),
  ('22222222-2222-2222-2222-222222222222', 'motoristaA@a.com'),
  ('33333333-3333-3333-3333-333333333333', 'motoristaB@a.com'),
  ('44444444-4444-4444-4444-444444444444', 'motoristaC@b.com'),
  ('55555555-5555-5555-5555-555555555555', 'staffInativoA@a.com');

-- motoristas (registros de negócio) — colunas mínimas (schema 0004)
insert into motoristas (id, empresa_id, nome_completo, cpf, status) values
  ('a2222222-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista A', '00000000001', 'ativo'),
  ('a3333333-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista B', '00000000002', 'ativo'),
  ('b4444444-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'Motorista C', '00000000003', 'ativo');

-- usuarios (vínculo de portal)
insert into usuarios (id, empresa_id, nome_completo, email, role, ativo, motorista_id) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'Staff A', 'staffA@a.com', 'owner', true, null),
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001', 'Motorista A', 'motoristaA@a.com', 'motorista', true, 'a2222222-0000-0000-0000-000000000000'),
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001', 'Motorista B', 'motoristaB@a.com', 'motorista', true, 'a3333333-0000-0000-0000-000000000000'),
  ('44444444-4444-4444-4444-444444444444', 'b0000000-0000-0000-0000-000000000001', 'Motorista C', 'motoristaC@b.com', 'motorista', true, 'b4444444-0000-0000-0000-000000000000'),
  ('55555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-000000000001', 'Staff Inativo A', 'staffInativoA@a.com', 'owner', false, null);

-- marcas/modelos (globais) — nome único no schema; usar nomes de teste próprios
insert into marcas (id, nome) values ('c0000000-0000-0000-0000-000000000001', 'MarcaTeste');
insert into modelos (id, marca_id, nome) values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ModeloTeste');

-- veiculos (colunas obrigatórias do schema 0003)
insert into veiculos (id, empresa_id, marca_id, modelo_id, ano_fabricacao, ano_modelo, chassi, renavam, placa, categoria, tipo_aquisicao, status, quilometragem, valor_compra, valor_financiado, banco) values
  ('e2222222-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2024, 2025, 'CHASSI-A', 'RENAV-A', 'AAA1A11', 'hatch', 'financiamento', 'alugado', 42000, 150000, 120000, 'Banco X'),
  ('e3333333-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2024, 2025, 'CHASSI-B', 'RENAV-B', 'BBB2B22', 'hatch', 'financiamento', 'alugado', 15000, 150000, 120000, 'Banco X'),
  ('f4444444-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2024, 2025, 'CHASSI-C', 'RENAV-C', 'CCC3C33', 'hatch', 'compra_direta', 'alugado', 5000, 150000, null, null);

-- contratos (A dirige veículo A; B dirige veículo B; C dirige veículo C)
insert into contratos (id, empresa_id, veiculo_id, motorista_id, status, data_inicio, periodicidade, valor_periodico, dia_vencimento, valor_caucao, observacoes) values
  ('c2222222-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'e2222222-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', 'ativo', current_date, 'semanal', 1400, null, 3000, 'Nota interna A'),
  ('c3333333-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'e3333333-0000-0000-0000-000000000000', 'a3333333-0000-0000-0000-000000000000', 'ativo', current_date, 'semanal', 1400, null, 3000, 'Nota interna B'),
  ('c4444444-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'f4444444-0000-0000-0000-000000000000', 'b4444444-0000-0000-0000-000000000000', 'ativo', current_date, 'semanal', 1400, null, 3000, 'Nota interna C');

-- lançamento financeiro do contrato A (motorista não pode ver nem o próprio nesta fase — 0036)
insert into lancamentos (id, empresa_id, tipo, descricao, valor, contrato_id, veiculo_id, motorista_id, data_prevista) values
  ('1a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'receita', 'Aluguel semana', 1400, 'c2222222-0000-0000-0000-000000000000', 'e2222222-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000', current_date);

-- convite pendente para um novo motorista (teste de aceite por token)
insert into motoristas (id, empresa_id, nome_completo, cpf, status) values
  ('a9999999-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'Motorista Novo', '00000000009', 'ativo');
insert into convites (id, empresa_id, email, role, token, aceito, motorista_id, expira_em) values
  ('c9999999-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'novo@a.com', 'motorista',
   '99999999-9999-9999-9999-999999999999', false, 'a9999999-0000-0000-0000-000000000000', now() + interval '7 days'),
  ('c8888888-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'expirado@a.com', 'motorista',
   '88888888-8888-8888-8888-888888888888', false, 'a9999999-0000-0000-0000-000000000000', now() - interval '1 day');

-- objetos de storage para o teste R2 (paths reais: {empresa}/{entidade}/arquivo)
insert into storage.buckets (id, name, public) values
  ('motoristas-documentos','motoristas-documentos',false),
  ('contratos-arquivos','contratos-arquivos',false),
  ('veiculos-fotos','veiculos-fotos',false),
  ('financeiro-arquivos','financeiro-arquivos',false),
  ('checklists-fotos','checklists-fotos',false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name) values
  -- documento do motorista B (A não pode ver)
  ('motoristas-documentos', 'a0000000-0000-0000-0000-000000000001/a3333333-0000-0000-0000-000000000000/cnh-b.pdf'),
  -- documento do PRÓPRIO motorista A (A pode ver)
  ('motoristas-documentos', 'a0000000-0000-0000-0000-000000000001/a2222222-0000-0000-0000-000000000000/cnh-a.pdf'),
  -- arquivo do contrato B (A não pode ver)
  ('contratos-arquivos', 'a0000000-0000-0000-0000-000000000001/c3333333-0000-0000-0000-000000000000/contrato-b.pdf'),
  -- arquivo do PRÓPRIO contrato A (A pode ver)
  ('contratos-arquivos', 'a0000000-0000-0000-0000-000000000001/c2222222-0000-0000-0000-000000000000/contrato-a.pdf'),
  -- comprovante financeiro (ninguém motorista pode ver)
  ('financeiro-arquivos', 'a0000000-0000-0000-0000-000000000001/1a000000-0000-0000-0000-000000000000/comprovante.pdf');
