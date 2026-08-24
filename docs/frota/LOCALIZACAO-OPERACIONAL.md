# Localização Operacional — Fases 19 e 20

> Auditorias completas: `claude/auditoria-fase19-inteligencia-frota.md` (fundação, só captura em
> memória) e `claude/auditoria-fase20-localizacao-operacional.md` (persistência real + RLS dual +
> UI de staff). Este documento cobre os Módulos 1/3/4 da Fase 19 (histórico, seção 1-6 abaixo,
> **hoje parcialmente superado — ver seção 7**) e os Módulos 1-8/18/19 da Fase 20 (schema real,
> RLS, trigger, captura/persistência, consentimento, presença — seção 7). Presença/Heartbeat
> local: `CENTRO-INTELIGENCIA-FROTA.md`. Inteligência histórica: `INTELIGENCIA-FROTA.md`.

## 0. Estado atual em uma frase

[Certo] A tabela `motorista_localizacoes` **existe e está validada** (migration 0051, harness
local — 14 suítes SQL, 0 falhas), mas **só localmente**: não foi aplicada em produção e só será
mediante autorização explícita do Carlos, mesmo protocolo de 0047/0049/0050. As seções 1-6 abaixo
documentam a Fase 19 (só captura, zero persistência) tal como foram escritas então; a seção 7
documenta o que a Fase 20 mudou de fato.

## 1. O que existe hoje (Módulo 1)

`src/features/motorista-app/lib/localizacao.ts` (motor puro) +
`src/features/motorista-app/hooks/useGeolocalizacaoMotorista.ts` (hook React).

O hook chama `navigator.geolocation.getCurrentPosition`/`watchPosition` — a única parte deste
código que toca a API do navegador. Tudo o que decide se o resultado é confiável vive no motor
puro, testável sem navegador (`scripts/audit-motorista-inteligencia-frota.ts`, categorias 1-7).

Quatro estados, nunca mais que isso, nunca um quinto inventado silenciosamente:

- `LOCALIZACAO_DISPONIVEL` — posição obtida, coordenada dentro dos limites geográficos reais
  (latitude -90..90, longitude -180..180) e com no máximo 5 minutos de idade
  (`IDADE_MAXIMA_POSICAO_MS`).
- `LOCALIZACAO_INDISPONIVEL` — permissão concedida, mas o navegador não conseguiu obter a
  posição (GPS desligado, sinal fraco, timeout), OU a posição veio com coordenada inválida, OU
  veio "velha" demais para ser tratada como atual.
- `PERMISSAO_NEGADA` — o motorista negou explicitamente.
- `SEM_DADO` — o navegador não suporta `navigator.geolocation`, ou a captura ainda não foi
  solicitada.

**Nunca**: latitude/longitude 0, cidade padrão, coordenada fixa, posição simulada. Testado
explicitamente (categoria 23 da auditoria): em nenhum dos ramos de erro a posição retornada é um
valor inventado — é sempre `null`.

## 2. Persistência na Fase 19 — NÃO existia (decisão explícita, não esquecimento) [SUPERADO NA FASE 20 — ver seção 7]

O hook **não escreve em lugar nenhum**. A posição capturada fica em memória de React e some ao
fechar a aba. Isso é intencional: persistir localização exige uma tabela nova, e o Módulo 3 da
especificação desta fase é explícito — **"Se migration for realmente necessária: PARAR."**

A proposta de schema (não criada, não aplicada) está na auditoria, seção 5:

```sql
create table if not exists motorista_localizacoes (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  veiculo_id uuid references veiculos(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy numeric,
  origem text not null default 'PWA_GPS',
  capturado_em timestamptz not null,
  criado_em timestamptz not null default now(),
  constraint motorista_localizacoes_lat_check check (latitude between -90 and 90),
  constraint motorista_localizacoes_lng_check check (longitude between -180 and 180)
);
```

RLS proposta: exatamente o padrão "privacidade invertida" já usado por
`motorista_corridas`/`motorista_ganhos`/`motorista_recargas` — 1 policy do próprio motorista,
**zero policy de staff**. Se, no futuro, você decidir que staff PRECISA enxergar alguma forma de
localização (mesmo agregada), isso é uma segunda decisão, separada e explícita — quem, de qual
empresa, com que granularidade — não assumida por esta fase.

**Esta migration não foi criada.** Só será criada mediante sua aprovação explícita do schema
acima (ou de uma versão ajustada por você).

## 3. `LocationProvider` — abstração de origem (Módulo 3)

```ts
type OrigemLocalizacao = 'PWA_GPS' | 'TELEMETRIA' | 'OBD' | 'OUTRA';
```

Só `'PWA_GPS'` tem implementação real nesta fase — é a única fonte que existe de verdade
(confirmado pela auditoria: `telemetria_eventos` está vazia por design, sem produtor; nenhum
OBD/hardware de terceiros foi integrado). `'TELEMETRIA'`/`'OBD'`/`'OUTRA'` existem só como
vocabulário para quando (e se) uma fonte real existir — nenhum adapter fictício foi criado para
elas, conforme pedido explícito da especificação ("não criar adapter fictício para fontes
inexistentes").

## 4. Privacidade (Módulo 4)

- Localização é tratada como dado tão sensível quanto ganho/corrida registrados — mesma
  filosofia 0047/0048/0049/0050.
- A proposta de RLS (seção 2) nasce com zero visibilidade de staff.
- Nada nesta fase grava em `audit_log`, timeline administrativa, financeiro, jurídico ou
  notificação — o motor não grava em NADA (não há tabela ainda), então essa garantia é, por ora,
  automática.
- Risco registrado para quando a persistência existir: dar a staff qualquer visibilidade de
  localização (mesmo agregada) muda o modelo de privacidade que o motorista aceitou até aqui —
  merece consentimento explícito revisado, não só uma policy de RLS nova.

## 5. Limitações reais de navegador/PWA (declaradas, não escondidas)

- `navigator.geolocation` só funciona de forma confiável com a aba em primeiro plano. Não existe
  captura de localização em background confiável numa PWA instalada sem Background Geolocation
  API — que é experimental, atrás de flag, e não está disponível na maioria dos navegadores.
- O service worker atual (`public/sw.js`) é cache-only de shell, sem `sync`/`periodicSync` — não
  há como "acordar" o app em segundo plano para capturar localização periodicamente.
- iOS Safari em modo PWA tem histórico de restringir mais agressivamente permissões de
  localização que Android Chrome — nenhum teste em device real foi feito nesta fase (fora do
  escopo de uma sessão de código); validar manualmente antes de qualquer expectativa de produto
  sobre precisão/frequência.

## 6. Próximos passos (registrados na Fase 19 — status atualizado na seção 7)

1. ~~Decidir se e quando aprovar a migration proposta (seção 2).~~ Feito nesta fase, só local
   (migration 0051 — ver seção 7.1). Produção segue pendente de autorização.
2. Decidir explicitamente o nível de visibilidade de staff — **decidido nesta fase**: staff vê a
   localização dos veículos da PRÓPRIA empresa, via relação real
   empresa→contrato→motorista→veículo, nunca agregada/anônima (ver seção 7.2).
3. Testar em dispositivo iOS real antes de qualquer expectativa de produto sobre confiabilidade —
   **ainda não feito** (fora do escopo de uma sessão de código; ver seção 7.6).

## 7. Fase 20 — a persistência agora existe (Módulos 1-8/18/19)

> Auditoria completa: `claude/auditoria-fase20-localizacao-operacional.md`. Migration:
> `supabase/migrations/0051_frota_localizacao_operacional.sql`. Testes SQL:
> `supabase/tests/69_frota_localizacao.sql` (10 grupos). Testes TS:
> `scripts/audit-frota-localizacao-fase20.ts`.

### 7.1 Schema real (Módulo 1) — o que a proposta da seção 2 virou de fato

Diferenças da proposta original: `veiculo_id`/`empresa_id`/`contrato_id` viraram `not null`
(sempre preenchidos pelo trigger, nunca pelo cliente), `capturado_em` virou
`timestamp_localizacao`, `accuracy` virou `accuracy_m`, e há uma constraint nova de clock skew.

```sql
create table motorista_localizacoes (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null default public.current_motorista_id() references motoristas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete cascade,   -- sempre derivado do contrato (trigger)
  empresa_id uuid not null references empresas(id) on delete cascade,  -- sempre derivado do contrato (trigger)
  contrato_id uuid not null references contratos(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision,                    -- metros; null quando a origem não informa
  timestamp_localizacao timestamptz not null,      -- momento em que o DISPOSITIVO capturou
  origem text not null default 'PWA_GPS' check (origem in ('PWA_GPS','TELEMETRIA','OBD','OUTRA')),
  criado_em timestamptz not null default now(),    -- momento em que o SERVIDOR recebeu
  constraint chk_localizacao_latitude check (latitude between -90 and 90),
  constraint chk_localizacao_longitude check (longitude between -180 and 180),
  constraint chk_localizacao_accuracy check (accuracy_m is null or accuracy_m >= 0),
  constraint chk_localizacao_timestamp_futuro check (timestamp_localizacao <= now() + interval '5 minutes')
);
```

Só `'PWA_GPS'` tem produtor real (mesma conclusão da Fase 19, seção 3) — `'TELEMETRIA'`/`'OBD'`/
`'OUTRA'` seguem só vocabulário reservado.

**Última posição conhecida (Módulo 2)**: NÃO é uma segunda tabela. É uma query
(`select distinct on (veiculo_id) * from motorista_localizacoes order by veiculo_id,
timestamp_localizacao desc`), coberta pelo índice `idx_motorista_localizacoes_veiculo`. Decisão
deliberada: uma segunda tabela mutável duplicaria dado e criaria risco de dessincronia — "história
não se apaga" (tabela é insert-only, zero policy de UPDATE/DELETE para qualquer papel).

### 7.2 RLS dual — o módulo mais importante da fase

```sql
-- INSERT: só o próprio motorista, em nome do próprio motorista_id
create policy "motorista_localizacoes: motorista insere o proprio" on motorista_localizacoes
  for insert with check (motorista_id = public.current_motorista_id());

-- SELECT: o próprio motorista...
create policy "motorista_localizacoes: motorista ve o proprio" on motorista_localizacoes
  for select using (motorista_id = public.current_motorista_id());

-- ...OU a empresa do contrato, mas SÓ staff (eh_staff() — role <> 'motorista' and ativo = true)
create policy "motorista_localizacoes: empresa ve a propria frota" on motorista_localizacoes
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
```

**Achado real de segurança, encontrado testando (não lendo)**: a primeira versão da 3ª policy era
só `empresa_id = current_empresa_id()`, sem `eh_staff()`. Como `usuarios.empresa_id` também é
preenchido para contas de motorista (0004), essa policy sozinha deixava um motorista enxergar a
localização de TODOS os outros motoristas da própria empresa (policies SELECT permissivas se
combinam com OR) — vazando exatamente o isolamento motorista×motorista que o Módulo 3 exige. É a
MESMA classe de bug que `0039_fase1_seguranca_portal_motorista.sql` já tinha documentado e
corrigido para `contratos`/`storage.objects` ("um motorista logado podia ler CNH de todos os
motoristas"). Corrigido com o mesmo padrão: `eh_staff()`. [Certo] — confirmado por teste de IDOR
falhando antes da correção e passando depois (`supabase/tests/69_frota_localizacao.sql`, grupo de
isolamento motorista×motorista).

Testado e confirmado (suíte 69, 10 grupos): Empresa A nunca vê Empresa B; Motorista A nunca vê
Motorista B (mesmo da mesma empresa); staff vê exatamente os veículos da própria empresa via
contrato real, nunca por um `empresa_id` "solto"; motorista NUNCA satisfaz a policy de staff
mesmo tendo `usuarios.empresa_id` preenchido; forjar `contrato_id`/`motorista_id` no INSERT é
rejeitado pelo trigger (seção 7.3), não só pela RLS.

### 7.3 Trigger de validação de vínculo (Módulos 3/5/18/19/20)

`fn_validar_localizacao_operacional()` (BEFORE INSERT, `security definer`) roda ANTES de
qualquer escrita chegar à tabela e faz o que a RLS sozinha não garante — que a RELAÇÃO
empresa→contrato→motorista→veículo é real e está ativa:

1. Contrato existe? Senão, rejeita.
2. Contrato pertence ao `motorista_id` informado? Senão, rejeita (fecha IDOR via `contrato_id`
   forjado).
3. Contrato está `status = 'ativo'`? Senão, rejeita — Módulo 5 ("contrato encerrado → não
   persistir").
4. Motorista não está `bloqueado`/`encerrado`? Senão, rejeita.
5. `usuarios.ativo = true` para esse motorista? Senão, rejeita — Módulo 5 ("motorista
   desativado → parar acesso"). Redundante de propósito com o que `current_motorista_id()` já
   garante via RLS (0045 corrigiu essa função para checar `ativo`, ver seção 7.5) — defesa em
   profundidade, não depende de uma única camada continuar correta para sempre.
6. Só então: `new.veiculo_id`/`new.empresa_id` são SOBRESCRITOS a partir do contrato. O que o
   cliente mandar nesses dois campos (se mandar) é sempre ignorado.

### 7.4 Captura e persistência (Módulo 6/7) — reuso, não um segundo sistema de GPS

Nenhum novo código de acesso a `navigator.geolocation`. O fluxo é:
`useGeolocalizacaoMotorista` (Fase 19, motor puro `localizacao.ts` + hook) → novo hook
`useLocalizacaoOperacional(contratoId)` (`src/features/motorista-app/hooks/`) → nova API
`gravarLocalizacaoOperacional()` (`src/features/motorista-app/api/localizacaoOperacional.ts`).

Frequência (Módulo 7 — conservadora, foreground-priority):

- Tenta uma nova leitura de GPS a cada 3 minutos, **só com a aba visível**
  (`document.visibilityState`, mesmo padrão do heartbeat de presença — nunca `setInterval` cego
  em segundo plano).
- Só GRAVA (POST real no banco) quando o motorista se moveu ≥150m (reusa `distanciaEntrePontos`,
  Módulo 12/14 da Fase 19 — nenhum segundo cálculo de distância) OU quando já se passaram ≥10min
  desde a última gravação, mesmo parado — evita a "última atualização" ficar velha pra sempre
  sem também gravar uma linha nova a cada leitura de GPS.
- Nunca grava coordenada inválida: se `useGeolocalizacaoMotorista` não está em
  `LOCALIZACAO_DISPONIVEL`, não há o que gravar.

Limitações reais de PWA/background (seção 5, Fase 19) continuam valendo sem alteração — a Fase 20
não resolveu isso, só desenhou a cadência em torno dessa limitação real.

### 7.5 Consentimento (Módulo 4) — nunca "já autorizado" silenciosamente

Estados exatamente estes quatro, mostrados no card do motorista (seção 7.7):
`NAO_COMPARTILHADA` (padrão — nada é enviado até o motorista clicar "Compartilhar localização"),
`COMPARTILHADA` (ativo, capturando), `PERMISSAO_NEGADA`, `INDISPONIVEL` (sem suporte do
navegador, ou GPS/sinal indisponível). Nenhuma linguagem alarmista — só o fato.

Deliberadamente **não persistido em `localStorage` entre sessões**: o resto do app do motorista
evita `localStorage`/`window` de propósito (mesma disciplina de `lib/carrinho.tsx`/`lib/metas.ts`)
e persistir "já autorizei antes" faria o compartilhamento recomeçar sozinho na próxima visita sem
o motorista ver de novo que está acontecendo — pedir de novo a cada sessão é o comportamento
mais transparente, não uma limitação esquecida.

Correção registrada durante a auditoria (seção 20 de `auditoria-fase20-...md`): a leitura inicial
de que `current_motorista_id()`/`current_empresa_id()` não checavam `usuarios.ativo` estava
errada — 0045/0008 já tinham feito `create or replace function` acrescentando `and ativo = true`
depois da versão original de 0034/0001. "Eu estava errado" registrado explicitamente na auditoria
quando a releitura corrigiu isso.

### 7.6 O que continua igual da Fase 19 (não mudou)

- Zero captura em segundo plano confiável numa PWA instalada — `public/sw.js` continua
  cache-only, sem `sync`/`periodicSync`.
- iOS Safari em modo PWA: nenhum teste em device real foi feito. Validar manualmente antes de
  qualquer expectativa de produto sobre precisão/frequência.
- `'TELEMETRIA'`/`'OBD'`/`'OUTRA'` continuam vocabulário reservado, sem adapter algum.

### 7.7 UI do motorista (Módulo 18/19)

Card pequeno "Localização operacional" (`LocalizacaoOperacionalCard.tsx`), montado no Centro de
Controle (`CentroControlePage.tsx`) — não um dashboard, conforme o Módulo 18 pede explicitamente.
Mostra status (com as 4 pills do consentimento), última atualização, precisão em metros, botão
ativar/parar, e o texto de reciprocidade (Módulo 19 — "quem pode ver minha localização?"):

> "Quando disponível, sua localização pode ser usada para recursos operacionais relacionados ao
> veículo e ao contrato. Quem pode ver: você mesmo, e a empresa do seu contrato ativo — nunca
> outras empresas, nem outros motoristas."

Sem contrato ativo: card mostra "Sem contrato ativo — localização operacional não se aplica
agora." e não oferece o botão de ativar (nada é enviado sem um contrato real por trás — o trigger
rejeitaria de qualquer forma, mas a UI já não oferece a ação).

### 7.8 Retenção (Módulo 22)

Não decidida nesta fase. Sem TTL automático, sem expurgo automático — "história não se apaga" é
proposital (zero policy de DELETE). **[VALIDAR COM ADVOGADO]** antes de qualquer política de
retenção/expurgo — não inventado aqui.

### 7.9 Produção (Módulo 28)

Migrations 0051/0052 **não foram aplicadas em produção**. Só validadas no harness local
(Postgres 16.13, migrations 0001→0052 aplicadas do zero, 14 suítes SQL incluindo a 69, 0
falhas). Aplicar em produção exige autorização explícita do Carlos — mesmo protocolo já usado em
0049/0050.

## 8. Fase 20 — 2ª passada (view derivada + histórico sob demanda)

> Migration nova: `supabase/migrations/0052_frota_localizacao_view.sql`.

**Última posição, revisitada**: a seção 7.1 já dizia que "última posição" é uma QUERY, não uma
tabela — a 2ª passada só trocou COMO essa query é feita. A 1ª passada buscava até 500 linhas
cruas ordenadas por `timestamp_localizacao` e deduplicava em memória (JS) — bug real: numa frota
grande, as últimas 500 CAPTURAS podiam vir todas de poucos veículos muito ativos, escondendo a
última posição de um veículo que só capturou há mais tempo (o card "SEM LOCALIZAÇÃO" mentiria
pra esse veículo). A view `motorista_localizacoes_atual` (`DISTINCT ON (veiculo_id)`,
`security_invoker=true`) faz essa dedução NO BANCO — sempre uma linha por veículo, sempre a mais
recente, independente do tamanho da frota. `security_invoker=true` garante que a view roda com o
privilégio de QUEM CONSULTA — as mesmas 3 policies RLS da tabela base se aplicam sem alteração
(testado nos 3 papéis: motorista, staff da própria empresa, staff de outra empresa).

**Histórico por veículo, sob demanda**: `getHistoricoLocalizacoes(veiculoId)` — nova função,
nunca chamada automaticamente. No painel de detalhe do Centro de Inteligência, um botão "Ver
histórico" dispara a consulta (`enabled: false` no `useQuery` até o clique). Mostra data/hora,
latitude, longitude e precisão das últimas 200 capturas daquele veículo. Desenhar o percurso no
mapa (polyline) não foi construído nesta passada — ficou só a tabela.

**schemaGuard, agora compartilhado**: vivia em `motorista-app/api/schemaGuard.ts` desde a
correção de 2026-08-20 (único consumidor até a Fase 19). Movido para `src/shared/lib/
schemaGuard.ts` pra ser reusado pelo lado staff também — a API de frota agora usa
`lerTolerante()` do mesmo arquivo em vez de um check ad-hoc próprio.
