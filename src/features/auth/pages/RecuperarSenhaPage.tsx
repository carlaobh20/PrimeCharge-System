import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { supabase } from '@/shared/lib/supabase';

// Fase 1 do App do Motorista — recuperação de senha (staff e motorista usam o mesmo fluxo,
// mesmo Supabase Auth; nenhuma senha passa pelo nosso código nem é armazenada por nós).
//
// A mensagem de sucesso é a MESMA exista ou não o e-mail (e o resultado da chamada é ignorado
// de propósito): responder diferente revelaria quais e-mails têm conta ("user enumeration").
// O rate limit do envio é do próprio Supabase.
export function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviando(false);
    setEnviado(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 p-8 dark:border-neutral-800">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Recuperar senha</h1>

        {enviado ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Se existir uma conta com esse e-mail, você vai receber um link para redefinir a senha. Confira também a caixa de spam.
            </p>
            <Link to="/login" className="block text-sm text-emerald-600 hover:underline">
              Voltar para o login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-neutral-500">Informe o e-mail da sua conta e enviaremos um link para criar uma senha nova.</p>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar link'}
            </Button>
            <Link to="/login" className="block text-center text-sm text-neutral-500 hover:underline">
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
