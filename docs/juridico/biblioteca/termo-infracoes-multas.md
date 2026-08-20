# TERMO DE CIÊNCIA DE INFRAÇÕES E RESPONSABILIDADE POR MULTAS

> **MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA.** Consolida a ciência geral de infrações (assinada na
> contratação) e o reconhecimento de multa específica (gerado por multa registrada) — os blocos
> condicionais ativam a seção específica só quando há multa vinculada.

**{{motorista.nome}}**, CPF {{motorista.cpf}}, CNH {{motorista.cnh}}, LOCATÁRIO do veículo
{{veiculo.marca_modelo}}, placa {{veiculo.placa}} (Contrato nº {{contrato.numero}} com
{{empresa.razao_social}}):

## 1. Ciência geral

1.1. Declaro ciência de que as infrações de trânsito cometidas durante minha posse do veículo são
de minha responsabilidade — valores, taxas e pontuação — conforme o Contrato de Locação.

1.2. Comprometo-me a fornecer os dados e assinaturas necessários à **indicação de condutor
infrator** nos prazos legais, e estou ciente de que a recusa tem as consequências previstas na
legislação de trânsito e no Contrato. [VALIDAR COM ADVOGADO: procedimento de indicação conforme o
CTB e a consequência contratual da recusa — sem inventar sanção.]

{{#se multa.orgao}}
## 2. Reconhecimento de infração específica

2.1. Reconheço a ciência da seguinte infração, registrada no sistema e vinculada ao meu período
de posse:

- Órgão autuador: **{{multa.orgao}}**
- Data da infração: **{{multa.data}}**
- Descrição: {{multa.descricao}}
- Valor: **{{multa.valor}}**

2.2. Estou ciente do procedimento de indicação de condutor e dos prazos de defesa/recurso
indicados na notificação do órgão autuador — a defesa é direito meu e corre pelos canais oficiais.
[VALIDAR COM ADVOGADO: quem conduz recurso quando o interesse da locadora e do condutor divergem.]
{{/se}}

Local e data: {{local.assinatura}}, {{data.hoje}}.

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}
