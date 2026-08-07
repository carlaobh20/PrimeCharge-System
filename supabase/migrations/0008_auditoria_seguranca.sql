-- PrimeCharge OS — Auditoria de CTO (2026-08-06): fechamento de gaps de segurança/RBAC
-- Referência: DECISION_LOG.md DEC-064 a DEC-069 (decisões de desenho tomadas antes desta
-- migration; DEC-063/070/071 são decisões de escopo/produto da mesma auditoria, sem código
-- correspondente nesta migration).
--
-- Escopo desta migration: só gaps de autorização/isolamento — RLS, RBAC, cross-tenant,
-- auto-escalada. Nenhuma tabela nova, nenhuma feature nova. Todos os fechamentos abaixo
-- reaproveitam mecanismos que já existem no schema (pode(), current_empresa_id(), o padrão
-- de policy por role) — nenhum conceito novo é introduzido.
--
-- Ordem: (1) fechamentos de baixo nível que outros dependem (current_empresa_id/pode),
-- (2) usuarios (auto-escalada), (3) contratos (paridade com o fix já aplicado em
-- lancamentos/pagamentos/acoes_operacionais/checklists na Sprint 8/9), (4) veiculos/
-- motoristas (fecha DEC-026/DEC-035 de verdade), (5) capacidades genéricas (arquivos +
-- storage), (6) erros_sistema (injeção cross-tenant), (7) audit_log (leitura indevida).

-- ============================================================
-- 1. current_empresa_id() / pode() — usuário desativado (`ativo = false`) perde acesso
-- imediatamente, em vez de continuar contando como membro ativo da empresa até o token
-- expirar. `ativo` existe na tabela `usuarios` desde a Fase 0 mas nunca foi consultado por
-- nenhuma policy — coluna morta até hoje. `create or replace`: um único ponto de mudança
-- cascateia para toda RLS que já depende dessas duas funções, sem tocar cada policy.
-- ============================================================

create or replace function public.current_empresa_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid() and ativo = true;
$$;

create or replace function public.pode(p_modulo text, p_acao text) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.permitido
      from permissoes p
      join usuarios u on u.role = p.role
      where u.id = auth.uid()
        and u.ativo = true
        and p.modulo = p_modulo
        and p.acao = p_acao
    ),
    false
  );
$$;

-- ============================================================
-- 2. usuarios — bloqueio de auto-escalada. Hoje a única policy de UPDATE é
-- `using (id = auth.uid())`, sem WITH CHECK — qualquer usuário autenticado pode fazer
-- `update usuarios set role = 'super_admin' where id = auth.uid()` e a policy deixa passar
-- (o único requisito é editar a própria linha, o que continua verdadeiro depois da troca).
-- RLS por si só não resolve isso de forma declarativa (WITH CHECK não enxerga o valor
-- antigo da linha) — a correção é um trigger BEFORE UPDATE que compara OLD vs NEW.
-- Trade-off aceito e registrado no Decision Log: isso também fecha a única forma que
-- existia hoje de um admin promover/desativar um colega (a policy nunca permitiu editar a
-- linha de outra pessoa, então essa capacidade nunca existiu de fato) — não é uma regressão
-- desta migration, é a mesma lacuna funcional pré-existente, agora só explícita. Um fluxo de
-- administração de usuários é trabalho de produto futuro, fora do escopo de um patch de
-- segurança.
-- ============================================================

create or replace function public.fn_bloquear_autoescalada_usuario() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id = auth.uid() and (
    new.role is distinct from old.role
    or new.empresa_id is distinct from old.empresa_id
    or new.ativo is distinct from old.ativo
  ) then
    raise exception 'Não é permitido alterar role, empresa ou status de ativação do próprio usuário.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_usuarios_bloquear_autoescalada on usuarios;
create trigger trg_usuarios_bloquear_autoescalada before update on usuarios
  for each row execute function public.fn_bloquear_autoescalada_usuario();

-- `usuarios` nunca teve trigger de auditoria (todas as outras tabelas de negócio têm desde
-- que fn_audit_log() foi criada, 0002) — mudança de role/ativo de um usuário é exatamente o
-- tipo de evento que audit_log existe para capturar.
drop trigger if exists trg_usuarios_audit on usuarios;
create trigger trg_usuarios_audit after insert or update or delete on usuarios
  for each row execute function public.fn_audit_log();

-- ============================================================
-- 3. contratos — INSERT/UPDATE sem `pode()`. O módulo já tem `pode('contratos', acao)` e a
-- matriz de permissão inteira desde a Sprint 7 (0005), e fn_validar_transicao_contrato já
-- exige a permissão certa em toda TROCA DE STATUS — mas a policy base de UPDATE só checa
-- `empresa_id = current_empresa_id()`, então qualquer usuário da empresa (inclusive um
-- `motorista`, se algum dia tiver login) pode editar valor_periodico, datas, km, sem tocar o
-- status e sem passar pelo trigger. Mesmo gap que a pagamentos UPDATE tinha até a Sprint 8
-- (ver 0006) — fechado aqui com o mesmo padrão.
-- ============================================================

drop policy if exists "contratos: insert por empresa" on contratos;
create policy "contratos: insert por empresa" on contratos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('contratos', 'criar'));

drop policy if exists "contratos: update por empresa" on contratos;
create policy "contratos: update por empresa" on contratos
  for update using (empresa_id = public.current_empresa_id() and public.pode('contratos', 'editar'));

-- ============================================================
-- 4. Veículos e Motoristas — fecha DEC-026/DEC-035 de verdade (RBAC real, não só lista de
-- role fixa em pode_excluir_*). Os dois módulos nunca ganharam entrada na matriz
-- `permissoes` nem gate de `pode()` na policy de INSERT/UPDATE, mesmo com o mecanismo já
-- provado em Contratos/Financeiro/Operações desde a Sprint 7. Também nunca ganharam State
-- Machine validada no banco, mesmo com o desenho já especificado por escrito desde a
-- Fase 0 (Veículo: CORE_CONCEPTS.md seção 2, ampliado por VEHICLE_LIFECYCLE.md seção 4) ou
-- consolidado depois (Motorista: DRIVER_LIFECYCLE.md seção 4) — a tabela de transição usada
-- abaixo é uma tradução literal desses documentos, nenhuma regra nova foi inventada aqui.
-- ============================================================

-- 4.1 — Matriz de permissão do módulo "veiculos". Sem ação por transição específica (ao
-- contrário de Contrato) porque nenhum documento de fundação define alçada diferenciada por
-- transição de status de Veículo — só "ver/criar/editar" (a exclusão já tinha seu próprio
-- mecanismo, pode_excluir_veiculo, mantido como está).
insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'veiculos', acao, true
from (values ('super_admin'), ('owner'), ('admin')) as r(role)
cross join (values ('ver'), ('criar'), ('editar'), ('excluir')) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_frota', 'veiculos', 'ver', true),
  ('gestor_frota', 'veiculos', 'criar', true),
  ('gestor_frota', 'veiculos', 'editar', true),
  ('gestor_financeiro', 'veiculos', 'ver', true),
  ('operador', 'veiculos', 'ver', true),
  ('operador', 'veiculos', 'criar', true),
  ('operador', 'veiculos', 'editar', true)
on conflict (role, modulo, acao) do nothing;

drop policy if exists "veiculos: insert por empresa" on veiculos;
create policy "veiculos: insert por empresa" on veiculos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('veiculos', 'criar'));

drop policy if exists "veiculos: update por empresa" on veiculos;
create policy "veiculos: update por empresa" on veiculos
  for update using (empresa_id = public.current_empresa_id() and public.pode('veiculos', 'editar'));

-- 4.2 — pode_excluir_veiculo ganha o mesmo check de `ativo` das funções da seção 1 (mesma
-- lógica: usuário desativado não deveria conseguir excluir nada, mesmo se a role ainda
-- constar na lista).
create or replace function public.pode_excluir_veiculo(p_veiculo_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from veiculos v
    join usuarios u on u.id = auth.uid()
    where v.id = p_veiculo_id
      and v.empresa_id = u.empresa_id
      and u.ativo = true
      and u.role in ('super_admin','owner','admin')
  );
$$;

-- 4.3 — State Machine do Veículo validada no banco (tabela de transição de
-- VEHICLE_LIFECYCLE.md seção 4, que já supera/detalha o esboço original de
-- CORE_CONCEPTS.md seção 2). "venda"/"encerrado" descritos nos dois documentos como
-- "terminais" — na prática o próprio desenho registra `venda → encerrado` como a única
-- transição válida saindo de `venda`; só `encerrado` não tem nenhuma saída. Divergência de
-- redação entre os dois documentos registrada no Decision Log desta auditoria, não
-- resolvida aqui via código (é textual, não estrutural).
create or replace function public.fn_validar_transicao_veiculo() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida boolean;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_valida := case old.status
      when 'novo' then new.status in ('comprado')
      when 'comprado' then new.status in ('preparacao')
      when 'preparacao' then new.status in ('disponivel')
      when 'disponivel' then new.status in ('reservado','alugado','manutencao','venda')
      -- 'reservado' só sai para 'alugado' na tabela de gatilhos documentada (VEHICLE_LIFECYCLE.md
      -- seção 4). Não existe hoje, em nenhum documento de fundação, uma transição de volta pra
      -- 'disponivel' a partir de 'reservado' (ex.: reserva cancelada antes de virar contrato
      -- ativo) — gap real, registrado no Decision Log desta auditoria como pendência de
      -- fn_propagar_status_contrato, não inventado aqui como transição nova sem base documental.
      when 'reservado' then new.status in ('alugado')
      when 'alugado' then new.status in ('devolvido')
      when 'devolvido' then new.status in ('disponivel','manutencao')
      when 'manutencao' then new.status in ('disponivel')
      when 'venda' then new.status in ('encerrado')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status inválida: % → %', old.status, new.status;
    end if;

    if not public.pode('veiculos', 'editar') then
      raise exception 'Usuário sem permissão para alterar o status do veículo';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_veiculos_valida_transicao on veiculos;
create trigger trg_veiculos_valida_transicao before update on veiculos
  for each row execute function public.fn_validar_transicao_veiculo();

-- 4.4 — Matriz de permissão do módulo "motoristas". `bloquear`/`desbloquear` como ações
-- próprias porque DRIVER_LIFECYCLE.md seção 4 já as trata como transições sensíveis,
-- distintas de uma edição comum de cadastro — mesmo raciocínio que separa `cancelar` de
-- `editar` em Contratos.
insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'motoristas', acao, true
from (values ('super_admin'), ('owner'), ('admin')) as r(role)
cross join (values ('ver'), ('criar'), ('editar'), ('excluir'), ('bloquear'), ('desbloquear')) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_frota', 'motoristas', 'ver', true),
  ('gestor_frota', 'motoristas', 'criar', true),
  ('gestor_frota', 'motoristas', 'editar', true),
  ('gestor_frota', 'motoristas', 'bloquear', true),
  ('gestor_frota', 'motoristas', 'desbloquear', true),
  ('gestor_financeiro', 'motoristas', 'ver', true),
  ('operador', 'motoristas', 'ver', true),
  ('operador', 'motoristas', 'criar', true),
  ('operador', 'motoristas', 'editar', true)
on conflict (role, modulo, acao) do nothing;

drop policy if exists "motoristas: insert por empresa" on motoristas;
create policy "motoristas: insert por empresa" on motoristas
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('motoristas', 'criar'));

drop policy if exists "motoristas: update por empresa" on motoristas;
create policy "motoristas: update por empresa" on motoristas
  for update using (empresa_id = public.current_empresa_id() and public.pode('motoristas', 'editar'));

create or replace function public.pode_excluir_motorista(p_motorista_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from motoristas m
    join usuarios u on u.id = auth.uid()
    where m.id = p_motorista_id
      and m.empresa_id = u.empresa_id
      and u.ativo = true
      and u.role in ('super_admin','owner','admin')
  );
$$;

-- 4.5 — State Machine do Motorista validada no banco (tabela de transição de
-- DRIVER_LIFECYCLE.md seção 4 + nota da seção 6.2: `encerrado` é alcançável a partir de
-- qualquer um dos outros 5 estados). `lead → em_analise` e `em_analise → ativo` continuam
-- possíveis via UPDATE manual (a propagação automática por Contrato, DEC-037, roda como
-- SECURITY DEFINER e por isso não é bloqueada por este trigger, já que `pode()` consulta o
-- usuário da sessão, não o dono da função — a transição em si só precisa estar na lista
-- abaixo, o que já está).
create or replace function public.fn_validar_transicao_motorista() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida boolean;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_valida := case old.status
      when 'lead' then new.status in ('em_analise','encerrado')
      when 'em_analise' then new.status in ('ativo','encerrado')
      when 'ativo' then new.status in ('inativo','bloqueado','encerrado')
      when 'inativo' then new.status in ('ativo','encerrado')
      when 'bloqueado' then new.status in ('ativo','encerrado')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status inválida: % → %', old.status, new.status;
    end if;

    if old.status = 'ativo' and new.status = 'bloqueado' and not public.pode('motoristas', 'bloquear') then
      raise exception 'Usuário sem permissão para bloquear motorista';
    end if;

    if old.status = 'bloqueado' and new.status = 'ativo' and not public.pode('motoristas', 'desbloquear') then
      raise exception 'Usuário sem permissão para desbloquear motorista';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_motoristas_valida_transicao on motoristas;
create trigger trg_motoristas_valida_transicao before update on motoristas
  for each row execute function public.fn_validar_transicao_motorista();

-- ============================================================
-- 5. arquivos + storage.objects — DELETE liberado hoje pra qualquer usuário da empresa,
-- sem checar autoria nem role (`for delete using (empresa_id = current_empresa_id())`, sem
-- mais nada). Um operador podia apagar um documento que outra pessoa subiu, incluindo
-- comprovante financeiro ou documento de contrato. Fix preserva o modelo de "arquivo é
-- ativo compartilhado da empresa" (não vira autoria estrita, que quebraria admin limpando
-- upload de outro usuário) — só passa a exigir: o próprio autor do upload, OU uma role de
-- gestão. Mesmo critério aplicado nos 5 buckets de storage, já que `arquivos` (metadado) e
-- `storage.objects` (binário) são artefatos irmãos do mesmo upload e não faz sentido um
-- estar mais protegido que o outro.
-- ============================================================

create or replace function public.pode_excluir_arquivo(p_arquivo_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from arquivos a
    join usuarios u on u.id = auth.uid()
    where a.id = p_arquivo_id
      and a.empresa_id = u.empresa_id
      and u.ativo = true
      and (a.usuario_id = auth.uid() or u.role in ('super_admin','owner','admin','gestor_frota','gestor_financeiro'))
  );
$$;

drop policy if exists "arquivos: delete por empresa" on arquivos;
create policy "arquivos: delete restrito por autoria ou role" on arquivos
  for delete using (public.pode_excluir_arquivo(id));

create or replace function public.pode_excluir_storage_da_empresa() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where u.id = auth.uid()
      and u.ativo = true
      and u.role in ('super_admin','owner','admin','gestor_frota','gestor_financeiro')
  );
$$;

drop policy if exists "veiculos-fotos: delete por empresa" on storage.objects;
create policy "veiculos-fotos: delete restrito por role" on storage.objects
  for delete using (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa()
  );

drop policy if exists "veiculos-documentos: delete por empresa" on storage.objects;
create policy "veiculos-documentos: delete restrito por role" on storage.objects
  for delete using (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa()
  );

drop policy if exists "motoristas-documentos: delete por empresa" on storage.objects;
create policy "motoristas-documentos: delete restrito por role" on storage.objects
  for delete using (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa()
  );

drop policy if exists "contratos-arquivos: delete por empresa" on storage.objects;
create policy "contratos-arquivos: delete restrito por role" on storage.objects
  for delete using (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa()
  );

drop policy if exists "financeiro-arquivos: delete por empresa" on storage.objects;
create policy "financeiro-arquivos: delete restrito por role" on storage.objects
  for delete using (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa()
  );

-- ============================================================
-- 6. erros_sistema — injeção cross-tenant. O INSERT é liberado pra qualquer autenticado
-- de propósito (telemetria de erro, inclusive antes de resolver empresa — ex.: erro na tela
-- de login), mas a policy não limitava o `empresa_id` informado: um usuário da Empresa A
-- podia inserir uma linha com `empresa_id` da Empresa B. Fix: aceita nulo (caso sem empresa
-- resolvida ainda) ou o `empresa_id` do próprio usuário — nunca de outra empresa.
-- ============================================================

drop policy if exists "erros_sistema: insert autenticado" on erros_sistema;
create policy "erros_sistema: insert autenticado" on erros_sistema
  for insert with check (
    auth.role() = 'authenticated'
    and (empresa_id is null or empresa_id = public.current_empresa_id())
  );

-- ============================================================
-- 7. audit_log — leitura liberada hoje pra qualquer usuário da empresa (`empresa_id =
-- current_empresa_id()`, sem checar role), diferente de erros_sistema — que já é
-- admin-only desde que a tabela existe (0005). audit_log carrega `dados_antigos`/
-- `dados_novos` de TODA tabela de negócio (inclusive financeiro e usuarios, agora com
-- trigger próprio, seção 2 acima) — inconsistente deixar isso mais aberto que o log de
-- erro. Mesmo padrão de gate aplicado.
-- ============================================================

drop policy if exists "audit_log: visivel para a empresa" on audit_log;
create policy "audit_log: visivel para administradores da empresa" on audit_log
  for select using (
    empresa_id = public.current_empresa_id()
    and exists (
      select 1 from usuarios u
      where u.id = auth.uid() and u.ativo = true and u.role in ('super_admin','owner','admin')
    )
  );
