# ADITIVO CONTRATUAL

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Aditivo ÚNICO parametrizado por
> {{aditivo.tipo}} (valor, prazo, veículo, quilometragem, pagamento, caução, condições, outro) —
> em vez de dez aditivos quase idênticos. O contrato original NUNCA é sobrescrito: este aditivo
> integra-o como documento novo, versionado, com hash e assinaturas próprias no sistema.

**LOCADORA:** {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}
**LOCATÁRIO:** {{motorista.nome}}, CPF {{motorista.cpf}}
**Contrato aditado:** nº {{contrato.numero}} — veículo {{veiculo.marca_modelo}}, placa
{{veiculo.placa}}

## 1. Objeto do aditivo

1.1. As partes aditam o Contrato de Locação acima identificado, na modalidade
**{{aditivo.tipo}}**, pelo motivo registrado: {{aditivo.descricao}}

## 2. Alteração pactuada

2.1. Condição vigente até este aditivo: **{{aditivo.condicao_anterior}}**

2.2. Condição nova pactuada: **{{aditivo.condicao_nova}}**

2.3. A alteração produz efeitos a partir de **{{aditivo.data_efeito}}**. Obrigações vencidas e
efeitos já produzidos até essa data permanecem regidos pela condição anterior.

## 3. Disposições

3.1. Permanecem íntegras e em pleno vigor todas as demais cláusulas do Contrato de Locação e de
seus termos anexos, que não conflitem com o presente aditivo.

3.2. Este aditivo é registrado no sistema com número de versão, código de integridade (SHA-256) e
trilha de assinaturas — o documento original do contrato permanece congelado e inalterado.

3.3. [VALIDAR COM ADVOGADO: para o aditivo de TROCA DE VEÍCULO, definir se exige nova vistoria de
entrega e novo Termo de Entrega (recomendação operacional: sim) e o tratamento do seguro na
substituição. Para alteração de CAUÇÃO, o fluxo financeiro da diferença.]

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCADORA:** {{empresa.razao_social}}

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
