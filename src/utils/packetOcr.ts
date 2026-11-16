import Tesseract, { PSM } from 'tesseract.js';
import { parseNutritionTextClient } from './localNutritionEngine';

interface OcrPreprocessOptions {
  crop?: { rx: number; ry: number; rw: number; rh: number };
  contrast?: number;
}

export async function preprocessImageForOcr(
  source: File | Blob,
  options: OcrPreprocessOptions = {}
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode photo for scanning.'));
      el.src = objectUrl;
    });

    const natW = img.width || 800;
    const natH = img.height || 600;
    const c = options.crop;
    const sx = c ? Math.max(0, Math.round(natW * c.rx)) : 0;
    const sy = c ? Math.max(0, Math.round(natH * c.ry)) : 0;
    const sw = c ? Math.max(1, Math.min(natW - sx, Math.round(natW * c.rw))) : natW;
    const sh = c ? Math.max(1, Math.min(natH - sy, Math.round(natH * c.rh))) : natH;

    const longSide = Math.max(sw, sh);
    const scale =
      longSide < 1600
        ? Math.min(2.6, 1900 / longSide)
        : Math.min(1, 2000 / longSide);

    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    const contrast = options.contrast ?? 1.18;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const enhanced = Math.max(0, Math.min(255, (lum - 128) * contrast + 128));
      d[i] = enhanced;
      d[i + 1] = enhanced;
      d[i + 2] = enhanced;
    }
    ctx.putImageData(imgData, 0, 0);

    const processed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
    );
    return processed || source;
  } catch {
    return source;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function normalizeOcrTableText(raw: string): string {
  if (!raw) return '';
  let text = raw
    .replace(/\bEnergy\s*\(\s*(?:keal|keai|kca1)\s*\)/gi, 'Energy (kcal)')
    .replace(/\bTotal\s+Fat\s*\(\s*[gq9]\s*\)/gi, 'Total Fat (g)')
    .replace(/\bTotal\s+Sugars?\s*\(\s*[gq9]\s*\)/gi, 'Total Sugars (g)')
    .replace(/\bAdded\s+Sugars?\s*\(\s*[gq9]\s*\)/gi, 'Added Sugar (g)')
    .replace(/\bProtein\s*\(\s*[gq9e]\s*\)/gi, 'Protein (g)')
    .replace(/\bCarbohydrate\s*\(\s*[gq9]\s*\)/gi, 'Carbohydrate (g)')
    .replace(/\bSodium\s*\(\s*mq\s*\)/gi, 'Sodium (mg)');

  text = text.replace(
    /((?:protein|carbohydrate|total\s+sugars?|total\s+fat|saturated\s+fat|dietary\s+fiber)\s*\(\s*g\s*\)\s*[:|\-]?\s*)(\d{3})(?!\.\d)/gi,
    (_full, prefix: string, digits: string) => {
      const val = parseInt(digits, 10);
      if (val >= 101 && val <= 999) {
        return `${prefix}${(val / 10).toFixed(1)}`;
      }
      return `${prefix}${digits}`;
    }
  );

  return text;
}

export function extractIngredientsSegment(rawText: string): string {
  if (!rawText) return '';
  const match = rawText.match(
    /\bingredients?\b\s*[:\-]\s*([\s\S]{2,800}?)(?:\bnet\s*weight\b|\bnutrition|\ballergen|\bstorage|\bfor feedback|\bmarketed|\bmanufactured|\bpacked\s*by|\bbest\s*before|\bfssai\b|$)/i
  );
  if (match && match[1]) {
    const cleaned = match[1].replace(/\s+/g, ' ').replace(/^[ :\-]+|[ ,:;\-]+$/g, '').trim();
    if (cleaned.length >= 2 && !/^(?:type|preference)\b/i.test(cleaned)) {
      return cleaned;
    }
  }
  return '';
}

export async function runPacketImageOcr(
  source: File | Blob,
  callbacks?: {
    onProgress?: (pct: number) => void;
    onStatus?: (status: string) => void;
  }
): Promise<{
  extractedText: string;
  confidence?: number;
}> {
  callbacks?.onProgress?.(0);
  callbacks?.onStatus?.('Enhancing & reading packet label...');

  const prepared = await preprocessImageForOcr(source);
  const workerResult = await Tesseract.recognize(prepared, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        callbacks?.onProgress?.(Math.round(m.progress * 70));
      }
    },
  });

  let confidence =
    typeof workerResult?.data?.confidence === 'number'
      ? workerResult.data.confidence
      : undefined;

  let extracted = normalizeOcrTableText((workerResult?.data?.text || '').trim());

  if (extracted.length < 10) {
    const words = (
      workerResult?.data as { words?: Array<{ text: string; confidence: number }> } | undefined
    )?.words;
    if (Array.isArray(words) && words.length > 0) {
      const kept = words
        .filter((w) => {
          const t = (w.text || '').trim();
          if (!t) return false;
          if (t.length <= 2 && w.confidence < 58) return false;
          return w.confidence >= 34;
        })
        .map((w) => w.text.trim())
        .join(' ');
      if (kept.length >= 6) {
        extracted = normalizeOcrTableText(kept);
      }
    }
  }

  if (!parseNutritionTextClient(extracted)) {
    const regions: Array<{ label: string; crop: { rx: number; ry: number; rw: number; rh: number } }> = [
      { label: 'Scanning nutrition table region...', crop: { rx: 0.42, ry: 0.14, rw: 0.58, rh: 0.82 } },
      { label: 'Scanning lower label region...', crop: { rx: 0.0, ry: 0.34, rw: 1.0, rh: 0.66 } },
    ];
    let tableWorker: Tesseract.Worker | null = null;
    try {
      tableWorker = await Tesseract.createWorker('eng');
      await tableWorker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
      for (let i = 0; i < regions.length; i += 1) {
        callbacks?.onStatus?.(regions[i].label);
        callbacks?.onProgress?.(75 + i * 12);
        const regionBlob = await preprocessImageForOcr(source, {
          crop: regions[i].crop,
          contrast: 1.22,
        });
        const regRes = await tableWorker.recognize(regionBlob);
        const regText = normalizeOcrTableText((regRes?.data?.text || '').trim());
        const combinedCandidate = [extracted, regText].filter(Boolean).join('\n');
        if (parseNutritionTextClient(regText) || parseNutritionTextClient(combinedCandidate)) {
          extracted = regText.length > 20 ? `${regText}\n${extracted}` : combinedCandidate;
          if (
            typeof regRes?.data?.confidence === 'number' &&
            (confidence === undefined || regRes.data.confidence > confidence)
          ) {
            confidence = regRes.data.confidence;
          }
          break;
        }
      }
    } catch {
      // Keep primary OCR result if regional pass fails
    } finally {
      if (tableWorker) {
        await tableWorker.terminate().catch(() => {});
      }
    }
  }

  callbacks?.onProgress?.(100);
  return {
    extractedText: extracted,
    confidence,
  };
}
