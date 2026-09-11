-- Épico 6 — CRM, Fase 1.3: funil público de cadastro de lead.
--
-- Pedido do Carlos: quem clica em "Quero alugar" / "Quero meu Carro Elétrico" na landing
-- (visitante anônimo, sem login) preenche um cadastro detalhado + anexa documentos, e isso
-- precisa cair como um motorista novo no Kanban (etapa "Novo Lead"), sem passar por login.
--
-- ⚠️ NÃO aplicada em nenhum banco por mim. O Supabase MCP desta sessão aponta pra OUTRO
-- projeto (Viagem - EUA), não pro RodaVolt/PrimeCharge (ojvhiadjnxhhevoryjtu) — mesmo
-- problema já documentado no cabeçalho da migration 0041. Carlos precisa colar este arquivo
-- inteiro no SQL Editor do Supabase (dashboard do projeto) e rodar manualmente — mesmo
-- caminho já usado antes para 0049/0050.
--
-- Decisão de arquitetura (o problema real aqui): TODA a RLS de `motoristas`/`arquivos`/
-- storage hoje pressupõe um usuário autenticado (staff via `usuarios`, motorista via
-- `current_motorista_id()`). Um visitante público não tem nenhum dos dois. Abrir uma policy
-- de INSERT direta pra `anon` na tabela `motoristas` seria perigoso: a anon key é pública
-- (fica no bundle do site), então qualquer policy de INSERT vale pra qualquer um que abrir o
-- DevTools — inclusive pra sobrescrever campos sensíveis (status, empresa_id) se a policy não
-- travar isso explicitamente.
--
-- Solução: um único ponto de entrada controlado — função `criar_lead_publico` SECURITY
-- DEFINER (roda com privilégio elevado, ignora RLS por dentro, mas só aceita os campos que
-- ela mesma lê do jsonb e decide sozinha status/empresa/etapa/origem — o payload do cliente
-- nunca escreve esses campos diretamente). O visitante só ganha permissão de EXECUTAR essa
-- função, nunca INSERT direto na tabela. Reenvio do formulário com o mesmo CPF atualiza o
-- lead existente em vez de duplicar — mas só enquanto ele ainda estiver em status='lead'
-- (se already virou motorista em análise/ativo, o formulário público não sobrescreve nada:
-- alguém digitando um CPF de terceiro não consegue alterar o cadastro de um motorista real).
--
-- Documentos (CNH, comprovante de residência) continuam indo pro Storage normal
-- (`motoristas-documentos`, mesmo bucket de sempre) e pra tabela `arquivos` — como upload de
-- arquivo passa pela API de Storage do cliente (não dá pra empacotar numa function SQL), aqui
-- a policy de INSERT pra `anon` é escopada por uma função auxiliar (`fn_lead_publico_valido`)
-- que só deixa passar pastas de um motorista que: (a) existe, (b) está em status='lead' e
-- (c) foi criado/atualizado nas últimas 24h — uma janela curta o suficiente pra cobrir "acabei
-- de preencher o formulário e estou anexando os documentos agora", mas que fecha depois.
--
-- Risco que fica em aberto, documentado de propósito: não há CAPTCHA nem rate limit aqui.
-- Mitigação mínima incluída: honeypot é responsabilidade do FRONTEND (campo escondido que bot
-- preenche e humano não vê — ver CadastroLeadPage.tsx), e o upsert por CPF já impede que um
-- script naive gere uma linha nova por tentativa. Se o funil público sofrer spam de verdade,
-- o próximo passo é Cloudflare Turnstile na página antes de chamar a RPC — não implementado
-- nesta passada por ser fase piloto de baixíssimo tráfego.

-- ============================================================
-- 1. Helper: motorista_id é um lead válido, recente, desta empresa?
-- SECURITY DEFINER pra poder ler `motoristas` mesmo vindo de uma sessão anônima (RLS de
-- motoristas não tem — e não vai ganhar — policy de SELECT pra anon).
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
-- 2. RPC pública: cria (ou atualiza, se ainda for lead) o motorista a partir do formulário.
-- Único ponto de entrada de escrita em `motoristas` para o visitante anônimo.
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
  -- Empresa única (fase piloto, uma locadora só). Se um dia houver mais de uma empresa usando
  -- este funil público, isto precisa virar um parâmetro (ex.: subdomínio/slug na URL) — mas
  -- hoje pegar a primeira/única empresa cadastrada é a leitura correta do estado real do
  -- produto, não uma gambiarra: não existe ainda nenhum mecanismo de o visitante escolher
  -- "para qual empresa" ele está se candidatando.
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

  -- Primeira etapa ativa do grupo "lead" (ordem menor) — é aí que o Carlos pediu pra cair:
  -- "esse motorista vai cair dentro do sistema no lead lá no kanban". Se ele renomear/reordenar
  -- as etapas do funil, isto continua funcionando (olha o grupo, não o nome literal).
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

  -- Conflito existiu mas o WHERE acima não bateu (motorista com esse CPF já não é mais lead —
  -- virou em_analise/ativo/etc.): não sobrescreve NADA do cadastro real. Ainda assim devolve o
  -- id existente, pra o formulário mostrar a mesma tela de "recebemos seu cadastro" em vez de
  -- vazar "esse CPF já é motorista ativo" pra quem preencheu.
  if v_id is null then
    select id into v_id from motoristas where empresa_id = v_empresa_id and cpf = v_cpf;
  end if;

  -- Devolve empresa_id junto: o frontend precisa dele pra montar o path de upload dos
  -- documentos ({empresa_id}/{motorista_id}/...) — é exatamente o par que
  -- fn_lead_publico_valido confere antes de deixar o Storage aceitar o arquivo.
  return jsonb_build_object('id', v_id, 'empresa_id', v_empresa_id);
end;
$$;

revoke all on function public.criar_lead_publico(jsonb) from public;
grant execute on function public.criar_lead_publico(jsonb) to anon, authenticated;

-- ============================================================
-- 3. Storage — visitante anônimo sobe documento na pasta do lead recém-criado.
-- Mesmo bucket de sempre (motoristas-documentos), mesmo formato de path
-- ({empresa_id}/{motorista_id}/...) das policies de staff (0004) e motorista (0041) — só mais
-- uma policy de INSERT, escopada pelo helper acima.
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
-- 4. arquivos — metadado do documento enviado pelo lead público.
-- usuario_id fica NULL (não existe usuário autenticado); a policy exige isso explicitamente
-- pra não abrir brecha de alguém inserir metadado se fingindo de outro usuário.
-- ============================================================

drop policy if exists "arquivos: lead publico insere os proprios" on arquivos;
create policy "arquivos: lead publico insere os proprios" on arquivos
  for insert with check (
    arquivos.entidade_tipo = 'motorista'
    and arquivos.usuario_id is null
    and public.fn_lead_publico_valido(arquivos.empresa_id, arquivos.entidade_id)
  );
