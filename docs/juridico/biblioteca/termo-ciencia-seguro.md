# TERMO DE CIÊNCIA DO SEGURO — COBERTURAS, FRANQUIA E EXCLUSÕES

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Os dados abaixo vêm do CADASTRO DO SEGURO no
> sistema. O sistema NUNCA presume cobertura: o que não está declarado como contratado não
> aparece como coberto. Consolida ciência de seguro, franquia, coberturas e exclusões (peça única
> de propósito — os quatro assuntos são a mesma apólice).

**{{motorista.nome}}**, CPF {{motorista.cpf}}, LOCATÁRIO do veículo {{veiculo.marca_modelo}},
placa {{veiculo.placa}} (Contrato nº {{contrato.numero}} com {{empresa.razao_social}}), declara
ciência das condições de seguro abaixo:

## 1. Apólice

{{#se seguro.apolice}}
- Seguradora: **{{seguro.seguradora}}**
- Apólice nº: **{{seguro.apolice}}**
- Vigência: **{{seguro.vigencia}}**
- Franquia: **{{seguro.franquia}}**
- Assistências: {{seguro.assistencia}}
{{/se}}
{{#senao seguro.apolice}}
[SEM APÓLICE CADASTRADA — este termo não deve ser emitido antes do cadastro do seguro no sistema.]
{{/senao}}

## 2. Coberturas declaradas como CONTRATADAS

{{seguro.coberturas}}

## 3. Coberturas declaradas como NÃO CONTRATADAS

{{#se seguro.exclusoes}}{{seguro.exclusoes}}{{/se}}{{#senao seguro.exclusoes}}Nenhuma exclusão
declarada no cadastro — prevalece o texto integral da apólice.{{/senao}}

## 4. Ciências

4.1. Estou ciente de que a **franquia** e as demais condições da apólice se aplicam nos termos do
Contrato de Locação, e de que a cobertura pode ser afastada pela seguradora em hipóteses previstas
na apólice (ex.: condutor não habilitado, embriaguez, uso vedado). [VALIDAR COM ADVOGADO:
transcrever da apólice real as hipóteses de perda de cobertura relevantes; não presumir.]

4.2. Estou ciente de que o texto integral da apólice prevalece sobre este resumo e está disponível
comigo em anexo no sistema. [VALIDAR COM ADVOGADO: obrigatoriedade de entrega da apólice íntegra.]

4.3. Em caso de sinistro, seguirei o procedimento do Termo de Ciência de Procedimentos de
Sinistro e da Comunicação de Sinistro do sistema.

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
