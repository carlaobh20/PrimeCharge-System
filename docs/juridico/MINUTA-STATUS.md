# MINUTA MASTER — STATUS (Fase AN, atualizado na Fase 5)

Auditoria técnica da minuta `contrato-master-minuta.md` em 2026-08-18 (master reescrito na
Fase 5: 20 cláusulas + blocos condicionais `{{#se}}/{{#senao}}`). NÃO é revisão jurídica —
é a prova de que a mecânica do documento funciona.

## Verificações executadas (automatizadas — ver scripts/audit-juridico-*.ts)

| Verificação | Resultado | Onde é testado |
|---|---|---|
| Todas as variáveis `{{...}}` do master e dos 16 termos têm origem no catálogo (66 em uso, 0 órfãs) | ✅ | gerar-matriz-variaveis.ts (FALHA se surgir variável sem origem) |
| Snapshot completo cobre todas as variáveis (nenhum `{{...}}` sobra no documento final) | ✅ | audit-juridico-fase2.ts, grupo E + audit-juridico-fase5.ts, grupo D |
| Variável crítica sem valor BLOQUEIA a geração (criticidade vem do catálogo) | ✅ | audit-juridico-fase2.ts, grupo D |
| Variável opcional sem valor sai `[SEM VALOR: …]` visível (nunca lacuna silenciosa) | ✅ | audit-juridico-fase2.ts, grupo B |
| Blocos condicionais equilibrados e resolvidos (com caução/sem caução, km controlada/livre, com/sem apólice) | ✅ | audit-juridico-fase5.ts, grupos A e D |
| Extração do corpo (marcadores de início/fim) estável | ✅ | audit-juridico-fase2.ts, grupo C |
| As marcações `[VALIDAR COM ADVOGADO]` são todas detectadas (24 no corpo do master) | ✅ | audit-juridico-fase3.ts, grupo C (parser da Sala do Advogado) |
| PDF renderiza o documento completo (cláusula 1 → FORO), com hash e paginação | ✅ | audit-juridico-fase2.ts, grupo F (pdftotext) |

## Pendências jurídicas

**24 marcações `[VALIDAR COM ADVOGADO]` no corpo do master** — lista completa em
`DECISOES-PENDENTES.md` (seção A), gerenciável em **/juridico/sala-do-advogado** (que deriva a
lista do texto vivo — nunca desatualiza). Os 16 termos da biblioteca têm marcações próprias,
consolidadas na pasta `09_Pendencias_Juridicas` do Pacote para Advogado. Nenhuma decisão foi
tomada pelo sistema.

## O que muda quando o advogado aprovar

1. Importar o texto devolvido em Templates → Importar retorno (origem "Retorno do advogado") —
   a redação anterior é fotografada automaticamente (histórico imutável, migration 0046).
2. Regerar a matriz (`npx tsx scripts/gerar-matriz-variaveis.ts`) — se surgir variável nova sem
   origem, o script FALHA (proteção contra lacuna).
3. Registrar a revisão jurídica em Templates → Revisão jurídica.
4. Republicar o template → vira versão nova e selo OFICIAL; **contratos existentes permanecem
   congelados** na versão que assinaram (garantia estrutural, testada nas suítes SQL 62/63/64).

Fluxo completo passo a passo: `FLUXO-REVISAO-ADVOGADO.md`.
