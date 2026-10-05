import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { preparePresentationDocument, type PreparedDocument } from '../utils/presentationDocument';

const PdfDocumentViewer = lazy(() => import('./PdfDocumentViewer'));

export const PresentationDocument: React.FC = () => {
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const [document, setDocument] = useState<(PreparedDocument & {file: File}) | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => () => {selection.current += 1;}, []);
  useEffect(() => {
    if (!document?.mime) {setUrl(''); return;}
    const next = URL.createObjectURL(document.file.slice(0, document.file.size, document.mime));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [document]);

  const choose = async (file?: File) => {
    if (!file) return; // Cancelling the picker keeps the current document.
    const request = ++selection.current;
    setLoading(true); setError('');
    try {
      const prepared = await preparePresentationDocument(file);
      if (request !== selection.current) return;
      setUrl(''); setImageFailed(false); setDocument({...prepared, file});
    } catch (reason) {
      if (request === selection.current) setError(reason instanceof Error ? reason.message : 'Could not read this file. Try another document.');
    } finally {if (request === selection.current) setLoading(false);}
  };
  const remove = () => {
    selection.current += 1;
    setDocument(null); setUrl(''); setError(''); setLoading(false); setImageFailed(false);
  };

  return <section className="presentation-document" aria-label="Presentation document">
    <div className="presentation-document-toolbar">
      <div className="presentation-document-name">{document ? <strong title={document.file.name}>{document.file.name}</strong> : <strong>Document <span>· optional</span></strong>}</div>
      <div className="presentation-document-actions">
        <Button variant="secondary" className="paper-outline-button" onClick={() => input.current?.click()}>{document ? 'Change document' : 'Open document'}</Button>
        {document && <button className="desk-text-button" onClick={remove}>Remove</button>}
      </div>
      <input ref={input} type="file" hidden aria-label="Choose local document" onChange={e => {const file = e.target.files?.[0]; e.target.value = ''; void choose(file);}} />
    </div>
    <p className="presentation-document-hint">Local only · Reopen after leaving or refreshing this page.</p>
    {loading && <p role="status">Opening document…</p>}
    {error && <p role="alert" className="motion-error">{error}</p>}
    {!document ? <div className="presentation-document-empty"><p>Present a document alongside your timer.</p><span>PDF, images and text preview here. Other formats open in your own app.</span></div> : <>
      {document.kind === 'pdf' && url && <>
        <Suspense fallback={<p role="status">Loading PDF viewer…</p>}><PdfDocumentViewer key={url} file={document.file} /></Suspense>
        <p className="presentation-document-hint">PDF not showing? <a href={url} target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a></p>
      </>}
      {document.kind === 'image' && url && (imageFailed ? <p role="alert">This image could not be displayed. Try another file.</p> : <div className="presentation-document-view presentation-image"><img src={url} alt={document.file.name} onError={() => setImageFailed(true)} /></div>)}
      {document.kind === 'text' && <pre className="presentation-document-view presentation-text">{document.text}</pre>}
      {document.kind === 'external' && <div className="presentation-document-empty"><p>No in-page preview for this file.</p><span>Open the original file in your usual app. You can keep using the timer here.</span></div>}
    </>}
  </section>;
};
