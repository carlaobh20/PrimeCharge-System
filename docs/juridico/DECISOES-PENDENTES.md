# DECISÕES PENDENTES — Centro Jurídico

Atualizado: 2026-08-18 (Fase 4). Duas listas: o que só o ADVOGADO pode decidir, e decisões de
PRODUTO/ENGENHARIA registradas para o futuro.

## A. Decisões JURÍDICAS pendentes (bloqueiam a versão final da minuta)

As 16 marcações `[VALIDAR COM ADVOGADO]` da minuta master, gerenciáveis em
**/juridico/sala-do-advogado** (cada uma com status/decisão/texto aprovado persistidos):

1. Enquadramento legal e legislação de regência (cláusula introdutória) — define foro/prazos/limites.
2. Limite de quilometragem e consequência do excedente (2.3).
3. Percentuais de multa e juros de mora — dentro do limite legal (4.2).
4. Índice e periodicidade de reajuste (4.3).
5. Prazo e regras de retenção/devolução da caução (5.2).
6. Divisão de responsabilidade de manutenção locadora × locatário (6.2).
7. Responsabilidade por bateria/recarga do veículo elétrico (6.3).
8. Apólice real: coberturas, franquia e exclusões expressas (7.1).
9. Procedimento de indicação de condutor infrator conforme CTB (7.3).
10. Limite da responsabilidade do locatário por danos (7.4).
11. LGPD: finalidade, base legal e transparência do rastreamento/telemetria (8.1).
12. Prazo de purgação da mora e forma de notificação na rescisão (11.2).
13. Cláusula penal por rescisão antecipada — proporcionalidade e teto (11.4).
14. Meio de assinatura eletrônica e seu valor probatório (14.1).
15. Foro de eleição (15.1).
16. Anexos obrigatórios (apólice/resumo de coberturas) (Anexos).

Também jurídicas (parametrizáveis em **/juridico/parametros**): conteúdo de
`manutencao_responsabilidades`, `bateria_recarga`, `lgpd_telemetria`; regra de multa rescisória
(hoje o sistema só REGISTRA valores — não calcula penalidade).

## B. Decisões de PRODUTO/ENGENHARIA registradas (não implementadas de propósito)

1. **Role `juridico`** — não criado (alteraria enum user_role + RLS geral). Hoje:
   `pode('contratos')` + `eh_staff`. Revisitar quando houver equipe jurídica própria.
2. **pg_cron / notificações agendadas** — projeto decidiu (0006/0029) contra automação
   silenciosa; alertas de expiração/renovação/seguro são DERIVADOS na leitura. Revisitar na
   fase de automação (Fase 8 do roadmap antigo).
3. **Provedor de assinatura eletrônica** — arquitetura pronta (status/evidência/expiração);
   integração real (ex.: Clicksign/DocuSign/ICP) é projeto próprio. NÃO simulado.
4. **Checklist de encerramento parametrizável por política** — hoje o núcleo obrigatório é fixo
   no trigger (4 itens). Evoluir para ler da política se a operação pedir.
5. **Status de template `em_revisao`/`aprovado`** — o check da 0042 tem
   rascunho/publicado/arquivado; a governança de revisão vive em `contrato_revisoes_juridicas`
   (por versão). Adicionar status intermediários exigiria migration cosmética — recusado
   (Fase AU: nada de migration por conveniência).
6. **Responsável por contrato** — não existe coluna `responsavel_id` em contratos; filtro por
   responsável no dashboard ficou de fora (não inventamos coluna). Tarefas jurídicas
   (acoes_operacionais) têm responsável — é o mecanismo atual de atribuição.
7. **E2E de navegador (Playwright)** — infra não existe no repo; o E2E automatizado é a suíte
   SQL 63 (ciclo completo pela RLS) + audits Node. Introduzir Playwright é decisão futura.
8. **Rate limit de e-mail do Supabase (login motorista de teste)** — pendência antiga de
   produção, fora do escopo local.

## C. Pendências de PRODUÇÃO (aguardando autorização do Carlos)

- Aplicar migrations **0042, 0043, 0044, 0045** no Supabase de produção (ojvhiadjnxhhevoryjtu).
- Teste vivo no deploy (roteiro no relatório da Fase 2/4).
- Confirmar qual banco o deploy dev usa (pergunta aberta desde a Fase 2).
