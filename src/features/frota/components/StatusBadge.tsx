import { Badge } from '@/shared/components/ui/badge';
import { VEICULO_STATUS_COLOR, VEICULO_STATUS_LABEL, type VeiculoStatus } from '../types';

export function StatusBadge({ status }: { status: VeiculoStatus }) {
  return <Badge variant={VEICULO_STATUS_COLOR[status]}>{VEICULO_STATUS_LABEL[status]}</Badge>;
}
