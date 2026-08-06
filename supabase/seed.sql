-- PrimeCharge OS — Ambiente DEMO (Missão 4, Fase 7), 2026-08-06.
--
-- OBJETIVO: um cenário completo e consistente — 2 veículos, 2 motoristas, 1 contrato ativo,
-- pagamentos/lançamentos financeiros reais, manutenções (uma já feita, uma agendada), um
-- checklist de entrega concluído e uma multa — para qualquer pessoa nova (ou uma demonstração)
-- ver a plataforma operando, sem precisar cadastrar tudo do zero na mão.
--
-- NÃO faz parte da numeração de migrations (0001-0012) de propósito: é dado de exemplo, não
-- schema. Convenção do Supabase CLI: roda automaticamente com `supabase db reset`, ou execute
-- manualmente (SQL Editor do Supabase, ou `psql < supabase/seed.sql`) depois das migrations.
--
-- O QUE ESTE SCRIPT NÃO FAZ, DE PROPÓSITO (honestidade de dado, DEC-022):
-- 1. Não cria nenhum `usuario`/login novo — depende de você já ter feito o cadastro real
--    (convite/onboarding) e ter pelo menos uma linha em `empresas`. O script usa a primeira
--    empresa encontrada (`order by criado_em asc limit 1`) — se você tem mais de uma empresa
--    no banco e quer o demo em outra, troque a subconsulta abaixo antes de rodar.
-- 2. Não insere nenhuma linha em `arquivos` — um documento sem o arquivo físico correspondente
--    no Storage seria um link quebrado na UI (pior que não ter documento nenhum). Se quiser
--    ver o fluxo de documento com validade, faça upload de verdade pela tela (Missão 4 já
--    conecta `data_validade` na UI de upload).
-- 3. Idempotente por natureza dos dados de negócio, não por chave técnica — rodar duas vezes
--    cria uma SEGUNDA frota de exemplo (placas diferentes, "PRM1A23"/"PRM2B45" só existem
--    uma vez por `unique(empresa_id, placa)"). Para recomeçar do zero, apague manualmente as
--    linhas com essas placas antes de rodar de novo.

do $$
declare
  v_empresa_id uuid;
  v_marca_byd_id uuid;
  v_modelo_dolphin_id uuid;
  v_marca_gwm_id uuid;
  v_modelo_ora_id uuid;
  v_veiculo1_id uuid;
  v_veiculo2_id uuid;
  v_motorista1_id uuid;
  v_motorista2_id uuid;
  v_contrato_id uuid;
  v_conta_bancaria_id uuid;
  v_lancamento_pago1_id uuid;
  v_lancamento_pago2_id uuid;
  v_lancamento_pendente_id uuid;
  v_checklist_id uuid;
  v_hoje date := current_date;
begin
  select id into v_empresa_id from empresas order by criado_em asc limit 1;
  if v_empresa_id is null then
    raise exception 'Nenhuma empresa encontrada. Cadastre a empresa (fluxo de onboarding/convite) antes de rodar este seed — sem empresa_id não há como ninguém ver este dado (RLS).';
  end if;

  select id into v_marca_byd_id from marcas where nome = 'BYD';
  select id into v_modelo_dolphin_id from modelos where marca_id = v_marca_byd_id and nome = 'Dolphin';
  select id into v_marca_gwm_id from marcas where nome = 'GWM';
  select id into v_modelo_ora_id from modelos where marca_id = v_marca_gwm_id and nome = 'Ora 03';

  -- ============================================================
  -- 1. Veículos — um em operação (alugado), um disponível
  -- ============================================================
  insert into veiculos (
    empresa_id, marca_id, modelo_id, ano_fabricacao, ano_modelo, chassi, renavam, placa,
    cor, categoria, tipo_aquisicao, status, quilometragem, autonomia_km, capacidade_bateria_kwh,
    data_compra, valor_compra, valor_fipe, valor_mercado, valor_residual_estimado
  ) values (
    v_empresa_id, v_marca_byd_id, v_modelo_dolphin_id, 2025, 2025, '9BWZZZ377VT004251', '01234567890', 'PRM1A23',
    'Branco', 'hatch', 'compra_direta', 'alugado', 8500, 420, 44.9,
    (v_hoje - interval '4 months')::date, 149900, 145000, 148000, 95000
  ) returning id into v_veiculo1_id;

  insert into veiculos (
    empresa_id, marca_id, modelo_id, ano_fabricacao, ano_modelo, chassi, renavam, placa,
    cor, categoria, tipo_aquisicao, status, quilometragem, autonomia_km, capacidade_bateria_kwh,
    data_compra, valor_compra, valor_fipe, valor_mercado, valor_residual_estimado
  ) values (
    v_empresa_id, v_marca_gwm_id, v_modelo_ora_id, 2025, 2025, 'LGWEB4A57PA004189', '01234567891', 'PRM2B45',
    'Cinza', 'hatch', 'compra_direta', 'disponivel', 1200, 310, 47.8,
    (v_hoje - interval '2 months')::date, 179900, 176000, 178000, 115000
  ) returning id into v_veiculo2_id;

  -- ============================================================
  -- 2. Motoristas — um com contrato ativo, um disponível pra vincular
  -- ============================================================
  insert into motoristas (
    empresa_id, nome_completo, cpf, email, telefone, data_nascimento,
    cnh_numero, cnh_categoria, cnh_validade, status, endereco, cidade, estado
  ) values (
    v_empresa_id, 'Carlos Eduardo Silva', '11122233344', 'carlos.silva.demo@example.com', '11988887777',
    '1988-04-12', '12345678900', 'B', (v_hoje + interval '18 months')::date, 'ativo',
    'Rua das Palmeiras, 120', 'São Paulo', 'SP'
  ) returning id into v_motorista1_id;

  insert into motoristas (
    empresa_id, nome_completo, cpf, email, telefone, data_nascimento,
    cnh_numero, cnh_categoria, cnh_validade, status, endereco, cidade, estado
  ) values (
    v_empresa_id, 'Fernanda Souza Lima', '55566677788', 'fernanda.lima.demo@example.com', '11977776666',
    '1992-09-30', '98765432100', 'B', (v_hoje + interval '30 months')::date, 'ativo',
    'Av. Ipiranga, 800', 'São Paulo', 'SP'
  ) returning id into v_motorista2_id;

  -- ============================================================
  -- 3. Contrato ativo (Veículo 1 + Motorista 1) — entrega já registrada
  -- ============================================================
  insert into contratos (
    empresa_id, veiculo_id, motorista_id, status, data_inicio, data_fim_prevista,
    periodicidade, valor_periodico, valor_caucao, km_inicial, carga_inicial_pct, observacoes
  ) values (
    v_empresa_id, v_veiculo1_id, v_motorista1_id, 'ativo', (v_hoje - interval '3 months')::date, (v_hoje + interval '9 months')::date,
    'mensal', 2200, 1000, 8000, 90, 'Contrato de exemplo — ambiente demo (Missão 4).'
  ) returning id into v_contrato_id;

  -- ============================================================
  -- 4. Financeiro — 2 mensalidades pagas, 1 a vencer amanhã (mostra o gerador
  --    financeiro.parcela_a_vencer, Missão 4 Fase 3)
  -- ============================================================
  select id into v_conta_bancaria_id from contas_bancarias where empresa_id = v_empresa_id and ativa limit 1;
  if v_conta_bancaria_id is null then
    insert into contas_bancarias (empresa_id, nome, banco, tipo, saldo_inicial)
    values (v_empresa_id, 'Conta principal (demo)', 'Banco Exemplo', 'corrente', 10000)
    returning id into v_conta_bancaria_id;
  end if;

  insert into lancamentos (empresa_id, tipo, status, descricao, valor, categoria, contrato_id, veiculo_id, motorista_id, data_prevista, data_confirmacao, criado_via)
  values (v_empresa_id, 'receita', 'confirmada', 'Mensalidade — Carlos Eduardo Silva (mês 1)', 2200, 'aluguel', v_contrato_id, v_veiculo1_id, v_motorista1_id, (v_hoje - interval '2 months')::date, (v_hoje - interval '2 months')::date, 'manual')
  returning id into v_lancamento_pago1_id;

  insert into lancamentos (empresa_id, tipo, status, descricao, valor, categoria, contrato_id, veiculo_id, motorista_id, data_prevista, data_confirmacao, criado_via)
  values (v_empresa_id, 'receita', 'confirmada', 'Mensalidade — Carlos Eduardo Silva (mês 2)', 2200, 'aluguel', v_contrato_id, v_veiculo1_id, v_motorista1_id, (v_hoje - interval '1 month')::date, (v_hoje - interval '1 month')::date, 'manual')
  returning id into v_lancamento_pago2_id;

  insert into lancamentos (empresa_id, tipo, status, descricao, valor, categoria, contrato_id, veiculo_id, motorista_id, data_prevista, criado_via)
  values (v_empresa_id, 'receita', 'prevista', 'Mensalidade — Carlos Eduardo Silva (mês 3)', 2200, 'aluguel', v_contrato_id, v_veiculo1_id, v_motorista1_id, (v_hoje + interval '1 day')::date, 'manual')
  returning id into v_lancamento_pendente_id;

  insert into pagamentos (empresa_id, lancamento_id, conta_bancaria_id, status, valor, forma_pagamento, data_prevista, data_pagamento)
  values (v_empresa_id, v_lancamento_pago1_id, v_conta_bancaria_id, 'pago', 2200, 'pix', (v_hoje - interval '2 months')::date, (v_hoje - interval '2 months')::date);

  insert into pagamentos (empresa_id, lancamento_id, conta_bancaria_id, status, valor, forma_pagamento, data_prevista, data_pagamento)
  values (v_empresa_id, v_lancamento_pago2_id, v_conta_bancaria_id, 'pago', 2200, 'pix', (v_hoje - interval '1 month')::date, (v_hoje - interval '1 month')::date);

  insert into pagamentos (empresa_id, lancamento_id, conta_bancaria_id, status, valor, data_prevista)
  values (v_empresa_id, v_lancamento_pendente_id, v_conta_bancaria_id, 'pendente', 2200, (v_hoje + interval '1 day')::date);

  -- ============================================================
  -- 5. Manutenções — uma realizada (gera Lançamento automático, migration 0012), uma
  --    agendada (mostra o gerador manutencao.agendada_vencendo, Missão 4 Fase 3)
  -- ============================================================
  insert into manutencoes (empresa_id, veiculo_id, tipo, descricao, oficina, km, custo, data_execucao, status_execucao)
  values (v_empresa_id, v_veiculo1_id, 'preventiva', 'Troca de pneus dianteiros', 'Oficina EV São Paulo', 6000, 850, (v_hoje - interval '2 months')::date, 'realizada');

  insert into manutencoes (empresa_id, veiculo_id, tipo, descricao, data_agendada, status_execucao)
  values (v_empresa_id, v_veiculo1_id, 'preventiva', 'Revisão dos 10.000 km', (v_hoje + interval '5 days')::date, 'agendada');

  -- ============================================================
  -- 6. Checklist de entrega — concluído, mesmo modelo usado pela UI (checklistModelos.ts)
  -- ============================================================
  insert into checklists (empresa_id, titulo, status, entidade_tipo, entidade_id, concluido_em)
  values (v_empresa_id, 'Entrega ao motorista', 'concluido', 'veiculo', v_veiculo1_id, (v_hoje - interval '3 months')::date)
  returning id into v_checklist_id;

  insert into checklist_itens (checklist_id, ordem, descricao, obrigatorio, resposta, respondido_em) values
    (v_checklist_id, 0, 'Veículo limpo e higienizado', true, true, (v_hoje - interval '3 months')::date),
    (v_checklist_id, 1, 'Carga da bateria registrada', true, true, (v_hoje - interval '3 months')::date),
    (v_checklist_id, 2, 'Quilometragem registrada', true, true, (v_hoje - interval '3 months')::date),
    (v_checklist_id, 3, 'Fotos do veículo (4 ângulos) anexadas', true, true, (v_hoje - interval '3 months')::date),
    (v_checklist_id, 4, 'Documentos do veículo conferidos (CRLV, seguro)', true, true, (v_hoje - interval '3 months')::date),
    (v_checklist_id, 5, 'Motorista assinou termo de entrega', true, true, (v_hoje - interval '3 months')::date);

  -- ============================================================
  -- 7. Multa — pendente, vinculada ao veículo e ao motorista do contrato ativo
  -- ============================================================
  insert into multas (empresa_id, veiculo_id, motorista_id, contrato_id, orgao_autuador, descricao, data_infracao, data_vencimento, valor, pontos, status)
  values (v_empresa_id, v_veiculo1_id, v_motorista1_id, v_contrato_id, 'DETRAN-SP', 'Excesso de velocidade até 20%', (v_hoje - interval '10 days')::date, (v_hoje + interval '20 days')::date, 195.23, 4, 'pendente');

  raise notice 'Seed concluído — empresa_id = %, veículo 1 (PRM1A23) = %, veículo 2 (PRM2B45) = %, motorista 1 = %, motorista 2 = %, contrato = %',
    v_empresa_id, v_veiculo1_id, v_veiculo2_id, v_motorista1_id, v_motorista2_id, v_contrato_id;
end $$;
