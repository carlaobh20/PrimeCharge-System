# PrimeCharge Platform — Value Engine

Como uma empresa de locação transforma dinheiro em patrimônio. Não fala de tela nem de tecnologia — mapeia o ciclo econômico real que o software existe para servir.

```
Capital → Compra de ativos → Preparação → Disponibilidade → Locação → Receita → Custos → Lucro → Venda do ativo → Reinvestimento → Crescimento patrimonial
```

---

## 1. Capital → Compra de ativos

**Aumenta valor**: comprar o modelo certo pro perfil de uso real (custo total de propriedade baixo, não só preço de tabela); negociar financiamento/consórcio com taxa que não corroa a margem futura; comprar no ritmo que a demanda real sustenta.
**Destrói valor**: comprar veículo com autonomia/custo de manutenção incompatível com o motorista-alvo; financiar com taxa ruim; expandir frota mais rápido que a ocupação atual justifica (capital parado).
**Indicadores**: custo de aquisição por veículo, custo total de propriedade (TCO) projetado, payback estimado.
**Alertas**: proposta de financiamento acima da referência de mercado; ritmo de compra descolado da taxa de ocupação atual da frota.
**IA (futuro)**: prever, a partir do histórico da própria frota, qual modelo/configuração tem melhor retorno esperado antes da compra.

## 2. Preparação

**Aumenta valor**: preparação rápida — cada dia entre compra e disponibilidade é capital parado sem gerar receita; checklist padronizado que evita retrabalho.
**Destrói valor**: atraso em documentação/emplacamento/revisão que estende o tempo até a primeira locação.
**Indicadores**: tempo médio entre compra e disponibilidade (days-to-available).
**Alertas**: veículo em preparação há mais tempo que a média histórica da frota.
**IA (futuro)**: identificar gargalo sistemático de preparação (ex.: fornecedor de emplacamento atrasando recorrentemente).

## 3. Disponibilidade

**Aumenta valor**: minimizar tempo parado entre contratos (matching rápido veículo-motorista); preço calibrado equilibrando ocupação e margem.
**Destrói valor**: veículo disponível ficando ocioso por falta de visibilidade; preço mal calibrado (alto demais = vacância, baixo demais = margem ruim).
**Indicadores**: vacância (dias parado / dias totais), tempo médio até nova locação.
**Alertas**: veículo disponível há mais de X dias sem contrato (limiar calibrado com dado real a partir da Fase 1).
**IA (futuro)**: recomendar preço dinâmico baseado em demanda histórica por região/modelo.

## 4. Locação → Receita

**Aumenta valor**: contrato bem estruturado (prazo, condições de pagamento, garantias); motorista com bom histórico de pagamento e cuidado com o veículo.
**Destrói valor**: aceitar motorista de alto risco sem avaliação; contrato que não permite ação rápida em caso de inadimplência.
**Indicadores**: receita por veículo, taxa de inadimplência, tempo médio de contrato.
**Alertas**: pagamento atrasado; motorista com padrão recorrente de atraso.
**IA (futuro)**: score de risco do motorista a partir do histórico da própria base, antes de fechar o contrato.

## 5. Custos

**Aumenta valor**: manutenção preventiva (sempre mais barata que corretiva); negociação com oficinas/fornecedores; gestão eficiente de sinistro.
**Destrói valor**: manutenção negligenciada até quebra maior; documento vencido gerando multa; sinistro mal conduzido.
**Indicadores**: custo de manutenção por veículo, proporção preventiva vs. corretiva, valor de multas e documentos vencidos.
**Alertas**: documento vencendo (IPVA, seguro, licenciamento); manutenção preventiva atrasada.
**IA (futuro)**: prever necessidade de manutenção antes da quebra, a partir de padrão de uso/quilometragem.

## 6. Lucro

**Aumenta valor**: manter margem saudável por veículo — não perseguir ocupação a qualquer custo; centro de custo categorizado corretamente pra saber de onde o lucro realmente vem.
**Destrói valor**: aceitar contrato ruim só para não deixar veículo parado, sacrificando margem por ocupação.
**Indicadores**: lucro operacional por veículo, margem por modelo/segmento.
**Alertas**: veículo ou modelo com margem consistentemente abaixo da média da frota.
**IA (futuro)**: identificar quais veículos/modelos/perfis de motorista são mais lucrativos; recomendar realocação de capital.

## 7. Venda do ativo

**Aumenta valor**: vender no momento certo — antes que manutenção/depreciação corroam o valor residual; canal de venda que não força desconto.
**Destrói valor**: manter veículo na frota além do ponto ótimo (custo de manutenção cresce mais rápido que o valor residual cai); vender com pressa e mal precificado.
**Indicadores**: valor residual vs. valor de mercado, idade/km na venda, tempo até a venda se concretizar.
**Alertas**: veículo passando do ponto de depreciação ideal (por km ou tempo de frota).
**IA (futuro)**: prever o momento ótimo de venda por modelo, a partir da curva de depreciação real observada na própria frota.

## 8. Reinvestimento → Crescimento patrimonial

**Aumenta valor**: reinvestir em ativos com ROI comprovadamente melhor, usando dado real da própria frota — não achismo; diversificar risco (modelo, fornecedor).
**Destrói valor**: reinvestir sem disciplina (comprar mais do mesmo sem checar performance real); crescer patrimônio sem crescer lucro proporcional.
**Indicadores**: crescimento patrimonial líquido, ROI médio do capital reinvestido vs. ciclo anterior.
**Alertas**: patrimônio crescendo sem lucro operacional crescer proporcionalmente — sinal de expansão não saudável.
**IA (futuro)**: recomendar alocação de capital para o próximo ciclo de compra, a partir do que historicamente performou melhor na própria frota.

---

## Árvore: North Star → Resultado Financeiro

🟡 Ancorada na proposta condicional de `NORTH_STAR.md` (Taxa de utilização da frota). Se a Proposta de Valor pendente apontar outra prioridade, a camada de **Drivers** é a que muda — o resto da árvore se mantém.

```
North Star: Taxa de utilização da frota
    ↓
Drivers: tempo de preparação · velocidade de matching contrato-veículo
         · taxa de renovação de contrato · disciplina de manutenção preventiva
    ↓
Indicadores operacionais: vacância por veículo · dias-até-disponível
         · dias-até-nova-locação · custo de manutenção por veículo · inadimplência
    ↓
Eventos: veículo disponível · contrato criado · pagamento atrasado
         · manutenção vencendo · documento vencendo
    ↓
Ações: Command Center prioriza (contrato vencendo, veículo ocioso, documento vencendo)
         · Automação dispara (cobrança, lembrete) · execução final: automação ou usuário
         (nunca a IA diretamente — FOUNDATION_PRINCIPLES.md, Princípio 5)
    ↓
Resultado financeiro: receita por veículo · lucro operacional por veículo
         · crescimento patrimonial
```

Esta árvore é a referência para o que o Dashboard exibe, o que o Command Center prioriza, o que a IA (quando existir) tenta prever, e o que as Automações têm mandato de disparar — nenhum desses módulos decide sua própria prioridade isoladamente, todos apontam pra esta mesma cadeia.
