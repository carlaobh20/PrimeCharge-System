-- PrimeCharge OS — Fase 1 do App do Motorista: SEGURANÇA + LOGIN (2026-08-14)
-- Fecha os riscos R1/R2/R3 da auditoria Fase 0 (projeto Claude,
-- claude/auditoria-fase0-app-motorista-2026-08-14.md). Nenhuma tabela nova, nenhuma coluna
-- nova — só policies, triggers e funções. Compatível com dados existentes (nada é migrado,
-- só regras de acesso mudam).
--
-- ⚠️ Esta migration NÃO foi aplicada em produção nesta fase — validada apenas em Postgres
-- local (harness em supabase/tests/). Aplicar somente após revisão do Carlos.

-- ============================================================
-- 1. R1 — motorista não pode se re-vincular (auto-escalada horizontal)
--
-- Duas brechas fechadas juntas:
-- (a) A policy de UPDATE de usuarios (0001) tinha USING mas não WITH CHECK — a linha NOVA
--     nunca era validada. Combinada com o trigger abaixo (que checava `new.id = auth.uid()`),
--     um UPDATE que trocasse o próprio `id` escaparia das duas checagens ao mesmo tempo.
-- (b) fn_bloquear_autoescalada_usuario (0008) protegia role/empresa_id/ativo, mas
--     `motorista_id` nasceu 26 migrations depois (0034) e ninguém voltou aqui — um motorista
--     podia fazer `update usuarios set motorista_id = '<uuid alheio>'` e passar a enxergar
--     contrato/veículo/pedidos de outro motorista (inclusive de outra empresa) via
--     current_motorista_id().
--
-- O trigger passa a usar `old.id = auth.uid()` (a linha que o USING liberou), a bloquear
-- mudança do próprio `id`, e a cobrir `motorista_id`. Alterar vínculo de portal continua
-- possível apenas por quem NÃO é o próprio usuário — e como a única policy de UPDATE em
-- usuarios é "a própria linha", na prática só service_role/SQL administrativo (Supabase
-- Dashboard) muda vínculo. Nenhum fluxo de produto existente é afetado: não há hoje nenhuma
-- tela que edite motorista_id.
-- ============================================================

drop policy if exists "usuarios: edita o proprio registro" on usuarios;
create policy "usuarios: edita o proprio registro" on usuarios
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.fn_bloquear_autoescalada_usuario() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.id = auth.uid() and (
    new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.empresa_id is distinct from old.empresa_id
    or new.ativo is distinct from old.ativo
    or new.motorista_id is distinct from old.motorista_id
  ) then
    raise exception 'Não é permitido alterar identidade, role, empresa, ativação ou vínculo de motorista do próprio usuário.';
  end if;
  return new;
end;
$$;

-- (o trigger trg_usuarios_bloquear_autoescalada já existe desde 0008 e aponta pra esta
-- função — create or replace acima basta, não precisa recriar o trigger)

-- ============================================================
-- 2. eh_staff() passa a exigir ativo = true
--
-- Achado menor da auditoria: a definição de 0035 checava só `role <> 'motorista'` — um staff
-- DESATIVADO continuava "staff" para as ~24 policies que usam eh_staff(), e 4 delas
-- (centros_resultado, interacoes, plano_contas, regras_classificacao) não passam por
-- current_empresa_id() (que checa ativo), então um usuário desativado seguia lendo essas
-- tabelas. Mesmo padrão de current_empresa_id()/pode() (0008): desativado = sem acesso.
-- ============================================================

create or replace function public.eh_staff() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where u.id = auth.uid() and u.ativo = true and u.role <> 'motorista'
  );
$$;

-- ============================================================
-- 3. R2 — Storage: fim do "empresa inteira aberta pra qualquer autenticado da empresa"
--
-- As policies de SELECT/INSERT dos 6 buckets (0003/0004/0005/0006/0022) checavam apenas
-- `(storage.foldername(name))[1] = current_empresa_id()` — e o motorista TEM empresa_id.
-- Resultado: um motorista logado podia ler (e gravar!) CNH de todos os motoristas, contratos
-- assinados de terceiros e comprovantes financeiros da empresa; a única barreira era não
-- conhecer os paths (a 0036 fechou a TABELA arquivos, mas nunca tocou storage.objects).
--
-- Estrutura de path existente (auditada, NÃO inventada aqui):
--   ArquivosPanel:      {empresa_id}/{entidade_id}/{uuid}-{nome}       → [2] = id da entidade
--   checklists-fotos:   {empresa_id}/{checklist_id}/itens/{...}
--                       {empresa_id}/{checklist_id}/assinatura-*.png   → [2] = id do checklist
--
-- Regra conceitual desta fase:
--   staff (ativo)  → acesso administrativo (o mesmo de antes);
--   motorista      → SELECT apenas em objetos vinculados ao próprio contexto:
--                    - seus documentos ({motorista_id} na 2ª pasta de motoristas-documentos)
--                    - arquivos dos próprios contratos
--                    - fotos/documentos do veículo dos próprios contratos
--                    - fotos/assinatura das próprias vistorias (checklists com motorista_id dele)
--                    - financeiro-arquivos: NADA (documento administrativo)
--   motorista      → INSERT/DELETE: NADA nesta fase (upload do motorista chega com as fases
--                    de vistoria/chamados, com policy própria escrita junto — menor privilégio).
--
-- DELETE: os 5 buckets de 0011 já são staff-por-role/autoria (motorista não passa em
-- pode_excluir_storage_da_empresa e nunca é autor em `arquivos`) — ficam como estão.
-- checklists-fotos era a exceção ("delete por empresa", 0022) — alinhada aqui ao padrão 0011.
-- ============================================================

-- ---- motoristas-documentos ----
drop policy if exists "motoristas-documentos: select por empresa" on storage.objects;
drop policy if exists "motoristas-documentos: select staff ou proprio motorista" on storage.objects;
create policy "motoristas-documentos: select staff ou proprio motorista" on storage.objects
  for select using (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and (
      public.eh_staff()
      or (storage.foldername(name))[2] = public.current_motorista_id()::text
    )
  );

drop policy if exists "motoristas-documentos: insert por empresa" on storage.objects;
drop policy if exists "motoristas-documentos: insert por staff" on storage.objects;
create policy "motoristas-documentos: insert por staff" on storage.objects
  for insert with check (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

-- ---- contratos-arquivos ----
drop policy if exists "contratos-arquivos: select por empresa" on storage.objects;
drop policy if exists "contratos-arquivos: select staff ou proprio contrato" on storage.objects;
create policy "contratos-arquivos: select staff ou proprio contrato" on storage.objects
  for select using (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and (
      public.eh_staff()
      or exists (
        select 1 from contratos c
        where c.id::text = (storage.foldername(name))[2]
          and c.motorista_id = public.current_motorista_id()
      )
    )
  );

drop policy if exists "contratos-arquivos: insert por empresa" on storage.objects;
drop policy if exists "contratos-arquivos: insert por staff" on storage.objects;
create policy "contratos-arquivos: insert por staff" on storage.objects
  for insert with check (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

-- ---- veiculos-fotos ----
drop policy if exists "veiculos-fotos: select por empresa" on storage.objects;
drop policy if exists "veiculos-fotos: select staff ou veiculo dos proprios contratos" on storage.objects;
create policy "veiculos-fotos: select staff ou veiculo dos proprios contratos" on storage.objects
  for select using (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and (
      public.eh_staff()
      or exists (
        select 1 from contratos c
        where c.veiculo_id::text = (storage.foldername(name))[2]
          and c.motorista_id = public.current_motorista_id()
      )
    )
  );

drop policy if exists "veiculos-fotos: insert por empresa" on storage.objects;
drop policy if exists "veiculos-fotos: insert por staff" on storage.objects;
create policy "veiculos-fotos: insert por staff" on storage.objects
  for insert with check (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

-- ---- veiculos-documentos ----
drop policy if exists "veiculos-documentos: select por empresa" on storage.objects;
drop policy if exists "veiculos-documentos: select staff ou veiculo dos proprios contratos" on storage.objects;
create policy "veiculos-documentos: select staff ou veiculo dos proprios contratos" on storage.objects
  for select using (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and (
      public.eh_staff()
      or exists (
        select 1 from contratos c
        where c.veiculo_id::text = (storage.foldername(name))[2]
          and c.motorista_id = public.current_motorista_id()
      )
    )
  );

drop policy if exists "veiculos-documentos: insert por empresa" on storage.objects;
drop policy if exists "veiculos-documentos: insert por staff" on storage.objects;
create policy "veiculos-documentos: insert por staff" on storage.objects
  for insert with check (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

-- ---- financeiro-arquivos (administrativo: staff only, sem ramo de motorista) ----
drop policy if exists "financeiro-arquivos: select por empresa" on storage.objects;
drop policy if exists "financeiro-arquivos: select por staff" on storage.objects;
create policy "financeiro-arquivos: select por staff" on storage.objects
  for select using (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

drop policy if exists "financeiro-arquivos: insert por empresa" on storage.objects;
drop policy if exists "financeiro-arquivos: insert por staff" on storage.objects;
create policy "financeiro-arquivos: insert por staff" on storage.objects
  for insert with check (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

-- ---- checklists-fotos ----
drop policy if exists "checklists-fotos: select por empresa" on storage.objects;
drop policy if exists "checklists-fotos: select staff ou propria vistoria" on storage.objects;
create policy "checklists-fotos: select staff ou propria vistoria" on storage.objects
  for select using (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and (
      public.eh_staff()
      or exists (
        select 1 from checklists ck
        where ck.id::text = (storage.foldername(name))[2]
          and ck.motorista_id = public.current_motorista_id()
      )
    )
  );

drop policy if exists "checklists-fotos: insert por empresa" on storage.objects;
drop policy if exists "checklists-fotos: insert por staff" on storage.objects;
create policy "checklists-fotos: insert por staff" on storage.objects
  for insert with check (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.eh_staff()
  );

drop policy if exists "checklists-fotos: delete por empresa" on storage.objects;
drop policy if exists "checklists-fotos: delete restrito por autoria ou role" on storage.objects;
create policy "checklists-fotos: delete restrito por autoria ou role" on storage.objects
  for delete using (
    bucket_id = 'checklists-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
    and public.pode_excluir_storage_da_empresa(bucket_id, name)
  );

-- ============================================================
-- 4. R3 — aceite de convite passa a exigir o TOKEN, não só o e-mail
--
-- fn_aceitar_convite (0009, mantida na 0034) casava o convite pelo E-MAIL do novo
-- auth.users — o token da URL só era validado na tela (AceitarConvitePage). Quem soubesse o
-- e-mail de um motorista convidado podia chamar signUp direto na API e herdar
-- role/empresa/motorista_id sem nunca ter recebido o link.
--
-- Agora: o signUp envia o token em raw_user_meta_data.convite_token (mudança correspondente
-- em AceitarConvitePage.tsx, mesmo commit) e a função só vincula se TOKEN + E-MAIL casarem
-- com um convite pendente e não expirado. Sem token válido → conta em auth.users nasce órfã
-- (sem linha em usuarios = sem empresa, sem role, sem acesso — estado que o sistema inteiro
-- já trata como seguro desde 0009). Token expirado, já aceito ou de outro e-mail → mesmo
-- destino. Reuso: o primeiro aceite marca aceito = true, o que invalida o token pra sempre.
-- ============================================================

create or replace function public.fn_aceitar_convite() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite convites%rowtype;
  v_token uuid;
begin
  -- token vem do client no signUp; formato inválido = tratado como ausente, nunca erro
  -- (um signUp sem token não pode falhar — só nasce sem vínculo)
  begin
    v_token := nullif(new.raw_user_meta_data->>'convite_token', '')::uuid;
  exception when others then
    v_token := null;
  end;

  if v_token is null then
    return new;
  end if;

  select * into v_convite
  from convites
  where token = v_token
    and email = new.email
    and aceito = false
    and expira_em > now()
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
