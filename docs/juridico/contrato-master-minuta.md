# CONTRATO MASTER — MINUTA DE LOCAÇÃO DE VEÍCULO PARA MOTORISTA DE APLICATIVO

> **STATUS: MINUTA — NÃO ASSINAR SEM REVISÃO DE ADVOGADO.**
> Este documento é um rascunho técnico produzido para servir de base à revisão jurídica.
> **Não é uma peça jurídica pronta, não foi validado por advogado e não confere garantia de
> validade, blindagem ou "proteção 100%".** Toda marcação `[VALIDAR COM ADVOGADO]` sinaliza
> uma decisão jurídica que precisa ser tomada por um profissional habilitado — inclusive
> percentuais, prazos, foro, e a redação final de cláusulas penais. Nada aqui inventa
> legislação ou jurisprudência; onde a lei exata importa, o ponto está marcado para conferência.
>
> O sistema PrimeCharge gera o contrato final substituindo as variáveis `{{...}}` pelos dados
> do momento da geração (snapshot). Este arquivo é, ao mesmo tempo, (a) a minuta para o advogado
> revisar e (b) o `corpo` do template `contrato_templates` a ser cadastrado depois da revisão.

---

## Variáveis do template (preenchidas pelo gerador a partir do snapshot)

| Variável | Origem | Exemplo |
|---|---|---|
| `{{empresa.razao_social}}` | cadastro da empresa | PrimeCharge Locadora LTDA |
| `{{empresa.cnpj}}` | cadastro da empresa | 00.000.000/0001-00 |
| `{{empresa.endereco}}` | cadastro da empresa | Rua X, nº, cidade/UF |
| `{{motorista.nome}}` | cadastro do motorista | — |
| `{{motorista.cpf}}` | cadastro do motorista | — |
| `{{motorista.cnh}}` | cadastro do motorista | nº + categoria |
| `{{motorista.endereco}}` | cadastro do motorista | — |
| `{{veiculo.marca_modelo}}` | cadastro do veículo | — |
| `{{veiculo.placa}}` | cadastro do veículo | — |
| `{{veiculo.renavam}}` | cadastro do veículo | — |
| `{{veiculo.chassi}}` | cadastro do veículo | — |
| `{{veiculo.ano}}` | cadastro do veículo | 2024/2025 |
| `{{veiculo.cor}}` | cadastro do veículo | — |
| `{{contrato.valor_periodico}}` | contrato | R$ 1.400,00 |
| `{{contrato.periodicidade}}` | contrato | semanal |
| `{{contrato.dia_vencimento}}` | contrato | — |
| `{{contrato.valor_caucao}}` | contrato | R$ 3.000,00 |
| `{{contrato.data_inicio}}` | contrato | — |
| `{{contrato.prazo}}` | contrato | 12 meses |
| `{{contrato.km_incluso}}` | contrato / política | `[VALIDAR COM ADVOGADO]` |

---

## CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR

Pelo presente instrumento particular, de um lado:

**LOCADORA:** `{{empresa.razao_social}}`, inscrita no CNPJ sob o nº `{{empresa.cnpj}}`, com sede em
`{{empresa.endereco}}`, doravante denominada **LOCADORA**;

e, de outro lado:

**LOCATÁRIO(A):** `{{motorista.nome}}`, portador(a) do CPF nº `{{motorista.cpf}}` e da Carteira
Nacional de Habilitação nº `{{motorista.cnh}}`, residente e domiciliado(a) em
`{{motorista.endereco}}`, doravante denominado(a) **LOCATÁRIO**;

têm entre si justo e contratado o presente Contrato de Locação de Veículo Automotor, que se regerá
pelas cláusulas seguintes e, no que for omisso, pela legislação civil brasileira aplicável à
locação de bens móveis. `[VALIDAR COM ADVOGADO: confirmar o enquadramento legal — locação de bem
móvel (Código Civil) e não relação de consumo/trabalho — e a fundamentação a citar. A qualificação
correta muda várias cláusulas abaixo.]`

### CLÁUSULA 1 — OBJETO

1.1. A LOCADORA cede ao LOCATÁRIO, a título de locação, o veículo automotor a seguir descrito,
para uso conforme este contrato:

- Marca/Modelo: `{{veiculo.marca_modelo}}`
- Placa: `{{veiculo.placa}}` — RENAVAM: `{{veiculo.renavam}}` — Chassi: `{{veiculo.chassi}}`
- Ano: `{{veiculo.ano}}` — Cor: `{{veiculo.cor}}`

1.2. O veículo é entregue em condições de uso, documentado e segurado nos termos da Cláusula 7,
mediante vistoria de entrega registrada no sistema da LOCADORA, que integra este contrato como
anexo (fotos, quilometragem e estado geral no ato da entrega).

### CLÁUSULA 2 — DESTINAÇÃO E USO

2.1. O veículo destina-se ao uso do LOCATÁRIO, inclusive para prestação de serviços de transporte
remunerado por plataformas de aplicativo, respeitada a legislação de trânsito e as regras das
plataformas.

2.2. É vedado ao LOCATÁRIO: (a) sublocar, ceder ou emprestar o veículo a terceiros, salvo
autorização escrita da LOCADORA; (b) utilizar o veículo para fins ilícitos; (c) conduzir sob
efeito de álcool ou substâncias que comprometam a direção; (d) transportar cargas ou passageiros
acima da capacidade legal; (e) remover, adulterar ou desligar equipamentos de rastreamento,
telemetria ou identificação instalados pela LOCADORA.

2.3. `[VALIDAR COM ADVOGADO: definir se há limite de quilometragem ({{contrato.km_incluso}}) e a
consequência do excedente, ou se a quilometragem é livre. Escolha comercial + jurídica.]`

### CLÁUSULA 3 — PRAZO

3.1. A locação vigora pelo prazo de `{{contrato.prazo}}`, com início em `{{contrato.data_inicio}}`,
podendo ser renovada por acordo entre as partes, formalizado por aditivo registrado no sistema.

3.2. A renovação não é automática: depende de manifestação das partes antes do término, na forma
da Cláusula 12.

### CLÁUSULA 4 — VALOR, PAGAMENTO E REAJUSTE

4.1. O LOCATÁRIO pagará à LOCADORA o valor de `{{contrato.valor_periodico}}` por período
`{{contrato.periodicidade}}`, com vencimento no dia `{{contrato.dia_vencimento}}` de cada período,
pelos meios de pagamento indicados pela LOCADORA.

4.2. O atraso no pagamento sujeita o LOCATÁRIO a multa moratória e juros de mora, nos limites
legais. `[VALIDAR COM ADVOGADO: fixar os percentuais de multa e de juros de mora dentro do limite
legal — não preencher número sem conferência. Percentual abusivo é nulo.]`

4.3. Os valores poderão ser reajustados na renovação ou anualmente por índice oficial a ser
definido. `[VALIDAR COM ADVOGADO: escolher o índice (ex.: IPCA) e a periodicidade mínima permitida
por lei.]`

### CLÁUSULA 5 — CAUÇÃO (GARANTIA)

5.1. A título de garantia das obrigações deste contrato, o LOCATÁRIO presta caução em dinheiro no
valor de `{{contrato.valor_caucao}}`, a ser mantida pela LOCADORA durante a vigência.

5.2. Ao término do contrato, cumpridas todas as obrigações e ressalvados eventuais débitos, danos
ou multas de responsabilidade do LOCATÁRIO, a caução será devolvida `[VALIDAR COM ADVOGADO: prazo
de devolução e regras de retenção/compensação — a compensação precisa de base contratual clara e
não pode ser arbitrária.]`

### CLÁUSULA 6 — CONSERVAÇÃO, MANUTENÇÃO E RECARGA

6.1. O LOCATÁRIO obriga-se a zelar pelo veículo, mantê-lo limpo e comunicar imediatamente à
LOCADORA qualquer defeito, avaria ou anormalidade.

6.2. `[VALIDAR COM ADVOGADO: dividir claramente as responsabilidades de manutenção — o que é da
LOCADORA (manutenção preventiva/desgaste natural) e o que é do LOCATÁRIO (mau uso, negligência).
Esta divisão é fonte comum de litígio.]`

6.3. Sendo o veículo elétrico, a recarga da bateria durante a locação é de responsabilidade do
LOCATÁRIO, salvo disposição diversa. A LOCADORA orientará sobre pontos e cuidados de recarga.
`[VALIDAR COM ADVOGADO: confirmar responsabilidade por degradação de bateria e por danos
decorrentes de recarga inadequada.]`

### CLÁUSULA 7 — SEGURO, SINISTROS E MULTAS

7.1. O veículo conta com seguro nos termos da apólice mantida pela LOCADORA, cujas coberturas,
franquia e exclusões são informadas ao LOCATÁRIO. `[VALIDAR COM ADVOGADO: anexar/condicionar à
apólice real; a franquia e as exclusões precisam constar de forma expressa.]`

7.2. Em caso de sinistro (colisão, furto, roubo, avaria, incêndio ou dano a terceiros), o
LOCATÁRIO deve comunicar a LOCADORA imediatamente e lavrar boletim de ocorrência quando cabível. O
registro do sinistro no sistema da LOCADORA integra o histórico do contrato.

7.3. As multas e infrações de trânsito cometidas na vigência da locação são de responsabilidade do
LOCATÁRIO, incluindo pontuação na CNH, na forma da legislação de trânsito. `[VALIDAR COM ADVOGADO:
o procedimento de indicação do condutor infrator segue o CTB — descrever conforme a lei.]`

7.4. A responsabilidade do LOCATÁRIO por danos causados por culpa (mau uso, negligência,
imprudência, imperícia ou uso em desacordo com este contrato) observará a franquia e as
exclusões da apólice. `[VALIDAR COM ADVOGADO: não redigir cláusula que transfira ao LOCATÁRIO
responsabilidade além da permitida em lei; equilíbrio evita nulidade.]`

### CLÁUSULA 8 — RASTREAMENTO E DADOS

8.1. O veículo pode conter equipamento de rastreamento e telemetria, cujos dados são utilizados
para gestão da frota, segurança e cumprimento deste contrato, na forma da legislação de proteção
de dados. `[VALIDAR COM ADVOGADO / LGPD: descrever finalidade, base legal e direitos do titular; o
LOCATÁRIO deve ser informado de forma transparente.]`

### CLÁUSULA 9 — OBRIGAÇÕES DO LOCATÁRIO

9.1. Além das demais previstas neste contrato, são obrigações do LOCATÁRIO: manter CNH válida e
compatível; usar o veículo conforme a destinação; efetuar os pagamentos nas datas devidas;
restituir o veículo no estado em que o recebeu, ressalvado o desgaste natural; e comunicar
mudança de endereço ou de dados de contato.

### CLÁUSULA 10 — OBRIGAÇÕES DA LOCADORA

10.1. São obrigações da LOCADORA: entregar o veículo em condições de uso e documentado; garantir a
manutenção que lhe couber (Cláusula 6.2); manter o seguro contratado; e prestar as orientações
necessárias ao uso adequado do veículo.

### CLÁUSULA 11 — RESCISÃO

11.1. O contrato pode ser rescindido: (a) por acordo entre as partes; (b) ao término do prazo sem
renovação; (c) por descumprimento de obrigação essencial por qualquer das partes, observado o
disposto na Cláusula 11.2.

11.2. Em caso de descumprimento, a parte prejudicada notificará a outra para que sane a falta no
prazo `[VALIDAR COM ADVOGADO: definir prazo de purgação da mora e forma da notificação]`;
persistindo o descumprimento, o contrato poderá ser rescindido.

11.3. A rescisão obriga o LOCATÁRIO a restituir imediatamente o veículo, mediante vistoria de
devolução registrada no sistema, apurando-se débitos, danos e multas pendentes.

11.4. `[VALIDAR COM ADVOGADO: eventual cláusula penal por rescisão antecipada deve ser proporcional
e não pode configurar penalidade abusiva; definir critério (ex.: proporcional ao período restante,
com teto).]`

### CLÁUSULA 12 — RENOVAÇÃO E ADITIVOS

12.1. Qualquer alteração de valor, veículo, prazo ou condição será formalizada por aditivo, que
não substitui nem apaga o contrato original — integra-o como novo documento versionado no sistema.

### CLÁUSULA 13 — DISPOSIÇÕES GERAIS

13.1. A tolerância de uma parte quanto ao descumprimento de qualquer obrigação pela outra não
implica novação nem renúncia de direito.

13.2. A nulidade de qualquer cláusula não invalida as demais.

13.3. As comunicações entre as partes podem ser feitas pelos canais eletrônicos indicados no
cadastro (e-mail e sistema), considerando-se recebidas quando disponibilizadas.

### CLÁUSULA 14 — ASSINATURA ELETRÔNICA

14.1. As partes reconhecem a validade da manifestação de vontade por meio eletrônico, registrando o
sistema da LOCADORA a data, a identificação do signatário e evidências técnicas do aceite (como
e-mail, IP e registro de horário). `[VALIDAR COM ADVOGADO: descrever o meio de assinatura
efetivamente utilizado. O registro do sistema é EVIDÊNCIA do aceite; não afirmar valor probatório
absoluto nem equivalência automática à assinatura com certificado ICP-Brasil, salvo se for esse o
meio adotado.]`

### CLÁUSULA 15 — FORO

15.1. `[VALIDAR COM ADVOGADO: definir o foro de eleição conforme a natureza jurídica confirmada na
Cláusula introdutória — foro abusivo é afastável pelo juiz.]`

E, por estarem justas e contratadas, as partes firmam o presente instrumento.

Local e data: __________________________

**LOCADORA:** `{{empresa.razao_social}}`

**LOCATÁRIO:** `{{motorista.nome}}`

---

### Anexos (gerados/anexados pelo sistema)
- Vistoria de entrega (fotos, km, estado) — snapshot no momento da assinatura.
- Resumo das condições comerciais (valor, periodicidade, caução, prazo).
- Apólice de seguro / resumo de coberturas e franquia `[VALIDAR COM ADVOGADO]`.

---

## Notas para o advogado (checklist de decisões abertas)

1. Natureza jurídica e legislação de regência (Cláusula introdutória) — decide foro, prazos e limites.
2. Multa e juros de mora — percentuais dentro do limite legal (4.2).
3. Índice e periodicidade de reajuste (4.3).
4. Prazo e regras de retenção/devolução da caução (5.2).
5. Divisão de responsabilidade de manutenção (6.2) e bateria (6.3).
6. Seguro: franquia, exclusões, e limite da responsabilidade do LOCATÁRIO (7.1, 7.4).
7. Procedimento de indicação de condutor infrator conforme CTB (7.3).
8. LGPD: finalidade, base legal e transparência do rastreamento (8.1).
9. Prazo de purgação da mora e forma de notificação na rescisão (11.2).
10. Cláusula penal por rescisão antecipada — proporcionalidade e teto (11.4).
11. Meio de assinatura eletrônica efetivo e seu valor probatório (14.1).
12. Foro de eleição (15.1).
13. Limite de quilometragem, se houver (2.3).
