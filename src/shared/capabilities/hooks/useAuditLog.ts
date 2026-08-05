import { useQuery } from '@tanstack/react-query';
import { listAuditLog } from '../api/auditLog';

export function useAuditLog(tabela: string, registroId: string | undefined) {
  return useQuery({
    queryKey: ['audit_log', tabela, registroId],
    queryFn: () => listAuditLog(tabela, registroId!),
    enabled: !!registroId,
  });
}
