// SCORE DE RISCO CONTRATUAL (regra 3 da Fase 3) — engine TRANSPARENTE e puramente operacional.
//
// O que isto É: um somatório de pendências OBJETIVAS (documento faltando, CNH vencida, seguro
// ausente...), cada uma com peso declarado, com a lista completa de motivos exposta na UI
// ("Por que este contrato está neste nível?").
// O que isto NÃO É: avaliação jurídica. O sistema NUNCA diz "este contrato é juridicamente
// seguro" — risco BAIXO significa só "sem pendência operacional conhecida".

export type NivelRisco = 'baixo' | 'moderado' | 'alto' | 'critico';

export type MotivoRisco = {
  chave: string;
  rotulo: string;
  peso: number;
  detalhe?: string;
};

export type RiscoContratual = {
  nivel: NivelRisco;
  pontos: number;
  motivos: MotivoRisco[];
  /** limiar declarado, pra UI explicar a régua inteira */
  regua: { moderado: number; alto: number; critico: number };
};

export const NIVEL_RISCO_LABEL: Record<NivelRisco, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
};

// Régua fixa e declarada (não é fórmula jurídica; é priorização de fila de trabalho).
const REGUA = { moderado: 1, alto: 4, critico: 8 };

/** Insumos 100% objetivos — quem chama computa os fatos; a engine só pesa e explica. */
export type InsumosRisco = {
  semVersaoDocumento: boolean;
  cnhVencida: boolean;
  cnhSemValidade: boolean;
  documentoMotoristaFaltante: boolean;
  seguroAusente: boolean;
  seguroVencido: boolean;
  seguroVencendo30d: boolean;
  apoliceNaoAnexada: boolean;
  assinaturaPendente: boolean;
  assinaturaRecusada: boolean;
  assinaturaExpirando: boolean;
  camposObrigatoriosFaltantes: number; // contagem
  aditivoPendente: boolean;
  contratoVencendo30d: boolean;
  contratoVencido: boolean;
  templateSemRevisaoJuridica: boolean;
  rescisaoEmAndamento: boolean;
  inconsistenciaCadastral: boolean; // ex.: veículo "alugado" sem contrato ativo
};

const PESOS: { chave: keyof InsumosRisco; rotulo: string; peso: number }[] = [
  { chave: 'contratoVencido', rotulo: 'Contrato vencido', peso: 4 },
  { chave: 'cnhVencida', rotulo: 'CNH do motorista vencida', peso: 4 },
  { chave: 'seguroVencido', rotulo: 'Seguro vencido', peso: 4 },
  { chave: 'assinaturaRecusada', rotulo: 'Assinatura recusada', peso: 4 },
  { chave: 'semVersaoDocumento', rotulo: 'Contrato sem documento gerado', peso: 3 },
  { chave: 'seguroAusente', rotulo: 'Seguro não cadastrado', peso: 3 },
  { chave: 'assinaturaExpirando', rotulo: 'Prazo de assinatura expirando', peso: 3 },
  { chave: 'rescisaoEmAndamento', rotulo: 'Rescisão em andamento', peso: 3 },
  { chave: 'documentoMotoristaFaltante', rotulo: 'Documento do motorista faltante/não aprovado', peso: 2 },
  { chave: 'apoliceNaoAnexada', rotulo: 'Apólice não anexada', peso: 2 },
  { chave: 'seguroVencendo30d', rotulo: 'Seguro vence em até 30 dias', peso: 2 },
  { chave: 'assinaturaPendente', rotulo: 'Assinatura pendente', peso: 2 },
  { chave: 'templateSemRevisaoJuridica', rotulo: 'Modelo sem revisão jurídica aprovada', peso: 2 },
  { chave: 'inconsistenciaCadastral', rotulo: 'Inconsistência cadastral', peso: 2 },
  { chave: 'cnhSemValidade', rotulo: 'CNH sem data de validade no cadastro', peso: 1 },
  { chave: 'aditivoPendente', rotulo: 'Aditivo em rascunho', peso: 1 },
  { chave: 'contratoVencendo30d', rotulo: 'Contrato vence em até 30 dias', peso: 1 },
];

const PESO_CAMPO_FALTANTE = 2;
const TETO_CAMPOS_FALTANTES = 6; // 3+ campos faltando já é grave; teto evita distorção

export function calcularRiscoContratual(insumos: InsumosRisco, detalhes?: Partial<Record<keyof InsumosRisco, string>>): RiscoContratual {
  const motivos: MotivoRisco[] = [];
  for (const { chave, rotulo, peso } of PESOS) {
    if (insumos[chave] === true) motivos.push({ chave, rotulo, peso, detalhe: detalhes?.[chave] });
  }
  if (insumos.camposObrigatoriosFaltantes > 0) {
    const pontos = Math.min(insumos.camposObrigatoriosFaltantes * PESO_CAMPO_FALTANTE, TETO_CAMPOS_FALTANTES);
    motivos.push({
      chave: 'camposObrigatoriosFaltantes',
      rotulo: `${insumos.camposObrigatoriosFaltantes} campo(s) obrigatório(s) faltante(s)`,
      peso: pontos,
      detalhe: detalhes?.camposObrigatoriosFaltantes,
    });
  }
  motivos.sort((a, b) => b.peso - a.peso);
  const pontos = motivos.reduce((s, m) => s + m.peso, 0);
  const nivel: NivelRisco =
    pontos >= REGUA.critico ? 'critico' : pontos >= REGUA.alto ? 'alto' : pontos >= REGUA.moderado ? 'moderado' : 'baixo';
  return { nivel, pontos, motivos, regua: REGUA };
}
