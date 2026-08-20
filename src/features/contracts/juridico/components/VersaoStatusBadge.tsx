import { Badge } from '@/shared/components/ui/badge';
import { CONTRATO_VERSAO_STATUS_LABEL, type ContratoVersaoStatus } from '../types';

const VARIANTE: Record<ContratoVersaoStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  rascunho: 'secondary',
  em_revisao: 'info',
  aprovada: 'info',
  aguardando_assinatura: 'warning',
  assinada: 'success',
  vigente: 'success',
  substituida: 'outline',
  cancelada: 'destructive',
};

export function VersaoStatusBadge({ status }: { status: ContratoVersaoStatus }) {
  return <Badge variant={VARIANTE[status]}>{CONTRATO_VERSAO_STATUS_LABEL[status]}</Badge>;
}
