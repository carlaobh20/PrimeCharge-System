# MINUTA MASTER — STATUS (Fase AN)

Auditoria técnica da minuta `contrato-master-minuta.md` em 2026-08-18. NÃO é revisão jurídica —
é a prova de que a mecânica do documento funciona.

## Verificações executadas (automatizadas — ver scripts/audit-juridico-*.ts)

| Verificação | Resultado | Onde é testado |
|---|---|---|
| Todas as 20 variáveis `{{...}}` têm origem mapeada no sistema | ✅ 20/20 | gerar-matriz-variaveis.ts (falha se surgir variável sem origem) |
| Snapshot completo cobre todas as variáveis (nenhum `{{...}}` sobra no documento final) | ✅ | audit-juridico-fase2.ts, grupo E |
| Variável crítica sem valor BLOQUEIA a geração | ✅ | audit-juridico-fase2.ts, grupo D |
| Variável opcional sem valor sai `[SEM VALOR: …]` visível (nunca lacuna silenciosa) | ✅ | audit-juridico-fase2.ts, grupo B |
| Extração do corpo (marcadores de início/fim) estável | ✅ | audit-juridico-fase2.ts, grupo C |
| As marcações `[VALIDAR COM ADVOGADO]` são todas detectadas (16 no corpo) | ✅ | audit-juridico-fase3.ts, grupo C |
| PDF renderiza o documento completo (cláusula 1 → FORO), com hash e paginação | ✅ | audit-juridico-fase2.ts, grupo F (pdftotext) |

## Pendências jurídicas

16 marcações `[VALIDAR COM ADVOGADO]` — lista completa em `DECISOES-PENDENTES.md` (seção A),
gerenciáveis em **/juridico/sala-do-advogado**. Nenhuma decisão foi tomada pelo sistema.

## O que muda quando o advogado aprovar

1. Reescrever as cláusulas com os textos aprovados (Sala do Advogado guarda cada um).
2. Regerar a matriz (`npx tsx scripts/gerar-matriz-variaveis.ts`) — se surgir variável nova sem
   origem, o script FALHA (proteção contra lacuna).
3. Republicar o template → vira versão nova; **contratos existentes permanecem congelados** na
   versão que assinaram (garantia estrutural, testada na suíte SQL 62/63).
4. Registrar a revisão jurídica em Templates → Revisão jurídica.
