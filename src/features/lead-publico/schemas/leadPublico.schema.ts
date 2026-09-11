import { z } from 'zod';

// Cadastro público do funil ("Quero alugar" / "Quero meu Carro Elétrico" na landing).
// Ficha de triagem completa (Carlos: "não podemos errar na contratação") — bem maior que o
// motoristaSchema interno (features/motoristas), porque aqui é a ÚNICA chance de coletar
// esse dado: não tem um staff editando o cadastro depois, é o próprio candidato preenchendo.
//
// Campos que vão para `motoristas` (schema/API já existente) ficam misturados com campos que
// só existem em `motoristas_triagem` (migration 0053) — a separação por tabela é escondida
// do formulário; api/leadPublico.ts é quem sabe qual campo vai para qual lugar.
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

export const APPS_MOTORISTA = ['Uber', '99', 'inDrive', 'Outro'] as const;

export const leadPublicoSchema = z.object({
  // honeypot: campo escondido via CSS na tela — humano nunca preenche, bot geralmente sim.
  // Sem validação aqui de propósito (ver CadastroLeadPage: checado dentro do onSubmit, não
  // pelo resolver — senão o zodResolver travaria o submit ANTES do bot cair na armadilha).
  website: z.string().optional(),

  // --- 01 Seus dados ---
  nome_completo: z.string().min(3, 'Informe seu nome completo').max(200),
  cpf,
  rg: optionalString(),
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  estado_civil: optionalString(),
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  telefone,

  // --- 02 Endereço ---
  cep: optionalString(),
  endereco: z.string().min(1, 'Endereço obrigatório'),
  numero: optionalString(),
  complemento: optionalString(),
  bairro: optionalString(),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  estado: z.string().min(2, 'UF obrigatória').max(2),

  // --- 03 CNH ---
  cnh_numero: z.string().min(1, 'Número da CNH obrigatório'),
  cnh_categoria: z.string().min(1, 'Categoria da CNH obrigatória'),
  cnh_validade: z.string().min(1, 'Validade da CNH obrigatória'),
  cnh_ear: optionalString(),

  // --- 04 Experiência como motorista de app ---
  ja_dirige_app: optionalString(),
  tempo_experiencia: optionalString(),
  apps_utilizados: z.array(z.enum(APPS_MOTORISTA)).default([]),
  km_semanal_estimado: optionalString(),
  possui_veiculo_proprio: optionalString(),
  disponibilidade_horas: optionalString(),

  // --- 05 Referências e contato de emergência ---
  referencia_nome: optionalString(),
  referencia_telefone: optionalString(),
  contato_emergencia_nome: optionalString(),
  contato_emergencia_telefone: optionalString(),

  // --- 06 Seu interesse ---
  quando_pretende_comecar: optionalString(),
  melhor_horario_contato: optionalString(),
  veiculoInteresse: optionalString(),
  observacoes: optionalString(),

  // --- consentimento ---
  aceitou_politica_privacidade: z.boolean().refine((v) => v === true, 'É necessário aceitar a Política de Privacidade'),
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
