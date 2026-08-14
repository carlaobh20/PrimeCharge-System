-- PrimeCharge OS — Épico 11: App do Motorista, Fase 1 (fundação de acesso)
-- Referência: DEC-087 ("Driver App Foundation", 2026-08-06) previu explicitamente este
-- momento e adiou de propósito, condicionando a retomada a "a Fase do Driver App virar uma
-- missão de construção real, não mais de fundação" — é o que esta migration faz.
--
-- Decisão de arquitetura (conversa com Carlos, 2026-08-13): motorista ganha login PRÓPRIO
-- (Supabase Auth, e-mail+senha — mesmo mecanismo já usado pelo staff, sem token de app
-- separado, fechando o ponto que DEC-087 deixou em aberto), reaproveitando o MESMO fluxo de
-- convite/aceite já existente (0009_onboarding_convites.sql) em vez de construir um sistema de
-- provisionamento novo — só estende `convites`/`usuarios` com o vínculo a um registro de
-- `motoristas`.
--
-- Escopo desta fase: só a FUNDAÇÃO (vínculo usuário↔motorista + RLS "motorista vê só o
-- próprio registro/contrato/veículo"). Pagamentos, vistorias e o painel de custos do
-- motorista ficam para fases seguintes (registrado na conversa com o Carlos) — não criar RLS
-- nem tela para eles ainda (Regra dos 3 / DEC-021: não construir para um caso que ainda não
-- tem consumidor real).

-- ============================================================
-- 1. usuarios: vínculo opcional a um registro de motoristas
-- Nullable porque só é preenchido quando role = 'motorista' — um usuário de staff nunca tem
-- motorista_id. Unique: um motorista só pode ter UMA conta de portal (evita duas contas
-- concorrentes apontando pro mesmo registro de negócio).
-- ============================================================

alter table usuarios add column if not exists motorista_id uuid references motoristas(id) on delete set null;

do $$ begin
  alter table usuarios add constraint uq_usuarios_motorista_id unique (motorista_id);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_usuarios_motorista on usuarios(motorista_id) where motorista_id is not null;

-- ============================================================
-- 2. current_motorista_id() — mesmo padrão de current_empresa_id() (0001). Retorna null pra
-- qualquer usuário que não seja role='motorista' (staff nunca "empurra" as policies abaixo).
-- ============================================================

create or replace function public.current_motorista_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select motorista_id from usuarios where id = auth.uid() and role = 'motorista';
$$;

-- ============================================================
-- 3. RLS — "motorista vê só o próprio registro/contrato/veículo". Policies SELECT adicionais
-- (permissivas): Postgres combina múltiplas policies SELECT com OR, então isso só ADICIONA
-- visibilidade pro role motorista — não estreita em nada o que empresa_id = current_empresa_id()
-- já garante para o staff.
-- ============================================================

drop policy if exists "motoristas: motorista ve o proprio registro" on motoristas;
create policy "motoristas: motorista ve o proprio registro" on motoristas
  for select using (id = public.current_motorista_id());

drop policy if exists "contratos: motorista ve os proprios" on contratos;
create policy "contratos: motorista ve os proprios" on contratos
  for select using (motorista_id = public.current_motorista_id());

drop policy if exists "veiculos: motorista ve veiculo dos proprios contratos" on veiculos;
create policy "veiculos: motorista ve veiculo dos proprios contratos" on veiculos
  for select using (
    exists (
      select 1 from contratos c
      where c.veiculo_id = veiculos.id
        and c.motorista_id = public.current_motorista_id()
    )
  );

-- ============================================================
-- 4. convites: vínculo opcional a um motorista (convite gerado a partir do Cockpit do
-- Motorista, não do fluxo genérico "Convidar pessoa" de Usuários — esse continua só pra staff).
-- ============================================================

alter table convites add column if not exists motorista_id uuid references motoristas(id) on delete cascade;

-- Reforça, no próprio INSERT, que o motorista_id (quando presente) pertence à MESMA empresa do
-- convite — sem isso, um INSERT malformado poderia criar um convite de role='motorista' cujo
-- motorista_id aponta pra outra empresa; fn_aceitar_convite (abaixo) confiaria nisso ao criar a
-- linha em usuarios, causando um vínculo cross-empresa.
drop policy if exists "convites: insert por admin da empresa" on convites;
create policy "convites: insert por admin da empresa" on convites
  for insert with check (
    empresa_id = public.current_empresa_id()
    and public.eh_admin_da_empresa()
    and (
      motorista_id is null
      or exists (select 1 from motoristas m where m.id = motorista_id and m.empresa_id = convites.empresa_id)
    )
  );

-- ============================================================
-- 5. fn_aceitar_convite: propaga motorista_id pra usuarios quando o convite tiver um.
-- ============================================================

create or replace function public.fn_aceitar_convite() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite convites%rowtype;
begin
  select * into v_convite
  from convites
  where email = new.email
    and aceito = false
    and expira_em > now()
  order by criado_em desc
  limit 1;

  if v_convite.id is not null then
    insert into usuarios (id, empresa_id, nome_completo, email, role, ativo, motorista_id)
    values (
      new.id,
      v_convite.empresa_id,
      coalesce(new.raw_user_meta_data->>'nome_completo', split_part(new.email, '@', 1)),
      new.email,
      v_convite.role,
      true,
      v_convite.motorista_id
    )
    on conflict (id) do nothing;

    update convites set aceito = true where id = v_convite.id;
  end if;

  return new;
end;
$$;
