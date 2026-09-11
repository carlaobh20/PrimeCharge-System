-- Épico 6 — CRM, Fase 1.3: funil público de cadastro de lead (versão com triagem completa).
--
-- Pedido do Carlos: quem clica em "Quero alugar" / "Quero meu Carro Elétrico" na landing
-- (visitante anônimo, sem login) preenche um cadastro DETALHADO — não só os campos básicos de
-- `motoristas`, mas uma ficha de triagem inteira (endereço completo, experiência como
-- motorista de app, referências, contato de emergência) — anexa documentos, e isso precisa
-- cair como um motorista novo no Kanban (etapa "Novo Lead"). Motivo dado por ele: "não podemos
-- errar na contratação" — quanto mais dado de qualidade chega já no primeiro contato, menos
-- risco de aprovar (ou perder tempo com) motorista errado.
--
-- ⚠️ Numeração: esta migration nasceu de uma tentativa anterior numerada erroneamente como
-- 0042 (colisão — 0042_juridico_centro_contratos.sql já existe no projeto real; meu clone
-- local estava desatualizado e não mostrava as migrations 0042-0052 já aplicadas). Se você já
-- rodou aquele SQL de 0042 que te passei antes, sem problema — os dois primeiros blocos aqui
-- (`fn_lead_publico_valido`, storage/arquivos) são exatamente os mesmos `create or replace` /
-- `drop policy if exists`, idempotentes, podem rodar de novo sem erro. Só APAGUE (ou ignore)
-- o arquivo `0042_epico6_lead_publico.sql` do seu projeto local — ele não deve existir, o
-- número certo é este (0053).
--
-- Decisão de arquitetura NOVA nesta versão: os campos extras de triagem (RG, estado civil,
-- endereço completo, experiência com apps, referências, contato de emergência...) NÃO entram
-- na tabela `motoristas` — ela já é usada por todo o resto do sistema (contratos, financeiro,
-- Kanban) e a maioria desses campos só faz sentido durante a AVALIAÇÃO do candidato, não depois
-- que ele já é motorista ativo. Viraram uma tabela nova, `motoristas_triagem`, 1:1 com
-- `motoristas` (mesma ideia de `interacoes`/`notificacoes`: tabela dedicada em vez de inchar a
-- tabela principal com colunas que só uma parte dos motoristas preenche).
--
-- Tudo o que já valia na versão anterior continua valendo: único ponto de escrita pro
-- visitante anônimo é a função `criar_lead_publico` (SECURITY DEFINER — o payload nunca
-- escreve status/empresa/etapa diretamente); reenvio do mesmo CPF atualiza em vez de duplicar,
-- mas só enquanto ainda for 'lead'; documentos continuam indo pro Storage normal, com a
-- policy de INSERT pra `anon` escopada por `fn_lead_publico_valido`.

-- ============================================================
-- 1. Helper: motorista_id é um lead válido, recente, desta empresa?
-- ============================================================

create or replace function public.fn_lead_publico_valido(p_empresa_id uuid, p_motorista_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from motoristas m
    where m.id = p_motorista_id
      and m.empresa_id = p_empresa_id
      and m.status = 'lead'
      and m.atualizado_em > now() - interval '24 hours'
  );
$$;

grant execute on function public.fn_lead_publico_valido(uuid, uuid) to anon, authenticated;

-- ============================================================
-- 2. motoristas_triagem — ficha de triagem do funil público, 1:1 com motoristas.
-- Só existe pra quem veio pelo funil público (staff que cadastra manualmente não preenche
-- isso — motoristaSchema/MotoristaForm não mexem nesta tabela).
-- ============================================================

create table if not exists motoristas_triagem (
  motorista_id uuid primary key references motoristas(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,

  rg text,
  estado_civil text,

  cep text,
  numero text,
  complemento text,
  bairro text,

  ja_dirige_app boolean,
  tempo_experiencia text,
  apps_utilizados text[] not null default '{}',
  km_semanal_estimado text,
  cnh_ear boolean,
  possui_veiculo_proprio boolean,
  disponibilidade_horas text,

  referencia_nome text,
  referencia_telefone text,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,

  quando_pretende_comecar text,
  melhor_horario_contato text,

  aceitou_politica_privacidade boolean not null default false,
  aceitou_politica_em timestamptz,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table motoristas_triagem is
  'Épico 6, Fase 1.3 — ficha de triagem preenchida pelo próprio candidato no funil público '
  '(/quero-alugar), separada de `motoristas` porque são campos que só existem durante a '
  'avaliação do candidato, preenchidos uma vez só, nunca pelo staff via MotoristaForm.';

create index if not exists idx_motoristas_triagem_empresa on motoristas_triagem(empresa_id);

drop trigger if exists trg_motoristas_triagem_atualizado_em on motoristas_triagem;
create trigger trg_motoristas_triagem_atualizado_em before update on motoristas_triagem
  for each row execute function public.fn_set_atualizado_em();

alter table motoristas_triagem enable row level security;

-- Staff vê/edita a triagem de motoristas da própria empresa (mesmo padrão de sempre). Nenhuma
-- policy de INSERT pra staff nem para anon aqui — a única escrita de INSERT é a da função
-- criar_lead_publico (SECURITY DEFINER, ignora RLS). Staff só edita depois de já existir.
drop policy if exists "motoristas_triagem: select por empresa" on motoristas_triagem;
create policy "motoristas_triagem: select por empresa" on motoristas_triagem
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "motoristas_triagem: update por empresa" on motoristas_triagem;
create policy "motoristas_triagem: update por empresa" on motoristas_triagem
  for update using (empresa_id = public.current_empresa_id());

-- ============================================================
-- 3. RPC pública: cria/atualiza motorista + triagem a partir do formulário completo.
-- Único ponto de entrada de escrita em `motoristas`/`motoristas_triagem` para o anônimo.
-- ============================================================

create or replace function public.criar_lead_publico(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_etapa_id uuid;
  v_cpf text;
  v_nome text;
  v_id uuid;
begin
  if not coalesce((p->>'aceitou_politica_privacidade')::boolean, false) then
    raise exception 'É necessário aceitar a Política de Privacidade para enviar o cadastro.';
  end if;

  -- Empresa única (fase piloto, uma locadora só) — mesma leitura de antes: não existe ainda
  -- mecanismo de o visitante escolher "para qual empresa" ele está se candidatando.
  select id into v_empresa_id from empresas order by criado_em asc limit 1;
  if v_empresa_id is null then
    raise exception 'Nenhuma empresa configurada.';
  end if;

  v_nome := trim(coalesce(p->>'nome_completo', ''));
  if v_nome = '' then
    raise exception 'Nome obrigatório.';
  end if;

  v_cpf := regexp_replace(coalesce(p->>'cpf', ''), '\D', '', 'g');
  if length(v_cpf) <> 11 then
    raise exception 'CPF inválido.';
  end if;

  select id into v_etapa_id from funil_etapas
    where empresa_id = v_empresa_id and grupo = 'lead' and ativa = true
    order by ordem asc
    limit 1;

  insert into motoristas (
    empresa_id, nome_completo, cpf, email, telefone, data_nascimento,
    cnh_numero, cnh_categoria, cnh_validade, endereco, cidade, estado,
    observacoes, status, origem_lead, origem_lead_detalhe, etapa_funil_id
  ) values (
    v_empresa_id,
    v_nome,
    v_cpf,
    nullif(trim(coalesce(p->>'email', '')), ''),
    nullif(trim(coalesce(p->>'telefone', '')), ''),
    nullif(p->>'data_nascimento', '')::date,
    nullif(trim(coalesce(p->>'cnh_numero', '')), ''),
    nullif(trim(coalesce(p->>'cnh_categoria', '')), ''),
    nullif(p->>'cnh_validade', '')::date,
    nullif(trim(coalesce(p->>'endereco', '')), ''),
    nullif(trim(coalesce(p->>'cidade', '')), ''),
    nullif(trim(coalesce(p->>'estado', '')), ''),
    nullif(trim(coalesce(p->>'observacoes', '')), ''),
    'lead',
    'outro',
    coalesce(nullif(trim(coalesce(p->>'origem_lead_detalhe', '')), ''), 'Site — formulário público (Quero alugar)'),
    v_etapa_id
  )
  on conflict (empresa_id, cpf) do update set
    nome_completo = excluded.nome_completo,
    email = coalesce(excluded.email, motoristas.email),
    telefone = coalesce(excluded.telefone, motoristas.telefone),
    data_nascimento = coalesce(excluded.data_nascimento, motoristas.data_nascimento),
    cnh_numero = coalesce(excluded.cnh_numero, motoristas.cnh_numero),
    cnh_categoria = coalesce(excluded.cnh_categoria, motoristas.cnh_categoria),
    cnh_validade = coalesce(excluded.cnh_validade, motoristas.cnh_validade),
    endereco = coalesce(excluded.endereco, motoristas.endereco),
    cidade = coalesce(excluded.cidade, motoristas.cidade),
    estado = coalesce(excluded.estado, motoristas.estado),
    observacoes = coalesce(excluded.observacoes, motoristas.observacoes)
  where motoristas.status = 'lead'
  returning id into v_id;

  if v_id is null then
    select id into v_id from motoristas where empresa_id = v_empresa_id and cpf = v_cpf;
  end if;

  -- Ficha de triagem — upsert por motorista_id (PK). Só grava/atualiza se o motorista acima
  -- realmente é (ou continua sendo) um lead desta empresa — reaproveita o mesmo helper do
  -- Storage pra não duplicar a regra "só mexe em quem ainda é lead".
  if public.fn_lead_publico_valido(v_empresa_id, v_id) then
    insert into motoristas_triagem (
      motorista_id, empresa_id, rg, estado_civil, cep, numero, complemento, bairro,
      ja_dirige_app, tempo_experiencia, apps_utilizados, km_semanal_estimado, cnh_ear,
      possui_veiculo_proprio, disponibilidade_horas, referencia_nome, referencia_telefone,
      contato_emergencia_nome, contato_emergencia_telefone, quando_pretende_comecar,
      melhor_horario_contato, aceitou_politica_privacidade, aceitou_politica_em
    ) values (
      v_id,
      v_empresa_id,
      nullif(trim(coalesce(p->>'rg', '')), ''),
      nullif(trim(coalesce(p->>'estado_civil', '')), ''),
      nullif(regexp_replace(coalesce(p->>'cep', ''), '\D', '', 'g'), ''),
      nullif(trim(coalesce(p->>'numero', '')), ''),
      nullif(trim(coalesce(p->>'complemento', '')), ''),
      nullif(trim(coalesce(p->>'bairro', '')), ''),
      (p->>'ja_dirige_app')::boolean,
      nullif(trim(coalesce(p->>'tempo_experiencia', '')), ''),
      coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p->'apps_utilizados', '[]'::jsonb))), '{}'),
      nullif(trim(coalesce(p->>'km_semanal_estimado', '')), ''),
      (p->>'cnh_ear')::boolean,
      (p->>'possui_veiculo_proprio')::boolean,
      nullif(trim(coalesce(p->>'disponibilidade_horas', '')), ''),
      nullif(trim(coalesce(p->>'referencia_nome', '')), ''),
      nullif(trim(coalesce(p->>'referencia_telefone', '')), ''),
      nullif(trim(coalesce(p->>'contato_emergencia_nome', '')), ''),
      nullif(trim(coalesce(p->>'contato_emergencia_telefone', '')), ''),
      nullif(trim(coalesce(p->>'quando_pretende_comecar', '')), ''),
      nullif(trim(coalesce(p->>'melhor_horario_contato', '')), ''),
      true,
      now()
    )
    on conflict (motorista_id) do update set
      rg = coalesce(excluded.rg, motoristas_triagem.rg),
      estado_civil = coalesce(excluded.estado_civil, motoristas_triagem.estado_civil),
      cep = coalesce(excluded.cep, motoristas_triagem.cep),
      numero = coalesce(excluded.numero, motoristas_triagem.numero),
      complemento = coalesce(excluded.complemento, motoristas_triagem.complemento),
      bairro = coalesce(excluded.bairro, motoristas_triagem.bairro),
      ja_dirige_app = coalesce(excluded.ja_dirige_app, motoristas_triagem.ja_dirige_app),
      tempo_experiencia = coalesce(excluded.tempo_experiencia, motoristas_triagem.tempo_experiencia),
      apps_utilizados = case when array_length(excluded.apps_utilizados, 1) > 0 then excluded.apps_utilizados else motoristas_triagem.apps_utilizados end,
      km_semanal_estimado = coalesce(excluded.km_semanal_estimado, motoristas_triagem.km_semanal_estimado),
      cnh_ear = coalesce(excluded.cnh_ear, motoristas_triagem.cnh_ear),
      possui_veiculo_proprio = coalesce(excluded.possui_veiculo_proprio, motoristas_triagem.possui_veiculo_proprio),
      disponibilidade_horas = coalesce(excluded.disponibilidade_horas, motoristas_triagem.disponibilidade_horas),
      referencia_nome = coalesce(excluded.referencia_nome, motoristas_triagem.referencia_nome),
      referencia_telefone = coalesce(excluded.referencia_telefone, motoristas_triagem.referencia_telefone),
      contato_emergencia_nome = coalesce(excluded.contato_emergencia_nome, motoristas_triagem.contato_emergencia_nome),
      contato_emergencia_telefone = coalesce(excluded.contato_emergencia_telefone, motoristas_triagem.contato_emergencia_telefone),
      quando_pretende_comecar = coalesce(excluded.quando_pretende_comecar, motoristas_triagem.quando_pretende_comecar),
      melhor_horario_contato = coalesce(excluded.melhor_horario_contato, motoristas_triagem.melhor_horario_contato),
      aceitou_politica_privacidade = true,
      aceitou_politica_em = now();
  end if;

  return jsonb_build_object('id', v_id, 'empresa_id', v_empresa_id);
end;
$$;

revoke all on function public.criar_lead_publico(jsonb) from public;
grant execute on function public.criar_lead_publico(jsonb) to anon, authenticated;

-- ============================================================
-- 4. Storage — visitante anônimo sobe documento na pasta do lead recém-criado.
-- ============================================================

drop policy if exists "motoristas-documentos: lead publico envia na propria pasta" on storage.objects;
create policy "motoristas-documentos: lead publico envia na propria pasta" on storage.objects
  for insert with check (
    bucket_id = 'motoristas-documentos'
    and public.fn_lead_publico_valido(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

-- ============================================================
-- 5. arquivos — metadado do documento enviado pelo lead público.
-- ============================================================

drop policy if exists "arquivos: lead publico insere os proprios" on arquivos;
create policy "arquivos: lead publico insere os proprios" on arquivos
  for insert with check (
    arquivos.entidade_tipo = 'motorista'
    and arquivos.usuario_id is null
    and public.fn_lead_publico_valido(arquivos.empresa_id, arquivos.entidade_id)
  );
