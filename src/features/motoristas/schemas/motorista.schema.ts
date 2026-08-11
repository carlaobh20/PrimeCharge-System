import { z } from 'zod';

const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());

export const motoristaSchema = z.object({
  nome_completo: z.string().min(1, 'Nome obrigatório').max(200),
  cpf: z
    .string()
    .min(1, 'CPF obrigatório')
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 11, 'CPF deve ter 11 dígitos'),
  email: z.preprocess((val) => (val === '' ? undefined : val), z.string().email('E-mail inválido').optional()),
  telefone: optionalString(),
  data_nascimento: optionalString(),
  cnh_numero: optionalString(),
  cnh_categoria: optionalString(),
  cnh_validade: optionalString(),
  status: z.enum(['lead', 'em_analise', 'ativo', 'inativo', 'bloqueado', 'encerrado']),
  endereco: optionalString(),
  cidade: optionalString(),
  estado: optionalString(),
  observacoes: optionalString(),
  origem_lead: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.enum(['indicacao', 'rede_social', 'propaganda', 'busca_organica', 'evento', 'outro']).optional()
  ),
  origem_lead_detalhe: optionalString(),
});

// z.transform faz input (o que o form escreve) e output (o que é enviado à API) divergirem
// de tipo — useForm precisa do Input, o onSubmit final recebe o Output (mesmo padrão de
// veiculo.schema.ts).
export type MotoristaFormInput = z.input<typeof motoristaSchema>;
export type MotoristaFormValues = z.output<typeof motoristaSchema>;
