export interface Rascunho {
  tipo: "texto" | "imagem" | "audio" | "anexo";
  conteudo: string;
  legenda?: string;
  file?: File | Blob;
}