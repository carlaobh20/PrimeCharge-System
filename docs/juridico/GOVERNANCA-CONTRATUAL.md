# GOVERNANÇA CONTRATUAL — PrimeCharge (Fase 8)

Atualizado: 2026-08-18. Este documento explica como o Centro Jurídico responde, a qualquer
momento e sem SQL manual, às perguntas de governança do ciclo contratual. Regra permanente:
o sistema faz GOVERNANÇA, RASTREABILIDADE e CONTROLE OPERACIONAL — **nunca dá opinião
jurídica**. "Aprovado juridicamente" é sempre um registro HUMANO.

## Os blocos e onde cada pergunta é respondida

| Pergunta | Onde | Como é derivado |
|---|---|---|
| Qual documento/versão está vigente? Qual hash? | Cockpit → Estado Contratual | contrato_versoes (status vigente/assinada, hash SHA-256) |
| Qual Master e qual versão originou o documento? | Estado Contratual + Dossiê 03_Master | snapshot congelado (`_meta.template_versao`) — nunca o cadastro atual |
| Quem/quando aprovou a revisão jurídica? | Biblioteca → Revisão jurídica | contrato_revisoes_juridicas (responsável + data + status) |
| Condições comerciais vigentes? | Estado Contratual | snapshot congelado; divergência com o cadastro é SINALIZADA, nunca corrigida |
| Aditivos, termos, seguro, vistoria associados? | Cockpit (abas) + cadeia documental | contrato_aditivos / arquivos / contrato_seguros / checklists |
| Documentos pendentes? | Conformidade operacional | anexos_obrigatorios da política ativa × arquivos + revisão (0041) |
| Obrigações vencidas / tarefas abertas? | Conformidade + Agenda | acoes_operacionais tipo `juridico_*` com prazo |
| Rescisão em andamento? Renovação próxima? Assinatura pendente? | Estado Contratual + Agenda + Dashboard | contrato_rescisoes / data_fim_prevista / contrato_assinaturas |
| Divergência documento × dados operacionais? | Divergências (cockpit + dashboard) | snapshot × snapshot ATUAL regenerado pelo MESMO montarSnapshot |
| O contrato pode continuar operando? O que fazer agora? | Conformidade + Próxima ação | motor conformidade (bloqueios/alertas/pendências com motivo) + resumoExecutivo |

## Conceitos (vocabulário oficial)

- **Contrato**: o registro comercial (contratos). **Versão**: o DOCUMENTO gerado, congelado com
  snapshot + hash SHA-256 — imutável após congelar. **Template/Master**: o modelo parametrizável;
  republicar cria versão nova do modelo e NUNCA altera contratos gerados.
- **Snapshot**: a fotografia dos dados no momento da geração. Responde "como estavam os dados
  quando este contrato nasceu" sem depender do cadastro atual.
- **Hash**: código de integridade do corpo congelado; recomputado sob demanda (Integridade /
  Reconciliação). Divergência = alerta crítico, jamais correção silenciosa.
- **Aditivo**: altera condição SEM tocar o documento original (cadeia: original → aditivos →
  versão atual). **Renovação**: nunca automática; checklist derivado + decisão humana entre
  NOVA VERSÃO e ADITIVO. **Rescisão**: workflow com checklist obrigatório.
- **Assinatura**: rastreada por parte com evidências e expiração. Expirar NÃO invalida o
  contrato — vira "ASSINATURA EXPIRADA — ação necessária".
- **Obrigação contratual**: especialização de acoes_operacionais (tipo `juridico_obrigacao`),
  com origem, contrato, responsável, prazo, status e conclusão — sem state machine nova.
- **Divergência**: snapshot congelado × cadastro atual. Ações humanas: nova versão, aditivo ou
  ignorar com justificativa (registrada em juridico_parametros).
- **Conformidade operacional**: "o contrato está operacionalmente completo?" → status OK /
  ATENÇÃO / BLOQUEADO com a lista de motivos objetivos. NÃO é "segurança jurídica".
- **Integridade documental**: documento existe + congelado + hash confere + assinaturas — OK /
  ATENÇÃO / CRÍTICO.
- **Reconciliação**: verificação sob demanda (banco × snapshot × documento × hash × timeline ×
  arquivos × assinaturas) com relatório exportável; resultado OK / DIVERGÊNCIA / INCOMPLETO.
- **Auditoria**: audit_log + timeline_eventos existentes (nada duplicado); registros órfãos
  possíveis no schema (versão sem template de origem; arquivo polimórfico sem contrato) são
  DETECTADOS e sinalizados — nunca apagados.

## Onde estão as telas

- **Dashboard Jurídico**: fila de pendências, Agenda Contratual (1/7/15/30/60/90), Divergências
  Contratuais, Governança do Master (distribuição de versões em uso + órfãos) e o botão
  **Relatório de Governança Contratual** (.md).
- **Cockpit do contrato → aba Governança**: Estado Contratual, Conformidade operacional,
  Divergências (com decisão), Renovação (checklist + decisão), Reconciliação (com relatório).
- **Biblioteca**: distribuição de versões por modelo, **Simular publicação** (resumo de impacto
  SEM alterar nada → CANCELAR/PUBLICAR), contratos impactados por template.

## O que o sistema NUNCA faz

Não altera contrato antigo automaticamente; não corrige hash/divergência em silêncio; não apaga
registro órfão; não presume cobertura de seguro; não calcula penalidade; não inventa dado
(ausente = NÃO INFORMADO); não usa "juridicamente seguro", "100% protegido" ou "aprovado pelo
sistema".
