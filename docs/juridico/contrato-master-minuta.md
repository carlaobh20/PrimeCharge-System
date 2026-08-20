# CONTRATO MASTER — MINUTA DE LOCAÇÃO DE VEÍCULO ELÉTRICO PARA MOTORISTA DE APLICATIVO

> **STATUS: MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA. NÃO ASSINAR SEM REVISÃO DE ADVOGADO.**
> Rascunho técnico produzido para revisão jurídica. **Não é peça jurídica pronta, não foi
> validado por advogado e não confere garantia de validade, blindagem ou "proteção 100%".**
> Toda marcação `[VALIDAR COM ADVOGADO]` é uma decisão jurídica pendente — gerenciada na
> Sala do Advogado do sistema. Nada aqui inventa legislação ou jurisprudência.
>
> Este é o MASTER PARAMETRIZÁVEL da PrimeCharge: um único documento cobre as variantes
> comerciais (cobrança diária/semanal/mensal, com/sem caução, quilometragem controlada/livre)
> via variáveis `{{...}}` e blocos condicionais `{{#se ...}}/{{#senao ...}}` — em vez de oito
> contratos quase iguais. As variantes são aplicadas pela Política Contratual na geração.
> Catálogo completo de variáveis: `MATRIZ-VARIAVEIS.md` (gerada automaticamente).

---

## CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR ELÉTRICO

Pelo presente instrumento particular, de um lado:

**LOCADORA:** {{empresa.razao_social}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, com sede em
{{empresa.endereco}}, doravante denominada **LOCADORA**;

e, de outro lado:

**LOCATÁRIO(A):** {{motorista.nome}}, portador(a) do CPF nº {{motorista.cpf}} e da Carteira
Nacional de Habilitação nº {{motorista.cnh}}, residente e domiciliado(a) em
{{motorista.endereco}}, e-mail {{motorista.email}}, telefone {{motorista.telefone}}, doravante
denominado(a) **LOCATÁRIO**;

têm entre si justo e contratado o presente Contrato de Locação de Veículo Automotor, que se regerá
pelas cláusulas seguintes e, no que for omisso, pela legislação civil brasileira aplicável à
locação de bens móveis. [VALIDAR COM ADVOGADO: confirmar o enquadramento legal — locação de bem
móvel (Código Civil), afastando expressamente relação de consumo e de trabalho — e a fundamentação
a citar. A qualificação correta condiciona várias cláusulas abaixo.]

### CLÁUSULA 1 — OBJETO

1.1. A LOCADORA cede ao LOCATÁRIO, a título de locação, o veículo automotor elétrico:

- Marca/Modelo: {{veiculo.marca_modelo}} — Cor: {{veiculo.cor}}
- Placa: {{veiculo.placa}} — RENAVAM: {{veiculo.renavam}} — Chassi: {{veiculo.chassi}}
- Ano: {{veiculo.ano}} — Quilometragem na contratação: {{veiculo.quilometragem}} km
- Capacidade da bateria: {{veiculo.capacidade_bateria}} kWh

1.2. O veículo é entregue documentado, segurado nos termos da Cláusula 10 e em condições de uso,
mediante **vistoria de entrega** registrada no sistema da LOCADORA (fotos, quilometragem, nível de
bateria, inventário de itens e estado geral), que integra este contrato como anexo, acompanhada do
respectivo **Termo de Entrega do Veículo**.

### CLÁUSULA 2 — DESTINAÇÃO, USO E CONDUÇÃO

2.1. O veículo destina-se ao uso pessoal do LOCATÁRIO, inclusive para prestação de serviços de
transporte remunerado de passageiros por plataformas de aplicativo (como Uber e 99), respeitadas a
legislação de trânsito, as regras das plataformas e as condições deste contrato.

2.2. A condução é **exclusiva do LOCATÁRIO**. A condução por terceiro depende de autorização
prévia, expressa e escrita da LOCADORA, com identificação do condutor autorizado (nome, CPF e
CNH), permanecendo o LOCATÁRIO responsável nos termos deste contrato. [VALIDAR COM ADVOGADO:
alcance da responsabilidade do LOCATÁRIO por condutor autorizado e efeitos sobre o seguro.]

2.3. É vedado ao LOCATÁRIO: (a) sublocar, ceder, emprestar ou transferir a posse do veículo a
terceiros; (b) utilizá-lo para fins ilícitos; (c) conduzir sob efeito de álcool ou substâncias que
comprometam a direção; (d) transportar passageiros acima da capacidade legal; (e) utilizar o
veículo para transporte de cargas, mudanças ou tração de reboques; (f) participar de competições,
provas de velocidade ou uso off-road; (g) remover, adulterar ou desligar equipamentos de
rastreamento, telemetria ou identificação; (h) realizar modificações estéticas ou mecânicas sem
autorização escrita.

{{#se contrato.km_incluso}}
### CLÁUSULA 3 — QUILOMETRAGEM CONTROLADA

3.1. A locação inclui a franquia de quilometragem de **{{contrato.km_incluso}}**, apurada pelo
odômetro e pela telemetria do veículo.

3.2. A quilometragem excedente será cobrada à razão de **{{contrato.valor_km_excedente}}** por
quilômetro, apurada no fechamento de cada período de cobrança e lançada na cobrança seguinte.
[VALIDAR COM ADVOGADO: forma de apuração, contestação pelo LOCATÁRIO e limites do valor.]
{{/se}}
{{#senao contrato.km_incluso}}
### CLÁUSULA 3 — QUILOMETRAGEM LIVRE

3.1. A locação não possui limite de quilometragem, permanecendo o LOCATÁRIO obrigado ao uso
regular do veículo conforme a Cláusula 2 e às manutenções da Cláusula 8.
{{/senao}}

### CLÁUSULA 4 — PRAZO E VIGÊNCIA

4.1. A locação vigora pelo prazo {{contrato.prazo}}, com início em {{contrato.data_inicio}},
prorrogável ou renovável por acordo entre as partes, formalizado por **termo de renovação ou
aditivo** registrado no sistema — a renovação nunca é automática.

### CLÁUSULA 5 — VALOR, PAGAMENTO E INADIMPLÊNCIA

5.1. O LOCATÁRIO pagará à LOCADORA o valor de **{{contrato.valor_periodico}}** por período
**{{contrato.periodicidade}}**, com vencimento no dia {{contrato.dia_vencimento}} de cada período,
pelos meios de pagamento indicados pela LOCADORA.

5.2. O atraso sujeita o LOCATÁRIO a multa moratória e juros de mora, nos limites legais.
[VALIDAR COM ADVOGADO: fixar percentuais de multa e juros dentro do limite legal — percentual
abusivo é nulo. NÃO preencher número sem conferência.]

5.3. Persistindo a inadimplência por prazo superior ao definido em [VALIDAR COM ADVOGADO: prazo de
tolerância e procedimento de notificação], a LOCADORA poderá, cumulativamente e após notificação:
(a) suspender a disponibilização do veículo; (b) exigir a restituição imediata; (c) rescindir este
contrato nos termos da Cláusula 15. A suspensão não exonera os valores já devidos.

5.4. Os valores poderão ser reajustados na renovação ou anualmente por índice oficial.
[VALIDAR COM ADVOGADO: índice (ex.: IPCA) e periodicidade mínima legal.]

{{#se contrato.valor_caucao}}
### CLÁUSULA 6 — CAUÇÃO

6.1. A título de garantia das obrigações deste contrato, o LOCATÁRIO presta caução no valor de
**{{contrato.valor_caucao}}**, mantida pela LOCADORA durante a vigência.

6.2. Encerrado o contrato e cumpridas as obrigações, a caução será restituída, deduzidos —
mediante demonstrativo escrito (prestação de contas) — os débitos, danos e multas de
responsabilidade do LOCATÁRIO apurados na devolução. [VALIDAR COM ADVOGADO: prazo de devolução,
regras de retenção/compensação e forma do demonstrativo — a compensação exige base contratual
clara e não pode ser arbitrária.]
{{/se}}
{{#senao contrato.valor_caucao}}
### CLÁUSULA 6 — GARANTIA

6.1. Esta contratação não exige caução. As obrigações do LOCATÁRIO são garantidas pelas demais
disposições deste contrato. [VALIDAR COM ADVOGADO: conveniência de garantia alternativa (fiador,
seguro-fiança) para contratações sem caução.]
{{/senao}}

### CLÁUSULA 7 — ENTREGA, POSSE E DEVOLUÇÃO

7.1. A entrega e a devolução do veículo são formalizadas por **vistoria** registrada no sistema
(fotos, odômetro, nível de bateria, inventário: chaves, carregadores, cabos, documentos e
acessórios) e pelos respectivos Termos de Entrega e de Devolução, assinados pelas partes.

7.2. Da entrega até a efetiva devolução, o LOCATÁRIO detém a posse direta do veículo e responde
pela sua guarda e conservação, obrigando-se a comunicar imediatamente à LOCADORA qualquer
ocorrência relevante (dano, avaria, falha, sinistro, apreensão, furto ou roubo).

7.3. Na devolução, o veículo deve ser restituído no estado em que foi recebido, ressalvado o
desgaste natural de uso regular, com todos os itens do inventário de entrega. Itens faltantes ou
danos além do desgaste natural são apurados na vistoria de devolução e cobrados mediante
demonstrativo. [VALIDAR COM ADVOGADO: critério objetivo de "desgaste natural" vs. dano indenizável.]

7.4. Débitos apurados APÓS a devolução (multas de trânsito com notificação posterior, tarifas,
pedágios e congêneres, referentes ao período de posse do LOCATÁRIO) permanecem de responsabilidade
do LOCATÁRIO, que será notificado com o comprovante correspondente. [VALIDAR COM ADVOGADO: prazo e
procedimento de cobrança pós-devolução.]

### CLÁUSULA 8 — MANUTENÇÃO E CONSERVAÇÃO

8.1. A **manutenção preventiva** (revisões programadas pelo fabricante) é agendada pela LOCADORA e
realizada em rede por ela indicada, obrigando-se o LOCATÁRIO a disponibilizar o veículo nas datas
agendadas.

8.2. A responsabilidade por **manutenção corretiva**, desgaste de itens (pneus, rodas, freios) e
danos decorrentes de mau uso, negligência, imprudência ou uso em desacordo com este contrato segue
a matriz de responsabilidades definida em [VALIDAR COM ADVOGADO: matriz LOCADORA × LOCATÁRIO —
preventiva/desgaste natural vs. mau uso/negligência — parametrizada no sistema e pendente de
definição jurídica; fonte comum de litígio].

8.3. É vedado ao LOCATÁRIO realizar ou contratar reparos sem autorização da LOCADORA, salvo medida
urgente e indispensável para evitar dano maior, com comunicação imediata e comprovação.

### CLÁUSULA 9 — RECARGA E BATERIA (VEÍCULO ELÉTRICO)

9.1. A recarga da bateria durante a locação é de responsabilidade do LOCATÁRIO, que se obriga a
utilizar carregadores e cabos compatíveis e em bom estado, conforme orientações do fabricante e da
LOCADORA.

9.2. Danos à bateria ou ao sistema de recarga decorrentes de uso de equipamento inadequado,
adaptações não autorizadas ou recarga em instalações irregulares são de responsabilidade do
LOCATÁRIO. A degradação natural da bateria pelo uso regular corre por conta da LOCADORA.
[VALIDAR COM ADVOGADO: critério de distinção entre degradação natural e dano por recarga
inadequada, e efeito sobre a garantia de fábrica.]

9.3. O LOCATÁRIO declara ciência das características operacionais do veículo elétrico (autonomia
variável, tempo de recarga, rede de carregadores), sem direito a abatimento por limitações
inerentes à tecnologia.

### CLÁUSULA 10 — SEGURO, FRANQUIA E SINISTROS

10.1. O veículo conta com seguro nos termos da apólice mantida pela LOCADORA{{#se seguro.apolice}}
— seguradora {{seguro.seguradora}}, apólice nº {{seguro.apolice}}, vigência {{seguro.vigencia}},
franquia de {{seguro.franquia}}{{/se}}{{#senao seguro.apolice}}, cujos dados (seguradora, apólice,
vigência e franquia) serão informados ao LOCATÁRIO no Termo de Ciência do Seguro tão logo
formalizada a apólice do período{{/senao}}. As coberturas contratadas e as exclusões são as do
**Termo de Ciência do Seguro**, que integra este contrato. O que não estiver expressamente
declarado como coberto NÃO se presume coberto. [VALIDAR COM ADVOGADO: anexar a apólice real;
coberturas, franquia e exclusões devem constar de forma expressa.]

10.2. Em caso de sinistro (colisão, avaria, incêndio, furto, roubo, perda total ou dano a
terceiros), o LOCATÁRIO obriga-se a: (a) comunicar a LOCADORA imediatamente; (b) lavrar boletim de
ocorrência quando cabível; (c) preencher a Comunicação de Sinistro do sistema; (d) entregar os
documentos solicitados; (e) não assumir culpa nem negociar com terceiros sem anuência da LOCADORA.

10.3. A responsabilidade do LOCATÁRIO por danos decorrentes de culpa (mau uso, negligência,
imprudência, imperícia ou violação deste contrato) observará a franquia e as exclusões da apólice.
[VALIDAR COM ADVOGADO: limite da responsabilidade transferível ao LOCATÁRIO — equilíbrio evita
nulidade; incluir hipóteses de perda de cobertura por conduta do condutor.]

10.4. Em caso de furto, roubo ou perda total, o contrato resolve-se em relação ao veículo
sinistrado, apurando-se valores devidos até a data do evento e o tratamento da franquia/indenização
conforme a apólice. [VALIDAR COM ADVOGADO: efeitos financeiros da perda total entre as partes.]

### CLÁUSULA 11 — MULTAS E INFRAÇÕES

11.1. As infrações de trânsito cometidas durante a posse do LOCATÁRIO são de sua responsabilidade,
incluindo valores, taxas e pontuação. A LOCADORA realizará a indicação do condutor infrator na
forma e nos prazos da legislação de trânsito, obrigando-se o LOCATÁRIO a fornecer os dados e
assinaturas necessários. [VALIDAR COM ADVOGADO: procedimento de indicação conforme o CTB e
consequência da recusa do LOCATÁRIO em se indicar.]

### CLÁUSULA 12 — RASTREAMENTO, TELEMETRIA E PROTEÇÃO DE DADOS

12.1. O veículo possui rastreamento e telemetria (localização, quilometragem, velocidade, nível e
saúde da bateria, eventos de condução), utilizados para gestão da frota, segurança, prevenção de
ilícitos, apuração de quilometragem e cumprimento deste contrato, conforme o **Termo de Ciência
sobre Rastreamento e Telemetria** e o **Termo de Ciência sobre Tratamento de Dados**, que integram
este contrato. [VALIDAR COM ADVOGADO / LGPD: base legal, finalidade, retenção, compartilhamento e
direitos do titular — parametrizados no sistema e pendentes de definição jurídica.]

12.2. O LOCATÁRIO obriga-se a manter os equipamentos de rastreamento intactos; a remoção ou
inutilização constitui infração grave deste contrato.

### CLÁUSULA 13 — INDISPONIBILIDADE E SUBSTITUIÇÃO DO VEÍCULO

13.1. Em caso de indisponibilidade prolongada do veículo por manutenção ou sinistro sem culpa do
LOCATÁRIO, a LOCADORA poderá, a seu critério e conforme disponibilidade de frota: (a) disponibilizar
veículo substituto de categoria equivalente, sub-rogando-se este contrato ao veículo substituto
mediante termo/aditivo; ou (b) suspender proporcionalmente a cobrança pelo período de
indisponibilidade. [VALIDAR COM ADVOGADO: definir o regime — direito ou faculdade, prazo de
carência e critério de proporcionalidade. A oferta de veículo reserva é decisão comercial
parametrizável.]

### CLÁUSULA 14 — OBRIGAÇÕES DAS PARTES

14.1. **Da LOCADORA:** entregar o veículo documentado e em condições de uso; manter o seguro da
Cláusula 10; realizar as manutenções que lhe couberem; prestar orientações de uso e recarga;
emitir cobranças e demonstrativos; registrar vistorias e ocorrências no sistema.

14.2. **Do LOCATÁRIO:** manter CNH válida e compatível e comunicar suspensão/cassação em 24h; usar
o veículo conforme a destinação; pagar nas datas devidas; zelar pela guarda e conservação;
disponibilizar o veículo para manutenções e fiscalizações agendadas; manter cadastro atualizado
(endereço, telefone, e-mail); restituir o veículo ao término; cumprir os termos anexos.

14.3. O LOCATÁRIO autoriza a LOCADORA a realizar **fiscalizações operacionais** periódicas
(vistoria física agendada ou verificação remota via telemetria) para conferência do estado e do
uso regular do veículo.

### CLÁUSULA 15 — RESCISÃO

15.1. Este contrato pode ser rescindido: (a) por acordo entre as partes; (b) ao término do prazo
sem renovação; (c) por iniciativa de qualquer das partes, mediante aviso prévio de [VALIDAR COM
ADVOGADO: prazo de aviso prévio por parte]; (d) por descumprimento de obrigação essencial,
observada a notificação para purga em [VALIDAR COM ADVOGADO: prazo de purgação da mora e forma da
notificação].

15.2. A rescisão obriga o LOCATÁRIO a restituir imediatamente o veículo, seguindo-se a vistoria de
devolução, a apuração de débitos, danos e multas, e a prestação de contas da Cláusula 6 quando
houver caução. O processo é formalizado pelo **Termo de Rescisão** e pelo **Termo de
Encerramento** registrados no sistema.

15.3. [VALIDAR COM ADVOGADO: eventual cláusula penal por rescisão antecipada imotivada — deve ser
proporcional, com teto, sob pena de nulidade. O sistema NÃO calcula penalidade automaticamente;
o valor, se houver, é definido pela regra aprovada pelo advogado e registrado na apuração.]

### CLÁUSULA 16 — FORÇA MAIOR

16.1. Nenhuma das partes responde por descumprimento decorrente de caso fortuito ou força maior,
obrigando-se a parte afetada a comunicar o evento imediatamente e a mitigar seus efeitos. Os
valores devidos até o evento permanecem exigíveis. [VALIDAR COM ADVOGADO: tratamento da cobrança
durante impedimento prolongado.]

### CLÁUSULA 17 — COMUNICAÇÕES E CONFIDENCIALIDADE

17.1. As comunicações entre as partes serão feitas pelos canais eletrônicos indicados no cadastro
(e-mail, telefone e o aplicativo do sistema), reputando-se recebidas quando disponibilizadas.

17.2. As partes manterão confidencialidade sobre condições comerciais e dados pessoais a que
tiverem acesso em razão deste contrato, na medida exigida pela legislação aplicável.
[VALIDAR COM ADVOGADO: alcance adequado da confidencialidade para esta relação.]

### CLÁUSULA 18 — DISPOSIÇÕES GERAIS

18.1. A tolerância quanto ao descumprimento de qualquer obrigação não implica novação nem renúncia.
18.2. A nulidade de qualquer cláusula não invalida as demais.
18.3. Alterações somente por **aditivo** ou **nova versão** formalizados no sistema — o documento
assinado é imutável e as versões anteriores são preservadas.
18.4. {{contrato.regras_especificas}}

### CLÁUSULA 19 — ASSINATURA ELETRÔNICA

19.1. As partes reconhecem a validade da manifestação de vontade por meio eletrônico. O sistema da
LOCADORA registra data e hora, identificação do signatário, endereço eletrônico, dispositivo
utilizado e o código de integridade (SHA-256) do documento aceito, como **evidências** do aceite.
[VALIDAR COM ADVOGADO: meio de assinatura efetivamente adotado; o registro do sistema é EVIDÊNCIA
— não afirmar equivalência automática à assinatura com certificado ICP-Brasil, salvo se for esse o
meio contratado.]

### CLÁUSULA 20 — FORO

20.1. [VALIDAR COM ADVOGADO: foro de eleição conforme a natureza jurídica confirmada — foro
abusivo é afastável.]

E, por estarem justas e contratadas, as partes firmam o presente instrumento em
{{local.assinatura}}, na data de {{data.hoje}}.

**LOCADORA:** {{empresa.razao_social}}

**LOCATÁRIO:** {{motorista.nome}} — CPF {{motorista.cpf}}

---

### Anexos (gerados/anexados pelo sistema)
- Termo de Entrega do Veículo (vistoria de entrega: fotos, km, bateria, inventário).
- Termo de Ciência do Seguro (coberturas, franquia e exclusões da apólice real).
- Termo de Ciência sobre Rastreamento e Telemetria.
- Termo de Ciência sobre Tratamento de Dados (LGPD).
- Resumo das condições comerciais.

---

## Notas para o advogado (checklist de decisões abertas)

Gerenciadas item a item na **Sala do Advogado** do sistema. Em resumo: enquadramento legal e foro;
percentuais de multa/juros e prazo de tolerância; índice de reajuste; caução (prazo de devolução,
retenção, prestação de contas) e garantia alternativa sem caução; matriz de manutenção; bateria
(degradação × dano); seguro (apólice real, limite de responsabilidade, perda de cobertura, perda
total); indicação de condutor (CTB); LGPD/telemetria (base legal, retenção, compartilhamento);
apuração de km excedente; condutor autorizado; desgaste natural × dano; débitos pós-devolução;
indisponibilidade/substituição; aviso prévio e purga da mora; cláusula penal; força maior
(cobrança em impedimento prolongado); confidencialidade; assinatura eletrônica.
