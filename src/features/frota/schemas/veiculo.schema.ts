import { z } from 'zod';

const optionalNumber = () =>
  z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number().min(0).optional()
  );

const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());

export const veiculoSchema = z.object({
  marca_id: z.string().min(1, 'Selecione a marca'),
  modelo_id: z.string().min(1, 'Selecione o modelo'),
  ano_fabricacao: z.coerce.number().int('Ano inválido').min(1990).max(2100),
  ano_modelo: z.coerce.number().int('Ano inválido').min(1990).max(2100),
  chassi: z.string().min(1, 'Chassi obrigatório').max(17, 'Chassi tem no máximo 17 caracteres'),
  renavam: z.string().min(1, 'RENAVAM obrigatório').max(20),
  placa: z.string().min(1, 'Placa obrigatória').max(10),
  cor: optionalString(),
  categoria: z.enum(['hatch', 'sedan', 'suv', 'pickup', 'van', 'moto', 'onibus', 'caminhao', 'outro']),
  tipo_aquisicao: z.enum(['compra_direta', 'financiamento', 'consorcio', 'leasing', 'outro']),
  status: z.enum([
    'novo',
    'comprado',
    'preparacao',
    'disponivel',
    'reservado',
    'alugado',
    'devolvido',
    'manutencao',
    'venda',
    'encerrado',
  ]),
  quilometragem: z.coerce.number().int().min(0).default(0),
  autonomia_km: optionalNumber(),
  capacidade_bateria_kwh: optionalNumber(),
  data_compra: optionalString(),
  valor_compra: optionalNumber(),
  valor_fipe: optionalNumber(),
  valor_mercado: optionalNumber(),
  valor_residual_estimado: optionalNumber(),
  observacoes: optionalString(),
  // Épico 4, Parte 1 (Aquisição) — 2026-08-10.
  fornecedor: optionalString(),
  banco: optionalString(),
  valor_entrada: optionalNumber(),
  valor_financiado: optionalNumber(),
  taxa_juros_am_pct: optionalNumber(),
  prazo_financiamento_meses: optionalNumber(),
  sistema_amortizacao: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.enum(['price', 'sac']).optional()
  ),
  primeiro_vencimento_financiamento: optionalString(),
});

// z.coerce/preprocess faz input (o que o form escreve) e output (o que é enviado à API)
// divergirem de tipo — useForm precisa do Input, o onSubmit final recebe o Output.
export type VeiculoFormInput = z.input<typeof veiculoSchema>;
export type VeiculoFormValues = z.output<typeof veiculoSchema>;
