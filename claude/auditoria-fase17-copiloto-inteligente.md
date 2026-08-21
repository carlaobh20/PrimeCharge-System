# Auditoria de Reuso — Fase 17: Copiloto Inteligente do Motorista
**Data:** 2026-08-21 · **Base:** `dev` commit `01e9c6c` (= device `db80bd8`, migrations 0049/0050 já aplicadas em produção)

Auditoria feita ANTES de qualquer código, por leitura direta e completa dos arquivos-fonte (não por suposição). Nenhuma linha de implementação da Fase 17 foi escrita antes deste documento.

---

## 0. Decisão de escopo desta passada (registrada, não silenciosa)

A especificação da Fase 17 pede 12 módulos (A→L) + script de teste com 22 categorias + 2 documentos novos + regressão total. É um volume real de várias fases anteriores somado. Para manter o mesmo padrão de qualidade da Fase 16 (motor testado com Postgres real, zero regressão provada, não só declarada), faço aqui o mesmo tipo de corte deliberado que fiz na Fase 16 — registrado, não escondido:

**ENTRO nesta passada:** Módulos A (Histórico Inteligente por período), B (Inteligência por Horário), C (Inteligência por Dia da Semana), D (Copiloto conectado à Meta), E (Seu Copiloto — card contextual), F (`insightsCopiloto()`, motor puro), G (Qualidade da Base), H (Configurações do Copiloto). Isso é o núcleo de inteligência operacional que o motorista realmente usa todo dia, com zero migration e reuso máximo do que já existe.

**FICA PARA A PRÓXIMA PASSADA (arquitetura-only nesta, não implementado):** Módulo I (extensão de Cenários com "usar minha média registrada"), Módulo J (extensão do Plano de Hoje com "janelas com mais registros"), Módulo K (Assistente Contextual determinístico com Q&A). Módulo L (documentação de arquitetura futura) **entra**, porque é só documentação, sem código — custo baixo, e a spec já pede como doc-only mesmo.

Motivo do corte: I/J são extensões pequenas mas cada uma pede o mesmo rigor de teste dos módulos centrais (fixtures determinísticas, sem número inventado) — fazer rápido e mal violaria a regra #1 do projeto (nunca fabricar dado/estimativa não rotulada). K é o módulo de maior risco (é fácil um "assistente" deslizar pra afirmação categórica em vez de leitura de dado) e merece uma passada dedicada com o mesmo tipo de auditoria de vocabulário proibido que os outros 8 scripts já fazem — não dá pra fazer isso com qualidade no mesmo fôlego dos 8 módulos centrais.

Isso será reavaliado no relatório de entrega desta fase, e você decide se quer que eu já siga direto para I/J/K numa próxima passada.

---

## 1. O que já existe

- **Motor puro (`lib/metas.ts`, 1811 linhas):** ~50 funções exportadas, todas sem rede. Já cobre: meta mensal/diária, ritmo do mês, janela operacional (7/14/30/90d), evolução de período vs. período anterior, qualidade de dados/operacional, médias por dia da semana (`mediasPorDiaSemana`, com limiar mínimo de observações), cenários operacionais, e o motor do Copiloto da Fase 16 (`avaliarCorrida`, `ConfigCopiloto`, `CONFIG_COPILOTO_PADRAO`).
- **Tabela `motorista_corridas` (0049, já em produção):** `data`, `hora`, `app`, `valor`, `km_estimado`, `duracao_estimada_min`, `classificacao` (snapshot), `aceita`, `origem_captura`, `observacao`, `criado_em`. Já tem tudo que os Módulos A/B/C precisam ler (histórico por período usa `data`+`valor`; por horário usa `hora`; por dia da semana usa `data`).
- **Tabela `motorista_config_copiloto` (0050, já em produção):** limiares de R$/km e R$/h (bom/ruim), pesos (`peso_rpkm`, `peso_rph`, `peso_rpcorrida`), `ativo`. Já é exatamente o que o Módulo H precisa configurar — **inclusive uma coluna (`peso_rpcorrida`) que já existe no banco e na API mas que `avaliarCorrida()` ainda não usa** (gap real, mas fora do pedido explícito da Fase 17; não mexo nela nesta passada pra não expandir escopo sem pedido).
- **`useMinhaMeta.ts`:** único agregador, já busca `corridas60` (90 dias de `motorista_corridas`) e `configCopilotoRow`, já deriva `corridasHoje`/`qtdCorridasHoje`/`somaValorCorridasHoje`/divergências/`configCopiloto`/`copilotoConfigurado`/`copilotoAtivo`/`copilotoIndisponivel`.
- **`CopilotoCard.tsx`:** já mostra avaliação de corrida individual + lista do dia, dentro do `CentroControlePage`.
- **Padrão de configuração inline (não é rota nova):** `motorista_meta_config` (a meta mensal) é editado hoje via um estado local `mostrarConfig` dentro de `MinhaMetaPage.tsx` — um bloco colapsável na própria página, **não uma rota separada**. Não existe nenhuma sub-rota tipo `/motorista/algo/configuracoes` em nenhum lugar do router hoje; o único path com dois segmentos é `pagamentos/:id` (rota de detalhe, não de configuração).
- **8 audit scripts (`scripts/audit-motorista-*.ts`)** com convenção idêntica (`check`/`aprox`/bloco de fonte via regex/saída padronizada), cobrindo cada fase anterior. Nenhum cobre ainda: histórico por horário, por dia da semana, insights automáticos, ou qualidade da base específica do Copiloto.

## 2. O que pode ser reutilizado (sem duplicar)

- `calcularRpKm`, `calcularRph` — todo cálculo de R$/km e R$/h dos Módulos A/B/C/D usa exatamente essas duas funções, nunca uma divisão nova.
- `mediasPorDiaSemana(ganhos, minObs)` — já existe para `motorista_ganhos` (dia inteiro). O Módulo C (por dia da semana, mas de **corridas individuais**) é um domínio de dado diferente (linha por corrida, não por dia), então não dá pra chamar a função direto — mas o **padrão** dela (limiar mínimo de observações, agrupamento por `getDay()`) é reaproveitado como modelo dentro da nova função, sem reinventar a filosofia.
- `qualidadeDados`/`qualidadeOperacional`/`confiancaDados` — mesmo raciocínio: filosofia (nunca dizer "bom" sem massa de dado suficiente, categorias tipo DADOS_INSUFICIENTES/BASE_INICIAL/BASE_CONSISTENTE/BASE_RELEVANTE) é reaplicada ao Módulo G (Qualidade da Base do Copiloto), que é sobre `motorista_corridas`, não sobre `motorista_ganhos` — domínio diferente, mesma filosofia.
- `calcularMetaHoje`, `rebalancear`, `ritmoDoMes`, `mediaRealPorHora` — Módulo D não recalcula NADA disso; só lê os valores que `useMinhaMeta` já deriva e os expõe ao lado do resumo de corridas do dia.
- `cenariosOperacionais` — mencionado no pedido para o Módulo I (fora de escopo nesta passada); nenhuma chamada nova nesta passada.
- `avaliarCorrida`/`ConfigCopiloto` — o Módulo H só edita a config que esse motor já lê; não muda a assinatura do motor.
- `listCorridasPeriodo`, `getConfigCopiloto`, `salvarConfigCopiloto` (`api/corridasPessoais.ts`) — já existem exatamente como o Módulo A/H precisam; nenhuma API nova de leitura é necessária além de uma extensão de janela (ver §7).
- O padrão de `lerTolerante('copiloto', ...)` e `moduloIndisponivel('copiloto')` do `schemaGuard.ts` — reaproveitado tal qual, nenhuma tag nova de módulo é necessária (Módulos A-H continuam sob a mesma tag `'copiloto'`, já que dependem das mesmas duas tabelas 0049/0050).
- O padrão de "config inline dentro da página" (`mostrarConfig` do `MinhaMetaPage.tsx`) — reaproveitado para o Módulo H em vez de criar rota nova.
- Convenção dos 8 audit scripts — reaproveitada linha a linha para `audit-motorista-copiloto-inteligente.ts`.

## 3. O que precisa ser apenas estendido

- **`useMinhaMeta.ts`**: a busca de corridas hoje é de 90 dias fixos (`corridas60`, apesar do nome, é a janela de 90d usada por outros módulos). Os Módulos A/B/C pedem períodos de até 90 dias (7/14/30/90) — a mesma janela de 90 dias já buscada é suficiente como fonte; a função de agregação por período apenas filtra client-side dentro dela (mesmo padrão de `ganhosNaJanela`/`janelaOperacional`, que também recebem a janela mais larga já buscada e cortam por dias). **Nenhuma nova query ao Supabase é necessária.**
- **`CentroControlePage.tsx`**: ganha novas seções (Histórico Inteligente, Inteligência por Horário/Dia da Semana, Seu Copiloto, Qualidade da Base, Configurações do Copiloto), todas atrás do gate já existente `!d.copilotoIndisponivel` — nenhum gate novo é necessário.
- **`CopilotoCard.tsx`**: ganha um bloco de configuração colapsável (Módulo H) e passa a mostrar o resultado do Módulo E (Seu Copiloto) — ou esse último vira um card irmão novo (decisão de implementação: card novo `CopilotoInteligenteCard.tsx`, pra não sobrecarregar um componente que já tem 183 linhas e uma responsabilidade clara — avaliar+registrar corrida).

## 4. O que realmente não existe (e precisa ser criado)

- Função pura `historicoPorPeriodo(corridas, periodoDias, hojeIso)` — agregação de corridas por período com comparação vs. período anterior (Módulo A).
- Função pura `inteligenciaPorHorario(corridas)` — agrupamento em 7 faixas fixas com classificação por volume de observação (Módulo B).
- Função pura `inteligenciaPorDiaSemana(corridas)` — agrupamento por dia da semana com a mesma disciplina de mínimo de observações (Módulo C).
- Função pura `insightsCopiloto(...)` — motor de insights estruturados (Módulo F), consome as saídas de A/B/C/qualidade e produz uma lista tipada, sem nenhum acesso a rede.
- Função pura `qualidadeBaseCopiloto(corridas)` — qualidade da base de corridas (Módulo G), distinta de `qualidadeOperacional` (que é sobre `motorista_ganhos`).
- Componentes de UI novos: bloco/seção de Histórico Inteligente, bloco de Horário/Dia da Semana, `CopilotoInteligenteCard` (Módulo E, "Seu Copiloto"), bloco de Qualidade da Base, bloco de Configurações do Copiloto (Módulo H, dentro do `CopilotoCard` ou como card irmão colapsável).
- Script `scripts/audit-motorista-copiloto-inteligente.ts`.
- Docs `docs/motorista/COPILOTO-INTELIGENCIA.md` e `docs/motorista/COPILOTO-INTELIGENCIA-FUTURA.md`.

## 5. Se alguma migration é realmente necessária

**Não.** Nenhuma migration nova é necessária para os Módulos A/B/C/D/E/F/G/H:

- Módulo A/B/C: `motorista_corridas` já tem `data`, `hora`, `valor`, `km_estimado`, `duracao_estimada_min`, `app` — tudo client-side sobre o que `listCorridasPeriodo` já devolve.
- Módulo D: zero dado novo, só leitura do que `useMinhaMeta` já deriva.
- Módulo E/F/G: funções puras sobre A/B/C + `qualidadeDados`-like — zero dado novo.
- Módulo H: `motorista_config_copiloto` já tem todas as colunas necessárias (inclusive `peso_rpcorrida`, que fica gravável mas ainda não influencia `avaliarCorrida` — documentado como gap conhecido, não como bug desta fase).

Se em algum ponto da implementação eu encontrar necessidade real de coluna nova, sigo o protocolo pedido: paro, documento aqui por que os dados atuais não bastam, e só então proponho a migration — não aplico nada em produção de qualquer forma.

## 6. Quais queries já existem

- `listCorridasPeriodo(inicioIso, fimIso)` — já busca até 90 dias de corridas (chamada em `useMinhaMeta` como `corridas60`).
- `getConfigCopiloto()` / `salvarConfigCopiloto(motoristaId, patch)` — já existem para o Módulo H.
- `registrarCorrida` / `removerCorrida` — já existem, reaproveitadas sem mudança pelo Módulo D (nenhuma escrita nova).

## 7. Quais queries podem ser ampliadas

- Nenhuma amplificação de query é necessária — a janela de 90 dias já buscada cobre os períodos pedidos (7/14/30/90d) via filtro client-side, exatamente como `janelaOperacional`/`evolucaoPeriodo` já fazem hoje com `ganhos60`. Se no futuro a Fase 17-B (I/J/K) precisar de janelas maiores que 90 dias, aí sim a query de `listCorridasPeriodo` precisaria de um período maior — não é o caso agora.

## 8. Onde existe risco de duplicação

- **R$/km e R$/h**: risco de cada módulo novo (A/B/C) reimplementar sua própria divisão. Mitigação: todas as três funções novas usam exclusivamente `calcularRpKm`/`calcularRph` importadas de `metas.ts`, nunca `valor/km` ou `valor/horas` inline.
- **Classificação de confiança por volume de observação**: risco de inventar um esquema de rótulos novo e incompatível com `ConfiancaDados`/`CONFIANCA_LABEL` já existentes. Mitigação: os limiares pedidos pela Fase 17 (< 3 / 3-6 / 7-13 / 14+) são **diferentes** dos limiares de `confiancaDados` (que são sobre dias de `motorista_ganhos`, não corridas) — então é um novo enum (`ClassificacaoAmostra` ou similar), mas com a MESMA filosofia (nunca apresentar uma média com poucas observações como se fosse conclusiva). Documentado explicitamente para não confundir com `ConfiancaDados`.
- **`insightsCopiloto` reimplementando lógica de A/B/C**: mitigado por design — Módulo F só CONSOME o retorno de A/B/C, nunca recalcula agregação por conta própria.
- **Card de configuração duplicando o padrão de `motorista_meta_config`**: mitigado reaproveitando o mesmo padrão de estado colapsável (`mostrar*`) já usado em `MinhaMetaPage.tsx`, em vez de inventar um padrão de rota novo.

## 9. Impacto de performance

- Toda a agregação nova (A/B/C/F/G) é `O(n)` sobre no máximo ~90 dias de corridas já em memória (mesmo array `corridas60` que `useMinhaMeta` já busca uma vez por carregamento de página) — nenhuma query adicional ao Supabase, nenhum novo round-trip de rede.
- `insightsCopiloto` roda inteiramente client-side sobre dados já derivados — custo desprezível mesmo em dispositivo de motorista (poucas centenas de linhas de array, sem laço aninhado além de agrupamento simples).
- Nenhum índice novo necessário (o índice `idx_motorista_corridas_dono(motorista_id, data desc, criado_em desc)` de 0049 já cobre o padrão de leitura por dono+período).

## 10. Impacto de RLS

- Nenhuma tabela nova, nenhuma policy nova. Módulos A-H leem e escrevem exclusivamente em `motorista_corridas`/`motorista_config_copiloto`, ambas já com RLS "privacidade invertida" (1 policy do dono, zero policy de staff, zero trigger de audit_log) provada por 26 asserts SQL reais na suíte `68_motorista_copiloto.sql`. Nenhuma alteração de RLS é necessária ou proposta nesta fase.

---

**Encerramento da auditoria.** Nenhuma migration necessária, reuso máximo confirmado, risco de duplicação mapeado e mitigado por design. Prossigo agora para a implementação dos Módulos A/B/C/D/E/F/G/H + doc L, conforme a decisão de escopo registrada na seção 0.
