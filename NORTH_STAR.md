# PrimeCharge Platform — North Star Metric

**Confirmada em 2026-08-05**, a partir da Proposta de Valor definitiva registrada em `PRODUCT_VISION.md` ("antecipar o risco financeiro do ativo elétrico antes que ele vire prejuízo" — validada por pesquisa de mercado real, `DECISION_LOG.md` DEC-033). A recomendação abaixo corresponde exatamente ao cenário 3 já antecipado nesta mesma seção — deixa de ser condicional.

---

## Candidatas analisadas

### 1. Lucro operacional por veículo
**Vantagem**: mede o que financeiramente importa de verdade — receita menos custo real (manutenção, financiamento, seguro) por ativo. Alinhado com "ROI da frota" e "crescimento patrimonial" do `PRODUCT_VISION.md`.
**Limitação**: indicador atrasado (só fecha no fim do mês/ciclo). Não orienta decisão do dia a dia — fraco para o Command Center, que precisa de sinal acionável agora. Depende do módulo Financeiro (Fase 3) para ser calculado corretamente; não existe dado pra isso antes disso.

### 2. Receita líquida por ativo
**Vantagem**: mais simples de calcular cedo que o anterior (não exige rateio completo de custo).
**Limitação**: não penaliza veículo caro de manter — pode mascarar um veículo com receita alta mas custo que come o lucro. Métrica incompleta sozinha.

### 3. Rentabilidade da frota (ROI agregado)
**Vantagem**: boa para decisão de investimento — vale comprar mais veículo? qual modelo compensa mais?
**Limitação**: métrica de portfólio, não aponta qual veículo ou contrato específico está com problema hoje — fraca como North Star operacional do dia a dia.

### 4. Tempo de utilização dos ativos (ou, inversamente, vacância)
**Vantagem**: é a métrica padrão da indústria de locação de frota/equipamento no mundo todo — "utilization rate" é o que qualquer negócio de aluguel de ativo físico otimiza primeiro, porque ativo parado é a forma mais direta de perder dinheiro. Mensurável desde a Fase 1 (só precisa do `status` do veículo — nem espera o módulo Financeiro). Diretamente acionável: "este veículo está parado há 5 dias" é exatamente o tipo de alerta que o Command Center deve mostrar (`FOUNDATION_PRINCIPLES.md`, Princípio 4).
**Limitação**: não captura se o contrato é lucrativo — veículo 100% alugado a preço ruim tem utilização alta e rentabilidade baixa.

### 5. Receita perdida evitada
**Vantagem**: é a métrica que mais conecta diretamente com a filosofia central do produto — "o sistema antecipa em vez do usuário descobrir tarde" (`PRODUCT_VISION.md`, Filosofia). Prova, em número, que o Command Center está funcionando.
**Limitação**: contrafactual — "quanto teria sido perdido se ninguém tivesse agido" é estimativa, não fato observado diretamente. Precisa de instrumentação madura (BI, Fase 7) para calcular com confiança. Não dá pra usar como North Star principal antes disso existir.

### 6. Eficiência operacional
Vaga como proposta — na prática se decompõe em variações do item 4 (tempo entre devolução e nova locação é uma faceta de utilização). Não tratada como candidata separada.

---

## Recomendação

**Confirmada.** A Proposta de Valor definitiva é "antecipamos o risco financeiro do ativo elétrico antes que ele vire prejuízo" — o cenário 3 abaixo, que já estava previsto nesta seção antes de existir resposta oficial.

**North Star principal — Fase 1 a Fase 6**: **Taxa de utilização da frota** (item 4). Motivo: é a única candidata mensurável desde a Fase 1, diretamente acionável pelo Command Center desde o primeiro módulo, e é o padrão comprovado da indústria de locação de ativo físico — cada dia de veículo parado é receita que nunca mais volta, independente de qualquer outra otimização. Continua sendo o North Star correto enquanto não existir instrumentação suficiente para medir a métrica de longo prazo abaixo com confiança.

**Métrica secundária — validação financeira**: **Lucro operacional por veículo** (item 1), ativada quando o módulo Financeiro existir (Fase 3). Garante que alta utilização não está sendo alcançada às custas de rentabilidade ruim (contrato barato demais só para não deixar o veículo parado).

**North Star principal — a partir da Fase 7**: **Receita perdida evitada** (item 5) é promovida de "prova de filosofia" a North Star principal assim que o BI (Fase 7) existir e a métrica puder ser calculada com confiança — é a métrica que mais diretamente prova, em número, que a proposta de valor confirmada ("antecipamos antes de qualquer outro sistema") está sendo cumprida de fato. Taxa de utilização e Lucro operacional por veículo passam a indicadores operacionais de suporte, não mais a North Star.

### Por que este é o cenário certo

A Proposta de Valor confirmada em `PRODUCT_VISION.md` é "somos melhores porque antecipamos risco/problema antes de qualquer outro sistema" — o cenário que esta seção já havia identificado como o que exigiria promover Receita perdida evitada a principal assim que houvesse instrumentação mínima. É exatamente o que a recomendação acima faz, com o gatilho de fase explícito (Fase 7, quando BI existir) em vez de uma data arbitrária.

## Como orienta o resto da plataforma

Uma vez confirmada, a North Star Metric orienta: o que o Command Center prioriza mostrar primeiro; o que a IA (quando existir) prioriza prever; o que Automações disparam alerta; o que os Indicadores calculam em destaque no Dashboard. Nenhuma dessas conexões é implementada agora — ficam registradas aqui como consequência da escolha, para quando cada módulo existir.
