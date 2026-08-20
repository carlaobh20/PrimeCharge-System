-- PrimeCharge OS — Fase 2 do App do Motorista: acesso a dados operacionais + Chamados.
-- Habilita, de forma ADITIVA e por menor privilégio, o que o portal precisa LER/CRIAR:
-- pagamentos/cobranças próprios, documentos próprios, itens dos próprios pedidos da lojinha,
-- vistorias próprias (leitura), e um canal de chamados/ocorrências (tabela nova).
--
-- Nada é destrutivo: nenhuma coluna removida, nenhuma policy de staff enfraquecida — só
-- policies permissivas novas para o role 'motorista' (Postgres combina SELECT com OR) e uma
-- tabela nova. As policies de staff (eh_staff()) continuam intactas.
--
-- ⚠️ NÃO aplicada em produção. Validada só em Postgres local (supabase/tests/). Aplicar a 0039
-- ANTES desta (0040 depende de current_motorista_id()/eh_staff(), já existentes desde 0034/0035).

-- ============================================================
-- 1. PAGAMENTOS / COBRANÇAS — motorista vê os PRÓPRIOS (só receita)
--
-- lancamentos e pagamentos são staff-only desde 0036. O motorista precisa ver "o que devo /
-- o que paguei". Escopo mínimo: só as RECEITAS ligadas a ele (aluguel recorrente + compras da
-- lojinha entregues) — nunca despesas internas que por acaso tenham o motorista_id preenchido,
-- nem lançamentos sem motorista_id. "Vencido" continua sendo derivado (prevista + data <
-- hoje), nunca um estado no banco (decisão 0006) — o cálculo vive no cliente (motor), não aqui.
-- ============================================================

drop policy if exists "lancamentos: motorista ve as proprias receitas" on lancamentos;
create policy "lancamentos: motorista ve as proprias receitas" on lancamentos
  for select using (
    tipo = 'receita'
    and motorista_id = public.current_motorista_id()
  );

drop policy if exists "pagamentos: motorista ve os dos proprios lancamentos" on pagamentos;
create policy "pagamentos: motorista ve os dos proprios lancamentos" on pagamentos
  for select using (
    exists (
      select 1 from lancamentos l
      where l.id = pagamentos.lancamento_id
        and l.tipo = 'receita'
        and l.motorista_id = public.current_motorista_id()
    )
  );

-- ============================================================
-- 2. DOCUMENTOS — motorista vê os arquivos do PRÓPRIO contexto
--
-- Tabela `arquivos` é staff-only desde 0036; o Storage dos buckets já foi restringido por
-- vínculo na 0039. Esta policy libera o METADADO (nome, caminho, validade) dos arquivos do
-- próprio motorista/contrato/veículo — casando exatamente com o que a 0039 já deixa o Storage
-- servir, pra não haver assimetria (metadado visível ↔ bytes acessíveis).
-- financeiro-arquivos NÃO entra: continua administrativo (a 0039 deixou staff-only).
-- ============================================================

drop policy if exists "arquivos: motorista ve os do proprio contexto" on arquivos;
create policy "arquivos: motorista ve os do proprio contexto" on arquivos
  for select using (
    (entidade_tipo = 'motorista' and entidade_id = public.current_motorista_id())
    or (entidade_tipo = 'contrato' and exists (
      select 1 from contratos c where c.id = arquivos.entidade_id and c.motorista_id = public.current_motorista_id()))
    or (entidade_tipo = 'veiculo' and exists (
      select 1 from contratos c where c.veiculo_id = arquivos.entidade_id and c.motorista_id = public.current_motorista_id()))
  );

-- ============================================================
-- 3. VISTORIAS — motorista LÊ as próprias (checklists com o motorista_id dele)
--
-- checklists/checklist_itens são staff-only (0036). O motorista deve poder VER a vistoria de
-- entrega/devolução do próprio contrato (fotos já liberadas na 0039). NÃO é dado acesso de
-- escrita aqui: concluir uma vistoria de entrega/devolução ATIVA/ENCERRA o contrato
-- (fn_propagar_status_vistoria) — alavanca que não pode ficar na mão do motorista sem uma
-- etapa de validação do staff. O fluxo de vistoria iniciada pelo motorista é uma fase à parte,
-- com decisão de produto registrada no relatório.
-- ============================================================

drop policy if exists "checklists: motorista ve as proprias vistorias" on checklists;
create policy "checklists: motorista ve as proprias vistorias" on checklists
  for select using (
    motorista_id = public.current_motorista_id()
  );

drop policy if exists "checklist_itens: motorista ve os das proprias vistorias" on checklist_itens;
create policy "checklist_itens: motorista ve os das proprias vistorias" on checklist_itens
  for select using (
    exists (
      select 1 from checklists ck
      where ck.id = checklist_itens.checklist_id
        and ck.motorista_id = public.current_motorista_id()
    )
  );

-- ============================================================
-- 4. LOJINHA — itens dos próprios pedidos com nome do produto
--
-- O motorista já lê os próprios `pedidos` e `pedido_itens` (0035), mas NÃO lê `produtos` — só
-- via catalogo_lojinha(). Então "Meus pedidos" mostraria produto_id cru, sem nome. Esta função
-- SECURITY DEFINER devolve os itens dos pedidos DO PRÓPRIO motorista com o nome do produto,
-- sem expor custo/estoque/fornecedor. fn_pedido_total() (0035) já é security definer e serve o
-- total. Nenhuma coluna administrativa vaza.
-- ============================================================

create or replace function public.itens_dos_meus_pedidos() returns table (
  pedido_id uuid,
  produto_id uuid,
  produto_nome text,
  quantidade integer,
  preco_unitario numeric,
  subtotal numeric
)
language sql stable
security definer
set search_path = public
as $$
  select pi.pedido_id, pi.produto_id, pr.nome, pi.quantidade, pi.preco_unitario, pi.subtotal
  from pedido_itens pi
  join pedidos pd on pd.id = pi.pedido_id
  join produtos pr on pr.id = pi.produto_id
  where pd.motorista_id = public.current_motorista_id();
$$;

grant execute on function public.itens_dos_meus_pedidos() to authenticated;

-- ============================================================
-- 5. CHAMADOS — canal de suporte/ocorrências do motorista (tabela nova)
--
-- Não existia NENHUMA tabela de chamado/ticket no schema (auditoria Fase 0). Este é o maior
-- buraco funcional do app ("meu carro está com problema" não tinha destino). Segue o padrão
-- provado do projeto: state machine no banco, permissões por pode('suporte', acao), RLS
-- "motorista vê/cria os próprios", espelho na timeline, anexos via a capability `arquivos`
-- genérica (entidade_tipo='chamado'), respostas via `comentarios` genérico. Nada é inventado
-- fora do que já existe — só o cabeçalho do ticket.
-- ============================================================

do $$ begin
  create type chamado_categoria as enum ('financeiro','veiculo','pagamento','lojinha','vistoria','documento','manutencao','ocorrencia','outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chamado_status as enum ('aberto','em_analise','aguardando_motorista','resolvido','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chamado_prioridade as enum ('baixa','media','alta','critica');
exception when duplicate_object then null; end $$;

create table if not exists chamados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  motorista_id uuid not null references motoristas(id) on delete cascade,
  -- vínculos opcionais (a ocorrência pode ser sobre um veículo/contrato específico)
  contrato_id uuid references contratos(id) on delete set null,
  veiculo_id uuid references veiculos(id) on delete set null,
  categoria chamado_categoria not null default 'outro',
  assunto text not null,
  descricao text not null,
  status chamado_status not null default 'aberto',
  prioridade chamado_prioridade not null default 'media',
  aberto_por uuid references usuarios(id) on delete set null,   -- quem abriu (motorista OU staff)
  responsavel_id uuid references usuarios(id) on delete set null,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_chamados_empresa on chamados(empresa_id);
create index if not exists idx_chamados_motorista on chamados(motorista_id);
create index if not exists idx_chamados_status on chamados(empresa_id, status);

alter table chamados enable row level security;

-- --- state machine no banco (não no frontend) ---
create or replace function public.fn_validar_transicao_chamado() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if old.status = new.status then
    return new;
  end if;

  -- transições válidas
  v_ok := case old.status
    when 'aberto' then new.status in ('em_analise','aguardando_motorista','resolvido','cancelado')
    when 'em_analise' then new.status in ('aguardando_motorista','resolvido','cancelado')
    when 'aguardando_motorista' then new.status in ('em_analise','resolvido','cancelado')
    else false  -- resolvido/cancelado são terminais
  end;

  if not v_ok then
    raise exception 'Transição de chamado inválida: % -> %', old.status, new.status;
  end if;

  -- Quem pode mover o status: só staff com pode('suporte','gerenciar'). O motorista abre e
  -- comenta, mas não resolve/analisa o próprio chamado (mesma lógica de "não aprova o próprio
  -- pedido" da lojinha). A ÚNICA transição que o dono pode fazer é cancelar o próprio, enquanto
  -- ainda não foi resolvido.
  if new.status = 'cancelado'
     and old.motorista_id = public.current_motorista_id()
     and old.status <> 'resolvido' then
    -- dono cancelando o próprio: permitido
    null;
  elsif not public.pode('suporte','gerenciar') then
    raise exception 'Sem permissão para alterar o status deste chamado.';
  end if;

  if new.status = 'resolvido' and new.resolvido_em is null then
    new.resolvido_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chamados_valida_transicao on chamados;
create trigger trg_chamados_valida_transicao before update on chamados
  for each row execute function public.fn_validar_transicao_chamado();

drop trigger if exists trg_chamados_atualizado_em on chamados;
create trigger trg_chamados_atualizado_em before update on chamados
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_chamados_audit on chamados;
create trigger trg_chamados_audit after insert or update or delete on chamados
  for each row execute function public.fn_audit_log();

-- --- espelho na timeline (do motorista e, se houver, do veículo) ---
create or replace function public.fn_timeline_chamado() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
  values (
    new.empresa_id, 'motorista', new.motorista_id,
    case when TG_OP = 'INSERT' then 'chamado_aberto' else 'chamado_atualizado' end,
    new.assunto,
    jsonb_build_object('chamado_id', new.id, 'status', new.status, 'categoria', new.categoria),
    auth.uid(), now()
  );
  if new.veiculo_id is not null and TG_OP = 'INSERT' then
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
    values (new.empresa_id, 'veiculo', new.veiculo_id, 'chamado_aberto', new.assunto,
      jsonb_build_object('chamado_id', new.id, 'categoria', new.categoria), auth.uid(), now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chamados_timeline on chamados;
create trigger trg_chamados_timeline after insert or update on chamados
  for each row execute function public.fn_timeline_chamado();

-- --- RLS ---
-- staff da empresa: vê e gerencia tudo
drop policy if exists "chamados: staff ve por empresa" on chamados;
create policy "chamados: staff ve por empresa" on chamados
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "chamados: staff insere por empresa" on chamados;
create policy "chamados: staff insere por empresa" on chamados
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "chamados: staff atualiza por empresa" on chamados;
create policy "chamados: staff atualiza por empresa" on chamados
  for update using (empresa_id = public.current_empresa_id() and public.eh_staff());

-- motorista: vê os próprios
drop policy if exists "chamados: motorista ve os proprios" on chamados;
create policy "chamados: motorista ve os proprios" on chamados
  for select using (motorista_id = public.current_motorista_id());

-- motorista: abre chamado PRÓPRIO (motorista_id dele, na empresa dele, aberto_por = ele mesmo).
-- O contrato/veículo (quando informados) têm que ser dele — trava contra abrir chamado
-- "encostado" no veículo/contrato de outro.
drop policy if exists "chamados: motorista abre o proprio" on chamados;
create policy "chamados: motorista abre o proprio" on chamados
  for insert with check (
    motorista_id = public.current_motorista_id()
    and empresa_id = (select empresa_id from usuarios where id = auth.uid())
    and aberto_por = auth.uid()
    and status = 'aberto'
    -- ⚠️ Qualificar com chamados.* é OBRIGATÓRIO: um `veiculo_id` sem qualificar seria capturado
    -- pelo alias interno `c` (contratos.veiculo_id), virando `c.veiculo_id = c.veiculo_id`
    -- (sempre true) — o que deixaria o motorista abrir chamado encostado no veículo de qualquer
    -- um. Bug pego por teste local (30_fase2).
    and (chamados.contrato_id is null or exists (select 1 from contratos c where c.id = chamados.contrato_id and c.motorista_id = public.current_motorista_id()))
    and (chamados.veiculo_id is null or exists (select 1 from contratos c where c.veiculo_id = chamados.veiculo_id and c.motorista_id = public.current_motorista_id()))
  );

-- motorista: atualiza o próprio (na prática só pra cancelar — o trigger de transição barra o
-- resto). O USING garante que ele só alcança as próprias linhas; o WITH CHECK impede que ele
-- mova o chamado pra outro motorista/empresa.
drop policy if exists "chamados: motorista atualiza o proprio" on chamados;
create policy "chamados: motorista atualiza o proprio" on chamados
  for update using (motorista_id = public.current_motorista_id())
  with check (motorista_id = public.current_motorista_id());

-- --- permissões de suporte ---
insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'suporte', acao, true
from (values ('super_admin'), ('owner'), ('admin'), ('gestor_frota')) as r(role)
cross join (values ('ver'), ('gerenciar')) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('operador','suporte','ver',true),
  ('operador','suporte','gerenciar',true),
  ('gestor_financeiro','suporte','ver',true),
  -- motorista pode ABRIR (a policy de insert já cobre); 'ver' os próprios (a policy de select
  -- cobre). Sem 'gerenciar' — não resolve/analisa o próprio chamado.
  ('motorista','suporte','ver',true)
on conflict (role, modulo, acao) do nothing;
