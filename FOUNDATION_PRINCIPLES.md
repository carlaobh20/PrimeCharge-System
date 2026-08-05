# PrimeCharge Platform — Foundation Principles
### Constituição técnica — referência obrigatória para todo desenvolvimento futuro

Revisado por Claude antes de publicar. Pontos corrigidos em relação à proposta original de Carlos estão marcados com 🔶, com o motivo — nada foi alterado silenciosamente.

---

## Missão

O PrimeCharge não é apenas um ERP. É uma plataforma operacional para empresas de locação de veículos elétricos, com ambição de longo prazo de virar a base para outros produtos da PrimeCharge. Essa ambição orienta decisões de fundação (multi-tenant, auditoria, capacidades de entidade) — não obriga cada funcionalidade individual a ser desenhada para produtos que ainda não existem (ver Princípio 7).

---

## Princípio 1 — Toda entidade de negócio compartilha capacidades comuns

Veículo, Motorista, Contrato, Funcionário e toda entidade futura compartilham um conjunto transversal de capacidades: **arquivos, comentários, tags, timeline (histórico de eventos), favoritos**.

🔶 **Correção**: a proposta original pedia uma tabela única de "Entidade" com todos os tipos de negócio nela. Isso é um antipadrão conhecido em bancos relacionais (EAV / "tabela deus") — quebra integridade referencial, torna RLS muito mais difícil de auditar por tipo, e piora performance de índice. Cada tipo de entidade mantém sua **própria tabela forte** (`veiculos`, `motoristas`, `contratos`...). Só as capacidades transversais viram **tabelas genéricas**, referenciando qualquer entidade via `(entidade_tipo, entidade_id, empresa_id)`:

- `arquivos` (documento, foto, comprovante...)
- `comentarios`
- `tags`
- `timeline_eventos` (o que aconteceu, quando, quem fez)
- `favoritos` (por usuário)

`Auditoria` e `Permissões` **não** entram nessa lista como campo por entidade — já são resolvidas de forma transversal por `audit_log` e RLS/role, não precisam ser reinventadas por tipo. `Indicadores` e `IA` por entidade ficam de fora até existir o primeiro caso de uso real de cada um — adicionar agora seria campo sem consumidor.

Isso não é especulativo: é necessidade imediata da Fase 1 (Veículo já precisa de Documento). Construído desde o início do módulo de Frota.

## Princípio 2 — Ativos patrimoniais compartilham um padrão comum (quando existir um segundo tipo)

🔶 **Correção**: a proposta original ("tudo é um ativo": veículos, imóveis, equipamentos, softwares, contratos, clientes) mistura categorias fundamentalmente diferentes. Contrato é um acordo. Motorista/Cliente é uma pessoa. Tratar os dois com o mesmo esqueleto de "ativo patrimonial" é modelagem errada — e no caso de pessoas, uma escolha sensível do ponto de vista de dados pessoais.

Versão corrigida: **bens físicos depreciáveis da própria PrimeCharge** (veículo da frota, e no futuro notebook, celular, carregador, equipamento de escritório) podem compartilhar um padrão comum de "Ativo Patrimonial" — aquisição, depreciação, localização, responsável, manutenção. Isso se implementa quando um segundo tipo de ativo além de Veículo entrar em escopo real (não está em nenhuma fase do roadmap hoje).

## Princípio 3 — Toda ação relevante gera evento

Contrato criado, documento vencendo, pagamento registrado — tudo que for relevante alimenta timeline, auditoria, indicadores, Command Center, BI, automações.

Mecanismo (já registrado em `docs/ARQUITETURA.md`, seção 1.13): trigger Postgres grava num outbox (`audit_log` é o embrião) + Supabase Database Webhooks chamando Edge Functions. Não um event bus em memória no navegador — isso perderia eventos financeiros/contratuais se a aba fechasse no meio do fluxo. Implementado de fato a partir da Fase 3 (Financeiro), quando existir o primeiro efeito cross-domain real para cablear.

## Princípio 4 — Command Center é o cérebro operacional

O usuário não procura problema — o sistema mostra prioridade, risco, tarefa, oportunidade, alerta e recomendação. Primeira tela pós-login (já registrado na Etapa 3 da arquitetura). Populado progressivamente conforme cada módulo nasce.

## Princípio 5 — IA nunca executa

IA analisa, prevê, recomenda, explica. Nunca altera dado diretamente. Execução é sempre da automação ou do usuário. Regra de fronteira válida desde já, implementação quando existir o primeiro caso de uso de IA.

## Princípio 6 — Operações importantes são processos, não apenas formulários

Compra de veículo, criação de contrato e outras operações centrais devem, com o tempo, virar processos modelados (tarefas geradas, documentos exigidos, indicadores atualizados) — não só um formulário isolado.

Mecanismo: **regra dos 3**. Constrói-se Compra de veículo, criação de Contrato e um terceiro fluxo como código simples nas Fases 1–2. Só se extrai um motor de workflow genérico se os três repetirem o mesmo formato. Motor construído para zero fluxos reais é adivinhar a forma errada.

## Princípio 7 — Reuso entre produtos é extraído, não adivinhado

🔶 **Correção**: a proposta original obriga toda funcionalidade nova a ser pensada para reuso por Prime OS, Prime Fleet, Prime Invest, Prime BI, Prime CRM, Prime AI, Prime Portal. Como regra permanente, isso desacelera toda decisão futura por um benefício que só existe se esses produtos forem construídos de verdade — nenhum tem especificação, prazo ou receita hoje.

Versão corrigida: a base já compartilhável — multi-tenant (`empresa_id` + RLS), autenticação, capacidades de entidade (Princípio 1), auditoria — **já é a plataforma**. Reuso específico por outro produto se extrai quando esse produto for construído de verdade, informado pelo que ele realmente precisa. Adivinhar a forma certa para 7 produtos hipotéticos significa errar a forma 7 vezes.

## Princípio 8 — Longevidade vem de simplicidade e baixo acoplamento, não de abstração antecipada

🔶 **Correção**: horizonte de 10 anos é a meta certa. O caminho não é desenhar tudo grande agora — abstração adivinhada erra a forma e fica mais cara de desfazer do que código simples teria sido.

Caminho real, já em prática: módulos com baixo acoplamento (feature nunca importa de outra feature direto, só via `shared/`), armadilhas conhecidas evitadas desde o início (schema compartilhado + RLS em vez de banco por tenant, paginação keyset, índices por `empresa_id` — tudo já em `docs/ARQUITETURA.md`), e abstração extraída só quando o padrão se repetir de verdade (Princípios 1, 6 e 7 acima).

---

## Como este documento é usado

Referência obrigatória para toda decisão de arquitetura futura — mas não estática. Evolui por decisão explícita e registrada (como as correções marcadas 🔶 acima), nunca por interpretação livre ou desvio silencioso. Toda vez que uma decisão de código conflitar com um princípio aqui, a atitude correta é registrar o porquê da exceção, não ignorá-lo.
