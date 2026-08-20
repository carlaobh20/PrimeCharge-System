// CHECKLIST PRÉ-CONTRATO (regra 4) — visão agrupada (Motorista/Veículo/Comercial/Jurídico) com
// obrigatoriedade PARAMETRIZÁVEL pela Política Contratual (regra 5).
//
// Fonte de verdade única: os itens que também existem na validação do wizard REUSAM
// validarParaGeracao (fase 2) — este módulo não reimplementa aquelas regras; ele agrupa o
// resultado e ACRESCENTA os itens novos da fase 3 (vistoria, seguro, template aprovado, anexos).
// Só BLOQUEIA o que estiver marcado como obrigatório (base + política).
import {
  validarParaGeracao,
  type CondicoesContrato,
  type MotoristaParaContrato,
  type VeiculoParaContrato,
} from './validacao';

export type GrupoChecklist = 'motorista' | 'veiculo' | 'comercial' | 'juridico';

export type ItemChecklist = {
  grupo: GrupoChecklist;
  chave: string;
  rotulo: string;
  ok: boolean;
  obrigatorio: boolean;
  detalhe?: string;
};

export type ResultadoChecklist = {
  itens: ItemChecklist[];
  porGrupo: Record<GrupoChecklist, ItemChecklist[]>;
  bloqueios: ItemChecklist[]; // obrigatório && !ok
  podeGerar: boolean;
};

export const GRUPO_CHECKLIST_LABEL: Record<GrupoChecklist, string> = {
  motorista: 'Motorista',
  veiculo: 'Veículo',
  comercial: 'Comercial',
  juridico: 'Jurídico',
};

// Obrigatoriedade BASE (o mínimo sem o qual não existe contrato). O resto vem da política.
const OBRIGATORIOS_BASE = new Set([
  'motorista.cpf',
  'motorista.cnh',
  'motorista.status',
  'veiculo.placa',
  'veiculo.disponibilidade',
  'comercial.valor',
  'comercial.data_inicio',
  'juridico.template',
  'juridico.variaveis',
]);

export type InsumosFase3 = {
  /** vistoria de ENTREGA registrada pro veículo (checklists tipo entrega) */
  vistoriaEntregaOk: boolean | null; // null = sem informação (não bloqueia por base)
  seguroCadastrado: boolean;
  seguroVigente: boolean | null;
  apoliceAnexada: boolean;
  templateComRevisaoAprovada: boolean;
  contatoMotoristaOk: boolean;
  documentacaoMotoristaOk: boolean | null;
  anexosObrigatoriosFaltantes: string[]; // da política
};

export function montarChecklistPreContrato(params: {
  motorista: MotoristaParaContrato | null;
  veiculo: VeiculoParaContrato | null;
  condicoes: CondicoesContrato | null;
  templateCorpo: string | null;
  snapshot: Record<string, unknown> | null;
  veiculoTemContratoAtivo?: boolean;
  fase3: InsumosFase3;
  /** chaves extras marcadas como obrigatórias pela política (ex.: 'juridico.seguro') */
  obrigatoriosDaPolitica?: string[];
  hoje?: string;
}): ResultadoChecklist {
  const extras = new Set(params.obrigatoriosDaPolitica ?? []);
  const obrigatorio = (chave: string) => OBRIGATORIOS_BASE.has(chave) || extras.has(chave);
  const itens: ItemChecklist[] = [];

  // ---- Reuso da validação da fase 2 (fonte única das regras que já existiam) ----
  const v = validarParaGeracao({
    motorista: params.motorista,
    veiculo: params.veiculo,
    condicoes: params.condicoes,
    templateCorpo: params.templateCorpo,
    snapshot: params.snapshot,
    veiculoTemContratoAtivo: params.veiculoTemContratoAtivo,
    documentosMotoristaAprovados: params.fase3.documentacaoMotoristaOk ?? undefined,
    hoje: params.hoje,
  });
  const item = (rotuloValidacao: string): { ok: boolean; detalhe?: string } => {
    const bloqueio = v.itens.find((i) => i.rotulo === rotuloValidacao && i.nivel === 'bloqueio');
    if (bloqueio) return { ok: false, detalhe: bloqueio.detalhe };
    const alerta = v.itens.find((i) => i.rotulo === rotuloValidacao && i.nivel === 'alerta');
    if (alerta) return { ok: false, detalhe: alerta.detalhe };
    return { ok: true };
  };

  const mot = params.motorista;
  itens.push(
    { grupo: 'motorista', chave: 'motorista.cpf', rotulo: 'CPF', obrigatorio: obrigatorio('motorista.cpf'), ...item('CPF') },
    { grupo: 'motorista', chave: 'motorista.cnh', rotulo: 'CNH válida', obrigatorio: obrigatorio('motorista.cnh'), ...item('CNH') },
    { grupo: 'motorista', chave: 'motorista.status', rotulo: 'Motorista ativo', obrigatorio: obrigatorio('motorista.status'), ok: mot?.status === 'ativo', detalhe: mot && mot.status !== 'ativo' ? `status "${mot.status}"` : undefined },
    { grupo: 'motorista', chave: 'motorista.endereco', rotulo: 'Endereço', obrigatorio: obrigatorio('motorista.endereco'), ok: !!mot?.endereco },
    { grupo: 'motorista', chave: 'motorista.contato', rotulo: 'Contato', obrigatorio: obrigatorio('motorista.contato'), ok: params.fase3.contatoMotoristaOk },
    { grupo: 'motorista', chave: 'motorista.documentacao', rotulo: 'Documentação aprovada', obrigatorio: obrigatorio('motorista.documentacao'), ok: params.fase3.documentacaoMotoristaOk === true, detalhe: params.fase3.documentacaoMotoristaOk === null ? 'sem informação' : undefined },
  );

  const vei = params.veiculo;
  itens.push(
    { grupo: 'veiculo', chave: 'veiculo.placa', rotulo: 'Placa', obrigatorio: obrigatorio('veiculo.placa'), ok: !!vei?.placa },
    { grupo: 'veiculo', chave: 'veiculo.renavam', rotulo: 'RENAVAM', obrigatorio: obrigatorio('veiculo.renavam'), ok: !!vei?.renavam },
    { grupo: 'veiculo', chave: 'veiculo.chassi', rotulo: 'Chassi', obrigatorio: obrigatorio('veiculo.chassi'), ok: !!vei?.chassi },
    { grupo: 'veiculo', chave: 'veiculo.disponibilidade', rotulo: 'Disponível (sem contrato ativo)', obrigatorio: obrigatorio('veiculo.disponibilidade'), ...item('Disponibilidade'), ok: !params.veiculoTemContratoAtivo && !!vei },
    { grupo: 'veiculo', chave: 'veiculo.vistoria', rotulo: 'Vistoria de entrega', obrigatorio: obrigatorio('veiculo.vistoria'), ok: params.fase3.vistoriaEntregaOk === true, detalhe: params.fase3.vistoriaEntregaOk === null ? 'sem informação' : undefined },
    { grupo: 'veiculo', chave: 'veiculo.seguro', rotulo: 'Seguro cadastrado e vigente', obrigatorio: obrigatorio('veiculo.seguro'), ok: params.fase3.seguroCadastrado && params.fase3.seguroVigente === true, detalhe: !params.fase3.seguroCadastrado ? 'seguro não cadastrado' : params.fase3.seguroVigente === false ? 'seguro vencido' : params.fase3.seguroVigente === null ? 'vigência não informada' : undefined },
  );

  const cond = params.condicoes;
  itens.push(
    { grupo: 'comercial', chave: 'comercial.valor', rotulo: 'Valor', obrigatorio: obrigatorio('comercial.valor'), ok: !!cond && cond.valor_periodico > 0 },
    { grupo: 'comercial', chave: 'comercial.periodicidade', rotulo: 'Periodicidade', obrigatorio: obrigatorio('comercial.periodicidade'), ok: !!cond?.periodicidade },
    { grupo: 'comercial', chave: 'comercial.caucao', rotulo: 'Caução definida', obrigatorio: obrigatorio('comercial.caucao'), ok: cond?.valor_caucao != null && cond.valor_caucao > 0 },
    { grupo: 'comercial', chave: 'comercial.data_inicio', rotulo: 'Data de início', obrigatorio: obrigatorio('comercial.data_inicio'), ok: !!cond?.data_inicio },
    { grupo: 'comercial', chave: 'comercial.prazo', rotulo: 'Prazo/término', obrigatorio: obrigatorio('comercial.prazo'), ...item('Prazo'), ok: !cond?.data_fim_prevista || !cond?.data_inicio ? !!cond?.data_fim_prevista : cond.data_fim_prevista > cond.data_inicio },
    { grupo: 'comercial', chave: 'comercial.vencimento', rotulo: 'Dia de vencimento', obrigatorio: obrigatorio('comercial.vencimento'), ok: cond?.dia_vencimento != null },
    { grupo: 'comercial', chave: 'comercial.km', rotulo: 'Regra de quilometragem', obrigatorio: obrigatorio('comercial.km'), ok: !!cond?.km_incluso },
  );

  itens.push(
    { grupo: 'juridico', chave: 'juridico.template', rotulo: 'Template selecionado', obrigatorio: obrigatorio('juridico.template'), ok: !!params.templateCorpo },
    { grupo: 'juridico', chave: 'juridico.template_aprovado', rotulo: 'Template com revisão jurídica aprovada', obrigatorio: obrigatorio('juridico.template_aprovado'), ok: params.fase3.templateComRevisaoAprovada, detalhe: params.fase3.templateComRevisaoAprovada ? undefined : 'minuta sujeita à revisão jurídica' },
    { grupo: 'juridico', chave: 'juridico.variaveis', rotulo: 'Variáveis do template preenchidas', obrigatorio: obrigatorio('juridico.variaveis'), ...item('Variáveis do template') },
    { grupo: 'juridico', chave: 'juridico.anexos', rotulo: 'Anexos obrigatórios', obrigatorio: obrigatorio('juridico.anexos') || params.fase3.anexosObrigatoriosFaltantes.length > 0, ok: params.fase3.anexosObrigatoriosFaltantes.length === 0, detalhe: params.fase3.anexosObrigatoriosFaltantes.length > 0 ? `faltam: ${params.fase3.anexosObrigatoriosFaltantes.join(', ')}` : undefined },
  );

  const porGrupo: Record<GrupoChecklist, ItemChecklist[]> = { motorista: [], veiculo: [], comercial: [], juridico: [] };
  for (const i of itens) porGrupo[i.grupo].push(i);
  const bloqueios = itens.filter((i) => i.obrigatorio && !i.ok);
  return { itens, porGrupo, bloqueios, podeGerar: bloqueios.length === 0 };
}
