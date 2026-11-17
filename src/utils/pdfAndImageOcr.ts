import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PreparedPrescriptionPage {
  pageNumber: number;
  fileName: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface PreparedPrescriptionUpload {
  pages: PreparedPrescriptionPage[];
  primaryFileName: string;
  fileType: 'pdf' | 'jpg' | 'png';
  clientWarnings: string[];
}

const MAX_TOTAL_PAGES = 6;
const MAX_DIMENSION = 1600;

function detectFileType(file: File): 'pdf' | 'jpg' | 'png' {
  const lower = (file.name || '').toLowerCase();
  if (file.type === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (file.type === 'image/png' || lower.endsWith('.png')) return 'png';
  return 'jpg';
}

function loadBitmap(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read uploaded image file.'));
    };
    img.src = url;
  });
}

async function normalizeImageFileToPage(
  file: File,
  pageNumber: number
): Promise<{ page: PreparedPrescriptionPage; warnings: string[] }> {
  const img = await loadBitmap(file);
  const srcW = img.naturalWidth || img.width || 1200;
  const srcH = img.naturalHeight || img.height || 1600;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize canvas for prescription image.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const mimeType = 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, 0.86);

  const warnings: string[] = [];
  if (srcW < 550 || srcH < 550) {
    warnings.push(
      `Page ${pageNumber} (${file.name}) has low resolution (${srcW}x${srcH}px).`
    );
  }

  return {
    page: {
      pageNumber,
      fileName: file.name,
      dataUrl,
      mimeType,
      width: targetW,
      height: targetH,
    },
    warnings,
  };
}

async function renderPdfPages(
  file: File,
  startPageNumber: number,
  remainingSlots: number,
  onStatus?: (msg: string) => void
): Promise<{ pages: PreparedPrescriptionPage[]; warnings: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pagesToRender = Math.min(pdf.numPages, remainingSlots);
  const pages: PreparedPrescriptionPage[] = [];
  const warnings: string[] = [];

  if (pdf.numPages > remainingSlots) {
    warnings.push(
      `${file.name} has ${pdf.numPages} pages; processing the first ${pagesToRender} pages (limit ${MAX_TOTAL_PAGES} pages per upload).`
    );
  }

  for (let p = 1; p <= pagesToRender; p += 1) {
    onStatus?.(`Rendering PDF page ${p} of ${pagesToRender} at high clarity...`);
    const page = await pdf.getPage(p);
    const baseViewport = page.getViewport({ scale: 1 });
    const desiredScale = Math.min(2.2, MAX_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale: Math.max(1.5, desiredScale) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    pages.push({
      pageNumber: startPageNumber + pages.length,
      fileName: `${file.name} (Page ${p})`,
      dataUrl,
      mimeType: 'image/jpeg',
      width: canvas.width,
      height: canvas.height,
    });
  }

  return { pages, warnings };
}

export async function preparePrescriptionFilesForVision(
  files: File[],
  callbacks?: {
    onProgress?: (pct: number) => void;
    onStatus?: (status: string) => void;
  }
): Promise<PreparedPrescriptionUpload> {
  if (!files || files.length === 0) {
    throw new Error('No prescription files selected.');
  }

  const pages: PreparedPrescriptionPage[] = [];
  const clientWarnings: string[] = [];
  const primaryType = detectFileType(files[0]);

  callbacks?.onProgress?.(8);
  callbacks?.onStatus?.('Preparing prescription pages for Google Cloud Vision OCR...');

  for (let i = 0; i < files.length; i += 1) {
    if (pages.length >= MAX_TOTAL_PAGES) {
      clientWarnings.push(
        `Maximum ${MAX_TOTAL_PAGES} pages per upload reached; extra pages were skipped.`
      );
      break;
    }

    const file = files[i];
    const fType = detectFileType(file);
    const remainingSlots = MAX_TOTAL_PAGES - pages.length;

    if (fType === 'pdf') {
      const rendered = await renderPdfPages(
        file,
        pages.length + 1,
        remainingSlots,
        callbacks?.onStatus
      );
      pages.push(...rendered.pages);
      clientWarnings.push(...rendered.warnings);
    } else {
      callbacks?.onStatus?.(`Preparing image ${i + 1} of ${files.length}...`);
      const prepared = await normalizeImageFileToPage(file, pages.length + 1);
      pages.push(prepared.page);
      clientWarnings.push(...prepared.warnings);
    }

    const pct = 10 + Math.round(((i + 1) / files.length) * 35);
    callbacks?.onProgress?.(pct);
  }

  if (pages.length === 0) {
    throw new Error('Could not render any prescription pages from the selected files.');
  }

  const primaryFileName =
    files.length === 1
      ? files[0].name
      : `${files[0].name} (+${files.length - 1} more)`;

  return {
    pages,
    primaryFileName,
    fileType: primaryType,
    clientWarnings,
  };
}
