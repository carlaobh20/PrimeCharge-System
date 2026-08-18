# TERMO DE CIÊNCIA OPERACIONAL — USO, MANUTENÇÃO, RECARGA E QUILOMETRAGEM

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Consolida os termos de ciência de uso, manutenção,
> recarga e quilometragem num único documento com capítulos (peça única de propósito — quatro
> termos separados repetiriam qualificação e assinatura; cada capítulo permanece autônomo).

**{{motorista.nome}}**, CPF {{motorista.cpf}}, LOCATÁRIO do veículo {{veiculo.marca_modelo}},
placa {{veiculo.placa}} (Contrato nº {{contrato.numero}} com {{empresa.razao_social}}), declara
ciência das condições operacionais abaixo:

## 1. Uso

1.1. O veículo destina-se ao meu uso pessoal e à prestação de serviço em aplicativos de
transporte, sendo vedados: condução por terceiro não autorizado, sublocação, transporte de carga,
competições, uso off-road e modificações sem autorização — conforme o Contrato de Locação.

1.2. Minha CNH permanecerá válida durante toda a locação; comunicarei suspensão ou cassação em
até 24 horas.

## 2. Manutenção

2.1. As manutenções preventivas são agendadas pela LOCADORA; obrigo-me a disponibilizar o veículo
nas datas marcadas. A indisponibilidade decorrente de manutenção programada segue a regra de
substituição/compensação do Contrato.

2.2. Não realizarei reparos por conta própria sem autorização, salvo urgência com comunicação
imediata. A divisão de responsabilidade por manutenção corretiva e desgaste segue a matriz do
Contrato. [VALIDAR COM ADVOGADO: matriz de manutenção — pendência já registrada no Contrato Master.]

## 3. Recarga (veículo elétrico)

3.1. A recarga é minha responsabilidade, com equipamentos compatíveis e em instalações adequadas.
Estou ciente das características do veículo elétrico (autonomia variável conforme uso e clima,
tempo de recarga, planejamento de rede de carregadores).

3.2. Danos por recarga inadequada correm por minha conta, nos termos do Contrato; a degradação
natural da bateria não me é imputável.

## 4. Quilometragem

{{#se contrato.km_incluso}}
4.1. Estou ciente da franquia de **{{contrato.km_incluso}}** e da cobrança de
**{{contrato.valor_km_excedente}}** por km excedente, apurada por odômetro e telemetria conforme o
Contrato.
{{/se}}
{{#senao contrato.km_incluso}}
4.1. Estou ciente de que a locação é de quilometragem livre, permanecendo as obrigações de uso
regular e manutenção.
{{/senao}}

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
