# TERMO DE ENTREGA DO VEÍCULO

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Documento operacional vinculado ao Contrato de
> Locação nº {{contrato.numero}}. Não substitui a vistoria fotográfica registrada no sistema.

Pelo presente termo, **{{empresa.razao_social}}** (LOCADORA) entrega a **{{motorista.nome}}**,
CPF {{motorista.cpf}} (LOCATÁRIO), o veículo objeto do Contrato de Locação nº {{contrato.numero}}:

- Veículo: {{veiculo.marca_modelo}} — Placa {{veiculo.placa}} — Chassi {{veiculo.chassi}}
- Data da entrega: {{entrega.data}}
- Quilometragem (odômetro): **{{entrega.km}} km**
- Nível de bateria: **{{entrega.bateria_pct}}%**

## 1. Inventário entregue

Itens conferidos e entregues junto com o veículo (chaves, carregadores, cabos, documentos e
acessórios):

{{entrega.itens}}

## 2. Estado do veículo

2.1. O veículo foi entregue nas condições registradas na **vistoria de entrega** do sistema
(fotografias, odômetro, bateria e estado geral), que integra este termo.

2.2. Avarias preexistentes registradas na entrega (não imputáveis ao LOCATÁRIO):
{{#se entrega.avarias}}{{entrega.avarias}}{{/se}}{{#senao entrega.avarias}}nenhuma avaria
registrada.{{/senao}}

## 3. Declarações do LOCATÁRIO

3.1. Recebi o veículo e os itens do inventário acima, conferi as condições registradas na vistoria
e estou de acordo com o estado descrito.

3.2. Estou ciente de que, a partir desta entrega, respondo pela guarda e conservação do veículo
nos termos do Contrato de Locação, e de que a devolução será conferida contra este inventário e
esta vistoria.

{{#se entrega.observacoes}}
## 4. Observações

{{entrega.observacoes}}
{{/se}}

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCADORA:** {{empresa.razao_social}}

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}

[VALIDAR COM ADVOGADO: valor probatório do termo + vistoria fotográfica como prova do estado de
entrega, e redação da declaração de conferência pelo locatário.]
