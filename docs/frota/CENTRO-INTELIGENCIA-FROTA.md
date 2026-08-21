# Centro de Inteligência da Frota — Fase 19, Módulos 2/5/6/7 (arquitetura)

> Auditoria completa: `claude/auditoria-fase19-inteligencia-frota.md`. Histórico/oportunidade:
> `INTELIGENCIA-FROTA.md`. Localização/persistência: `LOCALIZACAO-OPERACIONAL.md`.

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

## 2. Centro de Inteligência da Frota (Módulo 6) — arquitetura, não tela

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

## 3. Mapa (Módulo 7) — comparação técnica, nada adicionado

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

## 4. Performance (Módulo 20)

Zero biblioteca nova adicionada (confirmado: `package.json` sem diff de dependência nesta fase).
Hooks de geolocalização/visibilidade só chamam APIs nativas do navegador sob demanda — nunca
polling automático agressivo. Bundle do app do motorista: sem impacto mensurável, porque nenhuma
tela ainda importa os arquivos novos desta fase (build confirmado limpo, mesmo tamanho de chunk).
