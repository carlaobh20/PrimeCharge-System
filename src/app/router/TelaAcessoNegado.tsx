import { Button } from '@/shared/components/ui/button';
import { supabase } from '@/shared/lib/supabase';

// Fase 1 do App do Motorista (fix R5 da auditoria): tela terminal de acesso negado, usada
// pelos guards quando NÃO é possível confirmar a autorização do usuário (erro ao carregar o
// perfil, linha órfã em usuarios, conta desativada). Regra: na dúvida, NEGAR — nunca liberar
// o painel por falha de query (era o comportamento antigo do RequireStaff). Sem redirect
// automático daqui pra não criar loop entre guards; a saída é recarregar ou sair da conta.
export function TelaAcessoNegado({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Acesso não confirmado</p>
      <p className="max-w-sm text-xs text-neutral-500">{mensagem}</p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
        <Button variant="outline" size="sm" onClick={() => void supabase.auth.signOut()}>
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
