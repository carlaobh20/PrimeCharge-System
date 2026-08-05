import { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getArquivoUrl } from '../api/arquivos';
import { useArquivos, useDeleteArquivo, useUploadArquivo } from '../hooks/useArquivos';

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function ArquivosPanel({
  entidadeTipo,
  entidadeId,
  categoria,
  bucket,
  empresaId,
  usuarioId,
  accept,
  label,
}: {
  entidadeTipo: string;
  entidadeId: string;
  categoria: string;
  bucket: string;
  empresaId?: string;
  usuarioId?: string;
  accept?: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: arquivos, isLoading } = useArquivos(entidadeTipo, entidadeId, categoria);
  const upload = useUploadArquivo(entidadeTipo, entidadeId);
  const remove = useDeleteArquivo(entidadeTipo, entidadeId);

  function handleFiles(files: FileList | null) {
    if (!files || !empresaId) return;
    Array.from(files).forEach((file) => {
      upload.mutate({ bucket, empresaId, entidadeTipo, entidadeId, categoria, usuarioId, file });
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleOpen(caminhoStorage: string) {
    const url = await getArquivoUrl(caminhoStorage);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending || !empresaId}
      >
        <Upload className="h-4 w-4" />
        {upload.isPending ? 'Enviando…' : `Enviar ${label}`}
      </Button>

      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (!arquivos || arquivos.length === 0) && (
        <p className="text-sm text-neutral-500">Nenhum arquivo enviado ainda.</p>
      )}

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {arquivos?.map((arquivo) => (
          <li key={arquivo.id} className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={() => handleOpen(arquivo.caminho_storage)}
              className="truncate text-left text-sm text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {arquivo.nome_arquivo}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">{formatBytes(arquivo.tamanho_bytes)}</span>
              <button
                type="button"
                onClick={() => remove.mutate(arquivo)}
                aria-label="Excluir arquivo"
                className="text-neutral-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
