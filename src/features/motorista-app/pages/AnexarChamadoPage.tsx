import { useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { toast } from '@/shared/components/ui/toast';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Secao } from '../components/ui';
import { useMeusChamados } from '../hooks/useMotoristaApp';
import { anexarAoChamado } from '../api/uploads';

// Épico 11 — App do Motorista. Anexa um arquivo (imagem/PDF) a um chamado próprio. O upload valida
// MIME/tamanho e comprime imagem internamente; aqui só cuidamos da UX (seleção, envio, feedback).

export function AnexarChamadoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const chamados = useMeusChamados();
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Assunto do chamado atual (opcional — só pra o motorista se situar).
  const chamado = chamados.data?.find((c) => c.id === id) ?? null;

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function enviar() {
    if (!id) {
      toast.error('Chamado não identificado.');
      return;
    }
    if (!file) {
      toast.error('Selecione um arquivo primeiro.');
      return;
    }
    setEnviando(true);
    try {
      await anexarAoChamado(file, id);
      toast.success('Anexo enviado!');
      navigate(-1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível anexar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Anexar ao chamado</h1>
      </div>

      {chamado && <p className="px-1 text-sm text-neutral-500">Chamado: <span className="font-medium text-neutral-700 dark:text-neutral-300">{chamado.assunto}</span></p>}

      <Secao titulo="Arquivo">
        <div className="space-y-3">
          <div>
            <Label htmlFor="anexo">Imagem ou PDF</Label>
            <input
              id="anexo"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={onFile}
              className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 dark:text-neutral-300"
            />
          </div>
          {file && <p className="truncate text-xs text-neutral-500">{file.name}</p>}
          <Button className="w-full" disabled={!file || enviando} onClick={enviar}>
            <Paperclip className="mr-2 h-4 w-4" />
            {enviando ? 'Enviando…' : 'Anexar'}
          </Button>
        </div>
      </Secao>
    </div>
  );
}
