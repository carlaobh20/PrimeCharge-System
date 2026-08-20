# TERMO DE ENCERRAMENTO E DEVOLUÇÃO DEFINITIVA

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Fecha o ciclo da rescisão após a devolução do
> veículo e a conclusão do checklist de encerramento do sistema (veículo devolvido, vistoria
> final, pagamentos verificados, caução apurada). Consolida encerramento + devolução definitiva.

**LOCADORA:** {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}
**LOCATÁRIO:** {{motorista.nome}}, CPF {{motorista.cpf}}
**Contrato:** nº {{contrato.numero}} — veículo {{veiculo.marca_modelo}}, placa {{veiculo.placa}}

## 1. Devolução definitiva

1.1. O veículo foi devolvido em {{devolucao.data}}, com {{devolucao.km}} km e
{{devolucao.bateria_pct}}% de bateria, conforme vistoria de devolução e Termo de Devolução, com o
inventário: {{devolucao.itens}}

## 2. Apuração final (demonstrativo)

2.1. A apuração final registrada no sistema é: {{rescisao.valores}}

2.2. O demonstrativo item a item (cobranças, pagamentos, débitos, créditos, danos, multas e
caução) integra este termo como anexo. Nenhum valor foi calculado como penalidade automática —
somente valores registrados com sua origem. [VALIDAR COM ADVOGADO: forma do demonstrativo e prazo
de contestação pelo locatário.]

{{#se contrato.valor_caucao}}
2.3. **Caução.** A caução de {{contrato.valor_caucao}} tem sua destinação (restituição integral,
parcial ou retenção fundamentada) indicada no demonstrativo do item 2.2. [VALIDAR COM ADVOGADO:
prazo de restituição e requisitos da retenção — sem presunção de direito de reter.]
{{/se}}

## 3. Débitos posteriores

3.1. Débitos do período de posse do LOCATÁRIO identificados após este encerramento (multas com
notificação posterior e congêneres) serão cobrados com o comprovante correspondente, conforme o
Contrato. [VALIDAR COM ADVOGADO: prazo-limite e procedimento dessa cobrança residual.]

## 4. Encerramento

4.1. Cumpridas as etapas acima, as partes declaram ENCERRADO o Contrato de Locação nº
{{contrato.numero}}, permanecendo válidos os registros, documentos e evidências arquivados no
sistema (dossiê do contrato). A eventual quitação recíproca é objeto do Termo de Quitação, após
liquidada a apuração.

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCADORA:** {{empresa.razao_social}}

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
