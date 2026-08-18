# FLUXO DE REVISÃO COM O ADVOGADO — passo a passo operacional

Atualizado: 2026-08-18 (Fase 5). Este documento descreve COMO operar o ciclo completo de revisão
jurídica dentro do sistema: exportar → enviar → importar o retorno → comparar → registrar a
revisão → aprovar → publicar. Nenhuma etapa exige conhecimento técnico — tudo acontece na tela.

**Princípio inegociável:** o sistema NUNCA declara um documento juridicamente válido. Ele
registra que uma pessoa (o advogado) declarou. Até lá, todo documento carrega o carimbo
**MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA** na tela e no PDF.

## Os 8 estados de um documento da biblioteca

Cada template exibe um selo de estado em **Jurídico → Templates**. O estado é DERIVADO do que
realmente aconteceu (nunca é um campo que alguém marca à mão):

| Estado | O que significa | O que o gera |
|---|---|---|
| Rascunho | redação interna, nunca enviada | template com status rascunho, sem revisões |
| Em revisão interna | alguém está mexendo na redação | fotografia recente de origem "edição"/"ajuste interno" |
| Enviado ao advogado | há um envio registrado aguardando retorno | revisão jurídica `pendente` da versão atual |
| Retorno recebido | o texto do advogado foi importado | última fotografia com origem "retorno do advogado" |
| Em ajuste | houve ajuste interno depois do retorno | fotografia "ajuste interno" após o retorno |
| Aprovado juridicamente | revisão `aprovada` registrada para a versão atual | registro na aba Revisão |
| Publicado (OFICIAL) | aprovado + publicado — sai SEM carimbo de minuta | publicação após aprovação |
| Arquivado | fora de uso; contratos antigos continuam íntegros | botão Arquivar |

**OFICIAL = publicado + aprovado juridicamente na versão atual.** Se o corpo mudar depois da
aprovação, a aprovação NÃO acompanha: a nova versão volta a ser minuta até nova revisão.

## Passo 1 — Instalar/atualizar a biblioteca

1. Menu **Jurídico → Templates**.
2. Botão **Instalar biblioteca**: cria os 17 documentos (master + 16 termos) que ainda não
   existirem. NUNCA sobrescreve um template existente — quem já está instalado é ignorado.

## Passo 2 — Exportar o Pacote para o Advogado

1. **Jurídico → Templates → Pacote para Advogado** (ou direto em `/juridico/pacote-advogado`).
2. Marque as categorias a incluir (por padrão, todas).
3. Preencha **Destinatário** (ex.: "Dra. Fulana — Escritório X"). Com o destinatário preenchido,
   o sistema registra o envio e os templates passam a exibir **Enviado ao advogado**. Sem
   destinatário, o ZIP é gerado mas o envio NÃO é registrado.
4. Clique **Exportar Pacote Jurídico (.zip)**. O ZIP baixa organizado em pastas:
   `00_Capa` (README com aviso de minuta), `01_Contratos` … `07_LGPD` (documentos por categoria),
   `08_Matriz_de_Variaveis`, `09_Pendencias_Juridicas` (todas as marcações [VALIDAR COM ADVOGADO]
   por documento + decisões já registradas na Sala do Advogado), `10_Historico_de_Versoes`.
5. Envie o ZIP ao advogado pelo canal que preferir (e-mail, drive). O sistema não envia e-mail.

O que pedir ao advogado: devolver cada documento revisado como arquivo `.md` (texto), mantendo
as variáveis `{{...}}` conforme a matriz da pasta 08. Ele pode alterar redação, remover ou
acrescentar cláusulas — só não pode inventar variável nova fora do catálogo (a importação bloqueia
e mostra qual foi).

## Passo 3 — Importar o retorno do advogado

Para CADA documento devolvido:

1. **Jurídico → Templates** → clique no documento → aba **Importar retorno**.
2. Abra o arquivo devolvido no Bloco de Notas, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole no
   campo de texto (Ctrl+V).
3. Escolha a **origem**: "Retorno do advogado". Preencha **Responsável** (nome do advogado) e,
   se quiser, uma observação (ex.: "retorno da revisão de 20/08").
4. Clique **Importar**. O que acontece por baixo, garantido por banco de dados:
   - a redação ANTERIOR é fotografada automaticamente no histórico imutável (impossível perder);
   - a nova redação entra no template;
   - se houver variável fora do catálogo, a importação é BLOQUEADA e o erro diz qual variável.
5. Nada disso afeta contratos já gerados: cada contrato fica congelado na versão que usou.

## Passo 4 — Comparar (o que mudou?)

1. No mesmo documento, aba **Histórico**: cada linha é uma redação anterior, com data, origem
   (edição / retorno do advogado / ajuste interno / publicação), responsável e hash SHA-256.
2. Clique numa linha para ver a redação daquela época e o **diff** (o que saiu em vermelho, o que
   entrou em verde) contra a redação atual.

## Passo 5 — Registrar a revisão jurídica

1. Aba **Revisão jurídica** do documento → **Registrar revisão**.
2. Preencha revisor, resultado (aprovada / com ressalvas / reprovada) e parecer.
3. Este registro é OPERACIONAL: documenta que a revisão humana aconteceu. Não é certificação
   automática de validade — o sistema mostra esse aviso na própria tela.

Se o advogado apontou ajustes antes de aprovar: faça o ajuste na aba **Importar retorno** com
origem "Ajuste interno" (ou reenvie o pacote — Passo 2) e repita o ciclo até a aprovação.

## Passo 6 — Publicar (virar OFICIAL)

1. Com a revisão **aprovada** registrada na versão atual, clique **Publicar** no documento.
2. Publicar cria versão nova do template (v1 → v2 → …) e o selo vira **OFICIAL**: os PDFs gerados
   a partir dele saem sem o carimbo de minuta.
3. Regra de retroatividade (garantida por teste automatizado): republicar NUNCA altera contratos
   já gerados — eles permanecem congelados na versão em que foram assinados. Documento novo usa a
   versão nova; documento antigo permanece como estava.

## Decisões pontuais (sem trocar o texto inteiro)

Para as marcações [VALIDAR COM ADVOGADO] individuais, use a **Sala do Advogado**
(**Jurídico → Sala do Advogado**): cada pendência aceita decisão registrada (quem decidiu, o quê,
quando). As decisões acompanham o Pacote (pasta 09) nas exportações seguintes.

## Erros comuns

- **"Variável órfã" na importação** — o texto devolvido usa `{{algo}}` que não existe no catálogo.
  Peça ao advogado para usar a variável equivalente da matriz (pasta 08) ou escreva o valor fixo
  por extenso no texto.
- **Selo voltou para "minuta" depois de publicar** — alguém editou o corpo depois da aprovação.
  É o comportamento correto: texto novo = revisão nova. Veja o Histórico para saber quem/quando.
- **Quero desfazer uma importação** — importe de novo colando a redação anterior (ela está
  íntegra no Histórico). O histórico nunca é apagado; "desfazer" é criar mais um passo à frente.
