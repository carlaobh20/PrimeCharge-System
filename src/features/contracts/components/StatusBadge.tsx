import { Badge } from '@/shared/components/ui/badge';
import { CONTRATO_STATUS_COLOR, CONTRATO_STATUS_LABEL, type ContratoStatus } from '../types';

export function StatusBadge({ status }: { status: ContratoStatus }) {
  return <Badge variant={CONTRATO_STATUS_COLOR[status]}>{CONTRATO_STATUS_LABEL[status]}</Badge>;
}
