# BIBLIOTECA CONTRATUAL — PrimeCharge

Atualizado: 2026-08-18 (Fase 5). **Todos os documentos são MINUTAS SUJEITAS À VALIDAÇÃO
JURÍDICA** até revisão registrada e publicação. Fonte dos corpos: `docs/juridico/biblioteca/`
(+ o master em `contrato-master-minuta.md`), materializados no sistema pelo botão
**Instalar biblioteca** (Jurídico → Templates). Variáveis: `MATRIZ-VARIAVEIS.md` (gerada).

## Como os 8 contratos pedidos viram 1 Master parametrizável

A missão pedia 8 contratos (master, aplicativo, semanal, mensal, com caução, sem caução, km
controlada, km livre) e autorizou explicitamente o master parametrizável para evitar duplicação.
Mapa variante → mecanismo:

| Variante pedida | Mecanismo no Master |
|---|---|
| 1. Master locação de veículo elétrico | O próprio documento (20 cláusulas) |
| 2. Para motorista de aplicativo | Cláusula 2 (destinação) — já é o caso de uso base |
| 3. Cobrança semanal | `{{contrato.periodicidade}}` = semanal |
| 4. Cobrança mensal | `{{contrato.periodicidade}}` = mensal |
| 5. Com caução | `{{contrato.valor_caucao}}` preenchido → bloco `{{#se}}` da Cláusula 6 |
| 6. Sem caução | caução vazia → bloco `{{#senao}}` (garantia alternativa) |
| 7. Km controlada | `{{contrato.km_incluso}}` preenchido → Cláusula 3 controlada + excedente |
| 8. Km livre | km vazio → Cláusula 3 livre |

As combinações comerciais padrão podem ser fixadas como **Políticas Contratuais**
(/juridico/politicas), que pré-selecionam template e obrigatoriedades no wizard.

## Documentos da biblioteca (17)

| Documento | Categoria | Finalidade | Consolida (mapa das peças pedidas) |
|---|---|---|---|
| Contrato Master — Locação de Veículo Elétrico | contrato | Contrato principal | Contratos 1–8 (tabela acima) |
| Termo de Entrega do Veículo | termo_operacional | Entrega + inventário + vistoria | — |
| Termo de Devolução do Veículo | termo_operacional | Devolução + pendências | Devolução definitiva (parte operacional) |
| Termo de Responsabilidade pelo Veículo e Bens | termo_responsabilidade | Guarda do veículo e itens | Resp. veículo + acessórios + carregador + cabos |
| Termo de Ciência Operacional | termo_responsabilidade | Ciências em capítulos | Ciência de uso + manutenção + recarga + quilometragem |
| Termo de Ciência de Infrações e Multas | termo_responsabilidade | Ciência geral + multa específica (condicional) | Ciência de infrações + resp. por multas |
| Termo de Ciência sobre Rastreamento e Telemetria | lgpd | Rastreamento/telemetria | Ciência de rastreamento + telemetria |
| Termo de Ciência sobre Tratamento de Dados | lgpd | LGPD ao titular | — |
| Termo de Ciência do Seguro | seguro | Apólice/franquia/coberturas/exclusões do CADASTRO | Ciência de seguro + franquia + coberturas + exclusões |
| Comunicação de Sinistro | sinistro | Registro imediato | Comunicação de sinistro |
| Declaração de Sinistro | sinistro | Relato circunstanciado | Declaração de sinistro |
| Termo de Procedimentos de Sinistro | sinistro | Reconhecimento + fluxo + documentos | Reconhecimento + entrega de docs + procedimentos |
| Termo de Rescisão | rescisao | Único, parametrizado por solicitante (condicional) | Rescisão por acordo/motorista/locadora |
| Termo de Encerramento e Devolução Definitiva | rescisao | Fecha a rescisão após checklist | Encerramento + devolução definitiva |
| Termo de Quitação | rescisao | USO CONDICIONADO ao advogado | Quitação |
| Aditivo Contratual | aditivo | Único, parametrizado por tipo | Aditivo geral + valor/prazo/veículo/km/pagamento/caução/condições |
| Termo de Renovação / Prorrogação | aditivo | Renovação nunca automática | Renovação + prorrogação |

## Regras estruturais (garantidas por banco + testes)

- Instalar NUNCA sobrescreve template existente; edição/importação fotografa a redação anterior
  automaticamente (`contrato_template_versoes`, trigger 0046 — histórico imutável).
- Republicar template = nova versão; **contratos gerados permanecem congelados** na versão usada.
- Status da biblioteca (8 estados: rascunho → em revisão → enviado ao advogado → retorno recebido
  → em ajuste → aprovado juridicamente → publicado → arquivado) é DERIVADO de estruturas
  existentes (status do template × revisões jurídicas × origem da última fotografia) — sem enum
  novo no banco.
- **OFICIAL** = publicado + revisão jurídica aprovada da versão atual. Todo o resto é MINUTA
  (carimbo na tela e no PDF).
- Variável órfã (fora do catálogo) bloqueia importação e derruba o audit.

## Fluxo com o advogado

Ver `FLUXO-REVISAO-ADVOGADO.md`. Pacote de exportação: /juridico/pacote-advogado.
