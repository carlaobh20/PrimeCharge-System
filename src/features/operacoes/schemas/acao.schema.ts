import { z } from 'zod';

const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());

export const acaoSchema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  descricao: optionalString(),
  tipo: z.string().min(1).default('manual'),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
  prazo: optionalString(),
});

export type AcaoFormInput = z.input<typeof acaoSchema>;
export type AcaoFormValues = z.output<typeof acaoSchema>;
