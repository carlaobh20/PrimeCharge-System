# PrimeCharge Platform — Product Vision

Documento mais importante da empresa, por design não fala de tecnologia.

Proposta de Valor fechada em 2026-08-05, a partir de pesquisa de mercado real (locadoras tradicionais, fleet management com módulo EV, battery analytics — nacional e internacional) e da arquitetura já construída. Raciocínio completo e fontes em `claude/analise-posicionamento-proposta-valor.md` (Projects) — este documento registra a conclusão definitiva, não o processo.

---

## Missão

Profissionalizar e escalar a gestão de empresas de locação de frota eletrificada no Brasil, substituindo controle manual/fragmentado por um sistema que antecipa problema em vez de só registrar dado depois que ele já aconteceu.

Qual problema resolve: gestão de frota, contrato, financeiro e compliance hoje depende de alguém lembrar de checar cada coisa manualmente — o que gera receita perdida por vacância não percebida, documento vencido descoberto tarde, veículo elétrico devolvido descarregado e oferecido como disponível, degradação de bateria não detectada até virar pane, e decisão tomada sem visibilidade real do negócio.

Para quem existe: primeiro, a própria PrimeCharge. Depois — se a visão de plataforma (`FOUNDATION_PRINCIPLES.md`) se confirmar — outras empresas brasileiras de locação de frota eletrificada (veículos 100% elétricos e híbridos plug-in).

## Visão

- **3 anos**: PrimeCharge OS rodando 100% da operação real da PrimeCharge (frota, contratos, financeiro, compliance), Command Center como fonte única de decisão diária — nada relevante decidido fora do sistema.
- **5 anos**: primeiras empresas de locação de frota eletrificada além da PrimeCharge como clientes pagantes do SaaS — validação de que o produto generaliza além do primeiro uso.
- **10 anos**: PrimeCharge Platform como referência em gestão de frotas eletrificadas no Brasil, com os demais produtos Prime (`FOUNDATION_PRINCIPLES.md`, Princípio 7) construídos sobre a mesma base — cada um extraído de necessidade real validada, não adivinhada agora.

## Proposta de valor

**O que somos**: o sistema operacional de locadoras de frota eletrificada no Brasil — não apenas cadastro, contrato e cobrança (o que qualquer ERP de locação já faz hoje), mas a camada que trata a saúde, autonomia e valor residual de cada veículo elétrico como dado de decisão operacional e financeira, não como informação isolada de manutenção.

**Para quem existimos**: empresas brasileiras de locação de frota eletrificada — primeiro a própria PrimeCharge, depois outras locadoras que enfrentam o mesmo problema estrutural: gerir um ativo cuja depreciação, autonomia e comportamento operacional não se parecem em nada com carro a combustão, usando sistemas que (quando existem) foram desenhados para carro a combustão.

**Qual problema resolvemos**: a pesquisa de mercado confirmou uma lacuna real, não hipotética — nenhum ERP de locadora pesquisado (nem o líder brasileiro, nem os internacionais) trata inteligência real de ativo elétrico, e nenhuma plataforma de battery analytics (mesmo as tecnicamente mais avançadas) atende o fluxo de uma locadora. O sintoma concreto que essa lacuna produz: veículo devolvido descarregado e oferecido como disponível para o próximo cliente, alerta em volume sem prioridade (gestor recebendo dezenas de sinais por semana sem saber qual importa), manutenção reativa custando várias vezes mais que preventiva, e valor residual imprevisível numa frota de marcas com ciclo de produto acelerado.

**Por que somos diferentes**: uma arquitetura desenhada desde a fundação para que Health Score, Command Center, IA e Agentes evoluam sobre o mesmo dado sem precisar ser redesenhados (`SMART_FLEET_PLATFORM.md`); uma disciplina de honestidade de dado como princípio permanente, não promessa de marketing — o sistema nunca finge saber o que não sabe (Health Score, `DECISION_LOG.md` DEC-022; princípios de IA, `AI_PLATFORM.md`); governança de IA e de Agente definida antes de existir qualquer linha de código de IA (`AI_PLATFORM.md`, `AGENT_PLATFORM.md`); e suporte nacional e dedicado, num mercado onde a pesquisa mostrou consolidação por fundos estrangeiros destruindo a experiência de suporte de concorrentes bem avaliados tecnicamente.

Esta é uma proposta honesta sobre onde a PrimeCharge está: hoje ela não entrega ainda o espaço de mercado identificado por completo — faltam os módulos de Contratos e Financeiro, e não existe ainda ingestão real de telemetria. O que já existe é a única arquitetura, entre dezenas de concorrentes pesquisados, desenhada desde o princípio para chegar lá sem precisar ser refeita. É uma aposta de posicionamento e timing bem evidenciada por pesquisa de mercado real — não uma entrega já concluída.

**O que nunca faremos**: nunca apresentar dado incerto como certo — o Health Score não inventa confiança que não tem; nunca deixar a IA executar diretamente uma ação, sempre por automação ou por um Agente autorizado (`FOUNDATION_PRINCIPLES.md`, Princípio 5); nunca coletar dado de comportamento do motorista sem privacidade por design (`DECISION_LOG.md` DEC-032); nunca construir tecnologia antes de existir necessidade real comprovada (regra dos 3, DEC-010); nunca sacrificar previsibilidade de longo prazo por velocidade de feature no curto prazo.

**Qual transformação entregamos**: tirar a gestão de frota elétrica do modo reativo — em que o problema só aparece quando já custou dinheiro (devolução descarregada, degradação não detectada, venda no momento errado) — para um modo em que o sistema antecipa o risco financeiro do ativo elétrico antes que ele vire prejuízo.

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
- O usuário nunca deve descobrir problema → o sistema antecipa (Command Center + IA, quando IA tiver o primeiro caso de uso real — `FOUNDATION_PRINCIPLES.md`, Princípio 5). É esta mesma filosofia, agora ancorada em pesquisa de mercado real (seção Proposta de valor acima), que sustenta por que um cliente escolheria a PrimeCharge.

## Indicadores de sucesso

Métricas que indicam se a plataforma está cumprindo a missão:

- Receita por veículo
- Vacância (% de tempo parado sem gerar receita)
- ROI da frota
- Tempo médio de locação
- Receita perdida (vacância, inadimplência, veículo fora de operação)
- Crescimento patrimonial
- Tempo economizado (proxy: redução de tarefa manual/repetitiva)

O cálculo exato de cada indicador é definido quando o módulo que o alimenta existir (Financeiro na Fase 3, BI na Fase 7) — esta lista define **o que importa medir**, não a fórmula ainda. Correspondência de North Star e métricas secundárias em `NORTH_STAR.md`.

## Priorização

Toda funcionalidade nova classificada em, nesta ordem de prioridade:

1. Gera receita
2. Reduz custos
3. Reduz riscos
4. Melhora experiência
5. Conveniência

Esse critério se conecta com os Princípios do produto acima — cada item do roadmap (`ARQUITETURA.md`, Etapa 4) pode ser reclassificado por ele conforme entrarmos em cada Fase, para decidir o que constrói primeiro dentro de uma mesma fase.

---

## Status

Missão, Visão e Proposta de Valor estão definitivas. A fase de planejamento de fundação está encerrada — próximo passo é a Fase 1 do roadmap (`ARQUITETURA.md`).
