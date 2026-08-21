# Inteligência Histórica da Frota — Fase 19, Módulos 8/9/10/11/12/13/17

> Auditoria completa: `claude/auditoria-fase19-inteligencia-frota.md`. Presença/heartbeat:
> `CENTRO-INTELIGENCIA-FROTA.md`. Localização/persistência: `LOCALIZACAO-OPERACIONAL.md`.

## 0. A limitação estrutural que precisa ficar clara antes de tudo

[Certo] `inteligenciaFrotaHistorica()` (Módulo 9) foi construída e testada, mas **hoje não existe
nenhum caminho de dado real para alimentá-la com corridas de múltiplos motoristas**.
`motorista_corridas`/`motorista_ganhos`/`motorista_recargas` têm exatamente 1 policy de RLS cada
(o dono) e **zero policy de staff** — "privacidade invertida", construída deliberadamente nas
Fases 16-18. Nenhuma conta de staff consegue hoje fazer SELECT nessas tabelas.

Isso não é um bug desta fase nem das anteriores — é o sistema funcionando exatamente como
projetado ("corrida é dado pessoal, staff nunca vê"). Mas significa que o motor abaixo, embora
correto e testado, **não tem hoje nenhum dado de frota real para processar**. Ligá-lo a dado real
exige uma decisão de produto sobre RLS que nenhuma fase decide sozinha — precisa ser sua, e
explícita (ver auditoria, seção 0/5).

## 1. Módulo 8 — Histórico operacional (reuso, sem tabela nova)

Nenhuma tabela nova. `RegistroOperacionalFrota` (o formato de entrada do motor abaixo) é
agnóstico de fonte — mesmo shape de uma corrida individual (`data`, `hora`, `valor`,
`duracaoEstimadaMin`) mais `motoristaId`, porque esta é uma agregação ENTRE motoristas.
Deliberadamente não importa `CorridaHistorico` (o tipo por-motorista da Fase 17) para não
acoplar este motor a um tipo que hoje só existe dentro do contexto de privacidade invertida.

## 2. Módulo 9 — `inteligenciaFrotaHistorica()`

`src/features/frota/lib/inteligenciaFrota.ts`. Motor puro, testado com fixtures sintéticas
(`scripts/audit-motorista-inteligencia-frota.ts`, categorias 15/19/20).

Agrega por faixa de horário (REUSA `FAIXAS_HORARIO` da Fase 17 — não redefine as 7 faixas) e por
dia da semana (REUSA `DIA_SEMANA_LABEL`), calculando: `qtdRegistros`, `valorTotal`,
`valorMedioPorRegistro`, `rpHora`, `motoristasUnicos` e **`concentracaoOperacional`** — a fração
dos registros da faixa vinda do motorista mais presente nela. Esse último campo existe porque uma
"média da frota" com 80% dos registros vindos de 1 motorista não é uma leitura da frota, é a
leitura de 1 pessoa disfarçada de agregado — qualquer UI que consumir isto precisa mostrar esse
número junto, nunca escondê-lo.

Classificação de amostra (`classificarAmostra`, REUSADA da Fase 17, mesmos limiares 3/7/14) em
cada faixa/dia — nenhuma leitura conclusiva sobre amostra insuficiente.

Exemplo (com dado sintético de teste, não real):

```
18h–21h
4 registros · 3 motoristas distintos
Concentração operacional: 50% (2 dos 4 registros vieram do mesmo motorista)
DADO HISTÓRICO
```

Nunca: "esse horário tem demanda agora."

## 3. Módulo 10 — Região (NÃO implementado)

Não inventada. Sem localização real persistida (ver `LOCALIZACAO-OPERACIONAL.md`), não há como
agrupar geograficamente nada com honestidade. Quando existir, as opções a avaliar (nesta ordem de
complexidade crescente) são: geohash, grid fixo, bairro (via reverse geocoding — pago, evitar
sem necessidade real) ou uma "região operacional" definida manualmente por você. Primeiro
armazenar localização (Módulo 3), depois — só depois — transformar em região.

## 4. Módulo 11 — `oportunidadeOperacional()`

Empacota um `ResumoFrotaFaixaHorario` já calculado (nunca recalcula nada) na taxonomia
`OPORTUNIDADE HISTORICA`. Retorna `null` quando a amostra é insuficiente (nunca gera opinião
sobre pouco dado). Todo texto gerado contém "leitura do que já aconteceu, não uma indicação de
demanda atual" — testado literalmente (auditoria, categoria 16).

**Nome deliberadamente diferente do `Opportunity` já existente em
`@/shared/intelligence/types.ts`** (consumido por `features/frota/intelligence/opportunities.ts`).
Aquele é sobre oportunidade FINANCEIRA de ativo — "bom momento pra vender este veículo", campo
`categoria: HealthCategoriaId`, `valorEstimado` em R$ de venda. Forçar o mesmo tipo pros dois
conceitos só porque compartilham a palavra "oportunidade" misturaria dois domínios que não têm
nada a ver um com o outro — por isso `OportunidadeOperacionalHistorica` é um tipo novo, não uma
extensão do existente.

## 5. Módulo 12 — `distanciaEntrePontos()`

`src/features/frota/lib/geo.ts`. Fórmula de Haversine (distância em linha reta, não rota de
trânsito — isso exigiria uma API de rotas externa, fora do escopo de fundação). `null` quando
qualquer coordenada é inválida; exatamente `0` quando A e B coincidem. Testado contra uma fixture
matematicamente exata (1 grau de longitude no equador ≈ 111,19 km) e contra o caso degenerado
A→A.

Uso futuro pretendido ("Carro A está 2,1 km", "Carro B está 6,8 km") — **nunca vira recomendação
automática sozinho**; é só a matemática.

## 6. Módulo 13 — `RecomendacaoOperacional` (contrato, sem gerador)

```ts
type TipoRecomendacaoOperacional = 'MOVER' | 'AGUARDAR' | 'OPORTUNIDADE' | 'OCIOSIDADE' | 'DISPONIBILIDADE' | 'MANUTENCAO';

type RecomendacaoOperacional = {
  id: string;
  tipo: TipoRecomendacaoOperacional;
  origem: OrigemDadoFrota;
  dadosBase: number;
  distancia: number | null; // via distanciaEntrePontos(), nunca recalculada
  qualidadeDaBase: ClassificacaoAmostra;
  mensagem: string;
  acaoDisponivel: string | null;
};
```

**Nesta fase: nenhuma função produz este tipo.** Não enviar, não executar, não notificar, não
direcionar — só o formato, para o código futuro (Fase 20+) ter um contrato acordado desde já.

## 7. Módulo 17 — Taxonomia de origem

```ts
type OrigemDadoFrota =
  | 'DADO REGISTRADO' | 'DADO IMPORTADO' | 'DADO HISTORICO' | 'PREMISSA'
  | 'ESTIMATIVA' | 'SIMULACAO' | 'OPORTUNIDADE HISTORICA' | 'NAO DISPONIVEL' | 'SEM DADO';
```

Mais ampla que a taxonomia por-motorista das Fases 17/18 porque esta fase precisa distinguir
"histórico" de "oportunidade histórica" (uma leitura sobre o histórico, nunca uma previsão) e
"não disponível" (fonte que não existe, ex.: Uber/99/telemetria) de "sem dado" (fonte existe, mas
está vazia agora). Categorias nunca misturadas.

## 8. Testes

`scripts/audit-motorista-inteligencia-frota.ts` — 48/48. Cobre os 26 casos do Módulo 19 da
especificação (GPS em todos os estados, isolamento de RLS por grep estrutural, distância exata,
ausência de dados, vocabulário "demanda" vs. "oportunidade histórica", Uber/99 não integrados,
zero coordenada inventada, zero motor/dashboard/query duplicados).

## 9. Uber/99 (Módulo 15)

Confirmado por ausência total: nenhuma chamada a API de app de corrida em nenhum lugar do
repositório. `motorista_corridas` continua sendo, e só pode ser, DADO REGISTRADO MANUALMENTE.

## 10. Telemetria (Módulo 16)

`telemetria_eventos` existe como tabela, RLS habilitada, mas zero produtor e zero consumidor —
confirmado por grep em todo `src/`. Nenhum código desta fase tenta ler dela. Estado a mostrar em
qualquer UI futura: "TELEMETRIA NÃO DISPONÍVEL".
