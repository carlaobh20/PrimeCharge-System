# CONFLITOS POTENCIAIS ENTRE DOCUMENTOS — Biblioteca Contratual PrimeCharge

> GERADO por `scripts/gerar-qa-biblioteca.ts` a partir de `qaBiblioteca.ts`. O sistema NÃO
> decide qual lado está correto: cada conflito traz a pergunta para o advogado. Prioridade é
> ORDENAÇÃO OPERACIONAL de revisão, não análise de risco jurídico. Atualizado: 2026-08-18.

## C1 — Vencimento × periodicidade (Crítico · ABERTO)

- **Documento A:** Contrato Master (Cl. 5.1)
- **Documento B:** Dado do sistema (contratos.dia_vencimento) — cobrança semanal/diária
- **Diferença:** O Master diz "vencimento no dia {{contrato.dia_vencimento}} de cada período", mas dia_vencimento é um dia do MÊS — em cobrança semanal ou diária a expressão não descreve o vencimento real.
- **Pergunta para o advogado:** Como redigir o vencimento para periodicidade semanal/diária (ex.: "toda segunda-feira", "no ato")? A redação atual só é precisa para cobrança mensal.

## C2 — Boletim de ocorrência (Médio · ABERTO)

- **Documento A:** Comunicação de Sinistro (§2.1: BO "obrigatório em furto, roubo e danos a terceiros")
- **Documento B:** Contrato Master (Cl. 10.2(b): BO "quando cabível")
- **Diferença:** O termo especifica os casos de BO obrigatório; o Master deixa em aberto ("quando cabível"). Os dois textos podem ser lidos como regras diferentes.
- **Pergunta para o advogado:** Definir a lista de hipóteses de BO obrigatório num só lugar (Master) e referenciá-la no termo — quais hipóteses?

## C3 — Valor na renovação (Alto · TRATADO NA FASE 6)

- **Documento A:** Termo de Renovação (§2.1 — exibe {{contrato.valor_periodico}} VIGENTE)
- **Documento B:** Contrato Master (Cl. 5.4 — reajuste possível na renovação)
- **Diferença:** O termo exibe o valor vigente do contrato; se a renovação alterar o valor, o documento mostraria o antigo.
- **Pergunta para o advogado:** A alteração de valor pode constar do próprio termo de renovação ou deve sempre ser aditivo separado?
- **Tratamento aplicado:** Fase 6 acrescentou ao termo a nota de que o valor exibido é o vigente e que alteração se formaliza por aditivo próprio; a pergunta ao advogado permanece registrada.

## C4 — Condutor no sinistro (Médio · ABERTO)

- **Documento A:** Declaração de Sinistro (§3.1(a): "era eu quem conduzia")
- **Documento B:** Contrato Master (Cl. 2.2: condução por terceiro AUTORIZADO possível)
- **Diferença:** A declaração presume o locatário ao volante; o Master admite condutor autorizado — não há campo para esse caso.
- **Pergunta para o advogado:** Criar campo/versão da declaração para condutor autorizado? Qual o efeito sobre seguro e responsabilidade?

## C5 — Dependência entre documentos (Baixo · ABERTO)

- **Documento A:** Termo de Encerramento (§4.1: quitação "é objeto do Termo de Quitação")
- **Documento B:** Termo de Quitação (uso CONDICIONADO — pode nem existir, decisão do advogado)
- **Diferença:** O encerramento referencia um documento cuja própria existência depende de decisão jurídica pendente.
- **Pergunta para o advogado:** Se a quitação não for adotada, qual redação substitui a referência no encerramento?

## C6 — Anexo sem peça (Baixo · ABERTO)

- **Documento A:** Contrato Master (lista de Anexos: "Resumo das condições comerciais")
- **Documento B:** Biblioteca (não existe peça própria de resumo comercial)
- **Diferença:** O anexo citado não é um documento da biblioteca — os dados vivem no corpo do contrato e no PDF.
- **Pergunta para o advogado:** Manter a citação (com o contrato valendo como o próprio resumo) ou criar a peça? (também é decisão de produto)

## C7 — Vocabulário (Baixo · ABERTO)

- **Documento A:** Documentos (LOCADORA / LOCATÁRIO)
- **Documento B:** Sistema (partes "primecharge" / "motorista" nas assinaturas e telas)
- **Diferença:** Os papéis têm nomes diferentes no texto jurídico e no sistema (equivalência descrita no GLOSSARIO.md).
- **Pergunta para o advogado:** Confirmar/padronizar a nomenclatura das partes entre documentos e interface.

## C8 — Origem do inventário (Médio · ABERTO)

- **Documento A:** Termos de Entrega/Devolução (inventário e avarias informados no gerador)
- **Documento B:** Vistoria do sistema (checklists com fotos, odômetro e carga)
- **Diferença:** O inventário/avarias dos termos é digitado na geração; a vistoria estruturada do sistema ainda não alimenta esses campos automaticamente.
- **Pergunta para o advogado:** Sem pergunta jurídica — decisão de produto registrada (integração vistoria → gerador).

## Decisões de PRODUTO derivadas da auditoria

- Meios de pagamento aceitos: especificar no contrato, em anexo comercial ou manter genérico (Cl. 5.1)?
- Expressão do vencimento para cobrança semanal/diária (conflito C1) — exige mudança de produto (campo próprio) além da redação jurídica.
- "Resumo das condições comerciais" citado como anexo do Master: criar peça própria ou o contrato vale como resumo (conflito C6)?
- Renovação com alteração de valor no próprio termo × sempre por aditivo separado (conflito C3).
- Integrar inventário/avarias estruturados da vistoria ao gerador de termos (hoje campos digitados na geração — conflito C8).
- Campo de condutor terceiro autorizado na Declaração de Sinistro (com o advogado — conflito C4).

## Decisões OPERACIONAIS derivadas da auditoria

- Travas de emissão implantadas na Fase 6 (não gerar termo de seguro sem apólice, de sinistro sem ocorrência, de rescisão sem workflow, de aditivo/renovação sem registro, de encerramento/quitação sem apuração) — manter e revisar caso a operação precise de exceção.
- Quem digita os campos manuais do gerador de termos (padrão sugerido: operação, na presença do motorista, antes da assinatura).
- Canal de envio do Pacote Jurídico ao advogado (o sistema exporta o ZIP e registra o envio; e-mail/drive é manual).
- Vistoria de renovação: recomendada no termo, não obrigatória — definir prática padrão da operação.
- Prazo interno de resposta ao titular LGPD depois que o advogado definir o canal (termo LGPD §5).
