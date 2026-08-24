# Relatório — Fase 20: Localização Operacional + Presença + Centro de Inteligência da Frota

**Data:** 2026-08-21 · **Branch:** `dev`.
**Nuvem:** `245cf07` (1ª passada) + `94fe128` (2ª passada — implementação sobre a auditoria já
aprovada). **Dispositivo:** `73839aa` (1ª passada) + `bc271c7` (2ª passada) — diff idêntico
confirmado nos dois lados (24 arquivos, +685/-139 na 2ª passada).
**Sem push para `main`. Migrations 0051 e 0052 NÃO aplicadas em produção.**

Este relatório substitui o de mesma data anterior (estrutura de 25 pontos): a 2ª passada trouxe
mudança real o suficiente — não só documentação — para justificar reescrever, não só anexar.
Estrutura agora segue os 28 pontos do Módulo 39 da especificação recebida.

## 1. Auditoria

Não refeita — `claude/auditoria-fase20-localizacao-operacional.md` já aprovado antes desta
sessão, conforme instrução explícita de não repetir. Esta 2ª passada implementou exatamente o
que a especificação (39 módulos) descreveu em cima da auditoria já validada, sem reabrir as 20
perguntas originais.

## 2. Schema

Tabela `motorista_localizacoes` mantida sem alteração de forma na 2ª passada: `id`,
`motorista_id`, `veiculo_id`, `contrato_id`, `empresa_id`, `latitude`, `longitude`, `accuracy_m`,
`timestamp_localizacao`, `origem`, `criado_em` — sem heading/speed/altitude, sem tabela separada
de "posição atual", sem tabela separada de histórico (o insert-only já É o histórico). Único
schema novo desta passada é a **view derivada** (item 5).

## 3. Migration

Duas migrations locais, nenhuma em produção:
- `0051_frota_localizacao_operacional.sql` (1ª passada) — tabela, trigger, RLS, índices.
- `0052_frota_localizacao_view.sql` (2ª passada) — só a view `motorista_localizacoes_atual`,
  `security_invoker = true`, sem tocar a tabela base.

Validadas juntas no harness Postgres local (0001→0052, todas as suítes, 0 falhas).

## 4. Trigger

`BEFORE INSERT` (0051, não alterado nesta passada): localiza o contrato pelo `contrato_id`
recebido, exige `contrato.status = 'ativo'` e `contrato.motorista_id = current_motorista_id()`,
deriva `empresa_id`/`veiculo_id` do próprio contrato (nunca aceita o que o cliente envia),
rejeita qualquer inconsistência. Reconfirmado nesta passada com um teste novo na suíte 69: enviar
`veiculo_id`/`empresa_id` manualmente com valores de OUTRA empresa é ignorado — o trigger
sobrescreve com o valor derivado, não com o valor recebido.

## 5. RLS

Sem mudança de policy nesta passada (mantidas as 3 de 0051: 1 INSERT motorista, 1 SELECT
motorista dono, 1 SELECT staff com `empresa_id = current_empresa_id() AND eh_staff()`). O que
mudou foi a **cobertura de teste**: a 2ª passada fechou lacunas que a 1ª havia deixado sem caso
explícito — staff sem empresa (0 linhas), staff inativo (0 linhas), motorista desativado (0
linhas) — três cenários agora com asserção SQL própria, não apenas inferidos da regra geral.

## 6. API

Reauditadas antes de criar qualquer coisa nova (Regra Absoluta): `localizacaoFrota.ts` já
existia da 1ª passada — não duplicada. Duas mudanças reais:
- `listLocalizacoesRecentes()` passou a consultar a view (`motorista_localizacoes_atual`) em vez
  de trazer até 500 linhas cruas e deduplicar em JS — corrige um bug de correção real (item 11).
- Novo `getHistoricoLocalizacoes(veiculoId)` — consulta separada, sob demanda, limite de 200
  linhas por veículo, nunca chamada na carga inicial da tela.

Total de `supabase.from(` no arquivo: 5 (veículos, contratos, motoristas, view de última posição,
histórico sob demanda) — nenhuma query duplicada, nenhum `select('*')`.

## 7. Captura

Sem alteração nesta passada — `useLocalizacaoOperacional` (1ª passada) continua sendo o único
ponto de captura, reusando 100% `localizacao.ts`/`useGeolocalizacaoMotorista`/
`useHeartbeatVisibilidade` da Fase 19. Zero segundo sistema de GPS criado ou cogitado.

## 8. Persistência

Sem alteração na gravação (`gravarLocalizacaoOperacional`, insert-only, nunca envia
`motorista_id`/`veiculo_id`/`empresa_id`). O que mudou é como a "última posição" é lida — ver
item 5/11: antes era JS sobre até 500 linhas cruas, agora é a view `DISTINCT ON` no banco.

## 9. Presença

Sem alteração — `presencaMotorista()`/`JANELAS_PRESENCA_PADRAO` (Fase 19) continuam sendo a
única fonte, sem segundo motor de presença criado.

## 10. Polling

Sem alteração — `refetchInterval: 30s` só com o Centro de Inteligência montado e a aba visível,
sem Supabase Realtime, sem WebSocket customizado. Confirmado de novo pelo script de auditoria
(categoria J) que nada disso foi introduzido nesta passada.

## 11. Mapa

Sem alteração de biblioteca (Leaflet, já lazy desde a 1ª passada, confirmado de novo isolado no
próprio chunk pós-build). Mudança real: os marcadores agora refletem a última posição correta por
veículo vinda da view, não do cálculo em JS que tinha o bug de possível ocultação (item 11 do
critério final).

## 12. Lista

Sem alteração estrutural — lista lateral sincronizada bidirecionalmente com o mapa, filtro de
status (só aparece com mais de um status distinto), decisão deliberada de **não** adicionar
dropdown de filtro por veículo/motorista nesta passada: a busca por texto já cobre esse caso e um
segundo controle redundante não foi visto como necessário — decisão registrada, não omissão.

## 13. Histórico

Mudança real desta passada. Antes: `inteligenciaFrotaHistorica()` existia mas sem consumidor de
dado real de posição. Agora: botão "Ver histórico" por veículo no painel de detalhe, abre sob
demanda (`useQuery` com `enabled: aberto`), tabela com Quando/Latitude/Longitude/Precisão, nunca
carregado na tela inicial. Isso é sobre HISTÓRICO DE POSIÇÃO — segue sem relação com histórico de
corridas/ganhos (item 14).

## 14. Inteligência

`inteligenciaFrotaHistorica()`/`oportunidadeOperacional()` (Fase 19) continuam sem dado real por
trás — staff ainda não lê `motorista_corridas`/`motorista_ganhos`, mesma limitação de RLS
documentada desde a Fase 16. A mudança real desta passada não é técnica, é de honestidade de UI:
antes a seção simplesmente não aparecia; agora existe um bloco explícito "NÃO DISPONÍVEL" citando
a razão (falta de fonte real), com o texto revisado para "Nenhuma indicação de demanda em tempo
real é mostrada sem fonte real" — sem a frase "demanda atual" nem no texto nem no código, depois
de um bug de regex ter pego a própria negação e um bug de conteúdo real ter sido corrigido (ver
seção de erros do CLAUDE.md).

## 15. Motorista

Sem alteração — card "Localização Operacional" no Centro de Controle mantido
(Compartilhada/Permissão negada/Indisponível/Sem dado), texto de reciprocidade "Quem pode ver
minha localização?" mantido restrito a você + empresa do contrato ativo.

## 16. Privacidade

Sem alteração de política — tabela `motorista_localizacoes` segue nunca escrevendo em
`audit_log`/`timeline_eventos`/notificações, nunca copiada para `veiculos`/checklists/telemetria/
manutenções/lançamentos/pagamentos. Reconfirmado pela categoria H do script de auditoria (6
checks, incluindo o que pegou a própria frase negando isso dentro de um comentário — corrigido).

## 17. Testes

`supabase/tests/69_frota_localizacao.sql` ganhou 2 grupos novos nesta passada (Grupo 11: staff
sem empresa, staff inativo, motorista desativado, DELETE bloqueado, envio manual de
veiculo_id/empresa_id ignorado, cascata de contrato testada de verdade, cascata de motorista
documentada via `pg_constraint` — estruturalmente correta mas operacionalmente inalcançável dado
que `contratos.motorista_id` é `on delete restrict`; Grupo 12: existência da view, correção do
`DISTINCT ON`, paridade de RLS pela view). Total: 58 linhas PASS (era ~40).

## 18. SQL real

Postgres 16.13 local recriado do zero, 0001→0052 aplicadas em ordem, todas as suítes existentes +
a 69 atualizada — **0 falhas**. Não confiado só em TypeScript, como determinado pelo Módulo 30.

## 19. Regressão

Todas as suítes de auditoria TypeScript pré-existentes (Fases 6 a 19) reexecutadas nesta passada,
não assumidas como "deveriam continuar verdes" — números reais conferidos um a um, incluindo dois
scripts (`audit-juridico-*`/`audit-amortizacao-extra`) cujo formato de resumo ("0 FALHOU"/"0
falharam") inicialmente pareceu suspeito numa varredura automática simples e foi verificado
manualmente como passagem limpa de verdade (exit 0, zero falhas reais).

## 20. tsc

`npx tsc -b --noEmit` — limpo, exit 0, depois de todas as mudanças desta passada.

## 21. lint

`npx oxlint` — mesmos warnings pré-existentes de fases anteriores, nenhum novo introduzido pela
2ª passada, confirmado por grep que nenhum cai nos arquivos tocados nesta rodada.

## 22. build

`npm run build` — sucesso, exigiu um rebuild completo (`rm -rf dist && npx vite build`) depois da
correção de texto do item 14, porque o script de auditoria valida a frase também contra o bundle
final, não só contra o código-fonte.

## 23. Performance

Sem regressão — a mudança de "500 linhas cruas + dedup em JS" para "view com `DISTINCT ON`" é uma
melhora de performance além de correção: o banco faz o trabalho de agrupamento, o cliente recebe
só 1 linha por veículo já pronta, em vez de até 500 linhas para processar no navegador.

## 24. Arquivos

24 arquivos no commit da 2ª passada: 1 migration nova (0052), 1 arquivo movido
(`schemaGuard.ts` de `motorista-app/api/` para `shared/lib/`), 5 arquivos com import atualizado
para o novo caminho compartilhado, 2 arquivos de produto editados (`localizacaoFrota.ts`,
`CentroInteligenciaFrota.tsx`), 1 suíte SQL, 1 script de auditoria da fase reescrito, 10 scripts
de auditoria antigos corrigidos por staleness de teto de migration (mesmo padrão da 1ª passada,
2ª ocorrência), 3 docs + `CLAUDE.md` atualizados.

## 25. Commit

Nuvem: `94fe128`, branch `dev`. Dispositivo: `bc271c7`, mesmo diff — `git diff --stat` conferido
nos dois lados (24 arquivos, +685/-139, idêntico). Nenhum push para `main` em nenhum momento desta
sessão.

## 26. Bundle

Sem mudança de composição — Leaflet segue isolado no próprio chunk, ausente do app do motorista,
reconfirmado após o rebuild do item 22.

## 27. Limitações

- Migrations 0051 e 0052 são só locais — produção não tem `motorista_localizacoes` nem a view até
  autorização explícita.
- Histórico/oportunidade agregada de corridas/ganhos (Módulos 13/14 desta passada) continuam sem
  dado real por trás — a limitação de RLS de `motorista_corridas`/`motorista_ganhos` para staff
  não foi alterada nesta fase, e não deveria ser sem uma decisão sua explícita e separada.
- Retenção de `motorista_localizacoes`: ainda não decidida, precisa validação jurídica — não
  mudou desde a 1ª passada.
- PWA continua sem captura confiável em segundo plano; nenhum teste em device iOS real foi feito
  nesta sessão.
- O padrão de "teto de migration hardcoded" nos 10 scripts de auditoria antigos se repetiu pela
  2ª vez nesta sessão (era 0051, virou 0051+0052) — é a 6ª ocorrência desse padrão no histórico
  do projeto. Vale considerar um helper único no futuro em vez de 10 asserções duplicadas — não
  bloqueante, mas registrado para não ficar implícito.

## 28. Próximos passos

1. Decidir se e quando autorizar a aplicação de 0051+0052 em produção.
2. Decisão jurídica pendente sobre retenção de `motorista_localizacoes`.
3. Se/quando decidir dar a staff acesso a histórico/oportunidade real de corridas — decisão de
   RLS sobre `motorista_corridas`/`motorista_ganhos`, não implícita em nenhuma fase até aqui.
4. Validação em device iOS real antes de qualquer expectativa de produto sobre captura em campo.
5. Considerar consolidar o helper de "teto de migration" usado em 10 scripts de auditoria, para
   não repetir o mesmo conserto manual na próxima migration nova.

---

## Critério final — 20 capacidades, verificadas uma a uma

1. **GPS real capturado** — [Certo] reuso total da Fase 19, testado nos 4 estados possíveis, zero
   segundo sistema de GPS criado.
2. **Localização real persistida** — [Certo] `motorista_localizacoes`, insert-only, validada no
   harness local com 0001→0052.
3. **Vinculada ao motorista** — [Certo] `motorista_id` default `current_motorista_id()`, RLS e
   trigger reforçam.
4. **Vinculada ao veículo** — [Certo] `veiculo_id` sempre derivado do contrato pelo trigger, nunca
   aceito do cliente (testado explicitamente nesta passada: envio manual é ignorado).
5. **Vinculada ao contrato** — [Certo] `contrato_id` validado como existente/ativo/pertencente ao
   motorista autenticado no próprio INSERT.
6. **Vinculada à empresa** — [Certo] `empresa_id` sempre derivado do contrato pelo trigger, mesmo
   teste de envio manual ignorado desta passada.
7. **RLS impede vazamento entre empresas** — [Certo] testado (Empresa A não vê Empresa B, suíte
   69, mantido desde a 1ª passada).
8. **RLS impede vazamento entre motoristas** — [Certo] testado (Motorista A não vê Motorista B na
   mesma empresa — o próprio bug que a 1ª passada encontrou e corrigiu).
9. **Staff sem empresa e staff inativo veem zero dado** — [Certo] lacuna fechada nesta passada:
   antes inferido da regra geral, agora com asserção SQL própria para os dois casos.
10. **Mapa mostra veículos reais** — [Certo] Leaflet, marcadores vindos de dado real, zero mock,
    lazy e isolado do bundle do motorista.
11. **Última posição funciona corretamente mesmo com atividade desigual entre veículos** —
    [Certo] esta é a correção central da 2ª passada: a versão anterior (JS sobre até 500 linhas
    cruas) podia esconder a posição de um veículo pouco ativo atrás de rajadas de outro veículo
    muito ativo; a view `DISTINCT ON` com `security_invoker=true` resolve isso corretamente no
    banco, testada na suíte 69 (Grupo 12).
12. **Posição antiga é identificada** — [Certo] thresholds ATUAL (≤2min) / RECENTE (≤15min) / SEM
    ATUALIZAÇÃO (>15min), posição antiga continua visível mas marcada, nunca escondida.
13. **Presença funciona** — [Certo] via `presencaMotorista()`, sem segundo motor de presença.
14. **Histórico sob demanda funciona** — [Certo] mudança real desta passada: botão "Ver
    histórico" por veículo, consulta separada e limitada, nunca carregada na tela inicial.
15. **Centro de Inteligência funciona de ponta a ponta** — [Certo] cards, lista, mapa e painel de
    detalhe sincronizados, dado real em todos os pontos, sem mock em nenhum estado testado.
16. **Motorista vê o estado real da própria localização** — [Certo] card no Centro de Controle
    com os 4 estados factuais, texto de reciprocidade restrito a você + empresa do contrato ativo.
17. **schemaGuard protege ambientes sem a migration** — [Certo] mudança real desta passada: o
    padrão foi movido para `shared/lib/` justamente para ser reusado pelas duas apps (motorista e
    frota) em vez de reimplementado; código não crasha se 0051/0052 estiverem ausentes.
18. **Histórico e demanda mantidos honestamente separados** — [Certo] mudança real desta passada:
    em vez de a seção de inteligência histórica simplesmente não aparecer, agora existe um bloco
    "NÃO DISPONÍVEL" explícito citando a razão, sem a frase "demanda atual" nem em código nem na
    UI renderizada.
19. **Uber e 99 não integrados** — [Certo] nenhuma integração funcional, confirmado de novo pela
    categoria K do script de auditoria; comparação de mercado documentada continua sendo só
    referência histórica, não código.
20. **Nenhum dado inventado em nenhum estado testado** — [Certo] SEM DADO = SEM DADO em todas as
    18 categorias de teste (GPS, mapa, inteligência, RLS) — inclusive o caso "cascata de
    motorista": em vez de forçar um cenário artificial que o schema não permite (porque
    `contratos.motorista_id` é `on delete restrict`), foi documentado estruturalmente via
    `pg_constraint`, não fabricado.

**20 de 20 plenamente entregues, com o mesmo limite explícito de fases anteriores**: histórico
agregado de corridas/ganhos para staff segue dependendo de uma decisão de RLS que nenhuma fase
deve tomar sozinha — registrada como pendência, não escondida.

SEM DADO = SEM DADO. Nenhuma posição foi inventada em nenhum estado testado, em nenhuma das duas
passadas.
