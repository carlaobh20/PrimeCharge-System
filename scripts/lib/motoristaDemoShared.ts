// PrimeCharge OS — Fase 23 (Preparação do Banco + Simulação Real do App Motorista)
// Biblioteca PURA compartilhada pelos 3 scripts do Motorista Demo
// (seed-motorista-demo.ts / limpar-motorista-demo.ts / verificar-motorista-demo.ts).
//
// Regra de design deste arquivo: NADA aqui toca rede, filesystem fora do necessário para o
// manifesto, nem `process.env` diretamente (os scripts leem `process.env` e passam um objeto
// simples pra cá) — assim `scripts/audit-motorista-demo-scripts.ts` consegue testar 100% desta
// lógica sem nunca criar um client Supabase nem tocar a internet.
//
// NÃO IMPORTAR '@supabase/supabase-js' NESTE ARQUIVO. Se um dia precisar, é sinal de que a
// lógica de rede vazou pra cá — mova de volta pro script que a usa.

// ============================================================================================
// 1. IDENTIDADE DO DEMO — constantes, documentadas, nada inventado "por pessoa real"
// ============================================================================================

export const NOME_MOTORISTA_DEMO = 'Motorista Demo PrimeCharge';

// Tag de marcação usada em todo campo de texto livre (observacoes) que já existe nas tabelas
// motoristas/veiculos/contratos — ver seção "MARCAÇÃO DOS REGISTROS" no relatório da Fase 23.
// Não é um campo novo, não é uma coluna nova: é um PREFIXO de convenção num campo que já é de
// anotação livre por natureza (não altera semântica de nenhum campo jurídico/operacional).
export const TAG_DEMO = '[DEMO PRIMECHARGE]';

export function observacaoDemo(detalhe: string): string {
  return `${TAG_DEMO} ${detalhe} — registro técnico de teste, não é um cliente real. Criado pelo seed scripts/seed-motorista-demo.ts.`;
}

/**
 * E-mail do motorista demo. `ambiente` default 'demo' — como este projeto só tem UM banco
 * Supabase real (não existe staging separado, ver auditoria de infraestrutura da Fase 23),
 * o sufixo serve só pra permitir rodar o seed mais de uma vez com e-mails diferentes se um dia
 * for preciso (ex.: DEMO_AMBIENTE=demo2), nunca pra fingir que existe um segundo ambiente.
 */
export function emailMotoristaDemo(ambiente: string): string {
  return `motorista.demo.primecharge+${ambiente}@example.com`;
}

// ============================================================================================
// 2. CPF SINTÉTICO — algoritmo real de dígito verificador, base claramente fictícia
// ============================================================================================
// Achado da auditoria: a tabela `motoristas` (0004_modulo_motoristas.sql) NÃO tem CHECK de
// formato de CPF — só `cpf text not null` + unique(empresa_id, cpf). A única validação de CPF
// do sistema é no client (motorista.schema.ts: só length===11 depois de remover não-dígitos,
// SEM checagem de dígito verificador). Ou seja: tecnicamente qualquer string de 11 dígitos
// passaria no banco. Mesmo assim, geramos um CPF com dígito verificador matematicamente válido
// por segurança e para não quebrar nenhuma máscara/formatador de CPF que exista hoje ou venha a
// existir na tela de motoristas — a base de 9 dígitos é uma sequência fixa e sequencial
// ('999000001'), escolhida só para ocupar o formato; NÃO é derivada de data de nascimento,
// região fiscal ou qualquer heurística que a torne parecida com um documento real de alguém.

function calcularDigitoVerificadorCpf(digitos: number[]): number {
  let peso = digitos.length + 1;
  let soma = 0;
  for (const d of digitos) {
    soma += d * peso;
    peso -= 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

const BASE_CPF_DEMO = [9, 9, 9, 0, 0, 0, 0, 0, 1];

export function gerarCpfDemo(): string {
  const d1 = calcularDigitoVerificadorCpf(BASE_CPF_DEMO);
  const d2 = calcularDigitoVerificadorCpf([...BASE_CPF_DEMO, d1]);
  return [...BASE_CPF_DEMO, d1, d2].join('');
}

/** Reconfirma o dígito verificador de um CPF de 11 dígitos — usado só nos testes estáticos. */
export function cpfTemDigitosValidos(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  const digitos = cpf.split('').map(Number);
  const base = digitos.slice(0, 9);
  const d1Esperado = calcularDigitoVerificadorCpf(base);
  const d2Esperado = calcularDigitoVerificadorCpf([...base, d1Esperado]);
  return digitos[9] === d1Esperado && digitos[10] === d2Esperado;
}

// ============================================================================================
// 3. VEÍCULO DEMO — achado da auditoria: chassi/renavam/placa NÃO têm CHECK de formato no banco
// (grep em supabase/migrations/*.sql confirma: só `not null` + unique(empresa_id, <campo>)).
// Mesmo assim usamos formatos plausíveis (placa padrão antigo 3 letras + 4 dígitos, chassi de
// 17 caracteres) para não quebrar nenhuma máscara de exibição que a tela de Veículos já tenha
// ou venha a ter — só que com um prefixo "DEMO"/"DEM" que não corresponde a nenhum veículo real.
// ============================================================================================

export const PLACA_VEICULO_DEMO = 'DEM0001';
export const CHASSI_VEICULO_DEMO = 'DEMO0000000000001';
export const RENAVAM_VEICULO_DEMO = '00000000001';

// ============================================================================================
// 4. CONTRATO DEMO — valor do "aluguel" que a Meta (motorista_meta_config → despesa CARRO) vai
// importar. Auditoria dos constraints (0005_modulo_contratos.sql): valor_periodico numeric(10,2)
// not null, check (valor_periodico > 0); periodicidade é enum contrato_periodicidade
// ('diaria'|'semanal'|'mensal') — usamos 'mensal', que é o que a missão pediu ("aluguel
// mensal"). 1750.00 é um valor DEMO explícito, não é o aluguel de nenhum contrato real.
// ============================================================================================

export const VALOR_PERIODICO_DEMO = 1750.0;
export const PERIODICIDADE_CONTRATO_DEMO = 'mensal' as const;

// ============================================================================================
// 5. CONFIGURAÇÃO DA META DEMO — valores exatos pedidos na missão original (Parte 5).
// RESERVADO PRA UMA FASE FUTURA: esta rodada (Fase 23, preparação) só cria empresa→veiculo→
// motorista→contrato→convite→conta Auth (motorista_meta_config fica de propósito vazia — é
// isso que verificar-motorista-demo.ts confirma). Popular motorista_meta_config/despesas/
// ganhos/corridas é a Parte 6 da missão original, ainda não autorizada a executar.
// ============================================================================================

export const META_CONFIG_DEMO = {
  dias_trabalho: 26,
  renda_hora: 40,
  reserva_meta: 0,
} as const;

// ============================================================================================
// 6. FLAGS DE SEGURANÇA — parsing puro de env, sem tocar process.env diretamente
// ============================================================================================

export type EnvLike = Record<string, string | undefined>;

export interface DecisaoEscrita {
  podeEscrever: boolean;
  motivoBloqueio?: string;
}

/**
 * Regra do seed (criação): DRY_RUN=true é o padrão. Escrita só é liberada se, ao MESMO tempo,
 * DRY_RUN==='false' E DEMO_ALLOW_WRITE==='true' E DEMO_CONFIRM==='CREATE_PRIMECHARGE_DEMO'.
 * NODE_ENV nunca entra nessa decisão — não é lido aqui de propósito, para que não vire uma
 * autorização por acidente.
 */
export function avaliarPermissaoDeEscrita(env: EnvLike): DecisaoEscrita {
  const dryRun = (env.DRY_RUN ?? 'true').trim().toLowerCase() !== 'false';
  if (dryRun) {
    return { podeEscrever: false, motivoBloqueio: 'DRY_RUN não é "false" (padrão seguro — nenhuma escrita será feita).' };
  }
  if (env.DEMO_ALLOW_WRITE?.trim() !== 'true') {
    return { podeEscrever: false, motivoBloqueio: 'DEMO_ALLOW_WRITE precisa ser exatamente "true".' };
  }
  if (env.DEMO_CONFIRM?.trim() !== 'CREATE_PRIMECHARGE_DEMO') {
    return { podeEscrever: false, motivoBloqueio: 'DEMO_CONFIRM precisa ser exatamente "CREATE_PRIMECHARGE_DEMO".' };
  }
  return { podeEscrever: true };
}

/**
 * Regra da limpeza (delete): mesmo padrão, com flags e frase de confirmação PRÓPRIAS —
 * DEMO_ALLOW_WRITE/CREATE_PRIMECHARGE_DEMO nunca autorizam delete, e vice-versa, de propósito
 * (evita que alguém copie uma variável de ambiente de um contexto pro outro por engano).
 */
export function avaliarPermissaoDeExclusao(env: EnvLike): DecisaoEscrita {
  const dryRun = (env.DRY_RUN ?? 'true').trim().toLowerCase() !== 'false';
  if (dryRun) {
    return { podeEscrever: false, motivoBloqueio: 'DRY_RUN não é "false" (padrão seguro — nenhum delete será feito).' };
  }
  if (env.DEMO_ALLOW_DELETE?.trim() !== 'true') {
    return { podeEscrever: false, motivoBloqueio: 'DEMO_ALLOW_DELETE precisa ser exatamente "true".' };
  }
  if (env.DEMO_CONFIRM?.trim() !== 'DELETE_PRIMECHARGE_DEMO') {
    return { podeEscrever: false, motivoBloqueio: 'DEMO_CONFIRM precisa ser exatamente "DELETE_PRIMECHARGE_DEMO".' };
  }
  return { podeEscrever: true };
}

export interface DecisaoEmpresa {
  ok: boolean;
  empresaId?: string;
  motivoBloqueio?: string;
}

/** DEMO_EMPRESA_ID é sempre obrigatório e explícito — o script NUNCA escolhe uma empresa sozinho. */
export function lerEmpresaIdObrigatorio(env: EnvLike): DecisaoEmpresa {
  const valor = env.DEMO_EMPRESA_ID?.trim();
  if (!valor) {
    return { ok: false, motivoBloqueio: 'DEMO_EMPRESA_ID não foi informado. Rode o script em modo de listagem para ver as empresas elegíveis e defina DEMO_EMPRESA_ID=<id> explicitamente.' };
  }
  return { ok: true, empresaId: valor };
}

export interface DecisaoCredenciais {
  ok: boolean;
  url?: string;
  serviceRoleKey?: string;
  motivoBloqueio?: string;
}

/**
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (NUNCA prefixo VITE_ — isso vazaria pro bundle do
 * client). Exigidos sempre que o script for tocar o banco de alguma forma, inclusive em
 * DRY_RUN (o dry-run faz leituras reais de validação — só não escreve nada).
 */
export function lerCredenciaisObrigatorias(env: EnvLike): DecisaoCredenciais {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      motivoBloqueio: 'SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não estão definidas no ambiente. Defina as duas (nunca com prefixo VITE_, nunca commitadas) antes de rodar este script.',
    };
  }
  return { ok: true, url, serviceRoleKey: key };
}

// ============================================================================================
// 7. MANIFESTO — shape + validação. NUNCA deve conter segredo.
// ============================================================================================

export interface ManifestoMotoristaDemo {
  criado_em: string;
  ambiente: string;
  empresa_id: string;
  motorista_id: string;
  veiculo_id: string;
  contrato_id: string;
  convite_id: string;
  auth_user_id: string;
  email: string;
}

const CHAVES_MANIFESTO_ESPERADAS = [
  'criado_em',
  'ambiente',
  'empresa_id',
  'motorista_id',
  'veiculo_id',
  'contrato_id',
  'convite_id',
  'auth_user_id',
  'email',
] as const;

// Qualquer uma destas chaves aparecendo no manifesto é tratado como violação grave — o
// manifesto é só identificação técnica, nunca segredo. Ver testes em
// audit-motorista-demo-scripts.ts.
const CHAVES_PROIBIDAS_NO_MANIFESTO = [
  'senha',
  'password',
  'access_token',
  'refresh_token',
  'service_role',
  'service_role_key',
  'token',
  'jwt',
  'api_key',
];

export interface ValidacaoManifesto {
  valido: boolean;
  erros: string[];
}

export function validarFormatoManifesto(obj: unknown): ValidacaoManifesto {
  const erros: string[] = [];
  if (typeof obj !== 'object' || obj === null) {
    return { valido: false, erros: ['manifesto não é um objeto'] };
  }
  const registro = obj as Record<string, unknown>;

  for (const chave of CHAVES_MANIFESTO_ESPERADAS) {
    if (typeof registro[chave] !== 'string' || registro[chave] === '') {
      erros.push(`campo obrigatório ausente ou vazio: ${chave}`);
    }
  }

  for (const chaveEncontrada of Object.keys(registro)) {
    const normalizada = chaveEncontrada.toLowerCase();
    if (CHAVES_PROIBIDAS_NO_MANIFESTO.some((proibida) => normalizada.includes(proibida))) {
      erros.push(`chave proibida encontrada no manifesto (parece segredo): ${chaveEncontrada}`);
    }
  }

  return { valido: erros.length === 0, erros };
}

export const CAMINHO_MANIFESTO = '.tmp/motorista-demo-manifest.json';

// ============================================================================================
// 8. VALIDAÇÃO CRUZADA PRÉ-DELETE — pura, recebe os dados já lidos (o script faz a leitura;
// esta função só decide se bate ou não). Nenhuma "correção automática": só ok/não-ok + motivo.
// ============================================================================================

export interface DadosParaValidarExclusao {
  manifesto: ManifestoMotoristaDemo;
  motorista: { id: string; nome_completo: string; empresa_id: string } | null;
  usuario: { id: string; role: string; motorista_id: string | null; empresa_id: string } | null;
  veiculo: { id: string; placa: string; chassi: string; renavam: string } | null;
  contrato: { id: string; motorista_id: string; veiculo_id: string } | null;
  convite: { id: string; motorista_id: string | null } | null;
}

export interface ValidacaoExclusao {
  podeExcluir: boolean;
  motivos: string[];
}

export function validarConsistenciaAntesDeExcluir(dados: DadosParaValidarExclusao): ValidacaoExclusao {
  const motivos: string[] = [];
  const { manifesto, motorista, usuario, veiculo, contrato, convite } = dados;

  if (!motorista) {
    motivos.push('motorista do manifesto não foi encontrado no banco (id inexistente)');
  } else {
    if (motorista.id !== manifesto.motorista_id) motivos.push('motorista.id não bate com o manifesto');
    if (motorista.nome_completo !== NOME_MOTORISTA_DEMO) motivos.push(`motorista.nome_completo inesperado: "${motorista.nome_completo}" (esperado "${NOME_MOTORISTA_DEMO}")`);
    if (motorista.empresa_id !== manifesto.empresa_id) motivos.push('motorista.empresa_id não bate com o manifesto');
  }

  if (!usuario) {
    motivos.push('usuario do manifesto não foi encontrado no banco (auth_user_id inexistente)');
  } else {
    if (usuario.role !== 'motorista') motivos.push(`usuario.role inesperado: "${usuario.role}" (esperado "motorista")`);
    if (usuario.motorista_id !== manifesto.motorista_id) motivos.push('usuario.motorista_id não bate com o manifesto');
    if (usuario.empresa_id !== manifesto.empresa_id) motivos.push('usuario.empresa_id não bate com o manifesto');
  }

  if (!veiculo) {
    motivos.push('veiculo do manifesto não foi encontrado no banco (id inexistente)');
  } else {
    if (veiculo.placa !== PLACA_VEICULO_DEMO) motivos.push(`veiculo.placa inesperada: "${veiculo.placa}" (esperado "${PLACA_VEICULO_DEMO}")`);
    if (veiculo.chassi !== CHASSI_VEICULO_DEMO) motivos.push('veiculo.chassi inesperado');
    if (veiculo.renavam !== RENAVAM_VEICULO_DEMO) motivos.push('veiculo.renavam inesperado');
  }

  if (!contrato) {
    motivos.push('contrato do manifesto não foi encontrado no banco (id inexistente)');
  } else {
    if (contrato.motorista_id !== manifesto.motorista_id) motivos.push('contrato.motorista_id não bate com o manifesto');
    if (contrato.veiculo_id !== manifesto.veiculo_id) motivos.push('contrato.veiculo_id não bate com o manifesto');
  }

  if (!convite) {
    motivos.push('convite do manifesto não foi encontrado no banco (id inexistente) — pode já ter sido removido em cascata; não é bloqueante sozinho, mas é reportado');
  } else if (convite.motorista_id !== manifesto.motorista_id) {
    motivos.push('convite.motorista_id não bate com o manifesto');
  }

  // Só bloqueia por causa de motorista/usuario/veiculo/contrato — convite ausente sozinho não
  // impede a exclusão (ele pode já ter sido apagado em cascata por uma tentativa anterior).
  const motivosBloqueantes = motivos.filter((m) => !m.startsWith('convite do manifesto não foi encontrado'));

  return { podeExcluir: motivosBloqueantes.length === 0, motivos };
}
