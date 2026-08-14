# CLAUDE.md — memória de trabalho do PrimeCharge OS

Leia este arquivo inteiro antes de fazer qualquer coisa. Ele existe porque o sandbox onde uma
sessão de IA trabalha é temporário (pode resetar entre uma mensagem e outra, sem aviso) — o
código de verdade vive no GitHub e no PC do Carlos, não neste container. Este arquivo é atualizado
a cada parada de trabalho pra que a próxima sessão (ou você mesmo, depois de um reset) não precise
reconstruir o contexto do zero.

**Última atualização:** 2026-08-14, fim da Fase 4.3 (Central de Decisão Empresarial).

## 0. Regra de ouro antes de tocar em qualquer código

Nunca confie no estado local deste container. Antes de qualquer trabalho, rode:
```
git fetch origin && git log origin/dev-epico9-expansao --oneline -5
```
O `origin` (GitHub, `carlaobh20/PrimeCharge-System`) é a única fonte de verdade. Este sandbox já
resetou pelo menos uma vez no meio desta sessão, perdendo commits locais que ainda não tinham sido
empurrados pra lugar nenhum — só não viraram perda de trabalho porque cada entrega vira um arquivo
`.bundle` salvo tanto no GitHub (depois do push) quanto na pasta do projeto no PC do Carlos
(`C:\MEUS PROJETOS\PrimeChargeSystem\*.bundle`) antes de sumir daqui.

## 1. Onde exatamente paramos (2026-08-14)

- **Branch de trabalho:** `dev-epico9-expansao` (ainda não foi pra `main` — só migra pra lá quando
  tudo estiver validado, por instrução do Carlos).
- **No GitHub (`origin`), confirmado por push real:** commit `91df8d1` — "fix(estrategia): corrige
  crash insertBefore no Fluxo de Caixa (Card 2)".
- **Pendente de aplicar no PC do Carlos:** commit `ff3b178` — "fix(estrategia): remove
  classificação subjetiva de risco (Fase 4.3)" — está entregue como arquivo
  `fase4.3-remove-risco.bundle` na raiz do projeto no PC dele, **ainda não mergeado nem pushado**.
  Comandos pra aplicar (já testados, funcionam):
  ```
  git fetch "fase4.3-remove-risco.bundle" HEAD:fase4.3-novo
  git merge fase4.3-novo
  git push origin dev-epico9-expansao
  git branch -d fase4.3-novo
  ```
  **Antes de continuar qualquer trabalho novo em `src/features/estrategia/`, confirme que este
  push já aconteceu** (`git log origin/dev-epico9-expansao --oneline -3` deve mostrar `ff3b178`
  no topo). Se ainda não aconteceu, é o próximo passo, não outra tarefa.

## 2. Investigação em aberto, sem resposta do Carlos

Depois do commit `91df8d1` (fix do crash "insertBefore" no Card "Fluxo de caixa mês a mês"), o
Carlos reportou que o app **continuava travando com o mesmo erro**, no mesmo deploy que já tinha
o fix confirmado ao vivo (conferido direto no Vercel, deployment com o SHA certo, sem erro de
build). Duas hipóteses ficaram nesse ponto, nenhuma confirmada:

1. O fix estava incompleto — sobrava algum outro gráfico com o mesmo padrão de bug (lista de
   filhos de tamanho variável dentro de um `<LineChart>`/`<AreaChart>` do Recharts) que eu não
   encontrei na auditoria.
2. Não é mais bug nosso — o erro `insertBefore... não é filho deste nó` é também a assinatura
   clássica de extensão de navegador mexendo no DOM por baixo do React (Grammarly, tradutor,
   bloqueador de anúncio — documentado até em issues do próprio React). O Carlos tem várias
   extensões na barra do Chrome.

Pedi pra ele testar em aba anônima do Chrome (elimina a maioria das extensões) pra decidir entre
as duas hipóteses. **Ele nunca respondeu isso** — a conversa seguiu direto pra Fase 4.3 (remoção
do selo de risco). Ou seja: **não está confirmado se o crash foi resolvido de verdade.** Não
assuma que sim. Primeira pergunta a fazer pro Carlos na próxima sessão, se ele não trouxer sozinho.

## 3. O que já foi decidido e fechado — não reabrir sem pedido explícito

- **"Nível de risco" (Card 1, `VisaoExecutivaCard.tsx`):** já não existia no código — tinha sido
  removido no commit `53debbc`, antes desta sessão. Um handoff de sessão anterior dizia o
  contrário (que ainda existia); estava desatualizado/errado. Confirmado por busca em toda a
  `src/` (zero resíduo de `NivelDeRisco`/`calcularNivelDeRisco`/`LABEL_RISCO`).
- **Selo "Operação Saudável / Atenção / Operação em Risco" (`MargemDeSegurancaCard.tsx`):**
  removido no commit `ff3b178` (ver seção 1 — ainda não aplicado no repo do Carlos, mas o código já
  está pronto e testado). Junto foi removida a classificação `nivel`/`motivo` do motor
  (`margemDeSeguranca.ts`) — não sobrou em lugar nenhum, não foi só escondida. **As 7 fórmulas
  numéricas do motor não mudaram** (conferido diff linha a linha antes de commitar).
- **Decisão geral do Carlos:** a Central de Decisão Empresarial não deve ter NENHUMA classificação
  subjetiva de risco (nem selo, nem score, nem "nível"). Só números objetivos. Vale como regra pra
  qualquer card futuro nessa tela também.

## 4. Zona congelada — não tocar sem pedido explícito

`src/features/estrategia/expansao/` (Épico 9 — Motor de Expansão da Frota / Crescimento Composto).

O material confirmado pelo Carlos é: Parte 1 (mapa da auditoria), Parte 2 (frota real integrada +
DSCR), Parte 3 (origem do dado + informação incompleta — commit de referência `a37b1cb`). **Não
existe confirmação de uma Parte 4.** Instrução explícita do Carlos (2026-08-14):
- não aplicar bundle antigo da Fase 2.1;
- não fazer merge de código antigo da expansão;
- não alterar `ExpansaoDaFrota.tsx`, `crescimentoComposto.ts`, nem `types.ts` da expansão.

Encontrei nesses arquivos, de passagem, o MESMO padrão de bug do "insertBefore" (lista de
`<ReferenceLine>`/`<Line>` de tamanho variável dentro de um `<LineChart>`, em `ExpansaoDaFrota.tsx`
linha ~756-766) — **não corrigi, por estar fora do escopo liberado.** Fica registrado aqui pra
não se perder: se um dia a aba "Expansão da Frota" travar com o mesmo erro, essa é a primeira
suspeita, mesma receita de correção já usada nos outros 3 gráficos (mapear sobre a lista inteira,
sempre montada, variando só opacidade/rótulo por item — não sobre uma lista filtrada).

Este sandbox também tinha, em algum momento desta sessão, 3 arquivos dessa pasta com edições não
commitadas (provavelmente resíduo de uma sessão anterior). Guardei num `git stash` local pra não
perder nem aplicar sem querer — mas **um stash local não sobrevive a um reset do sandbox**, então
não conte com ele. Se sumir, não é perda de trabalho novo: é, na pior hipótese, a mesma coisa que
já está descrita nos relatórios da Fase 2.1 salvos no projeto Claude.

## 5. Regra arquitetural (vale pra qualquer trabalho futuro em `estrategia/`)

> O MOTOR (`src/features/estrategia/intelligence/*.ts`) calcula.
> O COMPONENTE REACT (`src/features/estrategia/components/*.tsx`) só apresenta.
> Nenhuma fórmula financeira de decisão nasce dentro de um componente.
> Nenhuma classificação subjetiva de risco (selo, score, "nível") aparece na Central de Decisão —
> só números objetivos.

## 6. Como esta sessão entrega código (o sandbox não tem push direto)

1. Trabalho acontece em `/home/claude/primecharge/work9` (branch `dev-epico9-expansao`).
2. Cada entrega vira `git bundle create nome.bundle origin/dev-epico9-expansao..HEAD`.
3. O `.bundle` é enviado pro Carlos (chat) e gravado direto em
   `C:\MEUS PROJETOS\PrimeChargeSystem\` via a ponte com o computador dele.
4. Ele aplica com `git fetch "nome.bundle" HEAD:branch-nova` (⚠️ sempre `HEAD:`, nunca o nome da
   branch de origem — o bundle só expõe o ref `HEAD`, isso já causou um bloqueio inteiro numa
   sessão anterior) `&& git merge branch-nova && git push origin dev-epico9-expansao`.
5. A ponte com o PC do Carlos (quando o desktop app dele está aberto) também deixa rodar comandos
   git direto lá — mas ela **não consegue apagar arquivos** (limitação confirmada). Merges que
   precisam limpar lock files no meio do caminho falham por isso. Prefira pedir pro Carlos rodar o
   merge/push final ele mesmo, e use a ponte só para diagnóstico (`git log`, `git status`,
   `git bundle verify`) e para copiar arquivos.
6. Lock files órfãos (`.git/index.lock`, `.git/packed-refs.lock`, `.git/refs/heads/*.lock`) no PC
   do Carlos já bloquearam merges mais de uma vez nesta sessão — se um `git merge`/`git push` falhar
   com "Unable to create ... File exists", a solução é apagar esse arquivo específico (`del
   caminho\do\arquivo.lock`) e tentar de novo.

## 7. Perguntas em aberto pro Carlos

1. O crash "insertBefore" some numa aba anônima do Chrome, ou é bug real que sobrou? (seção 2)
2. Confirmar que o bundle da Fase 4.3 foi aplicado e pushado (seção 1).
3. Login do motorista de teste — pendência antiga, separada, rate limit de e-mail do Supabase
   (nunca voltou a ser tratada nesta sessão).
