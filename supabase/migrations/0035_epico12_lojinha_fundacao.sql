-- PrimeCharge OS — Épico 12: Lojinha (Estoque + Pedido de Reposição pelo Motorista)
-- Referência: briefing "PRIMECHARGE — EXTENSÃO DA FUNDAÇÃO / ESTOQUE + LOJINHA + PEDIDO DE
-- REPOSIÇÃO PELO MOTORISTA" (conversa com Carlos, 2026-08-13) + auditoria prévia (relatório
-- desta sessão) que confirmou NÃO existir produtos/estoque/pedidos/vendas/fornecedores em
-- nenhuma migration anterior — "Lojinha" só existia como flag de planejamento estratégico em
-- politicas_empresa.linhas_de_negocio_futuras, sem schema nenhum por trás.
--
-- Decisões de negócio confirmadas por Carlos (AskUserQuestion, 2026-08-13):
--   1. Um pedido vira dinheiro de verdade quando entregue: gera cobrança automática NO
--      CONTRATO do motorista (lançamento em `lancamentos`, cobrado junto com o aluguel) — NÃO
--      é pagamento imediato no app (não existe gateway de pagamento nesta fase).
--   2. Fornecedor fica de fora desta fase — sem tabela `fornecedores`.
--
-- Escopo desta migration (fundação primeiro, mesmo padrão de 0034 — App Motorista Fase 1):
-- SÓ schema + integração de backend (RLS, triggers, função de catálogo seguro). Nenhuma tela
-- nova (nem "cadastrar produto" no OS, nem catálogo/carrinho no App Motorista) — fica para a
-- próxima fase, quando a fundação puder ser validada primeiro.
--
-- Como as tabelas novas já nascem com policy que distingue staff de motorista (seção 5), esta
-- migration também aproveita para FECHAR um gap real encontrado durante o desenho: as policies
-- de SELECT "por empresa" em motoristas/contratos/veiculos (criadas antes de existir login de
-- motorista) nunca excluíram role='motorista' — um motorista autenticado conseguia ler TODOS
-- os registros da empresa nessas 3 tabelas (outros motoristas, outros contratos, toda a frota),
-- não só os próprios. Corrigido na seção 1, ANTES de construir a Lojinha em cima do mesmo
-- padrão — ver o comentário da seção 1 para o alcance exato do que foi (e não foi) corrigido.

-- ============================================================
-- 1. FIX — motorista não pode mais ler a empresa inteira via motoristas/contratos/veiculos
--
-- Achado: a migration 0034 (App Motorista Fase 1) deu login real ao role 'motorista' pela
-- primeira vez, e adicionou policies SELECT "motorista vê só o próprio X" em motoristas/
-- contratos/veiculos — mas essas 3 tabelas JÁ TINHAM uma policy SELECT mais antiga
-- ("... : select por empresa", using (empresa_id = current_empresa_id())) que nunca excluiu
-- role='motorista'. Como usuarios.empresa_id também é preenchido para contas de motorista,
-- essa policy antiga sozinha já libera TODAS as linhas da empresa pra qualquer motorista
-- logado — o Postgres combina policies SELECT permissivas com OR, então a policy nova
-- (corretamente restrita) não estreita nada, só soma. O comentário original da 0034 ("isso só
-- ADICIONA visibilidade... não estreita em nada o que a empresa já garante para o staff")
-- estava descrevendo esse comportamento sem perceber que ele também vale pro motorista.
--
-- Efeito prático se não corrigido: qualquer motorista com acesso ao portal conseguiria, via
-- chamada direta à API do Supabase (não precisa nem usar a tela), ler o contrato e o valor
-- pago por QUALQUER outro motorista da empresa, além dos dados de toda a frota. Migration 0034
-- ainda não foi aplicada no banco real (confirmado nesta sessão) — corrigido antes de qualquer
-- motorista real logar, sem dado exposto até aqui.
--
-- Alcance desta correção: SÓ as 3 tabelas que a própria 0034 prometeu escopar. O mesmo padrão
-- de policy ("empresa_id = current_empresa_id()" sem excluir motorista) se repete em outras
-- tabelas do sistema (lancamentos, pagamentos, contas_bancarias, centros_custo, usuarios, etc.)
-- — não corrigido aqui: são módulos fora do escopo desta migration e merecem uma auditoria
-- dedicada (RLS end-to-end para o role motorista), não um patch de passagem. Registrar como
-- item de prioridade antes de liberar o App Motorista para motoristas reais.
-- ============================================================

create or replace function public.eh_staff() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u where u.id = auth.uid() and u.role <> 'motorista'
  );
$$;

drop policy if exists "motoristas: select por empresa" on motoristas;
create policy "motoristas: select por empresa" on motoristas
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "contratos: select por empresa" on contratos;
create policy "contratos: select por empresa" on contratos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "veiculos: select por empresa" on veiculos;
create policy "veiculos: select por empresa" on veiculos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

-- ============================================================
-- 2. Enums
-- ============================================================

do $$ begin
  create type movimentacao_estoque_tipo as enum (
    'entrada_compra','saida_venda','ajuste_entrada','ajuste_saida','devolucao','perda','cancelamento'
  );
exception
  when duplicate_object then null;
end $$;

-- 'cancelado' adicionado como estado terminal explícito — o briefing original não chegou a
-- especificar esse detalhe (mensagem cortada), mas uma state machine real precisa de um jeito
-- de encerrar um pedido sem entregá-lo (mesmo racional de contrato_status ter 'cancelado' ao
-- lado de 'encerrado').
do $$ begin
  create type pedido_status as enum (
    'rascunho','solicitado','aprovado','separando','pronto','entregue','cancelado'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 3. produtos
-- Catálogo da Lojinha. Motorista só enxerga um subconjunto de colunas (via catalogo_lojinha(),
-- seção 8) — custo/estoque_minimo são informação administrativa (exigência explícita do
-- Carlos). RLS de produtos por si só já bloqueia leitura direta por motorista (seção 9) — a
-- função de catálogo existe porque RLS é por LINHA, não por COLUNA.
-- ============================================================

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  nome text not null,
  descricao text,
  categoria text,
  sku text,
  unidade text not null default 'un',

  preco_venda numeric(10,2) not null,
  custo numeric(10,2),
  estoque_minimo integer not null default 0,
  imagem_url text,

  ativo boolean not null default true,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_produtos_preco_positivo check (preco_venda > 0),
  constraint chk_produtos_custo_nao_negativo check (custo is null or custo >= 0),
  constraint chk_produtos_estoque_minimo_nao_negativo check (estoque_minimo >= 0)
);

create index if not exists idx_produtos_empresa on produtos(empresa_id);
create index if not exists idx_produtos_categoria on produtos(empresa_id, categoria);
-- SKU é opcional (nem toda empresa vai usar) mas quando presente não pode duplicar dentro da
-- mesma empresa — índice único parcial em vez de unique(empresa_id, sku) porque unique trata
-- múltiplos NULL como não-conflitantes só em alguns bancos; parcial deixa isso explícito.
create unique index if not exists uq_produtos_empresa_sku on produtos(empresa_id, sku) where sku is not null;

-- ============================================================
-- 4. pedidos
-- Cabeçalho do pedido. `total` deliberadamente NÃO é uma coluna armazenada — decisão minha,
-- registrada aqui porque diverge do campo literal pedido pelo Carlos: o projeto já segue a
-- regra explícita de nunca guardar um número que fica desatualizado sozinho (mesmo motivo do
-- estoque ser ledger em vez de contador — seção 6). total é sempre a soma de pedido_itens.
-- subtotal, disponível via fn_pedido_total() (seção 7) ou por query direta. Se isso incomodar
-- na prática (ex.: performance em relatório), dá pra revisitar como view materializada depois
-- — não como coluna solta que alguém esquece de atualizar.
-- ============================================================

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  motorista_id uuid not null references motoristas(id) on delete restrict,
  contrato_id uuid references contratos(id) on delete set null,

  status pedido_status not null default 'rascunho',
  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_pedidos_empresa on pedidos(empresa_id);
create index if not exists idx_pedidos_motorista on pedidos(motorista_id);
create index if not exists idx_pedidos_status on pedidos(empresa_id, status);
create index if not exists idx_pedidos_contrato on pedidos(contrato_id);

-- ============================================================
-- 5. pedido_itens
-- Linha do pedido. preco_unitario é uma CÓPIA CONGELADA de produtos.preco_venda no momento do
-- pedido — nunca recalculado (exigência explícita do Carlos, mesmo padrão já usado em
-- fn_gerar_cobrancas_recorrentes com contratos.valor_periodico). subtotal é GENERATED porque é
-- função pura de duas colunas congeladas NA MESMA LINHA — seguro de guardar, diferente de
-- pedidos.total (que soma várias linhas e pode mudar se linhas forem adicionadas depois).
-- Linha é imutável após criada (sem UPDATE esperado) — por isso sem atualizado_em/trigger de
-- auditoria própria; auditoria do pedido como um todo já vem do trigger em `pedidos`.
-- ============================================================

create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,

  quantidade integer not null,
  preco_unitario numeric(10,2) not null,
  subtotal numeric(12,2) generated always as (quantidade * preco_unitario) stored,

  criado_em timestamptz not null default now(),

  constraint chk_pedido_itens_quantidade_positiva check (quantidade > 0),
  constraint chk_pedido_itens_preco_positivo check (preco_unitario > 0),
  constraint uq_pedido_itens_pedido_produto unique (pedido_id, produto_id)
);

create index if not exists idx_pedido_itens_pedido on pedido_itens(pedido_id);
create index if not exists idx_pedido_itens_produto on pedido_itens(produto_id);

-- ============================================================
-- 6. movimentacoes_estoque
-- Ledger real (exigência explícita do Carlos: "não quero produto.estoque=50 sem histórico").
-- Saldo NUNCA é armazenado em produtos — é sempre SUM(quantidade) desta tabela, mesmo
-- princípio anti-drift de pedidos.total. quantidade é COM SINAL (entrada positiva, saída
-- negativa) — o CHECK abaixo garante que o sinal bate com o tipo declarado, então um bug de
-- aplicação não consegue gravar uma "entrada_compra" negativa por engano. 'cancelamento' fica
-- de fora do CHECK de sinal de propósito: é sempre uma REVERSÃO de outro movimento (ver seção
-- 10), então o sinal certo depende do que está sendo revertido, não do tipo em si.
-- ============================================================

create table if not exists movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  pedido_id uuid references pedidos(id) on delete set null,

  tipo movimentacao_estoque_tipo not null,
  quantidade integer not null,
  motivo text,
  usuario_id uuid references usuarios(id) on delete set null,

  criado_em timestamptz not null default now(),

  constraint chk_movimentacoes_estoque_quantidade_nao_zero check (quantidade <> 0),
  constraint chk_movimentacoes_estoque_sinal_por_tipo check (
    case tipo
      when 'entrada_compra' then quantidade > 0
      when 'ajuste_entrada' then quantidade > 0
      when 'devolucao' then quantidade > 0
      when 'saida_venda' then quantidade < 0
      when 'ajuste_saida' then quantidade < 0
      when 'perda' then quantidade < 0
      when 'cancelamento' then true
      else false
    end
  )
);

create index if not exists idx_movimentacoes_estoque_empresa on movimentacoes_estoque(empresa_id);
create index if not exists idx_movimentacoes_estoque_produto on movimentacoes_estoque(produto_id, criado_em desc);
create index if not exists idx_movimentacoes_estoque_pedido on movimentacoes_estoque(pedido_id);

-- ============================================================
-- 7. fn_pedido_total() — soma derivada, não guardada (ver comentário da seção 4).
-- ============================================================

create or replace function public.fn_pedido_total(p_pedido_id uuid) returns numeric
language sql stable
security definer
set search_path = public
as $$
  select coalesce(sum(subtotal), 0) from pedido_itens where pedido_id = p_pedido_id;
$$;

-- ============================================================
-- 8. catalogo_lojinha() — único caminho de leitura de produto para o motorista. Retorna só as
-- colunas seguras (preço de venda, nunca custo/estoque_minimo) + saldo disponível calculado na
-- hora. Mesmo precedente de buscar_convite_por_token() (0009): função SECURITY DEFINER que
-- expõe uma projeção deliberadamente estreita, em vez de abrir a tabela inteira via RLS.
-- ============================================================

create or replace function public.catalogo_lojinha() returns table (
  id uuid,
  nome text,
  descricao text,
  categoria text,
  unidade text,
  preco_venda numeric,
  imagem_url text,
  quantidade_disponivel numeric
)
language sql stable
security definer
set search_path = public
as $$
  select
    p.id, p.nome, p.descricao, p.categoria, p.unidade, p.preco_venda, p.imagem_url,
    coalesce((select sum(me.quantidade) from movimentacoes_estoque me where me.produto_id = p.id), 0) as quantidade_disponivel
  from produtos p
  where p.empresa_id = public.current_empresa_id()
    and p.ativo = true;
$$;

grant execute on function public.catalogo_lojinha() to authenticated;

-- ============================================================
-- 9. RLS
-- Padrão: staff enxerga tudo da empresa (gated por eh_staff(), seção 1); motorista só os
-- próprios pedidos/itens, nunca produtos/estoque diretamente (usa catalogo_lojinha()).
-- ============================================================

alter table produtos enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table movimentacoes_estoque enable row level security;

drop policy if exists "produtos: staff ve por empresa" on produtos;
create policy "produtos: staff ve por empresa" on produtos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "produtos: staff insere por empresa" on produtos;
create policy "produtos: staff insere por empresa" on produtos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('lojinha','gerenciar_produtos'));

drop policy if exists "produtos: staff atualiza por empresa" on produtos;
create policy "produtos: staff atualiza por empresa" on produtos
  for update using (empresa_id = public.current_empresa_id() and public.pode('lojinha','gerenciar_produtos'));

-- Sem policy de delete — mesmo padrão de centros_custo/centros_resultado/contas_bancarias:
-- desativar via `ativo = false`, nunca apagar linha com histórico de movimentação/pedido atrás.

drop policy if exists "pedidos: staff ve por empresa" on pedidos;
create policy "pedidos: staff ve por empresa" on pedidos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "pedidos: motorista ve os proprios" on pedidos;
create policy "pedidos: motorista ve os proprios" on pedidos
  for select using (motorista_id = public.current_motorista_id());

drop policy if exists "pedidos: staff insere por empresa" on pedidos;
create policy "pedidos: staff insere por empresa" on pedidos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('lojinha','criar_pedido'));

drop policy if exists "pedidos: motorista cria o proprio pedido" on pedidos;
create policy "pedidos: motorista cria o proprio pedido" on pedidos
  for insert with check (
    empresa_id = public.current_empresa_id()
    and motorista_id = public.current_motorista_id()
    and status = 'rascunho'
  );

drop policy if exists "pedidos: staff atualiza por empresa" on pedidos;
create policy "pedidos: staff atualiza por empresa" on pedidos
  for update using (empresa_id = public.current_empresa_id() and public.eh_staff())
  with check (empresa_id = public.current_empresa_id());

drop policy if exists "pedidos: motorista atualiza o proprio" on pedidos;
create policy "pedidos: motorista atualiza o proprio" on pedidos
  for update using (motorista_id = public.current_motorista_id())
  with check (motorista_id = public.current_motorista_id());

-- pedido_itens não tem empresa_id/motorista_id própria — visibilidade herda do pedido pai via
-- EXISTS. Repetindo o cuidado da seção 1: a branch "staff" precisa excluir motorista
-- explicitamente, senão a policy sozinha (empresa_id do pedido bate com a empresa do motorista)
-- libera itens de pedidos de OUTROS motoristas.
drop policy if exists "pedido_itens: staff ve por empresa" on pedido_itens;
create policy "pedido_itens: staff ve por empresa" on pedido_itens
  for select using (
    public.eh_staff()
    and exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id and p.empresa_id = public.current_empresa_id()
    )
  );

drop policy if exists "pedido_itens: motorista ve os proprios" on pedido_itens;
create policy "pedido_itens: motorista ve os proprios" on pedido_itens
  for select using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id and p.motorista_id = public.current_motorista_id()
    )
  );

drop policy if exists "pedido_itens: staff insere por empresa" on pedido_itens;
create policy "pedido_itens: staff insere por empresa" on pedido_itens
  for insert with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id and p.empresa_id = public.current_empresa_id() and public.eh_staff()
    )
  );

-- Motorista só adiciona item ao PRÓPRIO pedido enquanto ainda em rascunho — depois de
-- 'solicitado' o pedido já saiu da mão dele (mesma lógica de contrato: edição livre só antes
-- do fluxo de aprovação começar).
drop policy if exists "pedido_itens: motorista monta o proprio rascunho" on pedido_itens;
create policy "pedido_itens: motorista monta o proprio rascunho" on pedido_itens
  for insert with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and p.motorista_id = public.current_motorista_id()
        and p.status = 'rascunho'
    )
  );

drop policy if exists "pedido_itens: motorista remove do proprio rascunho" on pedido_itens;
create policy "pedido_itens: motorista remove do proprio rascunho" on pedido_itens
  for delete using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and p.motorista_id = public.current_motorista_id()
        and p.status = 'rascunho'
    )
  );

-- movimentacoes_estoque: leitura/gravação só staff. Gravação real acontece via trigger
-- SECURITY DEFINER (seção 10), não via INSERT direto do client — policy de insert existe só
-- para eventuais ajustes manuais feitos por quem tem a permissão (ex.: contagem de inventário).
drop policy if exists "movimentacoes_estoque: staff ve por empresa" on movimentacoes_estoque;
create policy "movimentacoes_estoque: staff ve por empresa" on movimentacoes_estoque
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "movimentacoes_estoque: staff insere ajuste manual" on movimentacoes_estoque;
create policy "movimentacoes_estoque: staff insere ajuste manual" on movimentacoes_estoque
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('lojinha','gerenciar_produtos'));

-- ============================================================
-- 10. Matriz de permissão do módulo 'lojinha' — mesmo padrão de 'contratos' (0005). Primeira
-- vez que o role 'motorista' recebe entradas reais em `permissoes` (só 'solicitar'/'cancelar',
-- e só sobre os próprios pedidos — a policy de RLS acima é quem garante o escopo por linha;
-- pode() aqui garante só a AÇÃO, não a linha).
-- ============================================================

insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'lojinha', acao, true
from (values ('super_admin'), ('owner'), ('admin')) as r(role)
cross join (values
  ('ver'),('gerenciar_produtos'),('criar_pedido'),
  ('solicitar'),('aprovar'),('iniciar_separacao'),('finalizar_separacao'),('entregar'),('cancelar')
) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_frota','lojinha','ver',true),
  ('gestor_frota','lojinha','gerenciar_produtos',true),
  ('gestor_frota','lojinha','criar_pedido',true),
  ('gestor_frota','lojinha','aprovar',true),
  ('gestor_frota','lojinha','iniciar_separacao',true),
  ('gestor_frota','lojinha','finalizar_separacao',true),
  ('gestor_frota','lojinha','entregar',true),
  ('gestor_frota','lojinha','cancelar',true),
  ('gestor_financeiro','lojinha','ver',true),
  ('operador','lojinha','ver',true),
  ('operador','lojinha','iniciar_separacao',true),
  ('operador','lojinha','finalizar_separacao',true),
  ('operador','lojinha','entregar',true),
  ('motorista','lojinha','solicitar',true),
  ('motorista','lojinha','cancelar',true)
on conflict (role, modulo, acao) do nothing;

-- ============================================================
-- 11. State machine de pedidos.status — validada no banco, mesmo padrão de
-- fn_validar_transicao_contrato (0005): cada transição exige a permissão correspondente via
-- pode(), e transição fora da lista é rejeitada com exception.
-- rascunho → solicitado → aprovado → separando → pronto → entregue (terminal)
-- 'cancelado' é alcançável de qualquer estado não-terminal; 'entregue'/'cancelado' são terminais.
-- ============================================================

create or replace function public.fn_validar_transicao_pedido() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida boolean;
  v_acao text;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_valida := case old.status
      when 'rascunho' then new.status in ('solicitado','cancelado')
      when 'solicitado' then new.status in ('aprovado','cancelado')
      when 'aprovado' then new.status in ('separando','cancelado')
      when 'separando' then new.status in ('pronto','cancelado')
      when 'pronto' then new.status in ('entregue','cancelado')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status de pedido inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'solicitado' then 'solicitar'
      when 'aprovado' then 'aprovar'
      when 'separando' then 'iniciar_separacao'
      when 'pronto' then 'finalizar_separacao'
      when 'entregue' then 'entregar'
      when 'cancelado' then 'cancelar'
      else null
    end;

    if v_acao is not null and not public.pode('lojinha', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pedidos_valida_transicao on pedidos;
create trigger trg_pedidos_valida_transicao before update on pedidos
  for each row execute function public.fn_validar_transicao_pedido();

-- ============================================================
-- 12. Efeitos colaterais da transição — SECURITY DEFINER (mesmo padrão de
-- fn_propagar_status_contrato, 0005) porque grava em movimentacoes_estoque e lancamentos, que
-- pertencem a outras policies de permissão (o usuário já provou ter permissão para a transição
-- do PEDIDO em si via pode('lojinha', v_acao) no trigger anterior — este trigger só executa a
-- consequência, não reabre a decisão de autorização).
--
-- aprovado: baixa de estoque (uma movimentação 'saida_venda' por item, quantidade negativa).
-- cancelado (vindo de aprovado/separando/pronto — ou seja, estoque já tinha sido baixado):
--   reversão via 'cancelamento' (quantidade positiva, desfaz a baixa). Cancelar a partir de
--   rascunho/solicitado não gera reversão nenhuma porque nunca baixou estoque.
-- entregue: gera EXATAMENTE UM lançamento de receita (cobrança no contrato do motorista —
--   decisão confirmada com o Carlos), com o mesmo padrão de "preço não recalculado" de
--   fn_gerar_cobrancas_recorrentes — valor vem de fn_pedido_total(), que por sua vez soma
--   preco_unitario já congelado em cada item, nunca o preco_venda atual do produto.
-- ============================================================

create or replace function public.fn_efeitos_transicao_pedido() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centro_resultado_id uuid;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then

    if new.status = 'aprovado' then
      insert into movimentacoes_estoque (empresa_id, produto_id, pedido_id, tipo, quantidade, motivo, usuario_id)
      select new.empresa_id, pi.produto_id, new.id, 'saida_venda', -pi.quantidade,
             'Pedido ' || new.id || ' aprovado', auth.uid()
      from pedido_itens pi
      where pi.pedido_id = new.id;

    elsif new.status = 'cancelado' and old.status in ('aprovado','separando','pronto') then
      insert into movimentacoes_estoque (empresa_id, produto_id, pedido_id, tipo, quantidade, motivo, usuario_id)
      select new.empresa_id, pi.produto_id, new.id, 'cancelamento', pi.quantidade,
             'Estorno por cancelamento do pedido ' || new.id, auth.uid()
      from pedido_itens pi
      where pi.pedido_id = new.id;

    elsif new.status = 'entregue' then
      select id into v_centro_resultado_id
      from centros_resultado
      where empresa_id = new.empresa_id and nome = 'Lojinha';

      insert into lancamentos (
        empresa_id, tipo, status, descricao, valor, categoria,
        contrato_id, motorista_id, pedido_id, centro_resultado_id,
        data_prevista, criado_via
      ) values (
        new.empresa_id, 'receita', 'prevista', 'Pedido lojinha ' || new.id,
        public.fn_pedido_total(new.id), 'Lojinha',
        new.contrato_id, new.motorista_id, new.id, v_centro_resultado_id,
        current_date, 'automacao'
      );
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists trg_pedidos_efeitos_transicao on pedidos;
create trigger trg_pedidos_efeitos_transicao after update on pedidos
  for each row execute function public.fn_efeitos_transicao_pedido();

-- ============================================================
-- 13. lancamentos.pedido_id — link de rastreabilidade (mesmo padrão de contrato_id/veiculo_id/
-- motorista_id já existentes) + índice único parcial de idempotência, mesmo racional do índice
-- de cobrança recorrente (0029): garante que um pedido nunca gera dois lançamentos automáticos,
-- mesmo em teoria (o guard `old.status is distinct from new.status` do trigger já cobre o caso
-- normal, já que 'entregue' é terminal — este índice é defesa em profundidade, não a única
-- proteção).
-- ============================================================

alter table lancamentos add column if not exists pedido_id uuid references pedidos(id) on delete set null;

create index if not exists idx_lancamentos_pedido on lancamentos(pedido_id);

create unique index if not exists idx_lancamentos_pedido_automacao
  on lancamentos (pedido_id)
  where criado_via = 'automacao' and pedido_id is not null;

-- ============================================================
-- 14. Seed do centro de resultado 'Lojinha' — mesmo padrão exato do seed de 'Locação' (0028).
-- ============================================================

insert into centros_resultado (empresa_id, nome)
select id, 'Lojinha' from empresas
on conflict (empresa_id, nome) do nothing;

-- ============================================================
-- 15. Triggers de atualizado_em / auditoria nas tabelas novas que têm essas colunas.
-- pedido_itens e movimentacoes_estoque ficam de fora: são ledgers append-only (sem
-- atualizado_em, sem UPDATE esperado) — auditoria de INSERT/DELETE neles seria redundante com
-- a rastreabilidade que já vem de pedido_id/produto_id + criado_em.
-- ============================================================

drop trigger if exists trg_produtos_atualizado_em on produtos;
create trigger trg_produtos_atualizado_em before update on produtos
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_produtos_audit on produtos;
create trigger trg_produtos_audit after insert or update or delete on produtos
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_pedidos_atualizado_em on pedidos;
create trigger trg_pedidos_atualizado_em before update on pedidos
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_pedidos_audit on pedidos;
create trigger trg_pedidos_audit after insert or update or delete on pedidos
  for each row execute function public.fn_audit_log();
