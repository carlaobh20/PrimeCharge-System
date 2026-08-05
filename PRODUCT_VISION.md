# PrimeCharge Platform — Product Vision

Documento mais importante da empresa, por design não fala de tecnologia.

**Nota de autoria**: as seções marcadas 🟡 **[PROPOSTA — validar]** são rascunho do Claude a partir do que já foi dito nesta conversa — não são fato assentado, precisam da sua correção ou confirmação. As demais seções formalizam o que você já definiu diretamente.

---

## Missão

🟡 **[PROPOSTA — validar]**

Por que a PrimeCharge existe: profissionalizar e escalar a gestão de empresas de locação de veículos elétricos no Brasil, substituindo controle manual/fragmentado por um sistema que antecipa problemas em vez de só registrar dados depois que eles aconteceram.

Qual problema resolve: gestão de frota, contrato, financeiro e compliance hoje depende de alguém lembrar de checar cada coisa manualmente — o que gera receita perdida por vacância não percebida, documento vencido descoberto tarde, e decisão tomada sem visibilidade real do negócio.

Para quem existe: primeiro, a própria PrimeCharge. Depois — se a visão de plataforma (`FOUNDATION_PRINCIPLES.md`) se confirmar — outras empresas brasileiras de locação de veículos elétricos.

*Corrija o que estiver errado — principalmente se o problema central que você quer resolver é outro, ou se o "para quem" é diferente do que assumi aqui.*

## Visão

🟡 **[PROPOSTA — validar, especialmente os prazos e o que "vencer" significa em cada horizonte]**

- **3 anos**: PrimeCharge OS rodando 100% da operação real da PrimeCharge (frota, contratos, financeiro, compliance), Command Center como fonte única de decisão diária — nada relevante decidido fora do sistema.
- **5 anos**: Primeiras empresas de locação de EV além da PrimeCharge como clientes pagantes do SaaS — validação de que o produto generaliza além do primeiro uso.
- **10 anos**: PrimeCharge Platform como referência em gestão de frotas elétricas no Brasil, com os demais produtos Prime (`FOUNDATION_PRINCIPLES.md`, Princípio 7) construídos sobre a mesma base — cada um extraído de necessidade real validada, não adivinhada agora.

## Proposta de valor

🟡 **[PROPOSTA — esta seção é a que mais precisa da sua resposta direta]**

O que diferencia a PrimeCharge de qualquer outro ERP: **não sei responder isso sem você.** Sei o que o sistema faz diferente de planilha/controle manual (antecipa em vez de exigir que alguém lembre — ver Filosofia abaixo), mas não sei se já existe ERP de locação de frota no mercado brasileiro fazendo algo parecido, nem o que especificamente faria um cliente escolher a PrimeCharge em vez de outro.

*Preciso que você responda: existe concorrente direto hoje? Se sim, o que ele faz mal que a PrimeCharge vai fazer bem?*

## Princípios do produto — o que justifica construir algo

Toda funcionalidade nova deve responder **pelo menos uma** destas perguntas:

- Aumenta receita?
- Reduz custos?
- Reduz riscos?
- Economiza tempo?
- Melhora a tomada de decisão?
- Melhora a experiência do cliente?

Se não responde nenhuma, vai para o backlog — não é construída agora.

## Filosofia

- O usuário nunca deve procurar informação → o sistema entrega (Command Center).
- O usuário nunca deve lembrar tarefa → o sistema lembra (Command Center + Automações, `CORE_CONCEPTS.md`).
- O usuário nunca deve calcular indicador → o sistema calcula (Indicadores).
- O usuário nunca deve descobrir problema → o sistema antecipa (Command Center + IA, quando IA tiver o primeiro caso de uso real — `FOUNDATION_PRINCIPLES.md`, Princípio 5).

## Indicadores de sucesso

Métricas que indicam se a plataforma está cumprindo a missão:

- Receita por veículo
- Vacância (% de tempo parado sem gerar receita)
- ROI da frota
- Tempo médio de locação
- Receita perdida (vacância, inadimplência, veículo fora de operação)
- Crescimento patrimonial
- Tempo economizado (proxy: redução de tarefa manual/repetitiva)

O cálculo exato de cada indicador é definido quando o módulo que o alimenta existir (Financeiro na Fase 3, BI na Fase 7) — esta lista define **o que importa medir**, não a fórmula ainda.

## Priorização

Toda funcionalidade nova classificada em, nesta ordem de prioridade:

1. Gera receita
2. Reduz custos
3. Reduz riscos
4. Melhora experiência
5. Conveniência

Esse critério se conecta com os Princípios do produto acima — cada item do roadmap (`ARQUITETURA.md`, Etapa 4) pode ser reclassificado por ele conforme entrarmos em cada Fase, para decidir o que constrói primeiro dentro de uma mesma fase.

---

## Pendente da sua parte

1. Validar ou corrigir Missão e Visão (3/5/10 anos).
2. Responder Proposta de valor — o que diferencia a PrimeCharge de qualquer concorrente real ou potencial.

Depois disso, considero a fase de planejamento encerrada, como combinado — próximo passo é Fase 1.
