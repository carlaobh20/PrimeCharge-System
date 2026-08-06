import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { supabase } from '@/shared/lib/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { buscarConvitePorToken } from '../api/convites';
import { USER_ROLE_LABEL, type UserRole } from '@/shared/types/database';

type ConviteInfo = { email: string; role: UserRole; empresa_nome: string; valido: boolean };

// Rota pública (fora do ProtectedRoute, ver app/router/router.tsx) — completa o convite
// criado em Usuários (features/auth/pages/UsuariosPage.tsx). Só pede nome e senha porque o
// e-mail já vem do convite (evita o erro mais comum desse tipo de fluxo: a pessoa digitar um
// e-mail diferente do que foi convidado e não entender por que não tem acesso a nada depois).
// A vinculação real (criar a linha em `usuarios` com o role certo) acontece no banco
// (fn_aceitar_convite, migration 0009), não aqui — este formulário só chama signUp.
export function AceitarConvitePage() {
  const { session, loading: loadingSessao } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [carregandoConvite, setCarregandoConvite] = useState(true);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!token) {
      setErroConvite('Link de convite incompleto.');
      setCarregandoConvite(false);
      return;
    }
    buscarConvitePorToken(token)
      .then((info) => {
        if (!info || !info.valido) {
          setErroConvite('Este convite não existe mais, já foi usado, ou expirou.');
        } else {
          setConvite(info);
        }
      })
      .catch(() => setErroConvite('Não foi possível verificar este convite.'))
      .finally(() => setCarregandoConvite(false));
  }, [token]);

  if (!loadingSessao && session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!convite) return;
    setErroEnvio(null);
    setEnviando(true);
    const { error } = await supabase.auth.signUp({
      email: convite.email,
      password: senha,
      options: { data: { nome_completo: nome } },
    });
    setEnviando(false);
    if (error) {
      setErroEnvio(error.message);
      return;
    }
    setConcluido(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 p-8 dark:border-neutral-800">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">PrimeCharge OS</h1>

        {carregandoConvite && <p className="text-sm text-neutral-500">Verificando convite…</p>}

        {!carregandoConvite && erroConvite && (
          <>
            <p className="text-sm text-red-600">{erroConvite}</p>
            <Link to="/login" className="text-sm text-emerald-600 hover:underline">
              Ir para o login
            </Link>
          </>
        )}

        {!carregandoConvite && convite && !concluido && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Você foi convidado para <strong>{convite.empresa_nome}</strong> como{' '}
              <strong>{USER_ROLE_LABEL[convite.role]}</strong>.
            </p>

            <div>
              <Label>E-mail</Label>
              <Input type="email" value={convite.email} disabled />
            </div>

            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            </div>

            <div>
              <Label htmlFor="senha">Crie uma senha</Label>
              <Input
                id="senha"
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {erroEnvio && <p className="text-sm text-red-600">{erroEnvio}</p>}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Criando conta…' : 'Criar conta e entrar'}
            </Button>
          </form>
        )}

        {concluido && (
          <>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Conta criada. Se o seu projeto exigir confirmação de e-mail, verifique sua caixa de entrada antes de entrar.
            </p>
            <Link to="/login" className="text-sm text-emerald-600 hover:underline">
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
