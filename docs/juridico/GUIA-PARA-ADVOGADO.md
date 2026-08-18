# GUIA PARA O ADVOGADO — PrimeCharge

Este documento existe para você revisar a minuta e a política contratual com o contexto completo
da operação. Escrito pela equipe técnica em 2026-08-18. Onde houver decisão sua a tomar, está
marcado **[DECISÃO JURÍDICA]**; o que já foi decidido pela empresa está marcado **[PRODUTO]**.

## 1. O que a PrimeCharge faz
Locação de veículos (foco em elétricos) para motoristas de aplicativo (Uber/99), com cobrança
periódica (diária/semanal/mensal) e caução. **[PRODUTO]** O motorista é o cliente final — não há
entidade "cliente" separada.

## 2. Modelo operacional
Sistema próprio (PrimeCharge OS) gerencia frota, motoristas, contratos, financeiro, vistorias,
multas, sinistros, manutenções e um app para o motorista (ver/aceitar contrato, pagamentos,
vistorias, documentos, suporte).

## 3. Fluxo de locação
Cadastro do motorista (CPF, CNH, endereço, documentos com revisão) → seleção do veículo →
condições comerciais (valor, periodicidade, vencimento, caução, prazo, km) → contrato gerado do
template com **fotografia (snapshot) dos dados naquele momento** → revisão interna → aprovação →
envio para assinatura (documento congela e não muda mais) → assinatura das duas partes →
vigência. Alterações posteriores = ADITIVO ou NOVA VERSÃO — o original nunca é sobrescrito.

## 4. Fluxo de assinatura
**[PRODUTO]** Hoje o sistema registra o ACEITE ELETRÔNICO com evidência operacional: quem, quando
(data/hora), e-mail da conta autenticada, user agent do dispositivo, hash SHA-256 do documento
aceito, e o histórico completo (enviado→visualizado→assinado/recusado, com motivo de recusa).
**[DECISÃO JURÍDICA]** Se esse registro basta para o risco do negócio ou se contratamos
plataforma especializada de assinatura (a arquitetura já aceita a integração). O sistema NÃO
alega equivalência a assinatura com certificado ICP-Brasil.

## 5. Vistorias
Entrega e devolução com checklist, fotos, km, carga da bateria e confirmação do motorista.
Vinculadas ao contrato; entram no dossiê.

## 6. Seguro
Cadastro por contrato: seguradora, apólice, vigência, franquia e coberturas em três estados
(coberto / não coberto / **não informado** — o sistema nunca presume cobertura).
**[DECISÃO JURÍDICA]** O que o contrato deve dizer sobre franquia, exclusões e responsabilidade
do locatário em sinistro (cláusulas 7.x da minuta).

## 7. Manutenção
**[DECISÃO JURÍDICA]** A divisão exata (preventiva/corretiva/desgaste × mau uso/negligência) é um
parâmetro em branco no sistema esperando sua definição (/juridico/parametros).

## 8. Multas
Registradas por veículo/motorista/contrato (órgão, data, valor, pontos, status).
**[DECISÃO JURÍDICA]** Redação da cláusula 7.3 conforme o procedimento do CTB de indicação de
condutor.

## 9. Sinistros
Registrados (tipo, data, descrição) e vinculados ao contrato; gerados também automaticamente pela
vistoria de devolução quando há avaria.

## 10. Telemetria
**[PRODUTO]** Pretende-se rastreamento/telemetria da frota (GPS, km, bateria, eventos).
**[DECISÃO JURÍDICA]** Base legal, finalidade declarada, retenção e compartilhamento (LGPD) —
parâmetro em branco esperando definição.

## 11. LGPD
Dados tratados: cadastro do motorista (CPF, CNH, endereço, contato), documentos, dados
financeiros da locação, telemetria futura. **[DECISÃO JURÍDICA]** Texto da cláusula 8.1 e
política de privacidade correspondente.

## 12. Rescisão
Workflow no sistema: solicitada → em análise → aprovada → agendada → devolução → devolvido →
encerrada, com checklist obrigatório de encerramento (veículo devolvido, vistoria final,
pagamentos verificados, caução apurada) e apuração financeira REGISTRADA (o sistema não calcula
penalidade sozinho). **[DECISÃO JURÍDICA]** Cláusula penal/multa rescisória (11.4) e prazo de
purgação da mora (11.2).

## 13. Caução
Valor registrado por contrato; apuração na rescisão manual. **[DECISÃO JURÍDICA]** Prazo de
devolução e regras de retenção/compensação (5.2).

## 14. Renovação
Não é automática. O sistema alerta em janelas (90/60/30/15/7/1 dias) e o staff decide: renovar,
aditar ou encerrar. **[DECISÃO JURÍDICA]** Índice/periodicidade de reajuste (4.3).

## 15. Aditivos
Tipos: valor, veículo, prazo, caução, quilometragem, condições, renovação, rescisão. Sempre um
registro novo + documento próprio (nova versão); o contrato original permanece congelado.

## 16. Documentos
Tudo classificado e arquivado: contrato PDF (com hash de integridade no rodapé), aditivos,
vistorias, apólice, CNH, comprovantes. Dossiê exportável em .zip organizado por pastas.

## 17. Assinatura eletrônica — resumo do que o sistema garante
(a) o documento aceito é IMUTÁVEL (congelado com hash SHA-256 verificável);
(b) o rastro do aceite é completo e auditável (timeline + audit log);
(c) a expiração do convite é controlada;
(d) recusa registra motivo e nada é apagado.
O que o sistema NÃO garante sozinho: valor probatório equivalente a certificado digital
qualificado. **[DECISÃO JURÍDICA]** Suficiência disso para o risco do negócio.

## Como registrar suas decisões no sistema
1. **/juridico/sala-do-advogado** — cada `[VALIDAR COM ADVOGADO]` da minuta com campo de decisão
   e texto aprovado.
2. **/juridico/parametros** — manutenção, bateria/recarga, LGPD, prazo de assinatura, janelas.
3. **Templates → Revisão jurídica** — registrar o resultado da revisão da versão da minuta
   (aprovado / com ressalvas / reprovado). O sistema deixa claro que isso é registro operacional
   da SUA revisão — não certificação automática.
Depois da revisão: a minuta é reescrita com os textos aprovados e o template republicado (vira
versão nova; contratos antigos permanecem exatamente como assinados).
