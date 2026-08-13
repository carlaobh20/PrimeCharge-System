-- PrimeCharge OS — Auditoria de Segurança da Fundação (App Motorista + Lojinha), P0
-- Referência: missão de auditoria pedida pelo Carlos em 2026-08-13, ANTES de colocar o
-- primeiro motorista real no sistema. Objetivo: fechar TODOS os vazamentos de RLS pro role
-- 'motorista' (não só as 3 tabelas já corrigidas em 0035), e bloquear estoque negativo.
--
-- Achado (varredura completa de pg_policies, todas as tabelas do schema public): o padrão
-- "select por empresa" (using (empresa_id = current_empresa_id())), usado desde a Sprint 7
-- (antes de existir login de motorista), se repete em ~20 tabelas e NENHUMA delas excluía
-- role='motorista'. A 0035 já tinha corrigido motoristas/contratos/veiculos (as 3 que a 0034
-- prometia escopar); esta migration fecha o resto: usuarios, lancamentos, pagamentos,
-- contas_bancarias, checklists, checklist_itens, interacoes, sinistros, multas, arquivos,
-- comentarios, telemetria_eventos, timeline_eventos, funil_etapas, centros_custo,
-- centros_resultado, plano_contas, regras_classificacao, acoes_operacionais, metas, tags.
--
-- Confirmado empiricamente (Postgres local, 35+1 migrations aplicadas, 2 motoristas de teste
-- sem NENHUM vínculo de negócio um com o outro): antes desta migration, um motorista logado
-- lia TODAS as linhas dessas tabelas na empresa — incluindo conta bancária, lançamentos
-- financeiros, dados de outros motoristas (via `usuarios`), vistorias, sinistros, multas de
-- qualquer veículo. Depois desta migration, 0 linhas em cada uma dessas tabelas para o mesmo
-- teste (ver relatório da auditoria).
--
-- IMPORTANTE — usuarios é um caso especial: a policy antiga "ve colegas da empresa" também
-- cobria a leitura do PRÓPRIO registro do usuário logado (useCurrentUsuario(), usado por TODO
-- o app, inclusive pelas guards de rota RequireStaff/RequireMotorista). Restringir essa policy
-- a só staff, sem mais nada, quebraria o login de QUALQUER motorista (a própria sessão dele
-- deixaria de conseguir ler o próprio usuário). Por isso, além de restringir a policy antiga,
-- esta migration adiciona uma policy nova "usuarios: ve o proprio registro" — mesma ideia já
-- usada em contratos/motoristas/veiculos na 0034 (permissiva, aditiva, sem abrir nada além do
-- próprio id = auth.uid()).
--
-- Nenhum motorista real usa o sistema hoje (0034/0035 ainda não tinham sido aplicadas até este
-- momento) — corrigido antes de qualquer exposição real.

-- ============================================================
-- 1. RLS — fechar leitura "por empresa" pro role motorista, tabela por tabela.
-- Nenhuma destas tabelas tem hoje um consumidor real no App Motorista (nenhuma tela lê nada
-- disso como motorista) — fechar é segurança pura, sem risco de quebrar funcionalidade
-- existente. Quando uma fase futura precisar (ex.: motorista vendo a própria vistoria), a
-- policy adicional certa entra JUNTO com a tela, mesmo padrão já usado em contratos/veiculos.
-- ============================================================

drop policy if exists "acoes_operacionais: select por empresa" on acoes_operacionais;
create policy "acoes_operacionais: select por empresa" on acoes_operacionais
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "arquivos: select por empresa" on arquivos;
create policy "arquivos: select por empresa" on arquivos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "centros_custo: select por empresa" on centros_custo;
create policy "centros_custo: select por empresa" on centros_custo
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "centros_resultado_select" on centros_resultado;
create policy "centros_resultado_select" on centros_resultado
  for select using (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and public.eh_staff());

drop policy if exists "checklists: select por empresa" on checklists;
create policy "checklists: select por empresa" on checklists
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "checklist_itens: select via checklist" on checklist_itens;
create policy "checklist_itens: select via checklist" on checklist_itens
  for select using (exists (
    select 1 from checklists c where c.id = checklist_itens.checklist_id and c.empresa_id = public.current_empresa_id() and public.eh_staff()
  ));

drop policy if exists "comentarios: select por empresa" on comentarios;
create policy "comentarios: select por empresa" on comentarios
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "contas_bancarias: select por empresa" on contas_bancarias;
create policy "contas_bancarias: select por empresa" on contas_bancarias
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "funil_etapas: select por empresa" on funil_etapas;
create policy "funil_etapas: select por empresa" on funil_etapas
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "interacoes_select" on interacoes;
create policy "interacoes_select" on interacoes
  for select using (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and public.eh_staff());

drop policy if exists "lancamentos: select por empresa" on lancamentos;
create policy "lancamentos: select por empresa" on lancamentos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "manutencoes: select por empresa" on manutencoes;
create policy "manutencoes: select por empresa" on manutencoes
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "metas: select por empresa" on metas;
create policy "metas: select por empresa" on metas
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "multas: select por empresa" on multas;
create policy "multas: select por empresa" on multas
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "pagamentos: select por empresa" on pagamentos;
create policy "pagamentos: select por empresa" on pagamentos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "plano_contas_select" on plano_contas;
create policy "plano_contas_select" on plano_contas
  for select using (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and public.eh_staff());

drop policy if exists "regras_classificacao_select" on regras_classificacao;
create policy "regras_classificacao_select" on regras_classificacao
  for select using (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and public.eh_staff());

drop policy if exists "sinistros: select por empresa" on sinistros;
create policy "sinistros: select por empresa" on sinistros
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "tags: select por empresa" on tags;
create policy "tags: select por empresa" on tags
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "telemetria: select por empresa" on telemetria_eventos;
create policy "telemetria: select por empresa" on telemetria_eventos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "timeline: select por empresa" on timeline_eventos;
create policy "timeline: select por empresa" on timeline_eventos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

-- ============================================================
-- 2. usuarios — caso especial (ver cabeçalho). Restringe a policy de "colegas" a staff e
-- adiciona uma policy própria pro usuário ler o PRÓPRIO registro (qualquer role, inclusive
-- motorista) — sem isso o login de motorista quebra inteiro (useCurrentUsuario).
-- ============================================================

drop policy if exists "usuarios: ve colegas da empresa" on usuarios;
create policy "usuarios: ve colegas da empresa" on usuarios
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());

drop policy if exists "usuarios: ve o proprio registro" on usuarios;
create policy "usuarios: ve o proprio registro" on usuarios
  for select using (id = auth.uid());

-- ============================================================
-- 3. Estoque nunca negativo — trava a linha do produto (serializa movimentações concorrentes
-- do MESMO produto) e recusa qualquer INSERT que levaria o saldo (SUM já existente + a
-- movimentação nova) abaixo de zero. Roda pra QUALQUER tipo de movimentação, não só
-- 'saida_venda' — proteção do dado, não da regra de negócio específica de pedido.
--
-- Isto NÃO muda quando a baixa acontece (continua em 'aprovado', como já estava) — só impede
-- que a baixa aconteça se não houver saldo suficiente. Se uma aprovação for bloqueada por
-- isso, a transição de status inteira falha (mesma transação) e o pedido continua no status
-- anterior — comportamento correto: não existe "pedido aprovado sem estoque garantido".
-- ============================================================

create or replace function public.fn_valida_estoque_nao_negativo() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo_atual numeric;
begin
  perform 1 from produtos where id = new.produto_id for update;

  select coalesce(sum(quantidade), 0) into v_saldo_atual
  from movimentacoes_estoque
  where produto_id = new.produto_id;

  if (v_saldo_atual + new.quantidade) < 0 then
    raise exception 'Estoque insuficiente para o produto % — saldo atual %, movimento solicitado %',
      new.produto_id, v_saldo_atual, new.quantidade;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_movimentacoes_estoque_valida_saldo on movimentacoes_estoque;
create trigger trg_movimentacoes_estoque_valida_saldo before insert on movimentacoes_estoque
  for each row execute function public.fn_valida_estoque_nao_negativo();
