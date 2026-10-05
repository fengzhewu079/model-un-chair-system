import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfDocumentViewer({file}: {file: File}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | undefined;
    void file.arrayBuffer().then(data => {
      if (cancelled) return;
      const assets = `${import.meta.env.BASE_URL}pdfjs-assets/`;
      loadingTask = getDocument({data, cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`});
      return loadingTask.promise.then(document => {if (!cancelled) setPdf(document);});
    }).catch(reason => {
      if (!cancelled) setError(reason?.name === 'PasswordException' ? 'This PDF needs a password. Open an unlocked copy to preview it here.' : 'This PDF could not be displayed. Try another copy or open it in a new tab.');
    });
    return () => {cancelled = true; void loadingTask?.destroy();};
  }, [file]);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(100, Math.floor(entries[0].contentRect.width - 24))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    // A fresh canvas per render avoids overlapping PDF.js drawing tasks on rapid page/zoom changes.
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `PDF page ${pageNumber} of ${pdf.numPages}`);
    setRendering(true); setError('');
    void pdf.getPage(pageNumber).then(page => {
      if (cancelled) return;
      const base = page.getViewport({scale: 1});
      const viewport = page.getViewport({scale: Math.min(4, width / base.width * zoom)});
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      task = page.render({canvas, viewport, transform: [ratio, 0, 0, ratio, 0, 0]});
      return task.promise.then(() => {
        if (!cancelled) {canvasHost.current?.replaceChildren(canvas); setRendering(false);}
      });
    }).catch(reason => {
      if (!cancelled && reason?.name !== 'RenderingCancelledException') {setError('This page could not be displayed. Try another page or open the PDF in a new tab.'); setRendering(false);}
    });
    return () => {cancelled = true; task?.cancel();};
  }, [pdf, pageNumber, width, zoom]);

  return <div>
    <div className="pdf-toolbar" aria-label="PDF controls">
      <button disabled={!pdf || pageNumber === 1} onClick={() => setPageNumber(n => n - 1)}>Previous</button>
      <span aria-live="polite">{pdf ? `${pageNumber} / ${pdf.numPages}` : 'Loading…'}</span>
      <button disabled={!pdf || pageNumber === pdf.numPages} onClick={() => setPageNumber(n => n + 1)}>Next</button>
      <button aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom(z => Math.max(.5, z - .25))}>−</button>
      <button onClick={() => setZoom(1)}>Fit width</button>
      <button aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .25))}>+</button>
    </div>
    {error && <p role="alert" className="motion-error">{error}</p>}
    <div ref={surface} className="presentation-document-view pdf-surface" aria-busy={rendering}>
      {!pdf && !error && <p role="status">Opening PDF…</p>}
      <div ref={canvasHost} />
    </div>
  </div>;
}
