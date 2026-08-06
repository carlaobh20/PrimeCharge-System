# PrimeCharge — Data Platform
### Como todo dado que a plataforma já produz — e o que ela vai produzir — se torna consumível por relatório, IA e Agente sem precisar ser redesenhado quando esse consumidor chegar

Revisado criticamente por Claude antes de publicar, no mesmo padrão de `FOUNDATION_PRINCIPLES.md`. Mesmo peso dos demais documentos de fundação: referência obrigatória, não sugestão.

Este documento não redefine State Machines/Policies/Eventos como conceito técnico (`CORE_CONCEPTS.md`), não redefine os níveis de maturidade de IA (`AI_PLATFORM.md`) nem a constituição do Agente (`AGENT_PLATFORM.md`), não redefine RLS/RBAC (`DECISION_LOG.md`, DEC-064 a DEC-068). Onde um assunto já está definido em outro documento, este referencia — nunca repete. O que este documento define, e que não existia consolidado em nenhum outro lugar: como os dados que a plataforma já produz hoje (estruturados e não-estruturados) se organizam como uma plataforma de dados coerente, e o que falta para que IA/Agentes futuros consumam esse dado com confiança.

Criado em 2026-08-06, a pedido do Carlos, como Parte 10 da Missão 3 (Driver Ecosystem + Smart Fleet Foundation).

---

## 1. Princípio central: a plataforma de dados já existe, dispersa — este documento só a nomeia

🔶 **Correção de premissa**: o pedido original lista "eventos, lineage, versionamento, qualidade, governança, retenção, LGPD, fontes, histórico, pipeline..." como se fossem conceitos a inventar. Não são. Desde a Fase 0 (migration `0002_capacidades_genericas.sql`), a plataforma já tem três tabelas genéricas que, juntas, são a espinha dorsal de uma plataforma de dados: `timeline_eventos` (o que aconteceu), `arquivos` (o que foi documentado/fotografado) e `audit_log` (o que foi alterado, e por quem). A Missão 2 acrescentou `telemetria_eventos` (o que um sensor mediu). Este documento não propõe uma quarta camada nova — organiza as quatro que já existem em um vocabulário comum, e diz exatamente o que falta em cada uma antes que IA ou Agente possam confiar nelas.

---

## 2. As quatro fontes de dado já existentes, e o que cada uma responde

| Tabela | Pergunta que responde | Desde | Estrutura |
|---|---|---|---|
| `timeline_eventos` | "O que aconteceu com esta entidade, em ordem?" | Fase 0 | `entidade_tipo`/`entidade_id` genérico, `tipo` (texto livre), `descricao` (texto humano), `metadata jsonb` (hoje quase sempre vazio — ver seção 5), `usuario_id` (nulo = sistema) |
| `arquivos` | "Que documento/foto existe sobre esta entidade?" | Fase 0 | Mesmo padrão genérico, + `categoria`, `tipo_mime`, `tamanho_bytes`, `data_validade` (DEC-060) |
| `audit_log` | "O que mudou, exatamente, campo a campo?" | Fase 0 | `tabela`/`registro_id` (não genérico por entidade de negócio — é por tabela física), `dados_antigos`/`dados_novos` (jsonb, snapshot completo da linha) |
| `telemetria_eventos` | "O que um sensor mediu, e quando?" | Missão 2 (DEC-081) | `veiculo_id`, `tipo`/`valor`/`unidade` (genérico, não uma coluna por métrica), `origem`, vazia por design — zero produtor real ainda |

**O que essas quatro têm em comum, e por que isso importa para IA/Agente**: todas são *append-only* na prática (nada edita uma linha de `timeline_eventos`/`audit_log`/`telemetria_eventos` depois de criada — só insere), todas carregam `empresa_id` (isolamento multi-tenant já resolvido por RLS, `DECISION_LOG.md` DEC-064), e três das quatro (`timeline_eventos`, `arquivos`, `telemetria_eventos`) usam o mesmo par `entidade_tipo`/`entidade_id` — significa que um consumidor futuro (Agente, relatório, modelo de IA) que já sabe ler uma consegue ler as outras duas sem uma API nova.

**Cobertura de `audit_log` (achado + correção da Fase 6, Missão 5):** `fn_audit_log()` só audita tabelas que ganharam o trigger explicitamente — não é automático por tabela nova. Auditoria completa desta fase encontrou 4 tabelas com dado real e `empresa_id` (logo, elegíveis) que nunca tinham recebido o trigger: `manutencoes`, `multas`, `telemetria_eventos` e `convites` — corrigido nesta migration (`0013`). Duas tabelas continuam **de propósito** fora do `audit_log`, não por lacuna: `empresas` e `permissoes` não têm coluna `empresa_id` (a primeira **é** a empresa; a segunda é uma matriz global de role→módulo→ação, não por tenant) — anexar o trigger genérico a elas quebraria em runtime (`fn_audit_log` referencia `new.empresa_id`, que não existe nessas duas). Se `empresas`/`permissoes` precisarem de auditoria própria no futuro, é uma função de trigger dedicada, não a genérica.

---

## 3. Dados estruturados vs. não-estruturados

- **Estruturados**: todo o restante do schema — `veiculos`, `motoristas`, `contratos`, `lancamentos`, `pagamentos`, `checklists`/`checklist_itens`, `manutencoes`, `acoes_operacionais`. Fonte de verdade do estado atual de cada entidade.
- **Não-estruturados**: o conteúdo dos arquivos referenciados por `arquivos.caminho_storage` (fotos, PDFs de contrato/documento) — o registro de que o arquivo existe é estruturado (a linha em `arquivos`), o conteúdo em si não é consultável por SQL. Nenhuma extração de conteúdo (OCR, visão computacional) existe hoje — é exatamente o que `AI_PLATFORM.md`/Vistoria Inteligente (`DECISION_LOG.md` DEC-080) endereça quando existir.

---

## 4. Lineage (de onde cada dado veio) — real em 3 tabelas, implícito no resto

**Correção (Missão 5, Fase 6):** esta seção afirmava, incorretamente, que `lancamentos` não tinha campo de lineage. Isso estava desatualizado desde a criação do próprio documento — `lancamentos.criado_via` (enum `lancamento_origem`: `manual`/`automacao`/`agente`/`ia`) existe desde a migration `0006` (Sprint 8), anterior a este documento (Missão 3). Auditoria completa desta fase (grep em todo o schema): de 27 tabelas, só **3 têm lineage estruturado** — `lancamentos.criado_via`, `acoes_operacionais.origem` (enum `acao_origem`, desde a Sprint 9) e `arquivos.criado_via` (enum `arquivo_origem`, adicionado nesta mesma missão, Fase 4, DEC-112). `telemetria_eventos.origem` existe mas como `text` livre, não enum (nenhum produtor real ainda). As outras 23 tabelas (`veiculos`, `motoristas`, `contratos`, `checklists`, `manutencoes`, `multas`, `metas` etc.) não distinguem humano de sistema/automação/agente/IA — têm `criado_por`/`usuario_id` (qual humano logado agiu), o que é uma informação diferente de lineage e não deve ser confundida com ela.

Isso é uma lacuna real: se um Agente futuro (`AGENT_PLATFORM.md`) começar a criar Checklists, Manutenções ou Multas, não há hoje, nessas tabelas, um jeito uniforme de perguntar "quais desses registros foram criados por um humano e quais por um Agente?".

**Decisão desta missão (reafirmada)**: não adicionar `criado_via`/`origem` a todas as 23 tabelas restantes agora (seria a mesma abstração antecipada que `FOUNDATION_PRINCIPLES.md` Princípio 8 rejeita — nenhum Agente cria nada ainda em nenhuma delas). Continua registrado como pré-requisito explícito: **antes de qualquer Agente ganhar permissão de escrita** (`AGENT_PLATFORM.md`), a tabela que ele vai escrever precisa ganhar esse campo primeiro — cada uma na sua vez, não todas de uma vez.

---

## 5. Versionamento — real em `checklists` (Missão 2), ausente em todo o resto

`checklists.versao`/`checklist_anterior_id` (DEC-080) é o único versionamento explícito de todo o schema. Nenhuma outra entidade guarda "versão anterior de mim mesma" — o único jeito de reconstruir um estado passado de, por exemplo, um `Contrato`, é ler `audit_log.dados_antigos` linha por linha, que funciona mas não foi desenhado para consulta de série temporal (não tem índice pensado para "me dê o estado do contrato X na data Y").

`timeline_eventos.metadata` (jsonb) existe desde a Fase 0 mas quase nenhum trigger o preenche hoje (a maioria só escreve `descricao` em texto humano) — significa que reconstruir "o que mudou exatamente" a partir da Timeline sozinha não é confiável hoje; `audit_log` é a fonte correta para isso, não a Timeline. Vale deixar por escrito porque um Agente/IA lendo só `timeline_eventos.descricao` (texto livre) para decidir algo seria um erro de design — texto humano não é dado estruturado confiável para uma IA decidir, é para uma pessoa ler.

---

## 6. Qualidade e honestidade de dado

Já é princípio de fundação, não novo aqui: `score: null` em vez de valor inventado (DEC-022), aplicado consistentemente em toda a camada `intelligence/` desde a Sprint 3 e reforçado a cada auditoria (DEC-070, Saúde Patrimonial do Motorista nesta sessão). A regra vale igualmente para qualquer consumo futuro por IA: um modelo que treina sobre `checklists.score` (hoje sempre nulo, DEC-080) precisa saber que nulo significa "nunca avaliado", nunca deve imputar um valor médio para preencher o vazio sem dizer isso explicitamente.

---

## 7. Retenção e LGPD

Nenhuma política de retenção/expurgo existe hoje em nenhuma tabela — `DECISION_LOG.md` DEC-077 (Missão 2) formalizou que 6 tabelas nunca são deletáveis via UI (rastro de auditoria), o que é o oposto de uma política de retenção (retenção decide *quando* apagar; DEC-077 decide que a aplicação nunca apaga). Isso é aceitável hoje (zero operação real, zero dado pessoal sensível acumulado ainda) mas se torna uma obrigação real assim que existir o primeiro motorista real: CPF, CNH, comprovante de renda (se algum dia coletado) em `arquivos`/`motoristas` estão sujeitos à LGPD desde o primeiro registro.

**O que falta, registrado aqui para não ser esquecido, não implementado nesta missão** (não há volume real para desenhar contra, mesmo racional de DEC-010): (1) um caminho de exclusão/anonimização de motorista quando solicitado (hoje `motoristas` não tem soft-delete nem anonimização — excluir hoje significaria apagar a linha, quebrando toda a FK de `contratos`/`checklists`/etc que referenciam o motorista); (2) uma política de quanto tempo `telemetria_eventos` guarda dado bruto antes de agregar e descartar o detalhe (relevante quando o volume existir — hoje é zero linhas); (3) consentimento explícito de uso de dado de condução, já exigido por princípio em `SMART_FLEET_PLATFORM.md` (Princípio 11) mas sem nenhum campo de consentimento em `motoristas` hoje.

---

## 8. Pipeline — hoje é síncrono, sob demanda; nenhuma automação real existe

Todo dado desta plataforma hoje é escrito no momento em que um usuário humano faz uma ação na UI, síncrono, direto na tabela — não existe fila, worker, cron ou pipeline de ingestão em lugar nenhum (mesmo os "geradores" de Ações Operacionais, Sprint 9, rodam sob demanda via botão, não por `pg_cron` — DEC-058 documenta isso explicitamente como decisão, não lacuna). Isso é adequado ao volume de hoje (1 empresa, poucos veículos) e não deve mudar antes de o volume justificar — automação de pipeline antes de ter dado real para processar seria a mesma arquitetura antecipada que este documento evita em todas as outras seções.

---

## 9. O que consome este dado hoje, e o que vai consumir amanhã

- **Hoje**: só a camada `intelligence/` de cada feature (funções puras, leem o dado estruturado direto, nunca `timeline_eventos`/`arquivos`/`audit_log` — ver `frota/intelligence/`, `motoristas/intelligence/`, `financeiro/intelligence/`, `driverScore.ts` desta missão).
- **Amanhã, Nível 1→2 (`AI_PLATFORM.md`)**: recomendação/insight sobre dado estruturado já existente — não precisa de nada novo desta plataforma de dados, já está pronta.
- **Amanhã, Nível 3+ (`AI_PLATFORM.md`) e Vistoria Inteligente (DEC-080)**: precisa de conteúdo não-estruturado real (fotos de vistoria em volume) — `arquivos` já aponta pro storage certo, falta só o volume real acontecer.
- **Amanhã, Agente (`AGENT_PLATFORM.md`)**: precisa do campo de lineage (seção 4) antes de escrever qualquer coisa, e precisa que `timeline_eventos.metadata` passe a ser preenchido de forma estruturada (seção 5) antes de um Agente poder "ler o que aconteceu" com confiança, não só "ler o texto que descreve o que aconteceu".

---

## 10. Relação com os documentos existentes

- `AI_PLATFORM.md`/`AGENT_PLATFORM.md` — definem o que cada Nível/Agente pode fazer; este documento define se o dado que eles precisariam consumir já existe em formato confiável.
- `SMART_FLEET_PLATFORM.md` — Princípio 11 (privacidade em dado de condução) é o requisito mais concreto de LGPD já registrado antes deste documento; seção 7 aqui generaliza esse mesmo cuidado para o resto da plataforma.
- `MOAT.md` (Parte 11 desta mesma missão) — o dado histórico acumulado por esta plataforma (seção 2 aqui) é, ele mesmo, o ativo central do moat.
