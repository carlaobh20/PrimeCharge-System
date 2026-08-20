# DECISÕES PENDENTES — Centro Jurídico

Atualizado: 2026-08-18 (Fase 5 — master reescrito com 20 cláusulas). Duas listas: o que só o
ADVOGADO pode decidir, e decisões de PRODUTO/ENGENHARIA registradas para o futuro.

## A. Decisões JURÍDICAS pendentes (bloqueiam a versão final da minuta)

As **24 marcações `[VALIDAR COM ADVOGADO]` do corpo do master** (a lista abaixo é derivada
automaticamente do texto — a Sala do Advogado em **/juridico/sala-do-advogado** sempre mostra a
versão viva, cada uma com status/decisão/texto aprovado persistidos). Além delas, **cada um dos
16 termos da biblioteca** (`docs/juridico/biblioteca/`) carrega suas próprias marcações — todas
consolidadas na pasta `09_Pendencias_Juridicas` do Pacote para Advogado.

1. Enquadramento legal — locação de bem móvel (CC), afastar relação de consumo (preâmbulo).
2. Responsabilidade por condutor autorizado e efeitos sobre o seguro (Cl. 2).
3. Apuração/contestação/limites do excedente de quilometragem (Cl. 3).
4. Percentuais de multa e juros dentro do limite legal (Cl. 5).
5. Prazo de tolerância e notificação de inadimplência (Cl. 5).
6. Índice e periodicidade de reajuste (Cl. 5).
7. Devolução/retenção/compensação da caução + demonstrativo (Cl. 6).
8. Garantia alternativa quando sem caução (fiador, seguro-fiança) (Cl. 6).
9. Critério objetivo desgaste natural × dano indenizável (Cl. 7).
10. Prazo/procedimento de cobrança pós-devolução (Cl. 7).
11. Matriz de manutenção LOCADORA × LOCATÁRIO (Cl. 8 — parametrizada no sistema).
12. Degradação natural × dano por recarga inadequada; efeito na garantia (Cl. 9).
13. Apólice real anexada; coberturas/franquia/exclusões expressas (Cl. 10).
14. Limite da responsabilidade transferível ao locatário (Cl. 10).
15. Efeitos financeiros da perda total (Cl. 10).
16. Indicação de condutor infrator conforme CTB e consequência da recusa (Cl. 11).
17. LGPD: base legal, finalidade, retenção, compartilhamento, direitos do titular (Cl. 12).
18. Substituição de veículo: direito ou faculdade, carência, proporcionalidade (Cl. 13).
19. Prazo de purgação da mora e forma da notificação na rescisão (Cl. 15).
20. Cláusula penal por rescisão antecipada — proporcional, com teto (Cl. 15).
21. Cobrança durante impedimento prolongado (força maior) (Cl. 16).
22. Alcance da confidencialidade (Cl. 17).
23. Meio de assinatura eletrônica — registro do sistema é evidência, não equivalência (Cl. 19).
24. Foro de eleição conforme natureza jurídica confirmada (Cl. 20).

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

- Aplicar migrations **0042, 0043, 0044, 0045, 0046** no Supabase de produção (ojvhiadjnxhhevoryjtu).
- Teste vivo no deploy (roteiro no relatório da Fase 2/4).
- Confirmar qual banco o deploy dev usa (pergunta aberta desde a Fase 2).

## D. Governança (Fase 8) — decisões humanas registradas pelo sistema

Divergência contratual (nova versão × aditivo × ignorar com justificativa), caminho de renovação
(nova versão × aditivo) e migração de contratos antigos (manter/aditar/renovar/substituir) são
SEMPRE decisões humanas, registradas em `juridico_parametros` — o sistema apenas sinaliza.
