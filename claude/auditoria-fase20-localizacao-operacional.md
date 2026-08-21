# Auditoria — Fase 20: Localização Operacional + Presença + Centro de Inteligência da Frota

> Regra 0 da especificação: nenhuma linha de implementação antes desta auditoria. Lida
> integralmente: Fase 19 (`claude/auditoria-fase19-inteligencia-frota.md`, `claude/relatorio-motorista-fase19-inteligencia-frota-2026-08-21.md`), `docs/frota/LOCALIZACAO-OPERACIONAL.md`,
> `docs/frota/INTELIGENCIA-FROTA.md`, `docs/frota/CENTRO-INTELIGENCIA-FROTA.md`, migrations
> 0001–0050, RLS de `contratos`/`motoristas`/`veiculos`/`empresas`/`usuarios`,
> `motorista_ganhos`/`motorista_recargas`/`motorista_corridas` (0047/0048/0049),
> `CentroControlePage.tsx`, `useMinhaMeta.ts`, `meuContrato.ts`, `schemaGuard.ts`,
> `localizacao.ts`, `useGeolocalizacaoMotorista.ts`, `useHeartbeatVisibilidade.ts`,
> `presenca.ts`, `geo.ts`, `inteligenciaFrota.ts`, `FrotaPage.tsx`, `veiculos.ts` (api),
> `router.tsx`, `package.json`.

## 0. Veredito resumido

[Certo] Diferente da Fase 19, aqui a auditoria NÃO encontra um bloqueio estrutural de RLS —
encontra o CAMINHO REAL para resolver o bloqueio que a Fase 19 flagou. `motoristas.empresa_id`,
`contratos.empresa_id` e `veiculos.empresa_id` já existem, diretos, desde a Fase 0/Sprint
1/6/7. `current_empresa_id()` e `current_motorista_id()` já existem (0001, 0034) e já são
`security definer` — a fundação de multi-tenant que faltava para "corrida"/"ganho" (dado 100%
pessoal, sem contraparte de negócio) já EXISTE para "localização operacional" (dado que tem
uma contraparte real: o contrato ativo entre motorista e empresa). Por isso a tabela nova desta
fase pode ter uma segunda dimensão de RLS (empresa, via contrato) sem repetir o erro dos
Módulos 47-49 (privacidade invertida sem via de escape) nem inventar uma exceção ad-hoc.

[Certo] Zero uso de Supabase Realtime em todo o repositório (grep completo, 0 ocorrências de
`.channel(`/`postgres_changes`/`realtime`). Este ambiente não tem acesso ao projeto Supabase
real do PrimeCharge via MCP (a única credencial Supabase conectada aqui aponta para um projeto
não relacionado, "Viagem - EUA") — não há como confirmar se a publicação `supabase_realtime`
está habilitada para qualquer tabela em produção. Decisão: "tempo quase real" nesta fase é
**polling via TanStack Query** (`refetchInterval`, intervalo conservador), não Realtime — é a
única opção que dá para provar que funciona sem acesso ao ambiente real.

[Certo] Nenhuma biblioteca de mapa no `package.json` (mesmo achado da Fase 19, reconfirmado).

[Certo] Não existe hoje nenhum vínculo estrutural que force `contratos.motorista_id`/
`contratos.veiculo_id` a pertencerem à mesma `empresa_id` do próprio contrato — é um gap
pré-existente (nenhuma FK/trigger cross-checa isso), não introduzido por esta fase. O desenho
de RLS abaixo (seção 8) evita herdar esse gap: a tabela nova nunca confia num `empresa_id`
enviado pelo cliente — um trigger `BEFORE INSERT` deriva `empresa_id`/`veiculo_id` do
`contrato_id` no próprio banco, então mesmo que o gap pré-existente seja explorado em
`contratos` algum dia, a tabela de localização não herda esse erro por conta própria.

## 1. Relação exata motorista → contrato → veículo → empresa (pergunta 1)

```
auth.users(id)
  └─ usuarios(id = auth.uid(), role, motorista_id?, empresa_id, ativo)   -- 0001 + 0034
       ├─ role='motorista' → motorista_id → motoristas(id, empresa_id)  -- 0034 (vínculo 1:1, unique)
       └─ role∈staff       → empresa_id  → empresas(id)                -- 0001

motoristas(id, empresa_id) ────────────┐
veiculos(id, empresa_id) ──────────────┼── contratos(id, empresa_id, motorista_id, veiculo_id, status)
empresas(id) ◄──────────────────────────┘
```

Evidência: `0004_modulo_motoristas.sql:31` (`motoristas.empresa_id not null references
empresas`), `0003_modulo_veiculos.sql:109` (idem para `veiculos`), `0005_modulo_contratos.sql:36-40`
(`contratos.empresa_id`/`veiculo_id`/`motorista_id`, todos `not null`), `0034_epico11...sql:26-47`
(`usuarios.motorista_id` + `current_motorista_id()`), `0001_fase0_fundacao.sql:73-79`
(`current_empresa_id()`).

Login do motorista é uma linha em `usuarios` (mesmo mecanismo de auth do staff — Supabase Auth
e-mail+senha), com `role='motorista'` e `motorista_id` apontando para o registro de negócio.

## 2. Como descobrir a empresa dona do contrato (pergunta 2)

`contratos.empresa_id` diretamente — é a coluna que a própria migration 0005 usa para RLS
(`empresa_id = current_empresa_id()`, `0005_modulo_contratos.sql:85-86`). **Não** é
`motoristas.empresa_id` nem `veiculos.empresa_id` — embora hoje, na prática, os três devam
coincidir (todo contrato é criado por um staff cujo `current_empresa_id()` já restringe, via
RLS de SELECT, quais motoristas/veículos aparecem no formulário), nada no banco *garante*
matematicamente essa coincidência (ver seção 0). Por isso o desenho de RLS da tabela nova usa
`contratos.empresa_id` como fonte da verdade — nunca os outros dois.

## 3. Como impedir empresa A de enxergar empresa B (pergunta 3)

`RLS ... USING (empresa_id = current_empresa_id() AND eh_staff())`. A diferença desta fase (ver
seção 0) é que `motorista_localizacoes.empresa_id` **não é aceito do cliente** — um trigger
`BEFORE INSERT` (seção 8) o preenche a partir de `contratos.empresa_id`, consultado no próprio
banco. Isso fecha a única forma óbvia de uma empresa A tentar inserir uma linha com `empresa_id`
de B (o INSERT já viria com `contrato_id` de um contrato que pertence à empresa A do motorista
autenticado — nunca outro).

**Correção feita depois de rodar a suíte 69 pela primeira vez** (não prevista só lendo o schema):
a primeira versão desta policy usava só `empresa_id = current_empresa_id()`, copiando o padrão
que eu tinha lido em `0005_modulo_contratos.sql` linha 85-86. Só que aquele padrão, sozinho, HOJE
está desatualizado — `current_empresa_id()` (0001/0008) não filtra por `role`, e motorista TEM
`empresa_id` preenchido (0004); rodando a suíte, Motorista B enxergou a localização de Motorista
A (mesma empresa) através dessa policy sozinha (RLS combina policies SELECT permissivas com OR).
Investigando por que `contratos` (que usa o MESMO padrão textual) não vaza da mesma forma,
achei que a policy real de `contratos` HOJE (`pg_policies`, não o texto de 0005) já foi
corrigida por `0039_fase1_seguranca_portal_motorista.sql` para
`(empresa_id = current_empresa_id()) AND eh_staff()` — a própria 0039 documenta essa exata
classe de bug ("motorista TEM empresa_id... um motorista logado podia ler CNH de todos os
motoristas"). Corrigido aqui com a mesma função (`eh_staff()`, `role <> 'motorista' and ativo =
true`, 0035/0039). Fica registrado como o motivo de nunca confiar só na LEITURA do texto de uma
migration antiga — a suíte de teste rodando é que revelou o estado real.

## 3.1. Empresa: qualquer staff ou só admin? (achado, não pedido explicitamente)

`eh_staff()` não distingue role dentro do staff (owner/admin/gestor_frota/gestor_financeiro/
operador todos passam) — mesmo alcance que `contratos`/`veiculos`/`motoristas` já dão hoje a
qualquer staff autenticado da empresa. Não restringido a admin/owner nesta fase porque o Módulo
3 não pediu uma restrição de role adicional além do isolamento por empresa, e criar uma regra
mais estrita aqui do que no resto do sistema seria uma inconsistência não solicitada.

## 4. Como impedir motorista A de enxergar motorista B (pergunta 4)

Mesmo padrão de `motorista_ganhos`/`motorista_despesas`/`motorista_corridas` (0047/0049):
`USING (motorista_id = current_motorista_id())`. `current_motorista_id()` já garante NULL para
qualquer usuário que não seja `role='motorista'` autenticado como aquele motorista específico
— nenhuma sessão resolve para dois motoristas ao mesmo tempo.

## 5. Como persistir localização sem criar duplicação (pergunta 5)

Uma tabela só, **insert-only** (nenhum UPDATE, nenhum "upsert de posição atual"). "Última
posição conhecida" é uma QUERY (`ORDER BY timestamp_localizacao DESC LIMIT 1` por
motorista/veículo, ou `DISTINCT ON` para pegar a última de cada veículo de uma vez), não uma
segunda tabela mutável. Justificativa explícita (Módulo 2 pede isso antes de criar uma segunda
estrutura): uma tabela "posição atual" separada exigiria UPSERT a cada captura E manter as duas
tabelas em sincronia (risco real de dessincronia — a scredibilidade de "onde está agora" cai se
as duas puderem divergir), para um volume de dados que não justifica a complexidade (frota de
uma empresa, não telemetria de larga escala). Índice `(veiculo_id, timestamp_localizacao desc)`
resolve a consulta "última posição" com custo baixo; uma VIEW de conveniência
(`motorista_localizacoes_atual`, seção 8) empacota essa query — não é armazenamento novo, só
uma consulta nomeada.

## 6. Granularidade de localização (pergunta 6)

`latitude`, `longitude`, `accuracy_m`, `timestamp_localizacao`, `origem` — exatamente o que
`navigator.geolocation` fornece de forma confiável e o que a Fase 19 já modelou em
`PosicaoGPS`. **Sem** `heading`/`speed`/`altitude`: o navegador às vezes fornece, mas nenhuma
tela desta fase consome — adicionar colunas sem consumidor real repete o erro que
`meuContrato.ts` documenta explicitamente evitar ("pergunte antes: o motorista PRECISA
disso?"). Se um consumidor real aparecer (ex.: Módulo 14 de uma fase futura precisar de
direção), essas colunas entram então, não agora.

## 7. Precisamos guardar histórico completo (pergunta 7)

Sim — Módulo 5 da especificação já responde isso ("não apagar histórico automaticamente") e o
Módulo 9/15 (inteligência histórica) depende de observações acumuladas ao longo do tempo, do
mesmo jeito que `motorista_corridas` acumula para o Copiloto. Tabela insert-only, sem TTL
automático nesta fase (ver seção 22 abaixo — retenção é decisão jurídica, não técnica).

## 8. Retenção (pergunta 8, Módulo 22)

Não inventada. Volume estimado: se cada motorista gerar no máximo 1 captura a cada ~3-5 min
enquanto o app está em primeiro plano em turno de operação (Módulo 7, sem GPS contínuo), uma
frota de 50 motoristas ativos 10h/dia gera algo como 50 × 120 × 30 ≈ 180 mil linhas/mês — nada
que precise de expurgo técnico imediato num Postgres gerenciado. **Nenhuma política de LGPD/base
legal é definida aqui.** `[VALIDAR COM ADVOGADO]` antes de qualquer decisão de prazo de guarda
ou expurgo automático — este documento só registra o parâmetro técnico (a tabela aceita, no
futuro, uma rotina de purga por data se uma política for definida; nenhuma rotina existe hoje).

## 9-10. Realtime atual / pode ser usado (perguntas 9-10)

Zero uso hoje (grep em todo `src/`). Sem acesso ao projeto Supabase real do PrimeCharge por
este ambiente (MCP conectado aponta para outro projeto — "Viagem - EUA" — não relacionado),
não há como confirmar se `ALTER PUBLICATION supabase_realtime ADD TABLE ...` foi ou seria
aceito, nem testar o comportamento de um `postgres_changes` real. **Decisão: não usar Realtime
nesta fase.** "Tempo quase real" no Centro de Inteligência é obtido com
`useQuery({ refetchInterval: ... })` do TanStack Query (já uma dependência existente,
zero biblioteca nova) — é honesto (o que a tela mostra é o que o polling buscou por último,
nunca uma promessa de push instantâneo) e comprovável neste ambiente. Intervalo proposto: 30s
na tela do Centro de Inteligência (só enquanto a aba está visível — reusa o padrão de
Page Visibility já usado pelo heartbeat), sem paralelo com WebSocket custom algum (Módulo 26).

## 11. Impacto no banco (pergunta 11)

Uma tabela nova (`motorista_localizacoes`), até 3 índices, 1 função de trigger, policies de
RLS. Nenhuma tabela existente é alterada (`ALTER TABLE` só nas migrations relacionadas a esta
tabela nova). Nenhuma migration anterior é tocada.

## 12. Impacto no PWA (pergunta 12)

Um novo prompt de permissão do navegador (geolocalização) — já existe desde a Fase 19
(`useGeolocalizacaoMotorista`), mas nunca foi de fato acionado por nenhuma tela; esta fase é a
primeira a chamar `solicitar()`/persistir de verdade. Um novo intervalo de captura, só em
primeiro plano, cadência de minutos (não segundos). Nenhuma mudança no service worker. Bundle
do motorista: zero biblioteca nova (mapa não entra no app do motorista). Bundle do staff: só
cresce quando/se a aba "Inteligência da Frota" for de fato aberta (import lazy do mapa).

## 13-15. Permissão negada / background / bateria (perguntas 13-15)

Já modelado desde a Fase 19: `PERMISSAO_NEGADA` é um estado de primeira classe, nunca tratado
como erro genérico; a captura só roda com a aba visível (Page Visibility, mesmo padrão do
heartbeat — nunca `setInterval` rodando em segundo plano); `enableHighAccuracy: false` já é o
default do hook existente (custo de bateria menor); cadência de captura pensada em minutos, não
`watchPosition` contínuo por padrão (ver seção 20/Módulo 7 abaixo).

## 16-17. Localização velha vs. última conhecida (perguntas 16-17)

Reaproveita a mesma disciplina de janelas da Fase 19 (`JANELAS_PRESENCA_PADRAO`,
`IDADE_MAXIMA_POSICAO_MS`), agora aplicada à idade de uma linha de `motorista_localizacoes`:
`idade ≤ 2min` → "localização atual"; `2-15min` → "localização recente"; `> 15min` → "sem
atualização" (mas a última posição AINDA é mostrada, com a idade — nunca escondida, só
rotulada). "Última posição conhecida" é sempre a linha mais recente daquele veículo,
independente da idade; o rótulo muda, o dado não desaparece.

## 18-19. Vínculo operacional / contrato encerrado (perguntas 18-19, Módulo 5)

Um trigger `BEFORE INSERT` (não só RLS — RLS sozinha não valida a RELAÇÃO entre
`contrato_id`/`motorista_id`/`veiculo_id`, só quem é dono da linha) rejeita a escrita quando:
`contrato_id` não existe, ou não pertence ao motorista autenticado, ou `contratos.status !=
'ativo'`. Contrato encerrado → todo INSERT novo falha (exceção Postgres, capturada no cliente
como "localização operacional pausada"); linhas já gravadas ANTES do encerramento continuam
existindo (não é apagado retroativamente — são histórico real de quando o contrato estava
ativo).

## 20. Motorista desativado (pergunta 20)

**Correção em relação à primeira leitura desta auditoria:** a versão de `current_motorista_id()`
criada em `0034_epico11...sql:41` de fato não checava `usuarios.ativo` — mas essa NÃO é a versão
que roda hoje. `0045_juridico_hardening_timeline.sql:13-19` já fez `create or replace function
public.current_motorista_id()` adicionando `and ativo = true` (comentário da própria migration:
"motorista desativado... continuava resolvendo o próprio motorista_id... Correção: motorista
desativado passa a não resolver id nenhum"). O mesmo aconteceu com `current_empresa_id()` em
`0008_auditoria_seguranca.sql:25-30` (`and ativo = true`) e com `pode()` na mesma migration.
Como as migrations rodam em ordem numérica e usam `create or replace`, a função REALMENTE ativa
no banco (local ou produção) já bloqueia usuário desativado — confirmado rodando o harness
local com o Motorista A desativado: `current_motorista_id()` retorna `NULL` (suíte 69, GRUPO 7).
**Não existe o gap que eu tinha registrado aqui inicialmente** — encontrado só ao rodar o teste
de verdade contra Postgres local, não ao ler só a primeira definição da função. Mantido como
correção registrada, não apagado, para não esconder o erro de leitura.

Dado isso, o trigger de `motorista_localizacoes` (seção 8) tem uma checagem de `usuarios.ativo`/
`motoristas.status` que é **redundante** com o que a RLS já garante sozinha (se
`current_motorista_id()` já é `NULL` para motorista desativado, a policy de INSERT
`motorista_id = current_motorista_id()` já bloqueia antes do trigger rodar). Mantida mesmo
assim, deliberadamente, como defesa em profundidade — não depende de uma única camada continuar
correta para sempre — e porque valida uma coisa que a RLS sozinha não valida:
`motoristas.status in ('bloqueado','encerrado')` (RLS não sabe nada sobre o STATUS do registro
de negócio, só sobre o `usuarios.ativo` da conta de login).

## 21. Arquivos-fonte da Fase 19 confirmados (reuso, não reimplementação)

`src/features/motorista-app/lib/localizacao.ts` (motor puro Módulo 1),
`src/features/motorista-app/hooks/useGeolocalizacaoMotorista.ts` (hook de captura),
`src/features/motorista-app/hooks/useHeartbeatVisibilidade.ts` (presença),
`src/features/frota/lib/presenca.ts` (`presencaMotorista`, `JANELAS_PRESENCA_PADRAO`),
`src/features/frota/lib/geo.ts` (`distanciaEntrePontos`, Haversine),
`src/features/frota/lib/inteligenciaFrota.ts` (`inteligenciaFrotaHistorica`,
`oportunidadeOperacional`, `RecomendacaoOperacional`, `OrigemDadoFrota`). Todos lidos
integralmente nesta auditoria (não só os docs-resumo) — nenhuma reimplementação está planejada;
Fase 20 IMPORTA esses módulos, não os copia.

## 22. `FrotaPage.tsx` — ponto de montagem confirmado

Tab `'inteligencia'` já existe (linha 68-79), hoje um `EmptyState`. É o ponto real de
montagem do `CentroInteligenciaFrota` (Módulo 9) — nenhuma rota nova.

## 23. `CentroControlePage.tsx`/`useMinhaMeta.ts`/`meuContrato.ts` — padrão a seguir

`useMinhaMeta` resolve `motoristaId` via `useCurrentUsuario().data?.motorista_id`; carrega
`listMeusContratos()` que já devolve `contrato.id` (mas exclui deliberadamente `veiculo_id`/
`empresa_id`/`motorista_id` do objeto retornado — só `veiculo.id` aninhado, por
`select`-explícito, princípio de menor privilégio documentado em `meuContrato.ts`). A tela usa
`d.contratoAtivo` já derivado. Fase 20 reaproveita esse mesmo `contratoAtivo.id`/
`contratoAtivo.veiculo.id` para inserir localização — nenhuma query nova de contrato é criada
só para isso.

## 24. `schemaGuard.ts` — padrão de honestidade a reaproveitar

`lerTolerante()`/`ehRecursoAusente()`/`moduloIndisponivel()` (já usado por Minha Meta/Copiloto)
é exatamente o padrão certo para `motorista_localizacoes`, porque esta migration, como todas
desde a 0042, só será aplicada em produção mediante autorização explícita (Módulo 28) — o
código pode chegar antes da tabela existir em produção. Toda leitura/escrita nova desta fase
passa por `lerTolerante`, nunca assume que a tabela já existe.

## 25. Riscos de privacidade específicos desta fase

Diferente de Fases 16-19 (dado 100% pessoal), aqui a empresa TEM acesso real a um dado sensível
(onde o motorista está fisicamente). Mitigado por: (a) só localização **operacional** — atrelada
a contrato ativo, nunca a localização "de vida" fora de operação; (b) consentimento visível e
factual (Módulo 4 — nunca escondido); (c) motorista sempre sabe quem pode ver
(Módulo 19 — "Quem pode ver minha localização?"); (d) staff da empresa (qualquer role
autenticado da empresa, mesmo padrão de acesso a veículos/contratos hoje) vê, não um público
externo; (e) nenhuma linha em `motorista_localizacoes` é inserida em `audit_log`/
`timeline_eventos`/notificação alguma (mesmo cuidado do 0047/0049 — auditar vazaria a operação).

## Conclusão

Migration necessária: **SIM** (única vez, nesta fase, em que a resposta é diferente de "zero
migration"). Vai ser criada, aplicada e testada **só no Postgres local** (Módulo 25/28) — nunca
na produção real. RLS explícita descrita na seção 3-4/8. Nenhum dado é inventado; nenhuma
posição fictícia; nenhum acesso automático de staff global.
