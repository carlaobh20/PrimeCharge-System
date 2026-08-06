# PrimeCharge — Auditoria de Negócio e Roadmap de 3 Anos

**Data:** 2026-08-06 · **Escopo:** negócio, não código. Esqueço aqui tudo que já construímos em software e olho só para a empresa.

---

## 0. Teste de premissa, antes de auditar qualquer coisa

Você pediu para eu pensar como fundador. Como fundador, a primeira coisa que eu questionaria não é nenhum dos 24 itens da lista — é a estrutura da própria pergunta.

**"1 carro → 10 → 100 → 1.000 → vender o software para outras locadoras" descreve uma progressão linear, mas na verdade embute duas empresas diferentes dentro do mesmo roadmap.** Uma é uma locadora de veículos — negócio de ativo pesado, intensivo em capital, margem operacional apertada, cada carro trava capital por anos. A outra é uma empresa de SaaS B2B — ativo leve, margem alta, escala por código e suporte, não por CNPJ de frota. **[Certo]** Isso não é uma opinião, é estrutura financeira: 1.000 veículos elétricos, ao preço médio que você mesmo usou no ambiente demo desta sessão (~R$ 150-180 mil por unidade), são **R$ 150-180 milhões em ativo imobilizado**. Nenhuma empresa chega lá com capital de fundador — chega com financiamento de frota, leasing operacional, ou um sócio financeiro que se especializa nisso (é literalmente o modelo de Localiza/Movida/Unidas, todas com braço de financiamento estruturado por trás).

**Isso sobrevive ao teste, com uma condição.** A sequência que você descreveu — validar operando (1→10→100→1.000) antes de vender software — é a ordem certa, e bate com o que já está registrado em `PRODUCT_VISION.md` (3 anos = operação própria completa, 5 anos = primeiros clientes SaaS). Nenhum comprador sério de ERP de locadora vai confiar em quem nunca operou uma frota de verdade — isso é vantagem competitiva real contra qualquer concorrente que venda só o "papel" do sistema, como a pesquisa de mercado já mostrou (nenhum dos players pesquisados, nem Sisloc nem os internacionais, opera a própria frota que o sistema gerencia). A condição é: **você precisa decidir agora, não em 3 anos, se PrimeCharge é primariamente uma locadora que também terá um produto de software, ou primariamente uma empresa de tecnologia que está validando o produto na própria frota antes de vender.** A resposta muda quem você contrata primeiro, que tipo de investidor procura, e como a empresa é avaliada em cada fase. Eu vou assumir, ao longo deste documento, que a resposta é a segunda — porque é a que `PRODUCT_VISION.md` já registrou (10 anos = "PrimeCharge Platform", não "maior locadora do Brasil") — mas isso é uma leitura minha do que você já escreveu, não uma confirmação sua. **[Palpite]**

**Segunda premissa que preciso testar: não sei em que estado real a empresa está hoje fora do software.** Este documento assume — porque é o único cenário consistente com tudo que vi nesta sessão (ambiente demo precisou ser inventado, nenhum carro real, nenhum banco de dados real conectado) — que PrimeCharge hoje é: zero veículos operando, zero cliente, zero receita, provavelmente CNPJ aberto mas sem operação de locadora rodando, e você como fundador solo ou quase solo. Se isso estiver errado — se já existe operação, sócio, capital levantado, ou carro físico — várias partes deste documento mudam de "construir do zero" para "formalizar o que já existe". Corrija se for o caso.

---

## 1. A auditoria dos 24 pontos

Organizados em 6 blocos que se relacionam entre si — não são 24 caixas isoladas, são um sistema. Cada item tem estado atual, o que falta, e prioridade real (não "tudo é urgente").

### Bloco A — Fundação jurídico-regulatória (o que te impede de operar legalmente)

**Jurídico.** **[Palpite, dado o que não sei sobre o estado atual]** Hoje, provavelmente, não existe contrato de locação revisado por advogado especializado em direito automotivo/consumidor, não existe termo de uso do software, não existe política de privacidade formal. O contrato de locação que o sistema já sabe operar (rascunho→ativo→encerrado) precisa de um advogado transformando a lógica de estados em cláusula real: quem responde por multa durante a locação, o que acontece se o motorista bate o carro, cláusula de caução, cláusula de devolução com carga mínima (a dor #1 do setor, segundo a própria pesquisa que fizemos — devolução descarregada). **Prioridade: alta, antes do carro 1.** Não precisa de escritório caro — precisa de um advogado que já fez isso para uma locadora pequena, revisando o que você já tem, não escrevendo do zero.

**LGPD.** **[Certo, verificado]** Como empresa pequena, você está tecnicamente dispensado de nomear um Encarregado de Dados formal (Resolução CD/ANPD nº 2/2022) — mas isso não te livra da obrigação de tratar dado sensível corretamente, e o seu caso é exatamente o tipo de operação que qualifica como sensível: CNH, CPF, e se algum dia usar biometria facial para validar motorista (dado sensível por definição, exige consentimento explícito, Art. 11 da LGPD). GPS/telemetria do veículo durante a locação também precisa de base legal clara e declarada — hoje, pelo que vi da arquitetura, esse dado nem está sendo coletado ainda, mas quando entrar (Fase 5/6 do produto), a política de privacidade precisa existir antes, não depois. **[Certo]** A multa máxima da ANPD é R$ 50 milhões por infração (ou 2% do faturamento do ano anterior, o que for menor) — hoje, com faturamento zero, o risco financeiro direto é baixo, mas o risco reputacional de um vazamento de CNH/CPF de motoristas reais não é. **Prioridade: média agora (política de privacidade simples, correta, publicada), alta assim que GPS/biometria entrarem em produção.**

**Seguros.** **[Certo]** O padrão de mercado para frota de locadora é seguro de frota (RCF + danos ao veículo + roubo/furto/incêndio), vendido por seguradoras como Porto Seguro, Bradesco, Youse — todas já com produto específico para EV (cobertura de bateria, reboque até ponto de recarga). **[Certo]** O seguro para carro elétrico cresceu cerca de 300% em um ano na carteira da Bradesco — não é nicho exótico, o mercado segurador brasileiro já precificou isso. **[Palpite]** Existe uma lei nova (14.599/2023) que tornou obrigatório um seguro RC-V — não consegui confirmar se isso se aplica a locadora de passeio ou só a transporte de carga; isso precisa ser perguntado direto a um corretor antes do carro 1, não assumido. Sem seguro de frota contratado, você não tem negócio — é o item mais literal de "impede operar" da lista inteira. **Prioridade: crítica, antes do carro 1, sem exceção.**

### Bloco B — Operação e entrega (o que acontece fisicamente com o carro)

**Operação.** O software resolve o registro da operação (contrato, checklist, manutenção) — não resolve a operação física: quem lava o carro entre locações, quem entrega e busca o veículo, quem faz a vistoria presencial, o que acontece às 22h de sábado se o carro quebra na estrada (assistência 24h — que seguradora/parceiro cobre isso?), onde o carro fica guardado entre locações, quem tem a chave física. **[Palpite]** Para 1 carro isso pode ser você mesmo. Para 10, já não é. Esse é o primeiro ponto onde "eu resolvo pessoalmente" para de escalar — normalmente entre 5 e 15 veículos, dependendo de quantas cidades/bairros diferentes você atende.

**Onboarding (do motorista).** O produto já modela isso bem do lado de dado (cadastro, CNH, checklist de entrega) — mas onboarding de negócio é mais que cadastro: validação de CNH ativa direto no DETRAN (não só data de validade digitada), análise de capacidade de pagamento/histórico (SPC/Serasa) antes de liberar o carro, treinamento de 15 minutos sobre EV (como carregar, autonomia real, o que fazer se a bateria chegar a 10%) — a pesquisa de mercado que já fizemos mostrou que motorista trata EV "como descartável" quando não é dono da energia; isso é resolvido por educação no onboarding, não só por multa na devolução.

**Suporte.** Dois suportes diferentes que a lista mistura: suporte ao motorista durante a locação (carro quebrou, dúvida sobre carregamento, acidente) e — só relevante a partir da Fase 3 do roadmap — suporte à locadora cliente do seu SaaS. Hoje, nenhum dos dois existe formalizado. Para o motorista, você precisa de um canal único (WhatsApp Business é o padrão do setor, confirmado pela própria pesquisa — RentSyst e Coastr, os melhor avaliados do mercado pesquisado, respondem por WhatsApp em menos de 2h) com horário de cobertura definido e um plano B para emergência fora de horário.

**Treinamento.** Aqui não é treinamento de motorista (isso é onboarding) — é treinamento de quem opera a empresa. Com 1-10 carros, é você. Com 100, é uma equipe que precisa saber operar o próprio sistema (o que o `script-teste-missao4.md` já serve de base, mas é teste técnico, não manual de operação de negócio), mais processos que ainda não existem: como decidir preço de diária, como negociar com seguradora em caso de sinistro, como e quando dar baixa de um veículo. Isso não existe hoje porque a empresa nunca operou.

### Bloco C — Motor comercial (como você consegue clientes, dos dois tipos)

**Comercial e Vendas (motorista, fase locadora).** **[Palpite]** Hoje, pelo que vejo, não existe canal de aquisição de motorista definido — nem orgânico, nem pago, nem parceria. Para 1-10 carros isso pode ser indicação direta/rede pessoal. Para 100, precisa de um canal repetível (marketplace de aluguel, parceria com app de mobilidade, indicação paga) com CAC conhecido — hoje CAC é desconhecido porque não existe histórico.

**Vendas (locadora cliente, fase SaaS).** Diferente do anterior — venda B2B para outra empresa de locação é ciclo longo, decisão de dono/diretor, precisa de case real (a própria PrimeCharge operando) como prova. **Não existe hoje** porque a Fase SaaS ainda não começou — mas o material de venda (o case da própria operação, com número real de utilização/vacância/ROI) começa a ser construído a partir do primeiro carro, não quando você decidir vender o software. Isso é uma decisão de agora: cada métrica que a própria operação gerar nos primeiros 100 carros vira munição comercial do SaaS depois.

**CRM.** O sistema atual guarda motorista/contrato — não guarda funil de vendas (lead que ainda não virou motorista, lead de locadora que ainda não virou cliente SaaS). **Não existe hoje.** Para 1-10 carros, uma planilha resolve. Passar de 10 sem nenhum CRM de vendas é perder lead por falta de acompanhamento — o motivo mais comum de empresa pequena não crescer não é falta de lead, é lead esquecido.

**Atendimento.** Sobreposto com Suporte (Bloco B) do lado do motorista — do lado comercial, é atendimento pré-venda (dúvida de quem ainda não é cliente). Mesmo canal (WhatsApp), processo diferente (qualificação, não resolução de problema).

**Precificação.** Duas precificações completamente diferentes que a lista também mistura: (1) preço da diária/mensalidade de aluguel do carro — hoje inexistente como método formal, provavelmente decidido "no olho"; (2) preço do SaaS quando vender para outras locadoras — nem começou a ser pensado, e não deveria começar antes de ter 2-3 conversas reais com locadoras potenciais clientes perguntando quanto pagariam. **[Provável]** Preço de SaaS B2B para o segmento (ERP de locadora pequena/média) no Brasil tende a ser por veículo gerenciado/mês (não por usuário) — é o padrão que os concorrentes pesquisados (Sisloc, RentSyst) praticam, e bate com o valor entregue (você cobra por unidade de ativo que o sistema ajuda a não perder receita).

**Implantação (do SaaS, fase 3+).** Como uma locadora cliente migra do sistema legado dela (provavelmente Sisloc, planilha, ou nada) para o PrimeCharge. **Não existe hoje** e não deveria — é trabalho de Fase 3, mas o próprio processo de migração de dado (import de frota/motorista/contrato existente) é decisão de arquitetura que vale antecipar quando o schema multi-tenant for desenhado, para não descobrir tarde que falta um campo de import.

**Marketing.** **[Palpite]** Hoje, provavelmente inexistente como função formal — nenhuma marca, nenhum canal, nenhum conteúdo. Para a fase de operação própria (1-100 carros), marketing é aquisição de motorista, baixo investimento, alta segmentação local. Para a fase SaaS, marketing é posicionamento de categoria ("o único ERP de locadora que entende bateria") — que você já tem pronto em `analise-posicionamento-proposta-valor.md`, mas isso é copy de posicionamento, não um plano de canal/orçamento/calendário, que ainda não existe.

**Crescimento.** Não existe hoje porque não existe base para crescer ainda (zero cliente). O crescimento real da locadora, nos primeiros 100 carros, tende a vir de reinvestimento de fluxo de caixa + relação, não de "crescimento" no sentido de growth hacking de SaaS — são dois motores de crescimento fisicamente diferentes (comprar mais carro é decisão de capital, não de marketing).

### Bloco D — Motor financeiro (o que sustenta tudo isso)

**Financeiro.** O sistema já modela lançamento/pagamento/conta bancária/centro de custo — isso é contabilidade operacional do dia a dia, não gestão financeira da empresa. Falta: fluxo de caixa projetado (compra de carro é saída de caixa grande e concentrada, receita de aluguel é entrada pequena e recorrente — o descompasso entre os dois é o que quebra locadora pequena), decisão de compra direta vs. leasing/financiamento de frota (compra direta trava capital, financiamento libera capital mas cria dívida e juros — para 100+ carros, financiamento estruturado é quase obrigatório), e contabilidade formal (contador que entenda depreciação de frota e tratamento fiscal de EV, que é diferente de carro a combustão em alguns estados por incentivo de IPVA).

**Cobrança.** O sistema sabe marcar pagamento como pendente/pago — não sabe cobrar de verdade. Falta: régua de cobrança (lembrete antes do vencimento, cobrança no dia, escalonamento após atraso), negativação em SPC/Serasa como último recurso, e — o mais delicado operacionalmente — processo de reintegração de posse do veículo em caso de inadimplência grave, que no Brasil pode levar semanas via ação judicial se o motorista não devolver voluntariamente. **Prioridade: alta assim que o primeiro contrato de verdade existir**, porque inadimplência sem processo de cobrança definido é a forma mais silenciosa de uma locadora pequena morrer.

**Indicadores.** `PRODUCT_VISION.md` já lista os indicadores de produto (receita por veículo, vacância, ROI, tempo médio de locação). Faltam os indicadores de **empresa**, que são diferentes: CAC e LTV do motorista, CAC e LTV do cliente SaaS (quando existir), burn rate mensal, runway, margem de contribuição por veículo (receita de aluguel menos seguro, manutenção, depreciação, financiamento — não só receita bruta), taxa de utilização da frota (dias alugados / dias disponíveis, o KPI mais citado pela própria pesquisa de mercado como o que separa locadora saudável de locadora com capital mal alocado).

### Bloco E — Arquitetura de negócio para escalar (o que muda entre 1, 100 e 1.000)

**Escalabilidade.** **[Certo, por analogia direta com a própria pesquisa de mercado que fizemos]** Rent Centric, um dos concorrentes pesquisados, é documentadamente incapaz de escalar operação acima de 300 veículos multi-estado. Isso não é sobre o software — é sobre processo e gente. Os pontos de ruptura previsíveis nesta escala, pela experiência do próprio setor: 5-15 carros (você deixa de conseguir fazer tudo sozinho), 30-50 carros (precisa de operação em mais de um lugar físico — pátio, oficina credenciada), 100+ carros (precisa de estrutura jurídica/financeira dedicada — não dá mais para tratar cada compra de carro como decisão pontual). Cada um desses degraus exige contratação, não só mais capital.

**Parceiros.** Hoje, praticamente nenhum formalizado: rede de oficina credenciada para manutenção (existe informalmente no seed de demonstração, "Oficina EV São Paulo" — precisa virar contrato real com SLA e preço fixo antes de 10 carros), seguradora com apólice de frota negociada (não apólice individual por carro, que é mais caro), rede de reboque/assistência 24h, e — específico de EV — acesso a rede de recarga (parceria com Ionity/EVpoint/Shell Recharge para custo previsível de energia, em vez de cada motorista carregando onde der).

### Bloco F — Estratégia (para onde isso vai e quanto vale)

**Riscos.** Os que a pesquisa de mercado já apontou como estruturais do setor de EV rental (utilização 60-70% vs 80-90% em combustão, valor residual até 50% menor em 5 anos, reparo pós-colisão 56% mais caro, dominância de marca chinesa comprimindo previsibilidade de revenda) são riscos do **modelo de negócio**, não do software — o software ajuda a mitigar, não elimina. Riscos adicionais específicos de fundador solo/empresa pequena: risco de pessoa-chave (você é hoje o produto, a operação e o comercial ao mesmo tempo), risco de capital (sem financiamento de frota estruturado, cada carro novo compete por caixa com o carro anterior), risco regulatório (mudança de regra de IPVA/incentivo EV em qualquer estado muda a economia da frota da noite para o dia).

**Moat.** Já bem documentado em `MOAT.md` do ponto de vista técnico — do ponto de vista de negócio puro, o moat real nos primeiros 100 carros não é o software, é **dado proprietário de operação real de EV no Brasil** (curva de degradação de bateria por modelo/clima/uso, taxa de sinistro real, comportamento de inadimplência) que nenhum concorrente tem porque nenhum concorrente opera a própria frota. Esse dado só existe se você operar — é o argumento mais forte para não pular direto para vender SaaS sem ter carro rodando primeiro.

**Valuation.** **[Certo, com a ressalva de que os números vêm de mercado americano/global, não têm comparável brasileiro direto confirmado]** SaaS B2B early-stage no Brasil e no mundo é avaliado por múltiplo de ARR (receita recorrente anual) — na faixa de 2-4x ARR entre US$1-3M de receita, subindo para 5-8x acima de US$5M. Locadora de frota tradicional (Localiza, Movida, Unidas) é avaliada por EV/EBITDA e valor patrimonial, não por múltiplo de receita — é outro mundo de avaliação inteiramente. **Isso reforça o ponto da seção 0**: enquanto PrimeCharge for majoritariamente locadora, qualquer investidor vai avaliar como locadora (ativo, dívida, EBITDA) — o múltiplo de SaaS só se aplica quando a receita de software for relevante fração da receita total. Decisão de fundador: se a intenção é eventualmente levantar capital de venture (que paga múltiplo de SaaS) em vez de dívida de frota (que paga múltiplo de ativo), a fração de receita SaaS precisa crescer mais rápido que a frota própria a partir de um certo ponto — não dá para as duas crescerem na mesma velocidade para sempre.

**Documentação.** Cross-cutting: contratos jurídicos (Bloco A), manual de operação (Bloco B), material comercial (Bloco C), SOP financeiro (Bloco D) — nenhum existe fora do que já está em `DECISION_LOG.md`/`PRODUCT_VISION.md`, que são documentação de **produto**, não de **negócio**. Faltam os equivalentes de negócio: um manual de operação real (o que fazer quando X acontece), não documentação de arquitetura de software.

---

## 2. Roadmap de 3 anos

Estruturado pelas 5 fases que você mesmo descreveu, com o que cada bloco do negócio precisa em cada uma — não é lista de tarefa de produto, é o que precisa existir como **empresa**.

### Fase 0 — Antes do carro 1 (agora, próximas 4-8 semanas)

O mínimo para operar sem risco legal/financeiro grave:
- Contrato de locação revisado por advogado (Bloco A).
- Apólice de seguro de frota contratada — mesmo que para 1 carro (Bloco A). **Sem isso, não há Fase 1.**
- Política de privacidade simples publicada (Bloco A/LGPD).
- Decisão de compra do primeiro carro: à vista ou já testando financiamento/leasing (Bloco D) — mesmo com 1 carro, vale entender o processo antes de precisar dele em escala.
- Conta bancária empresarial e centro de custo real conectados ao sistema (já existe estrutura pronta para isso).

### Fase 1 — 1 carro (meses 1-3)

Objetivo: validar que a operação completa funciona, gerando os primeiros dados reais de operação (o dado que vira moat depois).
- Rodar o `script-teste-missao4.md` contra o primeiro contrato real, não contra o ambiente demo.
- Formalizar o canal único de suporte ao motorista (WhatsApp Business).
- Registrar manualmente, fora do sistema se precisar, os primeiros indicadores reais de negócio (Bloco D): quanto custou o carro pronto pra rodar (compra + seguro + documentação), quanto ele gerou de receita no período, quantos dias ficou parado.
- Nenhuma contratação ainda — você é a operação inteira.

### Fase 2 — 10 carros (meses 4-12)

Objetivo: descobrir onde "eu resolvo pessoalmente" quebra, e formalizar antes que quebre de verdade.
- Primeira contratação — provavelmente operação (Bloco B: lavagem, entrega, vistoria), não comercial ainda.
- Parceria formal de oficina credenciada com preço fixo (Bloco E).
- Régua de cobrança básica funcionando (Bloco D) — mesmo que manual, precisa existir antes do primeiro atraso real.
- CRM simples (mesmo que planilha estruturada) para não perder lead de motorista (Bloco C).
- Primeiros indicadores reais de utilização/vacância/ROI por veículo, comparando entre os 10 carros — esse é o primeiro dado que já vale como prova de conceito comercial futura.

### Fase 3 — 100 carros (ano 2)

Objetivo: a empresa deixa de caber na cabeça de uma pessoa; motor financeiro e comercial precisam de estrutura real.
- Estrutura de financiamento de frota (não mais compra direta pontual) — conversa com banco/fintech especializada em fleet financing (Bloco D).
- Contador/CFO fracionário entendendo depreciação de frota EV (Bloco D).
- Primeira pessoa dedicada a comercial/aquisição de motorista, com CAC/LTV real sendo medido (Bloco C/D).
- Rede de parceiros formalizada: seguradora com apólice negociada de frota, rede de recarga, assistência 24h (Bloco E).
- **Início do desenho do produto SaaS multi-tenant** — não venda ainda, mas as primeiras 2-3 conversas exploratórias com locadoras pequenas conhecidas, para testar precificação e processo de implantação antes de construir (Bloco C).
- Primeiro material comercial do SaaS usando dado real da própria operação (utilização, ROI, redução de veículo devolvido descarregado) como prova.

### Fase 4 — 1.000 carros e/ou primeiras vendas de SaaS (ano 3)

Objetivo: as duas empresas dentro da mesma empresa começam a operar lado a lado, cada uma com seu próprio motor.
- Decisão explícita de capital: dívida/financiamento estruturado para a frota (múltiplo de ativo) vs. captação de equity para acelerar o SaaS (múltiplo de ARR) — não são a mesma rodada, nem o mesmo investidor-alvo (Bloco F).
- Primeiro cliente SaaS pagante — processo de implantação/migração formalizado, suporte B2B dedicado, contrato de nível de serviço (Bloco C/B).
- Indicadores de empresa reportados formalmente (não mais planilha ad hoc) — separando explicitamente receita/margem de locadora vs. receita/margem de SaaS, para que qualquer decisão de capital futura saiba qual das duas está criando valor mais rápido (Bloco D/F).
- Reavaliação da tese de moat: até aqui, o moat era "dado real de operação que ninguém mais tem" — a partir do primeiro cliente SaaS, o moat começa a virar também "dado agregado de múltiplas locadoras", que é estruturalmente mais forte, mas só existe depois do primeiro cliente de verdade (Bloco F).

---

## 3. O que eu recomendaria e onde eu discordaria de você, se perguntado

Você não me perguntou isso diretamente, mas o papel que você mesmo definiu para mim exige que eu diga sem ser provocado: **a maior lacuna real hoje não está em nenhum dos 24 itens — está no fato de que todos os 24 dependem de um único ponto de falha, que é você.** Jurídico, comercial, financeiro, operação: hoje, tudo isso é uma pessoa. Isso é normal e correto para 1 carro. Não é sustentável para 10. Eu discordo de qualquer leitura deste documento que trate os 24 itens como um checklist a ser preenchido por você sozinho, mais devagar — a Fase 2 deste roadmap (10 carros) já deveria ter pelo menos uma contratação, e o risco de adiar isso não é "trabalhar mais", é um erro operacional real acontecer sem ninguém notando a tempo (exatamente o tipo de coisa que o próprio Command Center do software promete evitar do lado técnico, e que não existe do lado humano ainda).

---

**Próximo passo concreto:** dos 24 itens, dois são bloqueadores literais para o carro 1 (contrato revisado por advogado, apólice de seguro de frota) — o resto pode esperar a Fase correspondente. Eu recomendo resolver esses dois primeiro, antes de qualquer outra coisa deste documento.

**Pergunta que ficou sem resposta:** a premissa da seção 0 — PrimeCharge é primariamente uma empresa de tecnologia validando na própria frota, ou primariamente uma locadora que vai também vender o software depois? Assumi a primeira leitura ao longo do documento porque é o que `PRODUCT_VISION.md` já registra, mas isso muda o roadmap de capital (dívida de frota vs. equity de SaaS) de forma real, e só você pode responder.
