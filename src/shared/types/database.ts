// Tipos que espelham tabelas de fundação (Fase 0) — empresas/usuarios/permissoes/convites/audit_log.

export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'admin'
  | 'gestor_frota'
  | 'gestor_financeiro'
  | 'operador'
  | 'motorista';

export type Usuario = {
  id: string;
  empresa_id: string | null;
  nome_completo: string | null;
  email: string | null;
  role: UserRole;
  ativo: boolean;
  criado_em: string;
  /** Épico 11 — só preenchido quando role = 'motorista'; liga esta conta de login a um
   * registro de `motoristas`. Staff nunca tem esse campo preenchido. */
  motorista_id: string | null;
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super admin',
  owner: 'Proprietário',
  admin: 'Administrador',
  gestor_frota: 'Gestor de frota',
  gestor_financeiro: 'Gestor financeiro',
  operador: 'Operador',
  motorista: 'Motorista',
};
