import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfDocumentViewer({file}: {file: File}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [error, setError] = useState('');
  const surface = useRef<HTMLDivElement>(null);
  const readingAnchor = useRef<{index: number; fraction: number} | null>(null);
  const captureReadingPosition = () => {
    const container = surface.current;
    if (!container) return;
    const pages = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));
    const top = container.getBoundingClientRect().top + container.clientTop;
    const index = pages.findIndex(page => page.getBoundingClientRect().bottom > top);
    if (index < 0) return;
    const bounds = pages[index].getBoundingClientRect();
    readingAnchor.current = {index, fraction: (top - bounds.top) / bounds.height};
  };
  useLayoutEffect(() => {
    const container = surface.current;
    const anchor = readingAnchor.current;
    const page = container?.querySelectorAll<HTMLElement>('.pdf-page')[anchor?.index ?? -1];
    if (!container || !page || !anchor) return;
    const bounds = page.getBoundingClientRect();
    container.scrollTop += bounds.top - container.getBoundingClientRect().top - container.clientTop + anchor.fraction * bounds.height;
  }, [width, zoom]);

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
    const observer = new ResizeObserver(entries => {
      captureReadingPosition();
      setWidth(Math.max(100, Math.floor(entries[0].contentRect.width - 24)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div>
    <div className="pdf-toolbar" aria-label="PDF controls">
      <span>{pdf ? `${pdf.numPages} ${pdf.numPages === 1 ? 'page' : 'pages'}` : 'Loading…'}</span>
      <button aria-label="Zoom out" disabled={zoom <= .5} onClick={() => {captureReadingPosition(); setZoom(z => Math.max(.5, z - .25));}}>−</button>
      <button onClick={() => {captureReadingPosition(); setZoom(1);}}>Fit width</button>
      <button aria-label="Zoom in" disabled={zoom >= 2} onClick={() => {captureReadingPosition(); setZoom(z => Math.min(2, z + .25));}}>+</button>
    </div>
    {error && <p role="alert" className="motion-error">{error}</p>}
    <div ref={surface} className="presentation-document-view pdf-surface" tabIndex={0} role="region" aria-label="PDF document · scroll to read">
      {!pdf && !error && <p role="status">Opening PDF…</p>}
      {pdf && Array.from({length: pdf.numPages}, (_, index) => <PdfPage key={index + 1} pdf={pdf} pageNumber={index + 1} width={width} zoom={zoom} scrollRoot={surface} />)}
    </div>
  </div>;
}

// Render nearby pages only; keep their measured height so scrolling remains continuous.
function PdfPage({pdf, pageNumber, width, zoom, scrollRoot}: {
  pdf: PDFDocumentProxy; pageNumber: number; width: number; zoom: number;
  scrollRoot: React.RefObject<HTMLDivElement>;
}) {
  const holder = useRef<HTMLElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [aspect, setAspect] = useState(1.414);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setNearViewport(entries[0].isIntersecting), {
      root: scrollRoot.current, rootMargin: '600px 0px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRoot]);
  useEffect(() => {
    if (!nearViewport) {canvasHost.current?.replaceChildren(); return;}
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
      setAspect(base.height / base.width);
      const viewport = page.getViewport({scale: width / base.width * zoom});
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
  }, [pdf, pageNumber, width, zoom, nearViewport]);


  return <section ref={holder} className="pdf-page" aria-label={`Page ${pageNumber}`} style={{width: width * zoom}}>
    <div className="pdf-page-number">{pageNumber} / {pdf.numPages}</div>
    <div className="pdf-page-sheet" style={{height: width * zoom * aspect}} aria-busy={nearViewport && rendering}>
      {error && <p role="alert" className="motion-error">{error}</p>}
      <div ref={canvasHost} />
    </div>
  </section>;
}
