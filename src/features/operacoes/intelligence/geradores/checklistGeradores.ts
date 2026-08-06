import { diasDesde } from '@/shared/lib/format';
import type { Checklist } from '../../types';
import type { AcaoCandidata } from '../../types';

// Checklist não tem `prazo` (não é um documento com data de vencimento, é uma tarefa) — o
// sinal de "precisa de atenção" aqui é diferente dos outros 3 geradores (DEC-055): não é
// "vence em X dias", é "está aberto há tempo demais sem ninguém concluir". 3 dias é o mesmo
// prazo operacional que uma vistoria/checklist de entrega deveria levar no máximo — acima
// disso, alguém esqueceu ou está travado.
const DIAS_LIMITE_ABERTO = 3;

// Gerador novo da Missão 4 (Fase 3) — fecha o achado da auditoria de jornada: "checklists
// pendentes" nunca alimentava Ações Operacionais, mesmo checklists abertos existindo desde a
// Sprint 9. `prazo: null` de propósito — não inventa uma data que a entidade não tem
// (DEC-022); a Ação usa `criado_em` só pra decidir SE gera, não como campo de prazo exibido.
export function gerarAcoesChecklistAbertoDemorado(checklists: Checklist[]): AcaoCandidata[] {
  return checklists
    .filter((c) => c.status === 'aberto')
    .map((c) => ({ checklist: c, dias: diasDesde(c.criado_em) }))
    .filter((x): x is { checklist: Checklist; dias: number } => x.dias !== null && x.dias >= DIAS_LIMITE_ABERTO)
    .map(({ checklist, dias }) => ({
      titulo: `Checklist "${checklist.titulo}" aberto há ${dias} dia(s)`,
      descricao: 'Concluir ou cancelar este checklist — está aberto além do prazo operacional esperado.',
      tipo: 'checklist_pendente',
      prioridade: dias >= 10 ? 'critica' : dias >= 7 ? 'alta' : 'media',
      prazo: null,
      entidade_tipo: checklist.entidade_tipo,
      entidade_id: checklist.entidade_id,
      gerado_por: 'checklist.aberto_demorado',
    }));
}
