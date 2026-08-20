// BIBLIOTECA CONTRATUAL DA PRIMECHARGE (Fase 5) — registro único das minutas oficiais.
// Os corpos vivem em docs/juridico/biblioteca/*.md (fonte única, versionada no git) e são
// importados como texto (Vite ?raw). O botão "Instalar biblioteca" materializa cada entrada como
// contrato_templates (SÓ CRIA — nunca sobrescreve um template existente; atualização passa pelo
// fluxo normal de edição/importação, protegido pelo histórico da 0046).
//
// DECISÃO DE ARQUITETURA (regra 2 da missão, "não criar oito contratos duplicados"): as oito
// variantes de contrato pedidas (semanal/mensal, com/sem caução, km controlada/livre) são UM
// Contrato Master parametrizável — variáveis + blocos condicionais {{#se}}/{{#senao}} + Políticas
// Contratuais. O mapa variante→mecanismo está em docs/juridico/BIBLIOTECA-CONTRATUAL.md.
import masterRaw from '../../../../docs/juridico/contrato-master-minuta.md?raw';
import termoEntregaRaw from '../../../../docs/juridico/biblioteca/termo-entrega.md?raw';
import termoDevolucaoRaw from '../../../../docs/juridico/biblioteca/termo-devolucao.md?raw';
import termoRespBensRaw from '../../../../docs/juridico/biblioteca/termo-responsabilidade-bens.md?raw';
import termoCienciaOperacionalRaw from '../../../../docs/juridico/biblioteca/termo-ciencia-operacional.md?raw';
import termoRastreamentoRaw from '../../../../docs/juridico/biblioteca/termo-ciencia-rastreamento-telemetria.md?raw';
import termoLgpdRaw from '../../../../docs/juridico/biblioteca/termo-lgpd-dados.md?raw';
import termoSeguroRaw from '../../../../docs/juridico/biblioteca/termo-ciencia-seguro.md?raw';
import comunicacaoSinistroRaw from '../../../../docs/juridico/biblioteca/comunicacao-sinistro.md?raw';
import declaracaoSinistroRaw from '../../../../docs/juridico/biblioteca/declaracao-sinistro.md?raw';
import termoProcedimentosSinistroRaw from '../../../../docs/juridico/biblioteca/termo-procedimentos-sinistro.md?raw';
import termoRescisaoRaw from '../../../../docs/juridico/biblioteca/termo-rescisao.md?raw';
import termoEncerramentoRaw from '../../../../docs/juridico/biblioteca/termo-encerramento.md?raw';
import termoQuitacaoRaw from '../../../../docs/juridico/biblioteca/termo-quitacao.md?raw';
import aditivoContratualRaw from '../../../../docs/juridico/biblioteca/aditivo-contratual.md?raw';
import termoRenovacaoRaw from '../../../../docs/juridico/biblioteca/termo-renovacao.md?raw';
import termoInfracoesRaw from '../../../../docs/juridico/biblioteca/termo-infracoes-multas.md?raw';
import { extrairCorpoDaMinuta } from './minutaLib';
import { extrairVariaveis } from './lib';

export type CategoriaBiblioteca =
  | 'contrato'
  | 'termo_operacional'
  | 'termo_responsabilidade'
  | 'seguro'
  | 'sinistro'
  | 'rescisao'
  | 'aditivo'
  | 'lgpd';

export const CATEGORIA_BIBLIOTECA_LABEL: Record<CategoriaBiblioteca, string> = {
  contrato: 'Contratos principais',
  termo_operacional: 'Termos operacionais',
  termo_responsabilidade: 'Termos de responsabilidade e ciência',
  seguro: 'Seguro',
  sinistro: 'Sinistros',
  rescisao: 'Rescisão e encerramento',
  aditivo: 'Aditivos e renovação',
  lgpd: 'LGPD e telemetria',
};

export type EntradaBiblioteca = {
  slug: string;
  nome: string;
  categoria: CategoriaBiblioteca;
  descricao: string;
  finalidade: string;
  corpo: string;
  /**
   * TRAVA OPERACIONAL de geração (Fase 6): caminhos do snapshot que PRECISAM ter valor para o
   * documento fazer sentido (ex.: Termo de Ciência do Seguro sem apólice cadastrada não deve ser
   * emitido — sairia "[SEM APÓLICE CADASTRADA]"). Não é regra jurídica: é impedir a emissão de
   * documento vazio do próprio assunto. Verificada no GerarTermoDialog.
   */
  exigeDados?: { caminho: string; motivo: string }[];
};

export const NOME_TEMPLATE_MASTER_BIBLIOTECA = 'Contrato Master — Locação de Veículo Elétrico (minuta)';

export const BIBLIOTECA: EntradaBiblioteca[] = [
  {
    slug: 'contrato-master',
    nome: NOME_TEMPLATE_MASTER_BIBLIOTECA,
    categoria: 'contrato',
    descricao: 'MINUTA SUJEITA À VALIDAÇÃO JURÍDICA. Master parametrizável — cobre as variantes (diária/semanal/mensal, com/sem caução, km controlada/livre) via variáveis e blocos condicionais.',
    finalidade: 'Contrato principal de locação de veículo elétrico para motorista de aplicativo.',
    corpo: extrairCorpoDaMinuta(masterRaw),
  },
  { slug: 'termo-entrega', nome: 'Termo de Entrega do Veículo', categoria: 'termo_operacional', descricao: 'MINUTA. Formaliza a entrega: km, bateria, inventário, avarias preexistentes, vistoria.', finalidade: 'Assinado na entrega do veículo, junto com a vistoria de entrega.', corpo: termoEntregaRaw },
  { slug: 'termo-devolucao', nome: 'Termo de Devolução do Veículo', categoria: 'termo_operacional', descricao: 'MINUTA. Formaliza a devolução: km, bateria, inventário, avarias, pendências.', finalidade: 'Assinado na devolução, junto com a vistoria de devolução.', corpo: termoDevolucaoRaw },
  { slug: 'termo-responsabilidade-bens', nome: 'Termo de Responsabilidade pelo Veículo e Bens', categoria: 'termo_responsabilidade', descricao: 'MINUTA. Responsabilidade por veículo, acessórios, carregador e cabos (inventário variável).', finalidade: 'Assinado na contratação/entrega.', corpo: termoRespBensRaw },
  { slug: 'termo-ciencia-operacional', nome: 'Termo de Ciência Operacional (Uso, Manutenção, Recarga, Km)', categoria: 'termo_responsabilidade', descricao: 'MINUTA. Ciências de uso, manutenção, recarga e quilometragem em capítulos.', finalidade: 'Assinado na contratação.', corpo: termoCienciaOperacionalRaw },
  { slug: 'termo-ciencia-rastreamento', nome: 'Termo de Ciência sobre Rastreamento e Telemetria', categoria: 'lgpd', descricao: 'MINUTA. Equipamentos, dados coletados, finalidades, retenção e direitos do titular.', finalidade: 'Assinado na contratação; par do termo LGPD.', corpo: termoRastreamentoRaw },
  { slug: 'termo-lgpd', nome: 'Termo de Ciência sobre Tratamento de Dados (LGPD)', categoria: 'lgpd', descricao: 'MINUTA. Categorias de dados, finalidades, compartilhamento, segurança e direitos.', finalidade: 'Assinado na contratação.', corpo: termoLgpdRaw },
  { slug: 'termo-ciencia-seguro', nome: 'Termo de Ciência do Seguro (Coberturas, Franquia, Exclusões)', categoria: 'seguro', descricao: 'MINUTA. Dados vêm do cadastro do seguro; cobertura nunca é presumida.', finalidade: 'Assinado quando a apólice do contrato é cadastrada.', corpo: termoSeguroRaw, exigeDados: [{ caminho: 'seguro.apolice', motivo: 'Não há apólice cadastrada para este contrato — cadastre o seguro antes de emitir o termo.' }] },
  { slug: 'comunicacao-sinistro', nome: 'Comunicação de Sinistro', categoria: 'sinistro', descricao: 'MINUTA. Registro imediato da ocorrência, vinculado ao módulo de sinistros.', finalidade: 'Gerada imediatamente após a ocorrência.', corpo: comunicacaoSinistroRaw, exigeDados: [{ caminho: 'sinistro.tipo', motivo: 'Não há sinistro registrado para este contrato — registre a ocorrência antes de emitir.' }] },
  { slug: 'declaracao-sinistro', nome: 'Declaração de Sinistro', categoria: 'sinistro', descricao: 'MINUTA. Relato circunstanciado para instrução junto à seguradora.', finalidade: 'Gerada na sequência da comunicação.', corpo: declaracaoSinistroRaw, exigeDados: [{ caminho: 'sinistro.tipo', motivo: 'Não há sinistro registrado para este contrato — registre a ocorrência antes de emitir.' }] },
  { slug: 'termo-procedimentos-sinistro', nome: 'Termo de Procedimentos de Sinistro e Entrega de Documentos', categoria: 'sinistro', descricao: 'MINUTA. Reconhecimento da ocorrência, ciência do fluxo e protocolo de documentos.', finalidade: 'Gerado durante o processamento do sinistro.', corpo: termoProcedimentosSinistroRaw, exigeDados: [{ caminho: 'sinistro.tipo', motivo: 'Não há sinistro registrado para este contrato — registre a ocorrência antes de emitir.' }] },
  { slug: 'termo-rescisao', nome: 'Termo de Rescisão (acordo / motorista / locadora)', categoria: 'rescisao', descricao: 'MINUTA. Termo único parametrizado pelo solicitante; valores só registrados, nunca calculados.', finalidade: 'Gerado no início do workflow de rescisão.', corpo: termoRescisaoRaw, exigeDados: [{ caminho: 'rescisao.solicitante', motivo: 'Não há rescisão registrada para este contrato — inicie o workflow de rescisão antes de emitir.' }] },
  { slug: 'termo-encerramento', nome: 'Termo de Encerramento e Devolução Definitiva', categoria: 'rescisao', descricao: 'MINUTA. Fecha a rescisão após checklist obrigatório e apuração registrada.', finalidade: 'Gerado no encerramento do contrato.', corpo: termoEncerramentoRaw, exigeDados: [{ caminho: 'rescisao.valores', motivo: 'Não há apuração financeira registrada na rescisão — registre a apuração antes de encerrar.' }] },
  { slug: 'termo-quitacao', nome: 'Termo de Quitação (uso condicionado)', categoria: 'rescisao', descricao: 'MINUTA de uso condicionado — alcance e conveniência dependem do advogado.', finalidade: 'Somente após liquidação integral da apuração.', corpo: termoQuitacaoRaw, exigeDados: [{ caminho: 'rescisao.valores', motivo: 'Quitação só após a apuração do encerramento estar registrada e liquidada (uso condicionado ao advogado).' }] },
  { slug: 'aditivo-contratual', nome: 'Aditivo Contratual (parametrizado por tipo)', categoria: 'aditivo', descricao: 'MINUTA. Um aditivo para todos os tipos (valor, prazo, veículo, km, pagamento, caução, condições).', finalidade: 'Gerado a partir do registro de aditivo do contrato.', corpo: aditivoContratualRaw, exigeDados: [{ caminho: 'aditivo.tipo', motivo: 'Não há aditivo registrado para este contrato — registre o aditivo antes de emitir o documento.' }] },
  { slug: 'termo-renovacao', nome: 'Termo de Renovação / Prorrogação', categoria: 'aditivo', descricao: 'MINUTA. Renovação nunca automática; novo período com condições registradas.', finalidade: 'Gerado na decisão de renovar/prorrogar.', corpo: termoRenovacaoRaw, exigeDados: [{ caminho: 'aditivo.tipo', motivo: 'Não há registro de renovação/prorrogação (aditivo) para este contrato — registre antes de emitir.' }] },
  { slug: 'termo-infracoes-multas', nome: 'Termo de Ciência de Infrações e Responsabilidade por Multas', categoria: 'termo_responsabilidade', descricao: 'MINUTA. Ciência geral + reconhecimento de multa específica (bloco condicional).', finalidade: 'Assinado na contratação; reemitido por multa quando necessário.', corpo: termoInfracoesRaw },
];

/** Variáveis usadas por uma entrada (inclui caminhos de blocos condicionais). */
export function variaveisDaEntrada(entrada: EntradaBiblioteca): string[] {
  return extrairVariaveis(entrada.corpo);
}

export function entradasPorCategoria(): Map<CategoriaBiblioteca, EntradaBiblioteca[]> {
  const mapa = new Map<CategoriaBiblioteca, EntradaBiblioteca[]>();
  for (const e of BIBLIOTECA) {
    const lista = mapa.get(e.categoria) ?? [];
    lista.push(e);
    mapa.set(e.categoria, lista);
  }
  return mapa;
}
