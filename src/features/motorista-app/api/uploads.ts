import { supabase } from '@/shared/lib/supabase';

// Uploads do motorista (migration 0041). Storage por vínculo: docs/anexos vão pra
// motoristas-documentos na PRÓPRIA pasta ({empresa}/{motorista_id}/...); fotos de vistoria vão
// pra checklists-fotos ({empresa}/{checklist_id}/...). Validação de MIME/tamanho no cliente
// (defesa em profundidade — a RLS é a barreira real). Compressão de imagem antes do upload pra
// não subir foto de celular inteira por 4G.

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por arquivo
const MIME_OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function nomeSeguro(nome: string): string {
  // remove separadores de path e caracteres estranhos — nunca confiar no nome do cliente
  return nome.replace(/[^\w.-]+/g, '_').slice(-80) || 'arquivo';
}

// Redimensiona/comprime imagem via canvas (JPEG q0.8, máx 1600px no maior lado). PDF passa
// direto. Retorna um Blob.
async function comprimirSePreciso(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const max = 1600;
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.8));
}

async function contexto(): Promise<{ uid: string; empresaId: string; motoristaId: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Sessão expirada.');
  const { data: u, error } = await supabase.from('usuarios').select('empresa_id, motorista_id').eq('id', uid).single();
  if (error || !u?.motorista_id) throw new Error('Conta sem vínculo de motorista.');
  return { uid, empresaId: u.empresa_id as string, motoristaId: u.motorista_id as string };
}

function validar(file: File) {
  if (!MIME_OK.includes(file.type)) throw new Error('Formato não permitido. Use JPG, PNG, WEBP ou PDF.');
  if (file.size > MAX_BYTES) throw new Error('Arquivo grande demais (máximo 8 MB).');
}

// Envia um DOCUMENTO do motorista: sobe pro Storage e registra em `arquivos` (entidade
// motorista). uuidNome vem de crypto.randomUUID pra evitar colisão e path traversal.
export async function enviarDocumento(file: File, categoria: string): Promise<void> {
  validar(file);
  const { uid, empresaId, motoristaId } = await contexto();
  const blob = await comprimirSePreciso(file);
  const nome = nomeSeguro(file.name);
  const path = `${empresaId}/${motoristaId}/${crypto.randomUUID()}-${nome}`;
  const { error: erroUp } = await supabase.storage.from('motoristas-documentos').upload(path, blob, {
    contentType: blob.type || file.type,
    upsert: false,
  });
  if (erroUp) throw erroUp;
  const { error: erroArq } = await supabase.from('arquivos').insert({
    empresa_id: empresaId,
    entidade_tipo: 'motorista',
    entidade_id: motoristaId,
    categoria,
    nome_arquivo: nome,
    caminho_storage: `motoristas-documentos/${path}`,
    tipo_mime: blob.type || file.type,
    tamanho_bytes: blob.size,
    usuario_id: uid,
    status_revisao: 'aguardando',
  });
  if (erroArq) throw erroArq;
}

// Anexa um arquivo a um CHAMADO próprio.
export async function anexarAoChamado(file: File, chamadoId: string): Promise<void> {
  validar(file);
  const { uid, empresaId, motoristaId } = await contexto();
  const blob = await comprimirSePreciso(file);
  const nome = nomeSeguro(file.name);
  const path = `${empresaId}/${motoristaId}/chamados/${chamadoId}/${crypto.randomUUID()}-${nome}`;
  const { error: erroUp } = await supabase.storage.from('motoristas-documentos').upload(path, blob, {
    contentType: blob.type || file.type,
    upsert: false,
  });
  if (erroUp) throw erroUp;
  const { error: erroArq } = await supabase.from('arquivos').insert({
    empresa_id: empresaId,
    entidade_tipo: 'chamado',
    entidade_id: chamadoId,
    categoria: 'anexo',
    nome_arquivo: nome,
    caminho_storage: `motoristas-documentos/${path}`,
    tipo_mime: blob.type || file.type,
    tamanho_bytes: blob.size,
    usuario_id: uid,
  });
  if (erroArq) throw erroArq;
}

// Sobe uma FOTO de item de vistoria (checklists-fotos, própria vistoria). Retorna o
// caminho_storage pra gravar em checklist_itens.foto_url.
export async function enviarFotoVistoria(file: File, checklistId: string, itemId: string): Promise<string> {
  validar(file);
  const { empresaId } = await contexto();
  const blob = await comprimirSePreciso(file);
  const path = `${empresaId}/${checklistId}/itens/${itemId}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('checklists-fotos').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return `checklists-fotos/${path}`;
}
