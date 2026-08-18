# ARQUITETURA — Centro Jurídico PrimeCharge

Documento técnico de referência (Fase 4 — 2026-08-18). Público: quem for manter o sistema.

## Modelo de dados (migrations 0042–0045)

- **`contratos`** (0005, pré-existente) — o negócio: ciclo `rascunho→em_analise→aprovado→assinado→
  ativo→renovacao→encerrado/cancelado`, com efeitos financeiros por trigger. O Centro Jurídico NÃO
  criou status paralelo.
- **`contrato_templates`** (0042) — minutas com variáveis `{{...}}`. `versao_template` incrementa
  a cada REpublicação (trigger 0044); `publicado_em` marca a primeira publicação.
- **`contrato_versoes`** (0042) — o DOCUMENTO. `snapshot` (fotografia dos dados na geração),
  `corpo` (renderizado), `hash_sha256` (do corpo), `congelada`. State machine:
  `rascunho→em_revisao→aprovada→aguardando_assinatura→assinada→vigente→substituida`
  (+`cancelada`; `em_revisao→rascunho` = devolução). Ao entrar em `aguardando_assinatura`,
  CONGELA: trigger bloqueia mudança de snapshot/corpo/hash/numero/template_id para sempre.
  `unique(contrato_id, numero)`.
- **`contrato_assinaturas`** (0042; `expira_em` 0044) — uma linha por parte
  (motorista/primecharge). Status: nao_enviado→enviado→visualizado→aceito/assinado |
  recusado/expirado/cancelado. `evidencia` jsonb (user agent, email, timestamps — evidência
  OPERACIONAL, sem alegação de equivalência ICP-Brasil).
- **`contrato_aditivos`** (0042) — nunca sobrescrevem o original; documento do aditivo = nova
  versão do contrato.
- **`contrato_politicas`** (0044) — parametrização: template + campos/anexos obrigatórios + regras.
- **`contrato_seguros`** (0044) — coberturas em 3 estados (true/false/null=não informado).
- **`contrato_rescisoes`** (0044) — workflow `solicitada→em_analise→aprovada→agendada→
  devolucao_pendente→devolvido→encerrada` (+cancelada). Encerrar EXIGE checklist núcleo
  (veiculo_devolvido, vistoria_final, pagamentos_verificados, caucao_apurada) — trigger recusa.
  Unique parcial: 1 rescisão ativa por contrato.
- **`contrato_revisoes_juridicas`** (0044) — registro de revisão do template POR VERSÃO.
- **`juridico_parametros`** (0044) — chave/valor por empresa (decisões do advogado + decisões da
  Sala do Advogado como `minuta_pendencia_<n>`).
- **Reuso integral:** `timeline_eventos` (única timeline), `audit_log` (única auditoria, trigger
  genérico `fn_audit_log`), `arquivos`+Storage `contratos-arquivos` (documentos, com
  `categoria` para classificação), `notificacoes` (App Motorista), `acoes_operacionais`
  (tarefas jurídicas = ações com entidade_tipo='contrato', tipo='juridico_tarefa').

## Segurança (RLS)

- Staff: `pode('contratos', ver|criar|editar)` + `eh_staff()` (exige `usuarios.ativo=true`).
- Motorista: só o PRÓPRIO contrato — versões em estado compartilhável
  (`aguardando_assinatura/assinada/vigente`), a PRÓPRIA linha de assinatura (select/update),
  aditivos do próprio contrato. NADA de: templates, políticas, parâmetros, seguros, rescisões,
  revisões, auditoria, snapshot.
- `current_motorista_id()` exige `usuarios.ativo=true` desde a 0045 (hardening da Fase 4 —
  motorista desativado perde todo acesso imediatamente).
- Toda validação de transição/imutabilidade é TRIGGER no banco — o frontend só espelha para
  habilitar botões (`CONTRATO_VERSAO_TRANSITIONS`, `RESCISAO_TRANSITIONS`).

## Hash e integridade

Hash oficial ÚNICO: **SHA-256 do corpo congelado** (`contrato_versoes.hash_sha256`), calculado na
geração e recalculável a qualquer momento (`hashCorpo`, Web Crypto). O PDF imprime esse hash no
rodapé — é renderização, não segunda verdade. A tela de Integridade (IntegridadePanel) recalcula
e compara: divergência = ALERTA CRÍTICO, nunca correção silenciosa.

## Geração do documento (motor único)

`template.corpo` + `snapshot` → `renderarCorpo()` (substitui `{{var}}`; furo vira
`[SEM VALOR: var]` VISÍVEL) → `hashCorpo()` → `contrato_versoes` (rascunho). Validação prévia:
`validarParaGeracao` (fase 2) + `montarChecklistPreContrato` (fase 3, agrupado + política).
Markdown → HTML (preview, texto 100% escapado) e → conteúdo pdfmake (PDF), mesmo parser
(`markdown.ts`).

## PDF

pdfmake 0.3 em chunk lazy (~971KB, só carrega no clique). `montarDocDefinition` é puro — o mesmo
builder roda no browser e nos testes Node (verificado por extração de texto com pdftotext).
Gerar = baixar + arquivar no Storage + registro em `arquivos` (categoria `contrato-pdf`).

## Dossiê

`dossie.ts` (puro) monta 12 pastas (00_Capa…11_Auditoria); export .zip client-side via fflate.
11_Auditoria respeita a RLS do exportador (não-admin exporta vazio). Capa nega juízo jurídico.

## Frontend

`src/features/contracts/juridico/` — motores puros (`lib`, `markdown`, `diff`, `validacao`,
`checklist`, `risco`, `resumoExecutivo`, `pendenciasMinuta`, `dossie`, `pdf`), api
(`api`, `apiFase3`), hooks TanStack, páginas lazy (dashboard, lista, wizard, detalhe, templates,
políticas, parâmetros, sala-do-advogado). App Motorista: `meuContratoJuridico.ts` com colunas
EXPLÍCITAS (proibido select('*') no portal). Regra: motor calcula, componente apresenta.

## Testes

- SQL: `supabase/tests/rodar_testes.sh` — banco do zero + 7 suítes (20/30/40/50/60/61/62/63).
- Node: `scripts/audit-juridico-{lib,fase2,fase3,fase4}.ts` + `audit-amortizacao-extra.ts`.
- Gates: `tsc -b`, `oxlint`, `vite build`.
