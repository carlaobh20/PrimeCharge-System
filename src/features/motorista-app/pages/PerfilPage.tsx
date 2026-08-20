import { useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { toast } from '@/shared/components/ui/toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { Secao, Linha, SkeletonPortal } from '../components/ui';

// Épico 11 — App do Motorista. Tela "Perfil": dados de identificação (só leitura) + troca de
// senha + sair. NADA de editar empresa/role/motorista_id/contrato/veículo — vínculos são do staff.

export function PerfilPage() {
  const { data: usuario, isLoading } = useCurrentUsuario();

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function alterarSenha(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error('A senha precisa ter ao menos 8 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      toast.error('Não foi possível alterar a senha.');
      return;
    }
    toast.success('Senha alterada!');
    setSenha('');
    setConfirmar('');
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  if (isLoading) return <SkeletonPortal />;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Perfil</h1>

      <Secao titulo="Seus dados">
        <div className="divide-y divide-neutral-100 dark:divide-white/5">
          <Linha label="Nome" value={usuario?.nome_completo ?? '—'} />
          <Linha label="E-mail" value={usuario?.email ?? '—'} />
          <Linha label="Papel" value="Motorista" />
        </div>
      </Secao>

      <Secao titulo="Segurança">
        <form className="space-y-3" onSubmit={alterarSenha}>
          <div>
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
          </div>
          <div>
            <Label htmlFor="confirmar-senha">Confirmar senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
          <Button type="submit" disabled={salvando} className="w-full">
            {salvando ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </form>
      </Secao>

      <Button variant="destructive" className="w-full" onClick={sair}>
        <LogOut className="h-4 w-4" /> Sair
      </Button>

      {/* Links legais — sem páginas próprias ainda, ficam discretos. */}
      <p className="text-center text-xs text-neutral-400">
        <a href="#" className="underline">Termos</a>
        {' · '}
        <a href="#" className="underline">Privacidade</a>
      </p>
    </div>
  );
}
