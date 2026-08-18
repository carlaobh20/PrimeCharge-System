# GLOSSÁRIO — Vocabulário da Biblioteca Contratual PrimeCharge

> GERADO por `scripts/gerar-qa-biblioteca.ts` a partir de `qaBiblioteca.ts` + varredura dos
> documentos reais. Sinônimos NÃO são substituídos automaticamente — os alertas abaixo vão ao
> advogado para padronização. Atualizado: 2026-08-18.

| Termo | Definição operacional | Equivalências / observações |
|---|---|---|
| **LOCADORA** | A empresa que loca o veículo (PrimeCharge). | No sistema: empresa; parte de assinatura "primecharge". |
| **LOCATÁRIO** | O motorista que loca o veículo — parte do contrato. | No sistema: motorista; parte de assinatura "motorista". Nos docs de sinistro aparece como COMUNICANTE/DECLARANTE; no LGPD, TITULAR. |
| **CONDUTOR AUTORIZADO** | Terceiro autorizado por escrito pela LOCADORA a conduzir (Master Cl. 2.2). | Não confundir com LOCATÁRIO. |
| **TITULAR** | O motorista na condição de titular de dados pessoais (LGPD). | — |
| **VEÍCULO** | O bem locado (veículo automotor elétrico identificado na Cl. 1). | Os documentos usam sempre VEÍCULO (nunca "automóvel"/"carro"). |
| **CONTRATO** | O Contrato de Locação gerado a partir do template master, congelado por versão com hash. | — |
| **TEMPLATE / MINUTA** | O modelo parametrizável. MINUTA = ainda sem revisão jurídica aprovada; carrega o carimbo obrigatório. | — |
| **VERSÃO OFICIAL** | Template publicado COM revisão jurídica aprovada registrada da versão atual. | — |
| **ADITIVO** | Documento que altera condição do contrato sem sobrescrevê-lo (o original permanece congelado). | — |
| **RENOVAÇÃO / PRORROGAÇÃO** | Novo prazo por decisão expressa (renovação pode reajustar condições; prorrogação estende nas mesmas). Nunca automática. | — |
| **CAUÇÃO** | Garantia em dinheiro registrada em contratos.valor_caucao; regras de retenção/devolução pendentes de decisão jurídica. | A Cl. 6 sem caução usa o título GARANTIA — mesmo assunto, variante contratual. |
| **FRANQUIA** | Valor da participação obrigatória no sinistro conforme a apólice cadastrada — nunca presumido pelo sistema. | — |
| **SINISTRO** | Ocorrência com o veículo (colisão, avaria grave, incêndio, furto, roubo, perda total, dano a terceiros) registrada no módulo de sinistros. | — |
| **AVARIA** | Dano físico constatável em vistoria. DANO é o gênero (inclui prejuízo indenizável); o critério desgaste × dano é pendência jurídica. | — |
| **RASTREAMENTO** | Localização do veículo (GPS). | TELEMETRIA é o conjunto maior (km, velocidade, bateria, eventos). Os documentos usam os dois termos juntos e no mesmo sentido do sistema. |
| **TELEMETRIA** | Dados de operação do veículo coletados durante a locação. | — |
| **VISTORIA** | Checklist fotográfico com odômetro e carga registrado no sistema (entrega/devolução/renovação). | — |
| **DEMONSTRATIVO / PRESTAÇÃO DE CONTAS** | Relação item a item de débitos/créditos apurados — sempre registrado, nunca calculado como penalidade automática. | — |
| **RESCISÃO** | Fim antecipado ou motivado do contrato via workflow (solicitação → análise → devolução → encerramento). | ENCERRAMENTO é o fecho do ciclo (após checklist); não são sinônimos nos documentos. |
| **DEVOLUÇÃO** | Restituição física do veículo com vistoria e termo próprios. | — |
| **ENCERRAMENTO** | Conclusão formal do contrato após checklist obrigatório e apuração registrada. | — |
| **QUITAÇÃO** | Declaração recíproca de nada mais dever — uso CONDICIONADO à decisão do advogado. | — |
| **DOSSIÊ** | ZIP com todos os documentos, versões, evidências e auditoria de um contrato. | — |
| **HASH (SHA-256)** | Código de integridade do documento congelado; impresso no PDF e conferido pelo painel de integridade. | — |

## Alertas de vocabulário (termos potencialmente equivalentes em documentos diferentes)

- **O motorista (parte que loca)** aparece como: “LOCATÁRIO” (16 doc.), “MOTORISTA” (1 doc.), “CONDUTOR” (5 doc.), “COMUNICANTE” (1 doc.), “DECLARANTE” (1 doc.), “TITULAR” (3 doc.) — padronização a confirmar com o advogado.
- **Garantia em dinheiro** aparece como: “CAUÇÃO” (6 doc.), “GARANTIA” (1 doc.) — padronização a confirmar com o advogado.
- **Dano ao veículo** aparece como: “AVARIA” (4 doc.), “DANO” (2 doc.) — padronização a confirmar com o advogado.
- **Fim do contrato** aparece como: “RESCISÃO” (3 doc.), “ENCERRAMENTO” (5 doc.) — padronização a confirmar com o advogado.
- **Monitoramento do veículo** aparece como: “RASTREAMENTO” (3 doc.), “TELEMETRIA” (5 doc.) — padronização a confirmar com o advogado.
