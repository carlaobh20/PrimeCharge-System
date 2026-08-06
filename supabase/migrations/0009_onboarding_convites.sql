-- PrimeCharge OS — Missão "MVP Operacional" (2026-08-06), Fase 2: onboarding de usuário
-- Referência: DECISION_LOG.md (nova DEC registrada junto com esta migration).
--
-- Achado: `convites` existe desde a Fase 0 (0001) com uma única policy (SELECT por empresa) —
-- nunca teve INSERT, nunca teve consumidor de código, e `usuarios` nunca teve NENHUMA policy
-- de INSERT (RLS ligada, zero policy = ninguém insere via client). Ou seja: hoje não existe
-- absolutamente nenhum caminho pela aplicação para uma segunda pessoa de uma empresa real
-- ganhar acesso — cada `usuarios` novo só existe se alguém inserir manualmente via Supabase
-- Dashboard. Isso é um bloqueio real para "administrar 5, administrar 20" (a própria pergunta
-- que a missão pede para fazer), não um nice-to-have.
--
-- Desenho: convite por token (já existia), aceite via trigger em `auth.users` (não via
-- policy de INSERT em `usuarios` — abrir isso para o client seria reabrir a mesma classe de
-- auto-escalada que DEC-065 acabou de fechar, já que o próprio usuário poderia inserir a
-- própria linha com o role que quisesse). O trigger roda SECURITY DEFINER, então não depende
-- de nenhuma policy de INSERT em `usuarios` existir para o client.
--
-- Fora de escopo aqui, de propósito: criação de uma NOVA empresa do zero (auto-cadastro
-- público de empresa). O convite resolve "adicionar alguém a uma empresa que já existe" — a
-- primeira empresa e o primeiro admin continuam nascendo por inserção manual (Supabase
-- Dashboard/SQL), que é a fase real do produto hoje (poucas empresas, onboarding assistido).

-- ============================================================
-- 1. convites — INSERT (convidar) e DELETE (revogar um convite pendente) restritos a role
-- administrativa da própria empresa. `super_admin/owner/admin` — mesma alçada de quem hoje
-- pode excluir Veículo/Motorista/Contrato (pode_excluir_*), por ser também uma ação sensível
-- (decide quem entra na empresa e com qual role).
-- ============================================================

create or replace function public.eh_admin_da_empresa() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where u.id = auth.uid() and u.ativo = true and u.role in ('super_admin','owner','admin')
  );
$$;

drop policy if exists "convites: insert por admin da empresa" on convites;
create policy "convites: insert por admin da empresa" on convites
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_admin_da_empresa());

drop policy if exists "convites: delete por admin da empresa" on convites;
create policy "convites: delete por admin da empresa" on convites
  for delete using (empresa_id = public.current_empresa_id() and public.eh_admin_da_empresa());

-- ============================================================
-- 2. RPC de leitura pública de UM convite por token — não uma policy de SELECT liberada
-- (uma policy `using (aceito = false)` sem mais nada permitiria a qualquer visitante anônimo
-- listar TODOS os convites pendentes de TODAS as empresas via `select * from convites`, já
-- que RLS decide visibilidade linha a linha, não por filtro da query do cliente). A função
-- exige o token exato como argumento — só quem já recebeu o link do convite consegue algo de
-- volta, e só os três campos necessários para a tela de aceite, nunca o token nem outras
-- linhas.
-- ============================================================

create or replace function public.buscar_convite_por_token(p_token uuid)
returns table (email text, role user_role, empresa_nome text, valido boolean)
language sql stable
security definer
set search_path = public
as $$
  select c.email, c.role, e.nome as empresa_nome, (c.aceito = false and c.expira_em > now()) as valido
  from convites c
  join empresas e on e.id = c.empresa_id
  where c.token = p_token;
$$;

grant execute on function public.buscar_convite_por_token(uuid) to anon, authenticated;

-- ============================================================
-- 3. Aceite do convite — trigger em auth.users, não policy de INSERT em usuarios (ver nota
-- no cabeçalho). Roda depois que o Supabase Auth já criou a linha em auth.users (signUp do
-- client); casa por e-mail com um convite pendente e não expirado; se achar, cria a linha em
-- `usuarios` com o role/empresa do convite e marca o convite como aceito. Se não achar
-- nenhum convite válido, não faz nada — a conta em auth.users existe mas fica sem `usuarios`
-- correspondente, e todo o resto do sistema já trata isso como "sem empresa, sem acesso"
-- (current_empresa_id() retorna null) — mesmo comportamento seguro que já existia hoje para
-- qualquer linha órfã.
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
    insert into usuarios (id, empresa_id, nome_completo, email, role, ativo)
    values (
      new.id,
      v_convite.empresa_id,
      coalesce(new.raw_user_meta_data->>'nome_completo', split_part(new.email, '@', 1)),
      new.email,
      v_convite.role,
      true
    )
    on conflict (id) do nothing;

    update convites set aceito = true where id = v_convite.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.fn_aceitar_convite();
