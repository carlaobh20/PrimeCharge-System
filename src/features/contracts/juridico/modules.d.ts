// Declarações mínimas para o Centro Jurídico.
// - '*.md?raw': o Vite entrega o conteúdo do arquivo como string (usado pra minuta master ser a
//   ÚNICA fonte do template — docs/juridico/contrato-master-minuta.md importada, não copiada).
// - pdfmake 0.3: os @types oficiais são da API 0.2 (incompatível), então declaramos só o que
//   usamos: build browser (createPdf/addVirtualFileSystem) e o vfs de fontes.

declare module '*.md?raw' {
  const conteudo: string;
  export default conteudo;
}

declare module 'pdfmake/build/pdfmake' {
  export type PdfDocumentGerado = {
    getBlob(): Promise<Blob>;
    getBuffer(): Promise<Uint8Array>;
    download(nome?: string): void;
    open(): void;
  };
  export type PdfMakeBrowser = {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    createPdf(docDefinition: Record<string, unknown>): PdfDocumentGerado;
  };
  const pdfMake: PdfMakeBrowser;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;
  export default vfs;
}
