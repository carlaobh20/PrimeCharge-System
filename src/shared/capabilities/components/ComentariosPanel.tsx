import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/shared/components/ui/toast';
import { useComentarios, useCreateComentario, useDeleteComentario } from '../hooks/useComentarios';

function formatData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export function ComentariosPanel({
  entidadeTipo,
  entidadeId,
  usuarioId,
  empresaId,
}: {
  entidadeTipo: string;
  entidadeId: string;
  usuarioId?: string;
  empresaId?: string;
}) {
  const [texto, setTexto] = useState('');
  const { data: comentarios, isLoading } = useComentarios(entidadeTipo, entidadeId);
  const createComentario = useCreateComentario(entidadeTipo, entidadeId);
  const deleteComentario = useDeleteComentario(entidadeTipo, entidadeId);

  function handleSubmit() {
    if (!texto.trim() || !usuarioId || !empresaId) return;
    createComentario.mutate(
      { empresaId, entidadeTipo, entidadeId, texto: texto.trim(), usuarioId },
      { onSuccess: () => { setTexto(''); toast.success('Comentário adicionado'); } }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Adicionar um comentário…"
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={createComentario.isPending || !texto.trim()}>
          Enviar
        </Button>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Carregando comentários…</p>}
      {!isLoading && (!comentarios || comentarios.length === 0) && (
        <p className="text-sm text-neutral-500">Nenhum comentário ainda.</p>
      )}

      <ul className="space-y-3">
        {comentarios?.map((comentario) => (
          <li key={comentario.id} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-sm text-neutral-800 dark:text-neutral-200">{comentario.texto}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-neutral-500">{formatData(comentario.criado_em)}</span>
              {comentario.usuario_id === usuarioId && (
                <button
                  type="button"
                  onClick={() => deleteComentario.mutate(comentario.id, { onSuccess: () => toast.success('Comentário excluído') })}
                  className="text-xs text-red-600 hover:underline"
                >
                  excluir
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
