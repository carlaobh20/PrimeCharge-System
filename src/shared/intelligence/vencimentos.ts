import { diasAte } from '@/shared/lib/format';

export type VencimentoItem = {
  label: string;
  data: string;
  entidadeTipo: string;
  entidadeId: string;
  dias: number;
};

export type FonteVencimento = { label: string; data: string | null; entidadeTipo: string; entidadeId: string };

// Agregador cross-entidade de vencimentos (DEC-060) — não conhece nada de Veículo/Motorista/
// Contrato, só sabe ler `{label, data, entidadeTipo, entidadeId}` e ordenar por dias-até-
// vencer. Mesmo raciocínio de calcularSaudeFinanceira (DEC-047/048): mora em shared/
// porque é domínio-agnóstico. Quem monta a lista de fontes (CNH de motoristas, fim de
// contratos, e futuramente arquivos.data_validade — DEC-060) é o consumidor.
export function ordenarPorVencimento(fontes: FonteVencimento[]): VencimentoItem[] {
  return fontes
    .map((f) => ({ ...f, dias: diasAte(f.data) }))
    .filter((f): f is FonteVencimento & { dias: number } => f.dias !== null)
    .map((f) => ({ label: f.label, data: f.data as string, entidadeTipo: f.entidadeTipo, entidadeId: f.entidadeId, dias: f.dias }))
    .sort((a, b) => a.dias - b.dias);
}
