import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { supabase } from '@/shared/lib/supabase';
import { useAuth } from '@/app/providers/AuthProvider';

// Fase 1 do App do Motorista — destino do link de recuperação (redirectTo da
// RecuperarSenhaPage). O link do e-mail já autentica a pessoa (o supabase-js processa o token
// da URL sozinho — detectSessionInUrl, default do client); esta tela só chama
// auth.updateUser({ password }). Sem sessão = link inválido/expirado → mensagem honesta, sem
// formulário. Depois de trocar, manda pra "/" — RequireStaff/RequireMotorista levam cada role
// pro portal certo.
export function RedefinirSenhaPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro('Não foi possível alterar a senha. O link pode ter expirado — peça um novo.');
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 p-8 dark:border-neutral-800">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Nova senha</h1>

        {loading ? (
          <p className="text-sm text-neutral-500">Verificando o link…</p>
        ) : !session ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Este link de recuperação é inválido ou já expirou. Peça um novo na tela de recuperação de senha.
            </p>
            <Link to="/recuperar-senha" className="block text-sm text-emerald-600 hover:underline">
              Pedir um novo link
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" type="password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <Label htmlFor="confirmacao">Confirmar senha</Label>
              <Input
                id="confirmacao"
                type="password"
                required
                minLength={8}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={salvando}>
              {salvando ? 'Alterando…' : 'Alterar senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
