# Relatório — Fase 20: Localização Operacional + Presença + Centro de Inteligência da Frota

**Data:** 2026-08-21 · **Branch:** `dev` (commits `2faefc7`+`245cf07` na nuvem / `4217048`+`73839aa`
no dispositivo — mesmo diff, 31 arquivos, 2470 inserções). **Sem push para `main`. Migration 0051
NÃO aplicada em produção.**

## 1. Auditoria

`claude/auditoria-fase20-localizacao-operacional.md` — Regra 0 cumprida antes de qualquer código:
Fase 19 completa, os 3 docs de frota, migrations 0001-0050, RLS atual, `contratos`/`motoristas`/
`veiculos`/`empresas`/`motorista_corridas`/`ganhos`/`recargas`, `CentroControlePage`/
`useMinhaMeta`, os 6 arquivos-fonte da Fase 19, `FrotaPage.tsx` — todos lidos, as 20 perguntas
respondidas com citação de arquivo:linha.

Achado central (diferente de Fases 16-19): localização OPERACIONAL tem contraparte de negócio
real — o contrato ativo entre motorista e empresa. `motoristas.empresa_id`/`contratos.empresa_id`/
`veiculos.empresa_id` e `current_empresa_id()`/`current_motorista_id()` já existiam — não havia o
bloqueio estrutural que travou parte da Fase 19.

**Um erro registrado e corrigido durante a própria auditoria**: a primeira leitura concluiu que
`current_motorista_id()`/`current_empresa_id()` não checavam `usuarios.ativo`. Releitura mostrou
que 0045/0008 já tinham feito `create or replace function` acrescentando essa checagem depois da
versão original (0034/0001) — migrations aplicam na ordem numérica, a versão mais recente vale.
Corrigido explicitamente na auditoria com "eu estava errado" registrado, não silenciado.

## 2. Arquitetura

Mesmo padrão de 3 camadas das fases anteriores (motor puro → hook → UI), estendido com um padrão
novo: um motor que também injeta dado real capturado do banco (`frescorLocalizacao`/`resumoFrota`
recebem linhas reais de query + `agoraMs` injetado, nunca leem relógio sozinhos). Zero segundo
sistema de GPS — captura reusa 100% os arquivos da Fase 19.

## 3. Schema

Tabela `motorista_localizacoes`: `id`, `motorista_id` (default `current_motorista_id()`),
`veiculo_id`/`empresa_id`/`contrato_id` (sempre derivados no banco, nunca aceitos do cliente),
`latitude`/`longitude`/`accuracy_m`, `timestamp_localizacao` (momento do DISPOSITIVO), `origem`
(só `PWA_GPS` real), `criado_em` (momento do SERVIDOR). Checks: latitude/longitude em faixa,
accuracy não-negativo, timestamp não mais que 5min no futuro (tolerância de clock skew). Insert-
only — zero policy de UPDATE/DELETE para qualquer papel.

## 4. Migration

`supabase/migrations/0051_frota_localizacao_operacional.sql` — criada e validada só no harness
Postgres local (14 suítes, 0 falhas). **NÃO aplicada em produção.** Mesmo protocolo de
autorização explícita já usado em 0049/0050.

## 5. RLS ("o ponto mais importante da fase")

1 policy INSERT (`motorista_id = current_motorista_id()`) + 2 policies SELECT (motorista vê o
próprio; empresa vê a própria frota via `empresa_id = current_empresa_id() AND eh_staff()`).

**Bug real de segurança encontrado testando, não lendo**: a primeira versão da policy de empresa
era só `empresa_id = current_empresa_id()`. Como `usuarios.empresa_id` também é preenchido para
contas de motorista, isso deixava um motorista ver a localização de TODOS os outros motoristas da
própria empresa — mesma classe de bug já documentada em `0039_fase1_seguranca_portal_motorista.sql`
para `contratos`/`storage.objects`. Corrigido com `eh_staff()` (role ≠ motorista, ativo). Testado
com IDOR direto (forjar `contrato_id`/`motorista_id`) — bloqueado pelo trigger, não só pela RLS.
Empresa A nunca vê Empresa B; Motorista A nunca vê Motorista B; staff global não ganha acesso
automático — testado, não assumido.

## 6. Captura GPS

Reuso total de `localizacao.ts`/`useGeolocalizacaoMotorista` (Fase 19) — zero segundo sistema de
GPS. Novo hook `useLocalizacaoOperacional(contratoId)` liga captura + persistência + throttle +
consentimento. Nunca salva coordenada inválida, timestamp inválido, ou sem vínculo operacional
ativo (o trigger no banco rejeita mesmo que o cliente tente).

## 7. Persistência

`gravarLocalizacaoOperacional()` — nunca envia `motorista_id`/`veiculo_id`/`empresa_id` (o banco
deriva os três do `contrato_id` via trigger). "Última posição conhecida" é uma QUERY (`distinct on
veiculo_id order by timestamp_localizacao desc`), nunca uma segunda tabela — evita duplicação e
dessincronia.

## 8. Presença

`presencaMotorista()` (Fase 19) reusado sem alteração. No painel de detalhe do Centro de
Inteligência, a presença é aproximada pela recência da própria captura de localização — é a única
evidência real de atividade que hoje chega a staff (o heartbeat de visibilidade continua só local
ao dispositivo). Honesto: "Sem dado" quando não há localização, nunca "offline" inventado.

## 9. Mapa

Leaflet adicionado (1.9.4, zero dependências transitivas) após reconfirmar a comparação técnica
da Fase 19. `L.divIcon` colorido por estado (verde/azul/âmbar) em vez do ícone PNG padrão — evita
o problema clássico de asset quebrando em bundlers Vite. View inicial: Brasil inteiro, zoom 4,
`fitBounds` só com pelo menos 1 marcador — nunca uma cidade "padrão" inventada. Lazy via
`React.lazy` — confirmado isolado no próprio chunk (`MapaFrota-*.js`, 150KB) por inspeção real do
`dist/assets/` pós-build, ausente de qualquer chunk do app do motorista.

## 10. Centro de Inteligência

Primeira UI real de staff na tab "Inteligência da Frota" (`FrotaPage.tsx`) — substituiu o
`EmptyState` "em construção". 4 cards clicáveis-como-filtro (Total/Localização ativa/Sem
atualização/Sem localização), busca por placa/motorista, filtro de status (só aparece com >1
status distinto), sem filtro de Empresa (RLS já garante 1 empresa por tela). Lista e mapa
sincronizados nos dois sentidos. Painel de detalhe: Veículo/Motorista/Contrato/Presença/
Localização/Atualização/Precisão. "Tempo quase real" via polling (`refetchInterval: 30s`,
pausado com aba em background) — sem Supabase Realtime (confirmado: zero uso em todo o projeto).

## 11. Histórico

`inteligenciaFrotaHistorica()` (Fase 19) não foi tocada nem alimentada com dado real: continua
bloqueada pela mesma limitação estrutural — staff não lê `motorista_corridas`/`motorista_ganhos`
(privacidade invertida das Fases 16-18). Nada mudou aqui nesta fase; documentado explicitamente
em `INTELIGENCIA-FROTA.md` para não ficar implícito.

## 12. Oportunidade

`oportunidadeOperacional()` (Fase 19) na mesma situação do item 11 — sem consumidor de dado real
ainda. Nenhuma tentativa de contornar a limitação de RLS criando um caminho novo.

## 13. Copiloto

Nenhuma integração automática criada. Estrutura de tipos (`RecomendacaoOperacional`, Fase 19)
segue existindo só como contrato — zero gerador, zero envio.

## 14. Privacidade

Consentimento com 4 estados factuais (Compartilhada/Não compartilhada/Permissão negada/
Indisponível), nunca persistido em `localStorage` (pedir de novo a cada sessão é mais transparente
que lembrar silenciosamente). Card do motorista com texto de reciprocidade explicando quem vê a
localização. Retenção NÃO decidida — `[VALIDAR COM ADVOGADO]`, sem LGPD/base legal inventada.
Tabela nunca escreve em `audit_log`/timeline/notificações.

## 15. Testes

`supabase/tests/69_frota_localizacao.sql` — 10 grupos, seed real (Empresa A/B, Motoristas A/B/C,
Staff A/B), exercitando transição de contrato ativo→encerrado, guarda de auto-escalação, IDOR via
`contrato_id`/`motorista_id` forjado. `scripts/audit-frota-localizacao-fase20.ts` — 29/29,
cobrindo os casos 20-32 do Módulo 24 (mapa lazy real via grep em `dist/`, nenhuma posição
inventada, nenhum `select *`, nenhuma query duplicada, Uber/99 não integrados, distância
reutilizada, histórico separado de demanda, retenção não inventada).

## 16. SQL real

Postgres 16.13 local recriado do zero, migrations 0001→0051 aplicadas em ordem, todas as 14
suítes existentes + a nova 69 executadas — **0 falhas**. Não confiado só em TypeScript.

## 17. tsc

`tsc -b --noEmit` — limpo, exit 0.

## 18. lint

`oxlint` — mesmos 6 warnings pré-existentes e não relacionados a esta fase (fast-refresh em
arquivos de outras features), confirmado por grep que nenhum deles cai nos arquivos novos da
Fase 20.

## 19. build

`npm run build` — sucesso. Bundle sem impacto mensurável: leaflet isolado no próprio chunk
(`MapaFrota-DNTwaiTv.js`), confirmado ausente de qualquer chunk do app do motorista via grep no
`dist/assets/` real, não por inferência.

## 20. Performance

Zero polling agressivo: GPS a cada 3min só em foreground, grava só por movimento ≥150m ou 10min
sem gravar. "Tempo quase real" do staff via `refetchInterval` 30s, pausado com aba oculta. Sem
Realtime, sem WebSocket customizado, sem biblioteca pesada além do Leaflet (já lazy).

## 21. Arquivos

30 arquivos no commit `feat: fase 20 localizacao operacional` (9 novos de produto, 1 migration,
1 suíte SQL, 1 script TS, 10 scripts TS antigos corrigidos por staleness, 3 docs + CLAUDE.md
atualizados, package.json/lock) + 1 arquivo no commit separado do relatório da Fase 19 pendente.

## 22. Commit

Nuvem: `2faefc7` (relatório Fase 19 pendente) + `245cf07` (Fase 20 completa), branch `dev`.
Dispositivo: `4217048` + `73839aa`, mesmo diff confirmado por `git diff --stat` (31 arquivos,
2470 inserções, idêntico nos dois lados). Nenhum push para `main`.

## 23. Bundle

Chunk do mapa (`MapaFrota-*.js`, ~150KB/44KB gzip) só carrega quando o Centro de Inteligência da
Frota é montado — confirmado, não assumido, via `grep leaflet dist/assets/*.js` (aparece só nesse
chunk) e via ausência em qualquer chunk do app do motorista.

## 24. Limitações

- Migration 0051 é só local — produção não tem `motorista_localizacoes` até autorização explícita.
- PWA continua sem captura confiável em segundo plano (mesma limitação estrutural da Fase 19,
  `public/sw.js` cache-only, sem `sync`/`periodicSync`).
- iOS Safari em modo PWA: nenhum teste em device real feito (fora do escopo de sessão de código).
- Retenção de dado: não decidida, precisa validação jurídica.
- Histórico/oportunidade agregada (Módulos 15/16) continuam sem dado real por trás — a limitação
  de RLS de `motorista_corridas`/`motorista_ganhos` para staff não foi alterada nesta fase (e não
  deveria ser, sem uma decisão sua explícita e separada).
- Agrupamento por região (Módulo 10 de Fase 19) segue não implementado — o pré-requisito técnico
  (localização persistida) agora existe, mas a agregação geográfica em si não foi construída.

## 25. Próximos passos

1. Decidir se e quando autorizar a aplicação da migration 0051 em produção.
2. Se autorizada, validar em device iOS real antes de qualquer expectativa de produto sobre
   precisão/frequência de captura em campo.
3. Decisão jurídica sobre retenção de `motorista_localizacoes` (`[VALIDAR COM ADVOGADO]`).
4. Se/quando decidir dar a staff acesso a histórico/oportunidade agregada de corridas — essa é
   uma segunda decisão de RLS sobre `motorista_corridas`/`motorista_ganhos`, não implícita nesta
   fase nem na anterior.
5. Agrupamento por região (geohash/grid/bairro/região manual) — avaliação em aberto, sem decisão
   tomada.

---

## Critério de sucesso — 18 capacidades, verificadas uma a uma

1. **Motorista autorizar localização** — [Certo] botão explícito "Compartilhar localização" no
   card do Centro de Controle, nunca inicia sozinho.
2. **Capturar localização REAL** — [Certo] reuso de `navigator.geolocation` via hook da Fase 19,
   testado nos 4 estados possíveis.
3. **Persistir localização** — [Certo] `motorista_localizacoes`, validada no harness local.
4. **Associar ao motorista** — [Certo] `motorista_id`, default e RLS via `current_motorista_id()`.
5. **Associar ao veículo** — [Certo] `veiculo_id`, sempre derivado do contrato pelo trigger.
6. **Associar ao contrato** — [Certo] `contrato_id`, validado como existente/ativo/pertencente ao
   motorista no INSERT.
7. **Associar à empresa** — [Certo] `empresa_id`, sempre derivado do contrato pelo trigger.
8. **Proteger tudo por RLS** — [Certo] dual (motorista dono + empresa via `eh_staff()`), testado
   com IDOR direto.
9. **Empresa visualizar SOMENTE sua frota** — [Certo] testado (Empresa A não vê Empresa B, suíte
   69).
10. **Motorista visualizar SOMENTE sua localização** — [Certo] testado (Motorista A não vê
    Motorista B, mesma empresa, suíte 69 — é exatamente o bug que foi encontrado e corrigido).
11. **Centro Inteligência mostrar mapa real** — [Certo] Leaflet com tiles OpenStreetMap reais,
    lazy.
12. **Mapa mostrar veículos reais** — [Certo] marcadores vêm de `listFrotaComLocalizacao()`,
    dado real de `motorista_localizacoes`/`veiculos`/`contratos`/`motoristas`, zero mock.
13. **Mostrar última atualização** — [Certo] "há X min/h", recalculado a cada 15s.
14. **Mostrar presença** — [Certo] via `presencaMotorista()` no painel de detalhe.
15. **Mostrar histórico quando houver dados** — [Palpite/parcial] a estrutura
    (`inteligenciaFrotaHistorica`) existe desde a Fase 19, mas não tem hoje caminho de dado real
    (item 11 do relatório) — não é uma capacidade nova desta fase, e não foi fingida como se
    fosse.
16. **Separar histórico de demanda atual** — [Certo] vocabulário "DADO HISTÓRICO"/"OPORTUNIDADE
    HISTÓRICA" testado explicitamente, nunca "demanda atual".
17. **Separar oportunidade histórica de recomendação** — [Certo] `RecomendacaoOperacional` só
    existe como tipo, zero gerador — nada produz recomendação automática.
18. **Preparar integração futura com Copiloto** — [Certo] limitado ao que o Módulo 17 pediu:
    estrutura de dados, zero envio automático.

**17 de 18 plenamente entregues nesta fase. O item 15 é parcial por desenho, não por falta de
esforço**: depende de uma decisão de RLS sobre `motorista_corridas`/`motorista_ganhos` que
nenhuma fase deve tomar sozinha — registrado como pendência explícita, não escondido.

SEM DADO = SEM DADO. Nenhuma posição foi inventada em nenhum estado testado.
