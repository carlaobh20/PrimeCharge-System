import { z } from 'zod';

const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());

export const contaBancariaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  banco: optionalString(),
  agencia: optionalString(),
  conta: optionalString(),
  tipo: z.enum(['corrente', 'poupanca', 'investimento']),
  saldo_inicial: z.preprocess((val) => (val === '' || val === undefined ? 0 : Number(val)), z.number()),
  ativa: z.boolean().default(true),
});

export type ContaBancariaFormInput = z.input<typeof contaBancariaSchema>;
export type ContaBancariaFormValues = z.output<typeof contaBancariaSchema>;

export const centroCustoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  descricao: optionalString(),
  ativo: z.boolean().default(true),
});

export type CentroCustoFormInput = z.input<typeof centroCustoSchema>;
export type CentroCustoFormValues = z.output<typeof centroCustoSchema>;
