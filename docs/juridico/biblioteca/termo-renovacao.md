# TERMO DE RENOVAÇÃO / PRORROGAÇÃO DO CONTRATO DE LOCAÇÃO

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** A renovação NUNCA é automática: este termo é gerado
> por decisão expressa das partes. Renovação (novo prazo com condições possivelmente reajustadas)
> e prorrogação (extensão do prazo nas mesmas condições) usam este mesmo termo, indicado no campo
> de modalidade. O contrato original permanece congelado; este termo o integra como aditivo.

**LOCADORA:** {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}
**LOCATÁRIO:** {{motorista.nome}}, CPF {{motorista.cpf}}
**Contrato:** nº {{contrato.numero}} — veículo {{veiculo.marca_modelo}}, placa {{veiculo.placa}}

## 1. Renovação/Prorrogação

1.1. As partes resolvem, de comum acordo, **{{aditivo.tipo}}** o Contrato de Locação acima
identificado, pelo motivo registrado: {{aditivo.descricao}}

1.2. Novo prazo de vigência: **{{aditivo.condicao_nova}}**, com efeitos a partir de
**{{aditivo.data_efeito}}**.

## 2. Condições comerciais do novo período

2.1. Valor: **{{contrato.valor_periodico}}** por período **{{contrato.periodicidade}}**
{{#se contrato.valor_caucao}}— caução mantida em {{contrato.valor_caucao}}{{/se}}.
O valor indicado é o VIGENTE no contrato na data desta renovação; alteração de valor, caução ou
demais condições, se pactuada para o novo período, é formalizada por **aditivo próprio**
registrado no sistema, conforme o Contrato de Locação. [VALIDAR COM ADVOGADO: aplicação de
reajuste na renovação — índice e periodicidade, mesma pendência do Contrato Master — e se a
alteração de valor pode constar deste próprio termo em vez de aditivo separado.]

{{#se contrato.km_incluso}}
2.2. Franquia de quilometragem do novo período: {{contrato.km_incluso}}
(excedente a {{contrato.valor_km_excedente}}/km).
{{/se}}

## 3. Estado do veículo

3.1. O veículo permanece na posse do LOCATÁRIO; recomenda-se vistoria de renovação registrada no
sistema para marcar o estado na virada do período. [VALIDAR COM ADVOGADO: obrigatoriedade da
vistoria de renovação.]

## 4. Disposições

4.1. Permanecem em vigor as demais cláusulas do Contrato de Locação e termos anexos. Este termo é
registrado no sistema com versão, hash e assinaturas, sem alterar o documento original.

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCADORA:** {{empresa.razao_social}}

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
