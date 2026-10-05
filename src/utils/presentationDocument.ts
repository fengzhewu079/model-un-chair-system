export interface PreparedDocument {
  kind: 'pdf' | 'image' | 'text' | 'external';
  mime?: string;
  text?: string;
}

// Never embed arbitrary HTML/SVG or trust the browser-supplied MIME type.
export async function preparePresentationDocument(file: File): Promise<PreparedDocument> {
  if (!file.size) throw new Error('This file is empty. Choose another document.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Choose a document smaller than 50 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') {
    if (!(await file.slice(0, 5).text()).startsWith('%PDF-')) {
      throw new Error('This is not a valid PDF. Choose another document.');
    }
    return {kind: 'pdf', mime: 'application/pdf'};
  }
  const images: Record<string, string> = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif'};
  if (extension && images[extension]) return {kind: 'image', mime: images[extension]};
  if ((extension === 'txt' || extension === 'md' || extension === 'csv') && file.size <= 2 * 1024 * 1024) {
    return {kind: 'text', text: await file.text()};
  }
  return {kind: 'external'};
}
