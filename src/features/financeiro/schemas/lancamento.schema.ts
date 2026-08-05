import { z } from 'zod';

const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());

export const lancamentoSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.preprocess((val) => Number(val), z.number().positive('Valor deve ser maior que zero')),
  categoria: optionalString(),
  centro_custo_id: optionalString(),
  contrato_id: optionalString(),
  veiculo_id: optionalString(),
  motorista_id: optionalString(),
  data_prevista: z.string().min(1, 'Data prevista obrigatória'),
  observacoes: optionalString(),
});

export type LancamentoFormInput = z.input<typeof lancamentoSchema>;
export type LancamentoFormValues = z.output<typeof lancamentoSchema>;
