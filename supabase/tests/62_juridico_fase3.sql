-- Fase Jurídica 3 — ciclo de vida (0044): rescisão + checklist obrigatório, revisão jurídica,
-- política, seguro, versionamento de template na republicação, concorrência, idempotência,
-- imutabilidade re-testada e isolamento A/B das tabelas novas.
-- Roda DEPOIS de 61. Estado herdado no contrato A (c2222222): v1 substituida, v2 vigente,
-- v3 cancelada; contrato B (c3333333) com v1 (7e1...99) aguardando_assinatura congelada.
\set ON_ERROR_STOP on

-- =========================================================================
-- GRUPO K — Versionamento do template na republicação (regras 26/27)
-- =========================================================================
-- o template do seed nasceu 'publicado' direto (publicado_em null). 1ª transição rascunho->
-- publicado NÃO incrementa (primeira publicação); a 2ª SIM (republicação = versão nova).
update contrato_templates set status='rascunho' where id='7e000000-0000-0000-0000-000000000001';
update contrato_templates set status='publicado' where id='7e000000-0000-0000-0000-000000000001';
select _assert(
  (select versao_template=1 and publicado_em is not null from contrato_templates where id='7e000000-0000-0000-0000-000000000001'),
  'JUR3 Template: primeira publicação mantém v1 e carimba publicado_em');
update contrato_templates set status='rascunho', corpo=corpo||' (ajuste)' where id='7e000000-0000-0000-0000-000000000001';
update contrato_templates set status='publicado' where id='7e000000-0000-0000-0000-000000000001';
select _assert(
  (select versao_template=2 from contrato_templates where id='7e000000-0000-0000-0000-000000000001'),
  'JUR3 Template: REpublicação incrementa a versão (v2)');
-- contratos antigos não mudam: corpo da v2 do contrato A permanece o congelado
select _assert(
  (select corpo='Corpo da v2.' from contrato_versoes where id='7e100000-0000-0000-0000-000000000002'),
  'JUR3 Template: republicar NÃO altera retroativamente o corpo congelado dos contratos');

-- =========================================================================
-- GRUPO L — Revisão jurídica (regra 25)
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111'); -- staff
insert into contrato_revisoes_juridicas (empresa_id, template_id, versao_template, responsavel_id, responsavel_nome, status, observacoes)
values ('a0000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', 2,
        '11111111-1111-1111-1111-111111111111', 'Dra. Advogada Teste', 'aprovado_com_ressalvas', 'Rever cláusula de foro.');
reset role;
select _assert(
  (select count(*) from contrato_revisoes_juridicas where template_id='7e000000-0000-0000-0000-000000000001' and versao_template=2
     and status='aprovado_com_ressalvas' and responsavel_nome='Dra. Advogada Teste') = 1,
  'JUR3 Revisão: staff registra revisão jurídica com responsável e ressalva');
-- motorista não vê nem cria revisão
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from contrato_revisoes_juridicas) = 0, 'JUR3 Revisão: motorista NÃO vê revisões jurídicas');
select _bloqueia(
  $q$insert into contrato_revisoes_juridicas (empresa_id, template_id, versao_template, status)
     values ('a0000000-0000-0000-0000-000000000001','7e000000-0000-0000-0000-000000000001',2,'aprovado')$q$,
  'JUR3 Revisão: motorista NÃO registra revisão (RLS)');
reset role;

-- =========================================================================
-- GRUPO M — Política + parâmetros + seguro (staff-only)
-- =========================================================================
set role authenticated;
select _login('11111111-1111-1111-1111-111111111111');
insert into contrato_politicas (id, empresa_id, nome, template_id, status, campos_obrigatorios, anexos_obrigatorios, regras)
values ('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Motorista app — semanal',
        '7e000000-0000-0000-0000-000000000001', 'ativa', '["veiculo.seguro"]'::jsonb, '["apolice_seguro"]'::jsonb,
        '{"assinatura_prazo_dias":7}'::jsonb);
insert into juridico_parametros (empresa_id, chave, valor, atualizado_por)
values ('a0000000-0000-0000-0000-000000000001', 'assinatura_prazo_dias', '{"dias":7}'::jsonb, '11111111-1111-1111-1111-111111111111')
on conflict (empresa_id, chave) do update set valor = excluded.valor;
insert into contrato_seguros (id, empresa_id, contrato_id, seguradora, apolice, vigencia_inicio, vigencia_fim, franquia_valor, coberturas)
values ('91000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c2222222-0000-0000-0000-000000000000',
        'Seguradora X', 'AP-123', current_date, current_date + 365, 5000, '{"terceiros":true,"roubo_furto":true,"colisao":null}'::jsonb);
reset role;
select _assert((select count(*) from contrato_politicas where id='90000000-0000-0000-0000-000000000001') = 1, 'JUR3 Política: staff cria política parametrizada');
select _assert((select valor->>'dias' from juridico_parametros where chave='assinatura_prazo_dias' and empresa_id='a0000000-0000-0000-0000-000000000001')='7',
  'JUR3 Parâmetros: upsert de assinatura_prazo_dias grava');
select _assert((select coberturas->>'colisao' is null from contrato_seguros where id='91000000-0000-0000-0000-000000000001'),
  'JUR3 Seguro: cobertura não informada permanece NULL (nunca vira cobertura presumida)');

set role authenticated;
select _login('22222222-2222-2222-2222-222222222222'); -- motorista A
select _assert((select count(*) from contrato_politicas) = 0, 'JUR3 RLS: motorista não vê políticas');
select _assert((select count(*) from juridico_parametros) = 0, 'JUR3 RLS: motorista não vê parâmetros jurídicos');
select _assert((select count(*) from contrato_seguros) = 0, 'JUR3 RLS: motorista não vê seguros (nem do próprio contrato — dado interno)');
reset role;
set role authenticated;
select _login('55555555-5555-5555-5555-555555555555'); -- staff INATIVO
select _assert((select count(*) from contrato_politicas) = 0, 'JUR3 RLS: staff inativo não vê políticas');
select _assert((select count(*) from contrato_rescisoes) = 0, 'JUR3 RLS: staff inativo não vê rescisões');
reset role;

-- =========================================================================
-- GRUPO N — Rescisão: workflow completo + checklist obrigatório (regras 16/17)
-- =========================================================================
insert into contrato_rescisoes (id, empresa_id, contrato_id, motivo, solicitante, checklist, valores)
values ('92000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c2222222-0000-0000-0000-000000000000',
        'Encerramento por acordo', 'acordo', '{}'::jsonb, '{}'::jsonb);
-- pulo inválido
select _bloqueia(
  $q$update contrato_rescisoes set status='encerrada' where id='92000000-0000-0000-0000-000000000001'$q$,
  'JUR3 Rescisão: pulo solicitada -> encerrada é bloqueado');
update contrato_rescisoes set status='em_analise' where id='92000000-0000-0000-0000-000000000001';
update contrato_rescisoes set status='aprovada' where id='92000000-0000-0000-0000-000000000001';
update contrato_rescisoes set status='agendada', data_agendada=current_date+7 where id='92000000-0000-0000-0000-000000000001';
update contrato_rescisoes set status='devolucao_pendente' where id='92000000-0000-0000-0000-000000000001';
update contrato_rescisoes set status='devolvido' where id='92000000-0000-0000-0000-000000000001';
-- encerrar SEM o checklist obrigatório -> bloqueia
select _bloqueia(
  $q$update contrato_rescisoes set status='encerrada' where id='92000000-0000-0000-0000-000000000001'$q$,
  'JUR3 Rescisão: encerramento SEM checklist obrigatório é bloqueado pelo banco');
-- completa o núcleo obrigatório + valores registrados -> encerra
update contrato_rescisoes set
  checklist='{"veiculo_devolvido":true,"vistoria_final":true,"pagamentos_verificados":true,"caucao_apurada":true}'::jsonb,
  valores='{"saldo_devedor":0,"multas":150,"caucao":3000,"valor_final":-2850}'::jsonb
  where id='92000000-0000-0000-0000-000000000001';
update contrato_rescisoes set status='encerrada' where id='92000000-0000-0000-0000-000000000001';
select _assert(
  (select status='encerrada' and encerrada_em is not null from contrato_rescisoes where id='92000000-0000-0000-0000-000000000001'),
  'JUR3 Rescisão: com checklist completo, encerra e carimba encerrada_em');
select _assert(
  (select count(*) from timeline_eventos where entidade_tipo='contrato' and entidade_id='c2222222-0000-0000-0000-000000000000'
     and tipo='contrato_rescisao') >= 6,
  'JUR3 Rescisão: cada passo do workflow virou evento na timeline do contrato');
select _assert(
  (select count(*) from contratos where id='c2222222-0000-0000-0000-000000000000') = 1,
  'JUR3 Rescisão: o contrato NÃO foi apagado');
-- terminal: encerrada não anda mais
select _bloqueia(
  $q$update contrato_rescisoes set status='solicitada' where id='92000000-0000-0000-0000-000000000001'$q$,
  'JUR3 Rescisão: encerrada é terminal');

-- só UMA rescisão ativa por contrato (unique parcial); depois de encerrada, pode abrir outra
insert into contrato_rescisoes (id, empresa_id, contrato_id, motivo, solicitante)
values ('92000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c2222222-0000-0000-0000-000000000000',
        'Segunda solicitação', 'empresa');
select _bloqueia(
  $q$insert into contrato_rescisoes (empresa_id, contrato_id, motivo, solicitante)
     values ('a0000000-0000-0000-0000-000000000001','c2222222-0000-0000-0000-000000000000','Terceira em paralelo','empresa')$q$,
  'JUR3 Rescisão: segunda rescisão ATIVA no mesmo contrato é bloqueada (unique parcial)');
update contrato_rescisoes set status='cancelada' where id='92000000-0000-0000-0000-000000000002';
select _assert((select count(*) from contrato_rescisoes where contrato_id='c2222222-0000-0000-0000-000000000000') = 2,
  'JUR3 Rescisão: histórico preservado (encerrada + cancelada)');

-- motorista NÃO vê rescisões (dado interno)
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
select _assert((select count(*) from contrato_rescisoes) = 0, 'JUR3 RLS: motorista não vê rescisões nem do próprio contrato');
reset role;

-- =========================================================================
-- GRUPO O — Concorrência + idempotência (regras 33/34) + imutabilidade (regra 32)
-- =========================================================================
-- "dois usuários aprovam ao mesmo tempo": o 2º update chega com aprovada->aprovada = no-op
-- seguro (não duplica efeito, não corrompe estado). v99 do contrato B está aguardando_assinatura.
update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-000000000099';
select _assert(
  (select status='aguardando_assinatura' and congelada from contrato_versoes where id='7e100000-0000-0000-0000-000000000099'),
  'JUR3 Concorrência: repetir a mesma transição é no-op seguro (estado consistente, segue congelada)');

-- idempotência de eventos: no-op NÃO duplica timeline nem notificação
do $$
declare v_timeline_antes int; v_notif_antes int; v_timeline_depois int; v_notif_depois int;
begin
  select count(*) into v_timeline_antes from timeline_eventos where tipo='contrato_versao';
  select count(*) into v_notif_antes from notificacoes where tipo='contrato';
  update contrato_versoes set status='aguardando_assinatura' where id='7e100000-0000-0000-0000-000000000099';
  update contrato_versoes set status='vigente' where id='7e100000-0000-0000-0000-000000000002';
  select count(*) into v_timeline_depois from timeline_eventos where tipo='contrato_versao';
  select count(*) into v_notif_depois from notificacoes where tipo='contrato';
  if v_timeline_depois <> v_timeline_antes then
    raise exception 'FALHOU: no-op de status gerou evento de timeline duplicado';
  end if;
  if v_notif_depois <> v_notif_antes then
    raise exception 'FALHOU: no-op de status gerou notificação duplicada';
  end if;
  raise notice 'PASS: JUR3 Idempotência: repetir status (versão/vigente) não duplica timeline nem notificação';
end $$;

-- dupla criação da mesma versão (dois usuários) — unique(contrato_id, numero) barra o 2º
select _bloqueia(
  $q$insert into contrato_versoes (empresa_id, contrato_id, numero, status, corpo)
     values ('a0000000-0000-0000-0000-000000000001','c3333333-0000-0000-0000-000000000000',1,'rascunho','corrida')$q$,
  'JUR3 Concorrência: dois usuários criando a MESMA versão — o segundo é barrado (unique)');

-- imutabilidade re-testada na v99 congelada (regra 32)
select _bloqueia(
  $q$update contrato_versoes set corpo='hack' where id='7e100000-0000-0000-0000-000000000099'$q$,
  'JUR3 Imutável: corpo congelado segue imutável');
select _bloqueia(
  $q$update contrato_versoes set snapshot='{}'::jsonb where id='7e100000-0000-0000-0000-000000000099'$q$,
  'JUR3 Imutável: snapshot congelado segue imutável');
select _bloqueia(
  $q$update contrato_versoes set hash_sha256='x' where id='7e100000-0000-0000-0000-000000000099'$q$,
  'JUR3 Imutável: hash congelado segue imutável');
select _bloqueia(
  $q$update contrato_versoes set numero=77 where id='7e100000-0000-0000-0000-000000000099'$q$,
  'JUR3 Imutável: numero congelado segue imutável');
select _bloqueia(
  $q$update contrato_versoes set template_id='7e000000-0000-0000-0000-000000000001' where id='7e100000-0000-0000-0000-000000000099'$q$,
  'JUR3 Imutável: template_id congelado segue imutável');

-- =========================================================================
-- GRUPO P — Expiração de assinatura (regra 12) + isolamento
-- =========================================================================
update contrato_assinaturas set expira_em = now() + interval '7 days' where id='7e200000-0000-0000-0000-000000000099';
select _assert((select expira_em is not null from contrato_assinaturas where id='7e200000-0000-0000-0000-000000000099'),
  'JUR3 Expiração: expira_em gravado na assinatura enviada');
-- motorista A não altera expira_em da assinatura de B (0 linhas)
set role authenticated;
select _login('22222222-2222-2222-2222-222222222222');
update contrato_assinaturas set expira_em = null where id='7e200000-0000-0000-0000-000000000099';
reset role;
select _assert((select expira_em is not null from contrato_assinaturas where id='7e200000-0000-0000-0000-000000000099'),
  'JUR3 Expiração: motorista A NÃO altera o prazo da assinatura de B');

do $$ begin raise notice '==== FASE JURÍDICA 3: TODOS OS TESTES PASSARAM ===='; end $$;
