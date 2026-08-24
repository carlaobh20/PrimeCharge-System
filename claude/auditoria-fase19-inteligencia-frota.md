# Auditoria — Fase 19: Fundação do Centro de Inteligência Operacional (Frota)

> Feita ANTES de qualquer código, por dois agentes de leitura independentes sobre o repositório
> real (`/tmp/pc-work`), com evidência (arquivo:linha) para cada afirmação — nunca "acho que" ou
> "provavelmente". Responde aos 24 pontos da REGRA 0 da especificação, mais os itens extras dos
> Módulos 1–22 que dependem de fato existente (bibliotecas de mapa, campos de região, etc.).

## 0. Veredito resumido (a verdade desconfortável primeiro)

[Certo] **Não existe NENHUM mecanismo de geolocalização no sistema hoje** — nem no app do
motorista, nem no banco. `navigator.geolocation` nunca é chamado em nenhum lugar de `src/`.

[Certo] **`telemetria_eventos` existe como tabela, mas está vazia por design desde que foi criada
(Missão 2, migration `0010`)** — zero produtor, zero consumidor, confirmado pelo próprio comentário
da migration ("nenhum produtor real ainda"). Não é uma fonte de dado utilizável nesta fase.

[Certo] **Supabase Realtime nunca foi usado no projeto** — zero `.channel(`, zero
`postgres_changes` em todo o `src/`.

[Certo — a descoberta mais importante desta auditoria] **`inteligenciaFrotaHistorica()` (Módulo 9,
pedida como agregação DA FROTA — múltiplos motoristas) não tem, hoje, NENHUM caminho de dado real
para staff.** `motorista_corridas`/`motorista_ganhos`/`motorista_recargas` têm exatamente 1 policy
de RLS cada (o dono, `motorista_id = current_motorista_id()`) e **zero policy de staff** — é a
"privacidade invertida" que as Fases 16–18 construíram deliberadamente. Isso significa que hoje
**nenhuma conta de staff consegue nem SELECT nessas tabelas**, mesmo com `service_role` desabilitado
no client. Construir o motor puro é possível e útil (é só matemática); alimentá-lo com dado real de
frota inteira NÃO é possível sem uma decisão explícita de RLS — que esta fase NÃO vai tomar
sozinha (ver Módulo 3/4 abaixo e seção 5).

[Provável] Isso não é um bug — é a Fase 16 funcionando exatamente como projetada ("corrida é dado
pessoal, staff nunca vê"). Mas significa que "Inteligência de Frota" tem uma tensão estrutural com
"privacidade invertida" que precisa de uma decisão de produto sua antes de qualquer fase futura
tentar mostrar histórico agregado de verdade pra staff.

## 1. O que existe

| # | Item | Existe? | Evidência |
|---|---|---|---|
| 1 | `veiculos` | Sim | `0003_modulo_veiculos.sql:107-141`. Sem coluna de localização. RLS por `empresa_id`. |
| 2 | `contratos` | Sim | `0005_modulo_contratos.sql:36-68`. `motorista_id`/`veiculo_id`/`status` (enum de 8 estados). RLS por `empresa_id`. |
| 3 | `motoristas` | Sim | `0004_modulo_motoristas.sql:29-55`. Status via enum (`lead…encerrado`), não boolean. Acesso de portal via `usuarios.ativo`. |
| 4 | `empresas` | Sim | `0001_fase0_fundacao.sql:5-11`. `empresa_id` é a chave de tenant em ~61 tabelas. |
| 5 | `usuarios`/Auth | Sim | Supabase Auth (`auth.users`) + tabela `usuarios` de perfil. `role` enum inclui `'motorista'`; `eh_staff()` = `role <> 'motorista' and ativo`; `current_motorista_id()` = motorista_id do usuário logado. |
| 6 | `checklists` | Sim (genérico) | `0007_plataforma_operacoes.sql:105-142`. `entidade_tipo`/`entidade_id` — qualquer entidade, não específico de veículo. |
| 7 | `vistorias` (tabela dedicada) | **Não** | Vistoria é um USO de `checklists`, não uma tabela própria (`0022`, `0030`, confirmado por comentário explícito recusando criar tabela separada). |
| 8 | `telemetria_eventos` | Sim (vazia) | `0010_missao2_operacao_real.sql:128-141`. Zero producer/consumer em `src/` (grep `telemetria_eventos` em `src/` = 0 resultados). |
| 9 | `motorista_ganhos/corridas/recargas` | Sim | `0047`/`0049`/`0048` respectivamente (já confirmadas nas Fases 16-18). |
| 12 | Backend/API dedicado | **Não** | SPA Vite puro, tudo via `@supabase/supabase-js` direto do cliente. Sem `supabase/functions/`, sem `server/`. |
| 14 | Supabase Realtime | **Não usado** | Zero ocorrência de `.channel(`/`postgres_changes` em `src/`. |
| 16 | RLS "privacidade invertida" | Sim, padrão estabelecido | Nomeado explicitamente em `CLAUDE.md`, `docs/motorista/MINHA-META.md`. Mecânica: 1 policy `for all using (motorista_id = current_motorista_id())`, zero policy staff, zero audit_log. |
| 19 | PWA | Sim (mão, não plugin) | `public/manifest.webmanifest` + `public/sw.js` registrado em `src/main.tsx:14-16`. Estratégia cache-only de shell, cross-origin sempre passa direto (nunca intercepta chamadas Supabase). |
| 20 | Geolocalização/permissões do navegador | **Não existe em nenhum lugar** | `grep -rn "navigator.geolocation\|navigator.permissions\|Notification.requestPermission" src/` → 0 resultados. |
| 22 | Coluna lat/lng em algum lugar | Só uma, não usada | `checklists.gps_lat`/`gps_lng` (`0010_missao2_operacao_real.sql:106-107`) — colunas de PREPARO para uma fase futura de "Vistoria Inteligente", explicitamente documentadas como não populadas, zero referência em `src/`. |

## 2. O que pode ser reutilizado (sem duplicar)

- **Padrão de RLS "privacidade invertida"** (0047/0048/0049/0050) — se qualquer localização de
  motorista vier a ser persistida, o padrão correto é o MESMO: 1 policy do dono, zero staff, salvo
  decisão explícita e documentada em contrário (ver seção 5 — é exatamente essa decisão que esta
  fase NÃO toma sozinha).
- **`classificarAmostra()`, `FAIXAS_HORARIO`, `DIA_SEMANA_LABEL`** (`metas.ts`, Fase 17) — mesma
  disciplina de amostra/faixas se aplica a uma agregação de frota; reusados por import direto em
  vez de reimplementados (Módulo 8: "nunca... segundo motor de inteligência").
- **Taxonomia de origem do dado** (`OrigemInsightCopiloto`/`OrigemInsightAssistente`, Fases 17/18)
  — o Módulo 17 desta fase pede uma taxonomia nova e mais ampla (`DADO IMPORTADO`,
  `OPORTUNIDADE HISTÓRICA`, `NÃO DISPONÍVEL`); é uma extensão do mesmo princípio, não uma segunda
  filosofia.
- **`current_motorista_id()`/`eh_staff()`/`empresa_id`** — se uma tabela de localização vier a
  existir, essas são as únicas primitivas de RLS que o projeto já usa; nada novo a inventar aí.
- **Tab "Inteligência da Frota" já existe como placeholder vazio** dentro de
  `src/features/frota/pages/FrotaPage.tsx` (`?tab=inteligencia`, linhas ~68-79), com o texto
  "Inteligência da Frota em construção" — é o ponto de montagem natural de uma fase futura de UI,
  mas **não foi tocado nesta fase** (ver seção 4 — decisão de escopo).

## 3. O que precisa ser apenas estendido

Nada precisa ser estendido em SCHEMA — os Módulos 1/2/5/9/11/12/17 desta fase são só CÓDIGO
(funções puras + hooks de navegador), zero coluna nova, zero tabela nova.

## 4. O que realmente não existe (e precisa ser criado NESTA fase)

- `src/features/motorista-app/lib/localizacao.ts` — tipos + função pura de interpretação de
  resultado de geolocalização (Módulo 1).
- `src/features/motorista-app/hooks/useGeolocalizacaoMotorista.ts` — hook que chama
  `navigator.geolocation`, interpreta via a função pura acima. **Não persiste nada** — não há
  onde persistir sem migration (ver seção 5).
- `src/features/motorista-app/hooks/useHeartbeatVisibilidade.ts` +
  `src/features/frota/lib/presenca.ts` — Página Visibility API (client-side, em memória) +
  `presencaMotorista()` pura (Módulos 2/5).
- `src/features/frota/lib/geo.ts` — `distanciaEntrePontos()` (Módulo 12).
- `src/features/frota/lib/inteligenciaFrota.ts` — `inteligenciaFrotaHistorica()`,
  `oportunidadeOperacional()`, tipo `RecomendacaoOperacional` (contrato, sem gerador — Módulo 13),
  taxonomia `OrigemDadoFrota` (Módulo 17). **Motor puro, testável com fixtures sintéticas — a
  ausência de um caminho de dado real de frota (seção 0) não impede testar a matemática.**
- `scripts/audit-motorista-inteligencia-frota.ts` — 26 casos pedidos no Módulo 19.
- `docs/frota/INTELIGENCIA-FROTA.md`, `docs/frota/LOCALIZACAO-OPERACIONAL.md`,
  `docs/frota/CENTRO-INTELIGENCIA-FROTA.md` (Módulo 21).
- Atualização de `docs/motorista/COPILOTO-PROATIVO.md`, seção "Futuro — Inteligência de Frota"
  (já existe desde a Fase 18 — vai ser atualizada pra apontar pros docs novos, não duplicada).

**Decisão de escopo explícita: NÃO vou tocar `FrotaPage.tsx`/UI de staff nesta fase.** O Módulo 6
pede "arquitetura para futura tela administrativa", não a tela em si ("NÃO criar dashboard gigante
nesta fase... Primeiro criar estrutura reutilizável"). Os tipos (`ContagemFrota`,
`EstadoOperacionalVeiculo`) ficam documentados em `docs/frota/CENTRO-INTELIGENCIA-FROTA.md` como
contrato para quando a UI for construída — evita editar um arquivo staff que não li a fundo antes
desta fase, com o risco de quebrar algo que já funciona, por um ganho que o próprio módulo pede pra
adiar.

## 5. Migration — ZERO migration nesta fase. Proposta apresentada, não executada.

Módulo 3 da especificação é explícito: **"Se migration for realmente necessária: PARAR. Apresentar
primeiro: schema proposto, RLS proposta, impacto, motivo."** Esta auditoria confirma que persistir
localização (ou presença agregada de frota) EXIGE migration — não há hoje nenhuma tabela, nenhuma
coluna usável (`checklists.gps_lat/lng` é de outra fase, sem RLS própria pra esse uso, sem
`veiculo_id NOT NULL`, sem `origem`).

**Proposta (NÃO criada, NÃO aplicada — só para sua decisão):**

```sql
-- PROPOSTA — motorista_localizacoes (nome sujeito à sua aprovação)
create table if not exists motorista_localizacoes (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  veiculo_id uuid references veiculos(id) on delete set null, -- nullable: nem toda captura tem contrato ativo no momento
  latitude double precision not null,
  longitude double precision not null,
  accuracy numeric,                 -- metros, do próprio navigator.geolocation
  origem text not null default 'PWA_GPS', -- 'PWA_GPS' | 'TELEMETRIA' | 'OBD' | 'OUTRA' — texto livre, mesmo padrão de motorista_corridas.origem_captura (não enum rígido)
  capturado_em timestamptz not null, -- timestamp do PRÓPRIO navigator.geolocation, nunca now() do servidor
  criado_em timestamptz not null default now(),
  constraint motorista_localizacoes_lat_check check (latitude between -90 and 90),
  constraint motorista_localizacoes_lng_check check (longitude between -180 and 180)
);
alter table motorista_localizacoes enable row level security;
create policy "motorista: ve e insere a propria localizacao"
  on motorista_localizacoes for all
  using (motorista_id = current_motorista_id())
  with check (motorista_id = current_motorista_id());
-- ZERO policy de staff nesta proposta — mesma "privacidade invertida" de 0047/0048/0049.
-- Se você QUISER que staff veja localização (para o Centro de Inteligência da Frota fazer
-- sentido), isso é uma segunda decisão, explícita e separada: qual staff, de qual empresa, com
-- que granularidade (ponto exato? só "presença"? só agregado por região?). Não assumida aqui.
```

**Impacto:** tabela nova, RLS nova, zero linha em produção afetada, zero alteração em tabela
existente. Motivo: sem isso, "localização real" (Módulo 1) nunca sai da memória do navegador do
motorista — cada `getCurrentPosition()` se perde ao fechar a aba. **Decisão pendente sua**: aprovar
esse schema (ou um diferente) antes de eu criar a migration. Enquanto isso, o hook desta fase
(`useGeolocalizacaoMotorista`) fica funcional e testável, só não persiste.

## 6. Quais queries já existem (reaproveitáveis)

Nenhuma query relevante para localização/presença/frota existe hoje. As únicas queries reusáveis
para os Módulos 8/9 (histórico operacional) são as mesmas de sempre —
`listCorridasPeriodo`/`listGanhos`/`listRecargas` — mas, como a seção 0 explica, elas só rodam sob
`current_motorista_id()`; não há query "de frota inteira" porque a RLS bloqueia isso por design.

## 7. Quais queries podem ser ampliadas

Nenhuma nesta fase — ampliar uma query pra staff ver `motorista_corridas` de todos os motoristas
seria, na prática, remover a privacidade invertida. Isso é uma decisão de produto, não uma
ampliação técnica trivial (ver seção 0/5).

## 8. Onde existe risco de duplicação

- `inteligenciaFrotaHistorica()` PODERIA duplicar `inteligenciaPorHorario()`/`classificarAmostra()`
  se reimplementasse faixas/amostra do zero — mitigado importando essas funções/consts de
  `metas.ts` em vez de copiá-las.
- A tab "Inteligência" vazia dentro de `FrotaPage.tsx` já existe — criar uma rota nova
  `/frota/inteligencia` duplicaria esse ponto de entrada. Decisão: não criar rota nova (Módulo 6 já
  documenta isso como arquitetura, não UI, nesta fase).
- `distanciaEntrePontos()` é função nova sem equivalente no repo (confirmado: zero função de
  distância geográfica existe hoje) — sem risco de duplicação.

## 9. Impacto de performance

Zero biblioteca nova (nenhuma lib de mapa adicionada — ver Módulo 7 no relatório). Hooks de
geolocalização/visibilidade só chamam APIs nativas do navegador, sob demanda (nunca
`setInterval`/polling automático — a especificação do Módulo 5 pede exatamente isso).

## 10. Impacto de RLS

Zero — nenhuma policy tocada nesta fase (nenhuma migration criada, ver seção 5).

## 11. Bibliotecas de mapa

Nenhuma existe no projeto hoje (`grep` em `package.json` por `leaflet`/`maplibre-gl`/`mapbox-gl`/
`@react-google-maps/api`/`deck.gl` = 0 resultados). Comparação técnica (Módulo 7), sem adicionar
nada nesta fase:

| | MapLibre GL JS | Leaflet |
|---|---|---|
| Licença | BSD-3 (fork open-source do Mapbox GL pré-v2) | BSD-2 |
| Renderização | WebGL (vetorial, mais pesado no bundle ~200KB+ gzip) | Canvas/SVG (mais leve, ~40KB gzip) |
| Estilo de mapa | Vector tiles (requer um provedor de tiles — MapTiler, ou self-hosted) | Raster tiles (qualquer provedor simples, ex. OpenStreetMap) |
| Melhor para | Mapas ricos, muitos pontos, zoom suave | Mapas simples, poucos marcadores, carga leve |
| Recomendação nesta auditoria | — | **Leaflet**, se/quando o mapa for construído: bundle bem menor (alinhado ao Módulo 20 — "não adicionar biblioteca pesada sem necessidade"), e o volume inicial de pontos (frota de uma empresa) não justifica vetorial. Reavaliar se o volume de pontos crescer muito. |

Nenhuma das duas foi adicionada ao `package.json` nesta fase — é só a comparação pedida, pronta
para quando o Módulo 6/7 avançar de arquitetura para UI real.

## 12. Uber/99 (Módulo 15)

Confirmado por ausência: nenhuma integração, nenhuma chamada a API externa de app de corrida em
todo o repositório. `motorista_corridas` continua sendo, e só pode ser, DADO REGISTRADO
MANUALMENTE pelo motorista (mesmo texto já usado desde a Fase 16).

## 13. Telemetria (Módulo 16)

`telemetria_eventos` existe, RLS habilitada, zero produtor, zero consumidor — confirmado por grep
em todo `src/` (0 arquivos referenciam a tabela) e pelo próprio comentário da migration que a
criou. Estado a ser exibido em qualquer UI futura: "TELEMETRIA NÃO DISPONÍVEL" (texto literal
pedido pela especificação) — nenhum código desta fase tenta ler dela.

## 14. Limitações reais do navegador/PWA

- `navigator.geolocation.getCurrentPosition`/`watchPosition` só funcionam com a aba **em
  primeiro plano** (ou, em alguns navegadores, brevemente em segundo plano) — não existe captura de
  localização em background confiável numa PWA instalada sem um Service Worker com Background
  Geolocation API, que **não é suportada pela maioria dos navegadores** (é uma API experimental,
  Chrome-only, atrás de flag). Ou seja: **localização só existe enquanto o motorista está com o
  app aberto e a aba visível** — isso já é o comportamento correto de "presença", não uma
  limitação a esconder, mas precisa ficar claro pro produto: não dá pra rastrear o carro andando
  com o app fechado.
- `document.visibilityState` também só é confiável com a aba aberta; ao trocar de app no celular,
  o navegador demora alguns segundos a reportar `hidden` de forma consistente entre
  iOS Safari/Android Chrome — por isso o Módulo 5 pede janelas de tempo (não instantâneo).
- O service worker atual (`public/sw.js`) é cache-only de shell, sem `sync`/`periodicSync`
  registrado — não há como "acordar" o app em background pra mandar um heartbeat mesmo se
  quiséssemos.
- iOS Safari em PWA "adicionada à tela de início" tem histórico de limitar
  `navigator.geolocation`/permissões de forma mais agressiva que Android — nenhum teste real em
  device foi feito nesta auditoria (fora do escopo de uma sessão de código); é um risco a validar
  manualmente antes de qualquer expectativa de produto sobre precisão/frequência.

## 15. Riscos de privacidade

- Localização é dado mais sensível que ganho registrado — a mesma disciplina de "privacidade
  invertida" das Fases 16-18 se aplica com força igual ou maior (Módulo 4). A proposta da seção 5
  já nasce com ZERO policy de staff, deliberadamente.
- Nunca inserir localização em `audit_log`/timeline administrativa/notificação de staff — nenhuma
  dessas integrações foi tocada ou é tocada por este código (motor 100% client-side, sem escrita
  no banco nesta fase).
- Risco concreto pra decisão futura: se/quando staff ganhar QUALQUER visibilidade de localização
  (mesmo agregada/anonimizada), isso muda o modelo de privacidade que o motorista aceitou até
  aqui — merece um termo de uso/consentimento explícito, não só uma RLS nova. Fora do escopo desta
  fase, mas registrado aqui para não ser esquecido quando a hora chegar.

---

Auditoria concluída. Implementação segue nas seções descritas acima (4), respeitando o "PARAR" da
seção 5 para qualquer coisa que exigisse migration.
