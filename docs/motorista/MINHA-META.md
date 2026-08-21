# MINHA META — Inteligência Financeira Pessoal do Motorista

> **Fase 17 — Copiloto Inteligente do Motorista** (2026-08-21, **2ª passada — reconciliação**;
> **ZERO migration** — tudo derivado de 0049/0050, já aplicadas em produção): motor puro novo em
> `metas.ts` — `historicoPorPeriodo`/`compararPeriodoCorridas` (Módulo A, histórico 7/14/30/90d
> com "SEM COMPARAÇÃO" quando o período anterior não tem corrida; renomeada de
> `resumoPeriodoCorridas` nesta 2ª passada), `inteligenciaPorHorario` (Módulo B, 7 faixas fixas)
> e `inteligenciaPorDiaSemana` (Módulo C) — sempre "MAIOR MÉDIA REGISTRADA", nunca "melhor
> horário/dia"; `classificarAmostra` (dados_insuficientes <3 · base_inicial 3–6 ·
> base_consistente 7–13 · base_relevante 14+); `qualidadeBaseCopiloto` (Módulo G, só descreve o
> que está preenchido, nunca dá nota); `insightsCopiloto` (Módulo F, motor puro que CONSOME os
> anteriores — 9 tipos de insight, cada um com `id` único e `classificacaoAmostra`, vocabulário
> proibido testado). UI em 3 componentes: `CopilotoInteligenteCard.tsx` é literalmente "Seu
> Copiloto" (Módulos D+E — meta conectada + insights); `CopilotoCard.tsx` (avaliar/registrar
> corrida, Fase 16) ganhou o impacto matemático da corrida sobre a meta (parte do Módulo D) e
> "Configurações do Copiloto" (Módulo H, bloco colapsável inline, reusando
> `motorista_config_copiloto` — nenhuma rota nova); `CopilotoHistoricoCard.tsx` (novo nesta 2ª
> passada) tem Histórico, Padrões por horário/dia e Qualidade da base (Módulos A/B/C/G). Módulos
> I/J/K (cenários estendidos, plano estendido, assistente Q&A) ficam pra próxima passada — corte
> deliberado, registrado em `claude/auditoria-fase17-copiloto-inteligente.md`. Testes:
> `audit-motorista-copiloto-inteligente.ts` reescrito para **26 categorias, 90/90** (fixtures
> obrigatórias: R$1000/20h, R$1000/200km, R$1000/10corridas, 1160 vs. 1000 ⇒ Δ=+160/+16%) +
> regressão dos 17 scripts restantes (**930/930 combinados**) + suíte SQL real **346/346** (zero
> SQL alterado — só confirmando zero regressão). Detalhe completo da reconciliação em
> `CLAUDE.md`, seção 0.-12b, e em `docs/motorista/COPILOTO-INTELIGENCIA.md`, seção 11.

> **Fase 16 (MVP) — Copiloto do Motorista: avaliar corrida** (2026-08-21; migrations 0049
> `motorista_corridas` + 0050 `motorista_config_copiloto` — **✅ aplicadas em produção em
> 2026-08-21**, coladas manualmente no SQL Editor do Supabase por autorização explícita):
> primeira estrutura de CORRIDA INDIVIDUAL do sistema — até aqui só existia contagem diária
> (`motorista_ganhos.corridas`). `avaliarCorrida()` (novo, em `metas.ts`, reusa `calcularRpKm`/
> `calcularRph`) classifica BOM/ATENÇÃO/RUIM sempre acompanhado dos critérios que formaram o
> resultado — nunca um selo sozinho. Limiar não configurado nunca vira zero: fica NÃO CONFIGURADO
> e não entra na média. Corrida registrada NUNCA sobrescreve `motorista_ganhos`: a soma das
> corridas do dia é só COMPARADA ao ganho/contagem manual, e divergência aparece como "DADOS
> DIFERENTES" pra decisão do motorista. Card `CopilotoCard` novo, logo após "Meu dia" no Centro
> de Controle. Auditoria de reuso completa antes do código:
> `claude/auditoria-reuso-fase16-copiloto-2026-08-21.md`. Fases E–R (histórico, plano do dia,
> insights temporais, tela de Configurações, assistente contextual) ficam pra próxima passada —
> corte deliberado, não esquecimento.

> **Fase 12.2 — Inteligência Operacional** (ZERO migration — tudo derivado de 0047/0048): o
> sistema DESCREVE os registros, sem julgar nem aconselhar. Janelas 7/14/30/**90** ampliadas
> (dias com horas, km, km/dia, R$/km, corridas, R$/corrida, recargas, custo registrado,
> custo/km); EVOLUÇÃO período × período anterior equivalente (10 campos; <3 dias de um lado →
> "SEM COMPARAÇÃO"; 90×90 fica sem comparação de propósito — exigiria 180 dias de busca);
> recargas agregadas (nº, custo total/médio, kWh total/médio, **R$/kWh só com custo E kWh**);
> ENERGIA: kWh ESTIMADOS (ficha × km) × kWh REGISTRADOS — "diferença entre fontes de registro",
> nunca somados, nunca elegendo a correta; QUALIDADE em camadas (com ganho/horas/km/corridas/
> recarga/COMPLETOS — definição explícita: ganho+horas+km; sem nota, sem ranking);
> INCONSISTÊNCIAS factuais (achado/origem/o que falta — nunca "você fez errado"); TRÊS NÚMEROS
> (META × REAL × PROJEÇÃO com fonte declarada, "não é promessa"); carro em TRÊS camadas (FIXO
> importado × OPERACIONAL registrado × ENERGÉTICO estimado); cenários operacionais EMBUTEM os
> 5 da Fase 9 + (+3h, +1 dia, +2h na média registrada — "matematicamente", nunca "você vai
> ganhar"); histórico e operação com 90d; semana com R$/h. Fetch ampliado 60→90 dias na MESMA
> consulta. Testes: `audit-motorista-inteligencia.ts` **62/62** (casos obrigatórios,
> imutabilidade, vocabulário proibido do Módulo 22, zero migration).

> **Fase 12.1 — Diário Operacional Real** (migration **0048**, LOCAL): Encerrar Dia (fluxo
> ÚNICO mantido) ganha "+ Detalhes (opcional)": odômetro inicial/final, corridas, apps
> (Uber/99/Outro/Nenhum, múltiplos). km_rodado é **DERIVADO** (fim − inicio; um só odômetro →
> "KM INCOMPLETO", nunca calcula; fim < inicio bloqueado na aplicação E por constraint).
> Recargas por EVENTO (`motorista_recargas`: data, custo, kWh/%bateria/local opcionais; RLS
> espelho da 0047 — staff zero, sem audit) ≠ despesa recorrente: divergência com escolha
> MANTER × PAUSAR, nunca automática. MEU DIA (após o plano): ganho/horas/R$h/km/R$km/
> corridas/R$corrida (só com corridas>0, senão NÃO INFORMADO)/custos registrados/**resultado
> operacional registrado** (ganho − recargas do dia; aluguel/vida ficam na Meta — camadas
> separadas)/kWh REGISTRADO × kWh ESTIMADO (ficha × km, nunca misturados)/hoje × médias
> 7/14/30/comparação de odômetro com a última vistoria ("fontes diferentes", nunca "erro",
> nunca sincroniza). MEUS DIAS (histórico 7/14/30, SEM DADO explícito). Semana com km.
> Carro: ESTIMADO × OPERACIONAL REGISTRADO (30d). Dado pessoal NUNCA escreve em
> veiculos/telemetria/manutencoes/lancamentos/pagamentos/audit/timeline. Testes: suíte SQL 67
> (26 asserts — harness **319/319**, 0047+0048 reaplicadas), `audit-motorista-diario.ts`
> **64/64** (1.000/20h=50 · 1.000/200km=5 · 1.000/10=100/corrida · 3.000−100=2.900 ·
> 100→250=150km · final<inicial bloqueado · 200×15/100=30kWh ESTIMADOS).

> **Fase 11 — Plano Operacional do Motorista**: a aba vira um plano diário. Bloco PLANO DE HOJE
> (entre o hero e o cockpit): meta original × rebalanceada × diferença (a original nunca muda);
> horas necessárias PELA PREMISSA × PELO MEU HISTÓRICO (histórico nunca é garantia); realizado
> de hoje com R$/h; SEU DIA EM NÚMEROS (grade 2×2); SE EU PARAR AGORA (diferença de hoje + nova
> média nos dias restantes — sem lançamento → "Não é possível calcular"); simulador ±1/2/3h
> (taxa = histórico quando existe, senão premissa; origem declarada; "Se você trabalhar +2h,
> matematicamente…"; SIMULAÇÃO — nada é gravado; imutabilidade testada); falta/dias/meta-dia/
> horas-dia factuais; META DE AMANHÃ (original × rebalanceada). Visão SEMANAL Seg→Dom em barras
> CSS + "Como estou indo?" (registrado, horas, R$/h, meta semanal ESTIMADA com fórmula
> declarada, diferença). Calendário: dia aberto mostra R$/h e encerrado/não encerrado; sem
> registro = SEM DADO. Projeção do ritmo agora lista META × PELA PREMISSA × PELO HISTÓRICO.
> Carro: "para cobrir o custo estimado do carro hoje ≈ XhXX" (ESTIMATIVA). Objetivos ganham
> dias de trabalho + meta/dia. Encerrar Dia continua ÚNICO. Tudo REUSA `rebalancear`/
> `calcularMetaHoje`/`mediaRealPorHora` (asserts). **ZERO migration.** Testes:
> `audit-motorista-plano.ts` 62/62 (obrigatórios: 10.000−4.500=5.500 → 458,33/dia →
> 11h27 a R$40/h → 9h35 a R$47,80/h; imutabilidade das simulações).

> **Fase 10 — Inteligência Operacional Real**: camada de análise sobre os REGISTROS do
> motorista, sempre rotulada (DADO REGISTRADO × IMPORTADO DO PRIMECHARGE × PREMISSA ×
> ESTIMATIVA — nunca misturados). O sistema NÃO tem telemetria, km/dia, corridas nem dados de
> Uber/99 — e a tela não finge ter. Novidades: SEU R$/HORA REAL (média dos registros dos
> últimos 14 dias, só dias com ganho E horas) × premissa × distância × eficiência % ("não é
> nota"); R$/dia real × meta; custo/dia (reusa a conta da meta) e custo/hora real; janelas
> 7/14/30 com seletor (ganhos, horas, R$/dia, R$/h, custo estimado com fórmula declarada,
> SOBRA REGISTRADA — nunca "lucro"); tendência 7×7 anteriores (mín. 3 dias de cada lado);
> ponto de equilíbrio ESTIMADO (premissa) × OBSERVADO (registros); médias por dia da semana
> (mín. 2 observações, "maior média registrada" — nunca "melhor dia para trabalhar");
> horas × resultado em barras CSS; confiança = classificação da QUANTIDADE de registros
> (<3 insuficiente · 3–6 inicial · 7–13 consistente · 14+ relevante — não é estatística);
> qualidade dos registros (completos/sem horas/horas sem ganho/zeros); projeções DUPLAS
> (PELA PREMISSA × PELO HISTÓRICO, origem declarada); simulador com "Usar minha média
> registrada". **A premissa NUNCA muda sozinha** — "Usar como nova premissa" é botão
> explícito. Snapshot mensal fotografa também ganhos/dias/R$-dia/R$-hora. API: UMA consulta
> por período (`listGanhosPeriodo`; o mês delega para ela); hook busca 60 dias para as
> janelas. **ZERO migration** (0047 continua a última). Testes:
> `audit-motorista-operacao.ts` 69/69 (obrigatórios: 1.000/20h=50 · 1.000/10d=100 ·
> 3.000/100h=30 · 47,80/40=119,5%).

> **Fase 9 — Cockpit Financeiro** (evolução, nada reconstruído): a tela agora abre respondendo
> "quanto eu preciso fazer HOJE?" — meta de hoje REBALANCEADA (falta do mês ÷ dias restantes,
> hoje incluso; a meta diária original não muda), status do dia (AINDA NÃO COMEÇOU / ABAIXO /
> NO RITMO / ACIMA / DIA ENCERRADO — ícone + texto + %, nunca só cor), ritmo do mês (dias
> planejados × trabalhados × restantes; dias sem produção como FATO, sem julgamento), saldo de
> meta (Σ realizado − meta por dia lançado — não é dinheiro guardado) e saldo de horas (só nos
> dias com horas lançadas), projeção com fórmula declarada (mín. 3 dias, senão "Sem dados
> suficientes"), "Como recuperar?" (3 opções matemáticas, sem recomendação), cenários prontos
> (+1h, +2h, +R$5/h, −10% custos, +2 dias), card SEU CARRO CUSTA (composição + badge IMPORTADO
> DO CONTRATO + % de impacto), vida × operação separados, comparação mensal via snapshots e
> botão ENCERRAR DIA (grava ganho+horas com `observacao='dia_encerrado'` — reuso da 0047,
> correção livre pelo calendário). Snapshot mensal agora fotografa também meta/dias/renda/
> reserva dentro do `por_grupo` jsonb. **ZERO migration nova.** Testes:
> `audit-motorista-cockpit.ts` 81/81 (casos obrigatórios: 10.000/25=400; 400/40=10h;
> 10.000−4.500=5.500; 5.500/12=458,33).

> Área do APP DO MOTORISTA (`/motorista/meta`). Objetivo: o motorista entender **quanto custa a
> vida dele e quanto precisa trabalhar para pagar essa vida**. Não é ERP, não é planilha, não é
> aconselhamento financeiro — é uma ferramenta de organização pessoal, mobile-first.

## 1. O modelo em uma frase

```
CUSTO DE VIDA MENSAL (vida + família + carro + trabalho)
  ÷ dias de trabalho          → META DIÁRIA ("meta de cobertura")
  ÷ renda/hora (PREMISSA)     → HORAS DE TRABALHO POR DIA
```

Exemplo canônico (testado em `scripts/audit-motorista-meta.ts`):
custo R$ 10.000, 25 dias → **R$ 400/dia**; a R$ 40/h (premissa) → **10h/dia**.

## 2. Vocabulário honesto (regras não negociáveis)

- A meta é **"meta de cobertura de custos"** — nunca "lucro" nem "faturamento líquido".
- A renda/hora é **premissa informada pelo motorista** (presets R$ 30/35/40/45/50 ou outro).
  Toda projeção que usa ela carrega o aviso: *"Estimativa baseada na renda média informada —
  não é faturamento real."*
- O sistema **não tem** o faturamento dos aplicativos de corrida. O realizado do dia é
  **lançamento MANUAL** do motorista. Dia sem lançamento = **SEM DADO** (nunca zero falso).
- Alertas são **fatos, nunca julgamento nem conselho** ("Seu carro + custos de trabalho
  representam 61% dos seus custos" — e ponto).
- Rodapé fixo da tela: *"Ferramenta de organização pessoal (...) Não é aconselhamento
  financeiro."*

## 3. Fórmulas (motor puro `src/features/motorista-app/lib/metas.ts`)

| Cálculo | Fórmula | Guard |
|---|---|---|
| Normalização mensal (ÚNICA do app) | diária ×365/12 · semanal ×52/12 · quinzenal ×26/12 · anual ÷12 | inválido/negativo → 0 |
| Meta diária | custo total ÷ dias de trabalho | dias clamp 1..31, default **26** |
| Horas/dia | meta diária ÷ renda/hora | renda ≤ 0 → `null` (nunca Infinity) |
| Custo por hora | custo total ÷ horas no mês | horas 0 → `null` |
| Rebalanceamento | (meta − realizado) ÷ dias restantes | dias ≤ 0 → `null`; falta nunca negativa |
| Sobra estimada | realizado − custo | **pode ser negativa** — mostrada como está |
| Objetivo por dia | (meta obj − atual) ÷ dias até o prazo | prazo passado → `null` |
| Status do dia | dif > 0 acima · < 0 abaixo · = atingida · sem lançamento **sem_dado** | tolerância 0,5 centavo |

Toda conversão de periodicidade é **mostrada** ao motorista ("R$ 200 por semana ≈ R$ 866,67/mês").

## 4. Dados reutilizados do PrimeCharge (nunca recadastrados)

- **Aluguel do carro**: derivado de `listMeusContratos()` (contrato ativo,
  `valor_periodico` × periodicidade) e normalizado a mensal **na leitura**. Aparece no grupo
  MEU CARRO como linha fixa verde "importado do contrato" — não editável, não gravado na 0047.
- **Divergência**: se o motorista cadastrar manualmente uma despesa `aluguel_veiculo` com valor
  diferente do contrato, a tela mostra *DADO DO CONTRATO R$ X × SEU DADO R$ Y* e oferece pausar
  o manual. Nada é sobrescrito em silêncio.

## 5. Banco (migration `0047_motorista_financas_pessoais.sql` — LOCAL, não aplicada)

5 tabelas novas, todas com `motorista_id → motoristas(id) on delete cascade`:
`motorista_despesas` (grupo vida/familia/carro/trabalho, periodicidade com check, dependente),
`motorista_meta_config` (dias default 26, renda default 40, reserva), `motorista_objetivos`,
`motorista_ganhos` (**unique por motorista+dia** — upsert), `motorista_custos_snapshots`
(**unique por motorista+mês** — histórico).

**Por que tabelas novas** (Módulo 38): todo o financeiro existente (`lancamentos`, `pagamentos`)
é da EMPRESA com RLS de staff — direção de privacidade **oposta** à exigida aqui.

**RLS — privacidade invertida (Módulo 33):**
- 1 única policy por tabela: `motorista_id = current_motorista_id()` (using + with check).
- **Staff não tem NENHUMA policy — nem o owner vê** despesa pessoal, ganho declarado ou objetivo.
- Motorista desativado (`usuarios.ativo=false`) → `current_motorista_id()` = NULL → nada.
- **Sem trigger de audit_log de propósito**: audit_log é legível por admins — auditar aqui
  vazaria o conteúdo pessoal pro staff.
- Excluir o motorista apaga tudo em cascata (LGPD).

## 6. UX (mobile-first, `/motorista/meta`, aba "Meta" na navegação)

Onboarding progressivo: 9 perguntas, uma por tela, "Não tenho / pular", impacto imediato
("Isso adicionou R$ X ao seu custo mensal"), banner do aluguel importado do contrato, e o
**momento WOW** final: "Seu custo de vida: R$ X/mês — para cobrir isso: 26 dias × 9h28 × R$ 40/h".

Tela principal: hero com meta mensal/diária/horas → progresso do mês (barra + falta +
rebalanceamento em âmbar + sobra estimada) → meta de hoje → composição CARRO/VIDA/TRABALHO em %
→ ponto de equilíbrio → 4 grupos de despesas expansíveis → objetivos ("precisa gerar
aproximadamente R$ X **adicionais** por dia") → alertas "Para você saber" → calendário do mês
(✓ ▲ ▼ · — símbolo + texto, **nunca só cor**) → simulador "E se?" (cópias locais, nunca muta
dado real) → histórico mensal (snapshots) → reserva.

## 7. Performance e segurança

- `MinhaMetaPage` é **lazy** no router; o ramo do motorista continua sem Recharts, pdfmake e
  sem os motores do Centro Jurídico (assert mecânico no audit).
- API `financasPessoais.ts` com **colunas explícitas** (nunca `select('*')`), agregada em
  **uma** query key (`['motorista','minha-meta', anoMes]`).
- Snapshot do mês é upsert disparado pela própria tela (sem cron, sem automação silenciosa).

## 8. Testes

- **SQL suíte 66** (`supabase/tests/66_motorista_financas.sql`, 39 asserts): CRUD do dono,
  A não vê B, empresa B não vê, **staff owner não vê**, staff inativo não vê, desativado
  bloqueado e reativado recupera, unique dia/mês com upsert, checks (negativo, periodicidade,
  grupo, dias, horas>24), escrita em nome de outro bloqueada, cascade LGPD, e prova estrutural
  (exatamente 1 policy por tabela, zero triggers de audit). Harness total: **293/293**.
- **Idempotência**: o harness reaplica a 0047 uma segunda vez — não pode dar erro.
- **Node `audit-motorista-meta.ts` (94 checks)**: normalização em todas as periodicidades,
  exemplos literais da missão, guards (0, negativo, NaN, Infinity, extremos — saída nunca
  NaN/Infinity), rebalanceamento, calendário, sobra negativa, objetivos, simulador imutável,
  alertas factuais, vocabulário proibido, R4, lazy, RLS da 0047.
