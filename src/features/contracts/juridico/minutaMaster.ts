// A minuta master vive em docs/juridico/contrato-master-minuta.md e é importada AQUI como texto
// (Vite ?raw) — fonte ÚNICA, sem cópia paralela (regra 34 da missão). A lógica de extração é
// pura e mora em minutaLib.ts (testável em Node); este arquivo só liga o texto à lógica.
//
// IMPORTANTE (regra 35): a minuta NÃO é juridicamente definitiva. Todo lugar que a exibir deve
// mostrar AVISO_MINUTA enquanto o template não for formalmente aprovado (status 'publicado' é
// decisão operacional do staff — a aprovação JURÍDICA é do advogado, fora do sistema).
import minutaMasterRaw from '../../../../docs/juridico/contrato-master-minuta.md?raw';
import { extrairCorpoDaMinuta, variaveisDoCorpo } from './minutaLib';

export { AVISO_MINUTA, NOME_TEMPLATE_MASTER } from './minutaLib';

/** Corpo contratual da minuta master (pronto pra virar contrato_templates.corpo). */
export function corpoMinutaMaster(): string {
  return extrairCorpoDaMinuta(minutaMasterRaw);
}

/** Variáveis {{...}} do corpo da minuta (pra contrato_templates.variaveis). */
export function variaveisMinutaMaster(): string[] {
  return variaveisDoCorpo(corpoMinutaMaster());
}
