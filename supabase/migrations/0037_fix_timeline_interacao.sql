-- PrimeCharge OS — fix(crm): corrigir timeline de interações
-- Referência: achado secundário da auditoria de segurança de 2026-08-13 (relatório
-- "Auditoria de Segurança da Fundação — App Motorista + Lojinha").
--
-- Bug identificado no ARQUIVO de migration 0027_epico6_interacoes_origem_lead.sql: a função
-- fn_timeline_interacao() ali definida insere em timeline_eventos usando a coluna `criado_por`
-- — essa coluna não existe em timeline_eventos (criada em 0002_capacidades_genericas.sql com a
-- coluna `usuario_id`, mesmo nome usado por TODAS as outras ~15 funções de timeline do
-- sistema). Se essa versão do arquivo 0027 fosse executada do zero (ex.: banco novo, clone de
-- teste), o INSERT em `interacoes` falharia sempre, pois o trigger AFTER INSERT desfaz a
-- transação inteira.
--
-- IMPORTANTE — divergência descoberta ao validar no Supabase real (2026-08-13): a função
-- REALMENTE em execução no projeto PrimeCharge real (ojvhiadjnxhhevoryjtu) já NÃO tem esse bug
-- — já usa `usuario_id` e, além disso, já é mais completa que o arquivo 0027 local (grava
-- também a coluna `metadata` com canal/conteúdo completo/interacao_id). Ou seja: em algum
-- momento a função foi corrigida/evoluída direto no banco real, fora do fluxo de migrations
-- deste repositório, e essa correção nunca foi capturada de volta no arquivo 0027. O arquivo
-- 0027 no repositório ficou desatualizado em relação à realidade.
--
-- Esta migration 0037 resolve os dois problemas ao mesmo tempo: corrige o arquivo 0027 (para
-- quem clonar o repo do zero) E replica exatamente a versão real e correta que já roda em
-- produção — usando create or replace function, então é seguro rodar em qualquer ambiente
-- (banco novo, clone de teste local, ou até re-rodar no banco real): sempre converge para o
-- mesmo resultado, sem regressão. Nenhuma coluna nova, nenhuma migration histórica alterada.

create or replace function fn_timeline_interacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canal_label text;
  v_descricao text;
begin
  v_canal_label := case new.canal
    when 'ligacao' then 'Ligação'
    when 'whatsapp' then 'WhatsApp'
    when 'presencial' then 'Presencial'
    when 'email' then 'E-mail'
    else 'Outro'
  end;

  v_descricao := 'Conversa registrada (' || v_canal_label || '): ' || new.conteudo;

  insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
  values (
    new.empresa_id,
    new.entidade_tipo,
    new.entidade_id,
    'interacao_registrada',
    v_descricao,
    jsonb_build_object('canal', new.canal, 'conteudo_completo', new.conteudo, 'interacao_id', new.id),
    new.usuario_id,
    new.ocorrida_em
  );

  return new;
end;
$$;
