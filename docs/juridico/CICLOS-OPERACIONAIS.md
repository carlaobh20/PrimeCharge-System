# CICLOS OPERACIONAIS — Contrato, Sinistro, Rescisão e Mapa LGPD

Atualizado: 2026-08-18 (Fase 6). Mapa estrutural para o advogado entender COMO os documentos se
encaixam na operação real do sistema. Nada aqui cria regra jurídica — etapas e documentos são os
que existem no sistema; decisões pendentes estão marcadas.

## 1. Ciclo de vida do contrato

| Etapa | Documentos | Dados no sistema | Responsável | Status típico | Próxima ação |
|---|---|---|---|---|---|
| Prospecção | — | lead/cadastro inicial | Comercial | — | Cadastro |
| Cadastro | — | motoristas (CPF, CNH, contato), veiculos | Operação | motorista/veículo ativos | Validação |
| Validação | — | CNH válida, veículo disponível, checklist do wizard | Operação | apto a contratar | Geração |
| Geração | Contrato Master (variantes por política) | contrato + snapshot congelado + hash | Operação (wizard) | versão rascunho | Revisão |
| Revisão | — | contrato_versoes (workflow) | Operação | em_revisao → aprovada | Assinatura |
| Aprovação | — | contrato_versoes.status aprovada | Gestor | aprovada | Envio p/ assinatura |
| Assinatura | Contrato + termos de contratação (Ciência Operacional, Responsabilidade, Rastreamento, LGPD, Infrações; Seguro quando houver apólice) | contrato_assinaturas (evidências, expiração) | Motorista + PrimeCharge | aguardando_assinatura → assinada | Vigência |
| Vigência | Termo de Entrega (com vistoria) | vistoria de entrega, timeline | Operação | vigente | Operação |
| Operação | Comunicação/Declaração/Procedimentos de Sinistro; Termo de Infrações (multa específica) | cobranças, multas, sinistros, telemetria | Operação | vigente | conforme evento |
| Aditivo | Aditivo Contratual | contrato_aditivos (versão nova, original congelado) | Gestor | vigente | — |
| Renovação | Termo de Renovação / Prorrogação | registro de renovação (nunca automática) | Gestor + motorista | vigente (novo período) | — |
| Rescisão | Termo de Rescisão | contrato_rescisoes (workflow) | Gestor | em rescisão | Devolução |
| Devolução | Termo de Devolução (com vistoria) | vistoria de devolução | Operação | devolvido | Encerramento |
| Encerramento | Termo de Encerramento (+ Quitação, uso condicionado) | checklist obrigatório + apuração REGISTRADA | Gestor | encerrado | Arquivo |
| Arquivo | Dossiê ZIP (12 pastas) | contrato congelado + histórico + auditoria | Sistema | arquivado | — |

## 2. Ciclo do sinistro

ocorrência → **comunicação imediata** (Comunicação de Sinistro; BO quando cabível —
[VALIDAR COM ADVOGADO: hipóteses de BO obrigatório, conflito C2]) → **registro** no módulo de
sinistros → **declaração** circunstanciada (Declaração de Sinistro) → **entrega de documentos**
(Termo de Procedimentos, protocolo com data/autor; arquivos anexados ao sinistro) → **vistoria**
do veículo → **acionamento da seguradora** quando houver cobertura cadastrada (o sistema NUNCA
presume cobertura) → **análise/apuração** de responsabilidades conforme Contrato e apólice
([VALIDAR: franquia — momento e forma de cobrança]) → **reparo ou desfecho** (perda total resolve
o contrato quanto ao veículo — Cl. 10.4, efeitos financeiros [VALIDAR]) → **encerramento** do
sinistro com registro em timeline.

Lacunas identificadas na Fase 6: campo de condutor terceiro autorizado na Declaração (conflito
C4); integração automática das fotos/vistoria do sinistro ao gerador (decisão de produto).

## 3. Ciclo da rescisão

solicitação (motorista/empresa/acordo) → **análise** → **aprovação** → **agendamento** da
devolução → **devolução** com vistoria + Termo de Devolução → **apuração financeira REGISTRADA**
(nunca calculada como penalidade automática; regra de multa rescisória [VALIDAR COM ADVOGADO]) →
**caução** apurada no demonstrativo (retenção/restituição [VALIDAR]) → **checklist obrigatório**
de encerramento (veículo devolvido, vistoria final, pagamentos verificados, caução apurada) →
**Termo de Encerramento** → eventual **Termo de Quitação** (uso condicionado — [VALIDAR: se deve
existir, alcance, ressalvas]) → arquivo/dossiê.

Coerência conferida na Fase 6: Master Cl. 15 × Termo de Rescisão × Devolução × Encerramento ×
Quitação usam o MESMO fluxo e os mesmos dados (contrato_rescisoes); nenhuma penalidade aparece em
nenhum documento como valor calculado.

## 4. Mapa LGPD / Telemetria (dado → decisão)

| Dado | Origem | Finalidade declarada nos termos | Uso no sistema | Retenção | Compartilhamento | Decisão |
|---|---|---|---|---|---|---|
| Cadastrais (nome, CPF, CNH, endereço, contato) | cadastro do motorista | execução do contrato | contrato, cobrança, indicação de condutor | [VALIDAR COM ADVOGADO] | órgãos de trânsito (indicação); [VALIDAR: rol taxativo] | advogado |
| Documentos enviados | upload do motorista/operação | execução do contrato | dossiê, seguradora em sinistro | [VALIDAR] | seguradora em sinistro | advogado |
| Localização (GPS) | telemetria do veículo | gestão/segurança da frota, prevenção de ilícitos | rastreamento, recuperação em furto/roubo | [VALIDAR] | autoridades mediante requisição [VALIDAR] | advogado |
| Quilometragem | telemetria + odômetro | apuração contratual de km | cobrança de excedente (km controlada) | [VALIDAR] | — | advogado |
| Velocidade / eventos de condução | telemetria | segurança e cumprimento do contrato | fiscalização operacional (Cl. 14.3) | [VALIDAR] | — | advogado |
| Nível e saúde da bateria | telemetria | conservação do bem | manutenção, apuração degradação × dano | [VALIDAR] | — | advogado |
| Fotos de vistoria | checklists | prova do estado do veículo | entrega/devolução/sinistro | [VALIDAR] | seguradora em sinistro | advogado |
| Financeiro (cobranças, pagamentos) | módulo financeiro | execução do contrato | demonstrativos, apuração | [VALIDAR] | — | advogado |

Base legal por finalidade (art. 7º LGPD), prazos de retenção por categoria, rol taxativo de
destinatários, canal do titular/DPO e prazos de resposta: TODOS pendentes de definição do
advogado — parametrizados em `juridico_parametros` quando decididos. O sistema não inventa
nenhum desses valores.

## 5. Governança do ciclo (Fase 8)

Cada etapa acima agora é vigiada por: Conformidade operacional (bloqueios/alertas com motivo),
Agenda Contratual (1/7/15/30/60/90 dias), Divergências snapshot × cadastro e Reconciliação sob
demanda — ver `GOVERNANCA-CONTRATUAL.md`.
