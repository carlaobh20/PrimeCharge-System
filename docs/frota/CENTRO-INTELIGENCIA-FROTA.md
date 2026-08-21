# Centro de Inteligência da Frota — Fases 19 (arquitetura) e 20 (UI real)

> Auditorias completas: `claude/auditoria-fase19-inteligencia-frota.md` (fundação/arquitetura) e
> `claude/auditoria-fase20-localizacao-operacional.md` (UI real + mapa). Histórico/oportunidade:
> `INTELIGENCIA-FROTA.md`. Localização/persistência: `LOCALIZACAO-OPERACIONAL.md`.
>
> **A seção 2 abaixo (Fase 19) descrevia uma tela que ainda não existia — hoje existe. Ver
> seção 5.** As seções 1/3/4 (presença local, comparação de mapa, performance) continuam
> descrevendo a arquitetura de base, ainda válida.

## 1. Presença (Módulos 2/5)

`presencaMotorista()` (`src/features/frota/lib/presenca.ts`) — motor puro, nunca lê relógio,
recebe a última evidência de atividade e o "agora" como parâmetros do chamador (mesmo padrão de
pureza do `assistenteContextual()`, Fase 18).

```ts
type EstadoPresenca = 'SEM_DADO' | 'ONLINE' | 'SEM_ATUALIZACAO' | 'OFFLINE';
```

**`ONLINE` nunca significa "está trabalhando"** — significa só "há evidência recente de
atividade no aplicativo". Janelas declaradas explicitamente (não escondidas dentro da função,
ajustáveis pelo chamador): até 2 minutos de evidência → `ONLINE`; de 2 a 15 minutos →
`SEM_ATUALIZACAO` (evidência existe, mas está velha — nunca chamado de "offline" só porque o
navegador ficou em segundo plano por alguns minutos); acima de 15 minutos → `OFFLINE`.

**Corte inicial, mesma disciplina de `classificarAmostra` (Fase 17):** um valor precisa existir
para o sistema funcionar, é declarado explicitamente aqui, e pode ser revisto por decisão de
produto — não é uma verdade absoluta descoberta por dado real (não existe dado real de presença
suficiente ainda para calibrar estatisticamente essas janelas).

### Heartbeat (Módulo 5)

`useHeartbeatVisibilidade()` (`src/features/motorista-app/hooks/useHeartbeatVisibilidade.ts`) —
usa a Page Visibility API (`document.visibilityState`), não `setInterval` agressivo: o
"heartbeat" é o próprio evento `visibilitychange`, mais uma atualização a cada 60s **só enquanto
a aba está visível** (para a janela de presença não expirar sozinha com o app aberto e parado).

**Só existe no dispositivo do motorista, em memória, nesta fase.** Não é transmitido a staff
nenhum — não há tabela aprovada para isso (mesma limitação do Módulo 1/3, ver
`LOCALIZACAO-OPERACIONAL.md`). Prova que o CONCEITO funciona; não prova que ele já alcança um
painel administrativo.

## 2. Centro de Inteligência da Frota (Módulo 6, Fase 19) — arquitetura, não tela [SUPERADO — ver seção 5]

A especificação desta fase é explícita: **"NÃO criar dashboard gigante nesta fase. Primeiro
criar estrutura reutilizável."** Por isso, nesta fase:

- **Nenhuma rota nova foi criada.** `src/features/frota/pages/FrotaPage.tsx` já tem uma tab
  "Inteligência da Frota" com o placeholder "em construção" (`?tab=inteligencia`) — é o ponto de
  montagem natural para uma fase futura de UI. Confirmado que ele continua sendo o único ponto
  de entrada (auditoria de regressão, categoria 25).
- **`FrotaPage.tsx` não foi tocado.** Decisão de escopo: eu não tinha lido esse arquivo a fundo
  antes desta fase, e o próprio módulo pede pra adiar a tela — editar um arquivo staff que já
  funciona, por um ganho que a especificação pede pra não entregar ainda, é risco sem retorno.

Visão futura (documentada aqui como contrato conceitual — **nenhum tipo TypeScript foi criado
para isto ainda**, porque um tipo sem consumidor real é documentação disfarçada de código):

```
FROTA TOTAL — contagem real, já disponível hoje via veiculos (empresa_id do staff)
ONLINE / SEM ATUALIZAÇÃO / OFFLINE — via presencaMotorista(), SÓ quando existir uma fonte de
  evidência que chegue a staff (hoje não existe — ver seção 1)
EM OPERAÇÃO / PARADOS — mapeável a veiculos.status (ex.: 'alugado' ≈ em operação), dado que já
  existe hoje
SEM LOCALIZAÇÃO — estado honesto enquanto Módulo 3 não for aprovado (ver LOCALIZACAO-OPERACIONAL.md)
MAPA — Módulo 7, ver seção 3 abaixo
OPORTUNIDADES — via oportunidadeOperacional(), quando houver dado de frota real (ver
  INTELIGENCIA-FROTA.md, seção 0 — hoje bloqueado por RLS)
ALERTAS — reusar o mesmo formato genérico de Alerta já usado por
  features/frota/intelligence/alerts.ts (@/shared/intelligence/types.ts), não inventar um novo
HISTÓRICO — via inteligenciaFrotaHistorica()
```

Se não houver localização real suficiente quando essa tela for construída: mostrar
"Localização operacional ainda não disponível." — nunca inventar pontos no mapa.

## 3. Mapa (Módulo 7, Fase 19) — comparação técnica [DECISÃO EXECUTADA NA FASE 20 — ver seção 5.3]

Nenhuma biblioteca de mapa existe no projeto hoje (confirmado: zero ocorrência de `leaflet`,
`maplibre-gl`, `mapbox-gl`, `@react-google-maps/api`, `deck.gl` em `package.json`).

| | MapLibre GL JS | Leaflet |
|---|---|---|
| Licença | BSD-3 | BSD-2 |
| Renderização | WebGL (vetorial, bundle maior, ~200KB+ gzip) | Canvas/SVG (mais leve, ~40KB gzip) |
| Tiles | Vetoriais (requer provedor — MapTiler ou self-hosted) | Raster (qualquer provedor simples, ex. OpenStreetMap) |
| Recomendação | — | **Leaflet**, quando o mapa for construído: bundle bem menor (alinhado ao Módulo 20 — "não adicionar biblioteca pesada sem necessidade") e o volume inicial de pontos (frota de uma empresa) não justifica renderização vetorial. Reavaliar se o volume de pontos crescer muito. |

**Nenhuma das duas foi adicionada ao `package.json` nesta fase.** Quando o mapa for construído:
carregamento LAZY obrigatório (nunca no bundle inicial do app do motorista — o motorista não
precisa de mapa, só o painel de staff).

## 4. Performance na Fase 19 (Módulo 20) [ATUALIZADO NA FASE 20 — ver seção 5.4]

Zero biblioteca nova adicionada (confirmado: `package.json` sem diff de dependência nesta fase).
Hooks de geolocalização/visibilidade só chamam APIs nativas do navegador sob demanda — nunca
polling automático agressivo. Bundle do app do motorista: sem impacto mensurável, porque nenhuma
tela ainda importa os arquivos novos desta fase (build confirmado limpo, mesmo tamanho de chunk).

## 5. Fase 20 — a tela agora existe

> Auditoria completa: `claude/auditoria-fase20-localizacao-operacional.md`. Componente:
> `src/features/frota/components/inteligencia/CentroInteligenciaFrota.tsx`. Mapa:
> `.../MapaFrota.tsx`. Motor: `src/features/frota/lib/localizacaoFrota.ts`. Dados:
> `src/features/frota/api/localizacaoFrota.ts`.

### 5.1 Onde entra

`FrotaPage.tsx` (a mesma tab "Inteligência da Frota" que a Fase 19 já tinha criado como
`?tab=inteligencia`) — o `EmptyState` "em construção" foi substituído por
`<CentroInteligenciaFrota />`. Nenhuma rota nova. Nenhuma outra tab/tela tocada.

### 5.2 Módulo 9 — os 4 cards (motor `resumoFrota()`)

`frescorLocalizacao(timestampMs, agoraMs)` classifica cada veículo em 4 estados (nunca um
quinto): `LOCALIZACAO_ATUAL` (≤2min), `LOCALIZACAO_RECENTE` (≤15min), `SEM_ATUALIZACAO` (mais
velho que isso, mas existe registro), `SEM_LOCALIZACAO` (nenhum registro ainda). Janelas
deliberadamente alinhadas com `JANELAS_PRESENCA_PADRAO` (Fase 19) — mesma ideia de "evidência
recente", aplicada a uma captura de localização em vez de um heartbeat de página.

Os 4 cards (Total de veículos / Localização ativa / Sem atualização / Sem localização) são
clicáveis e funcionam como filtro rápido (Módulo 12) — clicar de novo no mesmo card volta pra
"todos". `localizacaoAtiva` soma ATUAL+RECENTE ("tem localização utilizável agora"); cada veículo
cai em exatamente uma categoria, nunca contado duas vezes.

### 5.3 Módulo 10/11 — o mapa

Leaflet foi escolhido e adicionado (`npm install leaflet @types/leaflet` — 1.9.4, zero
dependências transitivas), confirmando a recomendação da seção 3: bundle menor, raster/OSM em vez
de vetorial, volume de pontos de uma frota não justifica WebGL.

- **Carregamento lazy real, não só declarado**: `const MapaFrota = lazy(() =>
  import('./MapaFrota'))` dentro de `CentroInteligenciaFrota.tsx` — confirmado por inspeção do
  `dist/assets/` depois de `vite build`: leaflet vive isolado no próprio chunk, não aparece nem no
  chunk inicial de `FrotaPage`, nem em nenhum chunk do app do motorista. Esse grep sobre o build
  real virou um caso permanente em `scripts/audit-frota-localizacao-fase20.ts`.
- **Marcadores**: `L.divIcon` com um círculo colorido inline (verde=ATUAL, azul=RECENTE,
  âmbar=SEM_ATUALIZACAO) em vez do ícone PNG padrão do Leaflet — evita o problema clássico desse
  ícone quebrar em bundlers Vite sem configuração extra, e já comunica o estado pela cor.
- **View inicial**: Brasil inteiro, zoom 4, `fitBounds` só quando existe pelo menos 1 marcador —
  nunca uma cidade "padrão" inventada quando não há dado.
- **Nunca no app do motorista**: `MapaFrota.tsx` só é importado por `CentroInteligenciaFrota.tsx`
  (lado staff); nenhum arquivo de `motorista-app/` o importa.

### 5.4 Módulo 12/13 — filtros e lista sincronizada com o mapa

Filtros: busca por placa/motorista (texto livre), status do veículo (só aparece se houver mais de
1 status distinto — dropdown de 1 opção não serve pra nada), e os 4 cards como filtro rápido de
localização. **Sem filtro de Empresa**: a RLS já garante que esta tela mostra exatamente 1
empresa (a do staff logado via `current_empresa_id()`) — um filtro pra uma única opção fixa não
tem função.

Lista (coluna esquerda) e mapa (coluna direita) ficam sincronizados nos dois sentidos: clicar num
item da lista seleciona o marcador correspondente (troca o ícone, sem refazer `fitBounds` — evita
o mapa "pular" a cada clique); clicar num marcador seleciona o mesmo item na lista. Selecionar
abre um painel de detalhe com Veículo/Motorista/Contrato (via nome)/Status operacional/
Presença/Localização/Última atualização/Precisão.

Presença no painel de detalhe reusa `presencaMotorista()` (Fase 19) tomando a recência da própria
captura de localização como evidência — é a única evidência de atividade que hoje chega até staff
(o heartbeat de visibilidade continua só local ao dispositivo do motorista, seção 1). Honesto:
mostra "Sem dado" quando não há nenhuma localização, nunca "offline" inventado.

### 5.5 "Tempo quase real" (Módulo 26) — polling, não Realtime

`useQuery` com `refetchInterval: 30_000` e `refetchIntervalInBackground: false` — confirma a
decisão já registrada na auditoria (Fase 19, seção 9-10; reconfirmada na auditoria da Fase 20):
zero uso de Supabase Realtime em todo o projeto até hoje, e nenhum canal WebSocket próprio foi
criado. O "agora" usado pra recalcular frescor/presença também só é atualizado a cada 15s e só
com a aba visível — mesmo padrão de `useHeartbeatVisibilidade`, nunca um `setInterval` cego
rodando em segundo plano.

### 5.6 Estado vazio honesto

Quando a frota tem veículos mas nenhum tem localização/atualização recente: "Localização
operacional ainda não disponível para nenhum veículo desta frota." — nunca um mapa vazio sem
explicação, nunca um ponto inventado.

### 5.7 Performance real (atualização da seção 4)

`npm run build` confirmado limpo depois de todas as mudanças desta fase; leaflet isolado no
próprio chunk (seção 5.3). Nenhuma tela do app do motorista importa qualquer arquivo novo desta
seção — confirmado por grep, não assumido.
