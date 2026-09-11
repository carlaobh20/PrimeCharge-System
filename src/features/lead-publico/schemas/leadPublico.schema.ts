import { z } from 'zod';

// Cadastro público do funil ("Quero alugar" / "Quero meu Carro Elétrico" na landing). Mesmo
// formato de CPF de motoristaSchema (features/motoristas), mas aqui vários campos que na tela
// interna do staff são opcionais viram obrigatórios — é a única chance de coletar esse dado
// antes do lead sumir, não tem um staff editando depois na hora.
//
// Documentos ficam FORA deste schema (File não passa por JSON/RPC) — validados à parte em
// CadastroLeadPage, mas com as mesmas regras de tamanho/tipo de motorista-app/api/uploads.ts
// (8 MB, jpeg/png/webp/pdf) para o staff nunca receber um arquivo que o app do motorista
// rejeitaria.
const optionalString = () => z.preprocess((val) => (val === '' ? undefined : val), z.string().optional());

const cpf = z
  .string()
  .min(1, 'CPF obrigatório')
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 11, 'CPF deve ter 11 dígitos');

const telefone = z
  .string()
  .min(1, 'Telefone obrigatório')
  .refine((v) => v.replace(/\D/g, '').length >= 10, 'Telefone inválido');

export const leadPublicoSchema = z.object({
  // honeypot: campo escondido via CSS na tela — humano nunca preenche, bot geralmente sim.
  // Sem validação de tamanho de propósito: se validasse aqui, o zodResolver bloquearia o
  // submit ANTES do onSubmit rodar, e o bot veria um formulário travado (sinal de que foi
  // pego). Deixando passar a validação e checando dentro do onSubmit, o bot recebe a mesma
  // tela de "sucesso" que um humano — só que nada é de fato salvo.
  website: z.string().optional(),

  nome_completo: z.string().min(3, 'Informe seu nome completo').max(200),
  cpf,
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  telefone,
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),

  cnh_numero: z.string().min(1, 'Número da CNH obrigatório'),
  cnh_categoria: z.string().min(1, 'Categoria da CNH obrigatória'),
  cnh_validade: z.string().min(1, 'Validade da CNH obrigatória'),

  endereco: z.string().min(1, 'Endereço obrigatório'),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  estado: z.string().min(2, 'UF obrigatória').max(2),

  veiculoInteresse: optionalString(),
  observacoes: optionalString(),
});

export type LeadPublicoFormInput = z.input<typeof leadPublicoSchema>;
export type LeadPublicoFormValues = z.output<typeof leadPublicoSchema>;

// Documentos exigidos no upload — mesmas categorias já usadas em
// motorista-app/pages/MeusDocumentosPage.tsx (CATEGORIAS), pra ficar idêntico ao que o staff
// já vê quando revisa documento de motorista ativo.
export const DOCUMENTOS_OBRIGATORIOS = [
  { categoria: 'CNH', label: 'CNH (frente e verso, uma foto ou PDF)' },
  { categoria: 'Comprovante de residência', label: 'Comprovante de residência (até 3 meses)' },
] as const;

export const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB — mesmo limite de motorista-app/api/uploads.ts
export const MIME_DOC_OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
