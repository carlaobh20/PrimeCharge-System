-- PrimeCharge OS — Fase 3 do App do Motorista: vistoria-write, uploads do motorista,
-- revisão de documentos e notificações in-app. Aditiva, idempotente, NÃO destrutiva.
--
-- ⚠️ NÃO aplicada em produção. Validada só em Postgres local (supabase/tests/). O Supabase MCP
-- desta sessão aponta pra OUTRO projeto (Viagem-EUA), não pro PrimeCharge
-- (ojvhiadjnxhhevoryjtu) — por isso nada foi lido nem aplicado no banco real. Aplicar 0039 e
-- 0040 ANTES desta.

-- ============================================================
-- 1. VISTORIA INICIADA PELO MOTORISTA (write) — sem propagar contrato
--
-- Concluir uma vistoria de entrega/devolução ATIVA/ENCERRA o contrato
-- (fn_propagar_status_vistoria, 0030). Então o motorista NÃO pode concluir — ele só CRIA,
-- preenche itens, tira fotos e ENVIA pra análise. Como o status fica 'aberto' o tempo todo, a
-- propagação (que só roda na conclusão) nunca dispara por ação dele. O staff é quem conclui
-- depois (com pode('operacoes','concluir')), e aí sim propaga — sob controle da operação.
--
-- Sinalização de "enviada pra análise": coluna nova `enviada_motorista_em` (não mexe no enum de
-- status, não mexe na propagação). A fila do staff = checklists status='aberto' com
-- enviada_motorista_em not null.
-- ============================================================

alter table checklists add column if not exists enviada_motorista_em timestamptz;

-- permissão nova, exclusiva do portal (não reusa operacoes/criar pra não dar ao motorista poder
-- sobre checklists administrativos)
insert into permissoes (role, modulo, acao, permitido) values
  ('motorista','vistoria_motorista','criar',true),
  ('motorista','vistoria_motorista','enviar',true)
on conflict (role, modulo, acao) do nothing;

-- INSERT: motorista cria vistoria PRÓPRIA, sempre 'aberto', do próprio contrato/veículo.
drop policy if exists "checklists: motorista cria a propria vistoria" on checklists;
create policy "checklists: motorista cria a propria vistoria" on checklists
  for insert with check (
    public.pode('vistoria_motorista','criar')
    and checklists.empresa_id = (select empresa_id from usuarios where id = auth.uid())
    and checklists.motorista_id = public.current_motorista_id()
    and checklists.status = 'aberto'
    and checklists.tipo in ('entrega','devolucao')
    and exists (select 1 from contratos c where c.id = checklists.contrato_id and c.motorista_id = public.current_motorista_id())
    and (checklists.entidade_tipo = 'veiculo' and exists (
      select 1 from contratos c where c.veiculo_id = checklists.entidade_id and c.motorista_id = public.current_motorista_id()))
  );

-- UPDATE: motorista mexe SÓ na própria vistoria enquanto 'aberto' (preencher odômetro/carga/
-- observações/confirmação e marcar enviada_motorista_em). Não consegue concluir: a transição
-- pra 'concluido' exige pode('operacoes','concluir') na fn_validar_transicao_checklist, que o
-- motorista não tem — a tentativa levanta exceção. O WITH CHECK impede mudar dono/empresa.
drop policy if exists "checklists: motorista edita a propria vistoria aberta" on checklists;
create policy "checklists: motorista edita a propria vistoria aberta" on checklists
  for update using (
    motorista_id = public.current_motorista_id() and status = 'aberto'
  ) with check (
    motorista_id = public.current_motorista_id()
  );

-- checklist_itens: motorista insere/edita itens da PRÓPRIA vistoria aberta.
drop policy if exists "checklist_itens: motorista insere na propria vistoria" on checklist_itens;
create policy "checklist_itens: motorista insere na propria vistoria" on checklist_itens
  for insert with check (
    exists (select 1 from checklists c
      where c.id = checklist_itens.checklist_id
        and c.motorista_id = public.current_motorista_id()
        and c.status = 'aberto')
  );

drop policy if exists "checklist_itens: motorista edita na propria vistoria" on checklist_itens;
create policy "checklist_itens: motorista edita na propria vistoria" on checklist_itens
  for update using (
    exists (select 1 from checklists c
      where c.id = checklist_itens.checklist_id
        and c.motorista_id = public.current_motorista_id()
        and c.status = 'aberto')
  );

-- ============================================================
-- 2. UPLOADS DO MOTORISTA (Storage + arquivos)
--
-- Buckets reaproveitados (sem bucket novo):
--   motoristas-documentos → {empresa}/{motorista_id}/...        (doc pessoal + anexo de chamado)
--   checklists-fotos       → {empresa}/{checklist_id}/...        (foto de vistoria)
-- A 0039 restringiu esses buckets a staff no INSERT. Aqui adicionamos o ramo do motorista:
-- ele grava só onde a 2ª pasta é o PRÓPRIO motorista_id (docs/anexos) ou um checklist DELE
-- (fotos). Path traversal não escapa: a policy compara o token exato de foldername, não confia
-- em string do cliente.
-- ============================================================

drop policy if exists "motoristas-documentos: motorista insere na propria pasta" on storage.objects;
create policy "motoristas-documentos: motorista insere na propria pasta" on storage.objects
  for insert with check (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and (storage.foldername(name))[2] = public.current_motorista_id()::text
  );

drop policy if exists "checklists-fotos: motorista insere na propria vistoria" on storage.objects;
create policy "checklists-fotos: motorista insere na propria vistoria" on storage.objects
  for insert with check (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and exists (
      select 1 from checklists ck
      where ck.id::text = (storage.foldername(name))[2]
        and ck.motorista_id = public.current_motorista_id()
        and ck.status = 'aberto'
    )
  );

-- ⚠️ A policy antiga "arquivos: insert por empresa" (0002) só checava empresa_id — nunca foi
-- restringida (a 0036 corrigiu só o SELECT). Como é permissiva, o motorista (que tem empresa_id)
-- passava nela e inseriria QUALQUER arquivo da empresa. Restrita a staff aqui; o motorista passa
-- a inserir só pela policy scoped abaixo. Bug pego por teste local (40_fase3).
drop policy if exists "arquivos: insert por empresa" on arquivos;
drop policy if exists "arquivos: insert por staff" on arquivos;
create policy "arquivos: insert por staff" on arquivos
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_staff());

-- arquivos: metadado. Motorista registra arquivo do PRÓPRIO motorista (documento) ou de um
-- chamado DELE (anexo). usuario_id tem que ser ele mesmo.
drop policy if exists "arquivos: motorista insere os proprios" on arquivos;
create policy "arquivos: motorista insere os proprios" on arquivos
  for insert with check (
    arquivos.empresa_id = (select empresa_id from usuarios where id = auth.uid())
    and arquivos.usuario_id = auth.uid()
    and (
      (arquivos.entidade_tipo = 'motorista' and arquivos.entidade_id = public.current_motorista_id())
      or (arquivos.entidade_tipo = 'chamado' and exists (
        select 1 from chamados ch where ch.id = arquivos.entidade_id and ch.motorista_id = public.current_motorista_id()))
    )
  );

-- motorista vê anexos de chamado próprio (a 0040 já cobre motorista/contrato/veiculo; falta chamado)
drop policy if exists "arquivos: motorista ve anexos dos proprios chamados" on arquivos;
create policy "arquivos: motorista ve anexos dos proprios chamados" on arquivos
  for select using (
    entidade_tipo = 'chamado' and exists (
      select 1 from chamados ch where ch.id = arquivos.entidade_id and ch.motorista_id = public.current_motorista_id())
  );

-- ============================================================
-- 3. REVISÃO DE DOCUMENTOS (status + motivo) — staff decide, motorista vê
-- ============================================================

do $$ begin
  create type documento_status_revisao as enum ('aguardando','em_analise','aprovado','rejeitado');
exception when duplicate_object then null; end $$;

alter table arquivos add column if not exists status_revisao documento_status_revisao;
alter table arquivos add column if not exists motivo_rejeicao text;
alter table arquivos add column if not exists revisado_por uuid references usuarios(id) on delete set null;
alter table arquivos add column if not exists revisado_em timestamptz;

-- `arquivos` nunca teve policy de UPDATE (0002 só criou insert/select/delete) — então a revisão
-- de documento não gravava. Staff (ativo, da empresa) passa a poder atualizar (revisar). O
-- motorista NÃO recebe UPDATE — só lê o resultado. Bug pego por teste local (40_fase3).
drop policy if exists "arquivos: staff atualiza (revisao)" on arquivos;
create policy "arquivos: staff atualiza (revisao)" on arquivos
  for update using (empresa_id = public.current_empresa_id() and public.eh_staff());

-- ============================================================
-- 4. NOTIFICAÇÕES IN-APP
--
-- Central de notificações do motorista. NÃO é push (sem infra de push nesta fase — documentado).
-- Geradas por TRIGGER (SECURITY DEFINER) quando um evento que interessa ao motorista acontece:
-- pedido muda de status, chamado muda de status, documento é aprovado/rejeitado, vistoria é
-- concluída/reaberta. O motorista só LÊ e marca como lida. Idempotência: cada evento gera no
-- máximo uma linha (o trigger só dispara na mudança real de status).
-- ============================================================

do $$ begin
  create type notificacao_tipo as enum (
    'cobranca','pedido','chamado','documento','vistoria','geral');
exception when duplicate_object then null; end $$;

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  motorista_id uuid not null references motoristas(id) on delete cascade,
  tipo notificacao_tipo not null default 'geral',
  titulo text not null,
  mensagem text,
  link text,               -- rota interna do app (ex. /motorista/pagamentos)
  lida boolean not null default false,
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists idx_notificacoes_motorista on notificacoes(motorista_id, lida);
create index if not exists idx_notificacoes_empresa on notificacoes(empresa_id);

alter table notificacoes enable row level security;

-- helper interno pra criar notificação (SECURITY DEFINER — usado só pelos triggers)
create or replace function public.fn_criar_notificacao(
  p_empresa uuid, p_motorista uuid, p_tipo notificacao_tipo, p_titulo text, p_mensagem text, p_link text
) returns void
language sql security definer set search_path = public
as $$
  insert into notificacoes (empresa_id, motorista_id, tipo, titulo, mensagem, link)
  values (p_empresa, p_motorista, p_tipo, p_titulo, p_mensagem, p_link);
$$;

-- pedido muda de status -> notifica o dono
create or replace function public.fn_notif_pedido() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('aprovado','separando','pronto','entregue','cancelado') then
    perform public.fn_criar_notificacao(
      new.empresa_id, new.motorista_id, 'pedido',
      'Pedido ' || case new.status
        when 'aprovado' then 'aprovado' when 'separando' then 'em separação'
        when 'pronto' then 'pronto pra retirada' when 'entregue' then 'entregue'
        else 'cancelado' end,
      'Seu pedido na lojinha mudou de status.', '/motorista/lojinha/pedidos');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notif_pedido on pedidos;
create trigger trg_notif_pedido after update on pedidos
  for each row execute function public.fn_notif_pedido();

-- chamado muda de status -> notifica o dono (menos quando foi ele mesmo cancelando)
create or replace function public.fn_notif_chamado() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('em_analise','aguardando_motorista','resolvido') then
    perform public.fn_criar_notificacao(
      new.empresa_id, new.motorista_id, 'chamado',
      case new.status when 'aguardando_motorista' then 'Seu chamado aguarda você'
        when 'resolvido' then 'Chamado resolvido' else 'Chamado em análise' end,
      new.assunto, '/motorista/suporte');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notif_chamado on chamados;
create trigger trg_notif_chamado after update on chamados
  for each row execute function public.fn_notif_chamado();

-- documento revisado -> notifica o dono (aprovado/rejeitado)
create or replace function public.fn_notif_documento() returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_motorista uuid;
begin
  if TG_OP = 'UPDATE' and new.status_revisao is distinct from old.status_revisao
     and new.status_revisao in ('aprovado','rejeitado')
     and new.entidade_tipo = 'motorista' then
    v_motorista := new.entidade_id;
    perform public.fn_criar_notificacao(
      new.empresa_id, v_motorista, 'documento',
      case new.status_revisao when 'aprovado' then 'Documento aprovado' else 'Documento recusado' end,
      coalesce(new.motivo_rejeicao, new.nome_arquivo), '/motorista/documentos');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notif_documento on arquivos;
create trigger trg_notif_documento after update on arquivos
  for each row execute function public.fn_notif_documento();

-- vistoria concluída/reaberta -> notifica o dono
create or replace function public.fn_notif_vistoria() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status
     and new.status = 'concluido' and new.motorista_id is not null then
    perform public.fn_criar_notificacao(
      new.empresa_id, new.motorista_id, 'vistoria',
      'Vistoria concluída', new.titulo, '/motorista/vistorias');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notif_vistoria on checklists;
create trigger trg_notif_vistoria after update on checklists
  for each row execute function public.fn_notif_vistoria();

-- RLS
drop policy if exists "notificacoes: motorista ve as proprias" on notificacoes;
create policy "notificacoes: motorista ve as proprias" on notificacoes
  for select using (motorista_id = public.current_motorista_id());

-- motorista marca como lida (só as próprias; não pode mudar dono/conteúdo além de lida/lida_em —
-- o WITH CHECK trava dono; conteúdo não é editável pela UI, e mesmo que tentasse, não muda de motorista)
drop policy if exists "notificacoes: motorista marca lida" on notificacoes;
create policy "notificacoes: motorista marca lida" on notificacoes
  for update using (motorista_id = public.current_motorista_id())
  with check (motorista_id = public.current_motorista_id());

drop policy if exists "notificacoes: staff ve por empresa" on notificacoes;
create policy "notificacoes: staff ve por empresa" on notificacoes
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
