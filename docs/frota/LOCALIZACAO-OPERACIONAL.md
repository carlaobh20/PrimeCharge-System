# Localização Operacional — Fase 19, Módulos 1/3/4

> Auditoria completa: `claude/auditoria-fase19-inteligencia-frota.md`. Este documento cobre só
> os Módulos 1 (Localização Real), 3 (Localização Operacional/`LocationProvider`) e 4
> (Privacidade) — os Módulos 2/5 (Presença/Heartbeat) e 9/11/12/13 (Inteligência) têm seus
> próprios documentos (`CENTRO-INTELIGENCIA-FROTA.md` e `INTELIGENCIA-FROTA.md`).

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

## 2. Persistência — NÃO existe (decisão explícita, não esquecimento)

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

## 6. Próximos passos

1. Decidir se e quando aprovar a migration proposta (seção 2).
2. Se aprovada, decidir explicitamente o nível de visibilidade de staff (nenhuma? agregada?
   por presença apenas?) — segunda decisão, não incluída na proposta.
3. Testar em dispositivo iOS real antes de qualquer expectativa de produto sobre confiabilidade.
