-- PrimeCharge OS — 0051 — FASE 20: Localização Operacional (Módulos 1-3)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local (supabase/tests/). Produção somente
-- com autorização explícita do Carlos (mesmo protocolo já usado em 0049/0050).
-- ============================================================================================
-- JUSTIFICATIVA (auditoria: claude/auditoria-fase20-localizacao-operacional.md):
-- - Diferente de 0047/0048/0049 (dado 100% pessoal do motorista, RLS "privacidade invertida"
--   sem via de escape para staff), localização OPERACIONAL tem uma contraparte de negócio real:
--   o contrato ativo entre motorista e empresa. Por isso esta tabela tem DUAS dimensões de RLS
--   (motorista dono + empresa do contrato), não uma só.
-- - `empresa_id`/`veiculo_id` NUNCA são aceitos do cliente: um trigger BEFORE INSERT
--   (fn_validar_localizacao_operacional) os deriva de `contratos`, consultado no próprio banco,
--   e rejeita a escrita se o contrato não existir, não pertencer ao motorista informado, não
--   estiver com status='ativo', ou se o motorista/usuário estiver desativado. Isso fecha a
--   única forma óbvia de uma empresa/motorista tentar gravar uma linha fora do próprio vínculo
--   real — mesmo que o gap pré-existente de `contratos` (nenhuma FK cross-checa
--   motorista.empresa_id = contrato.empresa_id = veiculo.empresa_id, ver auditoria seção 0) seja
--   explorado algum dia, esta tabela não herda esse erro por conta própria.
-- - Tabela INSERT-ONLY (sem UPDATE, sem policy de DELETE para ninguém — nem staff, nem
--   motorista): "última posição conhecida" é uma QUERY (`order by timestamp_localizacao desc
--   limit 1`), nunca uma segunda tabela mutável — evita duplicação e risco de dessincronia
--   (Módulo 2 da especificação). Índices cobrem essa consulta por motorista/veículo/empresa.
-- - Retenção: NÃO decidida aqui (Módulo 22 — "não inventar política jurídica"). Sem TTL
--   automático. [VALIDAR COM ADVOGADO] antes de qualquer expurgo.
-- - Nunca escreve em audit_log/timeline_eventos/notificações (mesmo cuidado do 0047/0049 —
--   localização é dado sensível, auditar vazaria a operação para quem só administra a empresa).
-- ============================================================================================

-- =========================== 1. TABELA (Módulo 1) ===========================================
create table if not exists motorista_localizacoes (
  id uuid primary key default gen_random_uuid(),

  -- Preenchido com o motorista autenticado por padrão — o cliente não PRECISA enviar, e mesmo
  -- que envie um valor diferente, o RLS (seção 3) e o trigger (seção 2) não deixam passar.
  motorista_id uuid not null default public.current_motorista_id() references motoristas(id) on delete cascade,

  -- veiculo_id/empresa_id são SEMPRE sobrescritos pelo trigger a partir do contrato — o valor
  -- que o cliente mandar (se mandar) é ignorado. NOT NULL é satisfeito porque o trigger roda
  -- BEFORE INSERT (a checagem de constraint acontece só depois que o trigger já preencheu).
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,

  latitude double precision not null,
  longitude double precision not null,
  -- Metros. Null quando a origem não informa (nunca inventado) — mesmo campo de PosicaoGPS (Fase 19).
  accuracy_m double precision,

  -- Epoch do momento em que o DISPOSITIVO capturou a posição (GeolocationPosition.timestamp),
  -- nunca o horário em que o servidor recebeu — mesma disciplina de PosicaoGPS.timestamp.
  timestamp_localizacao timestamptz not null,

  origem text not null default 'PWA_GPS' check (origem in ('PWA_GPS','TELEMETRIA','OBD','OUTRA')),

  -- Momento em que o SERVIDOR recebeu a escrita — sempre >= timestamp_localizacao na prática,
  -- mas guardado separado porque os dois significam coisas diferentes (rede pode atrasar).
  criado_em timestamptz not null default now(),

  constraint chk_localizacao_latitude check (latitude between -90 and 90),
  constraint chk_localizacao_longitude check (longitude between -180 and 180),
  constraint chk_localizacao_accuracy check (accuracy_m is null or accuracy_m >= 0),
  -- Tolerância de 5 minutos de clock skew entre dispositivo e servidor — rejeita timestamp
  -- absurdamente no futuro (relógio do aparelho errado ou payload malformado), nunca no passado
  -- (uma captura pode legitimamente chegar atrasada por rede).
  constraint chk_localizacao_timestamp_futuro check (timestamp_localizacao <= now() + interval '5 minutes')
);

comment on table motorista_localizacoes is
  'Fase 20 — localização operacional (insert-only). NÃO aplicada em produção sem autorização.';

-- Índices para "última posição conhecida" (Módulo 2) e leitura por empresa/motorista.
create index if not exists idx_motorista_localizacoes_motorista on motorista_localizacoes(motorista_id, timestamp_localizacao desc);
create index if not exists idx_motorista_localizacoes_veiculo on motorista_localizacoes(veiculo_id, timestamp_localizacao desc);
create index if not exists idx_motorista_localizacoes_empresa on motorista_localizacoes(empresa_id, timestamp_localizacao desc);
create index if not exists idx_motorista_localizacoes_contrato on motorista_localizacoes(contrato_id);

-- =========================== 2. VALIDAÇÃO DE VÍNCULO OPERACIONAL (Módulos 3/5/18/19/20) =====
-- Roda ANTES de qualquer INSERT. RLS (seção 3) só garante "motorista escreve em nome do próprio
-- motorista_id" — não garante que contrato/veículo informados são reais nem que o vínculo está
-- ativo. Este trigger é quem garante a RELAÇÃO empresa → contrato → motorista → veículo pedida
-- pelo Módulo 3, e quem aplica o Módulo 5 (contrato encerrado / motorista desativado).
create or replace function public.fn_validar_localizacao_operacional() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrato contratos%rowtype;
  v_motorista_status motorista_status;
  v_usuario_ativo boolean;
begin
  select * into v_contrato from contratos where id = new.contrato_id;
  if v_contrato.id is null then
    raise exception 'Contrato inexistente para localização operacional';
  end if;

  if v_contrato.motorista_id is distinct from new.motorista_id then
    raise exception 'Contrato não pertence ao motorista informado';
  end if;

  if v_contrato.status is distinct from 'ativo' then
    raise exception 'Contrato sem vínculo ativo — localização operacional não pode ser registrada';
  end if;

  select status into v_motorista_status from motoristas where id = new.motorista_id;
  if v_motorista_status is null or v_motorista_status in ('bloqueado','encerrado') then
    raise exception 'Motorista sem vínculo operacional ativo';
  end if;

  -- Módulo 20 (motorista desativado): current_motorista_id() (0045 já corrigiu isso — a versão
  -- de 0034 não checava usuarios.ativo, mas 0045 fez `create or replace` acrescentando `and
  -- ativo = true`) já garante que a RLS de INSERT sozinha bloqueia um motorista desativado (ver
  -- auditoria, seção 20 — correção registrada lá). A checagem abaixo é REDUNDANTE de propósito
  -- (defesa em profundidade, não depende de uma única camada continuar correta) e cobre uma
  -- coisa que a RLS sozinha não sabe: o STATUS do registro de negócio em `motoristas`.
  select ativo into v_usuario_ativo from usuarios where motorista_id = new.motorista_id;
  if v_usuario_ativo is not true then
    raise exception 'Conta do motorista desativada — localização operacional não pode ser registrada';
  end if;

  -- Deriva do contrato — nunca confia no que o cliente mandou (mesmo se mandou nada).
  new.veiculo_id := v_contrato.veiculo_id;
  new.empresa_id := v_contrato.empresa_id;

  return new;
end;
$$;

drop trigger if exists trg_motorista_localizacoes_valida on motorista_localizacoes;
create trigger trg_motorista_localizacoes_valida before insert on motorista_localizacoes
  for each row execute function public.fn_validar_localizacao_operacional();

-- =========================== 3. RLS (Módulo 3 — "o ponto mais importante da fase") ==========
-- Sem policy de UPDATE/DELETE para NINGUÉM (nem motorista, nem staff/empresa): tabela
-- insert-only de propósito (Módulo 2/5 — "não apagar histórico automaticamente").
--
-- ACHADO ao rodar a suíte 69 pela primeira vez (não previsto só lendo o schema — só apareceu
-- testando de verdade, exatamente o motivo de existir suíte de ataque): `current_empresa_id()`
-- (0001/0008) NÃO filtra por role — ela resolve para QUALQUER usuarios.empresa_id, inclusive de
-- um motorista (motorista também tem empresa_id preenchido, 0004). Uma policy
-- `empresa_id = current_empresa_id()` sozinha faria um motorista enxergar a localização de
-- TODOS os outros motoristas da mesma empresa via essa policy (policies SELECT permissivas se
-- combinam com OR) — vazando exatamente o isolamento motorista×motorista que o Módulo 3 pede.
-- Esta é a MESMA classe de bug que `0039_fase1_seguranca_portal_motorista.sql` já documentou e
-- corrigiu para `contratos`/`storage.objects` ("motorista TEM empresa_id... um motorista logado
-- podia ler CNH de todos os motoristas") — e a correção usada lá é a mesma daqui:
-- `eh_staff()` (0035/0039 — `role <> 'motorista' and ativo = true`), não só `current_empresa_id()`.
alter table motorista_localizacoes enable row level security;

drop policy if exists "motorista_localizacoes: motorista insere o proprio" on motorista_localizacoes;
create policy "motorista_localizacoes: motorista insere o proprio" on motorista_localizacoes
  for insert with check (motorista_id = public.current_motorista_id());

drop policy if exists "motorista_localizacoes: motorista ve o proprio" on motorista_localizacoes;
create policy "motorista_localizacoes: motorista ve o proprio" on motorista_localizacoes
  for select using (motorista_id = public.current_motorista_id());

drop policy if exists "motorista_localizacoes: empresa ve a propria frota" on motorista_localizacoes;
create policy "motorista_localizacoes: empresa ve a propria frota" on motorista_localizacoes
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

-- =========================== 4. Documentação de "última posição" (Módulo 2) =================
-- Sem view/tabela nova: a consulta canônica de "última posição conhecida por veículo" é
--   select distinct on (veiculo_id) *
--   from motorista_localizacoes
--   order by veiculo_id, timestamp_localizacao desc;
-- (o índice idx_motorista_localizacoes_veiculo cobre esse order by). Deliberadamente não
-- empacotada numa VIEW nesta migration: uma view sobre uma tabela com RLS teria que declarar
-- explicitamente `security_invoker` (Postgres 15+) para não arriscar avaliar RLS com o
-- privilégio do DONO da view em vez de quem está consultando — risco desnecessário para uma
-- query de 3 linhas que o código da aplicação já pode montar direto (ver
-- src/features/frota/api/localizacaoFrota.ts).
