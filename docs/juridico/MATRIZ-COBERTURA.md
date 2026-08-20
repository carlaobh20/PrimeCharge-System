# MATRIZ DE COBERTURA DOCUMENTAL — Biblioteca Contratual PrimeCharge

> GERADO por `scripts/gerar-qa-biblioteca.ts` a partir de `qaBiblioteca.ts` (fonte única,
> produzida pela leitura integral dos 17 documentos na auditoria da Fase 6). Não editar à mão.
> "COBERTO" mede presença DOCUMENTAL do tema — NÃO é validação jurídica. Nenhum documento é
> juridicamente validado até revisão registrada. Atualizado: 2026-08-18.

Temas avaliados: 57 · Pendências jurídicas no texto: 56 · Conflitos potenciais abertos: 7

Índice de completude documental (métrica operacional): cobertura 93% · variáveis 100% · referências 100% · consistência 88%

| Tema | Classificação | Master | Termos | Política/Parâmetro | Dado do sistema | Decisão de |
|---|---|---|---|---|---|---|
| PARTES | COBERTO | Preâmbulo | — | — | empresas / motoristas | — |
| VEÍCULO | COBERTO | Cl. 1 | Entrega; Devolução; Responsabilidade por Bens | — | veiculos (placa, chassi, RENAVAM, bateria) | — |
| POSSE | COBERTO | Cl. 7 | Entrega; Devolução | — | — | — |
| USO | COBERTO | Cl. 2 | Ciência Operacional §1 | — | — | — |
| MOTORISTA | COBERTO | Preâmbulo + Cl. 14.2 | — | — | motoristas (CPF, CNH, contato) | — |
| APLICATIVOS | COBERTO | Cl. 2.1 (Uber/99 nominados como exemplo) | — | — | — | — |
| PRAZO | COBERTO | Cl. 4 | Renovação | — | contratos.data_inicio/data_fim_prevista | — |
| VALOR | COBERTO | Cl. 5.1 | — | — | contratos.valor_periodico | — |
| PAGAMENTO | PARCIAL | Cl. 5.1 ("meios indicados pela LOCADORA") | — | — | — | produto |
| INADIMPLÊNCIA | DECISÃO JURÍDICA | Cl. 5.2–5.3 | — | — | — | advogado |
| CAUÇÃO | DECISÃO JURÍDICA | Cl. 6 (condicional) | Encerramento §2.3 | — | contratos.valor_caucao | advogado |
| REAJUSTE | DECISÃO JURÍDICA | Cl. 5.4 | Renovação §2.1 | — | — | advogado |
| QUILOMETRAGEM | COBERTO | Cl. 3 (controlada/livre, condicional) | Ciência Operacional §4 | — | wizard km_incluso + telemetria | — |
| MANUTENÇÃO | DECISÃO JURÍDICA | Cl. 8 | Ciência Operacional §2 | juridico_parametros: manutencao_responsabilidades | — | advogado |
| PNEUS | PARCIAL | Cl. 8.2 (citados dentro da matriz pendente) | — | — | — | advogado |
| RODAS | PARCIAL | Cl. 8.2 (idem pneus) | — | — | — | advogado |
| RECARGA | COBERTO | Cl. 9 | Ciência Operacional §3; Responsabilidade por Bens §3 | — | — | — |
| BATERIA | DECISÃO JURÍDICA | Cl. 9.2 | — | — | telemetria (saúde da bateria) | advogado |
| CARREGADOR | COBERTO | — | Responsabilidade por Bens §3; Entrega (inventário) | — | — | — |
| ACESSÓRIOS | COBERTO | — | Entrega/Devolução (inventário); Responsabilidade por Bens §2 | — | — | — |
| ACIDENTE | COBERTO | Cl. 10.2 | Comunicação; Declaração; Procedimentos de Sinistro | — | — | — |
| SINISTRO | COBERTO | Cl. 10 | Comunicação; Declaração; Procedimentos | — | sinistros + arquivos + timeline | — |
| ROUBO | COBERTO | Cl. 10.2/10.4 | Comunicação §2.1 | — | — | — |
| FURTO | COBERTO | Cl. 10.2/10.4 | Comunicação §2.1 | — | — | — |
| PERDA TOTAL | DECISÃO JURÍDICA | Cl. 10.4 | — | — | — | advogado |
| SEGURO | PARCIAL | Cl. 10.1 (condicional com/sem apólice) | Ciência do Seguro | — | contrato_seguros | advogado |
| FRANQUIA | DECISÃO JURÍDICA | Cl. 10.3 | Ciência do Seguro §4.1; Procedimentos §2.2 | — | contrato_seguros.franquia_valor | advogado |
| MULTAS | COBERTO | Cl. 11 | Infrações e Multas | — | multas | — |
| INFRAÇÕES | COBERTO | Cl. 11 | Infrações e Multas | — | — | — |
| DANOS | DECISÃO JURÍDICA | Cl. 7.3 | — | — | — | advogado |
| AVARIAS | COBERTO | — | Entrega §2.2; Devolução §2.2 | — | checklists (vistoria) | — |
| VISTORIA | COBERTO | Cl. 1.2 + 7.1 | Entrega; Devolução | — | checklists (fotos, odômetro, carga) | — |
| FOTOS | COBERTO | Cl. 1.2 (vistoria fotográfica) | — | — | arquivos da vistoria | — |
| RASTREAMENTO | COBERTO | Cl. 12 | Rastreamento e Telemetria | — | — | — |
| TELEMETRIA | COBERTO | Cl. 12 | Rastreamento e Telemetria | — | telemetria do veículo | — |
| LOCALIZAÇÃO | COBERTO | — | Rastreamento §1.1 (GPS) | — | — | — |
| LGPD | DECISÃO JURÍDICA | Cl. 12 | LGPD; Rastreamento | juridico_parametros: lgpd_telemetria | — | advogado |
| SEGURANÇA DA INFORMAÇÃO | COBERTO | — | LGPD §4.1 (acesso por perfil, auditoria, hash) | — | RLS + audit_log + SHA-256 | — |
| DOCUMENTAÇÃO DO VEÍCULO | COBERTO | Cl. 1.2 + 14.1 | Entrega (inventário: CRLV) | — | — | — |
| CNH | COBERTO | Cl. 14.2 (validade + comunicação em 24h) | Ciência Operacional §1.2 | — | motoristas.cnh_numero/validade | — |
| CESSÃO | COBERTO | Cl. 2.3(a) | — | — | — | — |
| SUBLOCAÇÃO | COBERTO | Cl. 2.3(a) | Ciência Operacional §1.1 | — | — | — |
| TERCEIROS (condutor autorizado) | DECISÃO JURÍDICA | Cl. 2.2 | Declaração de Sinistro §3.1(a) | — | — | advogado |
| RESPONSABILIDADE | COBERTO | Cl. 7.2 + 10.3 | Responsabilidade por Bens | — | — | — |
| COMUNICAÇÃO ENTRE AS PARTES | COBERTO | Cl. 17.1 (canais do cadastro + app) | — | — | — | — |
| SUSPENSÃO | PARCIAL | Cl. 5.3(a) | — | — | bloqueio de acesso do motorista (app) | advogado |
| RESCISÃO | DECISÃO JURÍDICA | Cl. 15 | Rescisão | — | contrato_rescisoes (workflow + checklist) | advogado |
| DEVOLUÇÃO | COBERTO | Cl. 7 | Devolução | — | — | — |
| ENCERRAMENTO | COBERTO | — | Encerramento | — | checklist obrigatório de encerramento | — |
| QUITAÇÃO | DECISÃO JURÍDICA | — | Quitação (uso condicionado) | — | — | advogado |
| ADITIVOS | COBERTO | Cl. 18.3 | Aditivo | — | contrato_aditivos | — |
| RENOVAÇÃO | COBERTO | Cl. 4.1 | Renovação | — | — | — |
| FORÇA MAIOR | DECISÃO JURÍDICA | Cl. 16 | — | — | — | advogado |
| CONFIDENCIALIDADE | DECISÃO JURÍDICA | Cl. 17.2 | — | — | — | advogado |
| FORO | DECISÃO JURÍDICA | Cl. 20 | — | — | — | advogado |
| ASSINATURA | DECISÃO JURÍDICA | Cl. 19 | — | — | contrato_assinaturas (evidências + SHA-256) | advogado |
| ANEXOS | PARCIAL | Lista de anexos ao final | Entrega; Seguro; Rastreamento; LGPD | — | — | produto |

## Observações por tema

- **PAGAMENTO**: Meios de pagamento não especificados no contrato — decidir se ficam no texto ou em anexo comercial.
- **INADIMPLÊNCIA**: Percentuais de multa/juros e prazo de tolerância pendentes.
- **CAUÇÃO**: Prazo de devolução e regras de retenção pendentes.
- **REAJUSTE**: Índice e periodicidade pendentes.
- **MANUTENÇÃO**: Matriz LOCADORA × LOCATÁRIO pendente.
- **PNEUS**: Cobertos só como item da matriz de manutenção pendente.
- **BATERIA**: Critério degradação natural × dano pendente.
- **PERDA TOTAL**: Efeitos financeiros entre as partes pendentes.
- **SEGURO**: Estrutura pronta; apólice real precisa ser anexada e transcrita ([VALIDAR]).
- **FRANQUIA**: Momento/forma de cobrança da franquia pendente.
- **DANOS**: Critério desgaste natural × dano indenizável pendente.
- **LGPD**: Base legal, retenção e compartilhamento pendentes.
- **TERCEIROS (condutor autorizado)**: Alcance da responsabilidade e campo próprio na declaração pendentes.
- **SUSPENSÃO**: Prazo/procedimento de notificação pendente.
- **RESCISÃO**: Aviso prévio, purga da mora e cláusula penal pendentes.
- **QUITAÇÃO**: Se deve existir, alcance e ressalvas — inteiramente do advogado.
- **RENOVAÇÃO**: Nunca automática; reajuste pendente (tema REAJUSTE).
- **FORÇA MAIOR**: Cobrança durante impedimento prolongado pendente.
- **ASSINATURA**: Meio de assinatura a contratar.
- **ANEXOS**: "Resumo das condições comerciais" listado como anexo sem peça própria (dados vivem no contrato/PDF).
