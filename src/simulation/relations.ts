// Missão 7 — Modo Simulação: mapa de relações embutidas por tabela.
//
// Espelha, tabela por tabela, os `SELECT_COM_RELACOES` reais encontrados em cada
// `features/*/api/*.ts` (auditado à mão nesta missão — 16 arquivos de API, nenhum usa
// embed fora deste conjunto). Não precisamos de um parser genérico de `select("a:b(*)")`:
// cada tabela só é consultada com embed "tudo ou nada" (ou pede as relações configuradas
// aqui, ou não pede nenhuma) — o fakePostgrest só verifica se a string de select contém "("
// e, se sim, anexa todas as relações da tabela.

export type RelationConfig =
  | { alias: string; table: string; type: 'belongsTo'; localKey: string }
  | { alias: string; table: string; type: 'hasMany'; foreignKey: string };

export const RELATIONS: Record<string, RelationConfig[]> = {
  veiculos: [
    { alias: 'marca', table: 'marcas', type: 'belongsTo', localKey: 'marca_id' },
    { alias: 'modelo', table: 'modelos', type: 'belongsTo', localKey: 'modelo_id' },
  ],
  contratos: [
    { alias: 'veiculo', table: 'veiculos', type: 'belongsTo', localKey: 'veiculo_id' },
    { alias: 'motorista', table: 'motoristas', type: 'belongsTo', localKey: 'motorista_id' },
  ],
  acoes_operacionais: [{ alias: 'responsavel', table: 'usuarios', type: 'belongsTo', localKey: 'responsavel_id' }],
  multas: [
    { alias: 'veiculo', table: 'veiculos', type: 'belongsTo', localKey: 'veiculo_id' },
    { alias: 'motorista', table: 'motoristas', type: 'belongsTo', localKey: 'motorista_id' },
  ],
  lancamentos: [
    { alias: 'centro_custo', table: 'centros_custo', type: 'belongsTo', localKey: 'centro_custo_id' },
    { alias: 'contrato', table: 'contratos', type: 'belongsTo', localKey: 'contrato_id' },
    { alias: 'veiculo', table: 'veiculos', type: 'belongsTo', localKey: 'veiculo_id' },
    { alias: 'motorista', table: 'motoristas', type: 'belongsTo', localKey: 'motorista_id' },
  ],
  pagamentos: [
    { alias: 'lancamento', table: 'lancamentos', type: 'belongsTo', localKey: 'lancamento_id' },
    { alias: 'conta_bancaria', table: 'contas_bancarias', type: 'belongsTo', localKey: 'conta_bancaria_id' },
  ],
  checklists: [{ alias: 'itens', table: 'checklist_itens', type: 'hasMany', foreignKey: 'checklist_id' }],
};
