# MINHA META — Inteligência Financeira Pessoal do Motorista

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
