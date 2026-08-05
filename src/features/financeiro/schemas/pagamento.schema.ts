import { z } from 'zod';

export const pagamentoSchema = z.object({
  lancamento_id: z.string().min(1, 'Selecione um lançamento'),
  conta_bancaria_id: z.string().min(1, 'Selecione uma conta'),
  valor: z.preprocess((val) => Number(val), z.number().positive('Valor deve ser maior que zero')),
  forma_pagamento: z.enum(['pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro']).optional(),
  data_prevista: z.string().min(1, 'Data prevista obrigatória'),
  observacoes: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
});

export type PagamentoFormInput = z.input<typeof pagamentoSchema>;
export type PagamentoFormValues = z.output<typeof pagamentoSchema>;
