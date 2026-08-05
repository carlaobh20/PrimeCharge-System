import { Badge } from '@/shared/components/ui/badge';
import { MOTORISTA_STATUS_COLOR, MOTORISTA_STATUS_LABEL, type MotoristaStatus } from '../types';

export function StatusBadge({ status }: { status: MotoristaStatus }) {
  return <Badge variant={MOTORISTA_STATUS_COLOR[status]}>{MOTORISTA_STATUS_LABEL[status]}</Badge>;
}
