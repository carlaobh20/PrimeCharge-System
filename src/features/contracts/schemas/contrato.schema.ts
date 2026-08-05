import { z } from 'zod';

const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());
const optionalNumber = () =>
  z.preprocess((val) => (val === '' || val === undefined || val === null ? undefined : Number(val)), z.number().optional());

export const contratoSchema = z.object({
  veiculo_id: z.string().min(1, 'Selecione um veículo'),
  motorista_id: z.string().min(1, 'Selecione um motorista'),
  data_inicio: z.string().min(1, 'Data de início obrigatória'),
  data_fim_prevista: optionalString(),
  periodicidade: z.enum(['diaria', 'semanal', 'mensal']),
  valor_periodico: z.preprocess((val) => Number(val), z.number().positive('Valor deve ser maior que zero')),
  valor_caucao: optionalNumber(),
  km_inicial: optionalNumber(),
  carga_inicial_pct: optionalNumber(),
  observacoes: optionalString(),
});

// z.transform faz input (o que o form escreve) e output (o que é enviado à API) divergirem de
// tipo — mesmo padrão de motorista.schema.ts/veiculo.schema.ts.
export type ContratoFormInput = z.input<typeof contratoSchema>;
export type ContratoFormValues = z.output<typeof contratoSchema>;
