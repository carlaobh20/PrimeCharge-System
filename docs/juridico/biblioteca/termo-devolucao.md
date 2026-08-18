# TERMO DE DEVOLUÇÃO DO VEÍCULO

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Documento operacional vinculado ao Contrato de
> Locação nº {{contrato.numero}}. Não substitui a vistoria fotográfica registrada no sistema.

Pelo presente termo, **{{motorista.nome}}**, CPF {{motorista.cpf}} (LOCATÁRIO), devolve a
**{{empresa.razao_social}}** (LOCADORA) o veículo objeto do Contrato de Locação nº
{{contrato.numero}}:

- Veículo: {{veiculo.marca_modelo}} — Placa {{veiculo.placa}} — Chassi {{veiculo.chassi}}
- Data da devolução: {{devolucao.data}}
- Quilometragem (odômetro): **{{devolucao.km}} km**
- Nível de bateria: **{{devolucao.bateria_pct}}%**

## 1. Inventário devolvido

Itens conferidos na devolução (chaves, carregadores, cabos, documentos e acessórios):

{{devolucao.itens}}

## 2. Estado do veículo na devolução

2.1. O estado do veículo foi registrado na **vistoria de devolução** do sistema (fotografias,
odômetro, bateria e estado geral), que integra este termo e será confrontada com a vistoria de
entrega.

2.2. Avarias constatadas na devolução:
{{#se devolucao.avarias}}{{devolucao.avarias}}{{/se}}{{#senao devolucao.avarias}}nenhuma avaria
constatada além do desgaste natural.{{/senao}}

## 3. Pendências apuradas

{{#se devolucao.pendencias}}
3.1. Foram apuradas as seguintes pendências, a serem tratadas conforme o Contrato de Locação
(demonstrativo/prestação de contas): {{devolucao.pendencias}}
{{/se}}
{{#senao devolucao.pendencias}}
3.1. Não foram apuradas pendências nesta conferência. Débitos identificados APÓS a devolução
(multas com notificação posterior e congêneres do período de posse do LOCATÁRIO) seguem o
disposto no Contrato de Locação. [VALIDAR COM ADVOGADO: redação da ressalva de débitos
posteriores.]
{{/senao}}

## 4. Declarações

4.1. A devolução do veículo NÃO implica, por si, quitação das obrigações do Contrato — a apuração
final (danos, débitos, caução) segue o procedimento de encerramento do Contrato de Locação.
[VALIDAR COM ADVOGADO: relação entre este termo, o termo de encerramento e a eventual quitação.]

{{#se devolucao.observacoes}}
## 5. Observações

{{devolucao.observacoes}}
{{/se}}

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCADORA:** {{empresa.razao_social}}

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
